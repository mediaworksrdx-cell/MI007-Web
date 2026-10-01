'use client';

import React, { Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import HeroScene from './HeroScene';
import PostProcessing from './PostProcessing';

interface MarketSceneProps {
  scrollProgress: number;
}

function CameraRig({ scrollProgress }: { scrollProgress: number }) {
  // 7-Stage Cinematic Camera Choreography with Smooth Waypoints
  const waypoints = useMemo(() => [
    // 01. HERO: Wide monumental vista of colossal crystal monoliths
    { progress: 0.00, pos: new THREE.Vector3(0, 4.0, 24.0), lookAt: new THREE.Vector3(0, 4.0, 0) },
    { progress: 0.10, pos: new THREE.Vector3(0, 3.2, 18.0), lookAt: new THREE.Vector3(0, 3.8, 0) },
    
    // 02. MARKET MOVEMENT: Camera swoops down & glides between the giant crystal candles
    { progress: 0.20, pos: new THREE.Vector3(0, 1.8, 7.5), lookAt: new THREE.Vector3(0, 3.2, -2) },
    { progress: 0.28, pos: new THREE.Vector3(0.5, 2.0, 3.5), lookAt: new THREE.Vector3(0, 2.8, -6) },

    // 03. AI ANALYSIS: Arcing vantage looking down into the deep crystal canyon & indicator streams
    { progress: 0.40, pos: new THREE.Vector3(-4.8, 4.5, 0.5), lookAt: new THREE.Vector3(1.0, 2.0, -12) },

    // 04. INTELLIGENCE ENGINE: Sweeping dynamic angle tracing cross-market price flow vectors
    { progress: 0.55, pos: new THREE.Vector3(4.8, 3.5, -8.0), lookAt: new THREE.Vector3(-1.5, 1.5, -20) },

    // 05. INTERACTIVE TERMINAL: Stabilized, centered framing giving focus to product chart
    { progress: 0.70, pos: new THREE.Vector3(0, 2.2, 16.0), lookAt: new THREE.Vector3(0, 1.0, 0) },

    // 06. MARKET INTELLIGENCE: Elevated panoramic overview of market convergence
    { progress: 0.85, pos: new THREE.Vector3(0, 9.5, 18.0), lookAt: new THREE.Vector3(0, 1.0, -6) },

    // 07. FINAL CTA: Calm, authoritative horizon perspective
    { progress: 1.00, pos: new THREE.Vector3(0, 3.2, 20.0), lookAt: new THREE.Vector3(0, 3.5, 0) },
  ], []);

  useFrame((state) => {
    let p0 = waypoints[0];
    let p1 = waypoints[waypoints.length - 1];

    for (let i = 0; i < waypoints.length - 1; i++) {
      if (scrollProgress >= waypoints[i].progress && scrollProgress <= waypoints[i + 1].progress) {
        p0 = waypoints[i];
        p1 = waypoints[i + 1];
        break;
      }
    }

    if (scrollProgress <= p0.progress) {
      p1 = p0;
    }

    const range = p1.progress - p0.progress;
    const t = range === 0 ? 0 : Math.max(0, Math.min(1, (scrollProgress - p0.progress) / range));
    
    // Smooth cinematic cubic-bezier easing
    const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const targetPos = new THREE.Vector3().copy(p0.pos).lerp(p1.pos, easeT);
    const targetLookAt = new THREE.Vector3().copy(p0.lookAt).lerp(p1.lookAt, easeT);

    // Smooth inertia lerp on camera position
    state.camera.position.lerp(targetPos, 0.08);
    
    // Smooth quaternion rotation towards target
    const currentQuat = state.camera.quaternion.clone();
    state.camera.lookAt(targetLookAt);
    const targetQuat = state.camera.quaternion.clone();
    state.camera.quaternion.copy(currentQuat).slerp(targetQuat, 0.08);
  });

  return null;
}

export default function MarketScene({ scrollProgress }: MarketSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 4.0, 24.0], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
    >
      <Suspense fallback={null}>
        <PostProcessing />
        <fog attach="fog" args={['#010409', 16, 75]} />
        <ambientLight intensity={0.4} />
        
        <HeroScene scrollProgress={scrollProgress} />
        <CameraRig scrollProgress={scrollProgress} />
      </Suspense>
    </Canvas>
  );
}
