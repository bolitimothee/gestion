import { supabase } from './services/supabaseClient.js';

export async function diagnosticSupabase() {
  console.log('🔍 === DIAGNOSTIC SUPABASE ===');

  // Test 1: Vérifier la connexion
  console.log('\n1️⃣ Vérifier la connexion au serveur...');
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.log('   ⚠️ Pas connecté (normal au premier lancement)');
      console.log('   Erreur:', authError.message);
    } else if (user) {
      console.log('   ✅ Connecté en tant que:', user.email);
    } else {
      console.log('   ⚠️ En attente de connexion');
    }
  } catch (err) {
    console.error('   ❌ Erreur connexion:', err.message);
    return;
  }

  // Test 2: Vérifier les tables existantes
  console.log('\n2️⃣ Vérifier les tables...');
  const tables = ['accounts', 'products', 'sales', 'expenses', 'customers'];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('count()', { count: 'exact' })
        .limit(1);

      if (error) {
        console.log(`   ❌ ${table}: N'EXISTE PAS`);
        console.log(`      Erreur: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: OK`);
      }
    } catch (err) {
      console.log(`   ❌ ${table}: ERREUR - ${err.message}`);
    }
  }

  // Test 3: Vérifier les colonnes de accounts
  console.log('\n3️⃣ Vérifier les colonnes de accounts...');
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .limit(1);

    if (error) {
      console.log('   ❌ Impossible de lire accounts');
      console.log('   Raison:', error.message);
    } else if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('   ✅ Colonnes trouvées:');
      columns.forEach(col => console.log(`      - ${col}`));
    } else {
      console.log('   ⚠️ Table vide (normal pour une nouvelle BD)');
    }
  } catch (err) {
    console.error('   ❌ Erreur:', err.message);
  }

  // Test 4: RLS Status
  console.log('\n4️⃣ Vérifier RLS (Row-Level Security)...');
  try {
    const { error } = await supabase
      .from('accounts')
      .select('*')
      .limit(1);

    if (error && error.message.includes('policy')) {
      console.log('   ✅ RLS Activé (bloque sans auth - normal)');
    } else if (error && error.message.includes('relation')) {
      console.log('   ❌ Table nexiste pas - EXÉCUTER SQL D\'ABORD');
    } else {
      console.log('   ℹ️ Statut RLS: Vérifiable après connexion');
    }
  } catch (err) {
    console.error('   ❌ Erreur RLS:', err.message);
  }

  // Test 5: Real-Time capability
  console.log('\n5️⃣ Vérifier Real-Time...');
  try {
    const subscription = supabase
      .channel('test')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, (payload) => {
        console.log('   Payload received:', payload);
      })
      .subscribe();

    console.log('   ✅ Real-Time: Abonnement créé');
    
    // Nettoyer
    subscription.unsubscribe();
  } catch (err) {
    console.error('   ❌ Real-Time Error:', err.message);
  }

  console.log('\n📋 === FIN DIAGNOSTIC ===\n');
  console.log('ℹ️ Si vous voyez des ❌ "Table does not exist":');
  console.log('   1. Ouvrir: SUPABASE_FINAL_COMPLET.sql');
  console.log('   2. Copier tout');
  console.log('   3. Supabase → SQL Editor → Coller + Run');
  console.log('   4. Recharger la page (F5)');
}

// Lancer le diagnostic
diagnosticSupabase();
