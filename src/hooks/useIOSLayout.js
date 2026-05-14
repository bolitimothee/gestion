import { useState, useEffect } from 'react';

export const useIOSLayout = () => {
  const detectiOSDevice = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    
    if (!isIOS) return { deviceType: 'default', isDynamicIsland: false };
    
    const screenHeight = window.screen.height;
    
    // Détection Dynamic Island (iPhone 14 Pro, 15 Pro)
    const isDynamicIsland = screenHeight === 852 || screenHeight === 932 || 
                           (screenHeight >= 2556 && screenHeight <= 2796);
    
    let deviceType = 'legacy';
    if (screenHeight >= 812 && screenHeight <= 896) {
      deviceType = 'notch-basic';
    } else if (screenHeight > 896 && screenHeight <= 932) {
      deviceType = 'notch-large';
    } else if (isDynamicIsland) {
      deviceType = 'dynamic-island';
    }
    
    return { deviceType, isDynamicIsland };
  };

  const getSafeAreaInsets = () => {
    // Le CSS gère les safe areas avec env(), on retourne des valeurs par défaut
    // Les valeurs réelles sont gérées par le navigateur via CSS
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    };
  };

  const [iosInfo, setIosInfo] = useState(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const { deviceType, isDynamicIsland } = detectiOSDevice();
    
    return {
      isIOS,
      isStandalone,
      deviceType,
      isDynamicIsland,
      safeAreaInsets: getSafeAreaInsets()
    };
  });

  useEffect(() => {
    // Mettre à jour les safe areas lors des rotations
    const handleResize = () => {
      const { deviceType: newDeviceType, isDynamicIsland: newIsDynamicIsland } = detectiOSDevice();
      setIosInfo(prev => ({
        ...prev,
        deviceType: newDeviceType,
        isDynamicIsland: newIsDynamicIsland,
        safeAreaInsets: getSafeAreaInsets()
      }));
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return iosInfo;
};
