import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: false, // Désactiver le rafraîchissement automatique qui cause l'erreur
    detectSessionInUrl: true,
    storage: localStorage, // Utiliser localStorage explicitement
  },
  db: {
    schema: 'public',
  },
});
