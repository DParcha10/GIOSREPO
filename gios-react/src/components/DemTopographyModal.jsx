import React, { useState, useMemo, useCallback } from 'react';
import {
  X, Layers, Sun, Mountain, Compass, Sliders, Check, AlertTriangle,
  Activity, TrendingUp, BarChart2, ArrowRight, Eye, RotateCcw, Copy,
  CheckCircle2, Droplets, Info
} from 'lucide-react';
import {
  DEM_COLLECTION_IDS,
  DEM_METRIC_TYPES,
  DEM_SLOPE_HAZARD_TIERS,
  DEM_COLLECTIONS_METADATA,
  DEM_METRIC_CONFIGS,
  DEM_SLOPE_HAZARD_CONFIGS,
  DEFAULT_DEM_SUN_ILLUMINATION,
  DEM_COLORMAPS_METADATA,
  aspectToCompassDirection,
  calculateHornGradient,
  calculateLambertianHillshade,
  calculateTopographicWetnessIndex,
  classifyDemSlopeHazardTier,
  calculateElevationTransectProfile,
  buildDemTileUrlTemplate
} from '../config/constants.js';

// Benchmark geotechnical transect presets
const TRANSECT_PRESETS = [
  {
    id: 'crest_to_toe_main',
    name: 'San Luis Dam Crest-to-Toe Profile',
    description: 'Downstream embankment shell transect from crest (37.0582, -121.0744) to toe berm.',
    startCoord: [37.0582, -121.0744],
    endCoord: [37.0495, -121.0682],
    crestElevation: 1245.0,
    toeElevation: 1085.0
  },
  {
    id: 'north_abutment_shell',
    name: 'North Abutment Rockfill Slope',
    description: 'Steep lateral abutment section with complex geotechnical curvature.',
    startCoord: [37.0620, -121.0790],
    endCoord: [37.0540, -121.0710],
    crestElevation: 1290.0,
    toeElevation: 1120.0
  },
  {
    id: 'tailings_beach_inundation',
    name: 'Impoundment Beach Flat to Spillway',
    description: 'Low-gradient impoundment tailings beach transitioning toward spillway intake.',
    startCoord: [37.0510, -121.0820],
    endCoord: [37.0420, -121.0750],
    crestElevation: 1115.0,
    toeElevation: 1070.0
  }
];

// Interactive 3x3 elevation default matrices
const KERNEL_PRESETS = {
  steep_embankment: [
    [1260, 1262, 1265],
    [1230, 1235, 1238],
    [1195, 1200, 1205]
  ],
  flat_beach: [
    [1120, 1120.2, 1120.4],
    [1119.8, 1120.0, 1120.1],
    [1119.5, 1119.7, 1119.9]
  ],
  north_slope: [
    [1280, 1285, 1290],
    [1250, 1255, 1260],
    [1215, 1220, 1225]
  ],
  saddle_ridge: [
    [1220, 1240, 1220],
    [1210, 1230, 1210],
    [1190, 1210, 1190]
  ]
};

/**
 * Topographic Relief & Hillshade Studio Modal (Cycle v2.5.26).
 * Provides interactive Lambertian hillshade angle adjustments, 3x3 Horn gradient kernel simulation,
 * slope hazard tier breakdown, embankment crest-to-toe transects, and dynamic Leaflet tile streaming.
 */
