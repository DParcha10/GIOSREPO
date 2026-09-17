import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// An immersive 3D Dome Gallery inspired by React Bits
export default function DomeGallery({ images }) {
  return (
    <div className="w-full h-full relative bg-black rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,255,170,0.1)] border border-primary/20">
      
      {/* HUD Overlay */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none text-white font-['Orbitron']">
         <h3 className="text-xl tracking-widest text-primary">Immersive Spatial Viewer</h3>
         <p className="font-['Roboto_Mono'] text-xs text-[#8b9bb4]">Drag to rotate. Scroll to zoom.</p>
      </div>

      <Canvas camera={{ position: [0, 0, 0.1], fov: 60 }}>
        <ambientLight intensity={1.5} />
        
        {/* The environment sphere */}
        <GallerySphere textures={images} />
        
        <OrbitControls 
            enableZoom={true} 
            enablePan={false} 
            enableDamping 
            dampingFactor={0.05}
            rotateSpeed={-0.4} // reversed so it feels like you're looking around inside
        />
      </Canvas>
    </div>
  );
}

function GallerySphere({ textures }) {
  const meshRef = useRef();
  // Load the first texture as the initial environment map
  // For a real application, you might map multiple textures onto specific sections 
  // or swap them dynamically. Here we apply an equirectangular projection onto the inside of a sphere.
  const texture = useTexture(textures[0] || 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/2294472375_24a3b8ef46_o.jpg');
  
  // Set texture mapping for inside-out viewing
  useEffect(() => {
    if (texture) {
      texture.mapping = THREE.EquirectangularReflectionMapping;
    }
  }, [texture]);

  // Slowly rotate the sphere automatically
  useFrame(() => {
    if (meshRef.current) {
        meshRef.current.rotation.y += 0.001;
    }
  });

  return (
    <mesh ref={meshRef} scale={[-100, 100, 100]}> 
      {/* 
         Scaling X by -1 flips the sphere inside out so we can see the texture 
         from the center properly mapped as a dome.
      */}
      <sphereGeometry args={[1, 64, 64]} />
      <meshBasicMaterial map={texture} side={THREE.DoubleSide} />
    </mesh>
  );
}
