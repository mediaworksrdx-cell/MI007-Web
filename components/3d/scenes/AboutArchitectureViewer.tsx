// ─── 3D Architecture Exploration Viewer for About Page ───
// Five architectural pillars: DATA -> COMPUTATION -> INTELLIGENCE -> ANALYSIS -> DECISION SUPPORT
'use client';

import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppTheme } from '@/lib/themeContext';
import { getTheme3DSettings } from '../core/Theme3DAdapter';

interface PillarStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  specs: string[];
}

const ARCHITECTURE_PILLARS: PillarStep[] = [
  {
    id: '01',
    title: 'DATA',
    subtitle: 'Microsecond Ingestion & L3 Normalization',
    description: 'Direct optical feeds capture raw trades, quotes, and order book depths across NYSE, NASDAQ, NSE, and DFM with zero drop rate.',
    specs: ['1.4M Events/Sec', 'Sub-millisecond Routing', 'Tick Cleansing & Outlier Filtering'],
  },
  {
    id: '02',
    title: 'COMPUTATION',
    subtitle: 'High-Density GPU Tensor Processing',
    description: 'Parallel mathematical matrix calculations extract over 40 quantitative micro-indicators, rolling volatility smiles, and bid/ask volume delta.',
    specs: ['512 Tensor Nodes', 'FP32 Precision Vectorization', '0.08ms Execution Latency'],
  },
  {
    id: '03',
    title: 'INTELLIGENCE',
    subtitle: 'Smart Money Concepts & Pattern AI',
    description: 'Deep neural networks continuously scan market topology to identify Institutional Order Blocks, Fair Value Gaps, and Liquidity Sweeps.',
    specs: ['Real-Time Topology Graph', 'SMC Liquidity Detection', 'Cross-Asset Correlation'],
  },
  {
    id: '04',
    title: 'ANALYSIS',
    subtitle: 'Multi-Timeframe Probability Synthesis',
    description: 'Bayesian Monte Carlo modeling generates dynamic stop invalidation thresholds, expected payoff distribution, and multi-regime bias.',
    specs: ['94.2% Conviction Scoring', 'Dynamic Asymmetric R:R', 'Regime State Classification'],
  },
  {
    id: '05',
    title: 'DECISION SUPPORT',
    subtitle: 'Institutional Terminal Execution Delivery',
    description: 'Synthesized intelligence is delivered directly to professional desks via interactive spatial charts, live webhooks, and sub-minute alerts.',
    specs: ['Sub-minute Alert Dispatch', 'Interactive Spatial Surfaces', 'Institutional Risk Guardrails'],
  },
];

function Pillar3DObject({ activeIdx, themeSettings }: { activeIdx: number; themeSettings: any }) {
  return (
    <group position={[0, 0, 0]}>
      {/* 5 Architectural Slabs in 3D Space */}
      {ARCHITECTURE_PILLARS.map((p, idx) => {
        const isCurrent = activeIdx === idx;
        const x = (idx - 2) * 4.2;
        const y = isCurrent ? 0.8 : -0.2;
        const col = isCurrent ? themeSettings.bullColor : themeSettings.accentCyan;

        return (
          <group key={p.id} position={[x, y, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[3.4, 4.4, 0.4]} />
              <meshPhysicalMaterial
                color={isCurrent ? '#162235' : '#0B111D'}
                roughness={0.12}
                metalness={0.92}
                clearcoat={1.0}
                transmission={0.35}
                thickness={1.2}
                emissive={col}
                emissiveIntensity={isCurrent ? 0.5 : 0.08}
              />
            </mesh>

            {/* Glowing active wireframe boundary */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[3.46, 4.46, 0.45]} />
              <meshBasicMaterial
                color={col}
                wireframe
                transparent
                opacity={isCurrent ? 0.9 : 0.25}
              />
            </mesh>

            {/* Inner Core Symbol */}
            <mesh position={[0, 0.4, 0.25]}>
              <octahedronGeometry args={[0.45, 0]} />
              <meshStandardMaterial
                color={col}
                emissive={col}
                emissiveIntensity={isCurrent ? 1.6 : 0.5}
                metalness={0.8}
                roughness={0.1}
              />
            </mesh>

            {/* Connecting bus line */}
            {idx < ARCHITECTURE_PILLARS.length - 1 && (
              <mesh position={[2.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
                <meshStandardMaterial color={themeSettings.accentCyan} emissive={themeSettings.accentCyan} emissiveIntensity={0.8} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function AboutArchitectureViewer() {
  const { theme } = useAppTheme();
  const themeSettings = React.useMemo(() => getTheme3DSettings(theme), [theme]);
  const [activePillar, setActivePillar] = useState(0);

  const current = ARCHITECTURE_PILLARS[activePillar];

  return (
    <div className="w-full rounded-3xl border-2 inst-card p-6 sm:p-10 shadow-2xl overflow-hidden relative my-16">
      <div className="relative z-10 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--theme-card-border)] pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full border page-section-pill mb-2 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="mono text-[12px] tracking-[0.25em] uppercase font-black page-section-pill-text">
              SPATIAL ARCHITECTURE EXPLORATION
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black inst-card-text">
            The MI007 Machine Pipeline
          </h2>
        </div>

        {/* 5 Pillar Selectors */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {ARCHITECTURE_PILLARS.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setActivePillar(idx)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer ${
                activePillar === idx
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-black/20 text-slate-400 border-white/10 hover:text-white'
              }`}
            >
              {p.id} // {p.title}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Interactive Canvas Scene */}
      <div className="w-full h-64 sm:h-72 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative mb-6 shadow-inner">
        <Canvas
          camera={{ position: [0, 1.2, 14], fov: 45 }}
          gl={{ antialias: true, alpha: true }}
          className="w-full h-full"
        >
          <Suspense fallback={null}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 8]} intensity={1.5} />
            <Pillar3DObject activeIdx={activePillar} themeSettings={themeSettings} />
          </Suspense>
        </Canvas>
      </div>

      {/* Active Pillar Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/40 p-6 rounded-2xl border border-white/5">
        <div className="md:col-span-2">
          <div className="text-xs mono font-black text-emerald-400 mb-1">
            STAGE {current.id} // {current.title}
          </div>
          <h3 className="text-xl font-bold inst-card-text mb-2">{current.subtitle}</h3>
          <p className="text-sm inst-card-text-muted leading-relaxed font-medium">
            {current.description}
          </p>
        </div>

        <div>
          <div className="text-xs mono font-black text-slate-400 mb-2 uppercase tracking-wider">
            Operational Telemetry
          </div>
          <ul className="space-y-1.5">
            {current.specs.map((spec, i) => (
              <li key={i} className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {spec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
