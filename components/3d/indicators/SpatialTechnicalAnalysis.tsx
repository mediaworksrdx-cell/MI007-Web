// ─── Spatial Technical Analysis Engine ───
// Indicators transformed into mathematical 3D spatial systems
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Theme3DSettings } from '../core/Theme3DAdapter';

interface SpatialTechnicalAnalysisProps {
  themeSettings: Theme3DSettings;
  visibleIndicators?: {
    ma?: boolean;
    ema?: boolean;
    vwap?: boolean;
    bollinger?: boolean;
    rsi?: boolean;
    macd?: boolean;
    fibonacci?: boolean;
    supportResistance?: boolean;
  };
}

export default function SpatialTechnicalAnalysis({
  themeSettings,
  visibleIndicators = {
    ma: true,
    ema: true,
    vwap: true,
    bollinger: true,
    rsi: true,
    macd: true,
    fibonacci: true,
    supportResistance: true,
  },
}: SpatialTechnicalAnalysisProps) {
  const groupRef = useRef<THREE.Group>(null);

  // 1. Moving Averages (MA & EMA) as 3D Bezier / Catmull-Rom spline tubes
  const { maTube, emaTube, vwapRibbon } = useMemo(() => {
    const maPoints: THREE.Vector3[] = [];
    const emaPoints: THREE.Vector3[] = [];
    const vwapPoints: THREE.Vector3[] = [];
    const count = 36;

    for (let i = 0; i < count; i++) {
      const z = (i - count / 2) * 2.2;
      const baseX = Math.sin(i * 0.18) * 4.5;
      
      // MA: Smoother, slower lag
      const maY = Math.sin(i * 0.22) * 2.5 + Math.cos(i * 0.1) * 1.5 - 1.5;
      maPoints.push(new THREE.Vector3(baseX * 0.9, maY, z));

      // EMA: Faster, more reactive to micro-structure
      const emaY = Math.sin(i * 0.28) * 3.2 + Math.cos(i * 0.15) * 1.8 - 1.2;
      emaPoints.push(new THREE.Vector3(baseX * 1.1, emaY, z));

      // VWAP: Volume-weighted benchmark spine
      const vwapY = Math.sin(i * 0.2) * 2.0 - 1.8;
      vwapPoints.push(new THREE.Vector3(baseX * 0.95, vwapY, z));
    }

    const maCurve = new THREE.CatmullRomCurve3(maPoints);
    const emaCurve = new THREE.CatmullRomCurve3(emaPoints);
    const vwapCurve = new THREE.CatmullRomCurve3(vwapPoints);

    return {
      maTube: new THREE.TubeGeometry(maCurve, 64, 0.08, 8, false),
      emaTube: new THREE.TubeGeometry(emaCurve, 64, 0.06, 8, false),
      vwapRibbon: new THREE.TubeGeometry(vwapCurve, 64, 0.12, 8, false),
    };
  }, []);

  // 2. Bollinger Bands Dynamic 3D Envelope
  const bollingerEnvelope = useMemo(() => {
    const ptsUpper: THREE.Vector3[] = [];
    const ptsLower: THREE.Vector3[] = [];
    const count = 30;

    for (let i = 0; i < count; i++) {
      const z = (i - count / 2) * 2.4;
      const x = Math.sin(i * 0.2) * 4.0;
      const midY = Math.sin(i * 0.25) * 2.2 - 1.5;
      const stdDev = 1.8 + Math.sin(i * 0.4) * 0.8; // Dynamic volatility envelope
      ptsUpper.push(new THREE.Vector3(x, midY + stdDev, z));
      ptsLower.push(new THREE.Vector3(x, midY - stdDev, z));
    }

    const c1 = new THREE.CatmullRomCurve3(ptsUpper);
    const c2 = new THREE.CatmullRomCurve3(ptsLower);

    return {
      upperGeo: new THREE.TubeGeometry(c1, 50, 0.04, 6, false),
      lowerGeo: new THREE.TubeGeometry(c2, 50, 0.04, 6, false),
    };
  }, []);

  // 3. MACD 3D Volumetric Histogram bars
  const macdBars = useMemo(() => {
    const list = [];
    const count = 28;
    for (let i = 0; i < count; i++) {
      const z = (i - count / 2) * 2.2;
      const val = Math.sin(i * 0.4) * 2.2 + Math.cos(i * 0.8) * 0.8;
      const isPositive = val >= 0;
      list.push({
        id: i,
        x: -9.5,
        y: val * 0.5 - 7.5,
        z,
        height: Math.max(0.15, Math.abs(val)),
        isPositive,
      });
    }
    return list;
  }, []);

  // Subtle oscillation frame loop
  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.x = Math.sin(t * 0.3) * 0.05;
  });

  return (
    <group ref={groupRef} name="SpatialTechnicalAnalysis">
      {/* 1. Moving Averages */}
      {visibleIndicators.ma && (
        <mesh geometry={maTube}>
          <meshStandardMaterial
            color="#FF9800"
            emissive="#FF9800"
            emissiveIntensity={0.8}
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
      )}

      {visibleIndicators.ema && (
        <mesh geometry={emaTube}>
          <meshStandardMaterial
            color="#2196F3"
            emissive="#2196F3"
            emissiveIntensity={1.0}
            roughness={0.15}
            metalness={0.9}
          />
        </mesh>
      )}

      {/* 2. VWAP Ribbon */}
      {visibleIndicators.vwap && (
        <mesh geometry={vwapRibbon}>
          <meshStandardMaterial
            color="#FFD600"
            emissive="#FFD600"
            emissiveIntensity={0.8}
            roughness={0.1}
            metalness={0.85}
          />
        </mesh>
      )}

      {/* 3. Bollinger Bands Envelope */}
      {visibleIndicators.bollinger && (
        <group>
          <mesh geometry={bollingerEnvelope.upperGeo}>
            <meshStandardMaterial color="#9C27B0" emissive="#9C27B0" emissiveIntensity={0.6} />
          </mesh>
          <mesh geometry={bollingerEnvelope.lowerGeo}>
            <meshStandardMaterial color="#9C27B0" emissive="#9C27B0" emissiveIntensity={0.6} />
          </mesh>
        </group>
      )}

      {/* 4. Fibonacci Architectural Reference Planes */}
      {visibleIndicators.fibonacci && (
        <group position={[0, -1.0, 0]}>
          {[
            { y: 5.2, label: '0.0% Swing High', color: '#94A3B8' },
            { y: 3.1, label: '38.2% Retracement', color: '#38BDF8' },
            { y: 1.8, label: '50.0% Equilibrium', color: '#FFD600' },
            { y: 0.5, label: '61.8% Golden Pocket', color: '#00FF88' },
            { y: -2.8, label: '100.0% Swing Low', color: '#94A3B8' },
          ].map((fib, idx) => (
            <mesh key={idx} position={[0, fib.y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[28, 55]} />
              <meshBasicMaterial
                color={fib.color}
                transparent
                opacity={idx === 3 ? 0.12 : 0.05}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* 5. Support & Resistance Structural Slabs */}
      {visibleIndicators.supportResistance && (
        <group>
          {/* Resistance Ceiling */}
          <mesh position={[0, 6.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[32, 60]} />
            <meshBasicMaterial
              color={themeSettings.bearColor}
              wireframe
              transparent
              opacity={0.18}
            />
          </mesh>
          {/* Support Platform */}
          <mesh position={[0, -5.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[32, 60]} />
            <meshBasicMaterial
              color={themeSettings.bullColor}
              wireframe
              transparent
              opacity={0.18}
            />
          </mesh>
        </group>
      )}

      {/* 6. MACD Volumetric Histogram */}
      {visibleIndicators.macd && (
        <group name="MACD_Histogram">
          {macdBars.map((b) => (
            <mesh key={b.id} position={[b.x, b.y, b.z]}>
              <boxGeometry args={[0.35, b.height, 0.8]} />
              <meshStandardMaterial
                color={b.isPositive ? themeSettings.bullColor : themeSettings.bearColor}
                emissive={b.isPositive ? themeSettings.bullColor : themeSettings.bearColor}
                emissiveIntensity={0.5}
                transparent
                opacity={0.85}
              />
            </mesh>
          ))}
        </group>
      )}

      {/* 7. RSI 3D Oscillation Tunnel Boundaries */}
      {visibleIndicators.rsi && (
        <group position={[9.5, -7.5, 0]}>
          {/* Overbought 70 Boundary */}
          <mesh position={[0, 1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4, 55]} />
            <meshBasicMaterial color="#FF1744" transparent opacity={0.15} />
          </mesh>
          {/* Neutral 50 Centerline */}
          <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4, 55]} />
            <meshBasicMaterial color="#38BDF8" transparent opacity={0.1} />
          </mesh>
          {/* Oversold 30 Boundary */}
          <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[4, 55]} />
            <meshBasicMaterial color="#00FF88" transparent opacity={0.15} />
          </mesh>
        </group>
      )}
    </group>
  );
}
