import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { authService, isTransientAuthError } from '../services/authService';
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
  const lastKnownSessionRef = useRef(null);
  const sessionFinalizationRef = useRef(new Map());

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

  useEffect(() => {
    if (sessionCheckRef.current) return;
    sessionCheckRef.current = true;

    const clearAuthState = () => {
      lastKnownSessionRef.current = null;
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

    const finalizeSession = (session, source = 'initial') => {
      if (!session) {
        clearAuthState();
        return Promise.resolve();
      }

      const sessionKey = session.access_token || session.user.id;
      const existingFinalization = sessionFinalizationRef.current.get(sessionKey);
      if (existingFinalization) return existingFinalization;

      const finalization = (async () => {
        if (isSessionExpired(session)) {
          logger.warn(`Session expirée détectée via ${source}, déconnexion en cours.`);
          clearAuthState();
          authService.signOut().then((result) => {
            if (result.error) logger.error('Impossible de terminer la session expirée:', result.error);
          });
          return;
        }

        const validityCheck = await authService.checkAccountValidity(session.user.id);
        if (!validityCheck.isValid) {
          if (isTransientAuthError(validityCheck.error)) {
            logger.warn('Accès refusé : vérification temporaire du compte impossible.');
          } else {
            logger.warn('Accès refusé : compte invalide ou expiré.');
          }

          clearAuthState();
          if (!isTransientAuthError(validityCheck.error)) {
            const signOutResult = await authService.signOut();
            if (signOutResult.error) {
              logger.error('Impossible de terminer la session après le refus de validation du compte:', signOutResult.error);
            }
          }
          return;
        }

        setUser(session.user);
        setIsAccountExpired(false);
        setLoading(false);
        setIsAuthReady(true);
        loadAccountDetails(session.user.id).catch((err) => logger.warn('Erreur chargement compte asynchrone:', err));
      })();
      sessionFinalizationRef.current.set(sessionKey, finalization);
      finalization.then(
        () => {
          if (sessionFinalizationRef.current.get(sessionKey) === finalization) {
            sessionFinalizationRef.current.delete(sessionKey);
          }
        },
        () => {
          if (sessionFinalizationRef.current.get(sessionKey) === finalization) {
            sessionFinalizationRef.current.delete(sessionKey);
          }
        }
      );
      return finalization;
    };

    const recoverSession = async () => {
      if (authRecoveryAttemptedRef.current) {
        return;
      }
      authRecoveryAttemptedRef.current = true;
      let recoveryUncertain = false;

      for (let attempt = 1; attempt <= 2; attempt += 1) {
        let timeoutId;
        try {
          const { result, timedOut } = await Promise.race([
            supabase.auth.getSession().then((sessionResult) => ({ result: sessionResult, timedOut: false })),
            new Promise((resolve) => {
              timeoutId = setTimeout(
                () => resolve({ result: null, timedOut: true }),
                AUTH_RECOVERY_TIMEOUT_MS
              );
            })
          ]);
          clearTimeout(timeoutId);

          if (timedOut) {
            recoveryUncertain = true;
            logger.warn(`Session check timeout, retrying recovery (${attempt}/2)`);
            if (attempt < 2) {
              await new Promise((resolve) => setTimeout(resolve, AUTH_RECOVERY_RETRY_DELAY_MS));
            }
            continue;
          }

          if (result.error) {
            recoveryUncertain = true;
            throw result.error;
          }

          if (result.data?.session) {
            lastKnownSessionRef.current = result.data.session;
            await finalizeSession(result.data.session, 'getSession');
            return;
          }

          if (lastKnownSessionRef.current) {
            await finalizeSession(lastKnownSessionRef.current, 'auth-state-change');
            return;
          }

          lastKnownSessionRef.current = null;
          clearAuthState();
          return;
        } catch (error) {
          clearTimeout(timeoutId);
          recoveryUncertain = true;
          logger.warn(`Échec de la récupération de session (essai ${attempt}/2):`, error);
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, AUTH_RECOVERY_RETRY_DELAY_MS));
          }
        }
      }

      if (lastKnownSessionRef.current) {
        await finalizeSession(lastKnownSessionRef.current, 'auth-state-change');
        return;
      }

      if (recoveryUncertain) {
        logger.warn('État de session conservé en attente d’une réponse Supabase.');
        setLoading(false);
        setIsAuthReady(true);
        return;
      }

      clearAuthState();
    };

    initializeAuth();

    // Écouter les changements d'authentification (défensif)
    const res = supabase.auth.onAuthStateChange((_event, session) => {
      lastKnownSessionRef.current = session || null;
      setTimeout(() => {
        if (session?.user) {
          if (lastKnownSessionRef.current?.access_token !== session.access_token) return;
          finalizeSession(session, 'auth-state-change').catch((error) => {
            logger.error('Erreur lors de la validation de la session:', error);
            clearAuthState();
          });
          return;
        }

        if (!lastKnownSessionRef.current) {
          clearAuthState();
        }
      }, 0);
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
        const createdUser = result.data?.session?.user;
        if (createdUser) {
          const validityCheck = await authService.checkAccountValidity(createdUser.id);
          if (!validityCheck.isValid) {
            await authService.signOut();
            setUser(null);
            setAccount(null);
            setIsAccountExpired(false);
            return {
              data: null,
              error: isTransientAuthError(validityCheck.error)
                ? new Error('Impossible de vérifier l’état du compte. Réessayez lorsque votre connexion sera rétablie.')
                : validityCheck.error || new Error('Compte introuvable ou invalide.'),
            };
          }

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
          logger.debug('[AuthContext] signIn start');
        }
        const result = await authService.signIn(email, password);
        if (import.meta.env.MODE === 'development') {
          logger.debug('[AuthContext] signIn result', {
            success: !result.error,
            hasUser: Boolean(result.data?.user || result.data?.session?.user),
            error: result.error?.message,
          });
        }
        if (result.error) {
          if (result.sessionInvalid) {
            setUser(null);
            setAccount(null);
            setIsAccountExpired(false);
          }
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
