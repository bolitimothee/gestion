import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Supabase client initialization failed: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be defined.');
  throw new Error('Supabase environment variables not defined');
}

// Créer une instance unique pour éviter les avertissements de multiples instances
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    // Ajouter une clé unique pour éviter les conflits
    storageKey: 'supabase.auth.token',
  },
  db: {
    schema: 'public',
  },
  // Ajouter des options pour éviter les conflits d'instances
  global: {
    headers: {
      'X-Client-Info': 'gestion-commerce/1.0.0'
    }
  }
});
