import React, { useState, useMemo } from 'react';
import {
  X, Layers, Sliders, Check, Copy, CheckCircle2,
  Activity, ShieldAlert, Waves, Eye, Filter, Info,
  Sparkles, ArrowRight, Radio, Compass, RefreshCw, BarChart3,
  Cpu, Droplet, Mountain, Zap
} from 'lucide-react';
import {
  SarPolarization,
  SAR_POLARIZATIONS,
  SAR_POLARIZATION_CONFIGS,
  SPECKLE_FILTER_METHODS,
  SPECKLE_FILTER_CONFIGS,
  SAR_FLOOD_DETECTION_TIERS,
  SAR_FLOOD_TIER_CONFIGS,
  SAR_BENCHMARK_SCENES,
  SAR_BACKSCATTER_CALIBRATIONS,
  calculatePolarizationRatioDb,
  calculatePolarizationRatioLinear,
  calculateNormalizedDifferencePolarizationIndex,
  applyTerrainFlatteningGamma0,
  classifySarFloodTier,
  classifySarWaterPixels,
  calculateRefinedLeeFilterWeights,
  applySpeckleFilter,
  buildSarBackscatterTileUrlTemplate,
  buildSarFloodTileUrlTemplate
} from '../config/constants.js';
import { fetchSarBackscatter } from '../api/giosApi.js';

/**
 * Common colormap ramps for SAR backscatter rendering.
 */
const SAR_COLORMAP_OPTIONS = [
  { id: 'gray', label: 'Radar Grayscale', description: 'Standard high-contrast radar backscatter' },
  { id: 'viridis', label: 'Viridis (Scientific)', description: 'Perceptually uniform volume-to-surface transition' },
  { id: 'blues', label: 'Hydrology Blues', description: 'Optimized for specular water vs land thresholding' },
  { id: 'plasma', label: 'Plasma Radiance', description: 'Intense thermal/radar multi-scattering ramp' },
  { id: 'turbo', label: 'Turbo Spectrum', description: 'Smooth rainbow scale across full decibel range' },
  { id: 'coolwarm', label: 'Cool-Warm Divergent', description: 'Highlights anomaly deviations above/below median' }
];

/**
 * SAR All-Weather Radar Studio Modal (Cycle v2.5.29, Task T-236).
 * 
 * Provides interactive Sentinel-1 C-band SAR dual-polarization visualization,
 * adaptive speckle filtering (Refined Lee, Frost, Kuan, Gamma MAP), cross-polarization
 * ratio inversion (VH/VV), calibrated decibel scale analysis, automated flood
 * inundation thresholding, and dynamic Leaflet TileLayer integration.
 */
