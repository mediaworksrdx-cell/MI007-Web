// ─── AI Reasoning Pathway Visualization ───
// Visible spatial pathway: Price Structure -> Momentum -> Volume -> Liquidity -> Pattern -> Regime -> Confidence -> AI Intelligence
import React, { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Theme3DSettings } from '../core/Theme3DAdapter';

export interface ReasoningStageInfo {
  step: number;
  name: string;
  metric: string;
  status: string;
  details: string;
}

export const REASONING_STAGES: ReasoningStageInfo[] = [
  { step: 1, name: 'PRICE STRUCTURE', metric: 'Swing Low Sweep @ 24,800', status: 'VERIFIED', details: 'Institutional wick rejection confirmed on 15m timeframe.' },
  { step: 2, name: 'MOMENTUM', metric: 'RSI 64.2 · Bull Velocity', status: 'ACCELERATING', details: 'Positive divergence above 50-median with rising slope.' },
  { step: 3, name: 'VOLUME DELTA', metric: '3.4M Aggregated Volume', status: '+62% BUY DELTA', details: 'Cumulative buyer volume overpower passive seller limits.' },
  { step: 4, name: 'LIQUIDITY MAP', metric: '84.2% Absorption Wall', status: 'SWEPT & SECURED', details: 'Resting liquidity pool cleared before immediate mean-reversion.' },
  { step: 5, name: 'PATTERN ENGINE', metric: 'Bullish Order Block Mitigated', status: 'DETECTED', details: 'High-probability structural mitigation zone defended.' },
  { step: 6, name: 'REGIME BIAS', metric: 'Institutional Accumulation', status: 'CONFIRMED', details: 'Low volatility compression preceding expansion phase.' },
  { step: 7, name: 'CONFIDENCE ENGINE', metric: '94.2% Conviction Score', status: 'OPTIMAL', details: 'Monte Carlo simulated expected value: 3.8 Risk-Reward.' },
  { step: 8, name: 'AI INTELLIGENCE', metric: 'LONG EXPANSION VECTOR', status: 'EXECUTION READY', details: 'MI007 unified execution insight active.' },
];

interface AIReasoningPathwayProps {
  themeSettings: Theme3DSettings;
  onSelectStage?: (stage: ReasoningStageInfo | null) => void;
}

export default function AIReasoningPathway({
  themeSettings,
  onSelectStage,
}: AIReasoningPathwayProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Dynamic spline coordinates for the reasoning pathway
  const nodes = useMemo(() => {
    return REASONING_STAGES.map((stage, idx) => {
      const angle = (idx / (REASONING_STAGES.length - 1)) * Math.PI * 0.9 - Math.PI * 0.45;
      const radius = 18;
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius - 16;
      const y = (idx - 4) * 1.4;
      return {
        ...stage,
        pos: new THREE.Vector3(x, y, z),
      };
    });
  }, []);

  // Catmull-Rom tube curve connecting all reasoning stages
  const pathwayTube = useMemo(() => {
    const pts = nodes.map((n) => n.pos);
    const curve = new THREE.CatmullRomCurve3(pts);
    return new THREE.TubeGeometry(curve, 64, 0.06, 8, false);
  }, [nodes]);

  // Automatic slow progression through reasoning stages
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const cycle = Math.floor((t * 0.8) % REASONING_STAGES.length) + 1;
    if (hoveredStep === null && cycle !== activeStep) {
      setActiveStep(cycle);
    }
  });

  return (
    <group ref={groupRef} name="AIReasoningPathway">
      {/* 1. Luminous Connecting Tube */}
      <mesh geometry={pathwayTube}>
        <meshStandardMaterial
          color={themeSettings.accentCyan}
          emissive={themeSettings.accentCyan}
          emissiveIntensity={1.2}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* 2. Reasoning Stage Nodes */}
      {nodes.map((node) => {
        const isSelected = (hoveredStep ?? activeStep) === node.step;
        const col = isSelected ? themeSettings.bullColor : themeSettings.accentCyan;

        return (
          <group
            key={node.step}
            position={node.pos}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredStep(node.step);
              if (onSelectStage) onSelectStage(node);
            }}
            onPointerOut={() => {
              setHoveredStep(null);
            }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveStep(node.step);
              if (onSelectStage) onSelectStage(node);
            }}
          >
            {/* Analytical Node Instrument Polyhedron */}
            <mesh>
              <dodecahedronGeometry args={[isSelected ? 0.65 : 0.45, 0]} />
              <meshPhysicalMaterial
                color={col}
                emissive={col}
                emissiveIntensity={isSelected ? 1.6 : 0.5}
                roughness={0.15}
                metalness={0.85}
                clearcoat={0.8}
              />
            </mesh>

            {/* Concentric Resonance Ring */}
            {isSelected && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.1, 0.03, 8, 32]} />
                <meshBasicMaterial color={col} transparent opacity={0.8} />
              </mesh>
            )}

            {/* Analytical Point Light */}
            <pointLight
              color={col}
              intensity={isSelected ? 3.0 : 0.8}
              distance={6}
            />
          </group>
        );
      })}
    </group>
  );
}
