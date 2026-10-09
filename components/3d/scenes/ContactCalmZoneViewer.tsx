// ─── Contact Calm Zone 3D Central Logo Viewer ───
// Calm ambient zone with central MI007 Emblem medallion and serene atmosphere
'use client';

import React, { Suspense, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppTheme } from '@/lib/themeContext';
import { getTheme3DSettings } from '../core/Theme3DAdapter';
import Brand3DSystem from '../logos/Brand3DSystem';

function CalmOrbitScene({ themeSettings }: { themeSettings: any }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.12;
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Central Falcon Emblem Medallion */}
      <Brand3DSystem
        themeSettings={themeSettings}
        scale={1.35}
        position={[0, 0, 0]}
      />

      {/* Serene Orbital Rings */}
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[6.5, 0.03, 8, 64]} />
        <meshBasicMaterial color={themeSettings.accentCyan} transparent opacity={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 3, 0, 0]}>
        <torusGeometry args={[8.0, 0.02, 8, 64]} />
        <meshBasicMaterial color={themeSettings.bullColor} transparent opacity={0.2} />
      </mesh>
    </group>
  );
}

export default function ContactCalmZoneViewer() {
  const { theme } = useAppTheme();
  const themeSettings = React.useMemo(() => getTheme3DSettings(theme), [theme]);

  return (
    <div className="w-full h-48 sm:h-64 rounded-3xl bg-slate-950/80 border-2 border-slate-800/80 overflow-hidden relative mb-8 shadow-2xl">
      <div className="absolute top-3 left-4 z-10 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="font-mono text-[11px] font-black text-slate-300 tracking-widest uppercase">
          CALM OPERATING HORIZON // MI007 CENTRAL EMBLEM
        </span>
      </div>

      <Canvas
        camera={{ position: [0, 0, 16], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        className="w-full h-full"
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[0, 10, 10]} intensity={1.8} color="#FFFFFF" />
          <CalmOrbitScene themeSettings={themeSettings} />
        </Suspense>
      </Canvas>
    </div>
  );
}
