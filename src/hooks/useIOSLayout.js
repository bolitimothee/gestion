import { useState, useEffect } from 'react';

/**
 * Hook pour détecter les infos iOS et le layout PWA
 * Gère: Dynamic Island, notch, safe areas, orientation
 */
export const useIOSLayout = () => {
  /**
   * Détecter le type d'appareil iOS et la présence du Dynamic Island
   */
  const detectiOSDevice = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    
    if (!isIOS) {
      return {
        deviceType: 'default',
        isDynamicIsland: false,
        hasNotch: false,
        isIPhone: false,
        isIPad: false,
        screenHeight: window.screen.height,
        screenWidth: window.screen.width
      };
    }

    const screenHeight = window.screen.height;
    const screenWidth = window.screen.width;
    const isIPhone = /iPhone/.test(ua);
    const isIPad = /iPad/.test(ua);

    // Détection Dynamic Island (iPhone 14 Pro, 15 Pro, 16 Pro+)
    // Portrait heights: 852 (14Pro), 932 (14ProMax)
    // Note: En landscape, les dimensions changent
    const isDynamicIsland =
      screenHeight === 852 || screenHeight === 932 ||  // Pro models portrait
      screenHeight === 844 || screenHeight === 926 ||  // Non-Pro with Dynamic Island
      (screenHeight >= 2556 && screenHeight <= 2796);  // Very large devices

    // Détection notch (iPhone X, XS, XS Max, 11 Pro, 11 Pro Max, 12, 13, etc.)
    const hasNotch = screenHeight >= 812;

    let deviceType = 'legacy';
    if (isDynamicIsland) {
      deviceType = 'dynamic-island';
    } else if (hasNotch) {
      if (screenHeight >= 896) {
        deviceType = 'notch-large';
      } else {
        deviceType = 'notch-basic';
      }
    } else if (isIPad) {
      deviceType = 'ipad';
    }

    return {
      deviceType,
      isDynamicIsland,
      hasNotch,
      isIPhone,
      isIPad,
      screenHeight,
      screenWidth
    };
  };

  /**
   * Obtenir les valeurs des safe areas du CSS
   * Retourne les valeurs calculées par le navigateur via env()
   */
  const getSafeAreaInsets = () => {
    if (typeof window === 'undefined') {
      return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const root = document.documentElement;
    const style = getComputedStyle(root);

    // Essayer de récupérer les valeurs réelles des safe areas
    // Si les valeurs ne sont pas trouvées, retourner 0
    const getSafeAreaValue = (property) => {
      try {
        const value = style.getPropertyValue(property).trim();
        if (!value) return 0;
        
        // Convertir "44px" en nombre
        const pixels = parseInt(value, 10);
        return isNaN(pixels) ? 0 : pixels;
      } catch (e) {
        return 0;
      }
    };

    return {
      top: getSafeAreaValue('--safe-area-inset-top'),
      bottom: getSafeAreaValue('--safe-area-inset-bottom'),
      left: getSafeAreaValue('--safe-area-inset-left'),
      right: getSafeAreaValue('--safe-area-inset-right')
    };
  };

  // État initial
  const [iosInfo, setIosInfo] = useState(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isPWA = isStandalone || window.matchMedia('(display-mode: standalone)').matches;
    const deviceInfo = detectiOSDevice();

    return {
      isIOS,
      isStandalone,
      isPWA,
      ...deviceInfo,
      safeAreaInsets: getSafeAreaInsets(),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      isLandscape: window.innerWidth > window.innerHeight
    };
  });

  // Mettre à jour lors des changements d'orientation et de taille
  useEffect(() => {
    const handleOrientationChange = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const deviceInfo = detectiOSDevice();

      setIosInfo(prev => ({
        ...prev,
        ...deviceInfo,
        safeAreaInsets: getSafeAreaInsets(),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        isLandscape: window.innerWidth > window.innerHeight,
        isStandalone,
        isPWA: isStandalone || window.matchMedia('(display-mode: standalone)').matches
      }));
    };

    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('orientationchange', () => {
      // Attendre un peu avant de recalculer (le système met du temps à mettre à jour)
      setTimeout(handleOrientationChange, 100);
    });

    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return iosInfo;
};
