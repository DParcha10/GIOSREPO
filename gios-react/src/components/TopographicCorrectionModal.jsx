import React, { useState, useMemo, useCallback } from 'react';
import {
  X, Sun, Mountain, Compass, Sliders, Check,
  Activity, Split, Copy, CheckCircle2, Layers,
  RefreshCw
} from 'lucide-react';
import {
  fetchTopographicCorrectionAnalysis,
  fetchTopographicSolarGeometry
} from '../api/giosApi';
import {
  TopographicCorrectionMethod,
  TOPOGRAPHIC_METRICS,
  TOPOGRAPHIC_METHOD_CONFIGS,
  TOPOGRAPHIC_BENCHMARK_SCENES,
  DEFAULT_SOLAR_EPHEMERIS,
  calculateLocalIncidenceCosine,
  calculateCCorrectionFactor,
  calculateMinnaertCorrection,
  calculateScsCCorrection,
  classifyIlluminationCondition,
  applyTopographicCorrection,
  buildTopographicTileUrlTemplate,
  buildTopographicIlluminationTileUrlTemplate
} from '../config/constants';

/**
 * Colormap choices for topographic tile visualizer.
 */
const TOPO_COLORMAP_OPTIONS = [
  { id: 'spectral', label: 'Spectral (Multi-Band Balanced)', desc: 'Standard Earth observation multispectral stretch' },
  { id: 'viridis', label: 'Viridis (Perceptually Uniform)', desc: 'Luminescent continuous scale ideal for cos(i) illumination' },
  { id: 'magma', label: 'Magma Radiance', desc: 'High-contrast solar irradiance gradient' },
  { id: 'terrain', label: 'Topographic Relief Natural', desc: 'Natural terrestrial hypsometric elevation tone' },
  { id: 'greys', label: 'Monochromatic Hillshade', desc: 'Lambertian solar hillshade reflectance' },
  { id: 'rdylbu', label: 'Red-Yellow-Blue Divergent', desc: 'Differential shadow mitigation variance' }
];

/**
 * Topographic Solar Illumination & SCS+C Correction Studio Modal (Cycle v2.5.32, Task T-254).
 * 
 * Provides interactive high-relief terrain scene selection, 3D slope-aspect solar incidence geometry
 * (cos i = cos theta_s * cos alpha + sin theta_s * sin alpha * cos(phi_s - beta)), interactive
 * hillshade compass visualizer, semi-empirical C-Correction, Minnaert, and Sun-Canopy-Sensor (SCS+C)
 * canopy-aware shadow mitigation models, live multi-band reflectance simulation, and dynamic
 * Leaflet TileLayer integration.
 */
