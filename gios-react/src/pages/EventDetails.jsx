import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Activity, MapPin, AlertTriangle, AlertCircle, Waves, Users } from 'lucide-react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import MetallicPaintText from '../components/ReactBits/MetallicPaintText';
import AntigravityCard from '../components/ReactBits/AntigravityCard';

export default function EventDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [eventData, setEventData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // USGS provides a detail endpoint using the event ID
    axios.get(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/detail/${id}.geojson`)
      .then(res => {
        setEventData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching event details", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center pointer-events-none z-10 relative">
         <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
         <p className="mt-4 text-primary font-['Roboto_Mono'] animate-pulse text-sm uppercase tracking-widest">Acquiring detailed telemetry...</p>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="p-8 h-full flex flex-col text-[#e0e6ed] w-full relative z-10">
         <h1 className="text-3xl font-['Orbitron'] text-danger">Data Corrupted or Not Found</h1>
         <button onClick={() => navigate('/dashboard')} className="mt-4 text-primary flex items-center gap-2 hover:underline font-['Roboto_Mono']">
            <ArrowLeft size={16} /> Return to Dashboard
         </button>
      </div>
    );
  }

  const props = eventData.properties;
  const coords = eventData.geometry.coordinates; // [lon, lat, depth]
  const color = props.mag > 5 ? 'var(--color-danger)' : props.mag > 2.5 ? 'var(--color-warning)' : 'var(--color-primary)';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-8 h-full flex flex-col gap-6 text-[#e0e6ed] w-full relative z-10 overflow-y-auto"
    >
      <header className="flex justify-between items-center border-b border-primary/20 pb-4">
        <div>
          <button onClick={() => navigate('/dashboard')} className="text-[#8b9bb4] hover:text-primary flex items-center gap-2 mb-2 font-['Roboto_Mono'] text-sm transition-colors">
            <ArrowLeft size={16} /> Return to Telemetry
          </button>
          <h1 className="text-4xl font-['Orbitron'] font-bold text-white tracking-widest uppercase">
            Singular <MetallicPaintText text="Event Analysis" glow={color} />
          </h1>
        </div>
        <div className="text-right">
            <p className="text-[#8b9bb4] font-['Rajdhani'] text-lg">{props.place}</p>
            <p className="text-primary font-['Roboto_Mono'] text-sm">{new Date(props.time).toLocaleString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Column: Metadata Cards */}
        <div className="flex flex-col gap-6">
            <AntigravityCard intensity={10}>
                <div className="glass-panel p-6 bg-accent/80 backdrop-blur-xl border border-white/5 rounded-xl flex items-center justify-between">
                    <div>
                        <h3 className="text-[#8b9bb4] font-['Rajdhani'] uppercase tracking-widest text-sm mb-1">Magnitude (M)</h3>
                        <div className="text-5xl font-['Orbitron'] font-bold" style={{ color: color }}>
                            {props.mag?.toFixed(1)}
                        </div>
                    </div>
                    <Activity size={48} className="opacity-20" style={{ color: color }} />
                </div>
            </AntigravityCard>

            <AntigravityCard intensity={10}>
                <div className="glass-panel p-6 bg-accent/80 backdrop-blur-xl border border-white/5 rounded-xl flex items-center justify-between">
                    <div>
                        <h3 className="text-[#8b9bb4] font-['Rajdhani'] uppercase tracking-widest text-sm mb-1">Hypocenter Depth</h3>
                        <div className="text-4xl font-['Orbitron'] font-bold text-secondary">
                            {coords[2]?.toFixed(1)} <span className="text-lg text-[#8b9bb4]">km</span>
                        </div>
                    </div>
                    <MapPin size={48} className="text-secondary opacity-20" />
                </div>
            </AntigravityCard>
            
            <div className="glass-panel p-6 bg-accent/80 backdrop-blur-xl border border-white/5 rounded-xl space-y-4 font-['Roboto_Mono'] text-sm">
                <h3 className="text-primary font-['Orbitron'] uppercase tracking-widest text-sm border-b border-primary/20 pb-2 mb-3">Event Metadata</h3>
                <div className="flex justify-between">
                    <span className="text-[#8b9bb4] flex items-center gap-2"><AlertCircle size={14}/> Status</span>
                    <span className="text-white uppercase">{props.status}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#8b9bb4] flex items-center gap-2"><Waves size={14}/> Tsunami Warning</span>
                    <span className={props.tsunami ? "text-danger animate-pulse font-bold" : "text-white"}>{props.tsunami ? "YES" : "NO"}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#8b9bb4] flex items-center gap-2"><Users size={14}/> Felt Reports</span>
                    <span className="text-white">{props.felt || 0}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-[#8b9bb4] flex items-center gap-2"><AlertTriangle size={14}/> Significance Index</span>
                    <span className="text-warning">{props.sig}</span>
                </div>
                <div className="mt-4 text-xs text-[#8b9bb4] leading-relaxed">
                   Source: <a href={props.url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline">USGS Official Event Page</a>
                </div>
            </div>
        </div>

        {/* Right Column: Local Map Target */}
        <div className="lg:col-span-2 glass-panel relative overflow-hidden rounded-xl border border-secondary/20 min-h-[400px]">
            <MapContainer 
              center={[coords[1], coords[0]]} 
              zoom={6} 
              style={{ height: '100%', width: '100%', background: 'var(--color-accent)' }}
              className="z-0"
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              />
              
              {/* Epicenter target rings */}
              <CircleMarker
                  center={[coords[1], coords[0]]}
                  radius={40}
                  pathOptions={{ color: color, fillOpacity: 0.1, weight: 1, dashArray: '5, 5' }}
              />
              <CircleMarker
                  center={[coords[1], coords[0]]}
                  radius={coords[2] ? Math.max(10, coords[2]*0.5) : 20}
                  pathOptions={{ color: color, fillColor: color, fillOpacity: 0.4, weight: 2 }}
              >
                  <Popup className="tech-popup">
                      <div className="font-['Orbitron'] text-white">Epicenter</div>
                      <div className="text-[#8b9bb4] text-xs font-['Roboto_Mono']">
                          Lat: {coords[1].toFixed(4)}<br/>
                          Lon: {coords[0].toFixed(4)}
                      </div>
                  </Popup>
              </CircleMarker>
            </MapContainer>
            
            <div className="absolute top-4 left-4 z-[900] pointer-events-none">
                <div className="bg-black/60 border border-secondary/30 p-3 rounded backdrop-blur-md">
                    <h4 className="text-secondary font-['Orbitron'] text-xs tracking-widest uppercase mb-1">Spatial Targeting System</h4>
                    <p className="font-['Roboto_Mono'] text-[10px] text-[#e0e6ed]">Lat: {coords[1].toFixed(4)} | Lon: {coords[0].toFixed(4)}</p>
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
}
