import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { authService } from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [accountValid, setAccountValid] = useState(true);
  const sessionCheckRef = useRef(false);

  const loadAccountDetailsInline = useCallback(async (userId) => {
    if (!userId) {
      setAccount(null);
      setAccountValid(true);
      return null;
    }
    try {
      const { data: accountData } = await authService.getAccountDetails(userId);
      if (accountData) {
        setAccount(accountData);
        const { valid } = await authService.checkAccountValidity(userId);
        setAccountValid(valid);
        return accountData;
      }
    } catch (err) {
      console.warn('Erreur chargement compte:', err);
    }
    return null;
  }, []);

  useEffect(() => {
    // Vérifier la session au chargement (une seule fois)
    if (sessionCheckRef.current) return;
    sessionCheckRef.current = true;

    let isMounted = true;
    let isInitial = true;

    const loadAccountData = async (userId) => {
      if (!userId) return;
      try {
        const { data: accountData } = await authService.getAccountDetails(userId);
        if (isMounted && accountData) {
          setAccount(accountData);
          const { valid } = await authService.checkAccountValidity(userId);
          if (isMounted) {
            setAccountValid(valid);
          }
        }
      } catch (err) {
        console.warn('Erreur loadAccountData:', err);
      }
    };

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      try {
        if (session?.user) {
          setUser(session.user);
          await loadAccountData(session.user.id);
        } else {
          setUser(null);
          setAccount(null);
          setAccountValid(true);
        }
      } catch (err) {
        console.warn('Erreur onAuthStateChange:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsAuthReady(true);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Vérifier périodiquement la validité du compte (toutes les 30 secondes)
  useEffect(() => {
    if (!user) return;

    let mounted = true;

    // Vérification immédiate
    const checkValidity = async () => {
      if (!mounted) return;
      try {
        const { valid } = await authService.checkAccountValidity(user.id);
        if (mounted) {
          setAccountValid(valid);
        }
      } catch (err) {
        console.warn('Erreur vérification validité:', err);
      }
    };

    checkValidity();

    // Vérifications périodiques (30 secondes)
    const intervalId = setInterval(() => {
      checkValidity();
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [user]);

  const value = {
    user,
    account,
    loading,
    isAuthReady,
    accountValid,
    signUp: async (email, password, accountName, validityDate) => {
      try {
        const result = await authService.signUp(email, password, accountName, validityDate);
        if (result.error) {
          return { data: null, error: result.error };
        }

        if (result.data?.user) {
          setUser(result.data.user);
          await loadAccountDetailsInline(result.data.user.id);
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
          return { data: null, error: result.error };
        }

        if (result.data?.user) {
          setUser(result.data.user);
          await loadAccountDetailsInline(result.data.user.id);
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
