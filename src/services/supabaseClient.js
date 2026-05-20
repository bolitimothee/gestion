import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('[supabaseClient] Initializing with:', {
  url: SUPABASE_URL,
  keyPresent: Boolean(SUPABASE_ANON_KEY),
  envKeys: Object.keys(import.meta.env).filter(k => k.includes('SUPABASE'))
});

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  const errorMsg = 'ERREUR CRITIQUE: Variables Supabase non définies. VITE_SUPABASE_URL=' + SUPABASE_URL + ', VITE_SUPABASE_ANON_KEY=' + (SUPABASE_ANON_KEY ? 'défini' : 'undefined');
  console.error('[supabaseClient]', errorMsg);
  throw new Error(errorMsg);
}

// Test de connectivité à Supabase
console.log('[supabaseClient] Testing Supabase connectivity...');
fetch(SUPABASE_URL + '/rest/v1/', {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
  }
})
  .then(r => {
    console.log('[supabaseClient] Supabase connectivity test response:', r.status, r.statusText);
    return r.text();
  })
  .then(text => console.log('[supabaseClient] Response body:', text.substring(0, 100)))
  .catch(err => console.error('[supabaseClient] Supabase connectivity test failed:', err.message));

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
