import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children }) {
  const { user, loading, accountValid } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)',
        color: 'white'
      }}>
        <div style={{
          fontSize: '24px',
          marginBottom: '20px'
        }}>Chargement...</div>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '50%',
          borderTop: '4px solid white',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  // Vérifier si l'utilisateur est connecté
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Vérifier si le compte est valide
  if (!accountValid) {
    return <Navigate to="/account-expired" replace />;
  }

  // L'utilisateur est connecté et le compte est valide, afficher le contenu
  return children;
}
