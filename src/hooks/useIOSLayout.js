import { useState, useEffect } from 'react';

export const useIOSLayout = () => {
  const [iosInfo, setIosInfo] = useState({
    isIOS: false,
    isStandalone: false,
    deviceType: 'default',
    isDynamicIsland: false,
    safeAreaInsets: {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    }
  });

  useEffect(() => {
    const detectiOSDevice = () => {
      const ua = navigator.userAgent;
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      
      if (!isIOS) return { deviceType: 'default', isDynamicIsland: false };
      
      const screenHeight = window.screen.height;
      const screenWidth = window.screen.width;
      
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
      const computedStyle = getComputedStyle(document.documentElement);
      return {
        top: parseInt(computedStyle.getPropertyValue('--safe-area-top')) || 0,
        bottom: parseInt(computedStyle.getPropertyValue('--safe-area-bottom')) || 0,
        left: parseInt(computedStyle.getPropertyValue('--safe-area-left')) || 0,
        right: parseInt(computedStyle.getPropertyValue('--safe-area-right')) || 0
      };
    };

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const { deviceType, isDynamicIsland } = detectiOSDevice();
    
    setIosInfo({
      isIOS,
      isStandalone,
      deviceType,
      isDynamicIsland,
      safeAreaInsets: getSafeAreaInsets()
    });

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
