import { supabase } from '../services/supabaseClient';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('=== SUPABASE CONFIGURATION CHECK (dev only) ===');
console.log('URL configured:', SUPABASE_URL ? '✅ YES' : '❌ NO');
console.log('ANON KEY configured:', SUPABASE_ANON_KEY ? '✅ YES' : '❌ NO');

if (!SUPABASE_URL) {
  console.error('❌ ERROR: VITE_SUPABASE_URL is not set');
}
if (!SUPABASE_ANON_KEY) {
  console.error('❌ ERROR: VITE_SUPABASE_ANON_KEY is not set');
}

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  console.log('\n=== TESTING SUPABASE CONNECTION ===');
  try {
    console.log('Using shared Supabase client from services/supabaseClient');
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error('❌ Session check error:', error.message);
      } else if (data?.session) {
        console.log('✅ Active session found:', data.session.user.email);
      } else {
        console.log('⚠️ No active session (this is normal if not logged in)');
      }
    }).catch(err => {
      console.error('❌ Connection error:', err.message);
    });
  } catch (err) {
    console.error('❌ Supabase check failed:', err.message);
  }
} else {
  console.error('\n⚠️ CONFIGURATION INCOMPLETE - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export {};
