// ─── Spatial Financial Intelligence Engine Canvas ───
// Central GPU-accelerated spatial operating environment for MI007
'use client';

import React, { Suspense, useState, useMemo, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAppTheme } from '@/lib/themeContext';
import { getTheme3DSettings } from './Theme3DAdapter';
import { detectQualityProfile } from './PerformanceManager';

// 3D Spatial Modules
import CinematicCameraDirector, { CameraDirectorState } from '../camera/CinematicCameraDirector';
import MarketTerrain from '../market/MarketTerrain';
import ProceduralCandleEngine, { SpatialCandle } from '../market/ProceduralCandleEngine';
import SpatialTechnicalAnalysis from '../indicators/SpatialTechnicalAnalysis';
import VolumetricLiquidityEngine, { LiquidityPoolInfo } from '../liquidity/VolumetricLiquidityEngine';
import OrderFlowField from '../orderflow/OrderFlowField';
import MarketRegimeSimulation, { MarketRegimeType } from '../regime/MarketRegimeSimulation';
import AICoreComputationalWorld, { ComputationalLayerInfo } from '../intelligence/AICoreComputationalWorld';
import AIReasoningPathway, { ReasoningStageInfo } from '../intelligence/AIReasoningPathway';
import AISignalPhysics, { MarketSignalObject } from '../intelligence/AISignalPhysics';
import EightEnginesNetwork, { SpatialEngineModule } from '../engines/EightEnginesNetwork';
import SpatialTerminalEnvironment from '../terminal/SpatialTerminalEnvironment';
import Brand3DSystem from '../logos/Brand3DSystem';
import CinematicVideoTransformer from '../opening/CinematicVideoTransformer';
import SpatialFlightHUD from '../ui/SpatialFlightHUD';

interface SpatialEngineCanvasProps {
  scrollProgress: number;
}

