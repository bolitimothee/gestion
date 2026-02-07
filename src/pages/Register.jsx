import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Building2, Calendar, AlertCircle } from 'lucide-react';
import './Auth.css';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountName, setAccountName] = useState('');
  const [validityDate, setValidityDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signUp, user } = useAuth();

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

    if (!email || !password || !accountName || !validityDate) {
      setError('Tous les champs sont obligatoires');
      setLoading(false);
      return;
    }

    try {
      const result = await signUp(email, password, accountName, validityDate);
      if (result.error) {
        setError(result.error.message || 'Erreur lors de l\'inscription');
        setLoading(false);
      } else {
        // Attendre que le state se mette à jour avant de naviguer
        // Le useEffect ci-dessus va gérer la redirection
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'inscription');
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card auth-card-large">
        <div className="auth-header">
          <h1>S'inscrire</h1>
          <p>Créer un nouveau compte</p>
        </div>

        {error && (
          <div className="alert alert-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="accountName">Nom du Commerce</label>
            <div className="input-wrapper">
              <Building2 size={20} className="input-icon" />
              <input
                id="accountName"
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Ex: Ma Boutique SARL"
                required
              />
            </div>
          </div>

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
                placeholder="Min. 8 caracteres"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="validityDate">Date de validité du compte</label>
            <div className="input-wrapper">
              <Calendar size={20} className="input-icon" />
              <input
                id="validityDate"
                type="date"
                value={validityDate}
                onChange={(e) => setValidityDate(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Inscription en cours...' : 'S\'inscrire'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Vous avez déjà un compte? <Link to="/login">Se connecter</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
