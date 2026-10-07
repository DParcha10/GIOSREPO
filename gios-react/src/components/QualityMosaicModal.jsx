import React, { useState, useEffect } from 'react';
import { 
  X, Sparkles, Layers, Sliders, Play, 
  Check, Copy, Eye, BarChart3, PieChart,
  Calendar, ShieldCheck, SunMedium, CloudSun
} from 'lucide-react';
import { processQualityMosaic } from '../api/giosApi';
import { 
  QUALITY_MOSAIC_METHODS,
  QUALITY_MOSAIC_TIERS,
  QUALITY_MOSAIC_TIER_CONFIGS,
  classifyQualityMosaicTier,
  calculateQualityMosaicPixelSelection,
  buildQualityMosaicTileUrl
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function QualityMosaicModal({
  isOpen,
  onClose,
  onApplyTileLayer = null
}) {
  // Input parameters
  const [mosaicId, setMosaicId] = useState('QUALITY_MOSAIC_2026_Q3');
  const [collection, setCollection] = useState('sentinel-2-l2a');
  const [method, setMethod] = useState(QUALITY_MOSAIC_METHODS.MAX_NDVI);
  const [cloudThresholdPercent, setCloudThresholdPercent] = useState(20.0);
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-08-31');
  const [maskShadows, setMaskShadows] = useState(true);
  const [maskSnow, setMaskSnow] = useState(true);

  // Candidate scenes
  const [candidateScenes, setCandidateScenes] = useState([
    'S2A_MSIL2A_20260701',
    'S2B_MSIL2A_20260716',
    'S2A_MSIL2A_20260805',
    'S2B_MSIL2A_20260820'
  ]);
  const [newSceneId, setNewSceneId] = useState('');

  // Execution & Results
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('composition'); // 'composition' | 'scenes' | 'specs'
  const [copiedKey, setCopiedKey] = useState(null);

  // Initialize with initial composite calculation on open
  useEffect(() => {
    if (isOpen && !result) {
      const initial = calculateQualityMosaicPixelSelection({
        mosaicId,
        collection,
        method,
        cloudThresholdPercent,
        sceneIds: candidateScenes
      });
      setResult(initial);
    }
  }, [isOpen, result, mosaicId, collection, method, cloudThresholdPercent, candidateScenes]);

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddScene = () => {
    if (newSceneId.trim() && !candidateScenes.includes(newSceneId.trim())) {
      setCandidateScenes([...candidateScenes, newSceneId.trim()]);
      setNewSceneId('');
    }
  };

  const handleRemoveScene = (id) => {
    if (candidateScenes.length > 1) {
      setCandidateScenes(candidateScenes.filter(s => s !== id));
    }
  };

  const handleGenerateComposite = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        mosaic_id: mosaicId,
        collection,
        method,
        cloud_threshold_percent: Number(cloudThresholdPercent),
        date_range: [startDate, endDate],
        scene_ids: candidateScenes,
        mask_shadows: maskShadows,
        mask_snow: maskSnow,
        target_bands: ['B02', 'B03', 'B04', 'B08', 'B11', 'B12']
      };
      const res = await processQualityMosaic(payload);
      const computed = res?.data || res || calculateQualityMosaicPixelSelection({
        mosaicId,
        collection,
        method,
        cloudThresholdPercent: Number(cloudThresholdPercent),
        sceneIds: candidateScenes
      });
      setResult(computed);
      setActiveTab('composition');
    } catch {
      const fallback = calculateQualityMosaicPixelSelection({
        mosaicId,
        collection,
        method,
        cloudThresholdPercent: Number(cloudThresholdPercent),
        sceneIds: candidateScenes
      });
      setResult(fallback);
      setActiveTab('composition');
    } finally {
      setIsProcessing(false);
    }
  };

  const tier = result ? classifyQualityMosaicTier(result.cloud_free_coverage_percent) : QUALITY_MOSAIC_TIER_CONFIGS.pristine_cloud_free;
  const contributions = result?.scene_contributions || [];

  // Chart data for pixel contribution distribution
  const contributionChartData = {
    labels: contributions.map(c => c.scene_id.slice(-8)),
    datasets: [
      {
        label: 'Pixel Contribution (%)',
        data: contributions.map(c => c.pixel_contribution_percent),
        backgroundColor: [
          'rgba(56, 189, 248, 0.8)',
          'rgba(129, 140, 248, 0.8)',
          'rgba(52, 211, 153, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(244, 114, 182, 0.8)'
        ],
        borderColor: [
          '#38bdf8',
          '#818cf8',
          '#34d399',
          '#fbbf24',
          '#f472b6'
        ],
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  const doughnutData = {
    labels: contributions.map(c => c.scene_id),
    datasets: [
      {
        data: contributions.map(c => c.pixel_contribution_percent),
        backgroundColor: [
          '#38bdf8',
          '#818cf8',
          '#34d399',
          '#fbbf24',
          '#f472b6'
        ],
        borderWidth: 0
      }
    ]
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Multi-Temporal Quality Mosaicing Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Cloud-Free Compositor
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Sentinel-2 / Landsat
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Statistical pixel scoring (Max-NDVI, Min-Cloud, Medoid) synthesizing seamless cloud-free radiometric mosaics.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
            title="Close Quality Mosaicing Studio"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex gap-2 py-2">
            <button
              onClick={() => setActiveTab('composition')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'composition'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Composite Analytics</span>
            </button>
            <button
              onClick={() => setActiveTab('scenes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'scenes'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Scene Pixel Breakdown</span>
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'specs'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Compositor Parameters</span>
            </button>
          </div>

          {/* Quick Quality Tier Pill */}
          {result && (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">Quality Tier:</span>
              <span 
                className="px-2 py-0.5 rounded text-[11px] font-bold uppercase"
                style={{ 
                  backgroundColor: `${tier.badge_color}25`, 
                  color: tier.badge_color,
                  border: `1px solid ${tier.badge_color}60` 
                }}
              >
                {tier.label}
              </span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: COMPOSITE ANALYTICS */}
          {activeTab === 'composition' && (
            <div className="space-y-6">
              
              {/* Quality Tier Banner */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <SunMedium className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono text-slate-400 uppercase">Composite Classification:</span>
                    <span 
                      className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase"
                      style={{ 
                        backgroundColor: `${tier.badge_color}25`, 
                        color: tier.badge_color,
                        border: `1px solid ${tier.badge_color}60` 
                      }}
                    >
                      {tier.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {tier.description}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {result?.cloud_free_coverage_percent ?? 98.7}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    Cloud-Free Spatial Coverage
                  </div>
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Compositing Rule</div>
                  <div className="text-sm font-bold font-mono text-emerald-300 mt-1 uppercase">
                    {result?.method?.replace('_', ' ') || 'MAX NDVI'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Greenest pixel optimization</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Contributing Scenes</div>
                  <div className="text-lg font-bold font-mono text-sky-300 mt-1">
                    {result?.valid_scenes_used ?? candidateScenes.length} / {result?.total_input_scenes ?? candidateScenes.length}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Filtered by cloud threshold</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Mean Quality Score</div>
                  <div className="text-lg font-bold font-mono text-amber-300 mt-1">
                    {result?.mean_quality_score ?? 0.940}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Radiometric fidelity index</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Evaluated Pixels</div>
                  <div className="text-lg font-bold font-mono text-indigo-300 mt-1">
                    {(result?.total_pixels_processed ?? 1250000).toLocaleString()} px
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">6-band multispectral cube</div>
                </div>
              </div>

              {/* Chart & Doughnut Split */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 md:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase">
                      <BarChart3 className="w-4 h-4 text-sky-400" />
                      Pixel Contribution by Scene (%)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Normalized Weights</span>
                  </div>
                  <div className="h-44">
                    <Bar 
                      data={contributionChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: { backgroundColor: '#0f172a' }
                        },
                        scales: {
                          y: {
                            ticks: { color: '#94a3b8', font: { size: 9, family: 'monospace' } },
                            grid: { color: '#1e293b' },
                            max: 100
                          },
                          x: {
                            ticks: { color: '#94a3b8', font: { size: 9, family: 'monospace' } },
                            grid: { display: false }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-mono uppercase">
                      <PieChart className="w-4 h-4 text-emerald-400" />
                      Scene Distribution
                    </span>
                  </div>
                  <div className="h-36 flex items-center justify-center">
                    <Doughnut
                      data={doughnutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } }
                      }}
                    />
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 text-center">
                    Synthesized from {contributions.length} temporal acquisitions
                  </div>
                </div>
              </div>

              {/* Ready Tile Layer Action */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-teal-950/40 via-emerald-950/30 to-slate-950/60 border border-emerald-500/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-emerald-300">
                      Dynamic Cloud-Free Mosaic Tile Layer Ready
                    </div>
                    <div className="text-xs text-slate-300">
                      XYZ Tile URL Template: `/api/v1/tiles/mosaic/quality/{mosaicId}/{'{z}'}/{'{x}'}/{'{y}'}.png`
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onApplyTileLayer) {
                        const tileUrl = result?.tile_url_template || buildQualityMosaicTileUrl(mosaicId, '{z}', '{x}', '{y}');
                        onApplyTileLayer(tileUrl, `Quality Mosaic (${mosaicId})`);
                        onClose();
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Overlay on Map</span>
                  </button>
                  <button
                    onClick={() => handleCopy(result?.tile_url_template || buildQualityMosaicTileUrl(mosaicId, '{z}', '{x}', '{y}'), 'tile')}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-all"
                  >
                    {copiedKey === 'tile' ? 'Copied XYZ!' : 'Copy Tile XYZ'}
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: SCENE BREAKDOWN TABLE */}
          {activeTab === 'scenes' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Contributing Granule Telemetry</h3>
                  <p className="text-xs text-slate-400">
                    Individual scene metrics showing native cloud percentage and synthesized clear pixel contributions.
                  </p>
                </div>
                <button
                  onClick={() => handleCopy(contributions, 'table')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedKey === 'table' ? 'Copied JSON!' : 'Export JSON'}</span>
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-4">Scene Identifier</th>
                      <th className="py-2.5 px-4">Acquisition Date</th>
                      <th className="py-2.5 px-4">Native Cloud (%)</th>
                      <th className="py-2.5 px-4">Pixel Share (%)</th>
                      <th className="py-2.5 px-4">Mean NDVI</th>
                      <th className="py-2.5 px-4">Valid Pixels</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {contributions.map((row) => (
                      <tr key={row.scene_id} className="hover:bg-slate-800/30 transition-all">
                        <td className="py-2.5 px-4 font-bold text-sky-400">{row.scene_id}</td>
                        <td className="py-2.5 px-4">{row.acquisition_date}</td>
                        <td className="py-2.5 px-4">
                          <span className={row.cloud_coverage_percent > 20 ? 'text-amber-400' : 'text-emerald-400'}>
                            {row.cloud_coverage_percent.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-white">
                          {row.pixel_contribution_percent.toFixed(1)}%
                        </td>
                        <td className="py-2.5 px-4 text-emerald-300">
                          {row.mean_ndvi.toFixed(3)}
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">
                          {row.valid_pixels.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: COMPOSITOR PARAMETERS */}
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Compositing Rules & Masking Settings</h3>
                <p className="text-xs text-slate-400">
                  Select reduction algorithms, temporal windows, and morphological cloud masking thresholds.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Mosaic ID */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">Mosaic Identifier</label>
                  <input
                    type="text"
                    value={mosaicId}
                    onChange={(e) => setMosaicId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Collection */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">Satellite Collection</label>
                  <select
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="sentinel-2-l2a">Sentinel-2 MSI Level-2A (10m/20m BOA Reflectance)</option>
                    <option value="landsat-c2-l2">Landsat 8-9 OLI/TIRS Collection 2 Level-2 (30m)</option>
                  </select>
                </div>

                {/* Compositing Method */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">Pixel Reduction / Selection Rule</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value={QUALITY_MOSAIC_METHODS.MAX_NDVI}>Max-NDVI (Maximum Normalized Difference Vegetation - Greenest Pixel)</option>
                    <option value={QUALITY_MOSAIC_METHODS.MIN_CLOUD_PROBABILITY}>Min-Cloud Probability (Clearest Pixel Composite)</option>
                    <option value={QUALITY_MOSAIC_METHODS.TEMPORAL_MEDIAN}>Temporal Median (50th Percentile Radiance Reduction)</option>
                    <option value={QUALITY_MOSAIC_METHODS.MEDOID}>Medoid (Multispectral Vector Geometric Median)</option>
                    <option value={QUALITY_MOSAIC_METHODS.MAX_NDWI}>Max-NDWI (Maximum Normalized Difference Water Index)</option>
                    <option value={QUALITY_MOSAIC_METHODS.MIN_SWIR}>Min-SWIR (Minimum Shortwave Infrared / Thermal)</option>
                  </select>
                </div>

                {/* Cloud Threshold Slider */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Pre-Filter Cloud Tolerance:</span>
                    <span className="text-emerald-400 font-bold">{cloudThresholdPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="60.0"
                    step="5.0"
                    value={cloudThresholdPercent}
                    onChange={(e) => setCloudThresholdPercent(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Date Range Start */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Date Range End */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

              </div>

              {/* Candidate Scenes List */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-slate-400">
                    Candidate Scene Ingestion Pool ({candidateScenes.length} scenes)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. S2A_MSIL2A_20260901"
                      value={newSceneId}
                      onChange={(e) => setNewSceneId(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={handleAddScene}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-mono font-bold"
                    >
                      Add Scene
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {candidateScenes.map((s) => (
                    <span 
                      key={s} 
                      className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-sky-300 flex items-center gap-1.5"
                    >
                      <span>{s}</span>
                      <button
                        onClick={() => handleRemoveScene(s)}
                        className="text-slate-500 hover:text-red-400 font-bold ml-1"
                        title="Remove scene"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={maskShadows}
                    onChange={(e) => setMaskShadows(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>3x3 Morphological Dilation Cloud Shadow Masking</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={maskSnow}
                    onChange={(e) => setMaskSnow(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span>Exclude High-Albedo Snow / Ice Granules</span>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleGenerateComposite}
                  disabled={isProcessing}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-spin" />
                      <span>Synthesizing Cloud-Free Composite...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Execute Multi-Temporal Quality Mosaic</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Tile Engine: Dynamic Rio-Tiler XYZ</span>
            <span className="text-slate-600">|</span>
            <span>Mosaic ID: {mosaicId}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (onApplyTileLayer) {
                  const tileUrl = result?.tile_url_template || buildQualityMosaicTileUrl(mosaicId, '{z}', '{x}', '{y}');
                  onApplyTileLayer(tileUrl, `Quality Mosaic (${mosaicId})`);
                  onClose();
                }
              }}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Stream on Map</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
