import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export default function AntigravityCard({ children, intensity = 20, className = "" }) {
  const ref = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 150, mass: 0.5 };
  const rotateX = useSpring(useMotionValue(0), springConfig);
  const rotateY = useSpring(useMotionValue(0), springConfig);

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Calculate distance from center (-1 to 1)
    const x = (e.clientX - centerX) / (rect.width / 2);
    const y = (e.clientY - centerY) / (rect.height / 2);

    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
    
    // Rotate away from mouse for "antigravity" push effect
    rotateX.set(y * -intensity);
    rotateY.set(x * intensity);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      className={`relative rounded-xl transition-all duration-300 ${isHovered ? 'z-50 scale-[1.02] shadow-[0_20px_40px_rgba(0,0,0,0.5)]' : 'z-0'} ${className}`}
    >
      {/* Inner hover glow spotlight effect */}
      {isHovered && (
        <motion.div
          className="pointer-events-none absolute -inset-px rounded-xl opacity-50 mix-blend-screen"
          style={{
            background: `radial-gradient(400px circle at var(--mouse-x) var(--mouse-y), rgba(0, 255, 170, 0.4), transparent 40%)`,
          }}
          onUpdate={() => {
            if (ref.current) {
              ref.current.style.setProperty('--mouse-x', `${mouseX.get()}px`);
              ref.current.style.setProperty('--mouse-y', `${mouseY.get()}px`);
            }
          }}
        />
      )}
      
      {/* The actual content */}
      <div style={{ transform: "translateZ(30px)" }}>
         {children}
      </div>
    </motion.div>
  );
}
