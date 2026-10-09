// ─── Volumetric Liquidity Engine ───
// High/low density liquidity zones, vertical order-wall monoliths, and absorption fields
import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { VolumetricLiquidityShader } from '../shaders/MarketShaders';
import { Theme3DSettings } from '../core/Theme3DAdapter';

export interface LiquidityPoolInfo {
  id: string;
  priceLevel: number;
  label: string;
  side: 'BUY_POOL' | 'SELL_POOL';
  depth: string;
  volume: string;
  absorptionRate: string;
}

interface VolumetricLiquidityEngineProps {
  themeSettings: Theme3DSettings;
  onSelectPool?: (pool: LiquidityPoolInfo | null) => void;
}

export default function VolumetricLiquidityEngine({
  themeSettings,
  onSelectPool,
}: VolumetricLiquidityEngineProps) {
  const [hoveredWall, setHoveredWall] = useState<string | null>(null);

  // Structural liquidity zones representing institutional order walls
  const liquidityZones = useMemo<LiquidityPoolInfo[]>(() => [
    {
      id: 'wall-buy-primary',
      priceLevel: 24800,
      label: 'BUY LIQUIDITY SWEEP POOL (24,800)',
      side: 'BUY_POOL',
      depth: '84.2% ABSORPTION',
      volume: '14,250 CONTRACTS',
      absorptionRate: '91.4% PASSIVE REPLENISHMENT',
    },
    {
      id: 'wall-sell-primary',
      priceLevel: 25150,
      label: 'CALL WALL RESISTANCE CEILING (25,150)',
      side: 'SELL_POOL',
      depth: '78.6% RESISTANCE',
      volume: '18,800 CONTRACTS',
      absorptionRate: '87.1% AGGRESSIVE DEFENSE',
    },
    {
      id: 'wall-gamma-flip',
      priceLevel: 24950,
      label: 'GAMMA FLIP / EQUILIBRIUM POC (24,950)',
      side: 'BUY_POOL',
      depth: '94.0% EQUILIBRIUM',
      volume: '22,400 CONTRACTS',
      absorptionRate: 'HIGH CONCENTRATION',
    },
  ], []);

  // Shared Shader Material uniforms for flowing absorption stream
  const wallMaterials = useMemo(() => {
    return liquidityZones.map((zone) => {
      const isBuy = zone.side === 'BUY_POOL';
      const col = new THREE.Color(isBuy ? themeSettings.bullColor : themeSettings.bearColor);
      return new THREE.ShaderMaterial({
        vertexShader: VolumetricLiquidityShader.vertexShader,
        fragmentShader: VolumetricLiquidityShader.fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uLiquidityColor: { value: col },
          uAbsorptionDensity: { value: 0.65 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
    });
  }, [liquidityZones, themeSettings]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    wallMaterials.forEach((mat) => {
      mat.uniforms.uTime.value = t;
    });
  });

  return (
    <group name="VolumetricLiquidityEngine">
      {/* 1. Vertical Liquidity Monolith Slabs */}
      {liquidityZones.map((zone, idx) => {
        const isHovered = hoveredWall === zone.id;
        const zPos = idx === 0 ? -16 : idx === 1 ? 16 : 0;
        const yPos = idx === 0 ? -4 : idx === 1 ? 4 : 0;
        const isBuy = zone.side === 'BUY_POOL';
        const color = isBuy ? themeSettings.bullColor : themeSettings.bearColor;

        return (
          <group
            key={zone.id}
            position={[-8, yPos, zPos]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredWall(zone.id);
              if (onSelectPool) onSelectPool(zone);
            }}
            onPointerOut={() => {
              setHoveredWall(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectPool) onSelectPool(zone);
            }}
          >
            {/* Flowing volumetric plane */}
            <mesh material={wallMaterials[idx]}>
              <planeGeometry args={[26, 12]} />
            </mesh>

            {/* Glowing boundary frame */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[26.2, 12.2, 0.2]} />
              <meshBasicMaterial
                color={color}
                wireframe
                transparent
                opacity={isHovered ? 0.8 : 0.25}
              />
            </mesh>

            {/* Level Beacon Pillar */}
            <mesh position={[13, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 12, 12]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHovered ? 2.0 : 0.8}
              />
            </mesh>
          </group>
        );
      })}

      {/* 2. Ambient Volumetric Cloud Particles representing ambient liquidity density */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              useMemo(() => {
                const arr = new Float32Array(400 * 3);
                for (let i = 0; i < 400; i++) {
                  arr[i * 3 + 0] = (Math.random() - 0.5) * 45;
                  arr[i * 3 + 1] = (Math.random() - 0.5) * 16;
                  arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
                }
                return arr;
              }, []),
              3,
            ]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.18}
          color={themeSettings.accentCyan}
          transparent
          opacity={0.35}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
