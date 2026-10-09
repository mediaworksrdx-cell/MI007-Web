// ─── Eight Intelligence Engines Network ───
// Exact 8 institutional engines manifested as distinct spatial computational modules
import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Theme3DSettings } from '../core/Theme3DAdapter';

export interface SpatialEngineModule {
  id: string;
  modNum: string;
  title: string;
  desc: string;
  metric: string;
  color: string;
  geometryType: 'lattice' | 'gyro' | 'footprint' | 'delta_balance' | 'matrix' | 'pivot' | 'vectors' | 'risk_shield';
}

export const MI007_ENGINES_DATA: SpatialEngineModule[] = [
  { id: 'eng-01', modNum: '01', title: 'Pattern Recognition', desc: 'Real-time detection of Order Blocks, FVGs, and Liquidity Sweeps.', metric: '98.4% Accuracy', color: '#00FF88', geometryType: 'matrix' },
  { id: 'eng-02', modNum: '02', title: 'Technical Indicators', desc: 'Adaptive EMAs, VWAP bands, RSI dynamic zones, and MACD divergence.', metric: '17 Indicators Active', color: '#00E5FF', geometryType: 'vectors' },
  { id: 'eng-03', modNum: '03', title: 'Trend Topology', desc: 'Quantifying trend persistence and momentum acceleration vectors.', metric: '+12.48° Vector', color: '#FFD600', geometryType: 'gyro' },
  { id: 'eng-04', modNum: '04', title: 'Volume Footprint', desc: 'Decomposing buying vs. selling delta across individual candle bars.', metric: '4.8M Tensors', color: '#B388FF', geometryType: 'footprint' },
  { id: 'eng-05', modNum: '05', title: 'Support & Resistance', desc: 'Automated high-timeframe structural pivots and defense zones.', metric: '24,800 S1 Floor', color: '#00FF88', geometryType: 'pivot' },
  { id: 'eng-06', modNum: '06', title: 'Market Microstructure', desc: 'Level 2 depth aggregation and passive limit replenishment analysis.', metric: '0.12ms Latency', color: '#00E5FF', geometryType: 'lattice' },
  { id: 'eng-07', modNum: '07', title: 'Bull / Bear Delta', desc: 'Real-time directional pressure measuring aggressive market orders.', metric: '3.8:1 Imbalance', color: '#FFD600', geometryType: 'delta_balance' },
  { id: 'eng-08', modNum: '08', title: 'Risk Probability', desc: 'Dynamic stop-loss and take-profit invalidation modeling.', metric: '1:3.4 R-Multiple', color: '#FF5252', geometryType: 'risk_shield' },
];

interface EightEnginesNetworkProps {
  themeSettings: Theme3DSettings;
  onSelectEngine?: (engine: SpatialEngineModule | null) => void;
}

