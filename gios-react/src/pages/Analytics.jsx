import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import axios from 'axios';
import giosApi from '../api/giosApi';
import { Radar, RefreshCw, Layers } from 'lucide-react';
import MetallicPaintText from '../components/ReactBits/MetallicPaintText';
import TiltedCard from '../components/ReactBits/TiltedCard';
import DecryptedText from '../components/ReactBits/DecryptedText';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

export default function Analytics() {
  const [chartData, setChartData] = useState(null);
  const [barData, setBarData] = useState(null);
  const [doughnutData, setDoughnutData] = useState(null);
  const [scatterData, setScatterData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backendData, setBackendData] = useState(null);

  useEffect(() => {
    // 1. Fetch live seismic data for demo charts
    axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson')
      .then(res => {
        const features = res.data.features;
        features.sort((a, b) => a.properties.time - b.properties.time);

        const labels = features.map(f => new Date(f.properties.time).toLocaleDateString());
        const magnitudes = features.map(f => f.properties.mag);
        const depths = features.map(f => f.geometry.coordinates[2]);

        setChartData({
          labels,
          datasets: [{
              label: 'Magnitude (M)', data: magnitudes, borderColor: 'var(--color-primary)', backgroundColor: 'rgba(0, 255, 170, 0.2)',
              tension: 0.4, borderWidth: 2, fill: true, pointBackgroundColor: 'var(--color-primary)',
          }]
        });

        setBarData({
          labels,
          datasets: [{
              label: 'Depth (km)', data: depths, backgroundColor: 'rgba(0, 170, 238, 0.7)', borderColor: 'var(--color-secondary)', borderWidth: 1,
          }]
        });

        let mLevels = [0, 0, 0, 0];
        magnitudes.forEach(m => {
            if (m < 3.0) mLevels[0]++;
            else if (m < 5.0) mLevels[1]++;
            else if (m < 6.0) mLevels[2]++;
            else mLevels[3]++;
        });

        setDoughnutData({
            labels: ['Minor', 'Light', 'Moderate', 'Strong'],
            datasets: [{
                data: mLevels,
                backgroundColor: ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-warning)', 'var(--color-danger)'],
                borderColor: 'var(--color-accent)',
                borderWidth: 2,
            }]
        });

        const scatterPoints = features.map(f => ({ x: f.properties.mag, y: f.geometry.coordinates[2] }));
        setScatterData({
            datasets: [{
                label: 'Depth vs Magnitude',
                data: scatterPoints,
                backgroundColor: 'var(--color-warning)',
                pointRadius: 6,
            }]
        });

        setLoading(false);
      });

    // 2. Initial backend handshake
    giosApi.get('/health').then(res => {
       setBackendData(res.data);
    }).catch(() => console.log("Backend health query offline"));

  }, []);

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { backgroundColor: 'rgba(10, 14, 23, 0.9)', titleColor: '#fff', bodyColor: '#ccc', borderColor: 'var(--color-primary)', borderWidth: 1 }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#8b9bb4', font: { size: 10 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b9bb4', font: { size: 10 } } }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-8 h-full flex flex-col gap-6 w-full overflow-y-auto z-10 relative"
    >
      <header className="glass-panel p-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-['Orbitron'] font-bold text-white flex items-center gap-3">
            <Radar className="text-warning animate-[spin_4s_linear_infinite]" size={32} />
            Data <MetallicPaintText text="Analytics" glow='var(--color-warning)' />
          </h1>
          <p className="text-[#8b9bb4] mt-2 font-['Rajdhani']">
            Comprehensive 30-Day Seismic Telemetry Models {backendData ? '• Processing Core Active' : ''}
          </p>
        </div>
        <button className="glass-button px-4 py-2 text-[10px] uppercase tracking-widest font-mono text-primary">
          <RefreshCw size={14} /> Recompute Indices
        </button>
      </header>

      {/* Time-Series Query Controls */}
      <div className="glass-panel p-4 shrink-0 flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-bold">Bounding Box / Location</label>
          <input type="text" placeholder="-121.10, 37.00, -121.05, 37.05" className="bg-accent/50 border border-gray-700/50 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-primary outline-none" />
        </div>
        <div className="flex flex-col gap-1.5 w-36">
          <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-bold">Start Date</label>
          <input type="date" className="bg-accent/50 border border-gray-700/50 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-primary outline-none" />
        </div>
        <div className="flex flex-col gap-1.5 w-36">
          <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-bold">End Date</label>
          <input type="date" className="bg-accent/50 border border-gray-700/50 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-primary outline-none" />
        </div>
        <div className="flex flex-col gap-1.5 w-40">
          <label className="text-[10px] text-gray-400 font-mono uppercase tracking-wider font-bold">Index</label>
          <select className="bg-accent/50 border border-gray-700/50 rounded px-3 py-1.5 text-white font-mono text-xs focus:border-primary outline-none">
            <option value="ndvi">NDVI</option>
            <option value="ndmi">NDMI</option>
            <option value="lst">LST</option>
            <option value="mndwi">MNDWI</option>
            <option value="nbr">NBR</option>
          </select>
        </div>
        <button className="glass-button px-5 py-1.5 text-teal-300 font-bold uppercase tracking-wider text-[11px] font-mono">
          Query Trend
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center gap-4">
            <div className="w-16 h-16 border-4 border-warning/20 border-t-warning rounded-full animate-spin"></div>
            <DecryptedText text="Processing Atmospheric Data..." className="text-xs tracking-widest text-warning" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12 auto-rows-[42vh]">
            
            <TiltedCard>
              <div className="glass-panel p-6 h-full flex flex-col">
                <h2 className="text-primary font-['Orbitron'] border-b border-primary/20 pb-2 mb-4 flex items-center justify-between">
                    Temporal Magnitude Trend
                    <span className="text-[10px] text-[#8b9bb4] font-['Roboto_Mono']">Live Feed</span>
                </h2>
                <div className="flex-1 relative w-full"><Line data={chartData} options={baseOptions} /></div>
              </div>
            </TiltedCard>

            <TiltedCard>
              <div className="glass-panel p-6 h-full flex flex-col">
                <h2 className="text-danger font-['Orbitron'] border-b border-danger/20 pb-2 mb-4 flex items-center justify-between">
                    Severity Distribution
                    <span className="text-[10px] text-[#8b9bb4] font-['Roboto_Mono']">Classification</span>
                </h2>
                <div className="flex-1 relative w-full flex justify-center"><Doughnut data={doughnutData} options={{...baseOptions, plugins: { ...baseOptions.plugins, legend: { display: true, position: 'right', labels: { color: '#8b9bb4', boxWidth: 10, font: { size: 10 } } } } }} /></div>
              </div>
            </TiltedCard>

            <TiltedCard>
              <div className="glass-panel p-6 h-full flex flex-col">
                <h2 className="text-secondary font-['Orbitron'] border-b border-secondary/20 pb-2 mb-4 flex items-center justify-between">
                    Hypocenter Depth Profiles
                    <span className="text-[10px] text-[#8b9bb4] font-['Roboto_Mono']">Sub-Surface</span>
                </h2>
                <div className="flex-1 relative w-full"><Bar data={barData} options={baseOptions} /></div>
              </div>
            </TiltedCard>

            <TiltedCard>
              <div className="glass-panel p-6 h-full flex flex-col">
                <h2 className="text-warning font-['Orbitron'] border-b border-warning/20 pb-2 mb-4 flex items-center justify-between">
                    Depth / Magnitude Correlation
                    <span className="text-[10px] text-[#8b9bb4] font-['Roboto_Mono']">Statistical</span>
                </h2>
                <div className="flex-1 relative w-full"><Scatter data={scatterData} options={{...baseOptions, scales: { ...baseOptions.scales, x: { display: true, grid: { display: false } } } }} /></div>
              </div>
            </TiltedCard>

        </div>
      )}
    </motion.div>
  );
}
