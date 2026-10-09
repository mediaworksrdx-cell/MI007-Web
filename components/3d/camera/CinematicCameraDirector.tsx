// ─── Cinematic Camera Director ───
// 12-Stage spline camera path, smooth damping, focal transitions, and scroll director
import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type CameraDirectorState =
  | 'BOOT'
  | 'HERO'
  | 'MARKET_ENTRY'
  | 'MARKET_FLIGHT'
  | 'CANDLE_NAVIGATION'
  | 'REGIME_ANALYSIS'
  | 'LIQUIDITY'
  | 'AI_CORE'
  | 'ENGINE_NETWORK'
  | 'TERMINAL'
  | 'ABOUT'
  | 'CONTACT';

export interface CameraWaypoint {
  state: CameraDirectorState;
  progress: number;
  pos: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov: number;
}

interface CinematicCameraDirectorProps {
  scrollProgress: number;
  targetFocusPoint?: THREE.Vector3 | null;
  isFreeOrbit?: boolean;
}

export default function CinematicCameraDirector({
  scrollProgress,
  targetFocusPoint,
  isFreeOrbit = false,
}: CinematicCameraDirectorProps) {
  // 12 Institutional Waypoints along the continuous financial world timeline
  const waypoints = useMemo<CameraWaypoint[]>(() => [
    // 00. BOOT / VIDEO TRANSITION (0.00 - 0.08)
    {
      state: 'BOOT',
      progress: 0.00,
      pos: new THREE.Vector3(0, 4.0, 26.0),
      lookAt: new THREE.Vector3(0, 4.0, 0),
      fov: 48,
    },
    // 01. HERO / BRAND REVELATION (0.08 - 0.16)
    {
      state: 'HERO',
      progress: 0.10,
      pos: new THREE.Vector3(0, 3.5, 20.0),
      lookAt: new THREE.Vector3(0, 3.8, 0),
      fov: 50,
    },
    // 02. MARKET ENTRY / PLUNGE (0.16 - 0.24)
    {
      state: 'MARKET_ENTRY',
      progress: 0.20,
      pos: new THREE.Vector3(0, 2.2, 12.0),
      lookAt: new THREE.Vector3(0, 1.8, 0),
      fov: 52,
    },
    // 03. MARKET FLIGHT (0.24 - 0.32)
    {
      state: 'MARKET_FLIGHT',
      progress: 0.28,
      pos: new THREE.Vector3(-3.5, 2.8, 6.0),
      lookAt: new THREE.Vector3(0.5, 1.2, -6.0),
      fov: 54,
    },
    // 04. CANDLE NAVIGATION / INFINITE AVENUE (0.32 - 0.44)
    {
      state: 'CANDLE_NAVIGATION',
      progress: 0.38,
      pos: new THREE.Vector3(0, 1.2, 2.5),
      lookAt: new THREE.Vector3(0, 1.5, -12.0),
      fov: 55,
    },
    // 05. REGIME ANALYSIS / BULL VS BEAR (0.44 - 0.54)
    {
      state: 'REGIME_ANALYSIS',
      progress: 0.50,
      pos: new THREE.Vector3(-4.8, 3.2, 0.5),
      lookAt: new THREE.Vector3(1.2, 1.8, -10.0),
      fov: 52,
    },
    // 06. VOLUMETRIC LIQUIDITY (0.54 - 0.64)
    {
      state: 'LIQUIDITY',
      progress: 0.60,
      pos: new THREE.Vector3(-7.5, 2.0, -8.0),
      lookAt: new THREE.Vector3(-4.0, 0, -16.0),
      fov: 52,
    },
    // 07. EIGHT ENGINES NETWORK (0.64 - 0.74)
    {
      state: 'ENGINE_NETWORK',
      progress: 0.70,
      pos: new THREE.Vector3(6.2, 5.0, -4.0),
      lookAt: new THREE.Vector3(0, 3.0, 0),
      fov: 56,
    },
    // 08. AI COMPUTATIONAL CORE (0.74 - 0.84)
    {
      state: 'AI_CORE',
      progress: 0.80,
      pos: new THREE.Vector3(0, 2.5, -14.0),
      lookAt: new THREE.Vector3(0, 0, -22.0),
      fov: 50,
    },
    // 09. SPATIAL TERMINAL (0.84 - 0.92)
    {
      state: 'TERMINAL',
      progress: 0.88,
      pos: new THREE.Vector3(0, 1.0, 1.5),
      lookAt: new THREE.Vector3(0, -1.5, -10.0),
      fov: 52,
    },
    // 10. ABOUT ARCHITECTURE (0.92 - 0.96)
    {
      state: 'ABOUT',
      progress: 0.94,
      pos: new THREE.Vector3(-3.2, 6.0, 8.0),
      lookAt: new THREE.Vector3(0, 1.0, -6.0),
      fov: 50,
    },
    // 11. FINAL CALM CONTACT / CTA (0.96 - 1.00)
    {
      state: 'CONTACT',
      progress: 1.00,
      pos: new THREE.Vector3(0, 4.2, 22.0),
      lookAt: new THREE.Vector3(0, 4.0, 0),
      fov: 46,
    },
  ], []);

  useFrame((state) => {
    if (isFreeOrbit) return;

    // Overriding target focus point if user clicked an instrument or engine
    if (targetFocusPoint) {
      const desiredPos = new THREE.Vector3()
        .copy(targetFocusPoint)
        .add(new THREE.Vector3(0, 1.5, 6.0));
      state.camera.position.lerp(desiredPos, 0.06);
      state.camera.lookAt(targetFocusPoint);
      return;
    }

    // Normal scroll progression
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

    // Smooth cubic bezier easing
    const easeT = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const targetPos = new THREE.Vector3().copy(p0.pos).lerp(p1.pos, easeT);
    const targetLookAt = new THREE.Vector3().copy(p0.lookAt).lerp(p1.lookAt, easeT);

    // Apply gentle mouse cursor parallax
    const ptrX = state.pointer.x * 0.5;
    const ptrY = state.pointer.y * 0.3;
    targetPos.x += ptrX;
    targetPos.y += ptrY;

    // Smooth inertia interpolation
    state.camera.position.lerp(targetPos, 0.07);

    const currentQuat = state.camera.quaternion.clone();
    state.camera.lookAt(targetLookAt);
    const targetQuat = state.camera.quaternion.clone();
    state.camera.quaternion.copy(currentQuat).slerp(targetQuat, 0.07);
  });

  return null;
}