export default function SpatialEngineCanvas({ scrollProgress }: SpatialEngineCanvasProps) {
  const { theme } = useAppTheme();
  const themeSettings = useMemo(() => getTheme3DSettings(theme), [theme]);
  const quality = useMemo(() => detectQualityProfile(), []);

  // Spatial HUD Interactive States
  const [selectedCandle, setSelectedCandle] = useState<SpatialCandle | null>(null);
  const [selectedPool, setSelectedPool] = useState<LiquidityPoolInfo | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<SpatialEngineModule | null>(null);
  const [selectedSignal, setSelectedSignal] = useState<MarketSignalObject | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<ComputationalLayerInfo | null>(null);
  const [selectedStage, setSelectedStage] = useState<ReasoningStageInfo | null>(null);

  // Camera Flight State
  const [isFreeOrbit, setIsFreeOrbit] = useState(false);
  const [targetFocusPoint, setTargetFocusPoint] = useState<THREE.Vector3 | null>(null);

  // Temporal Market Replay State
  const [replayProgress, setReplayProgress] = useState(1.0);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState(1);

  // Replay frame timer
  useEffect(() => {
    if (!isPlayingReplay) return;
    const interval = setInterval(() => {
      setReplayProgress((prev) => {
        const next = prev + 0.005 * replaySpeed;
        return next > 1.0 ? 0.1 : next;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [isPlayingReplay, replaySpeed]);

  // Compute Active Camera State from Scroll Progress
  const cameraState = useMemo<CameraDirectorState>(() => {
    if (scrollProgress < 0.08) return 'BOOT';
    if (scrollProgress < 0.16) return 'HERO';
    if (scrollProgress < 0.24) return 'MARKET_ENTRY';
    if (scrollProgress < 0.34) return 'MARKET_FLIGHT';
    if (scrollProgress < 0.44) return 'CANDLE_NAVIGATION';
    if (scrollProgress < 0.54) return 'REGIME_ANALYSIS';
    if (scrollProgress < 0.64) return 'LIQUIDITY';
    if (scrollProgress < 0.74) return 'ENGINE_NETWORK';
    if (scrollProgress < 0.84) return 'AI_CORE';
    if (scrollProgress < 0.92) return 'TERMINAL';
    if (scrollProgress < 0.96) return 'ABOUT';
    return 'CONTACT';
  }, [scrollProgress]);

  // Spatial Instrument Search Focus
  const handleSearchSelect = (symbol: string) => {
    if (symbol.includes('NIFTY')) {
      setTargetFocusPoint(new THREE.Vector3(-4, 0, -6));
    } else if (symbol.includes('S&P')) {
      setTargetFocusPoint(new THREE.Vector3(2, 2, 4));
    } else if (symbol.includes('BTC')) {
      setTargetFocusPoint(new THREE.Vector3(0, -2, 12));
    } else {
      setTargetFocusPoint(new THREE.Vector3(0, 0, 0));
    }
    setTimeout(() => setTargetFocusPoint(null), 4000);
  };

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-auto z-0 overflow-hidden">
      {/* 3D WebGL / WebGPU Canvas */}
      <Canvas
        camera={{ position: [0, 4.0, 24.0], fov: 50, near: 0.1, far: 250 }}
        dpr={quality.dpr}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        className="w-full h-full select-none"
      >
        <Suspense fallback={null}>
          {/* Dynamic Theme Atmospheric Fog & Lighting */}
          <fog attach="fog" args={[themeSettings.fogColor, themeSettings.fogNear, themeSettings.fogFar]} />
          <ambientLight intensity={themeSettings.ambientIntensity} color={themeSettings.ambientColor} />
          
          <directionalLight
            position={[10, 30, 20]}
            intensity={themeSettings.keyLightIntensity}
            color={themeSettings.keyLightColor}
            castShadow={quality.useShadows}
          />
          <directionalLight
            position={[-15, 10, -10]}
            intensity={themeSettings.fillLightIntensity}
            color={themeSettings.fillLightColor}
          />

          {/* Camera Rig & Orbit Controls */}
          {isFreeOrbit ? (
            <OrbitControls enableDamping dampingFactor={0.08} maxDistance={60} minDistance={4} />
          ) : (
            <CinematicCameraDirector
              scrollProgress={scrollProgress}
              targetFocusPoint={targetFocusPoint}
              isFreeOrbit={isFreeOrbit}
            />
          )}

          {/* 01. Opening Cinematic Video Dissolve Particles */}
          <CinematicVideoTransformer
            scrollProgress={scrollProgress}
            themeSettings={themeSettings}
          />

          {/* 02. MI007 3D Brand Medallion */}
          <Brand3DSystem
            themeSettings={themeSettings}
            position={[0, 9.5, 0]}
          />

          {/* 03. Procedural Scientific Market Terrain */}
          <MarketTerrain
            themeSettings={themeSettings}
            volatility={1.1}
            trend={0.6}
          />

          {/* 04. Genuine 3D Candlesticks (Infinite Candlestick Avenue) */}
          <ProceduralCandleEngine
            themeSettings={themeSettings}
            onSelectCandle={setSelectedCandle}
            replayProgress={replayProgress}
          />

          {/* 05. Advanced 3D Technical Indicators */}
          <SpatialTechnicalAnalysis themeSettings={themeSettings} />

          {/* 06. Volumetric Liquidity Walls & Pools */}
          <VolumetricLiquidityEngine
            themeSettings={themeSettings}
            onSelectPool={setSelectedPool}
          />

          {/* 07. Directional Order-Flow Field */}
          <OrderFlowField
            themeSettings={themeSettings}
            intensity={quality.orderFlowDensity}
          />

          {/* 08. Institutional Market Regime Simulation */}
          <MarketRegimeSimulation
            themeSettings={themeSettings}
            currentRegime="ACCUMULATION"
          />

          {/* 09. 8 Intelligence Engines Network */}
          <EightEnginesNetwork
            themeSettings={themeSettings}
            onSelectEngine={setSelectedEngine}
          />

          {/* 10. AI Core Computational Machine (9 Layers) */}
          <AICoreComputationalWorld
            themeSettings={themeSettings}
            onSelectLayer={setSelectedLayer}
          />

          {/* 11. AI Visible Reasoning Pathway */}
          <AIReasoningPathway
            themeSettings={themeSettings}
            onSelectStage={setSelectedStage}
          />

          {/* 12. AI Signal Physics Instruments */}
          <AISignalPhysics
            themeSettings={themeSettings}
            onSelectSignal={setSelectedSignal}
          />

          {/* 13. Spatial Command Terminal */}
          <SpatialTerminalEnvironment
            themeSettings={themeSettings}
            onSelectSymbol={(sym) => handleSearchSelect(sym)}
          />
        </Suspense>
      </Canvas>

      {/* Spatial Flight HUD Telemetry Overlay */}
      <SpatialFlightHUD
        scrollProgress={scrollProgress}
        cameraState={cameraState}
        selectedCandle={selectedCandle}
        selectedPool={selectedPool}
        selectedEngine={selectedEngine}
        selectedSignal={selectedSignal}
        selectedLayer={selectedLayer}
        selectedStage={selectedStage}
        isFreeOrbit={isFreeOrbit}
        onToggleFreeOrbit={() => setIsFreeOrbit(!isFreeOrbit)}
        replayProgress={replayProgress}
        onReplayChange={setReplayProgress}
        isPlayingReplay={isPlayingReplay}
        onTogglePlayReplay={() => setIsPlayingReplay(!isPlayingReplay)}
        replaySpeed={replaySpeed}
        onSetReplaySpeed={setReplaySpeed}
        onSearchSelect={handleSearchSelect}
      />
    </div>
  );
}
