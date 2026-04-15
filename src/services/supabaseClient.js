import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Vérifier que les variables sont chargées
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || SUPABASE_URL === 'https://your-project.supabase.co') {
  console.error('ERREUR CRITIQUE: Variables Supabase manquantes ou incorrectes');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL);
  console.error('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? 'Présente' : 'MANQUANTE');
  console.error('\nVérifiez votre fichier .env.local');
}

// Singleton pattern pour éviter les instances multiples
let supabaseInstance = null;

export const supabase = (() => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      flowType: 'implicit',
    },
    global: {
      headers: {
        'Content-Type': 'application/json',
      },
    },
    db: {
      schema: 'public',
    },
  });

  // Test de connexion
  if (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL !== 'https://your-project.supabase.co') {
    console.log('Supabase client initialisé avec succès');
  }

  return supabaseInstance;
})();
