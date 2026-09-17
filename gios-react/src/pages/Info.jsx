import React from 'react';
import { motion } from 'framer-motion';
import { Info as InfoIcon, Database, HardDrive, Cpu } from 'lucide-react';
import MetallicPaintText from '../components/ReactBits/MetallicPaintText';
import DomeGallery from '../components/ReactBits/DomeGallery';
import AntigravityCard from '../components/ReactBits/AntigravityCard';

export default function Info() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-8 h-full flex flex-col gap-8 text-[#e0e6ed] w-full relative z-10"
    >
      <header className="flex justify-between items-end border-b border-primary/20 pb-4">
        <div>
          <h1 className="text-4xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">
            Platform <MetallicPaintText text="Information" />
          </h1>
          <p className="text-[#8b9bb4] mt-2 font-['Rajdhani'] text-lg">
            System Specifications & Immersive Project Imagery
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          {/* Hardware / Architecture Specs */}
          <div className="glass-panel p-6 flex flex-col gap-6 bg-accent/80 backdrop-blur-md rounded-xl">
             <h2 className="text-2xl font-['Orbitron'] border-b border-secondary/20 pb-2 text-secondary flex items-center gap-3">
                <InfoIcon />
                Architecture
             </h2>

             <AntigravityCard intensity={10}>
                <div className="p-4 bg-black/40 border border-white/10 rounded-lg flex items-center gap-4 group">
                    <Database className="text-primary group-hover:scale-110 transition-transform" />
                    <div>
                        <h4 className="text-white font-['Rajdhani'] uppercase tracking-widest text-sm">Data Ingestion</h4>
                        <p className="text-[#8b9bb4] font-['Roboto_Mono'] text-xs mt-1">USGS REST APIs, Real-time WebSockets</p>
                    </div>
                </div>
             </AntigravityCard>

             <AntigravityCard intensity={10}>
             <div className="p-4 bg-black/40 border border-white/10 rounded-lg flex items-center gap-4 group">
                 <Cpu className="text-warning group-hover:scale-110 transition-transform" />
                 <div>
                     <h4 className="text-white font-['Rajdhani'] uppercase tracking-widest text-sm">Processing Core</h4>
                     <p className="text-[#8b9bb4] font-['Roboto_Mono'] text-xs mt-1">Vite + React 18, WebGL / Three.js Shaders</p>
                 </div>
             </div>
             </AntigravityCard>

             <AntigravityCard intensity={10}>
             <div className="p-4 bg-black/40 border border-white/10 rounded-lg flex items-center gap-4 group">
                 <HardDrive className="text-danger group-hover:scale-110 transition-transform" />
                 <div>
                     <h4 className="text-white font-['Rajdhani'] uppercase tracking-widest text-sm">Graphics Engine</h4>
                     <p className="text-[#8b9bb4] font-['Roboto_Mono'] text-xs mt-1">Framer Motion, React Spring, React Bits</p>
                 </div>
             </div>
             </AntigravityCard>
          </div>

          {/* Dome Gallery (Spans 2 columns) */}
          <div className="lg:col-span-2 relative min-h-[500px]">
             {/* 
                 Passing in an equirectangular image mapping (NASA / public domain) 
                 to act as our 360 viewer environment for the "Dome Gallery".
             */}
             <DomeGallery images={['https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop']} />
          </div>
      </div>
    </motion.div>
  );
}
