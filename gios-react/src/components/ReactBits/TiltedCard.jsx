import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * TiltedCard Component
 * Inspired by React Bits
 * A 3D parallax card that tilts based on mouse position.
 */
export default function TiltedCard({ 
  children, 
  className = "",
  caption = "",
  showCaption = false
}) {
  const cardRef = useRef(null);

  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const rotateX = useSpring(useTransform(y, [0, 1], [15, -15]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(x, [0, 1], [-15, 15]), { stiffness: 300, damping: 30 });

  function handleMouseMove(event) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    x.set(mouseX / width);
    y.set(mouseY / height);
  }

  function handleMouseLeave() {
    x.set(0.5);
    y.set(0.5);
  }

  return (
    <div className={`perspective-1000 ${className}`}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="w-full h-full relative"
      >
        <div className="w-full h-full glass-panel bg-accent/80 backdrop-blur-xl border border-white/5 rounded-xl overflow-hidden shadow-2xl transition-shadow duration-500 hover:shadow-primary/10">
          {children}
        </div>
        
        {showCaption && caption && (
          <div style={{ transform: "translateZ(50px)" }} className="absolute bottom-4 left-4 pointer-events-none">
             <p className="text-primary font-['Orbitron'] text-xs tracking-tighter bg-black/80 px-2 py-1 rounded">
                {caption}
             </p>
          </div>
        )}
        
        {/* Shine effect */}
        <motion.div 
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 group-hover:opacity-10"
          style={{
            background: `radial-gradient(circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.8), transparent 80%)`,
          }}
        />
      </motion.div>
    </div>
  );
}
