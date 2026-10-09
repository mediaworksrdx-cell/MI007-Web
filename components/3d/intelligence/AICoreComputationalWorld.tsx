// ─── AI Core Computational World ───
// A multi-layer institutional computational machine (NOT a sphere)
// 9 Computational Layers: Ingestion -> Normalization -> Feature Extraction -> Pattern Recognition -> Structure -> Multi-Signal -> Confidence -> Risk -> Output
import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Theme3DSettings } from '../core/Theme3DAdapter';

export interface ComputationalLayerInfo {
  id: string;
  name: string;
  subtitle: string;
  tensors: string;
  latency: string;
  activeNodes: number;
}

export const AI_COMPUTATIONAL_LAYERS: ComputationalLayerInfo[] = [
  { id: 'L01', name: 'DATA INGESTION', subtitle: 'L1/L2/L3 Tick & Order Book Buffering', tensors: '1.4M events/sec', latency: '0.12ms', activeNodes: 64 },
  { id: 'L02', name: 'NORMALIZATION', subtitle: 'Z-Score Volatility & Spread Cleansing', tensors: '100% Calibrated', latency: '0.08ms', activeNodes: 48 },
  { id: 'L03', name: 'FEATURE EXTRACTION', subtitle: '40+ Micro-indicators & Bid/Ask Delta', tensors: '512 Tensors', latency: '0.24ms', activeNodes: 72 },
  { id: 'L04', name: 'PATTERN RECOGNITION', subtitle: 'Order Blocks, FVGs, Sweeps Detection', tensors: 'Real-time Matrix', latency: '0.41ms', activeNodes: 96 },
  { id: 'L05', name: 'MARKET STRUCTURE', subtitle: 'Swing Pivot Topology & BOS / CHoCH', tensors: 'Dynamic Graph', latency: '0.33ms', activeNodes: 80 },
  { id: 'L06', name: 'MULTI-SIGNAL SYNTHESIS', subtitle: 'Cross-Timeframe Vector Alignment', tensors: '32 Parallel Vectors', latency: '0.52ms', activeNodes: 64 },
  { id: 'L07', name: 'CONFIDENCE ENGINE', subtitle: 'Monte Carlo Bayesian Scoring', tensors: '94.2% Probability', latency: '0.29ms', activeNodes: 56 },
  { id: 'L08', name: 'RISK ANALYSIS', subtitle: 'Dynamic Invalidation & Stop Bounds', tensors: 'Asymmetric 3.8:1', latency: '0.18ms', activeNodes: 48 },
  { id: 'L09', name: 'INTELLIGENCE OUTPUT', subtitle: 'Actionable Institutional Execution Stream', tensors: 'Verified Alpha', latency: '0.04ms', activeNodes: 32 },
];

interface AICoreComputationalWorldProps {
  themeSettings: Theme3DSettings;
  onSelectLayer?: (layer: ComputationalLayerInfo | null) => void;
}

export default function AICoreComputationalWorld({
  themeSettings,
  onSelectLayer,
}: AICoreComputationalWorldProps) {
  const machineRef = useRef<THREE.Group>(null);
  const [activeLayerIdx, setActiveLayerIdx] = useState<number | null>(null);

  // Layer slab geometries and neural interconnects
  const layers = useMemo(() => {
    return AI_COMPUTATIONAL_LAYERS.map((layer, idx) => {
      const y = (idx - AI_COMPUTATIONAL_LAYERS.length / 2) * 2.6;
      return {
        ...layer,
        y,
        width: 14 - Math.abs(idx - 4) * 0.8,
        depth: 9 - Math.abs(idx - 4) * 0.5,
      };
    });
  }, []);

  // Volumetric computational conduits connecting layers
  const conduits = useMemo(() => {
    const list = [];
    for (let i = 0; i < layers.length - 1; i++) {
      const l1 = layers[i];
      const l2 = layers[i + 1];
      for (let c = 0; c < 4; c++) {
        const xOffset = (c % 2 === 0 ? -1 : 1) * 3.5;
        const zOffset = (c < 2 ? -1 : 1) * 2.5;
        list.push({
          id: `${i}-${c}`,
          from: new THREE.Vector3(xOffset, l1.y, zOffset),
          to: new THREE.Vector3(xOffset, l2.y, zOffset),
        });
      }
    }
    return list;
  }, [layers]);

  useFrame((state) => {
    if (!machineRef.current) return;
    const t = state.clock.getElapsedTime();
    machineRef.current.rotation.y = Math.sin(t * 0.15) * 0.04;
  });

  return (
    <group ref={machineRef} position={[0, 0, -22]} name="AICoreComputationalWorld">
      {/* 1. 9 Spatial Computational Layer Slabs */}
      {layers.map((layer, idx) => {
        const isActive = activeLayerIdx === idx;
        const accentCol = idx % 2 === 0 ? themeSettings.accentCyan : themeSettings.accentGold;

        return (
          <group
            key={layer.id}
            position={[0, layer.y, 0]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setActiveLayerIdx(idx);
              if (onSelectLayer) onSelectLayer(layer);
            }}
            onPointerOut={() => {
              setActiveLayerIdx(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectLayer) onSelectLayer(layer);
            }}
          >
            {/* Precision Computational Matrix Slab */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[layer.width, 0.45, layer.depth]} />
              <meshPhysicalMaterial
                color={isActive ? '#1E293B' : '#0B111E'}
                roughness={0.15}
                metalness={0.92}
                clearcoat={0.9}
                clearcoatRoughness={0.1}
                reflectivity={0.95}
                emissive={accentCol}
                emissiveIntensity={isActive ? 0.45 : 0.08}
              />
            </mesh>

            {/* Glowing Matrix Perimeter Border */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[layer.width + 0.1, 0.48, layer.depth + 0.1]} />
              <meshBasicMaterial
                color={accentCol}
                wireframe
                transparent
                opacity={isActive ? 0.8 : 0.25}
              />
            </mesh>

            {/* Internal Processing Nodes Matrix (Micro-cubes) */}
            {[-2.5, 0, 2.5].map((nx, nidx) =>
              [-1.5, 0, 1.5].map((nz, nzidx) => (
                <mesh key={`${nidx}-${nzidx}`} position={[nx, 0.32, nz]}>
                  <boxGeometry args={[0.3, 0.18, 0.3]} />
                  <meshStandardMaterial
                    color={accentCol}
                    emissive={accentCol}
                    emissiveIntensity={isActive ? 1.2 : 0.6}
                    roughness={0.2}
                    metalness={0.8}
                  />
                </mesh>
              ))
            )}

            {/* Status Beacon */}
            <pointLight
              color={accentCol}
              intensity={isActive ? 2.5 : 0.8}
              distance={6}
              position={[layer.width * 0.48, 0.5, 0]}
            />
          </group>
        );
      })}

      {/* 2. Neural Computational Conduits */}
      {conduits.map((conduit) => {
        const height = conduit.to.y - conduit.from.y;
        const midY = (conduit.from.y + conduit.to.y) * 0.5;
        return (
          <mesh
            key={conduit.id}
            position={[conduit.from.x, midY, conduit.from.z]}
          >
            <cylinderGeometry args={[0.04, 0.04, height, 8]} />
            <meshStandardMaterial
              color={themeSettings.accentCyan}
              emissive={themeSettings.accentCyan}
              emissiveIntensity={0.8}
              roughness={0.2}
              metalness={0.85}
            />
          </mesh>
        );
      })}
    </group>
  );
}
