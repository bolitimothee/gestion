import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Error Boundary - Capte les erreurs React non gérées
 * Affiche une page d'erreur gracieuse au lieu du crash complet
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log l'erreur dans la console en développement
    if (import.meta.env.MODE === 'development') {
      console.error('Error caught by boundary:', error);
      console.error('Error info:', errorInfo);
    }

    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Optionnel: Envoyer l'erreur à un service de monitoring
    // this.reportError(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.MODE === 'development';
      const errorMessage = this.state.error?.message || 'Une erreur inconnue s\'est produite';
      const stackTrace = this.state.errorInfo?.componentStack;

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #5e72e4 0%, #825ee4 100%)',
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '40px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            textAlign: 'center'
          }}>
            {/* Icône d'erreur */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#fee',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <AlertTriangle size={48} color="#c33" />
            </div>

            {/* Titre */}
            <h1 style={{
              fontSize: '28px',
              fontWeight: 'bold',
              color: '#333',
              marginBottom: '10px'
            }}>
              Oups! Une erreur s'est produite
            </h1>

            {/* Description */}
            <p style={{
              fontSize: '16px',
              color: '#666',
              marginBottom: '30px',
              lineHeight: '1.6'
            }}>
              Nous sommes désolés. L'application a rencontré un problème inattendu.
            </p>

            {/* Message d'erreur en développement */}
            {isDev && errorMessage && (
              <div style={{
                background: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '20px',
                textAlign: 'left',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                <p style={{
                  fontSize: '12px',
                  color: '#c33',
                  fontFamily: 'monospace',
                  margin: 0,
                  wordBreak: 'break-word'
                }}>
                  <strong>Erreur:</strong> {errorMessage}
                </p>
                {stackTrace && (
                  <p style={{
                    fontSize: '11px',
                    color: '#666',
                    fontFamily: 'monospace',
                    margin: '10px 0 0 0',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {stackTrace}
                  </p>
                )}
              </div>
            )}

            {/* Compteur d'erreurs */}
            {this.state.errorCount > 1 && (
              <p style={{
                fontSize: '12px',
                color: '#999',
                marginBottom: '20px'
              }}>
                Erreurs depuis le chargement: {this.state.errorCount}
              </p>
            )}

            {/* Boutons d'action */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '12px 24px',
                  background: '#5e72e4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'background 0.3s'
                }}
                onMouseOver={(e) => e.target.style.background = '#4c63d2'}
                onMouseOut={(e) => e.target.style.background = '#5e72e4'}
              >
                <RefreshCw size={16} />
                Réessayer
              </button>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '12px 24px',
                  background: '#f5f5f5',
                  color: '#333',
                  border: '2px solid #5e72e4',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = '#5e72e4';
                  e.target.style.color = 'white';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = '#f5f5f5';
                  e.target.style.color = '#333';
                }}
              >
                Recharger la page
              </button>
            </div>

            {/* Lien vers support */}
            <p style={{
              fontSize: '12px',
              color: '#999',
              marginTop: '30px'
            }}>
              Si le problème persiste, veuillez contacter le support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