export default function DemTopographyModal({
  isOpen,
  onClose,
  onApply,
  activeBbox = [-121.1, 37.0, -121.0, 37.1]
}) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('solar'); // 'solar' | 'slope' | 'transect' | 'tiles'

  // Studio configuration
  const [collection, setCollection] = useState(DEM_COLLECTION_IDS.COP_DEM_GLO_30);
  const [selectedMetric, setSelectedMetric] = useState(DEM_METRIC_TYPES.RELIEF);
  const [sunAzimuth, setSunAzimuth] = useState(DEFAULT_DEM_SUN_ILLUMINATION.azimuth_deg);
  const [sunAltitude, setSunAltitude] = useState(DEFAULT_DEM_SUN_ILLUMINATION.altitude_deg);
  const [zFactor, setZFactor] = useState(DEFAULT_DEM_SUN_ILLUMINATION.z_factor);
  const [criticalSlopeThreshold, setCriticalSlopeThreshold] = useState(35.0);
  const [selectedColormap, setSelectedColormap] = useState('terrain');
  const [layerOpacity, setLayerOpacity] = useState(0.85);
  const [blendMode, setBlendMode] = useState('multiply');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Interactive 3x3 Horn kernel matrix
  const [grid3x3, setGrid3x3] = useState(KERNEL_PRESETS.steep_embankment);
  const [cellSizeM, setCellSizeM] = useState(30.0);

  // Transect analysis state
  const [activeTransectPreset, setActiveTransectPreset] = useState(TRANSECT_PRESETS[0].id);
  const [transectStart, setTransectStart] = useState(TRANSECT_PRESETS[0].startCoord);
  const [transectEnd, setTransectEnd] = useState(TRANSECT_PRESETS[0].endCoord);
  const [transectSamples, setTransectSamples] = useState(45);

  // Calculate Horn 3x3 gradient & hillshade for the interactive kernel
  const kernelCalculations = useMemo(() => {
    const horn = calculateHornGradient(grid3x3, cellSizeM, cellSizeM, zFactor);
    const hillshade = calculateLambertianHillshade(horn.slope_deg, horn.aspect_deg, sunAzimuth, sunAltitude);
    const twi = calculateTopographicWetnessIndex(horn.slope_deg, 120.0);
    const hazardTier = classifyDemSlopeHazardTier(horn.slope_deg);
    const cardinal = aspectToCompassDirection(horn.aspect_deg);

    return {
      dzDx: horn.dz_dx,
      dzDy: horn.dz_dy,
      slopeDeg: horn.slope_deg,
      slopePercent: horn.slope_percent,
      aspectDeg: horn.aspect_deg,
      aspectCardinal: cardinal,
      hillshadeIntensity: hillshade.hillshade_intensity,
      twiValue: twi.twi,
      hazardTier,
      cosIncidence: hillshade.cos_incidence_angle
    };
  }, [grid3x3, cellSizeM, zFactor, sunAzimuth, sunAltitude]);

  // Calculate Transect profile
  const transectProfile = useMemo(() => {
    return calculateElevationTransectProfile(transectStart, transectEnd, {
      samples: transectSamples,
      collection,
      crestElevation: 1250.0,
      toeElevation: 1090.0
    });
  }, [transectStart, transectEnd, transectSamples, collection]);

  // Dynamic Tile URL Template
  const tileUrlTemplate = useMemo(() => {
    return buildDemTileUrlTemplate(selectedMetric, {
      colormap: selectedColormap,
      sun_azimuth: sunAzimuth,
      sun_altitude: sunAltitude,
      z_factor: zFactor
    });
  }, [selectedMetric, selectedColormap, sunAzimuth, sunAltitude, zFactor]);

  // Handle cell edit in 3x3 matrix
  const handleCellChange = (r, c, val) => {
    const num = parseFloat(val);
    if (isNaN(num)) return;
    const next = grid3x3.map((row, ri) =>
      row.map((cell, ci) => (ri === r && ci === c ? num : cell))
    );
    setGrid3x3(next);
  };

  // Copy tile URL to clipboard
  const handleCopyTileUrl = () => {
    navigator.clipboard.writeText(tileUrlTemplate);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Apply DEM layer to Map Explorer
  const handleApplyToMap = useCallback(() => {
    if (onApply) {
      onApply({
        collection,
        metric: selectedMetric,
        tileUrlTemplate,
        sunAzimuth,
        sunAltitude,
        sunZenith: 90.0 - sunAltitude,
        zFactor,
        colormap: selectedColormap,
        opacity: layerOpacity,
        blendMode,
        criticalSlopeThreshold
      });
    }
    onClose();
  }, [
    onApply,
    onClose,
    collection,
    selectedMetric,
    tileUrlTemplate,
    sunAzimuth,
    sunAltitude,
    zFactor,
    selectedColormap,
    layerOpacity,
    blendMode,
    criticalSlopeThreshold
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-zinc-950 border border-emerald-500/30 rounded-2xl shadow-2xl shadow-emerald-950/40 overflow-hidden text-zinc-100 font-sans">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 shadow-inner">
              <Mountain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white">Topographic Relief & Hillshade Studio</h2>
                <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-emerald-950 border border-emerald-500/40 text-emerald-300 rounded-full">
                  v2.5.26
                </span>
                <span className="px-2 py-0.5 text-xs font-mono bg-zinc-800 text-zinc-300 rounded border border-zinc-700">
                  Horn 3x3 & Lambertian
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Copernicus 30m Global DEM (GLO-30) analytical relief, slope hazards, and crest-to-toe transects
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Collection selector */}
            <select
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="cop-dem-glo-30">Copernicus 30m (GLO-30)</option>
              <option value="nasadem-hgt">NASADEM HGT 30m</option>
              <option value="drone-dem">Drone Micro-DEM (5cm GSD)</option>
            </select>

            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
              title="Close Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80 text-xs font-medium">
          <button
            onClick={() => setActiveTab('solar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'solar'
                ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-900/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Sun className="w-4 h-4" />
            Analytical Hillshade & Solar
          </button>

          <button
            onClick={() => setActiveTab('slope')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'slope'
                ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-900/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Slope Hazard Zonification
          </button>

          <button
            onClick={() => setActiveTab('transect')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'transect'
                ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-900/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            Crest-to-Toe Transect Profile
          </button>

          <button
            onClick={() => setActiveTab('tiles')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'tiles'
                ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-900/30'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            XYZ TileLayer & Blend Mode
          </button>

          <div className="ml-auto flex items-center gap-2 text-zinc-400">
            <span className="text-[11px] font-mono">BBox:</span>
            <span className="text-[11px] font-mono text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
              {activeBbox.map((c) => c.toFixed(2)).join(', ')}
            </span>
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: ANALYTICAL HILLSHADE & SOLAR ILLUMINATION */}
          {activeTab === 'solar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Illumination Sliders & Sun Dial */}
              <div className="lg:col-span-5 space-y-5 bg-zinc-900/50 p-5 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400" />
                    Solar Illumination Angles
                  </h3>
                  <button
                    onClick={() => {
                      setSunAzimuth(DEFAULT_DEM_SUN_ILLUMINATION.azimuth_deg);
                      setSunAltitude(DEFAULT_DEM_SUN_ILLUMINATION.altitude_deg);
                      setZFactor(DEFAULT_DEM_SUN_ILLUMINATION.z_factor);
                    }}
                    className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Defaults
                  </button>
                </div>

                {/* Sun Azimuth Dial & Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Solar Azimuth Angle ($\phi_s$)</span>
                    <span className="font-mono font-bold text-amber-400">
                      {sunAzimuth}° ({aspectToCompassDirection(sunAzimuth)})
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="5"
                    value={sunAzimuth}
                    onChange={(e) => setSunAzimuth(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>0° (N)</span>
                    <span>90° (E)</span>
                    <span>180° (S)</span>
                    <span>270° (W)</span>
                    <span>315° (NW)</span>
                    <span>360°</span>
                  </div>
                </div>

                {/* Solar Altitude & Zenith Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Solar Altitude ($\alpha_s$) / Zenith ($\theta_z$)</span>
                    <span className="font-mono font-bold text-amber-400">
                      Alt: {sunAltitude}° | Zenith: {90 - sunAltitude}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="90"
                    step="1"
                    value={sunAltitude}
                    onChange={(e) => setSunAltitude(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>5° (Low Grazing Sun)</span>
                    <span>45° (Standard)</span>
                    <span>90° (Nadir Overhead)</span>
                  </div>
                </div>

                {/* Vertical Exaggeration Z-Factor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Vertical Exaggeration ($z$-Factor)</span>
                    <span className="font-mono font-bold text-emerald-400">{zFactor.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={zFactor}
                    onChange={(e) => setZFactor(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                    <span>0.5x (Subdued)</span>
                    <span>1.0x (True 1:1)</span>
                    <span>2.5x (Emphasized)</span>
                    <span>5.0x (Extreme)</span>
                  </div>
                </div>

                {/* Analytical Lambertian Equation Card */}
                <div className="p-3.5 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[11px] space-y-2 font-mono">
                  <div className="text-zinc-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    Analytical Lambertian Formulation
                  </div>
                  <div className="text-cyan-300 bg-zinc-900/90 p-2 rounded border border-cyan-900/40">
                    cos(i) = cos(θ_z)cos(θ) + sin(θ_z)sin(θ)cos(φ_s - α)
                    <br />
                    Hillshade I = 255 × max(0, cos(i))
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-400">
                    <div>θ_z = Zenith Angle ({90 - sunAltitude}°)</div>
                    <div>φ_s = Solar Azimuth ({sunAzimuth}°)</div>
                    <div>θ = Local Terrain Slope ({kernelCalculations.slopeDeg}°)</div>
                    <div>α = Downhill Aspect ({kernelCalculations.aspectDeg}°)</div>
                  </div>
                </div>

                {/* Cardinal Presets Buttons */}
                <div className="space-y-1.5">
                  <span className="text-[11px] text-zinc-400 font-medium">Sun Position Presets:</span>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    <button
                      onClick={() => { setSunAzimuth(315); setSunAltitude(45); }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-mono text-[11px]"
                    >
                      NW (315°/45°)
                    </button>
                    <button
                      onClick={() => { setSunAzimuth(45); setSunAltitude(35); }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-mono text-[11px]"
                    >
                      NE (45°/35°)
                    </button>
                    <button
                      onClick={() => { setSunAzimuth(180); setSunAltitude(60); }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-mono text-[11px]"
                    >
                      S (180°/60°)
                    </button>
                    <button
                      onClick={() => { setSunAzimuth(270); setSunAltitude(20); }}
                      className="px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded border border-zinc-700 font-mono text-[11px]"
                    >
                      W (270°/20°)
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive 3x3 Horn Kernel Simulator & Output Gauge */}
              <div className="lg:col-span-7 space-y-5 bg-zinc-900/50 p-5 rounded-xl border border-zinc-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Compass className="w-4 h-4 text-emerald-400" />
                    Horn 3x3 Finite-Difference Kernel Simulator
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400">Presets:</span>
                    <select
                      onChange={(e) => {
                        const preset = KERNEL_PRESETS[e.target.value];
                        if (preset) setGrid3x3(preset);
                      }}
                      className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200"
                    >
                      <option value="steep_embankment">Steep Embankment</option>
                      <option value="flat_beach">Flat Tailings Beach</option>
                      <option value="north_slope">North Face Slump</option>
                      <option value="saddle_ridge">Ridge & Saddle</option>
                    </select>
                  </div>
                </div>

                {/* 3x3 Elevation Matrix Grid */}
                <div className="p-4 bg-zinc-950/90 rounded-xl border border-zinc-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Elevation Grid Z(r, c) [meters MSL]</span>
                    <div className="flex items-center gap-2">
                      <span>Cell Resolution:</span>
                      <input
                        type="number"
                        value={cellSizeM}
                        onChange={(e) => setCellSizeM(Math.max(1, parseFloat(e.target.value) || 30))}
                        className="w-16 px-1.5 py-0.5 bg-zinc-900 border border-zinc-700 rounded text-right font-mono text-xs text-white"
                      />
                      <span>m</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 max-w-sm mx-auto">
                    {grid3x3.map((row, r) =>
                      row.map((cell, c) => (
                        <div
                          key={`cell-${r}-${c}`}
                          className={`p-2 rounded-lg border flex flex-col items-center justify-center transition-all ${
                            r === 1 && c === 1
                              ? 'bg-emerald-950/60 border-emerald-500/60 ring-2 ring-emerald-500/20'
                              : 'bg-zinc-900/80 border-zinc-700/60'
                          }`}
                        >
                          <span className="text-[9px] font-mono text-zinc-500 mb-0.5">
                            {r === 0 ? 'N' : r === 1 ? 'M' : 'S'}-{c === 0 ? 'W' : c === 1 ? 'C' : 'E'}
                          </span>
                          <input
                            type="number"
                            step="0.5"
                            value={cell}
                            onChange={(e) => handleCellChange(r, c, e.target.value)}
                            className="w-full text-center bg-transparent font-mono text-sm font-bold text-white focus:outline-none focus:text-emerald-400"
                          />
                        </div>
                      ))
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-500 text-center font-mono">
                    Horn's weights: [1, 2, 1] applied along orthogonal axes (8 · Δx divisor)
                  </p>
                </div>

                {/* Real-time Math Output Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Terrain Slope (θ)</span>
                    <div className="text-lg font-bold font-mono text-white">
                      {kernelCalculations.slopeDeg}°
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {kernelCalculations.slopePercent}% grade
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Downhill Aspect (α)</span>
                    <div className="text-lg font-bold font-mono text-amber-400">
                      {kernelCalculations.aspectDeg}°
                    </div>
                    <span className="text-[10px] text-zinc-400 font-semibold font-mono">
                      {kernelCalculations.aspectCardinal} Azimuth
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Hillshade Intensity</span>
                    <div className="text-lg font-bold font-mono text-emerald-400">
                      {kernelCalculations.hillshadeIntensity}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Scale [0, 255]
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 space-y-1">
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">Wetness Index (TWI)</span>
                    <div className="text-lg font-bold font-mono text-cyan-400">
                      {kernelCalculations.twiValue}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      ln(a / tan β)
                    </span>
                  </div>
                </div>

                {/* Geotechnical Hazard Classification Banner */}
                <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
                  DEM_SLOPE_HAZARD_CONFIGS[kernelCalculations.hazardTier]?.badge || 'bg-zinc-800 text-zinc-200'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider">
                        Hazard Classification: {DEM_SLOPE_HAZARD_CONFIGS[kernelCalculations.hazardTier]?.label}
                      </div>
                      <div className="text-[11px] opacity-90 mt-0.5">
                        {DEM_SLOPE_HAZARD_CONFIGS[kernelCalculations.hazardTier]?.description}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-black/40 rounded border border-white/20">
                    Risk: {DEM_SLOPE_HAZARD_CONFIGS[kernelCalculations.hazardTier]?.risk_level?.toUpperCase()}
                  </span>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: SLOPE HAZARD ZONIFICATION */}
          {activeTab === 'slope' && (
            <div className="space-y-6">
              
              {/* Critical Slope Threshold Controller */}
              <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-rose-400" />
                      Critical Embankment Angle of Repose Threshold
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Slopes exceeding this threshold are flagged as severe rotational slip and sloughing risks.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Critical Threshold:</span>
                    <span className="px-3 py-1 bg-rose-950 border border-rose-500/50 text-rose-300 font-mono font-bold rounded-lg text-sm">
                      {criticalSlopeThreshold}°
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <input
                    type="range"
                    min="15.0"
                    max="50.0"
                    step="0.5"
                    value={criticalSlopeThreshold}
                    onChange={(e) => setCriticalSlopeThreshold(parseFloat(e.target.value))}
                    className="w-full accent-rose-500 h-2 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500 font-mono">
                    <span>15° (Conservative Tailings Shell)</span>
                    <span>26.5° (1V:2.0H Standard Dam)</span>
                    <span>35.0° (Tailings Friction Angle φ)</span>
                    <span>50° (Bedrock Abutment)</span>
                  </div>
                </div>
              </div>

              {/* 5 Geotechnical Tiers Distribution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {Object.values(DEM_SLOPE_HAZARD_CONFIGS).map((tierCfg) => {
                  const isCritical = tierCfg.tier === 'critical_hazard';
                  return (
                    <div
                      key={tierCfg.tier}
                      className={`p-4 rounded-xl border flex flex-col justify-between ${
                        tierCfg.badge
                      } shadow-sm`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold font-mono">{tierCfg.label}</span>
                          <span
                            className="w-3 h-3 rounded-full border border-white/40"
                            style={{ backgroundColor: tierCfg.hex_color }}
                          />
                        </div>
                        <div className="text-[10px] font-mono opacity-80 mb-2">
                          {tierCfg.min_degrees}° - {tierCfg.max_degrees}°
                        </div>
                        <p className="text-[11px] leading-relaxed opacity-95">
                          {tierCfg.description}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono font-bold">
                        <span>Risk Level:</span>
                        <span className="uppercase">{tierCfg.risk_level}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* TWI Seepage Accumulation & Wetness Modelling Card */}
              <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    Topographic Wetness Index (TWI) & Seepage Accumulation
                  </h3>
                  <span className="text-xs font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                    ln(a / tan β)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3.5 bg-zinc-950/80 rounded-lg border border-zinc-800 space-y-1">
                    <div className="text-zinc-400 font-medium">Basin Flat Saturation Zone</div>
                    <div className="text-lg font-bold font-mono text-cyan-400">TWI &gt; 12.0</div>
                    <p className="text-[11px] text-zinc-500">
                      High phreatic surface accumulation, ponding risk near upstream beach.
                    </p>
                  </div>

                  <div className="p-3.5 bg-zinc-950/80 rounded-lg border border-zinc-800 space-y-1">
                    <div className="text-zinc-400 font-medium">Embankment Face Seepage Toe</div>
                    <div className="text-lg font-bold font-mono text-amber-400">8.0 &le; TWI &le; 12.0</div>
                    <p className="text-[11px] text-zinc-500">
                      Downstream toe daylighting zone; vulnerable to backward erosion piping.
                    </p>
                  </div>

                  <div className="p-3.5 bg-zinc-950/80 rounded-lg border border-zinc-800 space-y-1">
                    <div className="text-zinc-400 font-medium">Free Draining Shell</div>
                    <div className="text-lg font-bold font-mono text-emerald-400">TWI &lt; 8.0</div>
                    <p className="text-[11px] text-zinc-500">
                      Steep crest rockfill, rapid gravitational drainage with low pore pressure.
                    </p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: CREST-TO-TOE TRANSECT PROFILE */}
          {activeTab === 'transect' && (
            <div className="space-y-6">
              
              {/* Transect Controls & Presets Header */}
              <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-400" />
                      1D Elevation & Slope Angle Cross-Section Transect
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Extracts true continuous topography along geotechnical embankment axes and slip surfaces
                    </p>
                  </div>

                  {/* Preset selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-400">Preset Transect:</span>
                    <select
                      value={activeTransectPreset}
                      onChange={(e) => {
                        const pr = TRANSECT_PRESETS.find((p) => p.id === e.target.value);
                        if (pr) {
                          setActiveTransectPreset(pr.id);
                          setTransectStart(pr.startCoord);
                          setTransectEnd(pr.endCoord);
                        }
                      }}
                      className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-medium text-white focus:outline-none focus:border-emerald-500"
                    >
                      {TRANSECT_PRESETS.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Coordinate inputs & samples slider */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                    <span className="text-zinc-400 font-mono text-[11px]">Start Point (Crest)</span>
                    <div className="flex items-center gap-1 font-mono text-zinc-200">
                      <span>[{transectStart[0].toFixed(4)}, {transectStart[1].toFixed(4)}]</span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                    <span className="text-zinc-400 font-mono text-[11px]">End Point (Toe)</span>
                    <div className="flex items-center gap-1 font-mono text-zinc-200">
                      <span>[{transectEnd[0].toFixed(4)}, {transectEnd[1].toFixed(4)}]</span>
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-mono text-[11px]">Samples</span>
                      <span className="font-mono font-bold text-emerald-400">{transectSamples}</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      step="5"
                      value={transectSamples}
                      onChange={(e) => setTransectSamples(parseInt(e.target.value, 10))}
                      className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Transect Profile Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="p-3 bg-zinc-900/70 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono">Length</span>
                  <div className="text-lg font-bold font-mono text-white">
                    {transectProfile.total_length_m} m
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/70 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono">Elevation Relief (Δz)</span>
                  <div className="text-lg font-bold font-mono text-white">
                    {transectProfile.elevation_relief_m} m
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {transectProfile.min_elevation_m}m → {transectProfile.max_elevation_m}m
                  </span>
                </div>

                <div className="p-3 bg-zinc-900/70 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono">Mean Slope Angle</span>
                  <div className="text-lg font-bold font-mono text-amber-400">
                    {transectProfile.mean_slope_deg}°
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/70 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono">Max Slope Angle</span>
                  <div className="text-lg font-bold font-mono text-rose-400">
                    {transectProfile.max_slope_deg}°
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/70 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-mono">Critical Slope Flag</span>
                  <div className={`text-sm font-bold font-mono mt-1 ${
                    transectProfile.critical_slope_encountered ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {transectProfile.critical_slope_encountered ? 'CRITICAL DETECTED' : 'CLEAR (< 35°)'}
                  </div>
                </div>
              </div>

              {/* 2D Elevation Profile SVG Canvas */}
              <div className="p-5 bg-zinc-950/90 rounded-xl border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-200">Embankment Cross-Section: Elevation vs Chainage</span>
                  <span className="font-mono text-[11px]">
                    Crest ({transectProfile.max_elevation_m}m) ➔ Toe ({transectProfile.min_elevation_m}m)
                  </span>
                </div>

                {/* SVG Transect Graph */}
                <div className="relative w-full h-56 bg-zinc-900/60 rounded-lg border border-zinc-800 p-2 overflow-hidden flex items-end">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="elevationGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Ground fill polygon */}
                    {transectProfile.nodes && transectProfile.nodes.length > 1 && (
                      <polygon
                        points={`
                          0,200
                          ${transectProfile.nodes
                            .map((node, idx) => {
                              const x = (idx / (transectProfile.nodes.length - 1)) * 1000;
                              const elevNorm =
                                (node.elevation_m - transectProfile.min_elevation_m) /
                                Math.max(1, transectProfile.elevation_relief_m);
                              const y = 180 - elevNorm * 150;
                              return `${x},${y}`;
                            })
                            .join(' ')}
                          1000,200
                        `}
                        fill="url(#elevationGrad)"
                      />
                    )}

                    {/* Continuous elevation line with colored slope segments */}
                    {transectProfile.nodes && transectProfile.nodes.length > 1 && (
                      <polyline
                        points={transectProfile.nodes
                          .map((node, idx) => {
                            const x = (idx / (transectProfile.nodes.length - 1)) * 1000;
                            const elevNorm =
                              (node.elevation_m - transectProfile.min_elevation_m) /
                              Math.max(1, transectProfile.elevation_relief_m);
                            const y = 180 - elevNorm * 150;
                            return `${x},${y}`;
                          })
                          .join(' ')}
                        fill="none"
                        stroke="#34d399"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    )}

                    {/* Nodes along the line */}
                    {transectProfile.nodes &&
                      transectProfile.nodes.map((node, idx) => {
                        const x = (idx / (transectProfile.nodes.length - 1)) * 1000;
                        const elevNorm =
                          (node.elevation_m - transectProfile.min_elevation_m) /
                          Math.max(1, transectProfile.elevation_relief_m);
                        const y = 180 - elevNorm * 150;
                        const isSteep = node.slope_deg >= 35.0;
                        return (
                          <circle
                            key={`node-${idx}`}
                            cx={x}
                            cy={y}
                            r={isSteep ? 4.5 : 2.5}
                            fill={isSteep ? '#ef4444' : '#10b981'}
                            stroke="#000"
                            strokeWidth="1"
                          />
                        );
                      })}
                  </svg>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                  <span>0 m (Embankment Crest)</span>
                  <span className="flex items-center gap-1.5 text-zinc-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                    Normal Slope (&lt;35°)
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block ml-3" />
                    Critical Slope (&ge;35°)
                  </span>
                  <span>{transectProfile.total_length_m} m (Downstream Toe)</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: XYZ TILELAYER & BLEND CONTROLS */}
          {activeTab === 'tiles' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Metric & Colormap Selector */}
              <div className="lg:col-span-6 space-y-5 bg-zinc-900/50 p-5 rounded-xl border border-zinc-800">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  Target DEM Morphometric Indicator
                </h3>

                {/* Metric radio list */}
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.values(DEM_METRIC_CONFIGS).map((cfg) => {
                    const isSelected = selectedMetric === cfg.metric;
                    return (
                      <button
                        key={cfg.metric}
                        onClick={() => {
                          setSelectedMetric(cfg.metric);
                          setSelectedColormap(cfg.default_colormap || 'terrain');
                        }}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          isSelected
                            ? 'bg-emerald-950/70 border-emerald-500/60 ring-2 ring-emerald-500/20'
                            : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-emerald-300' : 'text-zinc-200'}`}>
                            {cfg.name}
                          </span>
                          {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
                          {cfg.description}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Colormap Palette Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300">Colormap Ramp</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(DEM_COLORMAPS_METADATA).map((cmap) => {
                      const isSel = selectedColormap === cmap.id;
                      return (
                        <button
                          key={cmap.id}
                          onClick={() => setSelectedColormap(cmap.id)}
                          className={`p-2 rounded-lg border text-left transition-all ${
                            isSel
                              ? 'bg-emerald-950/70 border-emerald-500 text-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                          }`}
                        >
                          <div className="text-[11px] font-semibold mb-1">{cmap.name}</div>
                          <div
                            className="h-2.5 w-full rounded"
                            style={{
                              background: `linear-gradient(to right, ${cmap.stops.join(', ')})`
                            }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right Column: Layer Opacity, Blend Mode & Tile URL Template */}
              <div className="lg:col-span-6 space-y-5 bg-zinc-900/50 p-5 rounded-xl border border-zinc-800">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  Leaflet TileLayer Opacity & Blend Mode
                </h3>

                {/* Opacity Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-300 font-medium">Layer Opacity</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {Math.round(layerOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="1.0"
                    step="0.05"
                    value={layerOpacity}
                    onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Blend Mode Options */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-300">CSS Canvas Blend Mode</label>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {['multiply', 'normal', 'overlay', 'screen'].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setBlendMode(mode)}
                        className={`py-1.5 rounded-lg border font-mono capitalize transition-all ${
                          blendMode === mode
                            ? 'bg-emerald-600 text-white font-bold border-emerald-400'
                            : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    * 'Multiply' blends analytical hillshade shading directly into optical satellite basemaps.
                  </p>
                </div>

                {/* Tile URL Template Box */}
                <div className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 font-mono">Dynamic Leaflet XYZ URL Template:</span>
                    <button
                      onClick={handleCopyTileUrl}
                      className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors font-mono"
                    >
                      {copiedUrl ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedUrl ? 'Copied!' : 'Copy Template'}
                    </button>
                  </div>
                  <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-cyan-300 break-all select-all">
                    {tileUrlTemplate}
                  </div>
                </div>

                {/* Quick Summary Pill */}
                <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs text-zinc-400 flex items-center justify-between font-mono">
                  <div>
                    Metric: <strong className="text-white">{selectedMetric.toUpperCase()}</strong>
                  </div>
                  <div>
                    Azimuth: <strong className="text-amber-400">{sunAzimuth}°</strong>
                  </div>
                  <div>
                    Colormap: <strong className="text-emerald-400">{selectedColormap}</strong>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Copernicus 30m Global DEM Active</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors border border-zinc-700"
            >
              Close
            </button>

            <button
              onClick={handleApplyToMap}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-all shadow-lg shadow-emerald-900/40"
            >
              <Eye className="w-4 h-4" />
              Apply Layer to Map Explorer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
