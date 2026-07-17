/**
 * 🔐 Vérificateur de Token JWT Supabase
 * À exécuter dans la console du navigateur (F12)
 */

const anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZ2x6c2VhZG1td2ZzanhibWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTUwOTgsImV4cCI6MjA4NTgzMTA5OH0.XFuIKASLMIOvhXSpqWNuh7DX2DTzV6DR1C_GVlrPRKs';

// logger wrapper pour snippet console (exécuté dans navigateur ou node)
const logger = { debug: (...a) => console.log(...a), info: (...a) => console.log(...a), warn: (...a) => console.warn(...a), error: (...a) => console.error(...a) };

// Décoder le JWT
function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    logger.error('❌ JWT invalide (format incorrect)');
    return null;
  }

  try {
    const decoded = JSON.parse(atob(parts[1]));
    logger.debug('✅ JWT Valide');
    logger.debug('   Émetteur:', decoded.iss);
    logger.debug('   Rôle:', decoded.role);
    logger.debug('   Émis le:', new Date(decoded.iat * 1000));
    logger.debug('   Expire le:', new Date(decoded.exp * 1000));
    
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      logger.error('❌ JWT EXPIRÉ!');
      return null;
    } else {
      logger.debug('✅ JWT non expiré');
    }
    
    return decoded;
  } catch (error) {
    logger.error('❌ Erreur de décodage:', error);
    return null;
  }
}

// Test
logger.debug('🔐 Analyse du token ANON_KEY:');
decodeJWT(anon_key);

logger.debug('\n💡 Solution si problème:');
logger.debug('1. Allez dans Supabase Dashboard');
logger.debug('2. Project Settings > API');
logger.debug('3. Copiez la clé "anon public"');
logger.debug('4. Remplacez VITE_SUPABASE_ANON_KEY dans .env.local');
logger.debug('5. Redémarrez npm run dev');
