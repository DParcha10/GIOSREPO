import React from 'react';
import { useLocation } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { PillarPlane } from './ReactBits/LightPillarBackground';
import { FloatingCards } from './ReactBits/BalatroBackground';
import AnimatedBackground from './AnimatedBackground';

export default function UnifiedBackground() {
  const location = useLocation();
  const isAnalytics = location.pathname === '/analytics';
  const isMap = location.pathname === '/map' || location.pathname.startsWith('/event/');

  return (
    <div className="fixed inset-0 z-0 pointer-events-none bg-transparent">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,170,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,170,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)] opacity-50" />
      
      {isMap ? (
        <AnimatedBackground />
      ) : (
        <Canvas 
          camera={{ position: [0, 0, 10], fov: 75 }}
          gl={{ 
              antialias: false,
              powerPreference: "high-performance",
              alpha: true,
              stencil: false,
              depth: false
          }}
          dpr={1}
        >
          {isAnalytics ? (
            <>
              <ambientLight intensity={0.5} />
              <pointLight position={[10, 10, 10]} intensity={2} color='var(--color-primary)' />
              <pointLight position={[-10, -10, -10]} intensity={1} color='var(--color-secondary)' />
              <FloatingCards count={60} />
            </>
          ) : (
            <PillarPlane />
          )}
        </Canvas>
      )}
    </div>
  );
}

