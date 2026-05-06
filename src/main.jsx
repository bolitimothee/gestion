import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'
import './styles/components.css'
import './utils/supabaseCheck.js' // Vérification de la configuration Supabase au démarrage

// Service Worker temporairement désactivé pour debug Vercel
// if ('serviceWorker' in navigator) {
//   window.addEventListener('load', () => {
//     navigator.serviceWorker.register('/sw.js')
//       .then((registration) => {
//         console.log('Service Worker enregistré avec succès:', registration)
//       })
//       .catch((error) => {
//         console.log('Erreur lors de l\'enregistrement du Service Worker:', error)
//       })
//   })
// }

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
