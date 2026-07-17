import { supabase } from '../services/supabaseClient';
import logger from './logger';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isDev = import.meta.env.MODE === 'development';

if (isDev) {
  logger.debug('=== SUPABASE CONFIGURATION CHECK (dev only) ===');
  logger.debug('URL configured:', SUPABASE_URL ? '✅ YES' : '❌ NO');
  logger.debug('ANON KEY configured:', SUPABASE_ANON_KEY ? '✅ YES' : '❌ NO');
}

if (!SUPABASE_URL) {
  logger.error('❌ ERROR: VITE_SUPABASE_URL is not set');
}
if (!SUPABASE_ANON_KEY) {
  logger.error('❌ ERROR: VITE_SUPABASE_ANON_KEY is not set');
}

if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  if (isDev) {
    logger.debug('\n=== TESTING SUPABASE CONNECTION ===');
    logger.debug('Using shared Supabase client from services/supabaseClient');
  }
  
  supabase.auth.getSession()
    .then(({ data, error }) => {
      if (error) {
        logger.error('❌ Session check error:', error.message);
      } else if (data?.session) {
        if (isDev) {
          logger.debug('✅ Active session found:', data.session.user.email);
        }
      } else {
        if (isDev) {
          logger.debug('⚠️ No active session (this is normal if not logged in)');
        }
      }
    })
    .catch(err => {
      logger.error('❌ Connection error:', err.message);
    });
} else {
  logger.error('\n⚠️ CONFIGURATION INCOMPLETE - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
}

export {};
