import { supabase } from './supabaseClient';

export const authService = {
  async signUp(email, password, businessName) {
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
              email,
              business_name: businessName || 'Mon Entreprise',
              username: email.split('@')[0],
              preferred_currency: 'USD',
            },
          ]);

        if (accountError) console.warn('Avertissement compte:', accountError.message);
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

      // Charger les informations du compte si disponible
      if (data.user) {
        try {
          const { data: accountData } = await supabase
            .from('accounts')
            .select('*')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (accountData) {
            // Compte trouvé - connexion autorisée
            return { data, error: null };
          }
        } catch (accError) {
          console.warn('Info compte non disponible:', accError.message);
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

      // Si table n'existe pas ou erreur, retourner objet vide
      if (error) {
        console.warn('Impossible de charger les détails du compte:', error.message);
        return { data: { user_id: userId, business_name: 'Mon Entreprise', email: '', preferred_currency: 'USD' }, error: null };
      }
      
      // Si pas de données, retourner objet fallback
      if (!data) {
        return { data: { user_id: userId, business_name: 'Mon Entreprise', email: '', preferred_currency: 'USD' }, error: null };
      }
      
      return { data, error: null };
    } catch (err) {
      console.warn('Erreur getAccountDetails:', err);
      return { data: { user_id: userId, business_name: 'Mon Entreprise', email: '', preferred_currency: 'USD' }, error: null };
    }
  },
};
export default authService;