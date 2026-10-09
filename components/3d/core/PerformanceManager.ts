// ─── Performance & Quality Manager for WebGL/WebGPU Rendering ───

export interface QualityProfile {
  dpr: [number, number];
  candleCount: number;
  particleCount: number;
  terrainSubdivisions: number;
  useShadows: boolean;
  enablePostProcessing: boolean;
  orderFlowDensity: number;
}

export function detectQualityProfile(): QualityProfile {
  if (typeof window === 'undefined') {
    return {
      dpr: [1, 1.5],
      candleCount: 60,
      particleCount: 1500,
      terrainSubdivisions: 40,
      useShadows: false,
      enablePostProcessing: true,
      orderFlowDensity: 0.8,
    };
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;
  const hardwareConcurrency = navigator.hardwareConcurrency || 4;

  if (isMobile) {
    return {
      dpr: [1, 1.25],
      candleCount: 36,
      particleCount: 800,
      terrainSubdivisions: 24,
      useShadows: false,
      enablePostProcessing: false,
      orderFlowDensity: 0.5,
    };
  }

  if (isTablet || hardwareConcurrency <= 4) {
    return {
      dpr: [1, 1.5],
      candleCount: 50,
      particleCount: 1400,
      terrainSubdivisions: 32,
      useShadows: false,
      enablePostProcessing: true,
      orderFlowDensity: 0.7,
    };
  }

  // High-performance Desktop
  return {
    dpr: [1, 2],
    candleCount: 80,
    particleCount: 3000,
    terrainSubdivisions: 56,
    useShadows: true,
    enablePostProcessing: true,
    orderFlowDensity: 1.0,
  };
}
