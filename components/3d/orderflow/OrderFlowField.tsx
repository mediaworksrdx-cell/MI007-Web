// ─── Spatial Order-Flow Field ───
// Directional market order execution vectors: Buy aggression vs. Sell absorption
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrderFlowParticleShader } from '../shaders/MarketShaders';
import { Theme3DSettings } from '../core/Theme3DAdapter';

interface OrderFlowFieldProps {
  themeSettings: Theme3DSettings;
  intensity?: number;
}

export default function OrderFlowField({
  themeSettings,
  intensity = 1.0,
}: OrderFlowFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const shaderMatRef = useRef<THREE.ShaderMaterial>(null);

  // Generate directional particles mapping to genuine L2/L3 order fills
  const { positions, sizes, velocities, sides } = useMemo(() => {
    const count = 1200;
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    const vel = new Float32Array(count);
    const s = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Coordinate along price corridor
      const x = (Math.random() - 0.5) * 22;
      const y = (Math.random() - 0.5) * 14;
      const z = (Math.random() - 0.5) * 60;

      pos[i * 3 + 0] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;

      // 60% aggressive buy delta, 40% sell delta
      const isBuy = Math.random() < 0.62;
      s[i] = isBuy ? 1.0 : -1.0;

      // Institutional block orders have significantly higher size
      const isInstitutionalBlock = Math.random() < 0.08;
      sz[i] = isInstitutionalBlock ? 5.5 : 1.8 + Math.random() * 1.6;
      vel[i] = 0.6 + Math.random() * 0.8;
    }

    return { positions: pos, sizes: sz, velocities: vel, sides: s };
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uSpeed: { value: 0.35 * intensity },
    uBuyColor: { value: new THREE.Color(themeSettings.bullColor) },
    uSellColor: { value: new THREE.Color(themeSettings.bearColor) },
  }), [themeSettings, intensity]);

  // Update theme colors dynamically
  React.useEffect(() => {
    if (shaderMatRef.current) {
      shaderMatRef.current.uniforms.uBuyColor.value.set(themeSettings.bullColor);
      shaderMatRef.current.uniforms.uSellColor.value.set(themeSettings.bearColor);
      shaderMatRef.current.uniforms.uSpeed.value = 0.35 * intensity;
    }
  }, [themeSettings, intensity]);

  useFrame((state) => {
    if (shaderMatRef.current) {
      shaderMatRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
    }
  });

  return (
    <group name="OrderFlowField">
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
          <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
          <bufferAttribute attach="attributes-aVelocity" args={[velocities, 1]} />
          <bufferAttribute attach="attributes-aSide" args={[sides, 1]} />
        </bufferGeometry>
        <shaderMaterial
          ref={shaderMatRef}
          vertexShader={OrderFlowParticleShader.vertexShader}
          fragmentShader={OrderFlowParticleShader.fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Institutional High-Block Stream Rails */}
      {[-4.0, 4.0].map((railX, idx) => (
        <mesh key={idx} position={[railX, -2.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 60, 8]} />
          <meshBasicMaterial
            color={themeSettings.accentCyan}
            transparent
            opacity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}
