import React from 'react';
import { Database, Satellite, Map, Activity, Layers, Cpu } from 'lucide-react';
import MetallicPaintText from '../components/ReactBits/MetallicPaintText';
import AntigravityCard from '../components/ReactBits/AntigravityCard';

export default function Methodology() {
  const steps = [
    {
      title: "1. Dataset Acquisition",
      icon: <Database size={24} />,
      color: 'var(--color-secondary)',
      content: "The GIOS platform requires immense amounts of data. For live seismic tracking, we establish WebSocket or REST polling connections directly into the USGS National Water Information System and Earthquake APIs. For satellite intelligence, we query SpatioTemporal Asset Catalogs (STAC) from providers like Microsoft Planetary Computer or AWS Open Data to acquire Sentinel-2 and Landsat 8/9 imagery."
    },
    {
      title: "2. Real-Time Processing",
      icon: <Cpu size={24} />,
      color: 'var(--color-warning)',
      content: "Once geospatial or tabular data is ingested, standardizing is required. GeoJSON feeds are parsed via our React Engine. For satellite data, the GIOS Backend (FastAPI, Python) leverages libraries like 'xarray' and 'rioxarray' to perform on-the-fly cloud masking, atmospheric correction, and bounding-box cropping."
    },
    {
      title: "3. Spatial Intelligence Analytics",
      icon: <Layers size={24} />,
      color: 'var(--color-danger)',
      content: "Raw data is converted into actionable intelligence. For remote sensing, we calculate spectral indices dynamically: NDVI (Vegetation), NDWI (Water), and LST (Temperature). For seismic data, we analyze temporal clustering and magnitude-to-depth correlations to classify the active threat level associated with each event."
    },
    {
      title: "4. Accelerated Visualization",
      icon: <Activity size={24} />,
      color: 'var(--color-primary)',
      content: "To maintain a 60fps tech-forward dashboard, data is piped into high-performance visualizers. We utilize Leaflet with custom interactive overlays mapped onto CartoDB Dark Matter tiles. The data metrics are pushed to Chart.js instances and Three.js (WebGL) shaders for rendering 'Magic Bento' styled dashboards and 3D immersive views."
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-8 h-full flex flex-col gap-8 text-[#e0e6ed] w-full relative z-10 overflow-y-auto"
    >
      <header className="flex justify-between items-end border-b border-primary/20 pb-4 shrink-0">
        <div>
          <h1 className="text-4xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">
            Data <MetallicPaintText text="Methodology" />
          </h1>
          <p className="text-[#8b9bb4] mt-2 font-['Rajdhani'] text-lg">
            Analytics Pipeline & Architectural Processes
          </p>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto space-y-8 pb-12 w-full">
         <div className="glass-panel p-6 bg-accent/80 backdrop-blur-xl border border-white/5 rounded-xl text-center">
            <Satellite size={48} className="mx-auto mb-4 text-primary animate-pulse" />
            <p className="font-['Roboto_Mono'] text-sm leading-relaxed text-[#8b9bb4]">
               The GIOS Platform does not rely on static sample files. It is a live-streaming, dynamic intelligence tool. 
               The process of collecting, normalizing, and visualizing this data requires a robust pipeline connecting Earth Observation 
               satellites and global ground-sensor networks into the UI you see before you.
            </p>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map((step, idx) => (
                <AntigravityCard key={idx} intensity={10} className="h-full">
                    <div className="h-full glass-panel p-8 bg-accent/80 backdrop-blur-md border border-white/5 rounded-xl border-t-2 transition-colors duration-500" style={{ borderTopColor: step.color }}>
                        <div className="flex items-center gap-4 mb-4" style={{ color: step.color }}>
                            <div className="p-3 bg-black/40 rounded-lg border border-white/10 shadow-lg">
                                {step.icon}
                            </div>
                            <h2 className="text-xl font-['Orbitron'] font-bold tracking-widest text-white">{step.title}</h2>
                        </div>
                        <p className="font-['Rajdhani'] text-[#8b9bb4] leading-relaxed text-lg text-justify">
                            {step.content}
                        </p>
                    </div>
                </AntigravityCard>
            ))}
         </div>
      </div>
    </motion.div>
  );
}
