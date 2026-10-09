// ─── AI Signal Physics ───
// Sophisticated analytical instruments formed at detected market events
import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Theme3DSettings } from '../core/Theme3DAdapter';

export interface MarketSignalObject {
  id: string;
  type: 'ORDER_BLOCK' | 'LIQUIDITY_SWEEP' | 'FVG' | 'BOS_BREAKOUT';
  symbol: string;
  price: number;
  bias: 'BULLISH' | 'BEARISH';
  confidence: number;
  position: [number, number, number];
}

interface AISignalPhysicsProps {
  themeSettings: Theme3DSettings;
  onSelectSignal?: (sig: MarketSignalObject | null) => void;
}

export default function AISignalPhysics({
  themeSettings,
  onSelectSignal,
}: AISignalPhysicsProps) {
  const [hoveredSignalId, setHoveredSignalId] = useState<string | null>(null);

  const signals: MarketSignalObject[] = React.useMemo(() => [
    {
      id: 'sig-01',
      type: 'LIQUIDITY_SWEEP',
      symbol: 'NIFTY 50',
      price: 24800.0,
      bias: 'BULLISH',
      confidence: 94.2,
      position: [-5.0, 1.2, -6.0],
    },
    {
      id: 'sig-02',
      type: 'ORDER_BLOCK',
      symbol: 'S&P 500',
      price: 5864.2,
      bias: 'BULLISH',
      confidence: 91.8,
      position: [3.5, 3.8, 4.0],
    },
    {
      id: 'sig-03',
      type: 'FVG',
      symbol: 'BTC/USD',
      price: 68410.0,
      bias: 'BULLISH',
      confidence: 88.5,
      position: [-1.5, -2.4, 12.0],
    },
  ], []);

  return (
    <group name="AISignalPhysics">
      {signals.map((sig) => {
        const isHovered = hoveredSignalId === sig.id;
        const color = sig.bias === 'BULLISH' ? themeSettings.bullColor : themeSettings.bearColor;

        return (
          <group
            key={sig.id}
            position={sig.position}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredSignalId(sig.id);
              if (onSelectSignal) onSelectSignal(sig);
            }}
            onPointerOut={() => {
              setHoveredSignalId(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectSignal) onSelectSignal(sig);
            }}
          >
            {/* Analytical Gimbal Rings */}
            <mesh rotation={[Math.PI / 4, 0, 0]}>
              <torusGeometry args={[0.85, 0.035, 8, 36]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHovered ? 1.8 : 0.8}
                metalness={0.9}
                roughness={0.1}
              />
            </mesh>

            <mesh rotation={[0, Math.PI / 4, 0]}>
              <torusGeometry args={[0.65, 0.03, 8, 36]} />
              <meshStandardMaterial
                color="#FFFFFF"
                metalness={0.95}
                roughness={0.05}
              />
            </mesh>

            {/* Central Precision Target Core */}
            <mesh>
              <octahedronGeometry args={[0.3, 0]} />
              <meshPhysicalMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHovered ? 2.5 : 1.2}
                roughness={0.1}
                metalness={0.8}
                clearcoat={1.0}
              />
            </mesh>

            {/* Vertical Coordinate Dropdown Pin */}
            <mesh position={[0, -1.8, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 3.6, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.6} />
            </mesh>

            {/* Target Reticle Plane */}
            <mesh position={[0, -3.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.4, 0.45, 24]} />
              <meshBasicMaterial color={color} transparent opacity={0.7} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}
