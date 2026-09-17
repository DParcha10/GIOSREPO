import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Balatro style floating cards/elements for a dynamic backdrop
// Uses instanced mesh for performance
export function FloatingCards({ count = 50 }) {
  const meshRef = useRef();
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Generate random data for position, rotation, speed, and color
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 20;
        const y = (Math.random() - 0.5) * 20;
        const z = (Math.random() - 0.5) * 10 - 5;
        const rotX = Math.random() * Math.PI;
        const rotY = Math.random() * Math.PI;
        const speed = Math.random() * 0.02 + 0.005;
        // GIOS Palette: Green, Blue, or Dark Panels
        const colors = ['var(--color-primary)', 'var(--color-secondary)', "#101828"];
        const color = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);
        temp.push({ x, y, z, rotX, rotY, speed, color });
    }
    return temp;
  }, [count]);

  const colorArray = useMemo(() => {
    const arr = new Float32Array(count * 3);
    particles.forEach((p, i) => {
        arr[i * 3] = p.color.r;
        arr[i * 3 + 1] = p.color.g;
        arr[i * 3 + 2] = p.color.b;
    });
    return arr;
  }, [particles, count]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    particles.forEach((particle, i) => {
        // Float upwards and rotate slowly
        let newY = particle.y + (time * particle.speed * 10);
        // Reset to bottom if it floats off screen
        if (newY > 15) newY = -15; 
        
        dummy.position.set(particle.x, newY, particle.z);
        dummy.rotation.set(
            particle.rotX + time * particle.speed, 
            particle.rotY + time * particle.speed, 
            0
        );
        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      {/* Rectangular "card" shapes */}
      <boxGeometry args={[1, 1.5, 0.05]}>
         <instancedBufferAttribute attach="attributes-color" args={[colorArray, 3]} />
      </boxGeometry>
      <meshStandardMaterial 
        vertexColors={true} 
        transparent={true} 
        opacity={0.3} 
        metalness={0.8}
        roughness={0.2}
      />
    </instancedMesh>
  );
}

export default function BalatroBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none bg-accent">
       <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={2} color='var(--color-primary)' />
          <pointLight position={[-10, -10, -10]} intensity={1} color='var(--color-secondary)' />
          <FloatingCards count={150} />
       </Canvas>
    </div>
  );
}
