import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { authService } from '../services/authService';
import logger from '../utils/logger';

const AUTH_RECOVERY_TIMEOUT_MS = 10000;
const AUTH_RECOVERY_RETRY_DELAY_MS = 1500;
const SUPABASE_STORAGE_KEYS = ['supabase.auth.token', 'sb-undefined-auth-token'];

const clearCorruptedSupabaseStorage = () => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;

  let cleaned = false;
  for (const key of SUPABASE_STORAGE_KEYS) {
    try {
      const value = localStorage.getItem(key);
      if (!value) continue;

      const parsed = JSON.parse(value);
      const hasSession = parsed?.currentSession || parsed?.session || parsed?.access_token;
      const hasUser = parsed?.user || parsed?.currentUser;
      if (!hasSession && !hasUser) {
        localStorage.removeItem(key);
        cleaned = true;
      }
    } catch {
      localStorage.removeItem(key);
      cleaned = true;
    }
  }

  return cleaned;
};

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAccountExpired, setIsAccountExpired] = useState(false);
  const sessionCheckRef = useRef(false);
  const authRecoveryAttemptedRef = useRef(false);

  const loadAccountDetails = useCallback(async (userId) => {
    if (!userId) {
      setAccount(null);
      return null;
    }
    try {
      // Ajouter un timeout pour éviter le blocage
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout chargement compte')), 10000)
      );
      const accountPromise = authService.getAccountDetails(userId);
      const { data } = await Promise.race([accountPromise, timeoutPromise]);

      if (data) {
        setAccount(data);
        return data;
      }
    } catch (err) {
      logger.warn('Erreur chargement compte:', err);
      // Définir un compte par défaut pour éviter les blocages
      setAccount({ user_id: userId, account_name: 'Utilisateur', email: '' });
    }
    return null;
  }, []);

  const isSessionExpired = (session) => {
    if (!session) return true;

    if (typeof session.expires_at === 'number') {
      return Date.now() / 1000 >= session.expires_at;
    }

    if (typeof session.expires_in === 'number') {
      return session.expires_in <= 0;
    }

    return false;
  };

  const isTransientAuthError = (error) => {
    if (!error) return false;
    const message = error.message || '';
    return /timeout|trop longue|network|fetch|temporair|connection/i.test(message.toLowerCase());
  };

  useEffect(() => {
    if (sessionCheckRef.current) return;
    sessionCheckRef.current = true;

    const clearAuthState = () => {
      setUser(null);
      setAccount(null);
      setIsAccountExpired(false);
      setLoading(false);
      setIsAuthReady(true);
    };

    const initializeAuth = async () => {
      if (typeof window !== 'undefined') {
        const cleaned = clearCorruptedSupabaseStorage();
        if (cleaned) {
          logger.warn('Session Supabase nettoyée dans le storage local à l’initialisation.');
        }
      }

      await recoverSession();
    };

    const finalizeSession = async (session, source = 'initial') => {
      if (!session) {
        clearAuthState();
        return;
      }

      if (isSessionExpired(session)) {
        logger.warn(`Session expirée détectée via ${source}, déconnexion en cours.`);
        await authService.signOut();
        clearAuthState();
        return;
      }

      const validityCheck = await authService.checkAccountValidity(session.user.id);
      if (!validityCheck.isValid) {
        if (isTransientAuthError(validityCheck.error)) {
          logger.warn('Vérification du compte impossible temporairement, conservation de la session locale.');
          setUser(session.user);
          setIsAccountExpired(false);
          setLoading(false);
          setIsAuthReady(true);
          loadAccountDetails(session.user.id).catch((err) => logger.warn('Erreur chargement compte asynchrone:', err));
          return;
        }

        setIsAccountExpired(true);
        await authService.signOut();
        clearAuthState();
        return;
      }

      setUser(session.user);
      setIsAccountExpired(false);
      setLoading(false);
      setIsAuthReady(true);
      loadAccountDetails(session.user.id).catch((err) => logger.warn('Erreur chargement compte asynchrone:', err));
    };

    const recoverSession = async () => {
      if (authRecoveryAttemptedRef.current) {
        clearAuthState();
        return;
      }
      authRecoveryAttemptedRef.current = true;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const timeoutPromise = new Promise((resolve) =>
            setTimeout(() => resolve({ data: { session: null }, timeout: true }), AUTH_RECOVERY_TIMEOUT_MS)
          );
          const sessionPromise = supabase.auth.getSession();
          const { data, timeout } = await Promise.race([sessionPromise, timeoutPromise]);

          if (data?.session) {
            await finalizeSession(data.session, 'getSession');
            return;
          }

          if (timeout && attempt < 2) {
            logger.warn(`Session check timeout, retrying recovery (${attempt}/2)`);
            await new Promise((resolve) => setTimeout(resolve, AUTH_RECOVERY_RETRY_DELAY_MS));
            continue;
          }

          const { data: localSessionData } = await supabase.auth.getSession();
          if (localSessionData?.session) {
            await finalizeSession(localSessionData.session, 'cached-session');
            return;
          }
        } catch (error) {
          logger.warn(`Échec de la récupération de session (essai ${attempt}/2):`, error);
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, AUTH_RECOVERY_RETRY_DELAY_MS));
          }
        }
      }

      clearAuthState();
    };

    initializeAuth();

    // Écouter les changements d'authentification (défensif)
    const res = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await finalizeSession(session, 'auth-state-change');
        return;
      }

      setUser(null);
      setAccount(null);
      setIsAccountExpired(false);
      setLoading(false);
      setIsAuthReady(true);
    });
    const subscription = res?.data?.subscription;

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadAccountDetails]);

  const value = {
    user,
    account,
    loading,
    isAuthReady,
    isAccountExpired,
    signUp: async (email, password, accountName, validityDate) => {
      try {
        const result = await authService.signUp(email, password, accountName, validityDate);
        if (result.error) {
          return { data: null, error: result.error };
        }

        // Mettre à jour les états localement
        const createdUser = result.data?.user || result.data?.session?.user;
        if (createdUser) {
          setUser(createdUser);
          setLoading(false);
          setIsAuthReady(true);
          loadAccountDetails(createdUser.id).catch((err) => logger.warn('Erreur chargement compte asynchrone:', err));
        }

        return result;
      } catch (error) {
        return { data: null, error };
      }
    },
    signIn: async (email, password) => {
      try {
        if (import.meta.env.MODE === 'development') {
          logger.debug('[AuthContext] signIn start', { email });
        }
        const result = await authService.signIn(email, password);
        if (import.meta.env.MODE === 'development') {
          logger.debug('[AuthContext] signIn result', result);
        }
        if (result.error) {
          await authService.signOut();
          setUser(null);
          setAccount(null);
          setIsAccountExpired(false);
          return { data: null, error: result.error };
        }

        // Mettre à jour les états localement
        const loggedUser = result.data?.user || result.data?.session?.user;
        if (loggedUser) {
          setUser(loggedUser);
          setIsAccountExpired(false); // Réinitialiser l'état d'expiration
          setLoading(false);
          setIsAuthReady(true);
              loadAccountDetails(loggedUser.id).catch((err) => logger.warn('Erreur chargement compte asynchrone:', err));
        }

        return result;
      } catch (error) {
        await authService.signOut();
        setUser(null);
        setAccount(null);
        setIsAccountExpired(false);
        return { data: null, error };
      }
    },
    signOut: async () => {
      try {
        const result = await authService.signOut();
        if (!result.error) {
          setUser(null);
          setAccount(null);
        }
        return result;
      } catch (error) {
        return { error };
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
