import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Light Pillar Shader material for background
// Implemented off of React Bits concepts
const PillarMaterial = {
  uniforms: {
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color('var(--color-primary)') },
    uColor2: { value: new THREE.Color('var(--color-accent)') },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    // Simple noise function
    float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }
    
    void main() {
      // Create vertical glowing lines that slowly undulate
      float t = uTime * 0.2;
      
      // X-based frequencies for the pillars
      float p1 = sin(vWorldPosition.x * 0.5 + t);
      float p2 = sin(vWorldPosition.x * 2.0 - t * 1.5) * 0.5;
      
      // Combine and add vertical fade (brighter at bottom)
      float intensity = (p1 + p2) * 0.5 + 0.5;
      
      // Add noise to make the light look active/flickering
      float n = noise(vUv * vec2(20.0, 1.0) + vec2(0.0, uTime * 5.0)) * 0.1;
      
      // Focus the glow in the center vertically, fading out at top/bottom
      float mask = smoothstep(0.0, 0.4, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
      
      // Map to colors
      vec3 finalColor = mix(uColor2, uColor1, intensity * mask + n);
      
      // Make dark areas completely transparent for the grid to show through
      float alpha = smoothstep(0.1, 0.8, intensity * mask);
      
      gl_FragColor = vec4(finalColor, alpha * 0.4);
    }
  `
};

export function PillarPlane() {
  const meshRef = useRef();
  const { viewport } = useThree();
  
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color('var(--color-primary)') }, // GIOS Green
    uColor2: { value: new THREE.Color("#00d2ff") }, // GIOS Blue Accent
  }), []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.material.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Cover entire viewport */}
      <planeGeometry args={[viewport.width * 2, viewport.height * 2, 64, 64]} />
      <shaderMaterial 
        attach="material" 
        args={[PillarMaterial]} 
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export default function LightPillarBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
       {/* Background Grid overlay beneath the 3D canvas */}
       <div className="absolute inset-0 bg-accent bg-[linear-gradient(rgba(0,255,170,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,170,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
       
       {/* R3F Canvas for the volumetric light pillars */}
       <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
          <PillarPlane />
       </Canvas>
    </div>
  );
}
