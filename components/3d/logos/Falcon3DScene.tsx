'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Falcon3DSceneProps {
  isHovered: boolean;
  mousePos: { x: number; y: number };
  accentColor?: string;
  isNavbar?: boolean;
}

export default function Falcon3DScene({
  isHovered,
  mousePos,
  accentColor = '#65B9D8',
  isNavbar = false,
}: Falcon3DSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const keyLightRef = useRef<THREE.PointLight>(null);

  // Animation state
  const [, setTextureLoaded] = useState(false);
  const spinProgressRef = useRef(0);
  const isSpinningRef = useRef(false);
  const prevHoverRef = useRef(false);

  // Preload high-res transparent falcon logo texture (Authentic artwork, zero background)
  const texture = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const loader = new THREE.TextureLoader();
    return loader.load(
      '/images/logo-falcon-transparent.png',
      () => setTextureLoaded(true),
      undefined,
      () => setTextureLoaded(true)
    );
  }, []);

  if (texture) {
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.colorSpace = THREE.SRGBColorSpace;
  }

  // Trigger 360-degree pop-up spin on hover entry
  useEffect(() => {
    if (isHovered && !prevHoverRef.current) {
      isSpinningRef.current = true;
      spinProgressRef.current = 0;
    }
    prevHoverRef.current = isHovered;
  }, [isHovered]);

  // Frame animation loop
  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const group = groupRef.current;

    // 1. Full 360-degree pop-up spin with banking depth tilt
    if (isSpinningRef.current) {
      spinProgressRef.current += delta * 1.25; // ~0.8s smooth full revolution
      if (spinProgressRef.current >= 1.0) {
        spinProgressRef.current = 1.0;
        isSpinningRef.current = false;
        group.rotation.y = 0; // Immediately lock to 0 radians front-facing logo
        group.rotation.x = 0;
        group.position.z = isNavbar ? 0.12 : 0.22;
      }

      const p = spinProgressRef.current;
      // Smooth cubic-out easing
      const eased = 1 - Math.pow(1 - p, 3);
      const spinAngle = eased * Math.PI * 2; // 0 to 360 degrees
      // Controlled banking tilt so wings stay cleanly within placeholder boundaries
      const bankAngle = Math.sin(p * Math.PI) * (isNavbar ? 0.08 : 0.12);

      group.rotation.y = spinAngle >= Math.PI * 2 ? 0 : spinAngle;
      group.rotation.x = bankAngle;
      group.position.z = THREE.MathUtils.lerp(0, isNavbar ? 0.12 : 0.22, Math.sin(p * Math.PI));
    } else {
      // 2. Interactive Cursor Parallax Tracking when front-facing (displaying true logo)
      const targetRotY = isHovered ? mousePos.x * 0.32 : 0;
      const targetRotX = isHovered ? -mousePos.y * 0.22 : 0;
      const targetPosZ = isHovered ? (isNavbar ? 0.12 : 0.22) : 0;

      // Smooth inertial damping to target
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetRotY, 9, delta);
      group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetRotX, 9, delta);
      group.position.z = THREE.MathUtils.damp(group.position.z, targetPosZ, 9, delta);
    }

    // Holographic breathing float when hovered
    const hoverBob = isHovered ? Math.sin(state.clock.elapsedTime * 2.8) * 0.02 : 0;
    group.position.y = THREE.MathUtils.damp(group.position.y, groupPosY + hoverBob, 8, delta);

    // Specular key light movement tracking mouse
    if (keyLightRef.current) {
      keyLightRef.current.position.x = mousePos.x * 2.5;
      keyLightRef.current.position.y = mousePos.y * 2.5;
    }
  });

  // Scale: composed perfectly into the placeholder
  const sceneScale: [number, number, number] = isNavbar
    ? [1.06, 1.06, 1.06]
    : [1.12, 1.12, 1.12];

  // Y-offset: centered vertically
  const groupPosY = 0;

  return (
    <group ref={groupRef} scale={sceneScale} position={[0, groupPosY, 0]}>
      {/* Specular Key Light tracking cursor */}
      <pointLight
        ref={keyLightRef}
        position={[1.5, 2.0, 3.0]}
        intensity={2.8}
        distance={12}
        color="#FFFFFF"
      />

      {/* Subtle Ambient / Fill Light for True Logo Color Fidelity */}
      <ambientLight intensity={1.5} />

      {/* Subtle Accent Rim Light */}
      <pointLight
        position={[-2.5, -1.5, -2]}
        intensity={1.6}
        distance={8}
        color={accentColor}
      />

      {/* ── 1. Front Textured Falcon Face (Original Artwork with 100% Fidelity) ── */}
      {texture && (
        <mesh position={[0, 0, 0.04]}>
          <planeGeometry args={[2.0, 2.0]} />
          <meshStandardMaterial
            map={texture}
            transparent={true}
            alphaTest={0.005}
            roughness={0.25}
            metalness={0.15}
            color="#FFFFFF"
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ── 2. Back Textured Falcon Face (Visible during 360 Spin, Zero Background) ── */}
      {texture && (
        <mesh position={[0, 0, -0.04]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[2.0, 2.0]} />
          <meshStandardMaterial
            map={texture}
            transparent={true}
            alphaTest={0.005}
            roughness={0.3}
            metalness={0.2}
            color="#FFFFFF"
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ── 3. Multi-Layer Volumetric Slices for Substantial 3D Physical Thickness ── */}
      {texture && (
        <>
          {[-0.03, -0.015, 0, 0.015, 0.03].map((z, idx) => (
            <mesh key={idx} position={[0, 0, z]}>
              <planeGeometry args={[1.98, 1.98]} />
              <meshStandardMaterial
                map={texture}
                transparent={true}
                alphaTest={0.015}
                color={idx === 2 ? '#1E293B' : '#0F172A'}
                roughness={0.5}
                metalness={0.8}
              />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
}
