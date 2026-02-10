import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

  const loadAccountDetails = useCallback(async (userId) => {
    if (!userId) {
      setAccount(null);
      setAccountValid(true);
      return null;
    }
    try {
      // D'abord vérifier la validité
      const isValid = await checkAccountValidity(userId);
      if (!isValid) {
        setAccount(null);
        return null;
      }

      // Puis charger les détails
      const { data } = await authService.getAccountDetails(userId);
      if (data) {
        setAccount(data);
        return data;
      }
    } catch (err) {
      console.warn('Erreur chargement compte:', err);
    }
    return null;
  }, [checkAccountValidity]);

  useEffect(() => {
    // Vérifier la session au chargement (une seule fois)
    if (sessionCheckRef.current) return;
    sessionCheckRef.current = true;

    const checkSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setUser(data.session.user);
          await loadAccountDetails(data.session.user.id);
        }
      } catch (_err) {
        console.error('Error checking session:', _err);
      } finally {
        setLoading(false);
        setIsAuthReady(true);
      }
    };

    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        await loadAccountDetails(session.user.id);
      } else {
        setUser(null);
        setAccount(null);
        setAccountValid(true);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [loadAccountDetails]);

  // Vérifier périodiquement la validité du compte (toutes les 30 secondes)
  useEffect(() => {
    if (!user) {
      if (validityCheckIntervalRef.current) {
        clearInterval(validityCheckIntervalRef.current);
        validityCheckIntervalRef.current = null;
      }
      return;
    }

    // Vérification immédiate
    checkAccountValidity(user.id);

    // Vérifications périodiques
    validityCheckIntervalRef.current = setInterval(() => {
      checkAccountValidity(user.id);
    }, 30000); // 30 secondes

    return () => {
      if (validityCheckIntervalRef.current) {
        clearInterval(validityCheckIntervalRef.current);
        validityCheckIntervalRef.current = null;
      }
    };
  }, [user, checkAccountValidity]);

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
