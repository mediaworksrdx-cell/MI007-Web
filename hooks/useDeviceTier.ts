'use client';

import { useState, useEffect } from 'react';

export type DeviceTier = 'desktop' | 'tablet' | 'mobile';

export function useDeviceTier(): DeviceTier {
  const [tier, setTier] = useState<DeviceTier>('desktop');

  useEffect(() => {
    function detect(): DeviceTier {
      const w = window.innerWidth;
      const cores = navigator.hardwareConcurrency || 4;

      if (w < 768 || cores <= 2) return 'mobile';
      if (w < 1024 || cores <= 4) return 'tablet';
      return 'desktop';
    }

    setTier(detect());

    const handleResize = () => setTier(detect());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return tier;
}

export function useIsMobile(): boolean {
  return useDeviceTier() === 'mobile';
}
