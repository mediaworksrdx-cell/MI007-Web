'use client';

import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect } from 'react';

export default function PostProcessing() {
  const { gl } = useThree();

  useEffect(() => {
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.2;
  }, [gl]);

  return null;
}
