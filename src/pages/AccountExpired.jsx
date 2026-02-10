import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import './AccountExpired.css';

export default function AccountExpired() {
  const navigate = useNavigate();

  useEffect(() => {
    // Déconnecter l'utilisateur
    const logout = async () => {
      await supabase.auth.signOut();
    };
    logout();
  }, []);

  return (
    <div className="expired-container">
      <div className="expired-card">
        <div className="expired-icon">
          <AlertCircle size={64} color="#ef4444" />
        </div>
        
        <h1>Abonnement Expiré</h1>
        
        <p className="expired-message">
          Votre abonnement a expiré et l'accès à votre compte a été désactivé.
        </p>

        <div className="expired-details">
          <p>
            Pour continuer à utiliser votre compte, veuillez contacter l'administrateur 
            pour renouveler votre abonnement.
          </p>
          <p>
            <strong>Bonne nouvelle:</strong> Toutes vos données sont sécurisées et 
            restaurées dès que votre abonnement sera réactivé.
          </p>
        </div>

        <button 
          onClick={() => navigate('/login')}
          className="expired-button"
        >
          Retourner à la Connexion
        </button>

        <p className="expired-footer">
          © 2026 Gestion Commerce - Tous les droits réservés
        </p>
      </div>
    </div>
  );
}
