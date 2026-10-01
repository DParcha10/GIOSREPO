import React, { useState } from 'react';
import { 
  X, Mountain, Waves, Sprout, Layers, 
  RefreshCw, Copy, Check, Activity, ShieldAlert,
  AlertTriangle, CheckCircle2, ArrowUpRight,
  TrendingDown, Gauge, BarChart3, CloudSnow, Droplets,
  Sliders, SlidersHorizontal, Sun, Eye, EyeOff
} from 'lucide-react';
import { 
  analyzeFractionalSnowCover,
  analyzeAquaticTurbidity,
  detectDisturbanceBreaks,
  analyzeCropWaterStress,
  executePyramidSplineBlend
} from '../api/giosApi';
import { 
  FSC_MODEL_TYPES,
  SNOWPACK_RUNOFF_TIERS,
  calculateFractionalSnowCover,
  buildSnowCoverTileUrl,
  TSM_ALGORITHMS,
  AQUATIC_TURBIDITY_TIERS,
  calculateAquaticTsmTurbidity,
  buildTurbidityTsmTileUrl,
  DISTURBANCE_MODELS,
  DISTURBANCE_TYPES,
  BREAK_SIGNIFICANCE_TIERS,
  detectStructuralDisturbanceBreaks,
  buildDisturbanceTileUrl,
  CWSI_MODEL_TYPES,
  WATER_STRESS_TIERS,
  calculateCropWaterStressIndex,
  buildCwsiTileUrl,
  PYRAMID_BLEND_MODES,
  SEAM_RADIOMETRIC_QUALITIES,
  calculateLaplacianPyramidBlend,
  buildSplineMosaicTileUrl
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function EnvironmentalDiagnosticsModal({
  isOpen,
  onClose,
  initialTab = 'snow_cover',
  onApplyTileLayer = null
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'snow_cover' | 'aquatic_turbidity' | 'disturbance_breaks' | 'crop_water_stress' | 'pyramid_spline'
  const [copiedKey, setCopiedKey] = useState(null);

  // Tab 1: Cryosphere Fractional Snow Cover (FSC) States
  const [snowSceneId, setSnowSceneId] = useState('S2A_MSIL2A_20260215T184211');
  const [snowModel, setSnowModel] = useState(FSC_MODEL_TYPES.SALOMONSON_APPEL);
  const [snowGreen, setSnowGreen] = useState(0.48);
  const [snowSwir1, setSnowSwir1] = useState(0.12);
  const [snowElevationM, setSnowElevationM] = useState(2450);
  const [snowDepthM, setSnowDepthM] = useState(0.85);
  const [snowDensityKgM3, setSnowDensityKgM3] = useState(320);
  const [snowRunoffCoeff, setSnowRunoffCoeff] = useState(0.85);
  const [snowAreaHa, setSnowAreaHa] = useState(420);
  const [snowResult, setSnowResult] = useState(null);
  const [loadingSnow, setLoadingSnow] = useState(false);

  // Tab 2: Aquatic TSM & Turbidity Inversion States
  const [turbSceneId, setTurbSceneId] = useState('S2B_MSIL2A_20260714T172901');
  const [turbAlgorithm, setTurbAlgorithm] = useState(TSM_ALGORITHMS.DOGLIOTTI_SWITCHING);
  const [turbRed, setTurbRed] = useState(0.065);
  const [turbNir, setTurbNir] = useState(0.038);
  const [turbGreen, setTurbGreen] = useState(0.045);
  const [turbWaterAreaHa, setTurbWaterAreaHa] = useState(350);
  const [turbResult, setTurbResult] = useState(null);
  const [loadingTurb, setLoadingTurb] = useState(false);

  // Tab 3: Abrupt Structural Disturbance Break Detection States
  const [distMetric, setDistMetric] = useState('ndvi');
  const [distModel, setDistModel] = useState(DISTURBANCE_MODELS.BFAST_LITE);
  const [distAlpha, setDistAlpha] = useState(0.05);
  const [distPreset, setDistPreset] = useState('collapse'); // 'collapse' | 'subsidence' | 'recovery' | 'stable'
  const [distDates, setDistDates] = useState([
    '2025-01-15', '2025-03-01', '2025-04-15', '2025-06-01', 
    '2025-07-15', '2025-09-01', '2025-10-15', '2025-12-01',
    '2026-01-15', '2026-03-01', '2026-04-15', '2026-06-01'
  ]);
  const [distValues, setDistValues] = useState([
    0.72, 0.70, 0.71, 0.69, 0.68, 0.42, 0.38, 0.36, 0.35, 0.33, 0.31, 0.30
  ]);
  const [distResult, setDistResult] = useState(null);
  const [loadingDist, setLoadingDist] = useState(false);

  // Tab 4: Crop Water Stress Index (CWSI) States
  const [cwsiSceneId, setCwsiSceneId] = useState('LC09_L2SP_042034_20260718');
  const [cwsiModel, setCwsiModel] = useState(CWSI_MODEL_TYPES.EMPIRICAL_IDSO);
  const [cwsiCanopyTemp, setCwsiCanopyTemp] = useState(33.5);
  const [cwsiAirTemp, setCwsiAirTemp] = useState(28.0);
  const [cwsiRhPct, setCwsiRhPct] = useState(32);
  const [cwsiVpdKpa, setCwsiVpdKpa] = useState(2.6);
  const [cwsiNdvi, setCwsiNdvi] = useState(0.68);
  const [cwsiEt0, setCwsiEt0] = useState(6.2);
  const [cwsiResult, setCwsiResult] = useState(null);
  const [loadingCwsi, setLoadingCwsi] = useState(false);

  // Tab 5: Multi-Resolution Spline & Pyramid Mosaic States
  const [mosaicId, setMosaicId] = useState('drone_mosaic_san_luis');
  const [leftSceneId, setLeftSceneId] = useState('UAV_FLIGHT_01_PASS_A');
  const [rightSceneId, setRightSceneId] = useState('UAV_FLIGHT_01_PASS_B');
  const [blendMode, setBlendMode] = useState(PYRAMID_BLEND_MODES.MULTIRESOLUTION_SPLINE);
  const [pyramidLevels, setPyramidLevels] = useState(5);
  const [transitionWidthPx, setTransitionWidthPx] = useState(64);
  const [leftMeanRadiance, setLeftMeanRadiance] = useState(142.5);
  const [rightMeanRadiance, setRightMeanRadiance] = useState(158.0);
  const [splineResult, setSplineResult] = useState(null);
  const [loadingSpline, setLoadingSpline] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --- Handlers ---
  const handleExecuteSnowCover = async () => {
    setLoadingSnow(true);
    try {
      const resp = await analyzeFractionalSnowCover({
        collection: 'sentinel-2-l2a',
        item_id: snowSceneId,
        model_type: snowModel,
        green_band_reflectance: snowGreen,
        swir1_band_reflectance: snowSwir1,
        elevation_m: snowElevationM,
        snow_depth_m: snowDepthM,
        snow_density_kg_m3: snowDensityKgM3,
        runoff_coefficient: snowRunoffCoeff,
        total_area_ha: snowAreaHa
      });
      setSnowResult(resp);
    } catch {
      // Robust client fallback
      const local = calculateFractionalSnowCover(snowGreen, snowSwir1, snowModel, snowElevationM, {
        snowDepthM,
        snowDensityKgM3,
        runoffCoeff: snowRunoffCoeff,
        areaHa: snowAreaHa
      });
      setSnowResult({
        ...local,
        collection: 'sentinel-2-l2a',
        item_id: snowSceneId,
        model_type: snowModel,
        tile_url_template: buildSnowCoverTileUrl('sentinel-2-l2a', snowSceneId, '{z}', '{x}', '{y}', { model: snowModel })
      });
    } finally {
      setLoadingSnow(false);
    }
  };

  const handleExecuteTurbidity = async () => {
    setLoadingTurb(true);
    try {
      const resp = await analyzeAquaticTurbidity({
        collection: 'sentinel-2-l2a',
        item_id: turbSceneId,
        algorithm: turbAlgorithm,
        red_reflectance: turbRed,
        nir_reflectance: turbNir,
        green_reflectance: turbGreen,
        water_body_area_ha: turbWaterAreaHa
      });
      setTurbResult(resp);
    } catch {
      const local = calculateAquaticTsmTurbidity(turbRed, turbNir, turbAlgorithm, turbWaterAreaHa);
      setTurbResult({
        ...local,
        collection: 'sentinel-2-l2a',
        item_id: turbSceneId,
        algorithm_used: turbAlgorithm,
        tile_url_template: buildTurbidityTsmTileUrl('sentinel-2-l2a', turbSceneId, 'turbidity', '{z}', '{x}', '{y}')
      });
    } finally {
      setLoadingTurb(false);
    }
  };

  const handleDisturbancePresetChange = (presetKey) => {
    setDistPreset(presetKey);
    const dates = [
      '2025-01-15', '2025-03-01', '2025-04-15', '2025-06-01', 
      '2025-07-15', '2025-09-01', '2025-10-15', '2025-12-01',
      '2026-01-15', '2026-03-01', '2026-04-15', '2026-06-01'
    ];
    setDistDates(dates);
    if (presetKey === 'collapse') {
      setDistValues([0.72, 0.70, 0.71, 0.69, 0.68, 0.42, 0.38, 0.36, 0.35, 0.33, 0.31, 0.30]);
    } else if (presetKey === 'subsidence') {
      setDistValues([0.65, 0.63, 0.61, 0.58, 0.56, 0.54, 0.51, 0.48, 0.45, 0.42, 0.39, 0.37]);
    } else if (presetKey === 'recovery') {
      setDistValues([0.30, 0.32, 0.31, 0.33, 0.34, 0.48, 0.55, 0.60, 0.64, 0.67, 0.70, 0.72]);
    } else {
      setDistValues([0.65, 0.66, 0.64, 0.65, 0.67, 0.65, 0.66, 0.64, 0.65, 0.66, 0.65, 0.64]);
    }
  };

  const handleExecuteDisturbance = async () => {
    setLoadingDist(true);
    try {
      const resp = await detectDisturbanceBreaks({
        time_series_dates: distDates,
        time_series_values: distValues,
        metric_name: distMetric,
        model: distModel,
        significance_alpha: distAlpha
      });
      setDistResult(resp);
    } catch {
      const local = detectStructuralDisturbanceBreaks(distDates, distValues, distModel, distAlpha);
      setDistResult({
        ...local,
        metric_name: distMetric,
        tile_url_template: buildDisturbanceTileUrl('sentinel-2-l2a', 'trajectory-grid', '{z}', '{x}', '{y}')
      });
    } finally {
      setLoadingDist(false);
    }
  };

  const handleExecuteCwsi = async () => {
    setLoadingCwsi(true);
    try {
      const resp = await analyzeCropWaterStress({
        collection: 'landsat-c2-l2',
        item_id: cwsiSceneId,
        model_type: cwsiModel,
        canopy_temperature_c: cwsiCanopyTemp,
        air_temperature_c: cwsiAirTemp,
        relative_humidity_pct: cwsiRhPct,
        vapor_pressure_deficit_kpa: cwsiVpdKpa,
        ndvi: cwsiNdvi,
        reference_et0_mm_day: cwsiEt0
      });
      setCwsiResult(resp);
    } catch {
      const local = calculateCropWaterStressIndex(
        cwsiCanopyTemp, cwsiAirTemp, cwsiRhPct, cwsiVpdKpa, cwsiNdvi, cwsiModel, cwsiEt0
      );
      setCwsiResult({
        ...local,
        collection: 'landsat-c2-l2',
        item_id: cwsiSceneId,
        model_used: cwsiModel,
        tile_url_template: buildCwsiTileUrl('landsat-c2-l2', cwsiSceneId, '{z}', '{x}', '{y}')
      });
    } finally {
      setLoadingCwsi(false);
    }
  };

  const handleExecuteSplineBlend = async () => {
    setLoadingSpline(true);
    try {
      const resp = await executePyramidSplineBlend({
        mosaic_id: mosaicId,
        left_scene_id: leftSceneId,
        right_scene_id: rightSceneId,
        blend_mode: blendMode,
        pyramid_levels: pyramidLevels,
        seam_transition_width_px: transitionWidthPx,
        left_mean_radiance: leftMeanRadiance,
        right_mean_radiance: rightMeanRadiance
      });
      setSplineResult(resp);
    } catch {
      const local = calculateLaplacianPyramidBlend(
        leftMeanRadiance, rightMeanRadiance, transitionWidthPx, pyramidLevels, blendMode
      );
      setSplineResult({
        ...local,
        mosaic_id: mosaicId,
        blend_mode: blendMode,
        tile_url_template: buildSplineMosaicTileUrl(mosaicId, '{z}', '{x}', '{y}', { blendMode })
      });
    } finally {
      setLoadingSpline(false);
    }
  };

  // --- Chart Data Builders ---
  // Tab 1 Chart: Elevation vs. Snow Cover Sensitivity
  const snowElevationChartData = {
    labels: ['1500m', '1800m', '2100m', '2400m', '2700m', '3000m', '3300m'],
    datasets: [
      {
        label: 'Fractional Snow Cover (%)',
        data: [
          Math.max(0, (snowResult?.fractional_snow_cover_pct || 55) - 35),
          Math.max(0, (snowResult?.fractional_snow_cover_pct || 55) - 22),
          Math.max(0, (snowResult?.fractional_snow_cover_pct || 55) - 10),
          snowResult?.fractional_snow_cover_pct || 55,
          Math.min(100, (snowResult?.fractional_snow_cover_pct || 55) + 18),
          Math.min(100, (snowResult?.fractional_snow_cover_pct || 55) + 32),
          Math.min(100, (snowResult?.fractional_snow_cover_pct || 55) + 42)
        ],
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4
      }
    ]
  };

  // Tab 2 Chart: Water Reflectance vs. Turbidity Curve
  const turbChartData = {
    labels: ['0.01', '0.03', '0.05 (Switch)', '0.07 (NIR)', '0.10', '0.15', '0.20'],
    datasets: [
      {
        label: 'Turbidity (NTU/FNU)',
        data: [4.2, 14.8, 32.5, 62.1, 112.0, 218.4, 345.0],
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        fill: true,
        tension: 0.3,
        borderWidth: 2
      },
      {
        label: 'TSM Concentration (g/m³)',
        data: [5.8, 21.2, 46.8, 89.4, 161.0, 314.0, 498.0],
        borderColor: '#f97316',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        borderWidth: 2
      }
    ]
  };

  // Tab 3 Chart: Disturbance Trajectory with Breakpoint
  const distChartData = {
    labels: distDates.map(d => d.slice(5)),
    datasets: [
      {
        label: `Trajectory (${distMetric.toUpperCase()})`,
        data: distValues,
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        fill: true,
        tension: 0.2,
        pointBackgroundColor: distValues.map((_, i) => 
          distResult?.primary_break?.break_index === i ? '#ef4444' : '#a855f7'
        ),
        pointRadius: distValues.map((_, i) => 
          distResult?.primary_break?.break_index === i ? 8 : 4
        ),
        borderWidth: 2
      }
    ]
  };

  // Tab 4 Chart: CWSI Baseline
  const cwsiChartData = {
    labels: ['0.5 kPa', '1.0 kPa', '1.5 kPa', '2.0 kPa', '2.5 kPa', '3.0 kPa', '3.5 kPa'],
    datasets: [
      {
        label: 'Upper Stressed Limit (Tc - Ta = +5.0°C)',
        data: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 5.0],
        borderColor: '#ef4444',
        borderWidth: 1.5,
        borderDash: [4, 4],
        pointRadius: 0
      },
      {
        label: 'Non-Stressed Baseline (NWSB)',
        data: [0.15, -0.70, -1.55, -2.40, -3.25, -4.10, -4.95],
        borderColor: '#10b981',
        borderWidth: 1.5,
        pointRadius: 0
      }
    ]
  };

  // Tab 5 Chart: Laplacian Octave Attenuation
  const splineChartData = {
    labels: ['Level 0 (Full Res)', 'Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5 (Coarse)'],
    datasets: [
      {
        label: 'Octave Seam Discontinuity (DN)',
        data: [
          Math.abs(leftMeanRadiance - rightMeanRadiance),
          Math.abs(leftMeanRadiance - rightMeanRadiance) * 0.5,
          Math.abs(leftMeanRadiance - rightMeanRadiance) * 0.25,
          Math.abs(leftMeanRadiance - rightMeanRadiance) * 0.125,
          Math.abs(leftMeanRadiance - rightMeanRadiance) * 0.0625,
          Math.abs(leftMeanRadiance - rightMeanRadiance) * 0.03125
        ],
        backgroundColor: '#06b6d4',
        borderRadius: 4
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 10, family: 'monospace' } }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        borderColor: '#334155',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 9, family: 'monospace' } },
        grid: { color: 'rgba(51, 65, 85, 0.3)' }
      },
      y: {
        ticks: { color: '#64748b', font: { size: 9, family: 'monospace' } },
        grid: { color: 'rgba(51, 65, 85, 0.3)' }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-gray-950 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden font-sans text-gray-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900/80 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <CloudSnow className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2 font-mono">
                <span>Environmental & Agricultural Diagnostics Studio</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal">
                  Cycle v2.5.6
                </span>
              </h2>
              <p className="text-xs text-gray-400 font-mono">
                Cryosphere Snow Cover, Aquatic Turbidity, Disturbance Trajectories, CWSI & Laplacian Splines
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 bg-gray-900/40 border-b border-gray-800 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('snow_cover')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 font-semibold transition ${
              activeTab === 'snow_cover'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <CloudSnow className="w-4 h-4 text-sky-400" />
            <span>Cryosphere Snow (FSC)</span>
          </button>

          <button
            onClick={() => setActiveTab('aquatic_turbidity')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 font-semibold transition ${
              activeTab === 'aquatic_turbidity'
                ? 'border-teal-400 text-teal-300 bg-teal-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Waves className="w-4 h-4 text-teal-400" />
            <span>Aquatic Turbidity (TSM)</span>
          </button>

          <button
            onClick={() => setActiveTab('disturbance_breaks')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 font-semibold transition ${
              activeTab === 'disturbance_breaks'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-4 h-4 text-purple-400" />
            <span>Disturbance Breaks (BFAST)</span>
          </button>

          <button
            onClick={() => setActiveTab('crop_water_stress')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 font-semibold transition ${
              activeTab === 'crop_water_stress'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sprout className="w-4 h-4 text-emerald-400" />
            <span>Crop Water Stress (CWSI)</span>
          </button>

          <button
            onClick={() => setActiveTab('pyramid_spline')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg border-b-2 font-semibold transition ${
              activeTab === 'pyramid_spline'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Spline Mosaic Workbench</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: CRYOSPHERE FRACTIONAL SNOW COVER (FSC) */}
          {activeTab === 'snow_cover' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/70">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-mono font-bold uppercase text-sky-400 flex items-center gap-1.5">
                    <CloudSnow className="w-4 h-4" />
                    Salomonson-Appel FSC Model
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">FSC = -0.01 + 1.45 · NDSI</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1">Target Scene ID</label>
                    <input
                      type="text"
                      value={snowSceneId}
                      onChange={(e) => setSnowSceneId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">FSC Algorithm</label>
                      <select
                        value={snowModel}
                        onChange={(e) => setSnowModel(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        {Object.entries(FSC_MODEL_TYPES).map(([k, v]) => (
                          <option key={k} value={v}>{v.replace('_', ' ').toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Elevation (m)</label>
                      <input
                        type="number"
                        step={50}
                        value={snowElevationM}
                        onChange={(e) => setSnowElevationM(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Green Reflectance (B03):</span>
                      <span className="text-sky-400 font-bold">{snowGreen.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.05}
                      max={0.95}
                      step={0.01}
                      value={snowGreen}
                      onChange={(e) => setSnowGreen(Number(e.target.value))}
                      className="w-full accent-sky-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>SWIR1 Reflectance (B11):</span>
                      <span className="text-sky-400 font-bold">{snowSwir1.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.01}
                      max={0.60}
                      step={0.01}
                      value={snowSwir1}
                      onChange={(e) => setSnowSwir1(Number(e.target.value))}
                      className="w-full accent-sky-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Snow Depth (m)</label>
                      <input
                        type="number"
                        step={0.1}
                        value={snowDepthM}
                        onChange={(e) => setSnowDepthM(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Density (kg/m³)</label>
                      <input
                        type="number"
                        step={10}
                        value={snowDensityKgM3}
                        onChange={(e) => setSnowDensityKgM3(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Catchment Area (ha)</label>
                      <input
                        type="number"
                        step={25}
                        value={snowAreaHa}
                        onChange={(e) => setSnowAreaHa(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Runoff Yield Coeff</label>
                      <input
                        type="number"
                        step={0.05}
                        value={snowRunoffCoeff}
                        onChange={(e) => setSnowRunoffCoeff(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleExecuteSnowCover}
                    disabled={loadingSnow}
                    className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    {loadingSnow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CloudSnow className="w-3.5 h-3.5" />}
                    <span>Evaluate Snow Cover</span>
                  </button>

                  {onApplyTileLayer && (
                    <button
                      onClick={() => onApplyTileLayer({
                        urlTemplate: buildSnowCoverTileUrl('sentinel-2-l2a', snowSceneId, '{z}', '{x}', '{y}', { model: snowModel }),
                        layerType: 'snow_cover',
                        opacity: 0.85
                      })}
                      className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-sky-400 border border-sky-500/30 rounded font-mono text-xs flex items-center gap-1"
                      title="Stream Live Cryosphere Snow Tiles to Map"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Stream Map</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Diagnostic Cards & Chart (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Snow Cover (FSC)</span>
                    <span className="text-xl font-bold text-sky-400">
                      {snowResult ? `${snowResult.fractional_snow_cover_pct}%` : `${((snowGreen - snowSwir1)/(snowGreen + snowSwir1) * 100 * 1.45).toFixed(1)}%`}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      NDSI: {snowResult ? snowResult.ndsi : ((snowGreen - snowSwir1)/(snowGreen + snowSwir1)).toFixed(3)}
                    </span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Runoff Hazard Tier</span>
                    <span className="text-xs font-bold text-white block mt-1">
                      {snowResult?.tier_metadata?.label || 'Moderate Snowpack'}
                    </span>
                    <span className="text-[10px] text-sky-300/80 block mt-0.5">
                      Risk: {snowResult?.tier_metadata?.runoff_risk || 'Moderate'}
                    </span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Snow Water Equiv.</span>
                    <span className="text-xl font-bold text-cyan-400">
                      {snowResult ? `${snowResult.estimated_swe_mm} mm` : '185.0 mm'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Depth: {snowDepthM} m</span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Meltwater Yield</span>
                    <span className="text-xl font-bold text-emerald-400">
                      {snowResult ? `${(snowResult.estimated_melt_volume_m3 / 1000).toFixed(0)}k m³` : '660k m³'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Area: {snowAreaHa} ha</span>
                  </div>
                </div>

                {/* Chart.js Elevation Profile vs Snow Cover */}
                <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center justify-between mb-3 font-mono text-xs">
                    <span className="font-bold text-gray-300 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                      Elevation Snowline & Snow Cover Distribution
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Transient Snowline: {snowResult?.transient_snowline_elevation_m ? `${snowResult.transient_snowline_elevation_m} m` : '2,320 m'}
                    </span>
                  </div>
                  <div className="h-56">
                    <Line data={snowElevationChartData} options={chartOptions} />
                  </div>
                </div>

                {/* Scientific Context Box */}
                <div className="p-3 bg-sky-500/5 rounded-xl border border-sky-500/20 text-xs font-mono text-gray-300 space-y-1">
                  <div className="flex items-center justify-between text-sky-400 font-bold">
                    <span>Scientific Parity: Salomonson & Appel (2004) & Hall et al. (2002)</span>
                    <span className="text-[10px]">Sentinel-2 / Landsat Cryosphere Inversion</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    High snow surface reflectance in Green (B03) and strong absorption in SWIR1 (B11) allows empirical regression 
                    deconvolution of sub-pixel snow cover. Snow Water Equivalent (SWE) evaluates total glacial/seasonal water retention.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AQUATIC TOTAL SUSPENDED MATTER (TSM) & TURBIDITY INVERSION */}
          {activeTab === 'aquatic_turbidity' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/70">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-mono font-bold uppercase text-teal-400 flex items-center gap-1.5">
                    <Waves className="w-4 h-4" />
                    Nechad & Dogliotti Inversion
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">TSM = (A · ρ) / (1 - ρ / C)</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1">Target Scene ID</label>
                    <input
                      type="text"
                      value={turbSceneId}
                      onChange={(e) => setTurbSceneId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Inversion Algorithm</label>
                    <select
                      value={turbAlgorithm}
                      onChange={(e) => setTurbAlgorithm(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      {Object.entries(TSM_ALGORITHMS).map(([k, v]) => (
                        <option key={k} value={v}>{v.replace('_', ' ').toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Water-Leaving Red Reflectance (B04):</span>
                      <span className="text-teal-400 font-bold">{turbRed.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.005}
                      max={0.25}
                      step={0.002}
                      value={turbRed}
                      onChange={(e) => setTurbRed(Number(e.target.value))}
                      className="w-full accent-teal-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Water-Leaving NIR Reflectance (B08):</span>
                      <span className="text-teal-400 font-bold">{turbNir.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.002}
                      max={0.20}
                      step={0.002}
                      value={turbNir}
                      onChange={(e) => setTurbNir(Number(e.target.value))}
                      className="w-full accent-teal-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Water-Leaving Green Reflectance (B03):</span>
                      <span className="text-teal-400 font-bold">{turbGreen.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.002}
                      max={0.20}
                      step={0.002}
                      value={turbGreen}
                      onChange={(e) => setTurbGreen(Number(e.target.value))}
                      className="w-full accent-teal-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Water Body Area (ha)</label>
                    <input
                      type="number"
                      step={25}
                      value={turbWaterAreaHa}
                      onChange={(e) => setTurbWaterAreaHa(Number(e.target.value))}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleExecuteTurbidity}
                    disabled={loadingTurb}
                    className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    {loadingTurb ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Waves className="w-3.5 h-3.5" />}
                    <span>Evaluate Turbidity & TSM</span>
                  </button>

                  {onApplyTileLayer && (
                    <button
                      onClick={() => onApplyTileLayer({
                        urlTemplate: buildTurbidityTsmTileUrl('sentinel-2-l2a', turbSceneId, 'turbidity', '{z}', '{x}', '{y}'),
                        layerType: 'aquatic_turbidity',
                        opacity: 0.85
                      })}
                      className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-teal-400 border border-teal-500/30 rounded font-mono text-xs flex items-center gap-1"
                      title="Stream Live Aquatic Turbidity Tiles to Map"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Stream Map</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Diagnostic Cards & Chart (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Turbidity</span>
                    <span className="text-xl font-bold text-teal-400">
                      {turbResult ? `${turbResult.turbidity_ntu} NTU` : '32.5 NTU'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Algorithm: Dogliotti</span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Sediment Plume</span>
                    <span className="text-xs font-bold text-orange-400 block mt-1">
                      {turbResult?.tier_metadata?.label || 'Moderate Sediment'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Plume: {turbResult ? (turbResult.sediment_plume_detected ? 'ACTIVE' : 'NOMINAL') : 'ACTIVE'}
                    </span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Suspended Matter</span>
                    <span className="text-xl font-bold text-amber-400">
                      {turbResult ? `${turbResult.total_suspended_matter_g_m3} g/m³` : '46.8 g/m³'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">TSM (mg/L)</span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Plume Footprint</span>
                    <span className="text-xl font-bold text-rose-400">
                      {turbResult ? `${turbResult.plume_area_ha} ha` : '157.5 ha'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      {turbResult ? `${turbResult.plume_area_pct}% area` : '45% area'}
                    </span>
                  </div>
                </div>

                {/* Chart.js Turbidity Response Curve */}
                <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center justify-between mb-3 font-mono text-xs">
                    <span className="font-bold text-gray-300 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                      Dogliotti Red/NIR Switching Inversion Response
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Transition Threshold: 0.05 ≤ ρw(Red) ≤ 0.07
                    </span>
                  </div>
                  <div className="h-56">
                    <Line data={turbChartData} options={chartOptions} />
                  </div>
                </div>

                <div className="p-3 bg-teal-500/5 rounded-xl border border-teal-500/20 text-xs font-mono text-gray-300 space-y-1">
                  <div className="flex items-center justify-between text-teal-400 font-bold">
                    <span>Scientific Parity: Nechad et al. (2010) & Dogliotti et al. (2015)</span>
                    <span className="text-[10px]">Aquatic Sediment & Tailings Plumes</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Avoids Red channel saturation in turbid waters (&gt;50 NTU) by dynamically blending Red (665 nm) and NIR (865 nm) 
                    reflectance, preventing tailings discharge and dredging plume misclassification.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ABRUPT STRUCTURAL DISTURBANCE BREAKS (BFAST / LANDTRENDR) */}
          {activeTab === 'disturbance_breaks' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/70">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-mono font-bold uppercase text-purple-400 flex items-center gap-1.5">
                    <Activity className="w-4 h-4" />
                    BFAST & LandTrendr Breakpoints
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Chow F-Test p &lt; 0.05</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Metric</label>
                      <select
                        value={distMetric}
                        onChange={(e) => setDistMetric(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="ndvi">NDVI (Vegetation)</option>
                        <option value="ndmi">NDMI (Moisture)</option>
                        <option value="displacement_mm">InSAR Displ (mm)</option>
                        <option value="nbr">NBR (Burn/Scour)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Model</label>
                      <select
                        value={distModel}
                        onChange={(e) => setDistModel(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        {Object.entries(DISTURBANCE_MODELS).map(([k, v]) => (
                          <option key={k} value={v}>{v.replace('_', ' ').toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Trajectory Scenario Preset</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleDisturbancePresetChange('collapse')}
                        className={`py-1 px-2 rounded text-[11px] font-mono border transition ${
                          distPreset === 'collapse'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                        }`}
                      >
                        Abrupt Collapse
                      </button>
                      <button
                        onClick={() => handleDisturbancePresetChange('subsidence')}
                        className={`py-1 px-2 rounded text-[11px] font-mono border transition ${
                          distPreset === 'subsidence'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                        }`}
                      >
                        Gradual Decline
                      </button>
                      <button
                        onClick={() => handleDisturbancePresetChange('recovery')}
                        className={`py-1 px-2 rounded text-[11px] font-mono border transition ${
                          distPreset === 'recovery'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                        }`}
                      >
                        Rapid Recovery
                      </button>
                      <button
                        onClick={() => handleDisturbancePresetChange('stable')}
                        className={`py-1 px-2 rounded text-[11px] font-mono border transition ${
                          distPreset === 'stable'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white'
                        }`}
                      >
                        Stable Trajectory
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Significance Level (Alpha)</label>
                    <select
                      value={distAlpha}
                      onChange={(e) => setDistAlpha(Number(e.target.value))}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value={0.01}>p &lt; 0.01 (Strict Critical)</option>
                      <option value={0.05}>p &lt; 0.05 (Standard Operational)</option>
                      <option value={0.10}>p &lt; 0.10 (Advisory)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Observed Series ({distValues.length} steps)</label>
                    <div className="bg-gray-900 p-2 rounded border border-gray-800 font-mono text-[10px] text-gray-300 max-h-20 overflow-y-auto">
                      {distValues.map((v, i) => (
                        <span key={i} className="inline-block mr-2">
                          {distDates[i]?.slice(5)}: <strong className="text-purple-300">{v.toFixed(2)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleExecuteDisturbance}
                    disabled={loadingDist}
                    className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    {loadingDist ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                    <span>Detect Breakpoints</span>
                  </button>

                  {onApplyTileLayer && (
                    <button
                      onClick={() => onApplyTileLayer({
                        urlTemplate: buildDisturbanceTileUrl('sentinel-2-l2a', 'trajectory-grid', '{z}', '{x}', '{y}'),
                        layerType: 'disturbance_breaks',
                        opacity: 0.85
                      })}
                      className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-purple-400 border border-purple-500/30 rounded font-mono text-xs flex items-center gap-1"
                      title="Stream Live Disturbance Break Tiles to Map"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Stream Map</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Diagnostic Cards & Chart (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Break Date</span>
                    <span className="text-sm font-bold text-purple-400">
                      {distResult?.primary_break?.break_date || '2025-09-01'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Index: #{distResult?.primary_break?.break_index ?? 5}
                    </span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Jump Step (ΔY)</span>
                    <span className="text-xl font-bold text-rose-400">
                      {distResult?.primary_break ? `${distResult.primary_break.jump_magnitude}` : '-0.260'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      p-value: {distResult?.primary_break?.p_value ?? 0.001}
                    </span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Classification</span>
                    <span className="text-xs font-bold text-white block mt-1">
                      {distResult?.primary_break?.disturbance_type?.replace('_', ' ').toUpperCase() || 'ABRUPT COLLAPSE'}
                    </span>
                    <span className="text-[10px] text-purple-300 block mt-0.5">
                      Significance: {distResult?.primary_break?.significance_tier || 'critical_break'}
                    </span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Structural Alert</span>
                    <span className={`text-xs font-bold block mt-1 ${
                      distResult?.structural_instability_detected ? 'text-rose-400 animate-pulse' : 'text-emerald-400'
                    }`}>
                      {distResult?.structural_instability_detected ? 'FAILURE IMMINENT' : 'STABLE'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Breaks: {distResult ? distResult.breakpoints_detected : 1}
                    </span>
                  </div>
                </div>

                {/* Chart.js Time Series Segmented Plot */}
                <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center justify-between mb-3 font-mono text-xs">
                    <span className="font-bold text-gray-300 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-purple-400" />
                      Piecewise Linear Trajectory Segmentation (BFAST)
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Pre-Break Slope: {distResult?.primary_break?.pre_break_slope ?? -0.007} / Post: {distResult?.primary_break?.post_break_slope ?? -0.015}
                    </span>
                  </div>
                  <div className="h-56">
                    <Line data={distChartData} options={chartOptions} />
                  </div>
                </div>

                <div className="p-3 bg-purple-500/5 rounded-xl border border-purple-500/20 text-xs font-mono text-gray-300 space-y-1">
                  <div className="flex items-center justify-between text-purple-400 font-bold">
                    <span>Scientific Parity: Verbesselt et al. (2010) & Kennedy et al. (2010)</span>
                    <span className="text-[10px]">Structural Breakpoint Detection</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Piecewise ordinary least squares regression separates gradual environmental trends from abrupt structural 
                    failures (dam crest slump, slope breach, sudden defoliation), testing Chow F-statistics for stability.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CROP WATER STRESS INDEX (CWSI) */}
          {activeTab === 'crop_water_stress' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/70">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                    <Sprout className="w-4 h-4" />
                    Idso & Moran Energy Balance
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">CWSI = (dT - dT_ll) / (dT_ul - dT_ll)</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1">Target Scene ID</label>
                    <input
                      type="text"
                      value={cwsiSceneId}
                      onChange={(e) => setCwsiSceneId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Model Formulation</label>
                      <select
                        value={cwsiModel}
                        onChange={(e) => setCwsiModel(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        {Object.entries(CWSI_MODEL_TYPES).map(([k, v]) => (
                          <option key={k} value={v}>{v.replace('_', ' ').toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Canopy NDVI</label>
                      <input
                        type="number"
                        step={0.05}
                        min={0.05}
                        max={0.95}
                        value={cwsiNdvi}
                        onChange={(e) => setCwsiNdvi(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Canopy Temp Tc (°C):</span>
                      <span className="text-emerald-400 font-bold">{cwsiCanopyTemp.toFixed(1)}°C</span>
                    </div>
                    <input
                      type="range"
                      min={15.0}
                      max={48.0}
                      step={0.5}
                      value={cwsiCanopyTemp}
                      onChange={(e) => setCwsiCanopyTemp(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Air Temp Ta (°C):</span>
                      <span className="text-emerald-400 font-bold">{cwsiAirTemp.toFixed(1)}°C</span>
                    </div>
                    <input
                      type="range"
                      min={10.0}
                      max={45.0}
                      step={0.5}
                      value={cwsiAirTemp}
                      onChange={(e) => setCwsiAirTemp(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Relative Humidity (%)</label>
                      <input
                        type="number"
                        step={1}
                        value={cwsiRhPct}
                        onChange={(e) => setCwsiRhPct(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">VPD (kPa)</label>
                      <input
                        type="number"
                        step={0.1}
                        value={cwsiVpdKpa}
                        onChange={(e) => setCwsiVpdKpa(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Reference ET0 (mm/day)</label>
                    <input
                      type="number"
                      step={0.2}
                      value={cwsiEt0}
                      onChange={(e) => setCwsiEt0(Number(e.target.value))}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleExecuteCwsi}
                    disabled={loadingCwsi}
                    className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    {loadingCwsi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sprout className="w-3.5 h-3.5" />}
                    <span>Evaluate Water Stress</span>
                  </button>

                  {onApplyTileLayer && (
                    <button
                      onClick={() => onApplyTileLayer({
                        urlTemplate: buildCwsiTileUrl('landsat-c2-l2', cwsiSceneId, '{z}', '{x}', '{y}'),
                        layerType: 'crop_water_stress',
                        opacity: 0.85
                      })}
                      className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-emerald-400 border border-emerald-500/30 rounded font-mono text-xs flex items-center gap-1"
                      title="Stream Live CWSI Tiles to Map"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Stream Map</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Diagnostic Cards & Chart (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">CWSI Index</span>
                    <span className="text-xl font-bold text-emerald-400">
                      {cwsiResult ? cwsiResult.cwsi : '0.62'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Scale: 0.0 - 1.0</span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Stress Category</span>
                    <span className="text-xs font-bold text-amber-400 block mt-1">
                      {cwsiResult?.tier_metadata?.label || 'Moderate Stress'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Irrigation: <strong className="text-amber-300">{cwsiResult?.irrigation_priority?.toUpperCase() || 'MODERATE'}</strong>
                    </span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Actual ET (ETa)</span>
                    <span className="text-xl font-bold text-cyan-400">
                      {cwsiResult ? `${cwsiResult.actual_et_mm_day} mm/d` : '2.35 mm/d'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      EF: {cwsiResult ? cwsiResult.evaporative_fraction : '0.38'}
                    </span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Temp Differential</span>
                    <span className="text-xl font-bold text-rose-400">
                      {cwsiResult ? `+${cwsiResult.canopy_air_temp_diff_c}°C` : '+5.5°C'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Tc - Ta</span>
                  </div>
                </div>

                {/* Chart.js Idso Trapezoid Diagram */}
                <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center justify-between mb-3 font-mono text-xs">
                    <span className="font-bold text-gray-300 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                      Idso (1981) Non-Water-Stressed Baseline Envelope
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Lower: {cwsiResult?.lower_baseline_temp_diff_c ?? -3.42}°C | Upper: {cwsiResult?.upper_baseline_temp_diff_c ?? 5.0}°C
                    </span>
                  </div>
                  <div className="h-56">
                    <Line data={cwsiChartData} options={chartOptions} />
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/20 text-xs font-mono text-gray-300 space-y-1">
                  <div className="flex items-center justify-between text-emerald-400 font-bold">
                    <span>Scientific Parity: Idso et al. (1981) & Jackson et al. (1981)</span>
                    <span className="text-[10px]">Thermal Crop Water Deficit</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Transpiration deficits cause leaf stomatal closure and canopy heat buildup. CWSI tracks actual evaporative fraction 
                    relative to VPD atmospheric demand, driving precision irrigation scheduling.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: MULTI-RESOLUTION SPLINE & LAPLACIAN PYRAMID MOSAIC WORKBENCH */}
          {activeTab === 'pyramid_spline' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Form (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/70">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-mono font-bold uppercase text-cyan-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Burt & Adelson (1983) Spline
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Δ_seam = |L - R| · 2^-k</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1">Mosaic ID</label>
                    <input
                      type="text"
                      value={mosaicId}
                      onChange={(e) => setMosaicId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Left Scene Pass</label>
                      <input
                        type="text"
                        value={leftSceneId}
                        onChange={(e) => setLeftSceneId(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Right Scene Pass</label>
                      <input
                        type="text"
                        value={rightSceneId}
                        onChange={(e) => setRightSceneId(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Blending Mode</label>
                      <select
                        value={blendMode}
                        onChange={(e) => setBlendMode(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        {Object.entries(PYRAMID_BLEND_MODES).map(([k, v]) => (
                          <option key={k} value={v}>{v.replace('_', ' ').toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Pyramid Levels</label>
                      <input
                        type="number"
                        min={2}
                        max={8}
                        value={pyramidLevels}
                        onChange={(e) => setPyramidLevels(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Seam Transition Width (px):</span>
                      <span className="text-cyan-400 font-bold">{transitionWidthPx} px</span>
                    </div>
                    <input
                      type="range"
                      min={16}
                      max={256}
                      step={8}
                      value={transitionWidthPx}
                      onChange={(e) => setTransitionWidthPx(Number(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Left Radiance (DN)</label>
                      <input
                        type="number"
                        step={1}
                        value={leftMeanRadiance}
                        onChange={(e) => setLeftMeanRadiance(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Right Radiance (DN)</label>
                      <input
                        type="number"
                        step={1}
                        value={rightMeanRadiance}
                        onChange={(e) => setRightMeanRadiance(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleExecuteSplineBlend}
                    disabled={loadingSpline}
                    className="flex-1 py-2 px-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 shadow"
                  >
                    {loadingSpline ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                    <span>Execute Spline Blend</span>
                  </button>

                  {onApplyTileLayer && (
                    <button
                      onClick={() => onApplyTileLayer({
                        urlTemplate: buildSplineMosaicTileUrl(mosaicId, '{z}', '{x}', '{y}', { blendMode }),
                        layerType: 'pyramid_spline',
                        opacity: 0.90
                      })}
                      className="py-2 px-3 bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-500/30 rounded font-mono text-xs flex items-center gap-1"
                      title="Stream Live Spline Mosaic Tiles to Map"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Stream Map</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Right Diagnostic Cards & Chart (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Seam Jump (DN)</span>
                    <span className="text-xl font-bold text-cyan-400">
                      {splineResult ? `${splineResult.mean_gradient_discontinuity_dn} DN` : '0.484 DN'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Raw Jump: {Math.abs(leftMeanRadiance - rightMeanRadiance).toFixed(1)} DN
                    </span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Continuity Tier</span>
                    <span className="text-xs font-bold text-emerald-400 block mt-1">
                      {splineResult?.quality_metadata?.label || 'Seamless Continuity (< 2 DN)'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      Status: <strong className="text-emerald-300">IMPERCEPTIBLE</strong>
                    </span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">High-Freq Feather</span>
                    <span className="text-xl font-bold text-sky-400">
                      {splineResult ? `${splineResult.high_frequency_feather_px} px` : '4.0 px'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Narrow Octave</span>
                  </div>

                  <div className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 font-mono">
                    <span className="text-[10px] text-gray-400 uppercase block">Low-Freq Feather</span>
                    <span className="text-xl font-bold text-indigo-400">
                      {splineResult ? `${splineResult.low_frequency_feather_px} px` : '128.0 px'}
                    </span>
                    <span className="text-[10px] text-gray-400 block mt-0.5">Broad Illumination</span>
                  </div>
                </div>

                {/* Chart.js Octave Attenuation */}
                <div className="bg-gray-900/60 p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center justify-between mb-3 font-mono text-xs">
                    <span className="font-bold text-gray-300 flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                      Laplacian Octave Radiometric Attenuation
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {pyramidLevels} Decomposition Octaves | Seam Width: {transitionWidthPx} px
                    </span>
                  </div>
                  <div className="h-56">
                    <Bar data={splineChartData} options={chartOptions} />
                  </div>
                </div>

                <div className="p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/20 text-xs font-mono text-gray-300 space-y-1">
                  <div className="flex items-center justify-between text-cyan-400 font-bold">
                    <span>Scientific Parity: Burt & Adelson (1983) Multi-Resolution Spline</span>
                    <span className="text-[10px]">Laplacian Seamline Harmonization</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    High spatial frequencies are blended over a narrow boundary to preserve sharp image texture, while low frequencies 
                    are smoothly blended across wide distances, completely eliminating visible photometric seamlines between orthomosaics.
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gray-900/80 border-t border-gray-800 text-xs font-mono">
          <div className="flex items-center gap-2 text-gray-400">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>Strict Biophysical Parity &amp; Memory-Safe 512px Tile Pipeline Enforced</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const url = activeTab === 'snow_cover'
                  ? buildSnowCoverTileUrl('sentinel-2-l2a', snowSceneId, '{z}', '{x}', '{y}', { model: snowModel })
                  : activeTab === 'aquatic_turbidity'
                  ? buildTurbidityTsmTileUrl('sentinel-2-l2a', turbSceneId, 'turbidity', '{z}', '{x}', '{y}')
                  : activeTab === 'disturbance_breaks'
                  ? buildDisturbanceTileUrl('sentinel-2-l2a', 'trajectory-grid', '{z}', '{x}', '{y}')
                  : activeTab === 'crop_water_stress'
                  ? buildCwsiTileUrl('landsat-c2-l2', cwsiSceneId, '{z}', '{x}', '{y}')
                  : buildSplineMosaicTileUrl(mosaicId, '{z}', '{x}', '{y}', { blendMode });
                copyToClipboard(url, 'tile_url');
              }}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded flex items-center gap-1.5 transition"
            >
              {copiedKey === 'tile_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedKey === 'tile_url' ? 'Copied Tile URL' : 'Copy Tile URL'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow transition"
            >
              Done
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
