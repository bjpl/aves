// CONCEPT: Hook for detecting mobile devices and touch capabilities
// WHY: Enables responsive behavior and touch-optimized interactions
// PATTERN: Device detection hook with SSR safety

import { useState, useEffect } from 'react';

interface MobileDetection {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasTouch: boolean;
  screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  orientation: 'portrait' | 'landscape';
}

export const useMobileDetect = (): MobileDetection => {
  const [detection, setDetection] = useState<MobileDetection>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    hasTouch: false,
    screenSize: 'lg',
    orientation: 'landscape'
  });

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Check for touch capability
      const hasTouch = 'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - vendor prefix
        navigator.msMaxTouchPoints > 0;

      // Determine screen size breakpoints (Tailwind CSS defaults)
      let screenSize: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
      if (width < 640) screenSize = 'xs';
      else if (width < 768) screenSize = 'sm';
      else if (width < 1024) screenSize = 'md';
      else if (width < 1280) screenSize = 'lg';
      else screenSize = 'xl';

      // Determine device type
      const isMobile = width < 768 && hasTouch;
      const isTablet = width >= 768 && width < 1024 && hasTouch;
      const isDesktop = width >= 1024 || !hasTouch;

      // Determine orientation
      const orientation = width > height ? 'landscape' : 'portrait';

      setDetection({
        isMobile,
        isTablet,
        isDesktop,
        hasTouch,
        screenSize,
        orientation
      });
    };

    // Initial check
    checkDevice();

    // Listen for resize and orientation changes
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return detection;
};

// Utility functions for common checks
export const getInteractionType = (hasTouch: boolean) => {
  return hasTouch ? 'tap' : 'click';
};

export const getOptimalImageSize = (screenSize: string) => {
  switch (screenSize) {
    case 'xs':
    case 'sm':
      return { width: 400, height: 300 };
    case 'md':
      return { width: 800, height: 600 };
    case 'lg':
    case 'xl':
    default:
      return { width: 1200, height: 900 };
  }
};