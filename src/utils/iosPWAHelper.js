/**
 * iOS PWA Helper - Gestion optimisée pour iPhone/iPad en mode PWA/Standalone
 * Gère le Dynamic Island, le notch, et les safe areas
 */
export const iOSPWAHelper = {
  // ===== DÉTECTION =====
  
  /**
   * Détecter si l'app tourne sur iOS
   */
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

  /**
   * Détecter si l'app est en mode PWA (standalone) - Installée sur l'écran d'accueil
   */
  isStandalone() {
    return ('standalone' in window.navigator) && window.navigator.standalone;
  },

  /**
   * Détecter si l'app est en mode PWA (display-mode: standalone)
   */
  isPWA() {
    return this.isStandalone() || window.matchMedia('(display-mode: standalone)').matches;
  },

  /**
   * Détecter le type d'appareil iOS et la présence du Dynamic Island
   */
  detectDevice() {
    const ua = navigator.userAgent;
    const screenHeight = window.screen.height;
    const screenWidth = window.screen.width;
    
    const isIPhone = /iPhone/.test(ua);
    const isIPad = /iPad/.test(ua);
    
    let deviceInfo = {
      isIPhone,
      isIPad,
      hasDynamicIsland: false,
      hasNotch: false,
      deviceType: 'unknown'
    };

    if (isIPhone) {
      // Hauteurs de Dynamic Island (iPhone 14 Pro, 15 Pro, 16 Pro, etc.)
      // En portrait: 852px (Pro), 932px (Pro Max)
      // En landscape: 393px, 430px, etc.
      const isDynamicIsland = 
        screenHeight === 852 || screenHeight === 932 ||  // Portrait Pro models
        screenHeight === 844 || screenHeight === 926 ||  // Portrait non-Pro (Dynamic Island possible)
        (screenHeight >= 2556 && screenHeight <= 2796);  // Very tall devices
      
      deviceInfo.hasDynamicIsland = isDynamicIsland;
      
      // Notch detection (iPhone X, XS, XS Max, 11 Pro, 11 Pro Max, 12, 12 Pro, etc.)
      deviceInfo.hasNotch = screenHeight >= 812;
      
      // Déterminer le type spécifique
      if (isDynamicIsland) {
        deviceInfo.deviceType = 'dynamic-island';
      } else if (deviceInfo.hasNotch) {
        deviceInfo.deviceType = screenHeight >= 896 ? 'notch-large' : 'notch-basic';
      } else {
        deviceInfo.deviceType = 'legacy';
      }
    } else if (isIPad) {
      deviceInfo.deviceType = 'ipad';
    }

    return deviceInfo;
  },

  // ===== CONFIGURATION =====

  /**
   * Configurer le viewport meta tag pour iOS PWA
   * viewport-fit=cover permet d'utiliser l'espace du Dynamic Island
   */
  configureViewport() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (viewport) {
      const content = this.isPWA()
        ? 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimal-ui'
        : 'width=device-width, initial-scale=1.0, viewport-fit=cover';
      
      viewport.setAttribute('content', content);
    }

    if (import.meta.env.MODE === 'development') {
      console.log('[iOS PWA] Viewport configuré:', viewport?.getAttribute('content'));
    }
  },

  /**
   * Configurer la barre de statut iOS
   */
  configureStatusBar() {
    if (!this.isIOS()) return;

    const metaTag = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (metaTag) {
      // En mode PWA, utiliser black-translucent pour avoir le style maximal
      // Sinon utiliser default ou black selon les préférences
      const style = this.isPWA() ? 'black-translucent' : 'black';
      metaTag.setAttribute('content', style);
    }
  },

  /**
   * Appliquer les CSS variables pour les safe areas
   */
  applySafeAreaVariables() {
    if (!this.isIOS()) return;

    const root = document.documentElement;
    
    // Définir les variables CSS pour les safe areas
    // Ces valeurs sont lues automatiquement par le CSS via env()
    root.style.setProperty('--safe-area-inset-top', 'env(safe-area-inset-top)');
    root.style.setProperty('--safe-area-inset-bottom', 'env(safe-area-inset-bottom)');
    root.style.setProperty('--safe-area-inset-left', 'env(safe-area-inset-left)');
    root.style.setProperty('--safe-area-inset-right', 'env(safe-area-inset-right)');

    if (import.meta.env.MODE === 'development') {
      // Afficher les safe area values pour debug
      const computedStyle = getComputedStyle(root);
      console.log('[iOS PWA] Safe Area - Top:', computedStyle.getPropertyValue('--safe-area-inset-top'));
    }
  },

  /**
   * Cacher la barre de navigation Safari
   */
  hideSafariNavbar() {
    if (!this.isPWA()) return;

    // Scroll vers le haut pour cacher la barre Safari (si elle existe)
    window.scrollTo(0, 1);
    
    // Alternative: utiliser requestFullscreen si disponible
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Silencieusement ignorer les erreurs de fullscreen
      });
    }
  },

  // ===== GESTION DES INTERACTIONS =====

  /**
   * Désactiver le zoom et le scroll élastique - SANS BLOQUER LE SCROLLING VERTICAL
   */
  disableZoomAndElasticScroll() {
    if (!this.isPWA()) return;

    // Désactiver le zoom pinch (multi-touch)
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    }, { passive: false });

    // Permettre le scroll vertical normal, bloquer UNIQUEMENT le pinch zoom (multi-touch)
    document.addEventListener('touchmove', (e) => {
      // Bloquer le pinch zoom (plusieurs doigts)
      if (e.touches.length > 1) {
        e.preventDefault();
      }
      // Laisser passer le scroll à un doigt
    }, { passive: false });

    // Empêcher le double-tap zoom sur les éléments non-interactifs
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      const isFormElement = e.target.closest('input, textarea, select, button, [role="button"]');
      
      // Double-tap sur un élément non-formulaire = zoom → bloquer
      if (now - lastTouchEnd <= 300 && !isFormElement) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });

    if (import.meta.env.MODE === 'development') {
      console.log('[iOS PWA] Gestion du zoom et scroll configurée');
    }
  },

  /**
   * Gérer les changements d'orientation et de taille d'écran
   */
  handleOrientationChange() {
    if (!this.isPWA()) return;

    const updateLayout = () => {
      const root = document.documentElement;
      const { hasDynamicIsland, deviceType } = this.detectDevice();
      
      // Mettre à jour les variables CSS
      root.style.setProperty('--pwa-height', `${window.innerHeight}px`);
      root.style.setProperty('--pwa-width', `${window.innerWidth}px`);
      root.style.setProperty('--pwa-orientation', window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
      root.style.setProperty('--device-type', deviceType);
      root.style.setProperty('--has-dynamic-island', hasDynamicIsland ? '1' : '0');

      // Réappliquer le viewport et cacher la navbar Safari
      this.configureViewport();
      this.applySafeAreaVariables();
      
      // Attendre un peu avant de cacher la navbar Safari
      setTimeout(() => {
        this.hideSafariNavbar();
      }, 100);

      if (import.meta.env.MODE === 'development') {
        console.log('[iOS PWA] Orientation changée:', {
          type: deviceType,
          isDynamicIsland: hasDynamicIsland,
          width: window.innerWidth,
          height: window.innerHeight
        });
      }
    };

    window.addEventListener('orientationchange', updateLayout);
    window.addEventListener('resize', updateLayout);
    
    // Exécuter une première fois
    updateLayout();
  },

  /**
   * Gérer le focus des inputs (clavier virtuel)
   */
  handleInputFocus() {
    if (!this.isPWA()) return;

    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        // Quand le clavier apparaît, assurer que l'input est visible
        setTimeout(() => {
          // Scroll le minimum nécessaire
          const rect = input.getBoundingClientRect();
          const navbar = document.querySelector('.navbar');
          const navbarHeight = navbar ? navbar.offsetHeight : 80;
          
          if (rect.top < navbarHeight) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      });

      input.addEventListener('blur', () => {
        // Quand le clavier disparaît, restaurer la position
        setTimeout(() => {
          this.hideSafariNavbar();
        }, 100);
      });
    });
  },

  /**
   * Optimiser l'affichage du contenu principal
   */
  optimizeContentDisplay() {
    if (!this.isPWA()) return;

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      // Assurer que le contenu scroll correctement
      mainContent.style.overflowY = 'auto';
      mainContent.style.overflowX = 'hidden';
      mainContent.style.webkitOverflowScrolling = 'touch';
      
      // Ne PAS définir min-height ici - laisser le CSS avec margin-top gérer ça
    }

    const layout = document.querySelector('.layout');
    if (layout) {
      layout.style.minHeight = '100dvh'; // Utiliser 100dvh au lieu de 100vh
    }
  },

  // ===== INITIALISATION =====

  /**
   * Initialiser toutes les optimisations iOS PWA
   */
  init() {
    if (!this.isIOS()) {
      if (import.meta.env.MODE === 'development') {
        console.log('[iOS PWA] Non iOS - skipping');
      }
      return;
    }

    const { deviceType, hasDynamicIsland } = this.detectDevice();
    if (import.meta.env.MODE === 'development') {
      console.log('[iOS PWA] Initialisation - Device:', deviceType, 'Dynamic Island:', hasDynamicIsland);
    }

    // Fonction qui s'exécute quand le DOM est prêt
    const runOptimizations = () => {
      // Configuration initiale
      this.configureViewport();
      this.configureStatusBar();
      this.applySafeAreaVariables();
      
      // Gestion des interactions
      this.disableZoomAndElasticScroll();
      this.handleOrientationChange();
      this.handleInputFocus();
      
      // Optimisation de l'affichage
      this.optimizeContentDisplay();
      
      // Cacher la barre Safari
      this.hideSafariNavbar();
    };

    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runOptimizations);
    } else {
      runOptimizations();
    }

    // Cacher la barre Safari après un court délai
    setTimeout(() => {
      this.hideSafariNavbar();
    }, 300);

    // Optimiser après le chargement complet de la page
    window.addEventListener('load', () => {
      setTimeout(() => {
        this.handleOrientationChange();
        this.optimizeContentDisplay();
      }, 200);
    });

    if (import.meta.env.MODE === 'development') {
      console.log('[iOS PWA] Initialisation complète');
    }
  }
};
