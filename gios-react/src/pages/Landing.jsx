import React from 'react';
import { Link } from 'react-router-dom';
import { Satellite, Globe, Activity, Database, Shield, Zap } from 'lucide-react';
import AnimatedBackground from '../components/AnimatedBackground';

export default function Landing() {
  return (
    <div className="min-h-screen bg-accent text-gray-200 font-sans relative overflow-x-hidden">
      
      {/* Background Elements */}
      <div className="absolute inset-0 z-0">
        <AnimatedBackground />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Navigation Bar */}
        <nav className="flex items-center justify-between px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-accent shadow-[0_0_15px_var(--color-primary-50)]">
              <Satellite size={24} />
            </div>
            <h1 className="text-2xl font-bold font-['Orbitron'] tracking-wider text-white">
              GIOS <span className="text-primary text-sm">v2.4</span>
            </h1>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-semibold tracking-wider font-['Rajdhani'] uppercase">
            <a href="#features" className="text-gray-400 hover:text-primary transition-colors">Features</a>
            <a href="#architecture" className="text-gray-400 hover:text-primary transition-colors">Architecture</a>
            <a href="#about" className="text-gray-400 hover:text-primary transition-colors">About</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-bold text-gray-300 hover:text-white uppercase tracking-wider font-['Rajdhani']">Sign In</Link>
            <Link to="/map" className="glass-button px-6 py-2.5 text-primary font-bold uppercase tracking-wider text-sm shadow-[0_0_20px_var(--color-primary-30)] border-primary/50">
              Launch Console
            </Link>
          </div>
        </nav>

        {/* Hero Section */}
        <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto mt-20 md:mt-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest mb-8 animate-pulse-slow">
            <Activity size={14} /> Active Monitoring Online
          </div>
          
          <h2 className="text-5xl md:text-7xl font-bold text-white font-['Orbitron'] leading-tight mb-6 tracking-wide drop-shadow-lg">
            Geospatial <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Intelligence</span> Engine
          </h2>
          
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mb-12 font-light leading-relaxed">
            The next-generation platform for real-time hazard detection, AI-driven spatial analytics, and autonomous drone telemetry routing.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 w-full justify-center">
            <Link to="/map" className="glass-button flex-1 sm:flex-none px-8 py-4 text-white bg-primary/20 hover:bg-primary/30 border-primary shadow-[0_0_30px_var(--color-primary-40)] rounded-xl text-lg font-bold font-['Rajdhani'] uppercase tracking-widest transition-all hover:scale-105">
              Access Live Map
            </Link>
            <a href="#features" className="glass-button flex-1 sm:flex-none px-8 py-4 text-gray-300 border-white/20 rounded-xl text-lg font-bold font-['Rajdhani'] uppercase tracking-widest hover:border-white/40 transition-all">
              Explore Features
            </a>
          </div>
        </main>

        {/* Feature Highlights */}
        <section id="features" className="w-full max-w-7xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-white font-['Orbitron'] uppercase tracking-widest mb-4">Core Capabilities</h3>
            <div className="w-24 h-1 bg-gradient-to-r from-primary to-secondary mx-auto rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-panel p-8 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center text-primary mb-6">
                <Globe size={24} />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Multi-Scale Spatial Engine</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Seamlessly fuse multi-spectral satellite imagery (Sentinel/Landsat) with localized drone orthomosaics for unparalleled ground-truth accuracy.
              </p>
            </div>
            
            <div className="glass-panel p-8 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 border border-secondary/30 flex items-center justify-center text-secondary mb-6">
                <Shield size={24} />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Predictive Hazard AI</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Advanced machine learning models predict subsurface seepage, harmful algal blooms, and structural fatigue before catastrophic failure occurs.
              </p>
            </div>
            
            <div className="glass-panel p-8 hover:-translate-y-2 transition-transform duration-300">
              <div className="w-12 h-12 rounded-lg bg-warning/10 border border-warning/30 flex items-center justify-center text-warning mb-6">
                <Zap size={24} />
              </div>
              <h4 className="text-xl font-bold text-white mb-3">Real-Time Telemetry</h4>
              <p className="text-gray-400 text-sm leading-relaxed">
                Direct integration with USGS stream gauges and IoT ground sensors. View live time-series data overlaying the geospatial canvas.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="w-full border-t border-white/10 mt-auto py-8 text-center text-gray-500 text-sm">
          <p className="mb-2">GIOS - Geospatial Intelligence Operating System</p>
          <p>Portfolio Showcase Build</p>
        </footer>

      </div>
    </div>
  );
}
