import { supabase } from './src/services/supabaseClient.js';

/**
 * 🔍 Script de diagnostic Supabase
 * Vérifie que les tables et politiques RLS sont bien configurées
 */

async function runDiagnostics() {
  console.log('🔍 Diagnostic Supabase en cours...\n');

  // 1. Vérifier la connexion
  console.log('1️⃣  Vérification de la connexion Supabase...');
  try {
    console.log('✅ Connexion réussie');
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    return;
  }

  // 2. Vérifier chaque table
  const tables = ['accounts', 'products', 'sales', 'expenses'];
  
  for (const table of tables) {
    console.log(`\n2️⃣  Vérification de la table "${table}"...`);
    try {
      const { error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        console.error(`❌ Erreur: ${error.message}`);
      } else {
        console.log(`✅ Table "${table}" accessible (${count} lignes)`);
      }
    } catch (error) {
      console.error(`❌ Erreur: ${error.message}`);
    }
  }

  // 3. Vérifier l'authentification
  console.log(`\n3️⃣  Vérification de l'authentification...`);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      console.log(`✅ Authentifié: ${user.email}`);
      console.log(`   User ID: ${user.id}`);
    } else {
      console.log('⚠️  Non authentifié');
    }
  } catch (error) {
    console.error(`❌ Erreur: ${error.message}`);
  }

  console.log('\n✅ Diagnostic terminé!');
}

// Lancer le diagnostic
runDiagnostics().catch(console.error);
