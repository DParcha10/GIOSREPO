import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const OrganicTerrain = () => {
  const meshRef = useRef();

  // Create a plane geometry and displace its vertices to make it organic
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(20, 20, 64, 64);
    geo.rotateX(-Math.PI / 2); // Lay flat
    
    // Add some noise to the vertices to create organic hills
    const position = geo.attributes.position;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i);
      const z = position.getZ(i);
      // Simple pseudo-noise based on sine waves
      const y = Math.sin(x * 0.5) * Math.cos(z * 0.5) * 1.5;
      position.setY(i, y);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.5;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} position={[0, -2, 0]}>
      <meshStandardMaterial 
        color="#153023" // deep moss green
        wireframe={true} 
        transparent={true} 
        opacity={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

const AmbientBackground = () => {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: -1 }}>
      <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} color="#73c8a9" />
        <fog attach="fog" args={['#0f1c15', 5, 20]} />
        <OrganicTerrain />
      </Canvas>
    </div>
  );
};

export default AmbientBackground;
