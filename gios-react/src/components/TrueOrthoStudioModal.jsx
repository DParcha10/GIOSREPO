import React, { useState } from 'react';
import { 
  X, Layers, Activity, RefreshCw, Copy, Check, 
  AlertTriangle, Sliders, 
  Sun, Scissors, Compass, Box, BarChart3, 
  Zap 
} from 'lucide-react';
import { 
  analyzeTrueOrthoZBuffer,
  optimizeGraphCutSeamlines,
  normalizeBrdfNbar
} from '../api/giosApi';
import { 
  calculateTrueOrthoZBuffer,
  buildTrueOrthoZBufferTileUrl,
  SEAMLINE_COST_FUNCTIONS,
  SEAMLINE_BLEND_METHODS,
  calculateGraphCutSeamlines,
  buildGraphCutSeamlineTileUrl,
  BRDF_KERNEL_MODELS,
  BRDF_STANDARD_BAND_PARAMS,
  calculateBrdfNbarCorrection,
  buildBrdfNbarTileUrl
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function TrueOrthoStudioModal({
  isOpen,
  onClose,
  initialTab = 'true_ortho_zbuffer',
  onApplyTileLayer = null,
  onApplySeamlines = null
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'true_ortho_zbuffer' | 'seamline_graphcut' | 'brdf_nbar'
  const [copiedKey, setCopiedKey] = useState(null);

  // --------------------------------------------------------------------------
  // Tab 1: True Orthorectification Z-Buffer Occlusion Ray-Tracing States
  // --------------------------------------------------------------------------
  const [orthoId, setOrthoId] = useState('TRUE_ORTHO_SAN_LUIS_01');
  const [dsmId, setDsmId] = useState('DSM_SAN_LUIS_5CM');
  const [cameraHeightAglM, setCameraHeightAglM] = useState(120.0);
  const [sensorPitchDeg, setSensorPitchDeg] = useState(1.5);
  const [sensorRollDeg, setSensorRollDeg] = useState(-0.8);
  const [sunZenithDeg, setSunZenithDeg] = useState(38.0);
  const [sunAzimuthDeg, setSunAzimuthDeg] = useState(135.0);
  const [dsmResolutionM, setDsmResolutionM] = useState(0.05);
  const [buildingThresholdHeightM, setBuildingThresholdHeightM] = useState(3.0);
  const [maxStructureHeightM, setMaxStructureHeightM] = useState(18.5);
  const [radialDistanceM, setRadialDistanceM] = useState(65.0);
  const [fillBlindAreas, setFillBlindAreas] = useState(true);

  const [zbufferResult, setZbufferResult] = useState(null);
  const [loadingZbuffer, setLoadingZbuffer] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 2: Multiresolution Seamline Graph-Cut Energy Minimization States
  // --------------------------------------------------------------------------
  const [mosaicId, setMosaicId] = useState('MOSAIC_REGIONAL_SEAM_01');
  const [granuleCount, setGranuleCount] = useState(3);
  const [costFunction, setCostFunction] = useState('color_plus_gradient');
  const [blendMethod, setBlendMethod] = useState('multi_band_spline');
  const [weightColor, setWeightColor] = useState(0.5);
  const [weightGradient, setWeightGradient] = useState(0.3);
  const [weightElevation, setWeightElevation] = useState(0.2);
  const [featherBufferPx, setFeatherBufferPx] = useState(25);
  const [octaveLevels, setOctaveLevels] = useState(5);

  const [seamlineResult, setSeamlineResult] = useState(null);
  const [loadingSeamline, setLoadingSeamline] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 3: BRDF Ross-Thick Li-Sparse Kernel Normalization (HLS NBAR) States
  // --------------------------------------------------------------------------
  const [brdfCollection, setBrdfCollection] = useState('landsat-c2-l2');
  const [brdfItemId, setBrdfItemId] = useState('LC09_L2SP_043034_20260718_02_T1');
  const [brdfBand, setBrdfBand] = useState('B04');
  const [kernelModel, setKernelModel] = useState('ross_thick_li_sparse');
  const [observedReflectance, setObservedReflectance] = useState(0.185);
  const [brdfSolarZenithDeg, setBrdfSolarZenithDeg] = useState(38.2);
  const [viewZenithDeg, setViewZenithDeg] = useState(7.5);
  const [relativeAzimuthDeg, setRelativeAzimuthDeg] = useState(45.0);
  const [targetSolarZenithDeg, setTargetSolarZenithDeg] = useState(45.0);

  const [brdfResult, setBrdfResult] = useState(null);
  const [loadingBrdf, setLoadingBrdf] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --------------------------------------------------------------------------
  // Execution Handlers
  // --------------------------------------------------------------------------
  const handleExecuteZBuffer = async () => {
    setLoadingZbuffer(true);
    try {
      const payload = {
        ortho_id: orthoId,
        dsm_id: dsmId,
        camera_height_agl_m: Number(cameraHeightAglM),
        sensor_pitch_deg: Number(sensorPitchDeg),
        sensor_roll_deg: Number(sensorRollDeg),
        sun_zenith_deg: Number(sunZenithDeg),
        sun_azimuth_deg: Number(sunAzimuthDeg),
        dsm_resolution_m: Number(dsmResolutionM),
        building_threshold_height_m: Number(buildingThresholdHeightM),
        max_structure_height_m: Number(maxStructureHeightM),
        radial_distance_m: Number(radialDistanceM),
        fill_blind_areas: Boolean(fillBlindAreas)
      };
      const res = await analyzeTrueOrthoZBuffer(payload);
      setZbufferResult(res);
    } catch {
      // Local fallback calculation via Agent 5 formula
      const localRes = calculateTrueOrthoZBuffer({
        cameraHeightAglM,
        sensorPitchDeg,
        sensorRollDeg,
        sunZenithDeg,
        sunAzimuthDeg,
        dsmResolutionM,
        buildingThresholdHeightM,
        maxStructureHeightM,
        radialDistanceM,
        fillBlindAreas
      });
      setZbufferResult(localRes);
    } finally {
      setLoadingZbuffer(false);
    }
  };

  const handleExecuteSeamlines = async () => {
    setLoadingSeamline(true);
    try {
      const payload = {
        mosaic_id: mosaicId,
        granule_count: Number(granuleCount),
        cost_function: costFunction,
        blend_method: blendMethod,
        weight_color: Number(weightColor),
        weight_gradient: Number(weightGradient),
        weight_elevation: Number(weightElevation),
        feather_buffer_px: Number(featherBufferPx),
        octave_levels: Number(octaveLevels)
      };
      const res = await optimizeGraphCutSeamlines(payload);
      setSeamlineResult(res);
    } catch {
      // Local fallback calculation via Agent 5 formula
      const localRes = calculateGraphCutSeamlines({
        granuleCount,
        weightColor,
        weightGradient,
        weightElevation,
        costFunction,
        blendMethod,
        featherBufferPx
      });
      setSeamlineResult(localRes);
    } finally {
      setLoadingSeamline(false);
    }
  };

  const handleExecuteBrdf = async () => {
    setLoadingBrdf(true);
    try {
      const payload = {
        collection: brdfCollection,
        item_id: brdfItemId,
        band: brdfBand,
        kernel_model: kernelModel,
        observed_reflectance: Number(observedReflectance),
        solar_zenith_deg: Number(brdfSolarZenithDeg),
        view_zenith_deg: Number(viewZenithDeg),
        relative_azimuth_deg: Number(relativeAzimuthDeg),
        target_solar_zenith_deg: Number(targetSolarZenithDeg)
      };
      const res = await normalizeBrdfNbar(payload);
      setBrdfResult(res);
    } catch {
      // Local fallback calculation via Agent 5 formula
      const localRes = calculateBrdfNbarCorrection({
        observedReflectance,
        solarZenithDeg: brdfSolarZenithDeg,
        viewZenithDeg,
        relativeAzimuthDeg,
        targetSolarZenithDeg,
        band: brdfBand
      });
      setBrdfResult(localRes);
    } finally {
      setLoadingBrdf(false);
    }
  };

  // Pre-compute local representations if null
  const currentZBuffer = zbufferResult || calculateTrueOrthoZBuffer({
    cameraHeightAglM,
    sensorPitchDeg,
    sensorRollDeg,
    sunZenithDeg,
    sunAzimuthDeg,
    dsmResolutionM,
    buildingThresholdHeightM,
    maxStructureHeightM,
    radialDistanceM,
    fillBlindAreas
  });

  const currentSeamline = seamlineResult || calculateGraphCutSeamlines({
    granuleCount,
    weightColor,
    weightGradient,
    weightElevation,
    costFunction,
    blendMethod,
    featherBufferPx
  });

  const currentBrdf = brdfResult || calculateBrdfNbarCorrection({
    observedReflectance,
    solarZenithDeg: brdfSolarZenithDeg,
    viewZenithDeg,
    relativeAzimuthDeg,
    targetSolarZenithDeg,
    band: brdfBand
  });

  // Chart data for Tab 1: Occlusion Breakdown Bar Chart
  const zbufferChartData = {
    labels: ['Visible (Nadir)', 'Building Lean', 'Terrain Shadow', 'Blind Hole'],
    datasets: [
      {
        label: 'Pixel Count',
        data: [
          currentZBuffer.visible_pixels,
          currentZBuffer.building_lean_pixels,
          currentZBuffer.shadow_pixels,
          currentZBuffer.blind_hole_pixels
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.75)',
          'rgba(249, 115, 22, 0.75)',
          'rgba(139, 92, 246, 0.75)',
          'rgba(239, 68, 68, 0.75)'
        ],
        borderColor: [
          '#22c55e',
          '#f97316',
          '#8b5cf6',
          '#ef4444'
        ],
        borderWidth: 1.5,
        borderRadius: 4
      }
    ]
  };

  // Chart data for Tab 2: Seamline Segments Transition Cost
  const seamlineChartData = {
    labels: (currentSeamline.seam_segments || []).map(s => `Seg ${s.segment_id} (${s.length_m}m)`),
    datasets: [
      {
        label: 'Mean Color Delta',
        data: (currentSeamline.seam_segments || []).map(s => s.mean_color_delta),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        tension: 0.35,
        fill: true
      },
      {
        label: 'Gradient Cost',
        data: (currentSeamline.seam_segments || []).map(s => s.mean_gradient_cost),
        borderColor: '#eab308',
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        tension: 0.35,
        fill: false
      }
    ]
  };

  // Chart data for Tab 3: Observed vs NBAR Reflectance
  const brdfChartData = {
    labels: ['Observed Multi-Angle Reflectance', 'Nadir BRDF-Adjusted (NBAR 45°)'],
    datasets: [
      {
        label: `Reflectance (${brdfBand})`,
        data: [currentBrdf.observed_reflectance, currentBrdf.nbar_reflectance],
        backgroundColor: ['rgba(59, 130, 246, 0.75)', 'rgba(34, 197, 94, 0.75)'],
        borderColor: ['#3b82f6', '#22c55e'],
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-cyan-950/40 text-slate-100 overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-400 shadow-inner">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  True Orthorectification & Radiometric Blending Studio
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Cycle v2.5.8
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Z-Buffer Occlusion Ray-Tracing • Multiresolution Graph-Cut Seamlines • Ross-Thick Li-Sparse BRDF NBAR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 px-6 py-3 border-b border-slate-800/80 bg-slate-900/90 text-sm">
          <button
            onClick={() => setActiveTab('true_ortho_zbuffer')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'true_ortho_zbuffer'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>True Ortho Z-Buffer Occlusion</span>
          </button>

          <button
            onClick={() => setActiveTab('seamline_graphcut')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'seamline_graphcut'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Scissors className="w-4 h-4" />
            <span>Graph-Cut Seamline Energy</span>
          </button>

          <button
            onClick={() => setActiveTab('brdf_nbar')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'brdf_nbar'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Sun className="w-4 h-4" />
            <span>BRDF Ross-Li NBAR</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: True Orthorectification Z-Buffer Occlusion Ray-Tracing */}
          {activeTab === 'true_ortho_zbuffer' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Parameters Panel */}
              <div className="lg:col-span-5 space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm">
                    <Sliders className="w-4 h-4" />
                    <span>Z-Buffer Ray-Tracing Configuration</span>
                  </div>
                  <span className="text-xs text-slate-500">Perspective Lean & Shadow</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Ortho Dataset ID</label>
                    <input
                      type="text"
                      value={orthoId}
                      onChange={(e) => setOrthoId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">DSM ID</label>
                    <input
                      type="text"
                      value={dsmId}
                      onChange={(e) => setDsmId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Flight & Structure Heights */}
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Flight Height AGL (H)</span>
                      <span className="font-mono text-cyan-400 font-medium">{cameraHeightAglM} m</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="500"
                      step="5"
                      value={cameraHeightAglM}
                      onChange={(e) => setCameraHeightAglM(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Max Structure Height (h)</span>
                      <span className="font-mono text-cyan-400 font-medium">{maxStructureHeightM} m</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="100"
                      step="0.5"
                      value={maxStructureHeightM}
                      onChange={(e) => setMaxStructureHeightM(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Building Height Cutoff (h_min)</span>
                      <span className="font-mono text-cyan-400 font-medium">{buildingThresholdHeightM} m</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.5"
                      value={buildingThresholdHeightM}
                      onChange={(e) => setBuildingThresholdHeightM(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Radial Distance from Nadir (r)</span>
                      <span className="font-mono text-cyan-400 font-medium">{radialDistanceM} m</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="300"
                      step="5"
                      value={radialDistanceM}
                      onChange={(e) => setRadialDistanceM(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* Sun Geometry */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Sun Zenith (θs)</span>
                      <span className="font-mono text-cyan-400">{sunZenithDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="1"
                      value={sunZenithDeg}
                      onChange={(e) => setSunZenithDeg(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Sun Azimuth (ϕs)</span>
                      <span className="font-mono text-cyan-400">{sunAzimuthDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={sunAzimuthDeg}
                      onChange={(e) => setSunAzimuthDeg(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* Sensor Pitch & Roll */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Pitch (tilt)</span>
                      <span className="font-mono text-cyan-400">{sensorPitchDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      step="0.5"
                      value={sensorPitchDeg}
                      onChange={(e) => setSensorPitchDeg(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Roll (tilt)</span>
                      <span className="font-mono text-cyan-400">{sensorRollDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="-15"
                      max="15"
                      step="0.5"
                      value={sensorRollDeg}
                      onChange={(e) => setSensorRollDeg(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* DSM & Blind Area Options */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">DSM GSD</label>
                    <select
                      value={dsmResolutionM}
                      onChange={(e) => setDsmResolutionM(parseFloat(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="0.02">0.02 m (Ultra 2cm)</option>
                      <option value="0.05">0.05 m (Standard 5cm)</option>
                      <option value="0.10">0.10 m (10cm)</option>
                      <option value="0.25">0.25 m (25cm)</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 pt-5">
                    <input
                      type="checkbox"
                      id="fillBlindAreasToggle"
                      checked={fillBlindAreas}
                      onChange={(e) => setFillBlindAreas(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <label htmlFor="fillBlindAreasToggle" className="text-xs text-slate-300 cursor-pointer">
                      Fill Blind Voids (Adjacency)
                    </label>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExecuteZBuffer}
                    disabled={loadingZbuffer}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingZbuffer ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    <span>Execute Z-Buffer Occlusion Ray-Trace</span>
                  </button>
                </div>
              </div>

              {/* Analytical Results & Visuals */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Occlusion Rate</div>
                    <div className="text-xl font-bold font-mono text-cyan-300">
                      {currentZBuffer.occlusion_percentage}%
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {currentZBuffer.occluded_pixels.toLocaleString()} occluded px
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Max Building Lean</div>
                    <div className="text-xl font-bold font-mono text-amber-400">
                      {currentZBuffer.max_building_lean_displacement_m} m
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Radial perspective shift</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Cast Shadow Length</div>
                    <div className="text-xl font-bold font-mono text-purple-400">
                      {currentZBuffer.max_shadow_length_m} m
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Solar azimuth {currentZBuffer.sun_azimuth_deg}°</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Quality Tier</div>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${
                        currentZBuffer.tier_metadata?.badgeClass || 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {currentZBuffer.tier_metadata?.label || currentZBuffer.quality_tier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Occlusion Breakdown Chart */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <span>Ray-Tracing Pixel Visibility & Occlusion Distribution</span>
                    </div>
                    <span className="text-xs text-slate-400">Total 262,144 px (512x512 tile)</span>
                  </div>
                  <div className="h-56">
                    <Bar
                      data={zbufferChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toLocaleString()} pixels`
                            }
                          }
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                          y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 11 } } }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Map Streaming & Export Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Tile Endpoint:</span>
                    <code className="text-xs font-mono text-cyan-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      /api/v1/tiles/ortho/true-orthorectification/{orthoId}/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png
                    </code>
                    <button
                      onClick={() => handleCopy(buildTrueOrthoZBufferTileUrl(orthoId, '{z}', '{x}', '{y}'), 'tile_zbuffer')}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Copy URL"
                    >
                      {copiedKey === 'tile_zbuffer' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (onApplyTileLayer) {
                        const url = buildTrueOrthoZBufferTileUrl(orthoId, '{z}', '{x}', '{y}');
                        onApplyTileLayer({
                          id: `true_ortho_${orthoId}`,
                          name: `True Ortho (${orthoId})`,
                          tileUrl: url,
                          opacity: 0.85,
                          maxZoom: 22
                        });
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/50 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Stream True-Ortho Z-Buffer to Map</span>
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Multiresolution Seamline Graph-Cut Energy Minimization */}
          {activeTab === 'seamline_graphcut' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Parameters Panel */}
              <div className="lg:col-span-5 space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-blue-400 font-semibold text-sm">
                    <Scissors className="w-4 h-4" />
                    <span>Graph-Cut Energy Minimization</span>
                  </div>
                  <span className="text-xs text-slate-500">Dijkstra / Boykov-Kolmogorov</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Mosaic ID</label>
                    <input
                      type="text"
                      value={mosaicId}
                      onChange={(e) => setMosaicId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-blue-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Granule Count</label>
                    <input
                      type="number"
                      min="2"
                      max="12"
                      value={granuleCount}
                      onChange={(e) => setGranuleCount(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Formulation Selectors */}
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Cost Function E(s)</label>
                    <select
                      value={costFunction}
                      onChange={(e) => setCostFunction(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                    >
                      {SEAMLINE_COST_FUNCTIONS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Blending Method</label>
                    <select
                      value={blendMethod}
                      onChange={(e) => setBlendMethod(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                    >
                      {SEAMLINE_BLEND_METHODS.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Energy Weights */}
                <div className="space-y-2 pt-1 border-t border-slate-800">
                  <span className="text-xs font-semibold text-slate-400 block">Relative Energy Weights</span>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Color Radiometry (ωcolor)</span>
                      <span className="font-mono text-blue-400">{weightColor}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weightColor}
                      onChange={(e) => setWeightColor(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Gradient Difference (ωgrad)</span>
                      <span className="font-mono text-blue-400">{weightGradient}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weightGradient}
                      onChange={(e) => setWeightGradient(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Elevation Obstacles (ωelev)</span>
                      <span className="font-mono text-blue-400">{weightElevation}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={weightElevation}
                      onChange={(e) => setWeightElevation(parseFloat(e.target.value))}
                      className="w-full accent-blue-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* Feather Buffer & Octaves */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Feather Buffer (px)</label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={featherBufferPx}
                      onChange={(e) => setFeatherBufferPx(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Laplacian Octaves</label>
                    <input
                      type="number"
                      min="2"
                      max="8"
                      value={octaveLevels}
                      onChange={(e) => setOctaveLevels(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExecuteSeamlines}
                    disabled={loadingSeamline}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingSeamline ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Scissors className="w-4 h-4" />}
                    <span>Optimize Graph-Cut Seamline Network</span>
                  </button>
                </div>
              </div>

              {/* Analytical Results & Visuals */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Mean Energy Cost</div>
                    <div className="text-xl font-bold font-mono text-blue-300">
                      {currentSeamline.mean_transition_energy}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Weighted boundary flux</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Seamline Length</div>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {currentSeamline.total_seamline_length_m} m
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{currentSeamline.total_seamline_nodes} nodes traversed</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Obstacles Avoided</div>
                    <div className="text-xl font-bold font-mono text-cyan-400">
                      {currentSeamline.obstacle_crossings_avoided} structures
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Tall obstacles bypassed</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Radiometric Tier</div>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${
                        currentSeamline.tier_metadata?.badgeClass || 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                      }`}>
                        {currentSeamline.tier_metadata?.label || currentSeamline.radiometric_tier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transition Energy Profile Chart */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                      <Activity className="w-4 h-4 text-blue-400" />
                      <span>Boundary Seamline Transition Radiometry & Gradient Cost</span>
                    </div>
                    <span className="text-xs text-slate-400">{currentSeamline.seam_segments?.length || 0} Segments</span>
                  </div>
                  <div className="h-56">
                    <Line
                      data={seamlineChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { labels: { color: '#cbd5e1', font: { size: 11 } } },
                          tooltip: { mode: 'index', intersect: false }
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                          y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 11 } } }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Map Streaming & Export Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Tile Endpoint:</span>
                    <code className="text-xs font-mono text-blue-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      /api/v1/tiles/mosaic/graphcut-seamlines/{mosaicId}/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png
                    </code>
                    <button
                      onClick={() => handleCopy(buildGraphCutSeamlineTileUrl(mosaicId, '{z}', '{x}', '{y}'), 'tile_seamline')}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Copy URL"
                    >
                      {copiedKey === 'tile_seamline' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {onApplySeamlines && (
                      <button
                        onClick={() => onApplySeamlines(currentSeamline.seam_segments || [])}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-all"
                      >
                        Display Seamline Cutlines
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (onApplyTileLayer) {
                          const url = buildGraphCutSeamlineTileUrl(mosaicId, '{z}', '{x}', '{y}');
                          onApplyTileLayer({
                            id: `seamline_${mosaicId}`,
                            name: `Seamline Mosaic (${mosaicId})`,
                            tileUrl: url,
                            opacity: 0.85,
                            maxZoom: 20
                          });
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600/30 hover:bg-blue-600/40 text-blue-300 border border-blue-500/50 rounded-xl text-xs font-semibold transition-all"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Stream Seamline Layer to Map</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: BRDF Ross-Thick Li-Sparse Kernel Normalization */}
          {activeTab === 'brdf_nbar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Parameters Panel */}
              <div className="lg:col-span-5 space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-amber-400 font-semibold text-sm">
                    <Sun className="w-4 h-4" />
                    <span>Ross-Thick Li-Sparse BRDF NBAR</span>
                  </div>
                  <span className="text-xs text-slate-500">HLS / MODIS Standard</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Collection</label>
                    <select
                      value={brdfCollection}
                      onChange={(e) => setBrdfCollection(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="landsat-c2-l2">Landsat-C2-L2 (HLS L30)</option>
                      <option value="sentinel-2-l2a">Sentinel-2 L2A (HLS S30)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Spectral Band</label>
                    <select
                      value={brdfBand}
                      onChange={(e) => setBrdfBand(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-amber-300 focus:outline-none"
                    >
                      {Object.keys(BRDF_STANDARD_BAND_PARAMS).filter(b => b.startsWith('B')).map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Observation Scene / Granule Item ID</label>
                  <input
                    type="text"
                    value={brdfItemId}
                    onChange={(e) => setBrdfItemId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-amber-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Kernel Model</label>
                  <select
                    value={kernelModel}
                    onChange={(e) => setKernelModel(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                  >
                    {BRDF_KERNEL_MODELS.map((k) => (
                      <option key={k.id} value={k.id}>{k.label}</option>
                    ))}
                  </select>
                </div>

                {/* Observed Reflectance Slider */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">Observed Surface Reflectance (ρobs)</span>
                    <span className="font-mono text-amber-400 font-medium">{observedReflectance}</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.80"
                    step="0.005"
                    value={observedReflectance}
                    onChange={(e) => setObservedReflectance(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
                  />
                </div>

                {/* Angles: Solar Zenith & View Zenith */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Solar Zenith (θs)</span>
                      <span className="font-mono text-amber-400">{brdfSolarZenithDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      step="1"
                      value={brdfSolarZenithDeg}
                      onChange={(e) => setBrdfSolarZenithDeg(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">View Zenith (θv)</span>
                      <span className="font-mono text-amber-400">{viewZenithDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="45"
                      step="0.5"
                      value={viewZenithDeg}
                      onChange={(e) => setViewZenithDeg(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* Relative Azimuth & Target Solar Zenith */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Relative Azimuth (ϕ)</span>
                      <span className="font-mono text-amber-400">{relativeAzimuthDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={relativeAzimuthDeg}
                      onChange={(e) => setRelativeAzimuthDeg(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Target Solar (θs0)</span>
                      <span className="font-mono text-amber-400">{targetSolarZenithDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="60"
                      step="5"
                      value={targetSolarZenithDeg}
                      onChange={(e) => setTargetSolarZenithDeg(parseFloat(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExecuteBrdf}
                    disabled={loadingBrdf}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingBrdf ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sun className="w-4 h-4" />}
                    <span>Normalize to Nadir BRDF-Adjusted (NBAR)</span>
                  </button>
                </div>
              </div>

              {/* Analytical Results & Visuals */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">NBAR Reflectance</div>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {currentBrdf.nbar_reflectance}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Normalized to θv=0°, θs=45°</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">BRDF C-Factor</div>
                    <div className="text-xl font-bold font-mono text-amber-300">
                      {currentBrdf.brdf_correction_factor}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Multiplicative scaling</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Kernels (Obs)</div>
                    <div className="text-sm font-bold font-mono text-slate-200">
                      Kvol: {currentBrdf.k_vol_observed}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">Kgeo: {currentBrdf.k_geo_observed}</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Alignment Tier</div>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${
                        currentBrdf.tier_metadata?.badgeClass || 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {currentBrdf.tier_metadata?.label || currentBrdf.normalization_tier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Hotspot Advisory Alert */}
                {currentBrdf.hotspot_effect_detected && (
                  <div className="flex items-center space-x-3 p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-amber-200 text-xs">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div>
                      <span className="font-semibold block">Solar Retroreflection / Hotspot Condition Detected</span>
                      <span>View and solar zenith angles are within 10° and azimuth is aligned with sun position. Extreme directional backscatter active.</span>
                    </div>
                  </div>
                )}

                {/* Reflectance Comparison Chart */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                      <BarChart3 className="w-4 h-4 text-amber-400" />
                      <span>Observed vs. Nadir BRDF-Adjusted Reflectance (NBAR) Comparison</span>
                    </div>
                    <span className="text-xs text-slate-400">Band {brdfBand}</span>
                  </div>
                  <div className="h-56">
                    <Bar
                      data={brdfChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `Reflectance: ${(ctx.raw * 100).toFixed(2)}%`
                            }
                          }
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                          y: { min: 0, max: Math.max(0.5, currentBrdf.observed_reflectance * 1.5), grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 11 } } }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Map Streaming & Export Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Tile Endpoint:</span>
                    <code className="text-xs font-mono text-amber-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      /api/v1/tiles/preprocessing/brdf-nbar/{brdfCollection}/{brdfItemId}/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png
                    </code>
                    <button
                      onClick={() => handleCopy(buildBrdfNbarTileUrl(brdfCollection, brdfItemId, '{z}', '{x}', '{y}'), 'tile_brdf')}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Copy URL"
                    >
                      {copiedKey === 'tile_brdf' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (onApplyTileLayer) {
                        const url = buildBrdfNbarTileUrl(brdfCollection, brdfItemId, '{z}', '{x}', '{y}');
                        onApplyTileLayer({
                          id: `brdf_${brdfItemId}`,
                          name: `BRDF NBAR (${brdfItemId})`,
                          tileUrl: url,
                          opacity: 0.85,
                          maxZoom: 18
                        });
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/50 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Stream BRDF NBAR Layer to Map</span>
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