export default function SarRadarStudioModal({
  isOpen,
  onClose,
  onApply,
  _activeBbox = [-121.25, 36.90, -120.65, 37.45]
}) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('polarization'); // 'polarization' | 'speckle' | 'flood' | 'tiles'

  // Scene & Mission Configuration
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [collection, setCollection] = useState('sentinel-1-rtc');
  const [calibration, setCalibration] = useState(SAR_BACKSCATTER_CALIBRATIONS.GAMMA0);

  // Polarization Channel Configuration
  const [polarization, setPolarization] = useState(SarPolarization.VV);
  const [displayMode, setDisplayMode] = useState('backscatter'); // 'backscatter' | 'flood_mask' | 'dual_pol_rgb'

  // Speckle Filtering Configuration
  const [speckleFilter, setSpeckleFilter] = useState(SPECKLE_FILTER_METHODS.REFINED_LEE);
  const [kernelSize, setKernelSize] = useState(5);
  const [numLooks, setNumLooks] = useState(4.4); // Equivalent Number of Looks for Sentinel-1 GRD

  // Flood Inundation & Thresholding Configuration
  const [floodThresholdDb, setFloodThresholdDb] = useState(-16.5); // Calm water default
  const [enableTerrainFlattening, setEnableTerrainFlattening] = useState(true);
  const [localIncidenceAngleDeg, setLocalIncidenceAngleDeg] = useState(38.6);

  // Visualization & Leaflet Tile Layer Configuration
  const [activeColormap, setActiveColormap] = useState('gray');
  const [rescaleMin, setRescaleMin] = useState(-25.0);
  const [rescaleMax, setRescaleMax] = useState(0.0);
  const [layerOpacity, setLayerOpacity] = useState(0.90);
  const [canvasBlendMode, setCanvasBlendMode] = useState('normal');

  // Interactive UI & Network States
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Active Scene Metadata
  const activeScene = SAR_BENCHMARK_SCENES[selectedSceneIndex] || SAR_BENCHMARK_SCENES[0];

  // Dynamically update default rescale when polarization changes
  const handlePolarizationChange = (newPol) => {
    setPolarization(newPol);
    if (newPol === SarPolarization.VH) {
      setRescaleMin(-30.0);
      setRescaleMax(-5.0);
    } else if (newPol === SarPolarization.RATIO_VH_VV) {
      setRescaleMin(-15.0);
      setRescaleMax(0.0);
      setActiveColormap('viridis');
    } else {
      setRescaleMin(-25.0);
      setRescaleMax(0.0);
      setActiveColormap('gray');
    }
  };

  // Cross-Polarization Telemetry Calculations
  const sarTelemetry = useMemo(() => {
    const meanVv = activeScene.mean_vv_db ?? -11.8;
    const meanVh = activeScene.mean_vh_db ?? -18.4;
    const ratioDb = calculatePolarizationRatioDb(meanVh, meanVv);
    const ndpi = calculateNormalizedDifferencePolarizationIndex(meanVv, meanVh);
    const linearVv = Math.pow(10.0, meanVv / 10.0);
    const linearVh = Math.pow(10.0, meanVh / 10.0);
    const ratioLinear = calculatePolarizationRatioLinear(linearVh, linearVv);

    // Terrain flattened gamma0
    const gamma0Vv = enableTerrainFlattening 
      ? applyTerrainFlatteningGamma0(meanVv, localIncidenceAngleDeg, true)
      : meanVv;

    // Dominant scattering tier for active mean
    const dominantTier = classifySarFloodTier(meanVv);

    return {
      meanVv,
      meanVh,
      ratioDb,
      ndpi,
      ratioLinear,
      gamma0Vv,
      dominantTier
    };
  }, [activeScene, enableTerrainFlattening, localIncidenceAngleDeg]);

  // Synthetic Transect Profile for Tab 2 Visualizer: Water-to-Land Edge
  const transectSimulation = useMemo(() => {
    // 32-sample transect: indices 0..11 are water (approx -20 dB), 12..31 are land (approx -10 dB)
    const rawNoisy = [];
    const sampleCount = 32;
    for (let i = 0; i < sampleCount; i += 1) {
      const isWater = i < 12;
      const baseDb = isWater ? -21.0 : -9.5;
      // Multiplicative Rayleigh-like speckle noise in dB
      const noise = (Math.sin(i * 3.7) * 2.8 + Math.cos(i * 1.9) * 2.2);
      rawNoisy.push(Number((baseDb + noise).toFixed(2)));
    }

    // Apply speckle filter algorithm
    const filtered = applySpeckleFilter(rawNoisy, speckleFilter, kernelSize, numLooks);

    // Filter variance reduction and mean preservation metrics
    const rawMean = rawNoisy.reduce((a, b) => a + b, 0) / sampleCount;
    const filtMean = filtered.reduce((a, b) => a + b, 0) / sampleCount;
    const rawVar = rawNoisy.reduce((a, b) => a + Math.pow(b - rawMean, 2), 0) / sampleCount;
    const filtVar = filtered.reduce((a, b) => a + Math.pow(b - filtMean, 2), 0) / sampleCount;
    const varianceReductionRatio = filtVar > 0 ? Number((rawVar / filtVar).toFixed(2)) : 1.0;
    const meanDiffDb = Number(Math.abs(filtMean - rawMean).toFixed(3));

    // Dynamic Lee weight at the edge (sample 12)
    const edgeLeeWeight = calculateRefinedLeeFilterWeights(filtMean, filtVar, numLooks);

    return {
      rawNoisy,
      filtered,
      rawMean: Number(rawMean.toFixed(2)),
      filtMean: Number(filtMean.toFixed(2)),
      varianceReductionRatio,
      meanDiffDb,
      edgeLeeWeight
    };
  }, [speckleFilter, kernelSize, numLooks]);

  // Water Inundation Statistics calculation
  const waterStats = useMemo(() => {
    // Representative synthetic sample distribution across scene
    const syntheticPixelDbArray = [];
    for (let i = 0; i < 200; i += 1) {
      // Bimodal distribution: water mode centered at -20 dB, land mode at -10 dB
      const isWaterSample = (i % 7 === 0) || (selectedSceneIndex === 1 && i % 4 === 0);
      const val = isWaterSample 
        ? -22.0 + (Math.sin(i) * 3.5)
        : -9.0 + (Math.cos(i) * 4.0);
      syntheticPixelDbArray.push(val);
    }

    return classifySarWaterPixels(syntheticPixelDbArray, floodThresholdDb, 0.01);
  }, [selectedSceneIndex, floodThresholdDb]);

  // Dynamic Leaflet Tile URL Template Construction
  const dynamicTileUrlTemplate = useMemo(() => {
    if (displayMode === 'flood_mask') {
      return buildSarFloodTileUrlTemplate({
        collection,
        thresholdDb: floodThresholdDb,
        speckleFilter
      });
    }

    return buildSarBackscatterTileUrlTemplate({
      collection,
      polarization,
      speckleFilter,
      kernelSize,
      calibration,
      colormap: activeColormap,
      rescale: `${rescaleMin},${rescaleMax}`
    });
  }, [displayMode, collection, polarization, speckleFilter, kernelSize, calibration, activeColormap, rescaleMin, rescaleMax, floodThresholdDb]);

  // Handle URL Copy
  const handleCopyTileUrl = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(dynamicTileUrlTemplate);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // Trigger Backend Analysis via API
  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const payload = {
        bbox: _activeBbox,
        collection,
        polarization,
        speckle_filter: speckleFilter,
        filter_kernel_size: kernelSize,
        calibration,
        water_threshold_db: floodThresholdDb
      };
      const res = await fetchSarBackscatter(payload);
      setAnalysisResult(res);
    } catch (err) {
      console.warn('SAR Backscatter API returned error, falling back to client telemetry:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Dispatch live configuration to MapExplorer
  const handleApplyToMap = () => {
    if (onApply) {
      onApply({
        sceneId: activeScene.scene_id,
        collection,
        polarization,
        displayMode,
        speckleFilter,
        kernelSize,
        numLooks,
        calibration,
        floodThresholdDb,
        enableTerrainFlattening,
        localIncidenceAngleDeg,
        colormap: activeColormap,
        rescale: `${rescaleMin},${rescaleMax}`,
        opacity: layerOpacity,
        blendMode: canvasBlendMode,
        tileUrlTemplate: dynamicTileUrlTemplate,
        waterFraction: waterStats.waterFraction,
        waterAreaHa: waterStats.waterAreaHa,
        meanVvDb: sarTelemetry.meanVv,
        meanVhDb: sarTelemetry.meanVh,
        ratioDb: sarTelemetry.ratioDb
      });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="glass-panel w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl border border-violet-500/40 bg-zinc-950/95 shadow-2xl overflow-hidden font-sans text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sar-studio-title"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-violet-500/30 bg-violet-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="sar-studio-title" className="text-lg font-bold text-white tracking-wide font-mono">
                  SAR All-Weather Radar Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-violet-500/20 text-violet-300 border border-violet-500/40">
                  Cycle v2.5.29
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Sentinel-1 C-Band RTC
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Active Microwave Radar • Cloud, Smoke & Darkness Penetrating Disaster Surveillance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-[0_0_12px_rgba(139,92,246,0.4)] disabled:opacity-50"
              title="Query active STAC radar backscatter summary"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              <span>{isAnalyzing ? 'Analyzing...' : 'Run Analysis'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-gray-800 bg-zinc-900/40 text-xs font-mono">
          <button
            onClick={() => setActiveTab('polarization')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all ${
              activeTab === 'polarization'
                ? 'border-violet-400 text-violet-300 bg-violet-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>1. Polarizations & Channels</span>
          </button>

          <button
            onClick={() => setActiveTab('speckle')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all ${
              activeTab === 'speckle'
                ? 'border-violet-400 text-violet-300 bg-violet-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            <span>2. Adaptive Speckle Filtering</span>
          </button>

          <button
            onClick={() => setActiveTab('flood')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all ${
              activeTab === 'flood'
                ? 'border-violet-400 text-violet-300 bg-violet-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Waves className="w-4 h-4" />
            <span>3. Flood Inundation & Thresholding</span>
          </button>

          <button
            onClick={() => setActiveTab('tiles')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all ${
              activeTab === 'tiles'
                ? 'border-violet-400 text-violet-300 bg-violet-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>4. XYZ Tiles & Rendering</span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: POLARIZATIONS & CHANNELS */}
          {activeTab === 'polarization' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Live API Telemetry Alert if computed */}
              {analysisResult && (
                <div className="p-3 rounded-xl bg-violet-950/60 border border-violet-500/50 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-white font-bold">API Analysis:</span>
                    <span className="text-violet-300">{analysisResult.analysis_id}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-300">
                    <span>Looks: <strong className="text-emerald-400">{analysisResult.summary?.equivalent_number_of_looks || 4.4}</strong></span>
                    <span>Variance Reduction: <strong className="text-cyan-400">{analysisResult.summary?.speckle_variance_reduction_ratio || 4.25}×</strong></span>
                  </div>
                </div>
              )}

              {/* Benchmark Scene Selector */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-violet-400 uppercase">
                    <Compass className="w-4 h-4" />
                    <span>Sentinel-1 RTC Acquisition Scene</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                    <div className="flex items-center gap-1">
                      <span>Collection:</span>
                      <select
                        value={collection}
                        onChange={(e) => setCollection(e.target.value)}
                        className="bg-zinc-950 border border-gray-800 rounded px-1.5 py-0.5 text-white font-bold"
                      >
                        <option value="sentinel-1-rtc">sentinel-1-rtc</option>
                        <option value="sentinel-1-grd">sentinel-1-grd</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <span>Calibration:</span>
                      <select
                        value={calibration}
                        onChange={(e) => setCalibration(e.target.value)}
                        className="bg-zinc-950 border border-gray-800 rounded px-1.5 py-0.5 text-violet-300 font-bold"
                      >
                        <option value={SAR_BACKSCATTER_CALIBRATIONS.GAMMA0}>gamma0 (RTC)</option>
                        <option value={SAR_BACKSCATTER_CALIBRATIONS.SIGMA0}>sigma0 (GRD)</option>
                        <option value={SAR_BACKSCATTER_CALIBRATIONS.BETA0}>beta0 (Radar)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SAR_BENCHMARK_SCENES.map((scene, idx) => (
                    <button
                      key={scene.scene_id}
                      onClick={() => setSelectedSceneIndex(idx)}
                      className={`p-3 rounded-xl text-left border transition-all flex flex-col justify-between ${
                        selectedSceneIndex === idx
                          ? 'border-violet-500 bg-violet-950/40 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
                          : 'border-gray-800 bg-zinc-950/50 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span className="font-bold text-white truncate max-w-[280px]">
                          {scene.scene_id}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-slate-300">
                          {scene.orbit_direction}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 mt-2 pt-2 border-t border-gray-800/60">
                        <div>
                          <span className="text-zinc-500 block">Date</span>
                          <span className="text-slate-200">{scene.acquisition_date.split('T')[0]}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Mean VV</span>
                          <span className="text-cyan-400 font-bold">{scene.mean_vv_db} dB</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Water Extent</span>
                          <span className="text-emerald-400 font-bold">{scene.water_area_pct}%</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Polarization Channel Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Radio className="w-4 h-4 text-violet-400" />
                    <span>Select Polarization Channel / Composite</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    C-Band λ = 5.546 cm (5.405 GHz)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {/* VV Channel */}
                  <button
                    onClick={() => handlePolarizationChange(SarPolarization.VV)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      polarization === SarPolarization.VV && displayMode !== 'dual_pol_rgb'
                        ? 'border-violet-500 bg-violet-950/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                        : 'border-gray-800 bg-zinc-900/40 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-bold text-white">VV Co-Pol</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300">Surface</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Vertical transmit / receive. Direct sensitivity to specular open water, runway surfaces, and soil roughness.
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-cyan-400 font-bold">
                      Mean: {sarTelemetry.meanVv} dB
                    </div>
                  </button>

                  {/* VH Channel */}
                  <button
                    onClick={() => handlePolarizationChange(SarPolarization.VH)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      polarization === SarPolarization.VH && displayMode !== 'dual_pol_rgb'
                        ? 'border-violet-500 bg-violet-950/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                        : 'border-gray-800 bg-zinc-900/40 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-bold text-white">VH Cross-Pol</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300">Volume</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Vertical transmit / horizontal receive. High sensitivity to canopy volume scattering and vegetation biomass.
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-emerald-400 font-bold">
                      Mean: {sarTelemetry.meanVh} dB
                    </div>
                  </button>

                  {/* VH/VV Ratio Channel */}
                  <button
                    onClick={() => handlePolarizationChange(SarPolarization.RATIO_VH_VV)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      polarization === SarPolarization.RATIO_VH_VV && displayMode !== 'dual_pol_rgb'
                        ? 'border-violet-500 bg-violet-950/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                        : 'border-gray-800 bg-zinc-900/40 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-bold text-white">VH/VV Ratio</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/20 text-amber-300">Roughness Cancellation</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      Logarithmic ratio (VH_dB - VV_dB). Normalizes soil roughness and highlights biomass structure.
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-amber-400 font-bold">
                      Ratio: {sarTelemetry.ratioDb} dB
                    </div>
                  </button>

                  {/* Dual-Pol False Color RGB */}
                  <button
                    onClick={() => {
                      setDisplayMode('dual_pol_rgb');
                      setPolarization(SarPolarization.VV);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      displayMode === 'dual_pol_rgb'
                        ? 'border-violet-500 bg-violet-950/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                        : 'border-gray-800 bg-zinc-900/40 hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <span className="font-bold text-white">Dual-Pol RGB</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-violet-500/20 text-violet-300">Composite</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                      RGB false color synthesis: Red = VV, Green = VH, Blue = VH/VV Ratio. Comprehensive multi-scatterer synthesis.
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-violet-400 font-bold">
                      Full Radar Spectrum
                    </div>
                  </button>
                </div>
              </div>

              {/* Cross-Polarization Telemetry Grid */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-gray-800 space-y-3">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <span>Physical Scattering Mechanisms & Radiometry</span>
                </span>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-gray-800/80">
                    <span className="text-zinc-500 text-[10px] block uppercase">Co-Pol Backscatter (VV)</span>
                    <span className="text-cyan-400 font-bold text-sm">{sarTelemetry.meanVv} dB</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Surface roughness</span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-gray-800/80">
                    <span className="text-zinc-500 text-[10px] block uppercase">Cross-Pol Backscatter (VH)</span>
                    <span className="text-emerald-400 font-bold text-sm">{sarTelemetry.meanVh} dB</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Canopy volume</span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-gray-800/80">
                    <span className="text-zinc-500 text-[10px] block uppercase">Cross-Pol Ratio (VH/VV)</span>
                    <span className="text-amber-400 font-bold text-sm">{sarTelemetry.ratioDb} dB</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Linear: {sarTelemetry.ratioLinear}</span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/60 border border-gray-800/80">
                    <span className="text-zinc-500 text-[10px] block uppercase">NDPI Polarization Index</span>
                    <span className="text-violet-400 font-bold text-sm">{sarTelemetry.ndpi}</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Normalized difference</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-violet-950/20 border border-violet-500/20 text-xs text-slate-300 font-mono flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white">Sentinel-1 Radiometric Terrain Correction (RTC):</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Microwave pulses penetrate clouds, smoke, haze, and precipitation completely unimpeded. Unlike optical sensors, C-band SAR illuminates the surface day and night with radar backscatter calibrated in decibels (σ⁰_dB = 10 log₁₀(σ⁰)).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADAPTIVE SPECKLE FILTERING */}
          {activeTab === 'speckle' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Speckle Filter Algorithm Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Filter className="w-4 h-4 text-violet-400" />
                    <span>Speckle Filtering Algorithm</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Active: <span className="text-violet-300 font-bold">{SPECKLE_FILTER_CONFIGS[speckleFilter]?.label}</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(SPECKLE_FILTER_CONFIGS).map(([fid, conf]) => (
                    <button
                      key={fid}
                      onClick={() => setSpeckleFilter(fid)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        speckleFilter === fid
                          ? 'border-violet-500 bg-violet-950/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                          : 'border-gray-800 bg-zinc-900/40 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span className="font-bold text-white">{conf.label}</span>
                        {conf.preserves_edges && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300">
                            Edge-Preserving
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug line-clamp-2">
                        {conf.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Kernel Size & Looks Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-900/40 border border-gray-800">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">Filter Convolution Kernel:</span>
                    <span className="text-violet-400 font-bold">{kernelSize} × {kernelSize} pixels</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {[3, 5, 7, 9].map((k) => (
                      <button
                        key={k}
                        onClick={() => setKernelSize(k)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-all ${
                          kernelSize === k
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'bg-zinc-950/60 border-gray-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {k}×{k}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-zinc-500">
                    Larger kernels increase speckle suppression in broad water/fields, but may soften narrow canal edges.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">Equivalent Number of Looks (ENL):</span>
                    <span className="text-emerald-400 font-bold">{numLooks} Looks</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="16.0"
                    step="0.2"
                    value={numLooks}
                    onChange={(e) => setNumLooks(parseFloat(e.target.value))}
                    className="w-full accent-violet-500 cursor-pointer"
                  />
                  <p className="text-[10px] font-mono text-zinc-500">
                    Defines theoretical speckle standard deviation ratio Cu = 1 / √(ENL) ≈ {(1 / Math.sqrt(numLooks)).toFixed(3)}.
                  </p>
                </div>
              </div>

              {/* Synthetic Transect Profile Comparison Chart (SVG) */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-400" />
                    <span>Radar Speckle Profile Transect (Calm Water to Land Transition)</span>
                  </span>
                  <div className="flex items-center gap-3 text-[10px] font-mono">
                    <span className="flex items-center gap-1.5 text-rose-400">
                      <span className="w-2.5 h-0.5 bg-rose-400 inline-block" />
                      Raw Unfiltered Backscatter
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                      <span className="w-2.5 h-1 bg-emerald-400 inline-block rounded" />
                      {SPECKLE_FILTER_CONFIGS[speckleFilter]?.label}
                    </span>
                  </div>
                </div>

                {/* SVG Transect Chart */}
                <div className="h-44 w-full bg-zinc-950/80 rounded-xl border border-gray-800/80 p-3 relative flex flex-col justify-between">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 320 120" preserveAspectRatio="none">
                    {/* Horizontal Reference Lines (-25 dB, -20 dB, -15 dB, -10 dB, -5 dB) */}
                    {[-25, -20, -15, -10, -5].map((dbVal) => {
                      // Map dB range [-28, -2] to y in [110, 10]
                      const y = 110 - ((dbVal - (-28)) / 26) * 100;
                      return (
                        <g key={dbVal}>
                          <line x1="0" y1={y} x2="320" y2={y} stroke="#27272a" strokeDasharray="3 3" />
                          <text x="4" y={y - 2} fill="#71717a" fontSize="8" fontFamily="monospace">
                            {dbVal} dB
                          </text>
                        </g>
                      );
                    })}

                    {/* Water to Land Boundary Marker at index 12 (x = 12 * 10 = 120) */}
                    <line x1="120" y1="0" x2="120" y2="120" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.6" />
                    <text x="124" y="16" fill="#a78bfa" fontSize="8" fontFamily="monospace" fontWeight="bold">
                      Waterline Boundary
                    </text>

                    {/* Raw Noisy Curve */}
                    <polyline
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="1.2"
                      opacity="0.75"
                      points={transectSimulation.rawNoisy.map((val, idx) => {
                        const x = (idx / 31) * 320;
                        const y = 110 - ((val - (-28)) / 26) * 100;
                        return `${x},${Math.max(5, Math.min(115, y))}`;
                      }).join(' ')}
                    />

                    {/* Filtered Curve */}
                    <polyline
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      points={transectSimulation.filtered.map((val, idx) => {
                        const x = (idx / 31) * 320;
                        const y = 110 - ((val - (-28)) / 26) * 100;
                        return `${x},${Math.max(5, Math.min(115, y))}`;
                      }).join(' ')}
                    />
                  </svg>
                </div>

                {/* Filter Telemetry Cards */}
                <div className="grid grid-cols-3 gap-3 text-xs font-mono pt-1">
                  <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-gray-800">
                    <span className="text-zinc-500 text-[10px] block uppercase">Variance Reduction Factor</span>
                    <span className="text-emerald-400 font-bold">{transectSimulation.varianceReductionRatio}×</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Noise suppression</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-gray-800">
                    <span className="text-zinc-500 text-[10px] block uppercase">Mean Radiance Diff</span>
                    <span className="text-cyan-400 font-bold">{transectSimulation.meanDiffDb} dB</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Energy conserved</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-gray-800">
                    <span className="text-zinc-500 text-[10px] block uppercase">Adaptive Lee Edge Weight</span>
                    <span className="text-violet-400 font-bold">{transectSimulation.edgeLeeWeight}</span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">W ∈ [0.0, 1.0]</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FLOOD INUNDATION & THRESHOLDING */}
          {activeTab === 'flood' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Flood Inundation Threshold Slider */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase">
                    <Waves className="w-4 h-4" />
                    <span>Radar Flood Inundation Backscatter Threshold</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-white bg-cyan-950/80 px-2.5 py-1 rounded border border-cyan-500/40">
                    {floodThresholdDb.toFixed(1)} dB
                  </span>
                </div>

                <input
                  type="range"
                  min="-30.0"
                  max="0.0"
                  step="0.5"
                  value={floodThresholdDb}
                  onChange={(e) => setFloodThresholdDb(parseFloat(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                  <span>-30.0 dB (Calm Open Water Only)</span>
                  <span className="text-cyan-300 font-bold">-16.5 dB (Nominal Sentinel-1 Water Baseline)</span>
                  <span>0.0 dB (Urban Double-Bounce)</span>
                </div>
              </div>

              {/* Surface Scattering Classification Tiers */}
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                  <Droplet className="w-4 h-4 text-cyan-400" />
                  <span>SAR Backscatter Scattering Tiers</span>
                </span>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  {Object.values(SAR_FLOOD_TIER_CONFIGS).map((tier) => (
                    <div
                      key={tier.tier}
                      className="p-3 rounded-xl border border-gray-800 bg-zinc-900/40 flex flex-col justify-between"
                      style={{ borderLeftColor: tier.color, borderLeftWidth: '4px' }}
                    >
                      <div>
                        <span className="text-xs font-bold text-white block truncate">{tier.label}</span>
                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                          {tier.min_db} to {tier.max_db} dB
                        </span>
                      </div>
                      <span 
                        className="mt-2 text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded w-fit"
                        style={{ backgroundColor: `${tier.color}25`, color: tier.color }}
                      >
                        {tier.is_flood ? 'Inundation Zone' : 'Land / Ground'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Water Area Summary & Inundation Hectares */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
                  <span className="text-zinc-400 text-xs font-mono block">Estimated Inundated Water Area</span>
                  <span className="text-xl font-bold font-mono text-cyan-300 mt-1 block">
                    {waterStats.waterAreaHa.toLocaleString()} ha
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400/80 block mt-0.5">
                    Based on 10m spatial resolution
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-violet-950/30 border border-violet-500/30">
                  <span className="text-zinc-400 text-xs font-mono block">Water Coverage Fraction</span>
                  <span className="text-xl font-bold font-mono text-violet-300 mt-1 block">
                    {(waterStats.waterFraction * 100).toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-mono text-violet-400/80 block mt-0.5">
                    {waterStats.waterPixels} / {waterStats.totalPixels} sampled pixels
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-gray-800">
                  <span className="text-zinc-400 text-xs font-mono block">Scattering Tier at Threshold</span>
                  <span className="text-base font-bold font-mono text-amber-300 mt-1 block">
                    {classifySarFloodTier(floodThresholdDb)}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 block mt-0.5">
                    Cut-off point classification
                  </span>
                </div>
              </div>

              {/* Terrain Flattening Gamma-0 Control */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold text-white uppercase block">
                      Radiometric Terrain Flattening (γ⁰ = σ⁰ / cos θᵢ)
                    </span>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Eliminates slope illumination bias across embankments and hillside terrain.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enableTerrainFlattening}
                      onChange={(e) => setEnableTerrainFlattening(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-violet-600"></div>
                  </label>
                </div>

                {enableTerrainFlattening && (
                  <div className="pt-2 border-t border-gray-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-300">Local Slope Incidence Angle (θ_local):</span>
                      <span className="text-violet-400 font-bold">{localIncidenceAngleDeg.toFixed(1)}°</span>
                    </div>
                    <input
                      type="range"
                      min="15.0"
                      max="60.0"
                      step="0.5"
                      value={localIncidenceAngleDeg}
                      onChange={(e) => setLocalIncidenceAngleDeg(parseFloat(e.target.value))}
                      className="w-full accent-violet-400 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>Flattened γ⁰: {sarTelemetry.gamma0Vv} dB</span>
                      <span>Raw σ⁰: {sarTelemetry.meanVv} dB</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: XYZ TILES & RENDERING */}
          {activeTab === 'tiles' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Display Mode Selector */}
              <div className="space-y-2">
                <label className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                  <Eye className="w-4 h-4 text-violet-400" />
                  <span>Map Display Mode</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setDisplayMode('backscatter')}
                    className={`p-3 rounded-xl border text-left font-mono transition-all ${
                      displayMode === 'backscatter'
                        ? 'border-violet-500 bg-violet-950/50 shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                        : 'border-gray-800 bg-zinc-900/40 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">Calibrated Backscatter</span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Continuous decibel intensity mapped via scientific colormap
                    </span>
                  </button>

                  <button
                    onClick={() => setDisplayMode('flood_mask')}
                    className={`p-3 rounded-xl border text-left font-mono transition-all ${
                      displayMode === 'flood_mask'
                        ? 'border-cyan-500 bg-cyan-950/50 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                        : 'border-gray-800 bg-zinc-900/40 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">Flood Inundation Mask</span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Binary open water mask thresholded at {floodThresholdDb} dB
                    </span>
                  </button>

                  <button
                    onClick={() => setDisplayMode('dual_pol_rgb')}
                    className={`p-3 rounded-xl border text-left font-mono transition-all ${
                      displayMode === 'dual_pol_rgb'
                        ? 'border-emerald-500 bg-emerald-950/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                        : 'border-gray-800 bg-zinc-900/40 hover:border-gray-700'
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">Dual-Pol False Color RGB</span>
                    <span className="text-[10px] text-slate-400 block mt-1">
                      Red = VV, Green = VH, Blue = Ratio (VH/VV)
                    </span>
                  </button>
                </div>
              </div>

              {/* Colormap & Contrast Rescale Controls (for backscatter mode) */}
              {displayMode === 'backscatter' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-900/40 border border-gray-800">
                  <div className="space-y-2">
                    <label className="text-xs font-mono font-bold text-slate-300 uppercase block">
                      Colormap Palette:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {SAR_COLORMAP_OPTIONS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveColormap(c.id)}
                          className={`p-2 rounded-lg text-left text-xs font-mono border transition-all ${
                            activeColormap === c.id
                              ? 'border-violet-500 bg-violet-950/40 text-white'
                              : 'border-gray-800 bg-zinc-950/50 text-slate-400 hover:text-white'
                          }`}
                        >
                          <span className="font-bold block">{c.label}</span>
                          <span className="text-[9px] text-zinc-500 block truncate">{c.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs font-mono font-bold text-slate-300 uppercase block">
                      Contrast Rescale Bounds (dB):
                    </label>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-400">Min Clamp:</span>
                        <span className="text-violet-400 font-bold">{rescaleMin.toFixed(1)} dB</span>
                      </div>
                      <input
                        type="range"
                        min="-35.0"
                        max="-10.0"
                        step="1.0"
                        value={rescaleMin}
                        onChange={(e) => setRescaleMin(parseFloat(e.target.value))}
                        className="w-full accent-violet-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-zinc-400">Max Clamp:</span>
                        <span className="text-cyan-400 font-bold">{rescaleMax.toFixed(1)} dB</span>
                      </div>
                      <input
                        type="range"
                        min="-10.0"
                        max="5.0"
                        step="1.0"
                        value={rescaleMax}
                        onChange={(e) => setRescaleMax(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Layer Opacity & Blend Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-900/40 border border-gray-800">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">Layer Opacity:</span>
                    <span className="text-emerald-400 font-bold">{Math.round(layerOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={layerOpacity}
                    onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-300 font-bold">Canvas Blend Mode:</span>
                    <span className="text-violet-400 font-bold uppercase">{canvasBlendMode}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {['normal', 'screen', 'multiply', 'overlay'].map((b) => (
                      <button
                        key={b}
                        onClick={() => setCanvasBlendMode(b)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold uppercase border transition-all ${
                          canvasBlendMode === b
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'bg-zinc-950/60 border-gray-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Tile URL Template Preview */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-violet-400" />
                    <span>Leaflet Dynamic Tile URL Template</span>
                  </span>
                  <button
                    onClick={handleCopyTileUrl}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono bg-zinc-800 hover:bg-zinc-700 text-slate-200 transition-all"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 font-mono text-[11px] text-violet-300 break-all select-all border border-gray-800/80">
                  {dynamicTileUrlTemplate}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-zinc-900/80">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sentinel-1 RTC C-Band Engine Ready</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyToMap}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-mono font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)]"
            >
              <span>Apply SAR Radar to Map Explorer</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
