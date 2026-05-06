import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: false,
    detectSessionInUrl: true,
    storage: localStorage,
    flowType: 'pkce', // Utiliser PKCE flow pour plus de sécurité
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'gestion-commerce/1.0.0',
    },
  },
  // Ajouter des timeouts pour éviter les AbortError
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
