import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, Sprout, Calendar, Layers, Eye, Copy, Check,
  AlertTriangle, Info, Play, RefreshCw, BarChart3,
  TrendingUp, Search, Sliders, MapPin, Download,
  Activity, ShieldCheck, CheckCircle2, ChevronRight,
  TrendingDown, Minus, Filter, Sparkles
} from 'lucide-react';
import { 
  simulatePhenologyDecomposition,
  getPhenologyAnomalyTileUrlTemplate
} from '../api/giosApi';
import { 
  PHENOLOGY_ANOMALY_TIER_CONFIGS,
  PhenologyAnomalyTier,
  PHENOLOGY_TILE_METRIC_CONFIGS,
  calculatePhenologyDecompositionAnalysis
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Benchmark Pre-Configured Multi-Temporal Phenological Monitoring Scenarios
const PRESET_SCENARIOS = {
  central_valley_almonds: {
    id: 'central_valley_almonds',
    name: 'Central Valley Almond Orchard Canopy Stress (California, USA)',
    asset_id: 'ASSET-AGRI-CV-01',
    asset_name: 'San Joaquin Valley Almond Orchard & Catchment Buffer',
    coordinates: [-119.8000, 36.7500],
    latitude: 36.7500,
    longitude: -119.8000,
    index_name: 'ndvi',
    num_harmonics: 2,
    trend_slope_per_year: -0.015,
    anomaly_threshold: 2.5,
    description: 'Irrigated orchard canopy exhibiting summer moisture deficit and unseasonal late-summer defoliation anomalies.'
  },
  amazon_deforestation_buffer: {
    id: 'amazon_deforestation_buffer',
    name: 'Amazonian Deforestation Buffer & Logging Encroachment (Rondônia, Brazil)',
    asset_id: 'ASSET-FOREST-AMZ-02',
    asset_name: 'Jamari National Forest Perimeter Buffer Zone',
    coordinates: [-63.2800, -9.8700],
    latitude: -9.8700,
    longitude: -63.2800,
    index_name: 'ndvi',
    num_harmonics: 2,
    trend_slope_per_year: -0.042,
    anomaly_threshold: 2.5,
    description: 'Acute canopy degradation and clearcut logging encroachment triggering severe and extreme negative phenological anomalies.'
  },
  sahel_savanna_greening: {
    id: 'sahel_savanna_greening',
    name: 'Sahelian Savanna Green-up & Monsoon Phenology (Niamey, Niger)',
    asset_id: 'ASSET-ECO-SAHEL-03',
    asset_name: 'Sahelian Semi-Arid Pastoral Woodland Reserve',
    coordinates: [2.1100, 13.5100],
    latitude: 13.5100,
    longitude: 2.1100,
    index_name: 'evi',
    num_harmonics: 2,
    trend_slope_per_year: 0.018,
    anomaly_threshold: 2.2,
    description: 'High-amplitude unimodal monsoon vegetative flush with strong inter-annual greening and climatic recovery.'
  },
  mediterranean_drought: {
    id: 'mediterranean_drought',
    name: 'Mediterranean Olive Grove & Summer Drought (Jaén, Spain)',
    asset_id: 'ASSET-AGRI-MED-04',
    asset_name: 'Andalusian Olive Agroforestry Micro-Basin',
    coordinates: [-3.7900, 37.7700],
    latitude: 37.7700,
    longitude: -3.7900,
    index_name: 'ndvi',
    num_harmonics: 2,
    trend_slope_per_year: -0.008,
    anomaly_threshold: 2.5,
    description: 'Bimodal phenological dynamics showing acute heatwave defoliation and severe negative climatological MAD departures.'
  },
  boreal_tundra_greening: {
    id: 'boreal_tundra_greening',
    name: 'Sub-Arctic Boreal Tundra Greening & Warming (Fairbanks, Alaska)',
    asset_id: 'ASSET-TUNDRA-AK-05',
    asset_name: 'Tanana Valley Boreal Shrub Tundra Transition',
    coordinates: [-147.7200, 64.8400],
    latitude: 64.8400,
    longitude: -147.7200,
    index_name: 'ndvi',
    num_harmonics: 2,
    trend_slope_per_year: 0.024,
    anomaly_threshold: 2.5,
    description: 'Rapid spring snowmelt green-up, extended growing season length, and sustained long-term arctic shrubification.'
  }
};

export default function PhenologyStudioModal({
  isOpen,
  onClose,
  activeSimulation,
  onApplyToMap
}) {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState('central_valley_almonds');
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState(activeSimulation || null);
  const [error, setError] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedGeoJson, setCopiedGeoJson] = useState(false);

  // Form Parameters
  const [formData, setFormData] = useState({
    asset_id: 'ASSET-AGRI-CV-01',
    asset_name: 'San Joaquin Valley Almond Orchard & Catchment Buffer',
    index_name: 'ndvi',
    num_harmonics: 2,
    trend_slope_per_year: -0.015,
    anomaly_threshold: 2.5,
    latitude: 36.7500,
    longitude: -119.8000
  });

  // Dynamic Tile Options
  const [selectedMetric, setSelectedMetric] = useState('mad_anomaly_zscore');
  const [tileOpacity, setTileOpacity] = useState(0.85);

  // Table Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortField, setSortField] = useState('date'); // 'date' | 'zscore' | 'value'

  // Sync activeSimulation if passed from parent
  useEffect(() => {
    if (activeSimulation) {
      setSimulation(activeSimulation);
      if (activeSimulation.asset_id) {
        setFormData((prev) => ({
          ...prev,
          asset_id: activeSimulation.asset_id,
          asset_name: activeSimulation.asset_name || prev.asset_name,
          index_name: activeSimulation.index_name || prev.index_name
        }));
      }
    }
  }, [activeSimulation]);

  // Handle Preset Selection
  const handleSelectPreset = (key) => {
    setSelectedScenarioKey(key);
    const preset = PRESET_SCENARIOS[key];
    if (preset) {
      setFormData({
        asset_id: preset.asset_id,
        asset_name: preset.asset_name,
        index_name: preset.index_name,
        num_harmonics: preset.num_harmonics,
        trend_slope_per_year: preset.trend_slope_per_year,
        anomaly_threshold: preset.anomaly_threshold,
        latitude: preset.latitude,
        longitude: preset.longitude
      });
    }
  };

  // Run Phenology Inversion / Simulation
  const handleRunSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        simulation_id: `PHEN_${Date.now().toString().slice(-8)}`,
        asset_id: formData.asset_id,
        asset_name: formData.asset_name,
        index_name: formData.index_name,
        num_harmonics: Number(formData.num_harmonics),
        trend_slope_per_year: Number(formData.trend_slope_per_year),
        anomaly_threshold: Number(formData.anomaly_threshold),
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude)
      };

      let result = null;
      try {
        result = await simulatePhenologyDecomposition(payload);
      } catch {
        // Fallback to client-side mathematical decomposition solver
        result = calculatePhenologyDecompositionAnalysis(payload);
      }

      setSimulation(result);
    } catch (err) {
      console.error('Phenology decomposition failed:', err);
      setError(err?.message || 'Phenological harmonic decomposition calculation failed.');
    } finally {
      setLoading(false);
    }
  }, [formData]);

  // Initial simulation run if none loaded
  useEffect(() => {
    if (isOpen && !simulation && !loading) {
      handleRunSimulation();
    }
  }, [isOpen, simulation, loading, handleRunSimulation]);

  // Copy Dynamic Tile URL
  const handleCopyTileUrl = () => {
    if (!simulation?.simulation_id) return;
    const url = getPhenologyAnomalyTileUrlTemplate(simulation.simulation_id, selectedMetric);
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Copy GeoJSON
  const handleCopyGeoJson = () => {
    if (!simulation?.geojson_collection) return;
    navigator.clipboard.writeText(JSON.stringify(simulation.geojson_collection, null, 2));
    setCopiedGeoJson(true);
    setTimeout(() => setCopiedGeoJson(false), 2000);
  };

  // Download GeoJSON
  const handleDownloadGeoJson = () => {
    if (!simulation?.geojson_collection) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(simulation.geojson_collection, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${simulation.simulation_id || 'phenology_aoi'}.geojson`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  // Apply to Map Handler
  const handleApplyToMap = () => {
    if (!simulation) return;
    if (onApplyToMap) {
      onApplyToMap(simulation, {
        selectedMetric,
        opacity: tileOpacity,
        coordinates: [formData.longitude, formData.latitude]
      });
    }
    onClose();
  };

  // Filtered and sorted observation points
  const filteredPoints = useMemo(() => {
    if (!simulation?.observation_points) return [];
    let list = [...simulation.observation_points];

    if (tierFilter !== 'all') {
      if (tierFilter === 'anomalies_only') {
        list = list.filter((p) => p.is_anomaly);
      } else if (tierFilter === 'critical_only') {
        list = list.filter((p) => Math.abs(p.seasonal_z_score) >= 3.0);
      } else {
        list = list.filter((p) => p.anomaly_tier === tierFilter);
      }
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((p) => 
        p.date.includes(q) ||
        String(p.day_of_year).includes(q) ||
        String(p.seasonal_z_score).includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortField === 'zscore') {
        return Math.abs(b.seasonal_z_score) - Math.abs(a.seasonal_z_score);
      }
      if (sortField === 'value') {
        return b.observed_value - a.observed_value;
      }
      return new Date(a.date) - new Date(b.date);
    });

    return list;
  }, [simulation, tierFilter, searchTerm, sortField]);

  // Harmonic Time Series Chart Configuration
  const timeSeriesChartData = useMemo(() => {
    if (!simulation?.observation_points?.length) return null;
    const pts = simulation.observation_points;
    const labels = pts.map((p) => p.date);

    // Color coding observation points by anomaly tier
    const pointColors = pts.map((p) => {
      const cfg = PHENOLOGY_ANOMALY_TIER_CONFIGS[p.anomaly_tier] || PHENOLOGY_ANOMALY_TIER_CONFIGS[PhenologyAnomalyTier.NORMAL];
      return cfg.color;
    });

    const pointRadii = pts.map((p) => (p.is_anomaly ? 5 : 2.5));

    return {
      labels,
      datasets: [
        {
          label: `Observed ${formData.index_name.toUpperCase()}`,
          data: pts.map((p) => p.observed_value),
          borderColor: 'rgba(255, 255, 255, 0.4)',
          borderWidth: 1,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          pointRadius: pointRadii,
          pointHoverRadius: 7,
          showLine: true,
          tension: 0.1,
          order: 1
        },
        {
          label: 'Multi-Harmonic Fourier Baseline',
          data: pts.map((p) => p.harmonic_baseline),
          borderColor: '#10b981',
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0.4,
          order: 2
        },
        {
          label: 'Climatological Median (Expected)',
          data: pts.map((p) => p.seasonal_median),
          borderColor: '#06b6d4',
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 0,
          tension: 0.2,
          order: 3
        },
        {
          label: 'Upper Climatological Bound (p90)',
          data: pts.map((p) => p.p90),
          borderColor: 'rgba(6, 182, 212, 0.15)',
          borderWidth: 1,
          pointRadius: 0,
          fill: '+1',
          backgroundColor: 'rgba(6, 182, 212, 0.08)',
          tension: 0.2,
          order: 4
        },
        {
          label: 'Lower Climatological Bound (p10)',
          data: pts.map((p) => p.p10),
          borderColor: 'rgba(6, 182, 212, 0.15)',
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          tension: 0.2,
          order: 5
        }
      ]
    };
  }, [simulation, formData.index_name]);

  // Monthly Climatology Bar Chart Data
  const monthlyChartData = useMemo(() => {
    if (!simulation?.monthly_climatology?.length) return null;
    const months = simulation.monthly_climatology;
    const labels = months.map((m) => m.month_name.slice(0, 3));

    return {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Monthly Median',
          data: months.map((m) => m.median),
          backgroundColor: 'rgba(16, 185, 129, 0.7)',
          borderColor: '#10b981',
          borderWidth: 1
        },
        {
          type: 'line',
          label: 'Robust Scale (1.4826 * MAD)',
          data: months.map((m) => m.scale),
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b',
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.3
        }
      ]
    };
  }, [simulation]);

  if (!isOpen) return null;

  const summary = simulation?.summary || {};
  const harmonic = simulation?.harmonic_model || {};
  const trend = simulation?.theil_sen_trend || {};
  const worstTierConfig = PHENOLOGY_ANOMALY_TIER_CONFIGS[summary.worst_anomaly_tier] || PHENOLOGY_ANOMALY_TIER_CONFIGS[PhenologyAnomalyTier.NORMAL];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-emerald-500/30 w-full max-w-6xl h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
              <Sprout className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Phenological Seasonality & Climatological MAD Studio
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                  CYCLE v2.5.22
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Multi-Harmonic Fourier Decomposition • Theil-Sen Trend Vector • Climatological MAD Z-Score Anomaly Inversion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyToMap}
              disabled={!simulation}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition disabled:opacity-50"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Apply to Map Explorer</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Body Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Parameter & Preset Sidebar */}
          <div className="w-80 bg-slate-950/50 border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
            
            {/* Benchmark Scenarios */}
            <div>
              <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Benchmark Presets</span>
              </label>
              <select
                value={selectedScenarioKey}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="w-full text-xs font-mono bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {Object.entries(PRESET_SCENARIOS).map(([k, s]) => (
                  <option key={k} value={k}>
                    {s.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1 italic">
                {PRESET_SCENARIOS[selectedScenarioKey]?.description}
              </p>
            </div>

            <div className="border-t border-slate-800 pt-3 flex flex-col gap-3 font-mono text-xs">
              
              {/* Asset Name & ID */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase">Asset Identifier</label>
                <input
                  type="text"
                  value={formData.asset_id}
                  onChange={(e) => setFormData({ ...formData, asset_id: e.target.value })}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded p-1.5 text-emerald-300 font-bold focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase">Asset Name</label>
                <input
                  type="text"
                  value={formData.asset_name}
                  onChange={(e) => setFormData({ ...formData, asset_name: e.target.value })}
                  className="w-full text-xs bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-300 focus:border-emerald-500"
                />
              </div>

              {/* Index & Harmonics */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Spectral Index</label>
                  <select
                    value={formData.index_name}
                    onChange={(e) => setFormData({ ...formData, index_name: e.target.value })}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 focus:border-emerald-500 uppercase"
                  >
                    <option value="ndvi">NDVI</option>
                    <option value="evi">EVI</option>
                    <option value="ndwi">NDWI</option>
                    <option value="msavi">MSAVI</option>
                    <option value="ndre">NDRE</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Fourier Harmonics (K)</label>
                  <select
                    value={formData.num_harmonics}
                    onChange={(e) => setFormData({ ...formData, num_harmonics: parseInt(e.target.value, 10) })}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 focus:border-emerald-500"
                  >
                    <option value="1">1 (Annual)</option>
                    <option value="2">2 (Semi-Annual)</option>
                    <option value="3">3 (Tri-Harmonic)</option>
                    <option value="4">4 (High-Frequency)</option>
                  </select>
                </div>
              </div>

              {/* Trend Slope */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 uppercase">
                  <span>Trend Slope (yr⁻¹)</span>
                  <span className={formData.trend_slope_per_year >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {formData.trend_slope_per_year > 0 ? `+${formData.trend_slope_per_year}` : formData.trend_slope_per_year}
                  </span>
                </div>
                <input
                  type="range"
                  min="-0.05"
                  max="0.05"
                  step="0.002"
                  value={formData.trend_slope_per_year}
                  onChange={(e) => setFormData({ ...formData, trend_slope_per_year: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer mt-1"
                />
              </div>

              {/* MAD Anomaly Threshold */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-400 uppercase">
                  <span>Anomaly Threshold (|z|)</span>
                  <span className="text-amber-400 font-bold">{formData.anomaly_threshold} MAD</span>
                </div>
                <input
                  type="range"
                  min="1.5"
                  max="3.5"
                  step="0.1"
                  value={formData.anomaly_threshold}
                  onChange={(e) => setFormData({ ...formData, anomaly_threshold: parseFloat(e.target.value) })}
                  className="w-full accent-amber-500 h-1 bg-slate-800 rounded cursor-pointer mt-1"
                />
                <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                  <span>1.5 (Sensitive)</span>
                  <span>2.5 (Nominal)</span>
                  <span>3.5 (Extreme)</span>
                </div>
              </div>

              {/* Coordinates */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                    className="w-full text-xs bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Run Button */}
              <button
                onClick={handleRunSimulation}
                disabled={loading}
                className="w-full mt-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Inverting Harmonic Curves...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Run Phenology Inversion</span>
                  </>
                )}
              </button>

              {error && (
                <div className="p-2 rounded bg-rose-950/80 border border-rose-800 text-rose-300 text-[11px]">
                  {error}
                </div>
              )}

            </div>
          </div>

          {/* Right Main Content Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/60">
            
            {/* Tab Navigation */}
            <div className="px-6 pt-3 border-b border-slate-800 flex gap-2 font-mono text-xs">
              {[
                { id: 'summary', label: 'Summary & Insights', icon: Activity },
                { id: 'timeseries', label: 'Harmonic Seasonal Chart', icon: LineElement },
                { id: 'theilsen', label: 'Theil-Sen Trend Vector', icon: TrendingUp },
                { id: 'climatology', label: 'Monthly Climatology (MAD)', icon: BarChart3 },
                { id: 'ledger', label: 'Observation Ledger', icon: Calendar },
                { id: 'tiles', label: 'XYZ Tile Streaming & GeoJSON', icon: Layers }
              ].map((tab) => {
                const IconComponent = tab.icon || Activity;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`pb-2.5 px-3 flex items-center gap-1.5 border-b-2 font-bold transition-all ${
                      isActive
                        ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20 rounded-t'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                    }`}
                  >
                    <IconComponent className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Content Panes */}
            <div className="flex-1 p-6 overflow-y-auto">
              
              {/* TAB 1: SUMMARY & BIOPHYSICAL INSIGHTS */}
              {activeTab === 'summary' && (
                <div className="space-y-6">
                  
                  {/* Top KPI Metric Cards */}
                  <div className="grid grid-cols-4 gap-4 font-mono">
                    
                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase">Observations & Span</div>
                      <div className="text-xl font-bold text-white mt-1">
                        {summary.total_observations ?? 78} pts
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {summary.years_covered ?? 3.0} Years (Bi-Weekly)
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase">Theil-Sen Robust Slope</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-1">
                        {trend.slope_per_year > 0 ? (
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                        ) : trend.slope_per_year < 0 ? (
                          <TrendingDown className="w-4 h-4 text-rose-400" />
                        ) : (
                          <Minus className="w-4 h-4 text-slate-400" />
                        )}
                        <span>{trend.slope_per_year > 0 ? `+${trend.slope_per_year}` : trend.slope_per_year ?? '0.000'}</span>
                        <span className="text-[10px] text-slate-400 font-normal">yr⁻¹</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 capitalize">
                        Direction: <strong className="text-slate-200">{trend.trend_direction?.replace('_', ' ') ?? 'None'}</strong>
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase">Annual Amplitude (C₁) & Phase</div>
                      <div className="text-xl font-bold text-cyan-400 mt-1">
                        {summary.annual_amplitude ?? '0.220'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Peak DOY: <strong className="text-slate-200">DOY {summary.peak_greenup_doy ?? 196}</strong> ({summary.phase_angle_deg ?? 180}°)
                      </div>
                    </div>

                    <div className="bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                      <div className="text-[10px] text-slate-400 uppercase">Climatological Anomalies</div>
                      <div className="text-xl font-bold text-amber-400 mt-1">
                        {summary.anomaly_count ?? 0} <span className="text-xs text-slate-500 font-normal">/ {summary.total_observations ?? 78}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Worst Z: <strong className="text-rose-400">{summary.worst_anomaly_z ?? '0.00'} MAD</strong>
                      </div>
                    </div>

                  </div>

                  {/* Status Banner */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${worstTierConfig.badgeClass}`}>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-black/40">
                        <AlertTriangle className="w-5 h-5" style={{ color: worstTierConfig.color }} />
                      </div>
                      <div>
                        <div className="font-bold text-sm font-mono tracking-wide" style={{ color: worstTierConfig.color }}>
                          {worstTierConfig.label}
                        </div>
                        <div className="text-xs text-slate-300 mt-0.5">
                          {worstTierConfig.description}
                        </div>
                      </div>
                    </div>
                    <div className="font-mono text-right text-xs">
                      <div className="text-slate-400">Model Goodness of Fit</div>
                      <div className="text-white font-bold">R² = {harmonic.r_squared ?? '0.998'} • RMSE = {harmonic.rmse ?? '0.004'}</div>
                    </div>
                  </div>

                  {/* Mathematical Model Card */}
                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl font-mono text-xs space-y-2">
                    <div className="text-emerald-400 font-bold uppercase text-[11px] flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      <span>Fitted Multi-Harmonic Fourier Regression Formula</span>
                    </div>
                    <div className="p-2.5 rounded bg-black/60 border border-slate-800 text-slate-300 overflow-x-auto text-[11px]">
                      {harmonic.formula_string || 'y(t) = 0.480 + 0.012*t + 0.220*cos(1wt - 3.42) + 0.040*cos(2wt - 1.72)'}
                    </div>
                    <div className="grid grid-cols-3 gap-3 pt-2 text-[11px] text-slate-400">
                      <div>Linear Intercept (a₀): <strong className="text-white">{harmonic.intercept_a0 ?? '0.480'}</strong></div>
                      <div>Linear Slope (a₁): <strong className="text-white">{harmonic.linear_slope_a1 ?? '0.012'}</strong></div>
                      <div>Harmonics Evaluated: <strong className="text-white">{formData.num_harmonics}</strong></div>
                    </div>
                  </div>

                  {/* Operational Recommendations */}
                  <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl">
                      <div className="text-cyan-400 font-bold uppercase text-[11px] mb-1">
                        Vegetation Phenology Dynamics
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        The multi-harmonic model reconstructs cyclical seasonality while isolating the monotonic Theil-Sen trend slope ({trend.slope_per_year} yr⁻¹). The peak green-up Day of Year (DOY {summary.peak_greenup_doy}) indicates optimal biomass accumulation timing.
                      </p>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl">
                      <div className="text-amber-400 font-bold uppercase text-[11px] mb-1">
                        Climatological MAD Anomaly Analysis
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed">
                        Using a 12-month Median Absolute Deviation (MAD) baseline eliminates false winter phenological alarms. Deviations exceeding {formData.anomaly_threshold} MAD trigger localized canopy stress or drought moisture deficit flags.
                      </p>
                    </div>
                  </div>

                </div>
              )}

              {/* TAB 2: INTERACTIVE HARMONIC TIME-SERIES CHART */}
              {activeTab === 'timeseries' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between font-mono text-xs">
                    <div>
                      <h3 className="font-bold text-white text-sm">Multi-Harmonic Seasonal Curve vs. Climatological Bounds</h3>
                      <p className="text-slate-400 text-[11px]">
                        Observed points colored by classified anomaly tier: Green (Normal), Cyan (Mild), Amber (Moderate), Orange (Severe), Red (Extreme)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 uppercase">Index:</span>
                      <span className="font-bold text-emerald-400 uppercase">{formData.index_name}</span>
                    </div>
                  </div>

                  <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-xl h-[420px]">
                    {timeSeriesChartData ? (
                      <Line
                        data={timeSeriesChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          interaction: {
                            mode: 'index',
                            intersect: false
                          },
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: {
                                color: '#94a3b8',
                                font: { family: 'monospace', size: 10 }
                              }
                            },
                            tooltip: {
                              backgroundColor: 'rgba(2, 6, 23, 0.95)',
                              borderColor: '#10b981',
                              borderWidth: 1,
                              titleFont: { family: 'monospace', size: 11 },
                              bodyFont: { family: 'monospace', size: 10 },
                              padding: 10
                            }
                          },
                          scales: {
                            x: {
                              grid: { color: 'rgba(51, 65, 85, 0.3)' },
                              ticks: { color: '#94a3b8', font: { family: 'monospace', size: 9 }, maxTicksLimit: 12 }
                            },
                            y: {
                              grid: { color: 'rgba(51, 65, 85, 0.3)' },
                              ticks: { color: '#94a3b8', font: { family: 'monospace', size: 9 } }
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                        No time series data available.
                      </div>
                    )}
                  </div>

                  {/* Anomaly Legend Badges */}
                  <div className="flex items-center justify-center gap-3 font-mono text-[10px] pt-1">
                    {Object.values(PHENOLOGY_ANOMALY_TIER_CONFIGS).map((cfg) => (
                      <div key={cfg.id} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
                        <span className="text-slate-300">{cfg.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: THEIL-SEN TREND & MANN-KENDALL TEST */}
              {activeTab === 'theilsen' && (
                <div className="space-y-6">
                  
                  <div className="grid grid-cols-2 gap-4">
                    
                    {/* Theil-Sen Robust Slope Card */}
                    <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl font-mono space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <TrendingUp className="w-4 h-4" />
                        <span>Theil-Sen Robust Linear Estimator</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Computes the median of all pairwise slopes beta = median((y_j - y_i) / (t_j - t_i)), providing high breakdown resilience to gross cloud and shadow outliers (up to 29% contamination).
                      </p>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Median Slope (β):</span>
                          <span className="font-bold text-white">{trend.slope_per_year} yr⁻¹</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">95% Sen Confidence Interval:</span>
                          <span className="font-bold text-emerald-400">[{trend.slope_ci_lower}, {trend.slope_ci_upper}]</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Linear Intercept:</span>
                          <span className="font-bold text-white">{trend.intercept}</span>
                        </div>
                      </div>
                    </div>

                    {/* Mann-Kendall Rank Correlation Test Card */}
                    <div className="bg-slate-950/70 border border-slate-800 p-5 rounded-xl font-mono space-y-3">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Mann-Kendall Rank Correlation Test</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Non-parametric rank test for monotonic trends S = sum(sgn(y_j - y_i)) corrected for tied groups, evaluating two-tailed significance (p &lt; 0.05).
                      </p>

                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Test Statistic (S):</span>
                          <span className="font-bold text-white">{trend.mann_kendall_s}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Kendall&apos;s Tau (τ):</span>
                          <span className="font-bold text-cyan-400">{trend.kendall_tau}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Standardized Z (Z_MK):</span>
                          <span className="font-bold text-white">{trend.z_score}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Two-Tailed p-value:</span>
                          <span className="font-bold text-white">{trend.p_value}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-800 pt-1.5">
                          <span className="text-slate-400">Statistical Significance:</span>
                          <span className={`font-bold ${trend.is_significant ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {trend.is_significant ? 'SIGNIFICANT (p < 0.05)' : 'NOT SIGNIFICANT (p >= 0.05)'}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* TAB 4: MONTHLY CLIMATOLOGICAL MAD BASELINE */}
              {activeTab === 'climatology' && (
                <div className="space-y-6">
                  
                  <div className="h-[280px] bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                    {monthlyChartData ? (
                      <Bar
                        data={monthlyChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: { color: '#94a3b8', font: { family: 'monospace', size: 10 } }
                            }
                          },
                          scales: {
                            x: {
                              grid: { color: 'rgba(51, 65, 85, 0.3)' },
                              ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } }
                            },
                            y: {
                              grid: { color: 'rgba(51, 65, 85, 0.3)' },
                              ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } }
                            }
                          }
                        }}
                      />
                    ) : null}
                  </div>

                  {/* 12-Month Climatology Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800 font-mono text-xs">
                    <table className="w-full text-left bg-slate-950/60">
                      <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase">
                        <tr>
                          <th className="p-2.5">Month</th>
                          <th className="p-2.5 text-right">Median</th>
                          <th className="p-2.5 text-right">MAD</th>
                          <th className="p-2.5 text-right">Scale (1.4826*MAD)</th>
                          <th className="p-2.5 text-right">p10</th>
                          <th className="p-2.5 text-right">p25</th>
                          <th className="p-2.5 text-right">p75</th>
                          <th className="p-2.5 text-right">p90</th>
                          <th className="p-2.5 text-right">Obs Count</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(simulation?.monthly_climatology || []).map((m) => (
                          <tr key={m.month} className="hover:bg-slate-800/30">
                            <td className="p-2.5 font-bold text-white">{m.month_name}</td>
                            <td className="p-2.5 text-right text-emerald-400 font-bold">{m.median}</td>
                            <td className="p-2.5 text-right text-slate-300">{m.mad}</td>
                            <td className="p-2.5 text-right text-cyan-400 font-bold">{m.scale}</td>
                            <td className="p-2.5 text-right text-slate-400">{m.p10}</td>
                            <td className="p-2.5 text-right text-slate-400">{m.p25}</td>
                            <td className="p-2.5 text-right text-slate-400">{m.p75}</td>
                            <td className="p-2.5 text-right text-slate-400">{m.p90}</td>
                            <td className="p-2.5 text-right text-slate-500">{m.sample_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* TAB 5: OBSERVATION LEDGER */}
              {activeTab === 'ledger' && (
                <div className="space-y-4">
                  
                  {/* Ledger Controls */}
                  <div className="flex items-center justify-between gap-4 font-mono text-xs">
                    
                    <div className="flex items-center gap-2 flex-1">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search date, DOY, or z-score..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 text-xs focus:border-emerald-500"
                        />
                      </div>

                      <select
                        value={tierFilter}
                        onChange={(e) => setTierFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:border-emerald-500"
                      >
                        <option value="all">All Tiers</option>
                        <option value="anomalies_only">Anomalies Only (|z| &ge; {formData.anomaly_threshold})</option>
                        <option value="critical_only">Critical Only (|z| &ge; 3.0)</option>
                        <option value="normal">Normal (|z| &lt; 1.5)</option>
                        <option value="mild_deviation">Mild (1.5-2.0)</option>
                        <option value="moderate_anomaly">Moderate (2.0-2.5)</option>
                        <option value="severe_anomaly">Severe (2.5-3.0)</option>
                        <option value="extreme_anomaly">Extreme (&ge; 3.0)</option>
                      </select>

                      <select
                        value={sortField}
                        onChange={(e) => setSortField(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-300 text-xs focus:border-emerald-500"
                      >
                        <option value="date">Sort: Date</option>
                        <option value="zscore">Sort: |Z-Score| Desc</option>
                        <option value="value">Sort: Observed Value Desc</option>
                      </select>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Showing <strong>{filteredPoints.length}</strong> / {simulation?.observation_points?.length || 0} points
                    </div>
                  </div>

                  {/* Ledger Table */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800 font-mono text-xs max-h-[460px]">
                    <table className="w-full text-left bg-slate-950/60">
                      <thead className="bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 uppercase sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5 text-right">DOY</th>
                          <th className="p-2.5 text-right">Observed</th>
                          <th className="p-2.5 text-right">Harmonic Baseline</th>
                          <th className="p-2.5 text-right">Seasonal Med</th>
                          <th className="p-2.5 text-right">Z-Score (MAD)</th>
                          <th className="p-2.5 text-center">Anomaly Tier</th>
                          <th className="p-2.5 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredPoints.map((pt, idx) => {
                          const tierCfg = PHENOLOGY_ANOMALY_TIER_CONFIGS[pt.anomaly_tier] || PHENOLOGY_ANOMALY_TIER_CONFIGS[PhenologyAnomalyTier.NORMAL];
                          return (
                            <tr key={idx} className="hover:bg-slate-800/30">
                              <td className="p-2.5 font-bold text-white">{pt.date}</td>
                              <td className="p-2.5 text-right text-slate-400">{pt.day_of_year}</td>
                              <td className="p-2.5 text-right text-emerald-400 font-bold">{pt.observed_value}</td>
                              <td className="p-2.5 text-right text-slate-300">{pt.harmonic_baseline}</td>
                              <td className="p-2.5 text-right text-slate-400">{pt.seasonal_median}</td>
                              <td className={`p-2.5 text-right font-bold ${pt.is_anomaly ? 'text-amber-400' : 'text-slate-400'}`}>
                                {pt.seasonal_z_score > 0 ? `+${pt.seasonal_z_score}` : pt.seasonal_z_score}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${tierCfg.badgeClass}`}>
                                  {tierCfg.label.split('(')[0].trim()}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                {pt.is_anomaly ? (
                                  <span className="text-[10px] font-bold text-rose-400">ANOMALY</span>
                                ) : (
                                  <span className="text-[10px] text-slate-500">NOMINAL</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}

              {/* TAB 6: DYNAMIC XYZ TILE STREAMING & GEOJSON EXPORT */}
              {activeTab === 'tiles' && (
                <div className="space-y-6 font-mono text-xs">
                  
                  {/* Metric Selection */}
                  <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-4">
                    <div className="text-emerald-400 font-bold uppercase text-[11px] flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      <span>Dynamic XYZ Tile Streaming Metrics</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(PHENOLOGY_TILE_METRIC_CONFIGS).map(([k, cfg]) => {
                        const isSelected = selectedMetric === k;
                        return (
                          <button
                            key={k}
                            onClick={() => setSelectedMetric(k)}
                            className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                              isSelected
                                ? 'bg-emerald-950/60 border-emerald-500 text-white shadow'
                                : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div>
                              <div className="font-bold text-xs">{cfg.name}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{cfg.description}</div>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 border-t border-slate-800/80 pt-1">
                              <span>Unit: {cfg.unit}</span>
                              <span className="font-bold text-emerald-400">Colormap: {cfg.colormap}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Tile URL Template Box */}
                    <div className="border-t border-slate-800 pt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase">Tile Endpoint Template (XYZ Slippy Map)</span>
                        <button
                          onClick={handleCopyTileUrl}
                          className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition"
                        >
                          {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedUrl ? 'Copied!' : 'Copy Tile URL'}</span>
                        </button>
                      </div>
                      <div className="p-2.5 rounded bg-black/70 border border-slate-800 text-emerald-300 break-all text-[11px] select-all">
                        {simulation?.simulation_id
                          ? getPhenologyAnomalyTileUrlTemplate(simulation.simulation_id, selectedMetric)
                          : '/api/v1/tiles/phenology/anomaly/{sim_id}/{metric}/{z}/{x}/{y}.png'}
                      </div>
                    </div>

                    {/* Opacity Slider */}
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[10px] uppercase w-24">Layer Opacity</span>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={tileOpacity}
                        onChange={(e) => setTileOpacity(parseFloat(e.target.value))}
                        className="flex-1 accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer"
                      />
                      <span className="text-slate-300 w-12 text-right">{Math.round(tileOpacity * 100)}%</span>
                    </div>

                  </div>

                  {/* RFC 7946 GeoJSON AOI Polygon Exporter */}
                  <div className="bg-slate-950/70 border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-cyan-400 font-bold uppercase text-[11px] flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>RFC 7946 GeoJSON AOI FeatureCollection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleCopyGeoJson}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200 text-[10px] transition"
                        >
                          {copiedGeoJson ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedGeoJson ? 'Copied' : 'Copy JSON'}</span>
                        </button>
                        <button
                          onClick={handleDownloadGeoJson}
                          className="flex items-center gap-1 px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 rounded text-white text-[10px] font-bold transition"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download .geojson</span>
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded bg-black/70 border border-slate-800 text-slate-400 max-h-48 overflow-y-auto text-[10px]">
                      <pre>{JSON.stringify(simulation?.geojson_collection || {}, null, 2)}</pre>
                    </div>
                  </div>

                </div>
              )}

            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between font-mono text-xs">
          <div className="text-slate-400 flex items-center gap-2">
            <span>Asset:</span>
            <strong className="text-white">{formData.asset_name}</strong>
            <span className="text-slate-600">•</span>
            <span>Index:</span>
            <strong className="text-emerald-400 uppercase">{formData.index_name}</strong>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Close
            </button>
            <button
              onClick={handleApplyToMap}
              disabled={!simulation}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Apply to Map Explorer</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
