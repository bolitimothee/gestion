import { supabase } from './supabaseClient';

export const authService = {
  async signUp(email, password, accountName, validityDate) {
    try {
      // Créer l'utilisateur
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Créer le compte dans la table accounts
      if (data.user) {
        const { error: accountError } = await supabase
          .from('accounts')
          .insert([
            {
              user_id: data.user.id,
              account_name: accountName,
              email,
              validity_date: validityDate,
              is_active: true,
              created_at: new Date().toISOString(),
            },
          ]);

        if (accountError) throw accountError;
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const message = error.status === 400 || error.status === 401
          ? 'Email ou mot de passe incorrect. Si le problème persiste, contactez l\'administrateur.'
          : 'Impossible de se connecter. Veuillez contacter l\'administrateur.';
        throw new Error(message);
      }

      // Vérifier si le compte est actif et valide
      if (data.user) {
        const { data: accountData, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (accountError) {
          await supabase.auth.signOut();
          throw new Error('Impossible de vérifier la validité de ce compte. Veuillez contacter l\'administrateur.');
        }

        if (!accountData) {
          await supabase.auth.signOut();
          throw new Error('Compte introuvable ou invalide. Veuillez contacter l\'administrateur.');
        }

        // Vérifier la date de validité
        if (accountData.validity_date) {
          const validityDate = new Date(accountData.validity_date);
          const today = new Date();
          if (today > validityDate) {
            await supabase.auth.signOut();
            throw new Error('Votre compte a expiré. Veuillez contacter l\'administrateur.');
          }
        }

        if (!accountData.is_active) {
          await supabase.auth.signOut();
          throw new Error('Votre compte est désactivé.');
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async signOut() {
    const cleanupLocalSession = () => {
      try {
        localStorage.removeItem('supabase.auth.token');
      } catch (err) {
        console.warn('Impossible de nettoyer le storage local Supabase:', err);
      }
    };

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (error.status === 403 || error.message?.toLowerCase().includes('forbidden')) {
          console.warn('Suppression de session bloquée par Supabase, ignorer le code 403.');
          cleanupLocalSession();
          return { error: null };
        }
        throw error;
      }
      cleanupLocalSession();
      return { error: null };
    } catch (error) {
      if (error?.status === 403 || error?.message?.toLowerCase().includes('forbidden')) {
        console.warn('Suppression de session bloquée par Supabase, ignorer le code 403.');
        cleanupLocalSession();
        return { error: null };
      }
      cleanupLocalSession();
      return { error };
    }
  },

  async getCurrentUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getAccountDetails(userId) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // Si table n'existe pas ou erreur, retourner objet vide
      if (error) {
        console.warn('Impossible de charger les détails du compte:', error.message);
        return { data: { user_id: userId, account_name: 'Utilisateur', email: '' }, error: null };
      }
      
      // Si pas de données, retourner objet fallback
      if (!data) {
        return { data: { user_id: userId, account_name: 'Utilisateur', email: '' }, error: null };
      }
      
      return { data, error: null };
    } catch (err) {
      console.warn('Erreur getAccountDetails:', err);
      return { data: { user_id: userId, account_name: 'Utilisateur', email: '' }, error: null };
    }
  },

  async checkAccountValidity(userId) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Impossible de vérifier la validité du compte:', error.message);
        return { isValid: false, error: new Error('Impossible de vérifier la validité du compte.'), account: null };
      }

      if (!data) {
        return { isValid: false, error: new Error('Compte introuvable ou invalide.'), account: null };
      }

      // Vérifier la date de validité
      if (data.validity_date) {
        const validityDate = new Date(data.validity_date);
        const today = new Date();
        if (today > validityDate) {
          return { 
            isValid: false, 
            error: new Error('Votre compte a expiré. Veuillez contacter l\'administrateur.'),
            account: data
          };
        }
      }

      // Vérifier si le compte est actif
      if (!data.is_active) {
        return { 
          isValid: false, 
          error: new Error('Votre compte est désactivé.'),
          account: data
        };
      }

      return { isValid: true, error: null, account: data };
    } catch (err) {
      console.warn('Erreur checkAccountValidity:', err);
      return { isValid: true, error: null }; // Par défaut, considérer valide si erreur
    }
  },
};
export default authService;