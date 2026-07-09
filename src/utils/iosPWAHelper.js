/**
 * iOS PWA Helper - Gestion optimisée pour iPhone/iPad en mode PWA/Standalone
 * Gère le Dynamic Island, le notch, et les safe areas
 * Version optimisée avec détection moderne
 */
export const iOSPWAHelper = {
  // ===== DÉTECTION MODERNE =====

  /**
   * Détecter si l'app tourne sur iOS - VERSION MODERNE
   */
  isIOS() {
    if (typeof window === 'undefined') return false;

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);

    // Fallback pour les nouveaux iPads avec M1/M2 (Macintosh + touch)
    const isMacWithTouch = (ua.includes('Mac') && 'ontouchend' in document);

    return isIOS || isMacWithTouch;
  },

  /**
   * Détecter si l'app est en mode PWA (standalone) - MODERN APPROACH
   */
  isStandalone() {
    if (typeof window === 'undefined') return false;

    // Méthode moderne avec matchMedia
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Fallback pourSafari anciennes versions
    const isFullScreen = window.navigator.standalone === true;

    return isStandalone || isFullScreen;
  },

  /**
   * Détecter si l'app est en mode PWA (display-mode: standalone ou fullscreen)
   */
  isPWA() {
    if (typeof window === 'undefined') return false;

    return (
      this.isStandalone() ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    );
  },

  /**
   * Détecter le type d'appareil iOS et la présence du Dynamic Island
   * VERSION ROBUSTE avec plusieurs méthodes de détection
   */
  detectDevice() {
    if (typeof window === 'undefined') {
      return { deviceType: 'unknown', isIPhone: false, isIPad: false, hasDynamicIsland: false, hasNotch: false };
    }

    const ua = navigator.userAgent;
    const screenHeight = window.screen.height;
    const availHeight = window.screen.availHeight;

    const isIPhone = /iPhone/.test(ua) && !/iPad/.test(ua);
    const isIPad = /iPad/.test(ua);

    let deviceInfo = {
      isIPhone,
      isIPad,
      hasDynamicIsland: false,
      hasNotch: false,
      deviceType: 'unknown'
    };

    // Dynamic Island -多种检测方法
    // iPhone 14 Pro: 852x393 (portrait)
    // iPhone 14 Pro Max: 932x430 (portrait)
    // iPhone 15/16 Pro: même dimensions
    const isDynamicIsland =
      screenHeight >= 852 && screenHeight <= 956 ||  // Portrait tall
      (screenHeight >= 393 && screenHeight <= 430 && isIPhone);  // Landscape

    // Also check with availHeight (excludes status bar)
    const isDynamicIslandAlt = (
      availHeight >= 844 &&  // Exclude status bar
      (ua.includes('iPhone 14 Pro') || ua.includes('iPhone 15') || ua.includes('iPhone 16'))
    );

    deviceInfo.hasDynamicIsland = isDynamicIsland || isDynamicIslandAlt;

    // Notch detection - iPhone X and newer
    // Notch: 812 (X/XS), 896 (XS Max/11 Pro Max), 844 (12/13/14)
    deviceInfo.hasNotch = screenHeight >= 812 || (isIPhone && screenHeight >= 800);

    // Déterminer le type spécifique
    if (deviceInfo.hasDynamicIsland) {
      deviceInfo.deviceType = 'dynamic-island';
    } else if (deviceInfo.hasNotch) {
      deviceInfo.deviceType = screenHeight >= 896 ? 'notch-large' : 'notch-basic';
    } else if (isIPad) {
      deviceInfo.deviceType = 'ipad';
    } else if (isIPhone) {
      deviceInfo.deviceType = 'legacy';
    }

    return deviceInfo;
  },

  /**
   * Détecter si c'est Android PWA
   */
  isAndroidPWA() {
    if (typeof window === 'undefined') return false;

    return (
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: standalone)').matches
    ) && !this.isIOS();
  },

  // ===== CONFIGURATION =====

  /**
   * Configurer le viewport meta tag pour iOS PWA
   * viewport-fit=cover permet d'utiliser l'espace du Dynamic Island
   */
  configureViewport() {
    if (typeof window === 'undefined') return;

    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;

    const content = this.isPWA()
      ? 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover, minimal-ui'
      : 'width=device-width, initial-scale=1.0, viewport-fit=cover';

    viewport.setAttribute('content', content);

    if (import.meta.env.MODE === 'development') {
      console.log('[iOS PWA] Viewport configuré:', viewport.getAttribute('content'));
    }
  },

  /**
   * Configurer la barre de statut iOS
   */
  configureStatusBar() {
    if (!this.isIOS()) return;

    const metaTag = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (!metaTag) return;

    const style = this.isPWA() ? 'black-translucent' : 'black';
    metaTag.setAttribute('content', style);
  },

  /**
   * Appliquer les CSS variables pour les safe areas
   */
  applySafeAreaVariables() {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;

    // Définir les variables CSS pour les safe areas
    root.style.setProperty('--safe-area-top', 'env(safe-area-inset-top, 0px)');
    root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom, 0px)');
    root.style.setProperty('--safe-area-left', 'env(safe-area-inset-left, 0px)');
    root.style.setProperty('--safe-area-right', 'env(safe-area-inset-right, 0px)');

    const { deviceType, hasDynamicIsland, hasNotch } = this.detectDevice();
    root.style.setProperty('--device-type', deviceType);
    root.style.setProperty('--has-dynamic-island', hasDynamicIsland ? '1' : '0');
    root.style.setProperty('--has-notch', hasNotch ? '1' : '0');

    if (import.meta.env.MODE === 'development') {
      const computedStyle = getComputedStyle(root);
      console.log('[iOS PWA] Safe Area - Top:', computedStyle.getPropertyValue('--safe-area-inset-top'));
      console.log('[iOS PWA] Device:', deviceType);
    }
  },

  /**
   * Cacher la barre de navigation Safari
   */
  hideSafariNavbar() {
    if (!this.isPWA()) return;

    // Scroll vers le haut pour cacher la barre Safari
    window.scrollTo(0, 0);

    // Alternative: utiliser requestFullscreen si disponible
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        // Silencieusement ignorer les erreurs
      });
    }
  },

  // ===== GESTION DES INTERACTIONS =====

  /**
   * Désactiver le zoom et le scroll élastique - OPTIMISÉ
   */
  disableZoomAndElasticScroll() {
    if (!this.isPWA()) return;

    // Désactiver le pinch zoom (multi-touch)
    document.addEventListener('gesturestart', (e) => {
      e.preventDefault();
    }, { passive: false });

    // Bloquer pinch zoom mais permettre le scroll normal
    document.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });

    // Empêcher le double-tap zoom sur les éléments non-interactifs
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      const isFormElement = e.target.closest('input, textarea, select, button, [role="button"]');

      if (now - lastTouchEnd <= 300 && !isFormElement) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });

    // Empêcher le scroll élastique (overscroll)
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

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
      const { deviceType, hasDynamicIsland } = this.detectDevice();

      // Mettre à jour les variables CSS
      root.style.setProperty('--pwa-height', `${window.innerHeight}px`);
      root.style.setProperty('--pwa-width', `${window.innerWidth}px`);
      root.style.setProperty('--pwa-orientation', window.innerWidth > window.innerHeight ? 'landscape' : 'portrait');
      root.style.setProperty('--device-type', deviceType);
      root.style.setProperty('--has-dynamic-island', hasDynamicIsland ? '1' : '0');

      // Réappliquer le viewport
      this.configureViewport();
      this.applySafeAreaVariables();

      // Cacher la navbar Safari après un court délai
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
        setTimeout(() => {
          const rect = input.getBoundingClientRect();
          const navbar = document.querySelector('.navbar');
          const navbarHeight = navbar ? navbar.offsetHeight : 80;

          if (rect.top < navbarHeight) {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      });

      input.addEventListener('blur', () => {
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
      mainContent.style.overflowY = 'auto';
      mainContent.style.overflowX = 'hidden';
      mainContent.style.webkitOverflowScrolling = 'touch';
    }

    const layout = document.querySelector('.layout');
    if (layout) {
      layout.style.minHeight = '100dvh';
      layout.style.height = '100dvh';
    }

    // S'assurer que body n'a pas de scroll problématique
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'relative';
    document.body.style.height = '100%';
  },

  /**
   * Optimiser pour Android PWA
   */
  optimizeAndroidPWA() {
    if (!this.isAndroidPWA()) return;

    document.body.style.overflow = 'hidden';

    const layout = document.querySelector('.layout');
    if (layout) {
      layout.style.minHeight = '100vh';
      layout.style.height = '100vh';
    }

    if (import.meta.env.MODE === 'development') {
      console.log('[Android PWA] Optimisé');
    }
  },

  // ===== INITIALISATION =====

  /**
   * Initialiser toutes les optimisations PWA
   */
  init() {
    if (typeof window === 'undefined') return;

    // Détecter le type d'appareil
    const isIOS = this.isIOS();
    const isPWA = this.isPWA();
    const deviceInfo = this.detectDevice();

    if (import.meta.env.MODE === 'development') {
      console.log('[PWA Helper] Initialisation:', {
        isIOS,
        isPWA,
        isAndroidPWA: this.isAndroidPWA(),
        deviceType: deviceInfo.deviceType
      });
    }

    // Fonction qui s'exécute quand le DOM est prêt
    const runOptimizations = () => {
      // Configuration initiale
      this.configureViewport();
      if (isIOS) {
        this.configureStatusBar();
      }
      this.applySafeAreaVariables();

      // Gestion des interactions (PWA seulement)
      if (isPWA) {
        this.disableZoomAndElasticScroll();
        this.handleOrientationChange();
        this.handleInputFocus();
        this.optimizeContentDisplay();
      }

      // Optimisation Android PWA
      if (this.isAndroidPWA()) {
        this.optimizeAndroidPWA();
      }

      // Cacher la barre Safari
      this.hideSafariNavbar();
    };

    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', runOptimizations);
    } else {
      runOptimizations();
    }

    // Optimisations après chargement complet
    setTimeout(() => {
      this.hideSafariNavbar();
      if (isPWA) {
        this.handleOrientationChange();
        this.optimizeContentDisplay();
      }
    }, 300);

    window.addEventListener('load', () => {
      setTimeout(() => {
        if (isPWA) {
          this.handleOrientationChange();
          this.optimizeContentDisplay();
        }
        if (this.isAndroidPWA()) {
          this.optimizeAndroidPWA();
        }
      }, 200);
    });

    if (import.meta.env.MODE === 'development') {
      console.log('[PWA Helper] Initialisation complète');
    }
  }
};