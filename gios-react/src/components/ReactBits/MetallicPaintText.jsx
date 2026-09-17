import React from 'react';
import { motion } from 'framer-motion';

export default function MetallicPaintText({ text, glow = 'var(--color-primary)', className = "" }) {
  // A sleek CSS-based metallic reflection that mimics the React Bits shader approach 
  // without needing a heavy Three.js canvas for every single header text.
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`relative inline-block ${className}`}
    >
        {/* Glow Layer Behind */}
        <span 
          className="absolute inset-0 blur-[10px] opacity-40 select-none z-0 mix-blend-screen"
          style={{ color: glow, textShadow: `0 0 20px ${glow}` }}
        >
            {text}
        </span>
        
        {/* Front Metallic Text */}
        <span className="relative z-10 font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-[#8b9bb4] to-white bg-[length:200%_auto] animate-[shine_3s_linear_infinite]"
              style={{ paddingBottom: '2px' }}
        >
            {text}
        </span>

        {/* CSS Animation defined globally or injected here */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shine {
            to {
              background-position: 200% center;
            }
          }
        `}} />
    </motion.div>
  );
}
