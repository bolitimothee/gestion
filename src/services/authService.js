import { supabase } from './supabaseClient';

export const authService = {
  async signUp(email, password, businessName = 'Mon Entreprise') {
    try {
      // Créer l'utilisateur dans auth.users
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Créer le compte dans la table accounts (nouveau schéma)
      if (data.user) {
        const { error: accountError } = await supabase
          .from('accounts')
          .insert([
            {
              user_id: data.user.id,
              email,
              business_name: businessName,
              username: email.split('@')[0],
              preferred_currency: 'USD',
              // Les autres champs sont NULL par défaut
            },
          ]);

        if (accountError) {
          // Ne pas bloquer si la table n'existe pas
          console.warn('⚠️ Impossible créer compte:', accountError.message);
        }
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

      // Optionnel: Vérifier le compte dans la table accounts
      // Mais ne pas bloquer la connexion si la table n'existe pas
      if (data.user) {
        try {
          const { data: accountData, error: accountError } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (accountError) {
            console.warn('⚠️ Impossible charger compte:', accountError.message);
            // Continue quand même
          }
          
          if (accountData) {
            console.log('✅ Compte trouvé:', accountData);
          }
        } catch (accError) {
          console.warn('❌ Erreur vérif compte:', accError.message);
          // Continue quand même
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

      // Si erreur ou pas de données, retourner objet fallback
      if (error) {
        console.warn('⚠️ Erreur charger compte:', error.message);
        return { 
          data: { 
            user_id: userId, 
            business_name: 'Mon Entreprise',
            preferred_currency: 'USD',
            email: ''
          }, 
          error: null 
        };
      }
      
      // Si pas de données, retourner objet fallback
      if (!data) {
        return { 
          data: { 
            user_id: userId, 
            business_name: 'Mon Entreprise',
            preferred_currency: 'USD',
            email: ''
          }, 
          error: null 
        };
      }
      
      return { data, error: null };
    } catch (err) {
      console.warn('❌ Erreur getAccountDetails:', err);
      return { 
        data: { 
          user_id: userId, 
          business_name: 'Mon Entreprise',
          preferred_currency: 'USD',
          email: ''
        }, 
        error: null 
      };
    }
  },
};
export default authService;