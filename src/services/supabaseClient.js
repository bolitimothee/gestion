import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Vérifier que les variables sont chargées
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ ERREUR CRITIQUE: Variables Supabase manquantes');
  console.error('VITE_SUPABASE_URL:', SUPABASE_URL ? '✅ Chargée' : '❌ MANQUANTE');
  console.error('VITE_SUPABASE_ANON_KEY:', SUPABASE_ANON_KEY ? '✅ Chargée' : '❌ MANQUANTE');
  console.error('\nVérifiez votre fichier .env.local ou .env');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
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
});

// Vérifier la connexion
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth event:', event, session ? '✅ Session' : '❌ No session');
});
