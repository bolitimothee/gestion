import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'
import './styles/components.css'

// Vérification Supabase en dev uniquement (évite appels réseau superflus en prod)
if (import.meta.env.DEV) {
  import('./utils/supabaseCheck.js');
}

// Import optimisations PWA après les styles
import { iOSPWAHelper } from './utils/iosPWAHelper.js'
import { androidInstallPrompt } from './utils/androidInstallPrompt.js'
import logger from './utils/logger.js'

// Enregistrement du Service Worker pour PWA (protection contre SSR/contexts non-navigateur)
if (typeof navigator !== 'undefined' && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        logger.debug('Service Worker enregistré avec succès:', registration);
        // Initialiser les optimisations PWA après l'enregistrement
        iOSPWAHelper.init()
        androidInstallPrompt.init()
      })
      .catch((error) => {
        logger.error('Erreur lors de l\'enregistrement du Service Worker:', error);
        // Même si le SW échoue, essayer d'optimiser PWA
        iOSPWAHelper.init()
        androidInstallPrompt.init()
      })
  })
} else if (typeof window !== 'undefined') {
  // Si pas de service worker, quand même optimiser PWA
  iOSPWAHelper.init()
  androidInstallPrompt.init()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)