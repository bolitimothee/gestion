/**
 * 🔐 Vérificateur de Token JWT Supabase
 * À exécuter dans la console du navigateur (F12)
 */

const anon_key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVvZ2x6c2VhZG1td2ZzanhibWRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAyNTUwOTgsImV4cCI6MjA4NTgzMTA5OH0.XFuIKASLMIOvhXSpqWNuh7DX2DTzV6DR1C_GVlrPRKs';

// Décoder le JWT
function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('❌ JWT invalide (format incorrect)');
    return null;
  }

  try {
    const decoded = JSON.parse(atob(parts[1]));
    console.log('✅ JWT Valide');
    console.log('   Émetteur:', decoded.iss);
    console.log('   Rôle:', decoded.role);
    console.log('   Émis le:', new Date(decoded.iat * 1000));
    console.log('   Expire le:', new Date(decoded.exp * 1000));
    
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      console.error('❌ JWT EXPIRÉ!');
      return null;
    } else {
      console.log('✅ JWT non expiré');
    }
    
    return decoded;
  } catch (error) {
    console.error('❌ Erreur de décodage:', error);
    return null;
  }
}

// Test
console.log('🔐 Analyse du token ANON_KEY:');
decodeJWT(anon_key);

console.log('\n💡 Solution si problème:');
console.log('1. Allez dans Supabase Dashboard');
console.log('2. Project Settings > API');
console.log('3. Copiez la clé "anon public"');
console.log('4. Remplacez VITE_SUPABASE_ANON_KEY dans .env.local');
console.log('5. Redémarrez npm run dev');
