'use client';

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Falcon3DSceneProps {
  isHovered: boolean;
  mousePos: { x: number; y: number };
  accentColor?: string;
}

export default function Falcon3DScene({
  isHovered,
  mousePos,
  accentColor = '#65B9D8',
}: Falcon3DSceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const eyeLightRef = useRef<THREE.PointLight>(null);
  const keyLightRef = useRef<THREE.PointLight>(null);
  const reticleRef = useRef<THREE.Group>(null);

  // Animation state
  const [, setTextureLoaded] = useState(false);
  const spinProgressRef = useRef(0);
  const isSpinningRef = useRef(false);
  const prevHoverRef = useRef(false);

  // Preload high-res transparent falcon logo texture (Zero background)
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

  // 3D Candlestick Geometries for Wings (Green Bull & Red Bear)
  const candleBodyGeo = useMemo(() => new THREE.BoxGeometry(0.09, 0.36, 0.07), []);
  const candleWickGeo = useMemo(() => new THREE.CylinderGeometry(0.012, 0.012, 0.56, 12), []);
  
  // 3D Cyber HUD Targeting Reticle Geometries (Centered on Falcon's Eye)
  const reticleRingGeo = useMemo(() => new THREE.TorusGeometry(0.18, 0.014, 16, 48), []);
  const reticleCrossGeo = useMemo(() => new THREE.BoxGeometry(0.38, 0.012, 0.012), []);

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

    // Slowly rotate cyber-targeting reticle
    if (reticleRef.current) {
      reticleRef.current.rotation.z += delta * (isHovered ? 2.5 : 0.8);
    }

    // 1. Full 360-degree pop-up spin with banking depth tilt
    if (isSpinningRef.current) {
      spinProgressRef.current += delta * 2.2; // ~1.4s complete revolution
      if (spinProgressRef.current >= 1.0) {
        spinProgressRef.current = 1.0;
        isSpinningRef.current = false;
      }

      const p = spinProgressRef.current;
      // Smooth cubic-out easing
      const eased = 1 - Math.pow(1 - p, 3);
      const spinAngle = eased * Math.PI * 2; // 0 to 360 degrees
      const bankAngle = Math.sin(p * Math.PI) * 0.32; // ~18 deg pitch tilt to show 3D volume

      group.rotation.y = spinAngle;
      group.rotation.x = bankAngle;
      group.position.z = THREE.MathUtils.lerp(0, 0.6, Math.sin(p * Math.PI));
    } else {
      // 2. Interactive Cursor Parallax Tracking when front-facing
      const targetRotY = isHovered ? mousePos.x * 0.55 : 0;
      const targetRotX = isHovered ? -mousePos.y * 0.45 : 0;
      const targetPosZ = isHovered ? 0.45 : 0;

      // Smooth inertial damping
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, targetRotY, 9, delta);
      group.rotation.x = THREE.MathUtils.damp(group.rotation.x, targetRotX, 9, delta);
      group.position.z = THREE.MathUtils.damp(group.position.z, targetPosZ, 9, delta);
    }

    // Specular light movement tracking mouse
    if (keyLightRef.current) {
      keyLightRef.current.position.x = mousePos.x * 3.5;
      keyLightRef.current.position.y = mousePos.y * 3.5;
    }

    // Pulsing cyber eye light
    if (eyeLightRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 6) * 0.4 + 1.2;
      eyeLightRef.current.intensity = (isHovered ? 3.5 : 1.8) * pulse;
    }
  });

  return (
    <group ref={groupRef} scale={[1.35, 1.35, 1.35]}>
      {/* Dynamic Key Specular Point Light following cursor */}
      <pointLight
        ref={keyLightRef}
        position={[2, 2.5, 3.5]}
        intensity={3.8}
        distance={14}
        color="#FFFFFF"
      />

      {/* Cyber-Targeting Eye Point Light */}
      <pointLight
        ref={eyeLightRef}
        position={[-0.05, 0.18, 0.2]}
        intensity={2.5}
        distance={4}
        color="#06B6D4"
      />

      {/* Accent Rim / Edge Light */}
      <pointLight
        position={[-3, -2, -2]}
        intensity={2.4}
        distance={10}
        color={accentColor}
      />

      {/* ── 1. Front Texture Relief Plate with Falcon Graphics (Zero background) ── */}
      {texture && (
        <mesh position={[0, 0, 0.055]}>
          <planeGeometry args={[2.3, 2.3]} />
          <meshPhysicalMaterial
            map={texture}
            transparent={true}
            alphaTest={0.02}
            roughness={0.12}
            metalness={0.88}
            clearcoat={1.0}
            clearcoatRoughness={0.06}
            reflectivity={0.98}
            emissive="#06B6D4"
            emissiveIntensity={0.12}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ── 2. Multi-Slice Depth Extrusion Core (Creates physical thickness with zero background) ── */}
      {texture && (
        <>
          <mesh position={[0, 0, 0.025]}>
            <planeGeometry args={[2.28, 2.28]} />
            <meshPhysicalMaterial
              map={texture}
              transparent={true}
              alphaTest={0.04}
              roughness={0.25}
              metalness={0.95}
              color="#0F172A"
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, 0, -0.025]}>
            <planeGeometry args={[2.28, 2.28]} />
            <meshPhysicalMaterial
              map={texture}
              transparent={true}
              alphaTest={0.04}
              roughness={0.25}
              metalness={0.95}
              color="#0F172A"
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}

      {/* ── 3. Reverse Side Plate (For full 360 spin visibility with zero background) ── */}
      {texture && (
        <mesh position={[0, 0, -0.055]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[2.3, 2.3]} />
          <meshPhysicalMaterial
            map={texture}
            transparent={true}
            alphaTest={0.02}
            roughness={0.18}
            metalness={0.92}
            clearcoat={1.0}
            clearcoatRoughness={0.08}
            color="#E2E8F0"
            emissive="#06B6D4"
            emissiveIntensity={0.1}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {/* ── 4. Genuine 3D Candlesticks on Wings (Left & Right) ── */}
      {/* Left Wing Green Bull Candle */}
      <group position={[-0.78, 0.44, 0.075]}>
        <mesh geometry={candleWickGeo}>
          <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.6} metalness={0.8} />
        </mesh>
        <mesh geometry={candleBodyGeo}>
          <meshPhysicalMaterial
            color="#10B981"
            emissive="#10B981"
            emissiveIntensity={0.45}
            metalness={0.6}
            roughness={0.15}
            clearcoat={1.0}
          />
        </mesh>
      </group>

      {/* Left Wing Red Bear Candle */}
      <group position={[-0.58, 0.22, 0.075]}>
        <mesh geometry={candleWickGeo} scale={[1, 0.85, 1]}>
          <meshStandardMaterial color="#F43F5E" emissive="#F43F5E" emissiveIntensity={0.6} metalness={0.8} />
        </mesh>
        <mesh geometry={candleBodyGeo} scale={[1, 0.78, 1]}>
          <meshPhysicalMaterial
            color="#F43F5E"
            emissive="#F43F5E"
            emissiveIntensity={0.45}
            metalness={0.6}
            roughness={0.15}
            clearcoat={1.0}
          />
        </mesh>
      </group>

      {/* Right Wing Green Bull Candle */}
      <group position={[0.78, 0.44, 0.075]}>
        <mesh geometry={candleWickGeo}>
          <meshStandardMaterial color="#10B981" emissive="#10B981" emissiveIntensity={0.6} metalness={0.8} />
        </mesh>
        <mesh geometry={candleBodyGeo}>
          <meshPhysicalMaterial
            color="#10B981"
            emissive="#10B981"
            emissiveIntensity={0.45}
            metalness={0.6}
            roughness={0.15}
            clearcoat={1.0}
          />
        </mesh>
      </group>

      {/* Right Wing Red Bear Candle */}
      <group position={[0.58, 0.22, 0.075]}>
        <mesh geometry={candleWickGeo} scale={[1, 0.85, 1]}>
          <meshStandardMaterial color="#F43F5E" emissive="#F43F5E" emissiveIntensity={0.6} metalness={0.8} />
        </mesh>
        <mesh geometry={candleBodyGeo} scale={[1, 0.78, 1]}>
          <meshPhysicalMaterial
            color="#F43F5E"
            emissive="#F43F5E"
            emissiveIntensity={0.45}
            metalness={0.6}
            roughness={0.15}
            clearcoat={1.0}
          />
        </mesh>
      </group>

      {/* ── 5. 3D Cyber HUD Targeting Reticle over Falcon's Eye ── */}
      <group ref={reticleRef} position={[-0.05, 0.18, 0.07]}>
        <mesh geometry={reticleRingGeo}>
          <meshStandardMaterial
            color="#06B6D4"
            emissive="#06B6D4"
            emissiveIntensity={0.9}
            transparent={true}
            opacity={0.85}
          />
        </mesh>
        <mesh geometry={reticleCrossGeo}>
          <meshStandardMaterial
            color="#38BDF8"
            emissive="#38BDF8"
            emissiveIntensity={0.8}
            transparent={true}
            opacity={0.7}
          />
        </mesh>
        <mesh geometry={reticleCrossGeo} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial
            color="#38BDF8"
            emissive="#38BDF8"
            emissiveIntensity={0.8}
            transparent={true}
            opacity={0.7}
          />
        </mesh>
      </group>
    </group>
  );
}
