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
              business_name: accountName,
              email,
              validity_date: validityDate || null,
              is_active: true,
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

      if (error) throw error;

      // Vérifier la validité du compte
      if (data.user) {
        try {
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('validity_date, is_active')
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
                  error: 'ACCOUNT_EXPIRED' 
                };
              }
            }
          }
        } catch (accError) {
          console.warn('Erreur lors de la vérification du compte:', accError.message);
        }
      }

      return { data, error: null };
    } catch (error) {
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

      if (error) {
        console.warn('Impossible de charger les détails du compte:', error.message);
        return { data: { user_id: userId, business_name: 'Utilisateur', email: '', validity_date: null, is_active: true }, error: null };
      }
      
      if (!data) {
        return { data: { user_id: userId, business_name: 'Utilisateur', email: '', validity_date: null, is_active: true }, error: null };
      }
      
      return { data, error: null };
    } catch (err) {
      console.warn('Erreur getAccountDetails:', err);
      return { data: { user_id: userId, business_name: 'Utilisateur', email: '', validity_date: null, is_active: true }, error: null };
    }
  },

  async checkAccountValidity(userId) {
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('validity_date, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return { valid: true, reason: null };

      // Vérifier si le compte est actif
      if (!data.is_active) {
        return { valid: false, reason: 'ACCOUNT_DISABLED' };
      }

      // Vérifier la date de validité
      if (data.validity_date) {
        const validityDate = new Date(data.validity_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        validityDate.setHours(0, 0, 0, 0);
        
        if (today > validityDate) {
          return { valid: false, reason: 'ACCOUNT_EXPIRED' };
        }
      }

      return { valid: true, reason: null };
    } catch (err) {
      console.error('Erreur checkAccountValidity:', err);
      return { valid: true, reason: null };
    }
  },
};
export default authService;