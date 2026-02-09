import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function Diagnostic() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runDiagnostic();
  }, []);

  const addResult = (title, status, message) => {
    setResults(prev => [...prev, { title, status, message }]);
  };

  const runDiagnostic = async () => {
    const tempResults = [];

    // Test 1: Connection
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        tempResults.push({
          title: '1️⃣ Connexion Supabase',
          status: 'warning',
          message: 'Pas de session active (normal au premier lancement)'
        });
      } else {
        tempResults.push({
          title: '1️⃣ Connexion Supabase',
          status: 'success',
          message: `Connecté: ${user?.email}`
        });
      }
    } catch (err) {
      tempResults.push({
        title: '1️⃣ Connexion Supabase',
        status: 'error',
        message: err.message
      });
    }

    // Test 2: Tables
    const tables = ['accounts', 'products', 'sales', 'expenses', 'customers'];
    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table)
          .select('count()', { count: 'exact' })
          .limit(1);

        if (error) {
          tempResults.push({
            title: `📊 Table: ${table}`,
            status: 'error',
            message: error.message
          });
        } else {
          tempResults.push({
            title: `📊 Table: ${table}`,
            status: 'success',
            message: 'Existe et est accessible'
          });
        }
      } catch (err) {
        tempResults.push({
          title: `📊 Table: ${table}`,
          status: 'error',
          message: err.message
        });
      }
    }

    setResults(tempResults);
    setLoading(false);
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'monospace'
    }}>
      <h1>🔍 Diagnostic Supabase</h1>
      
      {loading ? (
        <p>Analyse en cours...</p>
      ) : (
        <div>
          {results.map((result, idx) => (
            <div key={idx} style={{
              marginBottom: '15px',
              padding: '12px',
              borderLeft: `4px solid ${
                result.status === 'success' ? '#10b981' :
                result.status === 'error' ? '#ef4444' :
                '#f59e0b'
              }`,
              backgroundColor: '#f3f4f6',
              borderRadius: '4px'
            }}>
              <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                {result.title}
              </div>
              <div style={{ color: '#666' }}>
                {result.message}
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
            <strong>⚠️ Si vous voyez des erreurs "Table does not exist":</strong>
            <ol>
              <li>Ouvrir le fichier: <code>SUPABASE_FINAL_COMPLET.sql</code></li>
              <li>Aller sur: <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">
                Supabase Dashboard
              </a></li>
              <li>SQL Editor → New Query</li>
              <li>Copier-coller tout le contenu du fichier SQL</li>
              <li>Cliquer "Run"</li>
              <li>Recharger cette page (F5)</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
