import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function pseudoRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Balatro style floating cards/elements for a dynamic backdrop
// Uses instanced mesh for performance
export function FloatingCards({ count = 50 }) {
  const meshRef = useRef();
  
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  // Generate deterministic data for position, rotation, speed, and color
  const particles = useMemo(() => {
    const temp = [];
    const colors = ['var(--color-primary)', 'var(--color-secondary)', "#101828"];
    for (let i = 0; i < count; i++) {
        const r1 = pseudoRandom(i * 7 + 1);
        const r2 = pseudoRandom(i * 13 + 3);
        const r3 = pseudoRandom(i * 19 + 5);
        const r4 = pseudoRandom(i * 23 + 7);
        const r5 = pseudoRandom(i * 29 + 11);
        const r6 = pseudoRandom(i * 31 + 13);
        const x = (r1 - 0.5) * 20;
        const y = (r2 - 0.5) * 20;
        const z = (r3 - 0.5) * 10 - 5;
        const rotX = r4 * Math.PI;
        const rotY = r5 * Math.PI;
        const speed = r6 * 0.02 + 0.005;
        const color = new THREE.Color(colors[Math.floor(r1 * colors.length)]);
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