export default function EightEnginesNetwork({
  themeSettings,
  onSelectEngine,
}: EightEnginesNetworkProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Position the 8 modules in a majestic orbital constellation
  const modules = useMemo(() => {
    const radius = 22;
    return MI007_ENGINES_DATA.map((eng, idx) => {
      const angle = (idx / MI007_ENGINES_DATA.length) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = Math.sin(idx * 1.5) * 2.5;
      return {
        ...eng,
        pos: [x, y, z] as [number, number, number],
      };
    });
  }, []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.04;
  });

  return (
    <group ref={groupRef} position={[0, 4, 0]} name="EightEnginesNetwork">
      {modules.map((mod) => {
        const isHovered = hoveredId === mod.id;

        return (
          <group
            key={mod.id}
            position={mod.pos}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredId(mod.id);
              if (onSelectEngine) onSelectEngine(mod);
            }}
            onPointerOut={() => {
              setHoveredId(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectEngine) onSelectEngine(mod);
            }}
          >
            {/* Unique Modular Geometry based on engine specialty */}
            {mod.geometryType === 'matrix' && (
              <mesh>
                <boxGeometry args={[2.0, 2.0, 2.0]} />
                <meshStandardMaterial
                  color={mod.color}
                  emissive={mod.color}
                  emissiveIntensity={isHovered ? 1.6 : 0.6}
                  metalness={0.8}
                  roughness={0.2}
                />
              </mesh>
            )}

            {mod.geometryType === 'gyro' && (
              <group>
                <mesh rotation={[Math.PI / 4, 0, 0]}>
                  <torusGeometry args={[1.4, 0.06, 8, 32]} />
                  <meshBasicMaterial color={mod.color} />
                </mesh>
                <mesh rotation={[0, Math.PI / 4, 0]}>
                  <torusGeometry args={[1.1, 0.05, 8, 32]} />
                  <meshBasicMaterial color="#FFFFFF" />
                </mesh>
              </group>
            )}

            {mod.geometryType === 'footprint' && (
              <group>
                {[-0.6, 0, 0.6].map((bx, bidx) => (
                  <mesh key={bidx} position={[bx, (bidx + 1) * 0.4 - 0.8, 0]}>
                    <boxGeometry args={[0.35, (bidx + 1) * 0.8, 0.5]} />
                    <meshStandardMaterial color={mod.color} emissive={mod.color} emissiveIntensity={0.8} />
                  </mesh>
                ))}
              </group>
            )}

            {mod.geometryType === 'lattice' && (
              <mesh>
                <octahedronGeometry args={[1.5, 1]} />
                <meshStandardMaterial
                  color={mod.color}
                  wireframe
                  emissive={mod.color}
                  emissiveIntensity={1.2}
                />
              </mesh>
            )}

            {mod.geometryType === 'delta_balance' && (
              <group>
                <mesh position={[-0.7, 0, 0]}>
                  <coneGeometry args={[0.6, 1.4, 16]} />
                  <meshStandardMaterial color={themeSettings.bullColor} emissive={themeSettings.bullColor} emissiveIntensity={0.8} />
                </mesh>
                <mesh position={[0.7, 0, 0]} rotation={[Math.PI, 0, 0]}>
                  <coneGeometry args={[0.6, 1.4, 16]} />
                  <meshStandardMaterial color={themeSettings.bearColor} emissive={themeSettings.bearColor} emissiveIntensity={0.8} />
                </mesh>
              </group>
            )}

            {mod.geometryType === 'risk_shield' && (
              <mesh>
                <dodecahedronGeometry args={[1.2, 0]} />
                <meshPhysicalMaterial
                  color={mod.color}
                  emissive={mod.color}
                  emissiveIntensity={isHovered ? 1.8 : 0.6}
                  roughness={0.1}
                  metalness={0.9}
                  clearcoat={1.0}
                />
              </mesh>
            )}

            {mod.geometryType === 'pivot' && (
              <mesh>
                <cylinderGeometry args={[1.2, 1.2, 0.4, 6]} />
                <meshStandardMaterial color={mod.color} emissive={mod.color} emissiveIntensity={0.7} metalness={0.8} />
              </mesh>
            )}

            {mod.geometryType === 'vectors' && (
              <mesh>
                <icosahedronGeometry args={[1.3, 0]} />
                <meshStandardMaterial color={mod.color} emissive={mod.color} emissiveIntensity={0.8} wireframe />
              </mesh>
            )}

            {/* Selection Halo Ring */}
            {isHovered && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[2.4, 2.5, 32]} />
                <meshBasicMaterial color={mod.color} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Local Light Source */}
            <pointLight
              color={mod.color}
              intensity={isHovered ? 3.0 : 1.2}
              distance={8}
            />

            {/* Central Bus Connecting Conduit */}
            <mesh
              position={[-mod.pos[0] * 0.5, -mod.pos[1] * 0.5, -mod.pos[2] * 0.5]}
              rotation={[0, Math.atan2(mod.pos[0], mod.pos[2]), Math.PI / 2]}
            >
              <cylinderGeometry args={[0.02, 0.02, 22, 6]} />
              <meshBasicMaterial
                color={mod.color}
                transparent
                opacity={0.2}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
