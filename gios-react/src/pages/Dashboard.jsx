import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, MapPin, Globe } from 'lucide-react';
import axios from 'axios';
import MetallicPaintText from '../components/ReactBits/MetallicPaintText';
import AntigravityCard from '../components/ReactBits/AntigravityCard';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalQuakes: 0,
    maxMag: 0,
    recent: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchQuakeData = async () => {
    try {
      const res = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson');
      const features = res.data.features;
      const mags = features.map(f => f.properties.mag).filter(m => m !== null);
      const maxMag = mags.length > 0 ? Math.max(...mags).toFixed(1) : 0;
      
      setStats({
        totalQuakes: features.length,
        maxMag: maxMag,
        recent: features.slice(0, 8),
      });
      setLoading(false);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchQuakeData();
    const interval = setInterval(fetchQuakeData, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-8 h-full flex flex-col gap-8 text-[#e0e6ed] w-full relative z-10"
    >
      <header className="glass-panel p-6 flex justify-between items-end shrink-0 mb-4 bg-white/5">
        <div>
          <h1 className="text-4xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">
            Platform <MetallicPaintText text="Telemetry" />
          </h1>
          <p className="text-[#8b9bb4] mt-2 font-['Rajdhani'] text-lg">
            Real-time Environmental Risk & Seismic Data Streaming Feed
          </p>
        </div>
        <div className="glass-button px-4 py-2 text-secondary font-mono pointer-events-none">
          <Globe size={18} className="animate-pulse" />
          <span>Global Monitoring Active</span>
        </div>
      </header>

      {/* Magic Bento Grid Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-6">
        
        {/* Bento Box 1: Total Events (Large Span) */}
        <div className="md:col-span-2 md:row-span-1">
            <AntigravityCard intensity={15} className="h-full w-full">
                <StatCard 
                    title="Total Events (Past Hour)" 
                    value={loading ? "--" : stats.totalQuakes} 
                    icon={<Activity />} 
                    color='var(--color-primary)' 
                />
            </AntigravityCard>
        </div>

        {/* Bento Box 2: Max Magnitude */}
        <div className="md:col-span-1 md:row-span-1">
            <AntigravityCard intensity={25} className="h-full w-full">
                <StatCard 
                    title="Highest Magnitude" 
                    value={loading ? "--" : stats.maxMag} 
                    icon={<AlertTriangle />} 
                    color='var(--color-danger)' 
                />
            </AntigravityCard>
        </div>

        {/* Bento Box 3: Active Sensors */}
        <div className="md:col-span-1 md:row-span-1">
            <AntigravityCard intensity={25} className="h-full w-full">
                <StatCard 
                    title="Active Sensors" 
                    value="9,400+" 
                    icon={<MapPin />} 
                    color="#00d2ff" 
                />
            </AntigravityCard>
        </div>

        {/* Bento Box 4: Live Event Log (Spans Bottom 2 rows) */}
        <div className="md:col-span-4 md:row-span-2">
            <AntigravityCard intensity={5} className="h-full w-full">
                <div className="h-full glass-panel p-6 flex flex-col bg-white/5">
                    <h2 className="text-xl font-['Orbitron'] border-b border-primary/20 pb-3 mb-4 flex items-center gap-3 text-primary">
                    <Activity size={20} />
                    Live Event Log
                    </h2>
                    
                    <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 gap-4 font-['Roboto_Mono'] text-sm">
                    {loading ? (
                        <div className="col-span-2 text-center text-[#8b9bb4] mt-10 animate-pulse">Establishing secure link... downloading telemetry...</div>
                    ) : stats.recent.length === 0 ? (
                        <div className="col-span-2 text-center text-[#8b9bb4] mt-10">No significant events detected in the past hour.</div>
                    ) : (
                        stats.recent.map((quake, i) => (
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.05 }}
                            key={quake.id} 
                            onClick={() => navigate(`/event/${quake.id}`)}
                            className="glass-panel cursor-pointer !border-l-4 !border-l-danger !border-y-0 !border-r-0 hover:!border-l-primary flex justify-between items-center group bg-white/5 p-4"
                        >
                            <div className="truncate pr-4">
                            <span className="text-[#8b9bb4] block text-xs mb-1">
                                {new Date(quake.properties.time).toLocaleTimeString()}
                            </span>
                            <span className="text-white text-base truncate block">{quake.properties.place}</span>
                            </div>
                            <div className="text-right flex-shrink-0">
                            <MetallicPaintText 
                                text={`M ${quake.properties.mag?.toFixed(1) || 'N/A'}`} 
                                glow='var(--color-danger)' 
                                className="text-3xl font-bold" 
                            />
                            </div>
                        </motion.div>
                        ))
                    )}
                    </div>
                </div>
            </AntigravityCard>
        </div>

      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon, color }) {
  return (
    <div className="h-full w-full glass-panel p-6 relative overflow-hidden group bg-white/5">
      <div 
        className="absolute -right-4 -top-4 opacity-10 group-hover:opacity-30 group-hover:scale-125 transition-all duration-700 blur-[2px]"
        style={{ color: color }}
      >
        {React.cloneElement(icon, { size: 120 })}
      </div>
      <h3 className="text-[#8b9bb4] font-['Rajdhani'] uppercase tracking-widest text-sm mb-4 font-bold relative z-10 w-full border-b border-white/10 pb-2">
        {title}
      </h3>
      <div className="relative z-10 flex items-center justify-between mt-6">
        <MetallicPaintText 
            text={value} 
            glow={color} 
            className="text-6xl font-['Orbitron'] font-bold" 
        />
        <div className="p-3 rounded-full bg-white/5 border border-white/10" style={{ color: color }}>
            {React.cloneElement(icon, { size: 24 })}
        </div>
      </div>
    </div>
  );
}
