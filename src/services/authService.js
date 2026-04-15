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
      // Timeout pour éviter les blocages
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      );

      const signInPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data, error } = await Promise.race([signInPromise, timeoutPromise]);

      if (error) throw error;

      // Vérifier si le compte est actif et valide (optionnel si table n'existe pas)
      if (data.user) {
        try {
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('is_active, validity_date')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (!accountError && accountData) {
            // Vérifier si le compte est actif
            if (!accountData.is_active) {
              await supabase.auth.signOut();
              return { 
                data: null, 
                error: 'Votre compte a été désactivé. Veuillez contacter l\'administrateur.' 
              };
            }

            // Vérifier la date de validité
            if (accountData.validity_date) {
              const validityDate = new Date(accountData.validity_date);
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              validityDate.setHours(0, 0, 0, 0);
              
              if (today > validityDate) {
                await supabase.auth.signOut();
                return { 
                  data: null, 
                  error: 'Votre compte a expiré. Veuillez contacter l\'administrateur.' 
                };
              }
            }
          }
        } catch (accError) {
          console.warn('Erreur lors de la vérification du compte:', accError.message);
          // Continuer même si la vérification du compte échoue
        }
      }

      return { data, error: null };
    } catch (error) {
      console.error('Erreur signIn:', error);
      return { data: null, error };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { error: null };
    } catch (error) {
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
};
export default authService;