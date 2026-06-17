/**
 * Utilitaire pour gérer le prompt d'installation PWA sur Android
 * Chrome affiche automatiquement le prompt si les conditions sont remplies
 */

let deferredPrompt = null;

export const androidInstallPrompt = {
  // Initialiser et écouter le prompt d'installation
  init() {
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker non supporté');
      return;
    }

    // Écouter l'événement beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      // Empêcher le mini-infobar par défaut
      e.preventDefault();
      // Stocker l'événement pour l'utiliser plus tard
      deferredPrompt = e;
      console.log('PWA install prompt disponible');
      
      // Afficher le prompt automatiquement après 3 secondes si l'utilisateur ne l'a pas rejeté
      setTimeout(() => {
        if (deferredPrompt) {
          this.show();
        }
      }, 3000);
    });

    // Écouter l'événement d'installation
    window.addEventListener('appinstalled', () => {
      console.log('App PWA installée avec succès');
      deferredPrompt = null;
      
      // Optionnel: tracker l'installation
      if (window.gtag) {
        gtag('event', 'app_installed', {
          app_name: 'Gestion de Commerce'
        });
      }
    });
  },

  // Afficher le prompt d'installation manuellement
  async show() {
    if (!deferredPrompt) {
      console.log('Prompt d\'installation non disponible');
      return false;
    }

    try {
      // Afficher le prompt
      deferredPrompt.prompt();
      
      // Attendre la réponse de l'utilisateur
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('Utilisateur a accepté l\'installation');
      } else {
        console.log('Utilisateur a rejeté l\'installation');
      }
      
      // Réinitialiser le prompt
      deferredPrompt = null;
      return outcome === 'accepted';
    } catch (error) {
      console.error('Erreur lors de l\'affichage du prompt:', error);
      return false;
    }
  },

  // Vérifier si le prompt est disponible
  isAvailable() {
    return !!deferredPrompt;
  },

  // Réinitialiser le prompt
  reset() {
    deferredPrompt = null;
  },

  // Vérifier si la PWA est installée
  isInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  },

  // Vérifier la plateforme
  isAndroid() {
    return /Android/i.test(navigator.userAgent);
  },

  // Vérifier le navigateur Chrome
  isChrome() {
    return /Chrome|Chromium|CriOS/i.test(navigator.userAgent);
  }
};
