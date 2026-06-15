import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'
import './styles/components.css'
// Vérification Supabase en dev uniquement (évite appels réseau superflus en prod)
if (import.meta.env.DEV) {
  import('./utils/supabaseCheck.js');
}
import { iOSPWAHelper } from './utils/iosPWAHelper.js' // Optimisation PWA iOS

// Enregistrement du Service Worker pour PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
  if (import.meta.env.MODE === 'development') {
    console.log('Service Worker enregistré avec succès:', registration);
  }
        // Initialiser les optimisations PWA iOS après l'enregistrement
        iOSPWAHelper.init()
      })
      .catch((error) => {
  if (import.meta.env.MODE === 'development') {
    console.log('Erreur lors de l\'enregistrement du Service Worker:', error);
  }
        // Même si le SW échoue, essayer d'optimiser PWA iOS
        iOSPWAHelper.init()
      })
  })
} else {
  // Si pas de service worker, quand même optimiser PWA iOS
  iOSPWAHelper.init()
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