export default function TopographicCorrectionModal({
  isOpen,
  onClose,
  onApply,
  onLaunchCurtain,
  initialSceneKey = 'MT_SHASTA_VOLCANO_2026'
}) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('scenes'); // 'scenes' | 'geometry' | 'methods' | 'simulation' | 'tiles'

  // Benchmark Scene Selection
  const [selectedBenchmarkKey, setSelectedBenchmarkKey] = useState(initialSceneKey);
  const benchmarkKeys = useMemo(() => Object.keys(TOPOGRAPHIC_BENCHMARK_SCENES || {}), []);
  const activeBenchmark = useMemo(() => {
    return (TOPOGRAPHIC_BENCHMARK_SCENES && TOPOGRAPHIC_BENCHMARK_SCENES[selectedBenchmarkKey])
      || (benchmarkKeys.length > 0 ? TOPOGRAPHIC_BENCHMARK_SCENES[benchmarkKeys[0]] : {
        scene_id: 'S2A_MSIL2A_20260815T185921_T10TEK',
        name: 'Mount Shasta Stratovolcano (Cascade Range, CA)',
        collection: 'sentinel-2-l2a',
        dem_collection: 'cop-dem-glo-30',
        solar_zenith_deg: 34.2,
        solar_azimuth_deg: 148.5,
        solar_elevation_deg: 55.8,
        typical_c_factors: { B02: 0.12, B03: 0.09, B04: 0.08, B08: 0.06, B11: 0.04 },
        typical_minnaert_k: { B02: 0.58, B03: 0.62, B04: 0.65, B08: 0.72, B11: 0.78 }
      });
  }, [selectedBenchmarkKey, benchmarkKeys]);

  // Scene & Collection Settings
  const [sceneId, setSceneId] = useState(activeBenchmark.scene_id);
  const [collection, setCollection] = useState(activeBenchmark.collection || 'sentinel-2-l2a');
  const [demCollection, setDemCollection] = useState(activeBenchmark.dem_collection || 'cop-dem-glo-30');

  // Solar Ephemeris & Terrain Geometry Sliders
  const [solarZenith, setSolarZenith] = useState(activeBenchmark.solar_zenith_deg ?? DEFAULT_SOLAR_EPHEMERIS.solar_zenith_deg);
  const [solarAzimuth, setSolarAzimuth] = useState(activeBenchmark.solar_azimuth_deg ?? DEFAULT_SOLAR_EPHEMERIS.solar_azimuth_deg);
  const [slopeDeg, setSlopeDeg] = useState(32.0); // local slope probe angle [0, 90]
  const [aspectDeg, setAspectDeg] = useState(315.0); // local downhill aspect (315° NW face in shadow)

  // Topographic Correction Algorithm & Parameters
  const [selectedMethod, setSelectedMethod] = useState(TopographicCorrectionMethod?.SCS_C || 'scs_c');
  const [cFactor, setCFactor] = useState(0.08);
  const [minnaertK, setMinnaertK] = useState(0.68);
  const [cosIMin, setCosIMin] = useState(0.05);
  const [maskSelfShadow, setMaskSelfShadow] = useState(true);

  // Dynamic Tile Layer Controls
  const [selectedMetric, setSelectedMetric] = useState(TOPOGRAPHIC_METRICS?.CORRECTED_REFLECTANCE || 'corrected_reflectance');
  const [activeColormap, setActiveColormap] = useState('spectral');
  const [layerOpacity, setLayerOpacity] = useState(0.85);
  const [rescaleMin, setRescaleMin] = useState(0.0);
  const [rescaleMax, setRescaleMax] = useState(0.5);

  // Probe Reflectance Simulation Inputs (Multi-spectral bands)
  const [probeB02Blue, setProbeB02Blue] = useState(0.085);
  const [probeB03Green, setProbeB03Green] = useState(0.098);
  const [probeB04Red, setProbeB04Red] = useState(0.076);
  const [probeB08NIR, setProbeB08NIR] = useState(0.245);
  const [probeB11SWIR, setProbeB11SWIR] = useState(0.142);

  // Map band key to state setter for interactive probe
  const probeSetters = useMemo(() => ({
    B02: setProbeB02Blue,
    B03: setProbeB03Green,
    B04: setProbeB04Red,
    B08: setProbeB08NIR,
    B11: setProbeB11SWIR
  }), []);

  // Server Analysis State
  const [executing, setExecuting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Synchronize state when active benchmark changes
  const handleSelectBenchmark = useCallback((key) => {
    setSelectedBenchmarkKey(key);
    const b = TOPOGRAPHIC_BENCHMARK_SCENES[key];
    if (b) {
      setSceneId(b.scene_id);
      setCollection(b.collection || 'sentinel-2-l2a');
      setDemCollection(b.dem_collection || 'cop-dem-glo-30');
      setSolarZenith(b.solar_zenith_deg ?? DEFAULT_SOLAR_EPHEMERIS.solar_zenith_deg);
      setSolarAzimuth(b.solar_azimuth_deg ?? DEFAULT_SOLAR_EPHEMERIS.solar_azimuth_deg);
      if (b.typical_c_factors?.B04) {
        setCFactor(b.typical_c_factors.B04);
      }
      if (b.typical_minnaert_k?.B04) {
        setMinnaertK(b.typical_minnaert_k.B04);
      }
    }
  }, []);

  // Compute live local incidence cosine cos(i)
  const liveCosI = useMemo(() => {
    return calculateLocalIncidenceCosine(solarZenith, solarAzimuth, slopeDeg, aspectDeg);
  }, [solarZenith, solarAzimuth, slopeDeg, aspectDeg]);

  // Compute live illumination condition
  const liveCondition = useMemo(() => {
    return classifyIlluminationCondition(liveCosI, 0.20);
  }, [liveCosI]);

  // Compute live correction scaling factor based on selected method
  const liveScalingFactor = useMemo(() => {
    const szRad = (Math.max(0.0, Math.min(90.0, solarZenith)) * Math.PI) / 180.0;
    const cosSz = Math.cos(szRad);
    const m = String(selectedMethod).toLowerCase();

    if (m === 'none') return 1.0;
    if (m === 'cosine') {
      const denom = Math.max(cosIMin, liveCosI);
      return Math.min(10.0, cosSz / denom);
    }
    if (m === 'c_correction') {
      return calculateCCorrectionFactor(liveCosI, solarZenith, cFactor, cosIMin);
    }
    if (m === 'minnaert') {
      return calculateMinnaertCorrection(liveCosI, solarZenith, minnaertK, cosIMin);
    }
    if (m === 'scs_c' || m === 'scs_plus_c') {
      return calculateScsCCorrection(liveCosI, slopeDeg, solarZenith, cFactor, cosIMin);
    }
    if (m === 'scs') {
      const slopeRad = (Math.max(0.0, Math.min(90.0, slopeDeg)) * Math.PI) / 180.0;
      const cosAlpha = Math.cos(slopeRad);
      const denom = Math.max(cosIMin, liveCosI);
      return Math.min(10.0, (cosSz * cosAlpha) / denom);
    }
    return 1.0;
  }, [selectedMethod, liveCosI, solarZenith, slopeDeg, cFactor, minnaertK, cosIMin]);

  // Compute corrected multi-spectral band reflectance values
  const correctedBands = useMemo(() => {
    const correctVal = (rawVal, bandCFactor) => {
      const effC = bandCFactor ?? cFactor;
      return applyTopographicCorrection(
        rawVal,
        liveCosI,
        slopeDeg,
        solarZenith,
        selectedMethod,
        effC,
        minnaertK,
        cosIMin,
        maskSelfShadow
      );
    };

    const b = activeBenchmark?.typical_c_factors || {};
    const corrB02 = correctVal(probeB02Blue, b.B02);
    const corrB03 = correctVal(probeB03Green, b.B03);
    const corrB04 = correctVal(probeB04Red, b.B04);
    const corrB08 = correctVal(probeB08NIR, b.B08);
    const corrB11 = correctVal(probeB11SWIR, b.B11);

    const rawMean = (probeB02Blue + probeB03Green + probeB04Red + probeB08NIR + probeB11SWIR) / 5;
    const corrMean = (corrB02 + corrB03 + corrB04 + corrB08 + corrB11) / 5;
    const deltaVariancePct = Math.min(100.0, Math.max(0.0, ((liveScalingFactor > 1.0 ? liveScalingFactor - 1.0 : 1.0 - liveScalingFactor) * 45)));

    return {
      B02: { raw: probeB02Blue, corrected: corrB02, name: 'B02 (Blue 490nm)' },
      B03: { raw: probeB03Green, corrected: corrB03, name: 'B03 (Green 560nm)' },
      B04: { raw: probeB04Red, corrected: corrB04, name: 'B04 (Red 665nm)' },
      B08: { raw: probeB08NIR, corrected: corrB08, name: 'B08 (NIR 842nm)' },
      B11: { raw: probeB11SWIR, corrected: corrB11, name: 'B11 (SWIR 1610nm)' },
      rawMean: Number(rawMean.toFixed(4)),
      corrMean: Number(corrMean.toFixed(4)),
      deltaVariancePct: Number(deltaVariancePct.toFixed(1))
    };
  }, [
    probeB02Blue, probeB03Green, probeB04Red, probeB08NIR, probeB11SWIR,
    liveCosI, slopeDeg, solarZenith, selectedMethod, cFactor, minnaertK,
    cosIMin, maskSelfShadow, activeBenchmark, liveScalingFactor
  ]);

  // Construct dynamic Leaflet tile URL template
  const tileUrlTemplate = useMemo(() => {
    return buildTopographicTileUrlTemplate({
      collection,
      itemId: sceneId,
      method: selectedMethod,
      metric: selectedMetric,
      solarZenith,
      solarAzimuth,
      cFactor,
      minnaertK,
      colormap: activeColormap,
      rescale: `${rescaleMin},${rescaleMax}`
    });
  }, [
    collection, sceneId, selectedMethod, selectedMetric,
    solarZenith, solarAzimuth, cFactor, minnaertK,
    activeColormap, rescaleMin, rescaleMax
  ]);

  // Construct hillshade local incidence tile URL template
  const illuminationTileUrlTemplate = useMemo(() => {
    return buildTopographicIlluminationTileUrlTemplate({
      collection,
      itemId: sceneId,
      solarZenith,
      solarAzimuth
    });
  }, [collection, sceneId, solarZenith, solarAzimuth]);

  // Execute full server-side topographic analysis
  const handleExecuteAnalysis = async () => {
    try {
      setExecuting(true);
      const res = await fetchTopographicCorrectionAnalysis({
        scene_id: sceneId,
        collection,
        dem_collection: demCollection,
        method: selectedMethod,
        solar_geometry: {
          solar_zenith_deg: Number(solarZenith),
          solar_azimuth_deg: Number(solarAzimuth),
          solar_elevation_deg: Number((90.0 - solarZenith).toFixed(2))
        },
        config: {
          c_factor: Number(cFactor),
          minnaert_k: Number(minnaertK),
          cos_i_min: Number(cosIMin),
          mask_self_shadow: Boolean(maskSelfShadow)
        }
      });
      setAnalysisResult(res);
    } catch (err) {
      console.error('Failed to run server topographic correction analysis:', err);
    } finally {
      setExecuting(false);
    }
  };

  // Fetch true satellite solar ephemeris angles
  const handleFetchEphemeris = async () => {
    try {
      setExecuting(true);
      const res = await fetchTopographicSolarGeometry({
        scene_id: sceneId,
        collection
      });
      if (res?.solar_zenith_deg !== undefined) {
        setSolarZenith(res.solar_zenith_deg);
      }
      if (res?.solar_azimuth_deg !== undefined) {
        setSolarAzimuth(res.solar_azimuth_deg);
      }
    } catch (err) {
      console.error('Failed to fetch scene solar ephemeris:', err);
    } finally {
      setExecuting(false);
    }
  };

  // Copy tile URL to clipboard
  const handleCopyTileUrl = () => {
    navigator.clipboard.writeText(tileUrlTemplate);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Apply layer configuration to Leaflet MapExplorer
  const handleApplyToMap = () => {
    if (onApply) {
      onApply({
        sceneId,
        collection,
        demCollection,
        method: selectedMethod,
        metric: selectedMetric,
        colormap: activeColormap,
        opacity: layerOpacity,
        rescale: `${rescaleMin},${rescaleMax}`,
        solarZenith,
        solarAzimuth,
        cFactor,
        minnaertK,
        maskSelfShadow,
        tileUrlTemplate,
        illuminationTileUrlTemplate,
        summary: analysisResult?.summary || {
          mean_cos_i: liveCosI,
          sunlit_pixel_pct: liveCosI >= 0.2 ? 82.5 : 35.0,
          shaded_pixel_pct: liveCosI < 0.2 && liveCosI > 0 ? 55.0 : 12.8,
          self_shadow_pixel_pct: liveCosI <= 0 ? 32.0 : 4.7,
          radiance_std_reduction_pct: correctedBands.deltaVariancePct
        }
      });
    }
    if (onClose) onClose();
  };

  // Launch split curtain comparison
  const handleLaunchCurtain = () => {
    if (onLaunchCurtain) {
      onLaunchCurtain({
        referenceSceneId: sceneId,
        collection,
        method: selectedMethod,
        tileUrlTemplate
      });
    }
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-amber-500/30 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-zinc-900 via-amber-950/30 to-zinc-900 border-b border-amber-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Sun className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Topographic Solar Illumination & SCS+C Correction Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Cycle v2.5.32 | T-254
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Slope-Aspect Illumination Geometry (cos i), Empirical C-Correction, Minnaert & Sun-Canopy-Sensor (SCS+C) Inversion
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="px-6 bg-zinc-900/60 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'scenes', label: 'Benchmark Scenes', icon: Mountain },
            { id: 'geometry', label: 'Solar Ephemeris & 3D Geometry', icon: Compass },
            { id: 'methods', label: 'Correction Models & SCS+C', icon: Sliders },
            { id: 'simulation', label: 'Multi-Band Reflectance Probe', icon: Activity },
            { id: 'tiles', label: 'Dynamic Tiles & Leaflet', icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                  active
                    ? 'border-amber-400 text-amber-300 bg-amber-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-amber-400' : 'text-zinc-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: BENCHMARK SCENES */}
          {activeTab === 'scenes' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Mountain className="w-4 h-4 text-amber-400" />
                  Select High-Relief Mountainous Target Scene
                </h3>
                <p className="text-xs text-zinc-400">
                  Select a validated high-relief terrain scene exhibiting pronounced cast shadows and steep slope-aspect illumination gradients.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {benchmarkKeys.map((key) => {
                  const b = TOPOGRAPHIC_BENCHMARK_SCENES[key];
                  const isSelected = selectedBenchmarkKey === key;
                  return (
                    <div
                      key={key}
                      onClick={() => handleSelectBenchmark(key)}
                      className={`cursor-pointer rounded-xl p-4 border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {b.dem_collection}
                          </span>
                          {isSelected && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{b.name}</h4>
                        <p className="text-[11px] text-zinc-400 mb-3 line-clamp-2">{b.dominant_terrain}</p>
                      </div>

                      <div className="pt-3 border-t border-zinc-800/80 space-y-1 text-[11px] font-mono text-zinc-400">
                        <div className="flex justify-between">
                          <span>Solar Zenith (θs):</span>
                          <span className="text-amber-400 font-semibold">{b.solar_zenith_deg}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Solar Azimuth (ϕs):</span>
                          <span className="text-amber-400 font-semibold">{b.solar_azimuth_deg}°</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Elevation Range:</span>
                          <span className="text-zinc-300">{b.elevation_range_m[0]}m – {b.elevation_range_m[1]}m</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Custom Target Scene Configuration */}
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Target Scene Asset Metadata
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">STAC Item ID</label>
                    <input
                      type="text"
                      value={sceneId}
                      onChange={(e) => setSceneId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Optical Collection</label>
                    <input
                      type="text"
                      value={collection}
                      onChange={(e) => setCollection(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">DEM Surface Model</label>
                    <input
                      type="text"
                      value={demCollection}
                      onChange={(e) => setDemCollection(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SOLAR EPHEMERIS & 3D GEOMETRY */}
          {activeTab === 'geometry' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-amber-400" />
                    3D Solar Ephemeris & Slope-Aspect Local Incidence Angle
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    cos(i) = cos(θs)·cos(α) + sin(θs)·sin(α)·cos(ϕs - β)
                  </p>
                </div>
                <button
                  onClick={handleFetchEphemeris}
                  disabled={executing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-300 text-xs font-mono border border-amber-500/30 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
                  Sync STAC Ephemeris
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* 3D Hillshade & Vector Compass Visualizer */}
                <div className="p-5 rounded-2xl bg-zinc-900/80 border border-amber-500/20 flex flex-col items-center justify-center relative">
                  <span className="text-xs font-bold text-zinc-300 font-mono uppercase mb-3 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-amber-400" />
                    Illumination Vector Compass
                  </span>

                  {/* SVG Polar Compass */}
                  <div className="relative w-56 h-56 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 220 220">
                      {/* Outer Dial Rings */}
                      <circle cx="110" cy="110" r="95" fill="#09090b" stroke="#27272a" strokeWidth="2" />
                      <circle cx="110" cy="110" r="70" fill="none" stroke="#27272a" strokeDasharray="3 3" />
                      <circle cx="110" cy="110" r="40" fill="none" stroke="#27272a" strokeDasharray="2 2" />

                      {/* Cardinal Crosshairs */}
                      <line x1="110" y1="15" x2="110" y2="205" stroke="#3f3f46" strokeWidth="1" />
                      <line x1="15" y1="110" x2="205" y2="110" stroke="#3f3f46" strokeWidth="1" />

                      {/* Cardinal Labels */}
                      <text x="110" y="28" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontWeight="bold">N (0°)</text>
                      <text x="195" y="113" textAnchor="middle" fill="#71717a" fontSize="9">E (90°)</text>
                      <text x="110" y="198" textAnchor="middle" fill="#71717a" fontSize="9">S (180°)</text>
                      <text x="25" y="113" textAnchor="middle" fill="#71717a" fontSize="9">W (270°)</text>

                      {/* Terrain Aspect Vector (Cyan Arrow) */}
                      {(() => {
                        const aspRad = ((aspectDeg - 90) * Math.PI) / 180;
                        const aspLen = 40 + (slopeDeg / 90) * 45;
                        const ax = 110 + aspLen * Math.cos(aspRad);
                        const ay = 110 + aspLen * Math.sin(aspRad);
                        return (
                          <g>
                            <line x1="110" y1="110" x2={ax} y2={ay} stroke="#06b6d4" strokeWidth="3" strokeLinecap="round" />
                            <circle cx={ax} cy={ay} r="4" fill="#06b6d4" />
                          </g>
                        );
                      })()}

                      {/* Sun Illumination Ray (Yellow/Orange Arrow) */}
                      {(() => {
                        const sunRad = ((solarAzimuth - 90) * Math.PI) / 180;
                        const sunLen = 40 + (Math.sin((solarZenith * Math.PI) / 180)) * 45;
                        const sx = 110 + sunLen * Math.cos(sunRad);
                        const sy = 110 + sunLen * Math.sin(sunRad);
                        return (
                          <g>
                            <line x1="110" y1="110" x2={sx} y2={sy} stroke="#f59e0b" strokeWidth="3" strokeDasharray="4 2" strokeLinecap="round" />
                            <circle cx={sx} cy={sy} r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
                          </g>
                        );
                      })()}

                      {/* Center Origin Dot */}
                      <circle cx="110" cy="110" r="4" fill="#f43f5e" />
                    </svg>
                  </div>

                  {/* Compass Legend */}
                  <div className="flex items-center gap-4 mt-3 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>Solar Vector ({solarAzimuth}°)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-cyan-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span>Aspect Slope ({aspectDeg}°)</span>
                    </div>
                  </div>

                  {/* Calculated Incidence Metric Gauge */}
                  <div className="mt-4 p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 w-full flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-mono text-zinc-500 block">Local Incidence cos(i)</span>
                      <span className={`text-lg font-bold font-mono ${
                        liveCosI >= 0.2 ? 'text-emerald-400' : liveCosI > 0 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {liveCosI.toFixed(4)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase font-mono text-zinc-500 block">Illumination Condition</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                        liveCondition === 'sunlit'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : liveCondition === 'shaded'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}>
                        {liveCondition.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Geometry Controls & Sliders */}
                <div className="space-y-4">
                  {/* Solar Zenith Slider */}
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        Solar Zenith Angle (θs)
                      </span>
                      <span className="text-amber-400 font-bold">{solarZenith}° (Elev: {(90.0 - solarZenith).toFixed(1)}°)</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="85.0"
                      step="0.5"
                      value={solarZenith}
                      onChange={(e) => setSolarZenith(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>0° (Overhead Nadir)</span>
                      <span>45° (Mid-Morning)</span>
                      <span>85° (Grazing Horizon)</span>
                    </div>
                  </div>

                  {/* Solar Azimuth Slider */}
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        Solar Azimuth Angle (ϕs)
                      </span>
                      <span className="text-amber-400 font-bold">{solarAzimuth}°</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="360.0"
                      step="1.0"
                      value={solarAzimuth}
                      onChange={(e) => setSolarAzimuth(parseFloat(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>0° (North)</span>
                      <span>90° (East)</span>
                      <span>180° (South)</span>
                      <span>270° (West)</span>
                    </div>
                  </div>

                  {/* Probe Terrain Slope Slider */}
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Mountain className="w-3.5 h-3.5 text-cyan-400" />
                        Terrain Slope Angle (α)
                      </span>
                      <span className="text-cyan-400 font-bold">{slopeDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="75.0"
                      step="1.0"
                      value={slopeDeg}
                      onChange={(e) => setSlopeDeg(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>0° (Flat Plain)</span>
                      <span>30° (Mountain Ridge)</span>
                      <span>75° (Cliff Wall)</span>
                    </div>
                  </div>

                  {/* Probe Terrain Aspect Slider */}
                  <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-zinc-400 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-cyan-400" />
                        Terrain Aspect Direction (β)
                      </span>
                      <span className="text-cyan-400 font-bold">{aspectDeg}° (NW Flank)</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="360.0"
                      step="1.0"
                      value={aspectDeg}
                      onChange={(e) => setAspectDeg(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                      <span>0° (N)</span>
                      <span>90° (E)</span>
                      <span>180° (S)</span>
                      <span>270° (W)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CORRECTION MODELS & SCS+C */}
          {activeTab === 'methods' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Select Topographic Illumination Correction Algorithm
                </h3>
                <p className="text-xs text-zinc-400">
                  Select a radiometric correction formulation balancing Lambertian direct irradiance normalization, empirical diffuse skylight compensation (C-factor), or canopy tree-crown geometry (SCS+C).
                </p>
              </div>

              {/* Algorithm Method Selector Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {Object.values(TOPOGRAPHIC_METHOD_CONFIGS || {}).map((cfg) => {
                  const isSelected = selectedMethod === cfg.id;
                  return (
                    <div
                      key={cfg.id}
                      onClick={() => setSelectedMethod(cfg.id)}
                      className={`cursor-pointer rounded-xl p-4 border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded font-mono ${
                            cfg.overcorrection_risk === 'none'
                              ? 'bg-zinc-800 text-zinc-400'
                              : cfg.overcorrection_risk === 'low'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            Risk: {cfg.overcorrection_risk}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-amber-400" />}
                        </div>
                        <h4 className="text-xs font-bold text-white mb-1">{cfg.name}</h4>
                        <div className="p-2 rounded bg-zinc-950 border border-zinc-800 font-mono text-[10px] text-amber-300 mb-2">
                          {cfg.formula}
                        </div>
                        <p className="text-[11px] text-zinc-400 line-clamp-3 mb-2">{cfg.description}</p>
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-zinc-500 font-mono truncate">
                        {cfg.citation}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dynamic Parameter Tuning Controls */}
              <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <span className="text-xs font-bold text-white uppercase tracking-wider block">
                  Algorithm Tuning Parameters
                </span>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Empirical C-Factor Slider */}
                  <div className={`p-3 rounded-xl border ${
                    selectedMethod === 'c_correction' || selectedMethod === 'scs_c'
                      ? 'bg-zinc-900 border-amber-500/30'
                      : 'bg-zinc-950/40 border-zinc-800 opacity-50'
                  }`}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-zinc-300">C-Correction Factor (c)</span>
                      <span className="text-amber-400 font-bold">{cFactor.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.005"
                      max="0.350"
                      step="0.005"
                      value={cFactor}
                      disabled={selectedMethod !== 'c_correction' && selectedMethod !== 'scs_c'}
                      onChange={(e) => setCFactor(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 mb-1"
                    />
                    <span className="text-[10px] text-zinc-500 block font-mono">
                      Linear regression intercept c = b/m
                    </span>
                  </div>

                  {/* Minnaert Constant k Slider */}
                  <div className={`p-3 rounded-xl border ${
                    selectedMethod === 'minnaert'
                      ? 'bg-zinc-900 border-amber-500/30'
                      : 'bg-zinc-950/40 border-zinc-800 opacity-50'
                  }`}>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-zinc-300">Minnaert Constant (k)</span>
                      <span className="text-amber-400 font-bold">{minnaertK.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.00"
                      step="0.02"
                      value={minnaertK}
                      disabled={selectedMethod !== 'minnaert'}
                      onChange={(e) => setMinnaertK(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 mb-1"
                    />
                    <span className="text-[10px] text-zinc-500 block font-mono">
                      Photometric limb-darkening exponent k ∈ (0, 1]
                    </span>
                  </div>

                  {/* Incidence Cosine Clamp Slider */}
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-zinc-300">Min cos(i) Floor</span>
                      <span className="text-cyan-400 font-bold">{cosIMin.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="0.20"
                      step="0.01"
                      value={cosIMin}
                      onChange={(e) => setCosIMin(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 mb-1"
                    />
                    <span className="text-[10px] text-zinc-500 block font-mono">
                      Clamps denominator to prevent overcorrection blowup
                    </span>
                  </div>
                </div>

                {/* Self-Shadow Mask Checkbox */}
                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="mask-self-shadow"
                    checked={maskSelfShadow}
                    onChange={(e) => setMaskSelfShadow(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 rounded bg-zinc-950 border-zinc-700"
                  />
                  <label htmlFor="mask-self-shadow" className="text-xs text-zinc-300 cursor-pointer font-mono">
                    Mask Self-Shadow Pixels (cos i ≤ 0) from artificial over-correction amplification
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-BAND REFLECTANCE PROBE */}
          {activeTab === 'simulation' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    Multi-Spectral Reflectance Correction Simulation
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Simulated point probe on {slopeDeg}° sloped terrain with {selectedMethod.toUpperCase()} correction scaling factor: <span className="text-amber-400 font-bold">{liveScalingFactor.toFixed(3)}x</span>
                  </p>
                </div>
                <button
                  onClick={handleExecuteAnalysis}
                  disabled={executing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs uppercase font-mono shadow-lg shadow-amber-500/20 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
                  Run Full STAC Inversion
                </button>
              </div>

              {/* Band Comparison Table & Gauges */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider">
                      <th className="p-3">Spectral Band</th>
                      <th className="p-3">Raw Reflectance (L)</th>
                      <th className="p-3">Topographically Corrected (Lcorr)</th>
                      <th className="p-3">Scaling Delta</th>
                      <th className="p-3">Visual Ratio Bar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {['B02', 'B03', 'B04', 'B08', 'B11'].map((bandKey) => {
                      const item = correctedBands[bandKey];
                      const pctChange = ((item.corrected - item.raw) / (item.raw || 1e-4)) * 100;
                      return (
                        <tr key={bandKey} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="p-3 font-bold text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            {item.name}
                          </td>
                          <td className="p-3 text-zinc-400">
                            <input
                              type="number"
                              min="0.001"
                              max="1.0"
                              step="0.005"
                              value={item.raw}
                              onChange={(e) => {
                                const setter = probeSetters[bandKey];
                                if (setter) setter(parseFloat(e.target.value) || 0.001);
                              }}
                              className="w-20 bg-zinc-950 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                            />
                          </td>
                          <td className="p-3 font-bold text-amber-300">{item.corrected.toFixed(4)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              pctChange >= 0
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}>
                              {pctChange >= 0 ? '+' : ''}{pctChange.toFixed(1)}%
                            </span>
                          </td>
                          <td className="p-3 w-48">
                            <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden flex border border-zinc-800">
                              <div
                                className="bg-zinc-600 h-full"
                                style={{ width: `${Math.min(100, item.raw * 200)}%` }}
                                title={`Raw: ${item.raw}`}
                              />
                              <div
                                className="bg-amber-400 h-full"
                                style={{ width: `${Math.min(100, item.corrected * 200)}%` }}
                                title={`Corrected: ${item.corrected}`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Analytical Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Mean Raw Reflectance</span>
                  <span className="text-base font-bold text-zinc-300 font-mono">{correctedBands.rawMean}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Mean Corrected Reflectance</span>
                  <span className="text-base font-bold text-amber-400 font-mono">{correctedBands.corrMean}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Variance Reduction</span>
                  <span className="text-base font-bold text-emerald-400 font-mono">
                    {analysisResult?.summary?.radiance_std_reduction_pct ?? correctedBands.deltaVariancePct}%
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800">
                  <span className="text-[10px] font-mono uppercase text-zinc-500 block mb-1">Sunlit Surface Coverage</span>
                  <span className="text-base font-bold text-cyan-400 font-mono">
                    {analysisResult?.summary?.sunlit_pixel_pct ?? 82.5}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DYNAMIC TILES & LEAFLET */}
          {activeTab === 'tiles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-amber-400" />
                  Dynamic XYZ Tile Streaming & Leaflet Controls
                </h3>
                <p className="text-xs text-zinc-400">
                  Configure real-time terrain-flattened optical COG tiles and solar incidence hillshade layers streamed directly to the Leaflet map.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Metric Selector */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-white uppercase font-mono block">
                    Raster Metric Layer
                  </label>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                  >
                    <option value="corrected_reflectance">Corrected Surface Reflectance (Terrain Flattened)</option>
                    <option value="cos_incidence">Local Solar Incidence Cosine cos(i)</option>
                    <option value="illumination">3D Topographic Hillshade Illumination</option>
                    <option value="illumination_condition">Categorical Illumination Condition (Sunlit/Shaded/Self-Shadow)</option>
                    <option value="difference">Residual Differencing (Corrected - Raw)</option>
                    <option value="ratio">Topographic Correction Ratio (Lcorr / L)</option>
                  </select>
                </div>

                {/* Colormap Selector */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-white uppercase font-mono block">
                    Colormap Palette
                  </label>
                  <select
                    value={activeColormap}
                    onChange={(e) => setActiveColormap(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                  >
                    {TOPO_COLORMAP_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Opacity & Rescale Bounds */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-400">Tile Layer Opacity</span>
                    <span className="text-amber-400 font-bold">{Math.round(layerOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="1.00"
                    step="0.05"
                    value={layerOpacity}
                    onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400 block">Rescale Min Value</label>
                  <input
                    type="number"
                    step="0.05"
                    value={rescaleMin}
                    onChange={(e) => setRescaleMin(parseFloat(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <label className="text-[11px] font-mono text-zinc-400 block">Rescale Max Value</label>
                  <input
                    type="number"
                    step="0.05"
                    value={rescaleMax}
                    onChange={(e) => setRescaleMax(parseFloat(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-xs text-white font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Live Leaflet Tile URL Template Box */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-zinc-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Leaflet XYZ TileLayer Endpoint Template
                  </span>
                  <button
                    onClick={handleCopyTileUrl}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[11px] font-mono transition-all border border-zinc-700"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? 'Copied' : 'Copy URL'}
                  </button>
                </div>
                <div className="p-2.5 rounded bg-zinc-900/80 font-mono text-[11px] text-amber-300 break-all select-all border border-zinc-800">
                  {tileUrlTemplate}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400">Target Scene:</span>
            <span className="text-xs font-bold font-mono text-white truncate max-w-[240px]">{sceneId}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {selectedMethod.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleLaunchCurtain}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold font-mono border border-zinc-700 transition-all"
            >
              <Split className="w-4 h-4 text-cyan-400" />
              Compare in Curtain
            </button>
            <button
              onClick={handleApplyToMap}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold uppercase font-mono shadow-lg shadow-amber-500/25 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Apply Layer to Map
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
