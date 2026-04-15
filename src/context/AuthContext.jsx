import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { authService } from '../services/authService';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const sessionCheckRef = useRef(false);
  const abortControllerRef = useRef(null);

  const loadAccountDetails = useCallback(async (userId) => {
    if (!userId) {
      setAccount(null);
      return null;
    }
    try {
      const { data } = await authService.getAccountDetails(userId);
      if (data) {
        setAccount(data);
        return data;
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

    const checkSession = async () => {
      // Annuler les requêtes précédentes
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Créer un nouveau AbortController
      abortControllerRef.current = new AbortController();
      
      try {
        // Timeout augmenté pour éviter les blocages
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 30000)
        );

        const sessionPromise = supabase.auth.getSession();
        
        const { data } = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (data?.session) {
          setUser(data.session.user);
          await loadAccountDetails(data.session.user.id);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Session check aborted');
        } else if (err.message === 'Session timeout') {
          console.warn('Session timeout - forçage de l\'état prêt');
          // Forcer l'état prêt même si timeout
          setLoading(false);
          setIsAuthReady(true);
          return;
        } else {
          console.error('Error checking session:', err);
        }
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
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => {
      // Annuler les requêtes en cours
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      subscription?.unsubscribe();
    };
  }, [loadAccountDetails]);

  const value = {
    user,
    account,
    loading,
    isAuthReady,
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
