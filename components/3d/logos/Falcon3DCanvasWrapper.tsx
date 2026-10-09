'use client';

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Falcon3DScene from './Falcon3DScene';

interface Falcon3DCanvasWrapperProps {
  isHovered: boolean;
  mousePos: { x: number; y: number };
  accentColor?: string;
  isNavbar?: boolean;
}

export default function Falcon3DCanvasWrapper({
  isHovered,
  mousePos,
  accentColor = '#65B9D8',
  isNavbar = false,
}: Falcon3DCanvasWrapperProps) {
  return (
    <Canvas
      camera={{
        position: [0, 0, 4.0],
        fov: 38,
      }}
      dpr={[1, 2]}
      gl={{
        alpha: true,
        antialias: true,
        premultipliedAlpha: false,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.25,
      }}
      style={{
        background: 'transparent',
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <ambientLight intensity={1.4} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} />
      <directionalLight position={[-4, -3, 3]} intensity={1.4} color={accentColor} />

      <Suspense fallback={null}>
        <Falcon3DScene
          isHovered={isHovered}
          mousePos={mousePos}
          accentColor={accentColor}
          isNavbar={isNavbar}
        />
      </Suspense>
    </Canvas>
  );
}

