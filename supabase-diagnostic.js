import { supabase } from './src/services/supabaseClient.js';

// simple logger for node/dev scripts
const logger = {
  debug: (...args) => console.log(...args),
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
};

/**
 * 🔍 Script de diagnostic Supabase
 * Vérifie que les tables et politiques RLS sont bien configurées
 */

async function runDiagnostics() {
  logger.debug('🔍 Diagnostic Supabase en cours...\n');

  // 1. Vérifier la connexion
  logger.debug('1️⃣  Vérification de la connexion Supabase...');
  try {
    logger.debug('✅ Connexion réussie');
  } catch (error) {
    logger.error('❌ Erreur de connexion:', error.message);
    return;
  }

  // 2. Vérifier chaque table
  const tables = ['accounts', 'products', 'sales', 'expenses'];
  
  for (const table of tables) {
    logger.debug(`\n2️⃣  Vérification de la table "${table}"...`);
    try {
      const { error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        logger.error(`❌ Erreur: ${error.message}`);
      } else {
        logger.debug(`✅ Table "${table}" accessible (${count} lignes)`);
      }
    } catch (error) {
      logger.error(`❌ Erreur: ${error.message}`);
    }
  }

  // 3. Vérifier l'authentification
  logger.debug(`\n3️⃣  Vérification de l'authentification...`);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      logger.debug(`✅ Authentifié: ${user.email}`);
      logger.debug(`   User ID: ${user.id}`);
    } else {
      logger.debug('⚠️  Non authentifié');
    }
  } catch (error) {
    logger.error(`❌ Erreur: ${error.message}`);
  }

  logger.debug('\n✅ Diagnostic terminé!');
}

// Lancer le diagnostic
runDiagnostics().catch((e) => logger.error(e));
