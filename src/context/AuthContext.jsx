import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { authService } from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAccountExpired, setIsAccountExpired] = useState(false);
  const sessionCheckRef = useRef(false);

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
      console.warn('Erreur chargement compte:', err);
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
    // Vérifier la session au chargement (une seule fois)
    if (sessionCheckRef.current) return;
    sessionCheckRef.current = true;

    const checkSession = async () => {
      try {
        // Augmenter le timeout à 30 secondes pour les connexions lentes
        // En cas de timeout, on essaie quand même de récupérer la session depuis le localStorage
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, timeout: true }), 30000)
        );
        const sessionPromise = supabase.auth.getSession();
        const { data, timeout } = await Promise.race([sessionPromise, timeoutPromise]);

        if (data?.session) {
          if (isSessionExpired(data.session)) {
            console.warn('Session expirée détectée, déconnexion en cours.');
            await authService.signOut();
            setUser(null);
            setAccount(null);
          } else {
            const validityCheck = await authService.checkAccountValidity(data.session.user.id);
            if (!validityCheck.isValid) {
              setIsAccountExpired(true);
              await authService.signOut();
              setUser(null);
              setAccount(null);
            } else {
              setUser(data.session.user);
              setLoading(false);
              setIsAuthReady(true);
              loadAccountDetails(data.session.user.id).catch((err) => console.warn('Erreur chargement compte asynchrone:', err));
              return;
            }
          }
        } else if (timeout) {
          // En cas de timeout, vérifier si on a une session dans localStorage
          console.warn('Session check timeout, attempting to recover from localStorage');
          try {
            const { data: localSession } = await supabase.auth.getSession();
            if (localSession?.session && !isSessionExpired(localSession.session)) {
              const validityCheck = await authService.checkAccountValidity(localSession.session.user.id);
              if (validityCheck.isValid) {
                setUser(localSession.session.user);
                setLoading(false);
                setIsAuthReady(true);
                loadAccountDetails(localSession.session.user.id).catch((err) => console.warn('Erreur chargement compte asynchrone:', err));
                return;
              }
            }
          } catch (localErr) {
            console.warn('Failed to recover session from localStorage:', localErr);
          }
        }
      } catch (_err) {
        console.error('Error checking session:', _err);
        // En cas d'erreur, essayer de récupérer la session depuis localStorage
        try {
          const { data: localSession } = await supabase.auth.getSession();
          if (localSession?.session && !isSessionExpired(localSession.session)) {
            const validityCheck = await authService.checkAccountValidity(localSession.session.user.id);
            if (validityCheck.isValid) {
              setUser(localSession.session.user);
              setLoading(false);
              setIsAuthReady(true);
              loadAccountDetails(localSession.session.user.id).catch((err) => console.warn('Erreur chargement compte asynchrone:', err));
              return;
            }
          }
        } catch (localErr) {
          console.warn('Failed to recover session from localStorage after error:', localErr);
        }
      } finally {
        setLoading(false);
        setIsAuthReady(true);
      }
    };

    checkSession();

    // Écouter les changements d'authentification (défensif)
    const res = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        if (isSessionExpired(session)) {
          console.warn('Session expirée détectée dans onAuthStateChange, déconnexion en cours.');
          await authService.signOut();
          setUser(null);
          setAccount(null);
          setIsAccountExpired(false);
        } else {
          const validityCheck = await authService.checkAccountValidity(session.user.id);
          if (!validityCheck.isValid) {
            setIsAccountExpired(true);
            await authService.signOut();
            setUser(null);
            setAccount(null);
          } else {
            setUser(session.user);
            setIsAccountExpired(false);
            setLoading(false);
            setIsAuthReady(true);
            loadAccountDetails(session.user.id).catch((err) => console.warn('Erreur chargement compte asynchrone:', err));
            return;
          }
        }
      } else {
        setUser(null);
        setAccount(null);
        setIsAccountExpired(false);
      }
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
          loadAccountDetails(createdUser.id).catch((err) => console.warn('Erreur chargement compte asynchrone:', err));
        }

        return result;
      } catch (error) {
        return { data: null, error };
      }
    },
    signIn: async (email, password) => {
      try {
        console.debug('[AuthContext] signIn start', { email });
        const result = await authService.signIn(email, password);
        console.debug('[AuthContext] signIn result', result);
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
          loadAccountDetails(loggedUser.id).catch((err) => console.warn('Erreur chargement compte asynchrone:', err));
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
