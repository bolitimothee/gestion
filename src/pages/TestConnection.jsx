import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function TestConnection() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runTests();
  }, []);

  const addTest = (name, passed, details) => {
    setTests(prev => [...prev, { name, passed, details }]);
  };

  const runTests = async () => {
    const newTests = [];

    // Test 1: Vérifier les env vars
    console.log('TEST 1: Vérifier les env vars');
    const hasUrl = !!import.meta.env.VITE_SUPABASE_URL;
    const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
    newTests.push({
      name: '1️⃣ Variables d\'environnement',
      passed: hasUrl && hasKey,
      details: `URL: ${hasUrl ? '✅' : '❌'}, KEY: ${hasKey ? '✅' : '❌'}`
    });

    // Test 2: Connexion basique
    console.log('TEST 2: Connexion basique');
    try {
      const { data, error } = await supabase.auth.getSession();
      newTests.push({
        name: '2️⃣ Connexion Supabase',
        passed: !error,
        details: error ? `❌ ${error.message}` : '✅ Connexion établie'
      });
    } catch (err) {
      newTests.push({
        name: '2️⃣ Connexion Supabase',
        passed: false,
        details: `❌ ${err.message}`
      });
    }

    // Test 3: Vérifier la table "accounts"
    console.log('TEST 3: Vérifier table accounts');
    try {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .limit(1);

      if (error) {
        newTests.push({
          name: '3️⃣ Table "accounts"',
          passed: false,
          details: `❌ ${error.message}`
        });
      } else {
        newTests.push({
          name: '3️⃣ Table "accounts"',
          passed: true,
          details: `✅ Table existe (${data?.length || 0} lignes)`
        });
      }
    } catch (err) {
      newTests.push({
        name: '3️⃣ Table "accounts"',
        passed: false,
        details: `❌ ${err.message}`
      });
    }

    // Test 4: Vérifier la table "products"
    console.log('TEST 4: Vérifier table products');
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .limit(1);

      if (error) {
        newTests.push({
          name: '4️⃣ Table "products"',
          passed: false,
          details: `❌ ${error.message}`
        });
      } else {
        newTests.push({
          name: '4️⃣ Table "products"',
          passed: true,
          details: `✅ Table existe (${data?.length || 0} lignes)`
        });
      }
    } catch (err) {
      newTests.push({
        name: '4️⃣ Table "products"',
        passed: false,
        details: `❌ ${err.message}`
      });
    }

    setTests(newTests);
    setLoading(false);
  };

  return (
    <div style={{
      maxWidth: '600px',
      margin: '40px auto',
      padding: '20px',
      fontFamily: 'monospace',
      backgroundColor: '#f5f5f5',
      borderRadius: '8px'
    }}>
      <h1>🔍 Test de Connexion Supabase</h1>

      {loading ? (
        <p>Analyse en cours...</p>
      ) : (
        <div>
          {tests.map((test, idx) => (
            <div key={idx} style={{
              marginBottom: '15px',
              padding: '12px',
              backgroundColor: test.passed ? '#d1fae5' : '#fee2e2',
              border: `2px solid ${test.passed ? '#10b981' : '#ef4444'}`,
              borderRadius: '4px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {test.name}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                {test.details}
              </div>
            </div>
          ))}

          <div style={{
            marginTop: '30px',
            padding: '15px',
            backgroundColor: '#fef3c7',
            borderRadius: '4px',
            borderLeft: '4px solid #f59e0b'
          }}>
            <strong>⚠️ ACTION REQUISE:</strong>
            <ol style={{ marginTop: '10px', marginBottom: '0' }}>
              <li>Ouvrir: <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Supabase Dashboard</a></li>
              <li>Sélectionner votre projet</li>
              <li>Aller à: <strong>SQL Editor</strong></li>
              <li>Cliquer: <strong>New Query</strong></li>
              <li>Copier tout le contenu de: <strong>SUPABASE_FINAL_COMPLET.sql</strong></li>
              <li>Coller dans l'éditeur Supabase</li>
              <li>Cliquer: <strong>Run</strong></li>
              <li>Revenir ici et rafraîchir (F5)</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
