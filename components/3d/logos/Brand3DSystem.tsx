// ─── 3D Brand Logo System ───
// Exact procedural 3D PBR geometry of MI007 cyber-falcon emblem & Synthetix insignia
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Theme3DSettings } from '../core/Theme3DAdapter';

interface Brand3DSystemProps {
  themeSettings: Theme3DSettings;
  scale?: number;
  position?: [number, number, number];
}

export default function Brand3DSystem({
  themeSettings,
  scale = 1.0,
  position = [0, 8, 0],
}: Brand3DSystemProps) {
  const brandGroupRef = useRef<THREE.Group>(null);

  // Procedural Cyber-Falcon Wing Geometry
  const wingShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(1.8, 1.2);
    s.lineTo(3.2, 2.8);
    s.lineTo(2.4, 1.4);
    s.lineTo(3.8, 2.2);
    s.lineTo(2.1, 0.4);
    s.lineTo(3.4, 0.8);
    s.lineTo(1.2, -0.6);
    s.lineTo(0, -0.2);
    s.closePath();
    return s;
  }, []);

  const extrudeSettings = useMemo(() => ({
    steps: 2,
    depth: 0.35,
    bevelEnabled: true,
    bevelThickness: 0.12,
    bevelSize: 0.08,
    bevelSegments: 4,
  }), []);

  const wingGeo = useMemo(() => new THREE.ExtrudeGeometry(wingShape, extrudeSettings), [wingShape, extrudeSettings]);

  useFrame((state) => {
    if (!brandGroupRef.current) return;
    const t = state.clock.getElapsedTime();
    brandGroupRef.current.rotation.y = Math.sin(t * 0.4) * 0.15;
    brandGroupRef.current.position.y = position[1] + Math.sin(t * 0.6) * 0.2;
  });

  return (
    <group ref={brandGroupRef} position={position} scale={scale} name="Brand3DSystem">
      {/* Central Falcon Core Diamond Medallion */}
      <mesh castShadow receiveShadow>
        <octahedronGeometry args={[1.2, 0]} />
        <meshPhysicalMaterial
          color="#1E293B"
          metalness={0.92}
          roughness={0.08}
          clearcoat={1.0}
          clearcoatRoughness={0.04}
          reflectivity={0.96}
          emissive={themeSettings.accentCyan}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Cyber-Falcon Right Wing */}
      <mesh geometry={wingGeo} position={[0.4, 0, -0.15]} castShadow>
        <meshPhysicalMaterial
          color="#38BDF8"
          metalness={0.88}
          roughness={0.12}
          clearcoat={1.0}
          emissive={themeSettings.accentCyan}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Cyber-Falcon Left Wing (Mirrored) */}
      <mesh geometry={wingGeo} position={[-0.4, 0, 0.15]} scale={[-1, 1, 1]} castShadow>
        <meshPhysicalMaterial
          color="#38BDF8"
          metalness={0.88}
          roughness={0.12}
          clearcoat={1.0}
          emissive={themeSettings.accentCyan}
          emissiveIntensity={0.25}
        />
      </mesh>

      {/* Outer Titanium Orbit Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[4.2, 0.06, 12, 64]} />
        <meshStandardMaterial
          color="#94A3B8"
          metalness={0.95}
          roughness={0.08}
        />
      </mesh>

      {/* Laser Light Accent */}
      <pointLight
        color={themeSettings.accentCyan}
        intensity={2.5}
        distance={12}
      />
    </group>
  );
}
