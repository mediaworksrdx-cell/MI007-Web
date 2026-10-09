// ─── Spatial Terminal Environment ───
// Terminal constructed from spatial analytical surfaces, depth manifolds, and data ribbons
import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Theme3DSettings } from '../core/Theme3DAdapter';

interface SpatialTerminalProps {
  themeSettings: Theme3DSettings;
  onSelectSymbol?: (symbol: string) => void;
}

export default function SpatialTerminalEnvironment({
  themeSettings,
  onSelectSymbol,
}: SpatialTerminalProps) {
  const terminalGroupRef = useRef<THREE.Group>(null);
  const [selectedPanel, setSelectedPanel] = useState<'USA' | 'INDIA' | 'UAE'>('INDIA');

  const panels = useMemo(() => [
    { id: 'INDIA', name: 'NIFTY 50', price: '24,842.50', delta: '+1.40%', color: themeSettings.bullColor, pos: [-7, 0, 0] as [number, number, number] },
    { id: 'USA', name: 'S&P 500', price: '5,864.20', delta: '+0.82%', color: themeSettings.bullColor, pos: [0, 1.2, -4] as [number, number, number] },
    { id: 'UAE', name: 'DFM GENERAL', price: '4,921.10', delta: '+1.15%', color: themeSettings.bullColor, pos: [7, 0, 0] as [number, number, number] },
  ], [themeSettings]);

  // Order Book Depth 3D Steps
  const depthSteps = useMemo(() => {
    const list = [];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const isBid = i < 5;
      const stepIdx = isBid ? 5 - i : i - 4;
      const height = (6 - stepIdx) * 0.45;
      const x = (i - count / 2) * 1.1;
      list.push({
        id: i,
        x,
        y: height * 0.5 - 4.5,
        z: -6,
        height,
        isBid,
      });
    }
    return list;
  }, []);

  useFrame((state) => {
    if (!terminalGroupRef.current) return;
    const t = state.clock.getElapsedTime();
    terminalGroupRef.current.position.y = Math.sin(t * 0.4) * 0.06;
  });

  return (
    <group ref={terminalGroupRef} position={[0, -2, -10]} name="SpatialTerminalEnvironment">
      {/* 1. Curved Multi-Market Command Surfaces */}
      {panels.map((p) => {
        const isSelected = selectedPanel === p.id;

        return (
          <group
            key={p.id}
            position={p.pos}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedPanel(p.id as 'USA' | 'INDIA' | 'UAE');
              if (onSelectSymbol) onSelectSymbol(p.name);
            }}
          >
            {/* Analytical Frosted Glass Slate */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[5.8, 4.2, 0.15]} />
              <meshPhysicalMaterial
                color={isSelected ? '#131D2E' : '#0B111A'}
                roughness={0.12}
                metalness={0.9}
                clearcoat={1.0}
                transmission={0.4}
                thickness={1.5}
                reflectivity={0.9}
                emissive={isSelected ? themeSettings.accentCyan : '#000000'}
                emissiveIntensity={isSelected ? 0.35 : 0}
              />
            </mesh>

            {/* Glowing Analytical Bezel */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[5.88, 4.28, 0.18]} />
              <meshBasicMaterial
                color={isSelected ? themeSettings.accentCyan : '#334155'}
                wireframe
                transparent
                opacity={isSelected ? 0.85 : 0.3}
              />
            </mesh>

            {/* Miniature Candle Surface preview inside panel */}
            {[-2.0, -1.2, -0.4, 0.4, 1.2, 2.0].map((cx, cidx) => {
              const cHeight = 0.6 + Math.sin(cidx * 1.5) * 0.4;
              return (
                <mesh key={cidx} position={[cx, Math.sin(cidx * 0.8) * 0.3 - 0.3, 0.1]}>
                  <boxGeometry args={[0.35, cHeight, 0.05]} />
                  <meshStandardMaterial
                    color={cidx % 2 === 0 ? themeSettings.bullColor : themeSettings.bearColor}
                    emissive={cidx % 2 === 0 ? themeSettings.bullColor : themeSettings.bearColor}
                    emissiveIntensity={0.6}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* 2. Volumetric 3D Order Book Depth Profile */}
      <group name="OrderBookDepthStairs">
        {depthSteps.map((s) => (
          <mesh key={s.id} position={[s.x, s.y, s.z]}>
            <boxGeometry args={[0.9, s.height, 0.8]} />
            <meshStandardMaterial
              color={s.isBid ? themeSettings.bullColor : themeSettings.bearColor}
              emissive={s.isBid ? themeSettings.bullColor : themeSettings.bearColor}
              emissiveIntensity={0.45}
              transparent
              opacity={0.8}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
}
