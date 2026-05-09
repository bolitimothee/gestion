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

  // Désactiver le zoom et le scroll élastique
  disableZoomAndElasticScroll() {
    if (this.isIOS() && this.isPWA()) {
      // Désactiver le zoom
      document.addEventListener('gesturestart', (e) => {
        e.preventDefault();
      });

      // Désactiver le scroll élastique
      document.body.addEventListener('touchmove', (e) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      }, { passive: false });

      // Empêcher le double-tap zoom
      let lastTouchEnd = 0;
      document.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      }, false);
    }
  },

  // Initialiser toutes les optimisations iOS PWA
  init() {
    if (this.isIOS()) {
      console.log('[iOS PWA] Détection iOS, configuration optimisée...');
      
      // Attendre que le DOM soit chargé
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          this.configureViewport();
          this.configureStatusBar();
          this.adjustSafeArea();
          this.hideSafariNavbar();
          this.disableZoomAndElasticScroll();
        });
      } else {
        this.configureViewport();
        this.configureStatusBar();
        this.adjustSafeArea();
        this.hideSafariNavbar();
        this.disableZoomAndElasticScroll();
      }

      // Cacher la barre de navigation après un délai
      setTimeout(() => {
        this.hideSafariNavbar();
      }, 1000);
    }
  }
};
