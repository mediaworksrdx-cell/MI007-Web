// ─── Cinematic Video Transformer ───
// Genuine transformation: Video -> Micro-particles -> Structured Data -> 3D Market Geometry
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Theme3DSettings } from '../core/Theme3DAdapter';

interface CinematicVideoTransformerProps {
  scrollProgress: number;
  themeSettings: Theme3DSettings;
}

export default function CinematicVideoTransformer({
  scrollProgress,
  themeSettings,
}: CinematicVideoTransformerProps) {
  const pointsRef = useRef<THREE.Points>(null);

  // Volumetric transition particles (0.00 -> 0.15 scroll range)
  const { initialPositions, targetPositions, colors } = useMemo(() => {
    const count = 1800;
    const initPos = new Float32Array(count * 3);
    const targPos = new Float32Array(count * 3);
    const cols = new Float32Array(count * 3);

    const bullCol = new THREE.Color(themeSettings.bullColor);
    const bearCol = new THREE.Color(themeSettings.bearColor);
    const cyanCol = new THREE.Color(themeSettings.accentCyan);

    for (let i = 0; i < count; i++) {
      // 1. Initial 2D flat video plane aspect ratio (16:9)
      const u = (Math.random() - 0.5) * 16;
      const v = (Math.random() - 0.5) * 9;
      initPos[i * 3 + 0] = u;
      initPos[i * 3 + 1] = v + 4.0;
      initPos[i * 3 + 2] = 12.0;

      // 2. Target 3D market terrain & candlestick canyon positions
      const tx = (Math.random() - 0.5) * 28;
      const tz = (Math.random() - 0.5) * 50 - 10;
      const ty = Math.sin(tx * 0.2) * 2.5 - 2.0;
      targPos[i * 3 + 0] = tx;
      targPos[i * 3 + 1] = ty;
      targPos[i * 3 + 2] = tz;

      // Color variation
      const c = Math.random() < 0.5 ? bullCol : Math.random() < 0.8 ? bearCol : cyanCol;
      cols[i * 3 + 0] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }

    return { initialPositions: initPos, targetPositions: targPos, colors: cols };
  }, [themeSettings]);

  useFrame(() => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;

    // Transformation factor t driven by opening scroll (0% to 15%)
    const t = Math.min(1.0, Math.max(0.0, scrollProgress / 0.15));
    const smoothT = t * t * (3 - 2 * t);

    for (let i = 0; i < posAttr.count; i++) {
      const ix = initialPositions[i * 3 + 0];
      const iy = initialPositions[i * 3 + 1];
      const iz = initialPositions[i * 3 + 2];

      const tx = targetPositions[i * 3 + 0];
      const ty = targetPositions[i * 3 + 1];
      const tz = targetPositions[i * 3 + 2];

      posAttr.setXYZ(
        i,
        ix + (tx - ix) * smoothT,
        iy + (ty - iy) * smoothT,
        iz + (tz - iz) * smoothT
      );
    }
    posAttr.needsUpdate = true;
  });

  return (
    <group name="CinematicVideoTransformer">
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array(initialPositions), 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.16}
          vertexColors
          transparent
          opacity={Math.max(0.2, 1.0 - scrollProgress * 1.5)}
          sizeAttenuation
        />
      </points>
    </group>
  );
}
