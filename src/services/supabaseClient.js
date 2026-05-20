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

// Test de connectivité à Supabase avec la clé anon
console.log('[supabaseClient] Testing Supabase auth connectivity with anon key...');
fetch(SUPABASE_URL + '/auth/v1/health', {
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
  }
})
  .then(r => {
    console.log('[supabaseClient] Auth health check response:', r.status, r.statusText);
    return r.json();
  })
  .then(data => console.log('[supabaseClient] Auth health data:', data))
  .catch(err => console.error('[supabaseClient] Auth health check failed:', err.message, err));

// Test avec XHR pour vérifier CORS
console.log('[supabaseClient] Testing direct XHR request...');
const xhr = new XMLHttpRequest();
xhr.onload = () => console.log('[supabaseClient] XHR onload:', xhr.status, xhr.statusText);
xhr.onerror = () => console.error('[supabaseClient] XHR error - CORS ou problème réseau');
xhr.onprogress = () => console.log('[supabaseClient] XHR progress');
xhr.addEventListener('loadstart', () => console.log('[supabaseClient] XHR loadstart'));
xhr.addEventListener('loadend', () => console.log('[supabaseClient] XHR loadend'));
xhr.open('GET', SUPABASE_URL + '/auth/v1/health', true);
xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
xhr.timeout = 5000;
xhr.ontimeout = () => console.error('[supabaseClient] XHR timeout');
try {
  xhr.send();
  console.log('[supabaseClient] XHR request sent');
} catch (err) {
  console.error('[supabaseClient] XHR send error:', err.message);
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
