import React, { createContext, useState, useEffect, useRef } from 'react';
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
  const loadingAccountRef = useRef(false); // Éviter les appels concurrents

  // ÉTAPE 1: Initialiser la session une seule fois au montage
  useEffect(() => {
    // Vérifier si déjà exécuté
    if (sessionCheckRef.current) return;
    sessionCheckRef.current = true;

    let isMounted = true;
    let authTimeout;

    // Timeout de sécurité pour éviter le blocage
    authTimeout = setTimeout(() => {
      if (isMounted && loading) {
        console.warn('⚠️ Auth initialization timeout - forcing ready state');
        setLoading(false);
        setIsAuthReady(true);
      }
    }, 10000); // 10 secondes max

    // Écouter les changements d'authentification
    // Cette fonction gère AUSSI l'initialisation (elle se déclenche immédiatement)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      // Si on est déjà en train de charger le compte, ignorer cet événement
      if (loadingAccountRef.current) return;
      
      try {
        if (session?.user) {
          // Utilisateur connecté
          loadingAccountRef.current = true;
          setUser(session.user);
          setLoading(true);
          
          // Charger les détails du compte avec timeout
          const accountPromise = authService.getAccountDetails(session.user.id);
          const validityPromise = authService.checkAccountValidity(session.user.id);
          
          // Timeout pour éviter le blocage
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Account loading timeout')), 5000)
          );
          
          try {
            const [accountData, validityResult] = await Promise.all([
              Promise.race([accountPromise, timeoutPromise]),
              Promise.race([validityPromise, timeoutPromise])
            ]);
            
            if (isMounted && accountData) {
              setAccount(accountData);
              setAccountValid(validityResult?.valid !== false);
            }
          } catch (err) {
            console.warn('Account loading timeout or error:', err.message);
            // Continuer sans les détails du compte
            if (isMounted) {
              setAccount(null);
              setAccountValid(true);
            }
          }
        } else {
          // Utilisateur déconnecté
          setUser(null);
          setAccount(null);
          setAccountValid(true);
        }
      } catch (err) {
        console.warn('Erreur lors du traitement onAuthStateChange:', err);
      } finally {
        // Signaler que l'auth est prêt
        loadingAccountRef.current = false;
        if (isMounted) {
          setLoading(false);
          setIsAuthReady(true);
          clearTimeout(authTimeout); // Annuler le timeout de sécurité
        }
      }
    });

    // Cleanup
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
      clearTimeout(authTimeout);
    };
  }, [loading]); // Dépendance sur loading pour le timeout

  // ÉTAPE 2: Vérifier périodiquement la validité du compte (toutes les 30 sec)
  useEffect(() => {
    // Ne vérifier que s'il y a un utilisateur connecté ET pas en train de charger
    if (!user || !isAuthReady || loading) return;

    let mounted = true;
    let timeoutId;

    const checkValidity = async () => {
      if (!mounted || !isAuthReady) return;
      try {
        const { valid } = await authService.checkAccountValidity(user.id);
        if (mounted) {
          setAccountValid(valid);
        }
      } catch (err) {
        console.warn('Erreur lors de la vérification périodique:', err);
      }
    };

    // Vérifier immédiatement (avec un petit délai pour éviter la concurrence)
    timeoutId = setTimeout(() => {
      if (mounted) {
        checkValidity();
      }
    }, 500);

    // Puis vérifier tous les 30 secondes
    const intervalId = setInterval(() => {
      if (mounted) {
        checkValidity();
      }
    }, 30000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [user, isAuthReady, loading]);

  // Valeur du contexte
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
          setAccountValid(true);
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
