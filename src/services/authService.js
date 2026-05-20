import { supabase } from './supabaseClient';

const withTimeout = async (promise, ms, errorMessage) => {
  let timeoutId;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(errorMessage)), ms);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
};

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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKeyPresent = Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);
      console.debug('[authService] signIn request for', email, {
        supabaseUrl,
        supabaseAnonKeyPresent,
      });

      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        8000,
        'Connexion trop longue — vérifiez votre réseau et réessayez.'
      );
      console.debug('[authService] signIn response', {
        data,
        error,
      });

      if (error) {
        const message = error.status === 400 || error.status === 401
          ? 'Email ou mot de passe incorrect. Si le problème persiste, contactez l\'administrateur.'
          : 'Impossible de se connecter. Veuillez contacter l\'administrateur.';
        throw new Error(message);
      }

      if (!data || (!data.user && !data.session?.user)) {
        throw new Error('Impossible de récupérer les informations de connexion. Veuillez réessayer.');
      }

      // Support response shape where user may be under data.user or data.session.user
      const user = data.user || data.session?.user;

      // Vérifier si le compte est actif et valide
      if (user) {
        const { data: accountData, error: accountError } = await withTimeout(
          supabase
            .from('accounts')
            .select('*')
            .eq('user_id', user.id)
              .maybeSingle(),
            4000,
            'Vérification du compte trop longue — réessayez.'
        );

        if (accountError) {
          console.error('[authService] account lookup error', accountError);
          await supabase.auth.signOut();
          throw new Error('Impossible de vérifier la validité de ce compte. Veuillez contacter l\'administrateur.');
        }

        if (!accountData) {
          console.warn('[authService] account not found for user', user?.id);
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

      const normalizedData = {
        ...data,
        user: user || null,
      };

      return { data: normalizedData, error: null };
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