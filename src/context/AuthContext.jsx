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
      // Ajouter un timeout pour éviter le blocage (augmenté à 10s)
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
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 10000)
        );
        const sessionPromise = supabase.auth.getSession();
        const { data } = await Promise.race([sessionPromise, timeoutPromise]);

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
              await loadAccountDetails(data.session.user.id);
            }
          }
        }
      } catch (_err) {
        console.error('Error checking session:', _err);
        // En cas d'erreur, considérer que l'authentification est prête
        // pour permettre à l'application de continuer
      } finally {
        setLoading(false);
        setIsAuthReady(true);
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
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
            await loadAccountDetails(session.user.id);
            setIsAccountExpired(false);
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
        if (result.data?.user) {
          setUser(result.data.user);
          // Charger les détails du compte et attendre
          await loadAccountDetails(result.data.user.id);
          // S'assurer que le state est mis à jour
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        return result;
      } catch (error) {
        return { data: null, error };
      }
    },
    signIn: async (email, password) => {
      try {
        const result = await authService.signIn(email, password);
        if (result.error) {
          await authService.signOut();
          setUser(null);
          setAccount(null);
          setIsAccountExpired(false);
          return { data: null, error: result.error };
        }

        // Mettre à jour les états localement
        if (result.data?.user) {
          setUser(result.data.user);
          setIsAccountExpired(false); // Réinitialiser l'état d'expiration
          // Charger les détails du compte et attendre
          await loadAccountDetails(result.data.user.id);
          // S'assurer que le state est mis à jour
          await new Promise(resolve => setTimeout(resolve, 100));
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
