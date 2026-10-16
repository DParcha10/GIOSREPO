import React, { useState, useMemo } from 'react';
import {
  X, Layers, Sliders, Check, Copy, CheckCircle2,
  Activity, TrendingUp, Sparkles, ArrowRight, ShieldCheck,
  Calendar, Sun, Leaf, Filter, Clock, Info, Eye, BarChart3,
  Play, Pause, SkipBack, SkipForward, ArrowDown, ArrowUp, Database
} from 'lucide-react';
import {
  TEMPORAL_REDUCER_METHODS,
  TEMPORAL_REDUCER_CONFIGS,
  TEMPORAL_QUALITY_TIERS,
  TEMPORAL_QUALITY_TIER_CONFIGS,
  TEMPORAL_BENCHMARK_SCENES,
  calculatePixelQualityScore,
  classifyTemporalCompositeQuality,
  applyTemporalReduction,
  buildTemporalCompositeTileUrlTemplate,
  buildTemporalQualityMosaicTileUrlTemplate
} from '../config/constants.js';
import { fetchTemporalComposite } from '../api/giosApi.js';

/**
 * Seasonal presets for rapid multi-temporal scene stack selection.
 */
const SEASONAL_PRESETS = [
  {
    id: 'summer_greenness_2026',
    name: 'Summer Peak Greenness (Jun - Aug 2026)',
    description: 'High-sun peak phenology window. Ideal for vegetation canopy density, agricultural yields, and greenest-pixel mosaics.',
    startDate: '2026-06-01',
    endDate: '2026-08-31',
    maxCloudCover: 20.0,
    recommendedReducer: TEMPORAL_REDUCER_METHODS.MAX_NDVI,
    badge: 'Peak Phenology'
  },
  {
    id: 'dry_season_baseline_2026',
    name: 'Dry Season Embankment Baseline (Jul - Oct 2026)',
    description: 'Minimal cloud contamination window for infrastructure stability, tailings dam crest subsidence, and bare soil surveys.',
    startDate: '2026-07-01',
    endDate: '2026-10-15',
    maxCloudCover: 15.0,
    recommendedReducer: TEMPORAL_REDUCER_METHODS.MEDIAN,
    badge: 'Infrastructure'
  },
  {
    id: 'spring_runoff_2026',
    name: 'Spring Freshet & High-Water (Apr - Jun 2026)',
    description: 'Maximum reservoir storage and spring freshet run-off monitoring. Clear-sky pixel selection filters cloud shadows.',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    maxCloudCover: 35.0,
    recommendedReducer: TEMPORAL_REDUCER_METHODS.MIN_CLOUD,
    badge: 'Hydrology'
  },
  {
    id: 'full_year_2026',
    name: 'Full Annual Synthesis (Jan - Dec 2026)',
    description: 'Multi-seasonal time series aggregation. Reconstructs complete cloud-free annual baseline via median reduction.',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    maxCloudCover: 40.0,
    recommendedReducer: TEMPORAL_REDUCER_METHODS.MEDIAN,
    badge: 'Climatology'
  }
];

/**
 * Common satellite band presets for composite visualization.
 */
const COMPOSITE_BAND_PRESETS = [
  { id: 'true_color', label: 'True Color RGB', bands: 'B04,B03,B02', description: 'Red, Green, Blue natural surface reflectance' },
  { id: 'false_color_nir', label: 'Color Infrared (CIR)', bands: 'B08,B04,B03', description: 'NIR, Red, Green highlights vigorous vegetation' },
  { id: 'agriculture_swir', label: 'SWIR Moisture / Agriculture', bands: 'B11,B08,B02', description: 'SWIR1, NIR, Blue highlights canopy water content' },
  { id: 'shortwave_geology', label: 'SWIR Geology / Burn', bands: 'B12,B11,B04', description: 'SWIR2, SWIR1, Red discriminates bare minerals & ash' }
];

/**
 * Multi-Temporal Scene Stacking, Statistical Reducers & Quality Mosaics Studio Modal (Cycle v2.5.28, Task T-230).
 * 
 * Provides interactive multi-month date range scrubber, contributing scene catalog,
 * statistical reducer method selector (median, mean, max_ndvi, min_cloud, p25, p75),
 * covariance preservation analyzer, quality tier scoring, and dynamic Leaflet TileLayer integration.
 */
