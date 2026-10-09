// ─── Procedural Market Financial Terrain ───
// Dynamic scientific elevation surface responding to price, volume, and volatility
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TerrainShader } from '../shaders/MarketShaders';
import { Theme3DSettings } from '../core/Theme3DAdapter';

interface MarketTerrainProps {
  themeSettings: Theme3DSettings;
  volatility?: number;
  trend?: number;
}

export default function MarketTerrain({
  themeSettings,
  volatility = 1.0,
  trend = 0.5,
}: MarketTerrainProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uVolatility: { value: volatility },
    uTrend: { value: trend },
    uColorBase: { value: new THREE.Color(themeSettings.terrainBase) },
    uColorPeak: { value: new THREE.Color(themeSettings.terrainPeak) },
    uColorValley: { value: new THREE.Color(themeSettings.terrainValley) },
    uColorGrid: { value: new THREE.Color(themeSettings.terrainGrid) },
    uOpacity: { value: 0.88 },
  }), [themeSettings, volatility, trend]);

  // Update theme colors when changed
  React.useEffect(() => {
    if (matRef.current) {
      matRef.current.uniforms.uColorBase.value.set(themeSettings.terrainBase);
      matRef.current.uniforms.uColorPeak.value.set(themeSettings.terrainPeak);
      matRef.current.uniforms.uColorValley.value.set(themeSettings.terrainValley);
      matRef.current.uniforms.uColorGrid.value.set(themeSettings.terrainGrid);
    }
  }, [themeSettings]);

  useFrame((state) => {
    if (matRef.current) {
      matRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      matRef.current.uniforms.uVolatility.value = volatility;
      matRef.current.uniforms.uTrend.value = trend;
    }
  });

  return (
    <group position={[0, -14.5, 0]}>
      {/* Dynamic Elevated Financial Landscape */}
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 160, 64, 64]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={TerrainShader.vertexShader}
          fragmentShader={TerrainShader.fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Structural Horizon Foundation Grids */}
      <gridHelper
        args={[160, 40, themeSettings.terrainGrid, themeSettings.terrainValley]}
        position={[0, -1.0, 0]}
      />
    </group>
  );
}
