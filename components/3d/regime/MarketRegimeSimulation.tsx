// ─── Market Regime Simulation ───
// Subtle institutional atmospheric shifts responding to market regime
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Theme3DSettings } from '../core/Theme3DAdapter';

export type MarketRegimeType =
  | 'BULLISH'
  | 'BEARISH'
  | 'SIDEWAYS'
  | 'ACCUMULATION'
  | 'DISTRIBUTION'
  | 'HIGH_VOLATILITY'
  | 'LOW_VOLATILITY';

interface MarketRegimeSimulationProps {
  themeSettings: Theme3DSettings;
  currentRegime?: MarketRegimeType;
}

export default function MarketRegimeSimulation({
  themeSettings,
  currentRegime = 'ACCUMULATION',
}: MarketRegimeSimulationProps) {
  const regimeLightRef = useRef<THREE.PointLight>(null);
  const ringRef = useRef<THREE.Group>(null);

  // Subtle regime ambient tint color
  const regimeColor = React.useMemo(() => {
    switch (currentRegime) {
      case 'BULLISH':
        return themeSettings.bullColor;
      case 'BEARISH':
        return themeSettings.bearColor;
      case 'ACCUMULATION':
        return '#00E5FF';
      case 'DISTRIBUTION':
        return '#FF9100';
      case 'HIGH_VOLATILITY':
        return '#D500F9';
      case 'LOW_VOLATILITY':
        return '#64748B';
      default:
        return '#00E5FF';
    }
  }, [currentRegime, themeSettings]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (regimeLightRef.current) {
      regimeLightRef.current.intensity = 1.0 + Math.sin(t * 1.2) * 0.3;
    }
    if (ringRef.current) {
      ringRef.current.rotation.y = t * 0.08;
    }
  });

  return (
    <group name="MarketRegimeSimulation">
      {/* Subtle analytical regime ambient focal point */}
      <pointLight
        ref={regimeLightRef}
        position={[0, 8, -10]}
        color={regimeColor}
        intensity={1.2}
        distance={45}
      />

      {/* Atmospheric Horizon Halo */}
      <group ref={ringRef} position={[0, -2, -18]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[28, 0.04, 8, 64]} />
          <meshBasicMaterial
            color={regimeColor}
            transparent
            opacity={0.35}
          />
        </mesh>
      </group>
    </group>
  );
}
