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
  const validityCheckIntervalRef = useRef(null);

  const checkAccountValidity = useCallback(async (userId) => {
    if (!userId) return false;
    try {
      const { valid, reason } = await authService.checkAccountValidity(userId);
      setAccountValid(valid);
      
      if (!valid) {
        console.warn('Compte invalide:', reason);
        return false;
      }
      return true;
    } catch (err) {
      console.error('Erreur vérification validité:', err);
      return true;
    }
  }, []);

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

    let mounted = true;

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        
        if (data?.session) {
          setUser(data.session.user);
          // Charger les détails du compte
          try {
            const { data: accountData } = await authService.getAccountDetails(data.session.user.id);
            if (mounted && accountData) {
              setAccount(accountData);
              // Vérifier la validité
              const { valid } = await authService.checkAccountValidity(data.session.user.id);
              if (mounted) {
                setAccountValid(valid);
              }
            }
          } catch (err) {
            console.warn('Erreur chargement compte:', err);
          }
        }
      } catch (_err) {
        console.error('Error checking session:', _err);
      } finally {
        if (mounted) {
          setLoading(false);
          setIsAuthReady(true);
        }
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        setUser(session.user);
        try {
          const { data: accountData } = await authService.getAccountDetails(session.user.id);
          if (mounted && accountData) {
            setAccount(accountData);
            const { valid } = await authService.checkAccountValidity(session.user.id);
            if (mounted) {
              setAccountValid(valid);
            }
          }
        } catch (err) {
          console.warn('Erreur chargement compte (onAuthStateChange):', err);
        }
      } else {
        setUser(null);
        setAccount(null);
        setAccountValid(true);
      }
      if (mounted) {
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Vérifier périodiquement la validité du compte (toutes les 30 secondes)
  useEffect(() => {
    if (!user) {
      if (validityCheckIntervalRef.current) {
        clearInterval(validityCheckIntervalRef.current);
        validityCheckIntervalRef.current = null;
      }
      return;
    }

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

    // Vérifications périodiques
    validityCheckIntervalRef.current = setInterval(() => {
      checkValidity();
    }, 30000); // 30 secondes

    return () => {
      mounted = false;
      if (validityCheckIntervalRef.current) {
        clearInterval(validityCheckIntervalRef.current);
        validityCheckIntervalRef.current = null;
      }
    };
  }, [user]);

  const value = {
    user,
    account,
    loading,
    isAuthReady,
    accountValid,
    checkAccountValidity,
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
