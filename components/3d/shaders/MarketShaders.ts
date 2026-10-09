// ─── Custom GLSL Shaders for MI007 Spatial Financial Intelligence Platform ───
import * as THREE from 'three';

export const TerrainShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uVolatility;
    uniform float uTrend;
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormalVec;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Procedural financial terrain wave computation
      float wave1 = sin(pos.x * 0.12 + uTime * 0.4) * cos(pos.z * 0.08 + uTime * 0.25) * 2.2;
      float wave2 = sin(pos.x * 0.25 - uTime * 0.3) * 0.8 * uVolatility;
      float ridge = abs(sin(pos.z * 0.15 + pos.x * 0.05)) * 1.5;
      float trendSlope = (pos.x * 0.05) * uTrend;

      pos.y += wave1 + wave2 + ridge + trendSlope;
      vElevation = pos.y;
      vNormalVec = normal;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  fragmentShader: `
    uniform vec3 uColorBase;
    uniform vec3 uColorPeak;
    uniform vec3 uColorValley;
    uniform vec3 uColorGrid;
    uniform float uOpacity;
    varying vec2 vUv;
    varying float vElevation;
    varying vec3 vNormalVec;

    void main() {
      // Elevation-based financial gradient
      float normElev = clamp((vElevation + 4.0) / 10.0, 0.0, 1.0);
      vec3 col = mix(uColorValley, uColorBase, smoothstep(0.0, 0.5, normElev));
      col = mix(col, uColorPeak, smoothstep(0.5, 1.0, normElev));

      // Subtle scientific grid overlay
      vec2 grid = abs(fract(vUv * 60.0 - 0.5) - 0.5) / fwidth(vUv * 60.0);
      float line = min(grid.x, grid.y);
      float gridVal = 1.0 - min(line, 1.0);

      col = mix(col, uColorGrid, gridVal * 0.22);

      gl_FragColor = vec4(col, uOpacity);
    }
  `,
};

export const VolumetricLiquidityShader = {
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uLiquidityColor;
    uniform float uAbsorptionDensity;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      // Flowing volumetric liquidity stream lines
      float flow = sin(vWorldPos.y * 1.8 - uTime * 2.2 + vWorldPos.x * 0.6);
      float pulse = sin(uTime * 1.5 + vUv.y * 8.0) * 0.5 + 0.5;
      float alpha = smoothstep(0.1, 0.9, abs(flow)) * uAbsorptionDensity * (0.35 + pulse * 0.25);
      
      // Vertical boundary glow
      float edgeGlow = pow(1.0 - abs(vUv.x - 0.5) * 2.0, 2.0);
      alpha *= edgeGlow;

      gl_FragColor = vec4(uLiquidityColor, clamp(alpha, 0.0, 0.85));
    }
  `,
};

export const OrderFlowParticleShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uSpeed;
    attribute float aSize;
    attribute float aVelocity;
    attribute float aSide; // 1.0 = Buy Ask, -1.0 = Sell Bid
    varying float vSide;
    varying float vAlpha;

    void main() {
      vSide = aSide;
      vec3 pos = position;

      // Particle directional travel along time-price manifold
      float t = mod(uTime * uSpeed * aVelocity + pos.x * 0.08, 1.0);
      pos.z += (t - 0.5) * 45.0 * (aSide > 0.0 ? 1.0 : -1.0);
      pos.y += sin(pos.z * 0.2 + uTime) * 0.4;

      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = aSize * (180.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;

      vAlpha = smoothstep(0.0, 0.2, t) * smoothstep(1.0, 0.7, t);
    }
  `,
  fragmentShader: `
    uniform vec3 uBuyColor;
    uniform vec3 uSellColor;
    varying float vSide;
    varying float vAlpha;

    void main() {
      // Circular anti-aliased particle disc
      float dist = length(gl_PointCoord - vec2(0.5));
      if (dist > 0.5) discard;

      float radial = 1.0 - smoothstep(0.25, 0.5, dist);
      vec3 color = vSide > 0.0 ? uBuyColor : uSellColor;

      gl_FragColor = vec4(color, radial * vAlpha * 0.9);
    }
  `,
};

export const NeuralStreamShader = {
  vertexShader: `
    uniform float uTime;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      vUv = uv;
      vPosition = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uPulseColor;
    varying vec2 vUv;
    varying vec3 vPosition;

    void main() {
      // High-frequency neural computation pulse travelling through computational tensor tubes
      float pulse = fract(vUv.x * 4.0 - uTime * 1.8);
      float intensity = pow(pulse, 5.0) * 2.5;
      float core = 1.0 - abs(vUv.y - 0.5) * 2.0;

      vec3 col = uPulseColor * (intensity + 0.2) * core;
      gl_FragColor = vec4(col, clamp(core * (intensity + 0.35), 0.0, 1.0));
    }
  `,
};
