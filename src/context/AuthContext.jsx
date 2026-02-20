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

  // ÉTAPE 1: Initialiser la session une seule fois au montage
  useEffect(() => {
    // Vérifier si déjà exécuté
    if (sessionCheckRef.current) return;
    sessionCheckRef.current = true;

    let isMounted = true;

    // Écouter les changements d'authentification
    // Cette fonction gère AUSSI l'initialisation (elle se déclenche immédiatement)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      try {
        if (session?.user) {
          // Utilisateur connecté
          setUser(session.user);
          
          // Charger les détails du compte
          const { data: accountData } = await authService.getAccountDetails(session.user.id);
          if (isMounted && accountData) {
            setAccount(accountData);
            // Vérifier la validité
            const { valid } = await authService.checkAccountValidity(session.user.id);
            if (isMounted) {
              setAccountValid(valid);
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
        if (isMounted) {
          setLoading(false);
          setIsAuthReady(true);
        }
      }
    });

    // Cleanup
    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []); // Aucune dépendance - exécuté UNE FOIS

  // ÉTAPE 2: Vérifier périodiquement la validité du compte (toutes les 30 sec)
  useEffect(() => {
    // Ne vérifier que s'il y a un utilisateur connecté
    if (!user) return;

    let mounted = true;

    const checkValidity = async () => {
      if (!mounted) return;
      try {
        const { valid } = await authService.checkAccountValidity(user.id);
        if (mounted) {
          setAccountValid(valid);
        }
      } catch (err) {
        console.warn('Erreur lors de la vérification périodique:', err);
      }
    };

    // Vérifier immédiatement
    checkValidity();

    // Puis vérifier tous les 30 secondes
    const intervalId = setInterval(() => {
      checkValidity();
    }, 30000);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [user]); // Dépend de l'utilisateur

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
