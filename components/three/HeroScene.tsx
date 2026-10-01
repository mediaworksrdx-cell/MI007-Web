'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface HeroSceneProps {
  scrollProgress: number;
}

export default function HeroScene({ scrollProgress }: HeroSceneProps) {
  const sceneGroupRef = useRef<THREE.Group>(null);
  const bullMonolithGroupRef = useRef<THREE.Group>(null);
  const bearMonolithGroupRef = useRef<THREE.Group>(null);
  const bullBodyRef = useRef<THREE.Mesh>(null);
  const bearBodyRef = useRef<THREE.Mesh>(null);
  const bullWickRef = useRef<THREE.Group>(null);
  const bearWickRef = useRef<THREE.Group>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const historicalGroupRef = useRef<THREE.Group>(null);
  const greenPedestalRef = useRef<THREE.Mesh>(null);
  const redPedestalRef = useRef<THREE.Mesh>(null);

  // ── 1. Canyon of Historical Translucent Crystal Candlesticks (in -Z) ──
  const historicalMonoliths = useMemo(() => {
    const list = [];
    const count = 14;
    let currentY = 1.0;

    for (let i = 0; i < count; i++) {
      const z = -8 - i * 2.5;
      const isBull = (i * 7 + 3) % 11 > 4;
      const height = 5.0 + Math.sin(i * 0.9) * 3.0 + (isBull ? 2.5 : -1.5);
      const x = (i % 2 === 0 ? -1 : 1) * (3.4 + i * 0.35 + Math.sin(i * 1.2) * 1.8);
      currentY += isBull ? 0.35 : -0.3;
      const y = Math.max(-1.5, Math.min(4.5, currentY));
      const wickHeight = height + 5.0;

      list.push({
        id: i,
        x,
        y,
        z,
        height,
        wickHeight,
        isBull,
        color: isBull ? '#00FF88' : '#FF1744',
      });
    }
    return list;
  }, []);

  // ── 2. Atmospheric Optical Dust Embers ──
  const dustData = useMemo(() => {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const cGreen = new THREE.Color('#10B981');
    const cEmerald = new THREE.Color('#059669');
    const cRed = new THREE.Color('#EF4444');
    const cCrimson = new THREE.Color('#DC2626');

    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 45;
      const y = Math.random() * 28 - 6;
      const z = (Math.random() - 0.5) * 44 - 6;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Green and red embers
      const isGreen = Math.random() > 0.5;
      const col = isGreen
        ? (Math.random() > 0.5 ? cGreen : cEmerald)
        : (Math.random() > 0.5 ? cRed : cCrimson);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;
    }
    return { positions, colors };
  }, []);

  // ── 3. Traveling Bezier Price Flow Lines ──
  const priceCurves = useMemo(() => {
    const pts1: THREE.Vector3[] = [];
    const pts2: THREE.Vector3[] = [];

    // Curve 1: Flowing from deep canyon through the colossal green monolith
    pts1.push(new THREE.Vector3(-14, -2, -38));
    pts1.push(new THREE.Vector3(-8, 1.5, -24));
    pts1.push(new THREE.Vector3(-4.5, 4.0, -12));
    pts1.push(new THREE.Vector3(-3.4, 6.5, 0.5));
    pts1.push(new THREE.Vector3(0, 4.8, 3.2));
    pts1.push(new THREE.Vector3(3.4, 2.2, 0.5));

    // Curve 2: Interconnected cross-market liquidity line
    pts2.push(new THREE.Vector3(12, -1, -34));
    pts2.push(new THREE.Vector3(6, 3.0, -18));
    pts2.push(new THREE.Vector3(3.4, 1.0, -4));
    pts2.push(new THREE.Vector3(0, 2.5, 1.2));
    pts2.push(new THREE.Vector3(-3.4, 5.0, 0.5));

    const curve1 = new THREE.CatmullRomCurve3(pts1);
    const curve2 = new THREE.CatmullRomCurve3(pts2);

    const geo1 = new THREE.TubeGeometry(curve1, 80, 0.038, 8, false);
    const geo2 = new THREE.TubeGeometry(curve2, 80, 0.028, 8, false);

    return [
      { geo: geo1, color: '#00E5FF' },
      { geo: geo2, color: '#00FF88' },
    ];
  }, []);

  // ── 4. Main Animation Frame Loop ──
  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();
    const ptrX = state.pointer.x;
    const ptrY = state.pointer.y;

    // A. Subdued Parallax
    if (sceneGroupRef.current) {
      sceneGroupRef.current.rotation.y = THREE.MathUtils.lerp(
        sceneGroupRef.current.rotation.y,
        ptrX * 0.06,
        0.04
      );
      sceneGroupRef.current.rotation.x = THREE.MathUtils.lerp(
        sceneGroupRef.current.rotation.x,
        -ptrY * 0.03,
        0.04
      );
    }

    // B. Dominant Green Monolith: Upward Organic Growth & Breathing
    if (bullMonolithGroupRef.current && bullBodyRef.current) {
      const upwardGrowth = Math.sin(time * 0.6) * 0.07;
      bullBodyRef.current.scale.y = 1.0 + upwardGrowth;
      bullMonolithGroupRef.current.position.y = 2.4 + Math.sin(time * 0.75) * 0.2;

      if (bullWickRef.current) {
        bullWickRef.current.rotation.z = Math.sin(time * 1.4) * 0.01;
      }

      if (greenPedestalRef.current) {
        greenPedestalRef.current.scale.y = 1.0 + Math.sin(time * 1.1) * 0.15;
      }
    }

    // C. Dominant Red Monolith: Gravitational Drop & Oscillation
    if (bearMonolithGroupRef.current && bearBodyRef.current) {
      const downwardDrop = Math.cos(time * 0.7) * 0.1;
      bearBodyRef.current.scale.y = 1.0 + downwardDrop;
      bearMonolithGroupRef.current.position.y = 0.8 + Math.cos(time * 0.85) * 0.25;

      if (bearWickRef.current) {
        bearWickRef.current.rotation.z = Math.cos(time * 1.5) * 0.01;
      }

      if (redPedestalRef.current) {
        redPedestalRef.current.scale.y = 1.0 + Math.cos(time * 1.3) * 0.2;
      }
    }

    // D. Historical Canyon Undulation
    if (historicalGroupRef.current) {
      const children = historicalGroupRef.current.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        child.position.y += Math.sin(time * 1.1 + i * 0.5) * 0.003;
      }
    }

    // E. Atmospheric Dust Float
    if (particlesRef.current) {
      const geom = particlesRef.current.geometry;
      const posAttr = geom.attributes.position;
      const count = posAttr.count;

      for (let i = 0; i < count; i += 4) {
        let y = posAttr.getY(i);
        y += delta * 0.5;
        if (y > 22) y = -6;
        posAttr.setY(i, y);
      }
      posAttr.needsUpdate = true;
      particlesRef.current.rotation.y = time * 0.01;
    }
  });

  return (
    <group ref={sceneGroupRef}>
      {/* ── ANAMORPHIC VOLUMETRIC SPOTLIGHTS FOCUSING ON MONOLITHS ── */}
      <spotLight
        position={[-3.4, 28, 6]}
        target-position={[-3.4, 4, 0.5]}
        color="#00FF88"
        intensity={6.0}
        angle={0.42}
        penumbra={0.9}
        distance={50}
      />
      <spotLight
        position={[3.4, 28, 6]}
        target-position={[3.4, 2, 0.5]}
        color="#FF1744"
        intensity={6.0}
        angle={0.42}
        penumbra={0.9}
        distance={50}
      />
      <directionalLight position={[0, 20, 14]} intensity={0.9} color="#D8ECFF" />

      {/* ── 1. PHOTOREALISTIC BEVELED BULL MONOLITH (Dominant Crystal Monolith) ── */}
      <group ref={bullMonolithGroupRef} position={[-3.4, 2.4, 0.5]}>
        {/* Crystal Glass Monolith with Rounded Beveled Edges */}
        <RoundedBox
          ref={bullBodyRef}
          args={[3.0, 19.0, 3.0]}
          radius={0.14}
          smoothness={4}
          position={[0, 0, 0]}
        >
          <meshPhysicalMaterial
            color="#00FF88"
            transparent
            opacity={0.88}
            roughness={0.04}
            metalness={0.08}
            transmission={0.94}
            thickness={4.8}
            ior={1.58}
            reflectivity={0.92}
            clearcoat={1.0}
            clearcoatRoughness={0.02}
            emissive="#00FF88"
            emissiveIntensity={0.35}
          />
        </RoundedBox>

        {/* Pulsating Internal Laser Filament Core */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 18.5, 16]} />
          <meshBasicMaterial color="#9EFFF2" />
        </mesh>

        {/* Monolithic Fiber-Optic Wicks with Plasma Tip Corona */}
        <group ref={bullWickRef}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 34.0, 16]} />
            <meshStandardMaterial
              color="#00FF88"
              emissive="#00FF88"
              emissiveIntensity={1.5}
              metalness={0.95}
              roughness={0.08}
            />
          </mesh>
          <mesh position={[0, 17.0, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="#00FF88" />
          </mesh>
          <mesh position={[0, -17.0, 0]}>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshBasicMaterial color="#00FF88" />
          </mesh>
        </group>

        {/* Subtle Horizontal Resonance Ring */}
        {[-6.0, -2.0, 2.0, 6.0].map((y, idx) => (
          <mesh key={idx} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.75, 0.018, 8, 36]} />
            <meshBasicMaterial color="#00FF88" transparent opacity={0.55} />
          </mesh>
        ))}

        {/* Volume Pedestal Underneath */}
        <mesh ref={greenPedestalRef} position={[0, -10.3, 0]}>
          <cylinderGeometry args={[1.75, 1.95, 1.6, 24]} />
          <meshStandardMaterial
            color="#011A0D"
            emissive="#00FF88"
            emissiveIntensity={0.5}
            metalness={0.85}
            roughness={0.15}
          />
        </mesh>
      </group>

      {/* ── 2. PHOTOREALISTIC BEVELED BEAR MONOLITH ── */}
      <group ref={bearMonolithGroupRef} position={[3.4, 0.8, 0.5]}>
        {/* Crystal Glass Monolith with Rounded Beveled Edges */}
        <RoundedBox
          ref={bearBodyRef}
          args={[3.0, 15.0, 3.0]}
          radius={0.14}
          smoothness={4}
          position={[0, 0, 0]}
        >
          <meshPhysicalMaterial
            color="#FF1744"
            transparent
            opacity={0.88}
            roughness={0.04}
            metalness={0.08}
            transmission={0.94}
            thickness={4.8}
            ior={1.58}
            reflectivity={0.92}
            clearcoat={1.0}
            clearcoatRoughness={0.02}
            emissive="#FF1744"
            emissiveIntensity={0.35}
          />
        </RoundedBox>

        {/* Pulsating Internal Laser Filament Core */}
        <mesh position={[0, 0, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 14.5, 16]} />
          <meshBasicMaterial color="#FFB8C6" />
        </mesh>

        {/* Monolithic Fiber-Optic Wicks with Plasma Tip Corona */}
        <group ref={bearWickRef}>
          <mesh position={[0, 0, 0]}>
            <cylinderGeometry args={[0.038, 0.038, 28.0, 16]} />
            <meshStandardMaterial
              color="#FF1744"
              emissive="#FF1744"
              emissiveIntensity={1.5}
              metalness={0.95}
              roughness={0.08}
            />
          </mesh>
          <mesh position={[0, 14.0, 0]}>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="#FF1744" />
          </mesh>
          <mesh position={[0, -14.0, 0]}>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshBasicMaterial color="#FF1744" />
          </mesh>
        </group>

        {/* Subtle Horizontal Resonance Ring */}
        {[-4.5, 0, 4.5].map((y, idx) => (
          <mesh key={idx} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.75, 0.018, 8, 36]} />
            <meshBasicMaterial color="#FF1744" transparent opacity={0.55} />
          </mesh>
        ))}

        {/* Volume Pedestal Underneath */}
        <mesh ref={redPedestalRef} position={[0, -8.3, 0]}>
          <cylinderGeometry args={[1.75, 1.95, 1.6, 24]} />
          <meshStandardMaterial
            color="#1E0308"
            emissive="#FF1744"
            emissiveIntensity={0.5}
            metalness={0.85}
            roughness={0.15}
          />
        </mesh>
      </group>

      {/* ── 3. CANYON OF HISTORICAL CRYSTAL MONOLITHS IN DEEP -Z ── */}
      <group ref={historicalGroupRef}>
        {historicalMonoliths.map((c) => (
          <group key={c.id} position={[c.x, c.y, c.z]}>
            <RoundedBox args={[1.2, c.height, 1.2]} radius={0.06} smoothness={3}>
              <meshPhysicalMaterial
                color={c.color}
                transparent
                opacity={0.4}
                roughness={0.08}
                metalness={0.15}
                transmission={0.85}
                thickness={2.2}
                emissive={c.color}
                emissiveIntensity={0.2}
              />
            </RoundedBox>
            <mesh>
              <cylinderGeometry args={[0.018, 0.018, c.wickHeight, 8]} />
              <meshStandardMaterial
                color={c.color}
                emissive={c.color}
                emissiveIntensity={0.7}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* ── 4. DYNAMIC LUMINOUS PRICE FLOW LASERS ── */}
      {priceCurves.map((curve, idx) => (
        <mesh key={idx} geometry={curve.geo}>
          <meshStandardMaterial
            color={curve.color}
            emissive={curve.color}
            emissiveIntensity={0.9}
            metalness={0.95}
            roughness={0.05}
          />
        </mesh>
      ))}

      {/* ── 5. REALISTIC MIRROR OBSIDIAN FLOOR (ZERO WIREFRAME GRIDS) ── */}
      <mesh position={[0, -11.0, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[180, 160]} />
        <MeshReflectorMaterial
          blur={[400, 100]}
          resolution={1024}
          mirror={0.75}
          mixBlur={0.85}
          mixStrength={1.8}
          roughness={0.12}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#010308"
          metalness={0.92}
        />
      </mesh>

      {/* ── 6. ATMOSPHERIC OPTICAL DUST EMBERS ── */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dustData.positions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[dustData.colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.065}
          vertexColors
          transparent
          opacity={0.35}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
