import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, AlertCircle } from 'lucide-react';
import './Auth.css';

export default function Login() {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(location.state?.expired ? 'Votre compte a expiré. Veuillez contacter l\'administrateur.' : '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, user, isAccountExpired } = useAuth();

  // Nettoyer l'état de navigation pour éviter de réafficher le message
  useEffect(() => {
    if (location.state?.expired) {
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // Rediriger automatiquement si déjà connecté
  useEffect(() => {
    if (user && !isAccountExpired) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isAccountExpired, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (import.meta.env.MODE === 'development') {
        console.debug('Login submit', { email });
      }
      // Appel direct à signIn; les timeouts internes sont gérés dans le service
      const result = await signIn(email, password);
      if (import.meta.env.MODE === 'development') {
        console.debug('Login result', result);
        console.debug('Login result data/error', {
          data: result?.data,
          error: result?.error,
        });
      }
      if (result?.error) {
        setError(result.error.message || 'Erreur de connexion. Veuillez contacter l\'administrateur.');
        return;
      }

      // Le useEffect ci-dessus va gérer la redirection
    } catch (err) {
      console.error('Login error', err);
      setError(err.message || 'Erreur lors de la connexion. Veuillez contacter l\'administrateur.');
    } finally {
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
            Vous n'avez pas de compte ? <Link to="/register">Créer un compte</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
