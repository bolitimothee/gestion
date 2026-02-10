import { useEffect } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Startup() {
  const { isAuthReady, user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthReady) {
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    }
  }, [loading, isAuthReady, user, navigate]);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f0f4f8',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        maxWidth: '500px',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 20px 0', color: '#333' }}>
          📊 Gestion Commerce
        </h1>
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          borderLeft: '4px solid #3b82f6'
        }}>
          <p style={{ margin: '0', color: '#666', fontSize: '14px' }}>
            Initialisation en cours...
          </p>
          <div style={{
            marginTop: '15px',
            display: 'flex',
            justifyContent: 'center',
            gap: '5px'
          }}>
            <span style={{ fontSize: '20px', animation: 'bounce 1s infinite' }}>•</span>
            <span style={{ fontSize: '20px', animation: 'bounce 1s infinite 0.2s' }}>•</span>
            <span style={{ fontSize: '20px', animation: 'bounce 1s infinite 0.4s' }}>•</span>
          </div>
        </div>
        
        <p style={{ margin: '15px 0', color: '#666', fontSize: '13px' }}>
          Cela peut prendre quelques secondes...
        </p>

        <div style={{
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          borderLeft: '4px solid #f59e0b',
          textAlign: 'left'
        }}>
          <strong style={{ display: 'block', marginBottom: '10px' }}>
            ⚠️ Avant de commencer:
          </strong>
          <ol style={{ margin: '0', paddingLeft: '20px', fontSize: '12px', color: '#666' }}>
            <li>Créer un compte sur <a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>supabase.com</a></li>
            <li>Créer un nouveau projet</li>
            <li>Aller à SQL Editor</li>
            <li>Exécuter <code style={{ backgroundColor: '#f5f5f5', padding: '2px 4px' }}>SUPABASE_FINAL_COMPLET.sql</code></li>
            <li>Recharger cette page (F5)</li>
          </ol>
        </div>

        <div style={{ marginTop: '20px' }}>
          <a
            href="/test"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '6px',
              fontSize: '14px'
            }}
          >
            🔍 Vérifier la connexion
          </a>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
