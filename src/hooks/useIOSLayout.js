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
    if (typeof window === 'undefined') {
      return {
        deviceType: 'default',
        isDynamicIsland: false,
        hasNotch: false,
        isIPhone: false,
        isIPad: false,
        screenHeight: 0,
        screenWidth: 0
      };
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isMacWithTouch = ua.includes('Mac') && 'ontouchend' in document;

    if (!isIOS && !isMacWithTouch) {
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
    const isIPhone = /iPhone/.test(ua) && !/iPad/.test(ua);
    const isIPad = /iPad/.test(ua);

    // Dynamic Island detection
    const isDynamicIsland =
      screenHeight >= 852 && screenHeight <= 956 ||
      (screenHeight >= 393 && screenHeight <= 430 && isIPhone);

    // Notch detection
    const hasNotch = screenHeight >= 812 || (isIPhone && screenHeight >= 800);

    let deviceType = 'legacy';
    if (isDynamicIsland) {
      deviceType = 'dynamic-island';
    } else if (hasNotch) {
      deviceType = screenHeight >= 896 ? 'notch-large' : 'notch-basic';
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
   * Obtenir les valeurs des safe areas
   */
  const getSafeAreaInsets = () => {
    if (typeof window === 'undefined') {
      return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const root = document.documentElement;
    const style = getComputedStyle(root);

    const getSafeAreaValue = (property) => {
      try {
        const value = style.getPropertyValue(property).trim();
        if (!value || value === '0px') return 0;
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

  /**
   * Détecter si on est en mode PWA
   */
  const detectPWA = () => {
    if (typeof window === 'undefined') return { isStandalone: false, isPWA: false };

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
    const isMinimalUI = window.matchMedia('(display-mode: minimal-ui)').matches;

    return {
      isStandalone,
      isPWA: isStandalone || isFullscreen || isMinimalUI
    };
  };

  // État initial
  const [iosInfo, setIosInfo] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        isIOS: false,
        isStandalone: false,
        isPWA: false,
        deviceType: 'default',
        isDynamicIsland: false,
        hasNotch: false,
        isIPhone: false,
        isIPad: false,
        screenHeight: 0,
        screenWidth: 0,
        safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
        windowWidth: 0,
        windowHeight: 0,
        isLandscape: false
      };
    }

    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
    const pwaStatus = detectPWA();
    const deviceInfo = detectiOSDevice();

    return {
      isIOS,
      isStandalone: pwaStatus.isStandalone,
      isPWA: pwaStatus.isPWA,
      ...deviceInfo,
      safeAreaInsets: getSafeAreaInsets(),
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      isLandscape: window.innerWidth > window.innerHeight
    };
  });

  // Mettre à jour lors des changements
  useEffect(() => {
    const handleUpdate = () => {
      const pwaStatus = detectPWA();
      const deviceInfo = detectiOSDevice();

      setIosInfo(prev => ({
        ...prev,
        ...deviceInfo,
        isStandalone: pwaStatus.isStandalone,
        isPWA: pwaStatus.isPWA,
        safeAreaInsets: getSafeAreaInsets(),
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        isLandscape: window.innerWidth > window.innerHeight
      }));
    };

    // Gestionnaire avec debounce pour éviter trop de mises à jour
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleUpdate, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', () => {
      setTimeout(handleUpdate, 100);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []);

  return iosInfo;
};