export default function TemporalCompositeModal({
  isOpen,
  onClose,
  onApply,
  _activeBbox = [-121.25, 36.90, -120.65, 37.45]
}) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('stack'); // 'stack' | 'reducers' | 'quality' | 'tiles'

  // Temporal window & stack selection
  const [compositeId, setCompositeId] = useState('COMP_SENTINEL2_CALIFORNIA_2026');
  const [collection, setCollection] = useState('sentinel-2-l2a');
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState('2026-08-31');
  const [maxCloudCover, setMaxCloudCover] = useState(25.0);
  const [excludedSceneIds, setExcludedSceneIds] = useState([]);

  // Reducer configuration
  const [selectedReducer, setSelectedReducer] = useState(TEMPORAL_REDUCER_METHODS.MEDIAN);
  const [qualityBand, setQualityBand] = useState('NDVI');

  // Visualization & tile symbology
  const [selectedBandPreset, setSelectedBandPreset] = useState('true_color');
  const [customBands, setCustomBands] = useState('B04,B03,B02');
  const [activeColormap, setActiveColormap] = useState('spectral');
  const [rescaleMin, setRescaleMin] = useState(0.0);
  const [rescaleMax, setRescaleMax] = useState(0.35);
  const [layerOpacity, setLayerOpacity] = useState(0.90);
  const [blendMode, setBlendMode] = useState('normal');

  // UI state
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [scrubberIndex, setScrubberIndex] = useState(0);
  const [isPlayingScrubber, setIsPlayingScrubber] = useState(false);

  // Clipboard copy handler
  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Filter scenes by date range and max cloud cover
  const availableScenes = useMemo(() => {
    return TEMPORAL_BENCHMARK_SCENES.map((scene) => {
      const qScore = calculatePixelQualityScore(
        scene.cloud_cover_pct,
        scene.mean_sun_elevation,
        0.0
      );
      const isDateMatch = scene.acquisition_date >= startDate && scene.acquisition_date <= (endDate + 'T23:59:59Z');
      const isCloudMatch = scene.cloud_cover_pct <= maxCloudCover;
      const isIncluded = isDateMatch && isCloudMatch && !excludedSceneIds.includes(scene.scene_id);

      return {
        ...scene,
        quality_score: qScore,
        is_date_match: isDateMatch,
        is_cloud_match: isCloudMatch,
        is_included: isIncluded
      };
    });
  }, [startDate, endDate, maxCloudCover, excludedSceneIds]);

  // Contributing (active) scenes
  const contributingScenes = useMemo(() => {
    return availableScenes.filter((s) => s.is_included);
  }, [availableScenes]);

  // Scene stack telemetry metrics
  const stackTelemetry = useMemo(() => {
    const totalCount = contributingScenes.length;
    if (totalCount === 0) {
      return {
        totalScenes: 0,
        meanCloudCover: 0,
        meanSunElevation: 0,
        meanQualityScore: 0,
        clearPixelPct: 0,
        qualityTier: TEMPORAL_QUALITY_TIERS.POOR,
        temporalWindowDays: 0,
        estimatedCubeSizeMb: 0
      };
    }

    const sumCloud = contributingScenes.reduce((acc, s) => acc + s.cloud_cover_pct, 0.0);
    const sumSun = contributingScenes.reduce((acc, s) => acc + s.mean_sun_elevation, 0.0);
    const sumQ = contributingScenes.reduce((acc, s) => acc + s.quality_score, 0.0);

    const meanCloud = sumCloud / totalCount;
    const meanSun = sumSun / totalCount;
    const meanQ = sumQ / totalCount;
    const clearPct = Math.max(0.0, Math.min(100.0, 100.0 - meanCloud));
    const tier = classifyTemporalCompositeQuality(clearPct, totalCount);

    const dStart = new Date(startDate);
    const dEnd = new Date(endDate);
    const diffTime = Math.abs(dEnd - dStart);
    const windowDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    // 100km MGRS granule ~ 12 bands * 10m/20m res ~ 110MB uncompressed per scene
    const cubeSizeMb = Math.round(totalCount * 110);

    return {
      totalScenes: totalCount,
      meanCloudCover: Number(meanCloud.toFixed(1)),
      meanSunElevation: Number(meanSun.toFixed(1)),
      meanQualityScore: Number(meanQ.toFixed(3)),
      clearPixelPct: Number(clearPct.toFixed(1)),
      qualityTier: tier,
      temporalWindowDays: windowDays,
      estimatedCubeSizeMb: cubeSizeMb
    };
  }, [contributingScenes, startDate, endDate]);

  // Toggle individual scene inclusion
  const handleToggleScene = (sceneId) => {
    setExcludedSceneIds((prev) => {
      if (prev.includes(sceneId)) {
        return prev.filter((id) => id !== sceneId);
      } else {
        return [...prev, sceneId];
      }
    });
  };

  // Load a seasonal preset
  const handleLoadPreset = (preset) => {
    setStartDate(preset.startDate);
    setEndDate(preset.endDate);
    setMaxCloudCover(preset.maxCloudCover);
    setSelectedReducer(preset.recommendedReducer);
    setExcludedSceneIds([]);
    setStatusMessage(`Loaded preset: ${preset.name}`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Select band preset
  const handleBandPresetChange = (presetId) => {
    setSelectedBandPreset(presetId);
    const found = COMPOSITE_BAND_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setCustomBands(found.bands);
    }
  };

  // Dynamic Tile URL Template
  const dynamicTileUrlTemplate = useMemo(() => {
    const isQuality = selectedReducer === TEMPORAL_REDUCER_METHODS.MAX_NDVI || selectedReducer === TEMPORAL_REDUCER_METHODS.MIN_CLOUD;
    if (isQuality) {
      return buildTemporalQualityMosaicTileUrlTemplate({
        collection,
        qualityBand: selectedReducer === TEMPORAL_REDUCER_METHODS.MAX_NDVI ? 'NDVI' : 'cloud_prob',
        startDate,
        endDate,
        maxCloudCoverPct: maxCloudCover,
        bands: customBands,
        colormap: activeColormap,
        rescale: `${rescaleMin},${rescaleMax}`
      });
    }

    return buildTemporalCompositeTileUrlTemplate({
      collection,
      reducer: selectedReducer,
      startDate,
      endDate,
      maxCloudCoverPct: maxCloudCover,
      bands: customBands,
      colormap: activeColormap,
      rescale: `${rescaleMin},${rescaleMax}`,
      qualityBand: selectedReducer === TEMPORAL_REDUCER_METHODS.MAX_NDVI ? 'NDVI' : undefined
    });
  }, [collection, selectedReducer, startDate, endDate, maxCloudCover, customBands, activeColormap, rescaleMin, rescaleMax]);

  // Pixel Profile Simulation Data across dates for Tab 2 Visualizer
  const simulatedPixelProfile = useMemo(() => {
    const dates = contributingScenes.map((s) => s.acquisition_date.split('T')[0]);
    // Synthesize physical reflectance profiles across dates with cloud dip
    const redValues = contributingScenes.map((s) => {
      const isCloudy = s.cloud_cover_pct > 10.0;
      return isCloudy ? 0.28 : Math.max(0.04, 0.08 - 0.04 * (s.mean_ndvi || 0.4));
    });
    const nirValues = contributingScenes.map((s) => {
      const isCloudy = s.cloud_cover_pct > 10.0;
      return isCloudy ? 0.32 : Math.max(0.20, (s.mean_ndvi || 0.4) * 0.75 + 0.08);
    });

    const ndviValues = redValues.map((r, i) => {
      const n = nirValues[i];
      const denom = n + r;
      return denom > 0.001 ? Number(((n - r) / denom).toFixed(3)) : 0.0;
    });

    // Compute reduced values
    const reducedRed = applyTemporalReduction(redValues, selectedReducer);
    const reducedNir = applyTemporalReduction(nirValues, selectedReducer);
    let reducedNdvi = 0;

    if (selectedReducer === TEMPORAL_REDUCER_METHODS.MAX_NDVI) {
      // Find argmax date index
      let maxIdx = 0;
      let maxVal = -Infinity;
      ndviValues.forEach((val, idx) => {
        if (val > maxVal) {
          maxVal = val;
          maxIdx = idx;
        }
      });
      reducedNdvi = ndviValues[maxIdx];
    } else {
      const denom = reducedNir + reducedRed;
      reducedNdvi = denom > 0.001 ? Number(((reducedNir - reducedRed) / denom).toFixed(3)) : 0.0;
    }

    return {
      dates,
      redValues,
      nirValues,
      ndviValues,
      reducedRed: Number(reducedRed.toFixed(3)),
      reducedNir: Number(reducedNir.toFixed(3)),
      reducedNdvi: Number(reducedNdvi.toFixed(3))
    };
  }, [contributingScenes, selectedReducer]);

  // Automated scrubber playback ticker
  React.useEffect(() => {
    let timer = null;
    if (isPlayingScrubber && contributingScenes.length > 1) {
      timer = setInterval(() => {
        setScrubberIndex((prev) => (prev + 1) % contributingScenes.length);
      }, 1200);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlayingScrubber, contributingScenes.length]);

  // Handle composite synthesis and map application
  const handleApplyComposite = async () => {
    setIsSynthesizing(true);
    setStatusMessage('Compiling multi-temporal STAC data cube...');

    try {
      // Query backend or demo adapter
      await fetchTemporalComposite({
        composite_id: compositeId,
        collection,
        reducer: selectedReducer,
        start_date: startDate,
        end_date: endDate,
        max_cloud_cover_pct: maxCloudCover,
        bands: customBands,
        quality_band: qualityBand,
        bbox: _activeBbox
      });

      const payload = {
        compositeId,
        collection,
        reducer: selectedReducer,
        startDate,
        endDate,
        maxCloudCoverPct: maxCloudCover,
        bands: customBands,
        colormap: activeColormap,
        rescale: `${rescaleMin},${rescaleMax}`,
        qualityBand,
        opacity: layerOpacity,
        blendMode,
        scenesIncluded: contributingScenes.length,
        qualityTier: stackTelemetry.qualityTier,
        clearPixelPct: stackTelemetry.clearPixelPct,
        tileUrlTemplate: dynamicTileUrlTemplate
      };

      if (onApply) {
        onApply(payload);
      }

      setStatusMessage('Seasonal composite successfully applied to Map!');
      setTimeout(() => {
        setIsSynthesizing(false);
        if (onClose) onClose();
      }, 700);
    } catch {
      setIsSynthesizing(false);
      setStatusMessage('Error synthesizing composite. Applied fallback tile template.');
      if (onApply) {
        onApply({
          compositeId,
          collection,
          reducer: selectedReducer,
          startDate,
          endDate,
          maxCloudCoverPct: maxCloudCover,
          bands: customBands,
          colormap: activeColormap,
          rescale: `${rescaleMin},${rescaleMax}`,
          qualityBand,
          opacity: layerOpacity,
          blendMode,
          scenesIncluded: contributingScenes.length,
          qualityTier: stackTelemetry.qualityTier,
          clearPixelPct: stackTelemetry.clearPixelPct,
          tileUrlTemplate: dynamicTileUrlTemplate
        });
      }
      setTimeout(() => {
        if (onClose) onClose();
      }, 1000);
    }
  };

  if (!isOpen) return null;

  const currentScrubberScene = contributingScenes[scrubberIndex] || contributingScenes[0];
  const activeReducerConfig = TEMPORAL_REDUCER_CONFIGS[selectedReducer] || TEMPORAL_REDUCER_CONFIGS.median;
  const activeQualityConfig = TEMPORAL_QUALITY_TIER_CONFIGS[stackTelemetry.qualityTier] || TEMPORAL_QUALITY_TIER_CONFIGS.good;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-5xl bg-zinc-950 border border-emerald-500/40 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.15)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Layers className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Temporal Composite Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Cycle v2.5.28
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-zinc-800 text-slate-300">
                  Sentinel-2 L2A Cube
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Multi-temporal scene stacking, statistical reducers (median, mean, P25, P75) & covariance-preserving quality mosaics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-zinc-800 bg-zinc-900/30 text-xs font-mono">
          <button
            onClick={() => setActiveTab('stack')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all font-bold ${
              activeTab === 'stack'
                ? 'bg-zinc-950 text-emerald-400 border-t-2 border-emerald-500 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1. Stack Scrubber ({contributingScenes.length} Scenes)</span>
          </button>
          <button
            onClick={() => setActiveTab('reducers')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all font-bold ${
              activeTab === 'reducers'
                ? 'bg-zinc-950 text-emerald-400 border-t-2 border-emerald-500 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>2. Statistical Reducer ({activeReducerConfig.badge})</span>
          </button>
          <button
            onClick={() => setActiveTab('quality')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all font-bold ${
              activeTab === 'quality'
                ? 'bg-zinc-950 text-emerald-400 border-t-2 border-emerald-500 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>3. Quality Metrics ({stackTelemetry.clearPixelPct}% Clear)</span>
          </button>
          <button
            onClick={() => setActiveTab('tiles')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg transition-all font-bold ${
              activeTab === 'tiles'
                ? 'bg-zinc-950 text-emerald-400 border-t-2 border-emerald-500 shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900/50'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>4. XYZ Tiles & Rendering</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: SCENE STACK SCRUBBER */}
          {activeTab === 'stack' && (
            <div className="space-y-6">
              
              {/* Seasonal Presets Quick Pick */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    Seasonal Phenology Presets
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">Auto-aligns date window & reducer</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {SEASONAL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleLoadPreset(preset)}
                      className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-emerald-500/40 transition-all text-left flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {preset.name.split('(')[0]}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-2">
                          {preset.description}
                        </p>
                      </div>
                      <div className="mt-2 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <span>{preset.startDate} → {preset.endDate}</span>
                        <span className="text-emerald-400 font-bold uppercase">{preset.recommendedReducer}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Composite ID & Collection Parameters */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">Composite Identifier</label>
                  <input
                    type="text"
                    value={compositeId}
                    onChange={(e) => setCompositeId(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">Satellite Collection</label>
                  <select
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="sentinel-2-l2a">Sentinel-2 L2A (10m/20m BOA Multi-Spectral)</option>
                    <option value="landsat-c2-l2">Landsat 8/9 C2 L2 (30m Surface Reflectance)</option>
                  </select>
                </div>
              </div>

              {/* Date Window & Cloud Threshold Controls */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">Start Acquisition Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-400 mb-1.5">End Acquisition Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-zinc-400">Max Scene Cloud Cover</span>
                    <span className="text-emerald-400 font-bold">{maxCloudCover}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={maxCloudCover}
                    onChange={(e) => setMaxCloudCover(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-1">
                    <span>5% (Strict)</span>
                    <span>25% (Balanced)</span>
                    <span>60% (Permissive)</span>
                  </div>
                </div>
              </div>

              {/* Interactive Timeline Scrubber */}
              {contributingScenes.length > 0 && (
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <Clock className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-white">Acquisition Stack Timeline Scrubber</span>
                      <span className="text-zinc-500">
                        (Scene {scrubberIndex + 1} of {contributingScenes.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setScrubberIndex((prev) => (prev > 0 ? prev - 1 : contributingScenes.length - 1))}
                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-slate-300"
                        title="Previous Scene"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setIsPlayingScrubber(!isPlayingScrubber)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono font-bold ${
                          isPlayingScrubber ? 'bg-amber-600 text-white' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        {isPlayingScrubber ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isPlayingScrubber ? 'Pause' : 'Play Stack'}</span>
                      </button>
                      <button
                        onClick={() => setScrubberIndex((prev) => (prev + 1) % contributingScenes.length)}
                        className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-slate-300"
                        title="Next Scene"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scrubber Range Slider */}
                  <div className="space-y-1">
                    <input
                      type="range"
                      min="0"
                      max={contributingScenes.length - 1}
                      value={scrubberIndex}
                      onChange={(e) => setScrubberIndex(Number(e.target.value))}
                      className="w-full accent-emerald-500 bg-zinc-800 h-2 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      {contributingScenes.map((s, idx) => (
                        <span
                          key={s.scene_id}
                          className={`cursor-pointer ${idx === scrubberIndex ? 'text-emerald-400 font-bold' : ''}`}
                          onClick={() => setScrubberIndex(idx)}
                        >
                          {s.acquisition_date.split('T')[0].slice(5)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Active Scrubber Scene Details Card */}
                  {currentScrubberScene && (
                    <div className="p-3 rounded-lg border border-zinc-800 bg-zinc-950/70 flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{currentScrubberScene.scene_id}</span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300">
                            Q-Score: {currentScrubberScene.quality_score}
                          </span>
                        </div>
                        <div className="text-zinc-400 text-[11px] mt-0.5">
                          Acquired: {currentScrubberScene.acquisition_date} • Sun Elevation: {currentScrubberScene.mean_sun_elevation}° • Orbit: {currentScrubberScene.orbit_direction}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-emerald-400 font-bold">
                          Cloud: {currentScrubberScene.cloud_cover_pct}%
                        </div>
                        <div className="text-zinc-500 text-[11px]">
                          NDVI Mean: {currentScrubberScene.mean_ndvi || 0.45}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Scene Stack Catalog Table */}
              <div className="border border-zinc-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white uppercase">Candidate Sentinel-2 Acquisitions</span>
                    <span className="text-zinc-500">({availableScenes.length} Cataloged)</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                    <span>Included: <strong className="text-emerald-400">{contributingScenes.length}</strong></span>
                    <span>Excluded: <strong className="text-rose-400">{availableScenes.length - contributingScenes.length}</strong></span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-900/40 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-2.5">Include</th>
                        <th className="px-4 py-2.5">Scene Identifier</th>
                        <th className="px-4 py-2.5">Acquisition Date</th>
                        <th className="px-4 py-2.5">Cloud %</th>
                        <th className="px-4 py-2.5">Sun Elev °</th>
                        <th className="px-4 py-2.5">Mean NDVI</th>
                        <th className="px-4 py-2.5">Usability Q</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 text-slate-300">
                      {availableScenes.map((scene) => (
                        <tr
                          key={scene.scene_id}
                          className={`hover:bg-zinc-900/40 transition-colors ${
                            scene.is_included ? '' : 'opacity-50 bg-zinc-950/40'
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <input
                              type="checkbox"
                              checked={scene.is_included}
                              onChange={() => handleToggleScene(scene.scene_id)}
                              className="rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 h-4 w-4 bg-zinc-900 cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2.5 font-bold text-white truncate max-w-[220px]">
                            {scene.scene_id}
                          </td>
                          <td className="px-4 py-2.5 text-zinc-300">
                            {scene.acquisition_date.split('T')[0]}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={scene.cloud_cover_pct <= 5 ? 'text-emerald-400 font-bold' : scene.cloud_cover_pct <= 15 ? 'text-amber-400' : 'text-rose-400'}>
                              {scene.cloud_cover_pct}%
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-zinc-400">
                            {scene.mean_sun_elevation}°
                          </td>
                          <td className="px-4 py-2.5 text-zinc-300">
                            {scene.mean_ndvi || 0.42}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className="bg-emerald-500 h-full rounded-full"
                                  style={{ width: `${scene.quality_score * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-zinc-400">{scene.quality_score}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {scene.is_included ? (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                Active Stack
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-800 text-zinc-400">
                                {!scene.is_date_match ? 'Out of Date' : !scene.is_cloud_match ? 'High Cloud' : 'Excluded'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: STATISTICAL REDUCERS & QUALITY MOSAICS */}
          {activeTab === 'reducers' && (
            <div className="space-y-6">

              {/* Reducer Selector Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                    <Filter className="w-4 h-4 text-emerald-400" />
                    Temporal Reducer Algorithm Selection
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                    Choose between standard pixel-by-pixel statistical reducers or physical covariance-preserving quality mosaics
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-zinc-500 uppercase">Selected Mode:</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                    {activeReducerConfig.label}
                  </span>
                </div>
              </div>

              {/* Reducer Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.values(TEMPORAL_REDUCER_CONFIGS).map((config) => {
                  const isSelected = selectedReducer === config.id;
                  const isQualityMosaic = config.is_quality_mosaic;

                  return (
                    <button
                      key={config.id}
                      onClick={() => setSelectedReducer(config.id)}
                      className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500'
                          : 'border-zinc-800 bg-zinc-900/30 hover:bg-zinc-900 hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-xs font-bold ${isSelected ? 'text-emerald-400' : 'text-white'}`}>
                            {config.label}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                              isQualityMosaic
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-zinc-800 text-slate-300'
                            }`}
                          >
                            {config.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">
                          {config.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-500">
                        <span>Rec. Window: {config.recommended_window_days}d</span>
                        <span className={config.preserves_covariance ? 'text-emerald-400 font-bold' : 'text-zinc-500'}>
                          {config.preserves_covariance ? '✓ Covariance' : '✗ Per-Band'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Quality Band Selector for Covariance-Preserving Mosaics */}
              {activeReducerConfig.is_quality_mosaic && (
                <div className="p-3 bg-zinc-900/50 rounded-xl border border-emerald-500/40 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-white font-bold">Quality Ranking Band Index:</span>
                    <span className="text-zinc-400 text-[11px]">(Pixel-level argmax criterion)</span>
                  </div>
                  <select
                    value={qualityBand}
                    onChange={(e) => setQualityBand(e.target.value)}
                    className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-emerald-300 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="NDVI">NDVI (Normalized Difference Vegetation Index)</option>
                    <option value="cloud_prob">Cloud Probability (Lowest Cloud Cover)</option>
                    <option value="EVI">EVI (Enhanced Vegetation Index)</option>
                    <option value="NDMI">NDMI (Normalized Difference Moisture Index)</option>
                  </select>
                </div>
              )}

              {/* Physical Covariance Preservation Banner */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs font-mono space-y-1">
                  <div className="font-bold text-emerald-300 uppercase tracking-wide">
                    Scientific Rigor: Statistical Median vs. Covariance-Preserving Quality Mosaics
                  </div>
                  <p className="text-zinc-300 leading-relaxed">
                    Computing a per-band temporal median (Flood 2013) rejects transient clouds, but can combine Band 4 (Red) from July with Band 8 (NIR) from August, generating synthetic spectral combinations that violate physical radiative transfer laws.
                  </p>
                  <p className="text-emerald-400/90 leading-relaxed font-semibold">
                    Quality Mosaics (Greenest-Pixel Max NDVI / Clearest-Pixel Min Cloud) select <strong>all spectral bands simultaneously</strong> from the single acquisition date where the quality metric is maximized per pixel, guaranteeing 100% true physical band covariance across the entire raster cube.
                  </p>
                </div>
              </div>

              {/* Simulated Time-Series Reduction Visualizer */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Simulated Pixel Surface Reflectance Reduction Curve
                  </span>
                  <span className="text-zinc-500">
                    Contributing Dates: {simulatedPixelProfile.dates.length}
                  </span>
                </div>

                {/* SVG Visualizer */}
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                        Red (B04): <strong>{simulatedPixelProfile.reducedRed}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        NIR (B08): <strong>{simulatedPixelProfile.reducedNir}</strong>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
                        NDVI: <strong>{simulatedPixelProfile.reducedNdvi}</strong>
                      </span>
                    </div>
                    <span className="text-zinc-500 text-[10px]">Method: {selectedReducer}</span>
                  </div>

                  {/* SVG Chart */}
                  <svg className="w-full h-32 overflow-visible" viewBox="0 0 500 100" preserveAspectRatio="none">
                    {/* Grid lines */}
                    <line x1="0" y1="20" x2="500" y2="20" stroke="#27272a" strokeDasharray="3 3" />
                    <line x1="0" y1="50" x2="500" y2="50" stroke="#27272a" strokeDasharray="3 3" />
                    <line x1="0" y1="80" x2="500" y2="80" stroke="#27272a" strokeDasharray="3 3" />

                    {/* Red Polyline */}
                    <polyline
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2"
                      points={simulatedPixelProfile.redValues
                        .map((v, i) => {
                          const x = (i / (simulatedPixelProfile.redValues.length - 1 || 1)) * 480 + 10;
                          const y = 90 - v * 150;
                          return `${x},${Math.max(10, Math.min(90, y))}`;
                        })
                        .join(' ')}
                    />

                    {/* NIR Polyline */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2"
                      points={simulatedPixelProfile.nirValues
                        .map((v, i) => {
                          const x = (i / (simulatedPixelProfile.nirValues.length - 1 || 1)) * 480 + 10;
                          const y = 90 - v * 150;
                          return `${x},${Math.max(10, Math.min(90, y))}`;
                        })
                        .join(' ')}
                    />

                    {/* Reduced Target Output Horizontal Marker */}
                    <line
                      x1="0"
                      y1={Math.max(10, Math.min(90, 90 - simulatedPixelProfile.reducedNir * 150))}
                      x2="500"
                      y2={Math.max(10, Math.min(90, 90 - simulatedPixelProfile.reducedNir * 150))}
                      stroke="#10b981"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                    />
                  </svg>

                  <div className="flex justify-between text-[10px] font-mono text-zinc-500 pt-1">
                    {simulatedPixelProfile.dates.map((d) => (
                      <span key={d}>{d.slice(5)}</span>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: QUALITY METRICS & MASKS */}
          {activeTab === 'quality' && (
            <div className="space-y-6">

              {/* Quality Tier Header Card */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                    Composite Usability Assessment
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xl font-bold font-mono text-white">
                      {stackTelemetry.clearPixelPct}% Clear Surface
                    </span>
                    <span
                      className="px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase"
                      style={{
                        backgroundColor: `${activeQualityConfig.color}20`,
                        color: activeQualityConfig.color,
                        borderColor: `${activeQualityConfig.color}40`,
                        borderWidth: 1
                      }}
                    >
                      {activeQualityConfig.badge}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1 font-mono">
                    Based on cloud-masking dilation, sun zenith angle, and {stackTelemetry.totalScenes} contributing Sentinel-2 scenes.
                  </p>
                </div>

                <div className="text-right font-mono text-xs space-y-1">
                  <div className="text-zinc-400">
                    Mean Sun Elev: <strong className="text-white">{stackTelemetry.meanSunElevation}°</strong>
                  </div>
                  <div className="text-zinc-400">
                    Mean Quality Q: <strong className="text-emerald-400">{stackTelemetry.meanQualityScore}</strong>
                  </div>
                  <div className="text-zinc-400">
                    Cube Data Footprint: <strong className="text-white">{stackTelemetry.estimatedCubeSizeMb} MB</strong>
                  </div>
                </div>
              </div>

              {/* Quality Tiers Threshold Reference */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {Object.values(TEMPORAL_QUALITY_TIER_CONFIGS).map((tier) => {
                  const isCurrent = stackTelemetry.qualityTier === tier.tier;
                  return (
                    <div
                      key={tier.tier}
                      className={`p-3 rounded-xl border font-mono transition-all ${
                        isCurrent
                          ? 'border-emerald-500 bg-zinc-900/80 shadow-md ring-1 ring-emerald-500'
                          : 'border-zinc-800 bg-zinc-900/30 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white uppercase">{tier.tier}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        ≥ {Math.round(tier.min_clear_fraction * 100)}% Clear
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-1">
                        Min {tier.min_scenes} scene{tier.min_scenes > 1 ? 's' : ''} required
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Per-Scene Quality Score Distribution Chart */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-emerald-400" />
                    Per-Scene Usability Quality Score Distribution ($Q$)
                  </span>
                  <span className="text-zinc-500 text-[11px]">
                    $Q = (1 - C_{`\\text{cloud}`}/100) \cdot \sin(\theta_{`\\text{sun}`})$
                  </span>
                </div>

                <div className="space-y-2">
                  {contributingScenes.map((scene) => (
                    <div key={scene.scene_id} className="flex items-center gap-3 text-xs">
                      <span className="w-24 text-zinc-400 text-[11px] truncate">
                        {scene.acquisition_date.split('T')[0]}
                      </span>
                      <div className="flex-1 bg-zinc-800 h-3 rounded-full overflow-hidden flex">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-500"
                          style={{ width: `${scene.quality_score * 100}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-bold text-emerald-400 text-[11px]">
                        {scene.quality_score}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: XYZ TILES & RENDERING */}
          {activeTab === 'tiles' && (
            <div className="space-y-6">

              {/* Band Preset & Custom Combination */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/30 space-y-3 font-mono">
                <label className="block text-xs font-bold text-white uppercase">
                  Spectral Band Preset Combination
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {COMPOSITE_BAND_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleBandPresetChange(p.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedBandPreset === p.id
                          ? 'border-emerald-500 bg-emerald-950/20 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 text-slate-300'
                      }`}
                    >
                      <div className="font-bold text-xs">{p.label}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">{p.description}</div>
                      <div className="text-[10px] text-emerald-400 mt-1 font-bold">Bands: {p.bands}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Custom Band Sequence</label>
                  <input
                    type="text"
                    value={customBands}
                    onChange={(e) => setCustomBands(e.target.value)}
                    placeholder="B04,B03,B02"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Colormap, Contrast Stretch & Canvas Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1.5">Colormap Ramp</label>
                  <select
                    value={activeColormap}
                    onChange={(e) => setActiveColormap(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="spectral">Spectral (Biophysical)</option>
                    <option value="viridis">Viridis (Perceptual)</option>
                    <option value="plasma">Plasma (Thermal)</option>
                    <option value="turbo">Turbo (High-Dynamic)</option>
                    <option value="terrain">Terrain / DEM</option>
                    <option value="rdylbu">RdYlBu (Moisture Delta)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                    <span>Rescale Range</span>
                    <span className="text-emerald-400 font-bold">{rescaleMin} - {rescaleMax}</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.05"
                      value={rescaleMin}
                      onChange={(e) => setRescaleMin(Number(e.target.value))}
                      className="w-1/2 px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-white text-xs"
                    />
                    <input
                      type="number"
                      step="0.05"
                      value={rescaleMax}
                      onChange={(e) => setRescaleMax(Number(e.target.value))}
                      className="w-1/2 px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                    <span>Tile Layer Opacity</span>
                    <span className="text-emerald-400 font-bold">{Math.round(layerOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={layerOpacity}
                    onChange={(e) => setLayerOpacity(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-zinc-800 h-2 rounded-lg cursor-pointer mt-2"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 mb-1.5">Canvas Blend Mode</label>
                  <select
                    value={blendMode}
                    onChange={(e) => setBlendMode(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="normal">Normal (Standard)</option>
                    <option value="multiply">Multiply (Burn to Basemap)</option>
                    <option value="screen">Screen (Lighten)</option>
                    <option value="overlay">Overlay (High Contrast)</option>
                  </select>
                </div>
              </div>

              {/* RFC 3986 Tile URL Template Preview */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 font-mono">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                    RFC 3986 XYZ Composite Tile Template
                  </span>
                  <button
                    onClick={() => handleCopy(dynamicTileUrlTemplate, 'tileUrl')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-emerald-400 transition-colors"
                  >
                    {copiedKey === 'tileUrl' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'tileUrl' ? 'Copied' : 'Copy Tile URL'}</span>
                  </button>
                </div>
                <div className="p-2.5 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px] text-emerald-300 break-all select-all">
                  {dynamicTileUrlTemplate}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/60 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            {statusMessage && (
              <span className="text-xs font-mono text-emerald-400 animate-pulse">
                {statusMessage}
              </span>
            )}
            {!statusMessage && (
              <span className="text-xs font-mono text-zinc-500">
                Stack: <strong>{contributingScenes.length} scenes</strong> • Method: <strong>{activeReducerConfig.label}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyComposite}
              disabled={isSynthesizing || contributingScenes.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-mono font-bold tracking-wide transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSynthesizing ? 'Synthesizing...' : 'Apply Composite to Map'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
