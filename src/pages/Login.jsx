import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import './Auth.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, user } = useAuth();

  // Rediriger automatiquement si déjà connecté
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn(email, password);
      if (result.error) {
        // Gérer les différents types d'erreur
        if (result.error === 'ACCOUNT_EXPIRED') {
          navigate('/account-expired', { replace: true });
        } else {
          setError(result.error.message || result.error || 'Erreur de connexion');
          setLoading(false);
        }
      } else {
        // Attendre que le state se mette à jour avant de naviguer
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de la connexion');
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Se connecter</h1>
          <p>Gestion de Commerce</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <Mail size={20} className="input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemple@email.com"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ent. mot de passe"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Connexion en cours...' : 'Se connecter'}
          </button>
        </form>

        <div className="auth-footer">
          <p className="auth-info">
            Pour créer un nouveau compte, contactez votre administrateur
          </p>
        </div>
      </div>
    </div>
  );
}
