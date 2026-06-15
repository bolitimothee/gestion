// Utilitaire pour optimiser l'affichage PWA sur iOS
export const iOSPWAHelper = {
  // Détecter si l'app tourne sur iOS
  isIOS() {
    return [
      'iPad Simulator',
      'iPhone Simulator',
      'iPod Simulator',
      'iPad',
      'iPhone',
      'iPod'
    ].includes(navigator.platform)
    || (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  },

  // Détecter si l'app est en mode PWA (standalone)
  isStandalone() {
    return ('standalone' in window.navigator) && window.navigator.standalone;
  },

  // Détecter si l'app est en mode PWA via criteria
  isPWA() {
    return this.isStandalone() || window.matchMedia('(display-mode: standalone)').matches;
  },

  // Configurer le viewport pour iOS PWA
  configureViewport() {
    if (this.isIOS() && this.isPWA()) {
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute('content', 
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimal-ui'
        );
      }
    }
  },

  // Cacher la barre de navigation Safari
  hideSafariNavbar() {
    if (this.isIOS() && this.isPWA()) {
      // Scroll vers le haut pour cacher la barre
      window.scrollTo(0, 0);
      
      // Forcer le viewport en mode plein écran
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          // Ignorer les erreurs de fullscreen
        });
      }
    }
  },

  // Ajuster le safe area pour iOS
  adjustSafeArea() {
    if (this.isIOS()) {
      const root = document.documentElement;
      root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
      root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
      root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
      root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');
    }
  },

  // Configurer le status bar pour iOS
  configureStatusBar() {
    if (this.isIOS()) {
      // Forcer la status bar en mode translucent
      const metaTag = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
      if (metaTag) {
        metaTag.setAttribute('content', 'black-translucent');
      }
    }
  },

  // Désactiver le zoom et le scroll élastique - SANS BLOQUER LE SCROLLING
  disableZoomAndElasticScroll() {
    if (this.isIOS() && this.isPWA()) {
      // Désactiver le zoom pinch
      document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
      });

      // Permettre le scroll vertical normal, bloquer uniquement le multi-touch
      document.addEventListener('touchmove', (e) => {
        // Bloquer le scroll élastique UNIQUEMENT avec multi-touch (pinch zoom)
        if (e.touches.length > 1) {
          e.preventDefault();
        }
        // Sinon laisser le scroll vertical normal (ne pas bloquer)
      }, { passive: false });

      // Empêcher le double-tap zoom mais laisser le scroll fonctionner
      let lastTouchEnd = 0;
      const mainContent = document.querySelector('.main-content');
      
      if (mainContent) {
        // Gérer le double-tap zoom uniquement si la cible n'est pas un formulaire
        mainContent.addEventListener('touchend', (e) => {
          const now = Date.now();
          // Bloquer double-tap zoom uniquement sur les éléments non-input
          if (now - lastTouchEnd <= 300 && !e.target.closest('input, textarea, select, button')) {
            e.preventDefault();
          }
          lastTouchEnd = now;
        }, false);
      }
    }
  },

  // Ajuster la responsivité pour PWA iOS
  adjustPWAResponsivity() {
    if (this.isIOS() && this.isPWA()) {
      // Détecter l'orientation et ajuster le layout
      const handleOrientationChange = () => {
        const isLandscape = window.innerWidth > window.innerHeight;
        
        // Ajuster les variables CSS pour l'orientation
        const root = document.documentElement;
        root.style.setProperty('--pwa-height', `${window.innerHeight}px`);
        root.style.setProperty('--pwa-width', `${window.innerWidth}px`);
        root.style.setProperty('--pwa-orientation', isLandscape ? 'landscape' : 'portrait');
        
        // Forcer le recalculage du viewport
        this.configureViewport();
        
        // Ajuster le safe area après changement d'orientation
        setTimeout(() => {
          this.adjustSafeArea();
          this.hideSafariNavbar();
        }, 50);
      };

      // Écouter les changements d'orientation
      window.addEventListener('orientationchange', handleOrientationChange);
      window.addEventListener('resize', handleOrientationChange);
      
      // Exécuter une première fois
      handleOrientationChange();
    }
  },

  // Optimiser l'affichage pour les écrans iOS
  optimizeDisplay() {
    if (this.isIOS() && this.isPWA()) {
      const root = document.documentElement;
      
      // Détecter le type d'appareil
      const isIPhone = /iPhone/.test(navigator.userAgent);
      const isIPad = /iPad/.test(navigator.userAgent);
      
      // Ajuster les variables CSS selon l'appareil
      if (isIPhone) {
        root.style.setProperty('--device-type', 'iphone');
        // Ajustements spécifiques iPhone
        const hasNotch = window.screen.height >= 812; // iPhone X et plus
        root.style.setProperty('--has-notch', hasNotch ? '1' : '0');
      } else if (isIPad) {
        root.style.setProperty('--device-type', 'ipad');
        // Ajustements spécifiques iPad
        root.style.setProperty('--has-notch', '0');
      }
      
      // Optimiser le main content pour PWA - NE PAS définir de hauteur rigide
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        // Utiliser min-height et allow scrolling
        mainContent.style.minHeight = 'calc(100vh - var(--navbar-height))';
        mainContent.style.overflowY = 'auto';
        mainContent.style.overflowX = 'hidden';
        mainContent.style.webkitOverflowScrolling = 'touch';
      }
    }
  },

  // Gérer le focus sur iOS PWA
  handleFocusManagement() {
    if (this.isIOS() && this.isPWA()) {
      // Empêcher le zoom sur les inputs
      const inputs = document.querySelectorAll('input, textarea, select');
      inputs.forEach(input => {
        input.addEventListener('focus', () => {
          // Adapter le viewport quand le clavier apparaît
          setTimeout(() => {
            window.scrollTo(0, 0);
          }, 150);
        });
        
        input.addEventListener('blur', () => {
          // Restaurer le viewport quand le clavier disparaît
          setTimeout(() => {
            this.hideSafariNavbar();
          }, 75);
        });
      });
    }
  },

  // Initialiser toutes les optimisations iOS PWA
  init() {
    if (this.isIOS()) {
    if (import.meta.env.MODE === 'development') {
      console.log('[iOS PWA] Détection iOS, configuration optimisée...');
    }
      
      // Attendre que le DOM soit chargé
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.configureViewport();
          this.configureStatusBar();
          this.adjustSafeArea();
          this.hideSafariNavbar();
          this.disableZoomAndElasticScroll();
          this.adjustPWAResponsivity();
          this.optimizeDisplay();
          this.handleFocusManagement();
        });
      } else {
        this.configureViewport();
        this.configureStatusBar();
        this.adjustSafeArea();
        this.hideSafariNavbar();
        this.disableZoomAndElasticScroll();
        this.adjustPWAResponsivity();
        this.optimizeDisplay();
        this.handleFocusManagement();
      }

      // Cacher la barre de navigation après un délai (réduit pour réactivité)
      setTimeout(() => {
        this.hideSafariNavbar();
        this.optimizeDisplay();
      }, 300);

      // Optimiser après le chargement complet (réduit)
      window.addEventListener('load', () => {
        setTimeout(() => {
          this.adjustPWAResponsivity();
          this.optimizeDisplay();
        }, 200);
      });
    }
  }
};
