import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, Activity, Copy, Check, 
  AlertTriangle, RefreshCw, Layers, Mountain, ShieldAlert, 
  BarChart3, Zap, MapPin, SlidersHorizontal, 
  ArrowDownCircle, ArrowUpCircle, Info, Compass, Scissors, Box, Eye, CheckCircle2
} from 'lucide-react';
import { 
  analyzeCutAndFillDifferential,
  analyzeCrestSlump,
  analyzeTopographicTransectDelta,
  analyzeCsfGroundFilter,
  analyzeDroneEpipolarDifferential,
  getTopographicElevationDeltaTileUrlTemplate
} from '../api/giosApi';
import { 
  CUT_FILL_CALCULATION_MODES,
  TOPOGRAPHIC_DELTA_HAZARD_CONFIGS,
  CREST_SLUMP_HAZARD_CONFIGS,
  EPIPOLAR_DISPARITY_QUALITY_CONFIGS,
  TOPOGRAPHIC_DELTA_TILE_METRICS,
  CSF_TIER_METADATA,
  calculateCutAndFillDifferencing,
  calculateCrestSlumpingProfile,
  calculateTopographicTransectDelta,
  calculateDroneEpipolarDifferential,
  calculateClothSimulationFilter,
  buildTopographicElevationDeltaTileUrlTemplate
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Pre-configured Benchmark Topographic Differencing Scenarios
const PRESET_SCENARIOS = {
  cadia_north_excavation: {
    id: 'cadia_north_excavation',
    name: 'Cadia Northern Embankment Cut & Slump (Australia)',
    asset_id: 'EMBANKMENT_CADIA_NORTH',
    asset_name: 'Cadia Northern Tailings Embankment Zone A',
    coordinates: [[-121.050, 37.050], [-121.045, 37.055]],
    dem_pre_id: 'DEM_PRE_CADIA_20260815',
    dem_post_id: 'DEM_POST_CADIA_20261001',
    grid_resolution_m: 1.0,
    deadband_threshold_m: 0.05,
    calculation_mode: 'cell_differencing',
    crest_length_m: 560.0,
    design_freeboard_m: 3.5,
    reservoir_pool_elevation_m: 320.0,
    transect_spacing_m: 5.0,
    csf_rigidness: 'relief_slope',
    csf_cloth_resolution_m: 1.2,
    csf_classification_threshold_m: 0.35,
    stereo_pair_count: 8
  },
  brumadinho_remediation_fill: {
    id: 'brumadinho_remediation_fill',
    name: 'Brumadinho Remediation Earthwork Buttress (Brazil)',
    asset_id: 'DAM_BRUMADINHO_B1',
    asset_name: 'Brumadinho Impoundment Zone B Remediation',
    coordinates: [[-44.1198, -20.1198], [-44.1145, -20.1150]],
    dem_pre_id: 'DEM_PRE_BRUM_20260710',
    dem_post_id: 'DEM_POST_BRUM_20260928',
    grid_resolution_m: 0.5,
    deadband_threshold_m: 0.04,
    calculation_mode: 'trapezoidal_prism',
    crest_length_m: 520.0,
    design_freeboard_m: 4.0,
    reservoir_pool_elevation_m: 86.0,
    transect_spacing_m: 4.0,
    csf_rigidness: 'steep_mountain',
    csf_cloth_resolution_m: 1.0,
    csf_classification_threshold_m: 0.30,
    stereo_pair_count: 12
  },
  san_luis_buttress_raise: {
    id: 'san_luis_buttress_raise',
    name: 'San Luis Forebay Embankment Seismic Buttress Raise (California)',
    asset_id: 'DAM_SAN_LUIS_UP',
    asset_name: 'San Luis Forebay Upstream Embankment',
    coordinates: [[-120.9300, 36.9800], [-120.9250, 36.9850]],
    dem_pre_id: 'DEM_PRE_SANLUIS_20260601',
    dem_post_id: 'DEM_POST_SANLUIS_20260915',
    grid_resolution_m: 1.0,
    deadband_threshold_m: 0.05,
    calculation_mode: 'tin_differential',
    crest_length_m: 450.0,
    design_freeboard_m: 3.2,
    reservoir_pool_elevation_m: 165.0,
    transect_spacing_m: 5.0,
    csf_rigidness: 'flat_terrain',
    csf_cloth_resolution_m: 1.5,
    csf_classification_threshold_m: 0.40,
    stereo_pair_count: 6
  },
  fundao_downstream_erosion: {
    id: 'fundao_downstream_erosion',
    name: 'Fundão Tailings Severe Slope Deformation & Gully Loss (Brazil)',
    asset_id: 'DAM_FUNDAO_SAMARCO',
    asset_name: 'Fundão Tailings Impoundment Main Dam',
    coordinates: [[-43.4611, -20.2189], [-43.4560, -20.2140]],
    dem_pre_id: 'DEM_PRE_FUNDAO_20260520',
    dem_post_id: 'DEM_POST_FUNDAO_20260930',
    grid_resolution_m: 2.0,
    deadband_threshold_m: 0.08,
    calculation_mode: 'cell_differencing',
    crest_length_m: 680.0,
    design_freeboard_m: 3.8,
    reservoir_pool_elevation_m: 105.0,
    transect_spacing_m: 10.0,
    csf_rigidness: 'relief_slope',
    csf_cloth_resolution_m: 1.2,
    csf_classification_threshold_m: 0.35,
    stereo_pair_count: 10
  }
};

export default function TopographicDeltaModal({
  isOpen,
  onClose,
  activeSimulation = null,
  onApplySimulation = null
}) {
  // Navigation Tabs: 'volumetric' | 'crest_slump' | 'transect' | 'csf_filter' | 'epipolar' | 'tile_preview'
  const [activeTab, setActiveTab] = useState('volumetric');

  // Scenario Selection & Identity
  const [selectedPresetKey, setSelectedPresetKey] = useState('cadia_north_excavation');
  const [assetId, setAssetId] = useState('EMBANKMENT_CADIA_NORTH');
  const [assetName, setAssetName] = useState('Cadia Northern Tailings Embankment Zone A');
  const [demPreId, setDemPreId] = useState('DEM_PRE_CADIA_20260815');
  const [demPostId, setDemPostId] = useState('DEM_POST_CADIA_20261001');

  // Differencing & Volumetric Controls
  const [gridResolutionM, setGridResolutionM] = useState(1.0);
  const [deadbandThresholdM, setDeadbandThresholdM] = useState(0.05);
  const [calculationMode, setCalculationMode] = useState(CUT_FILL_CALCULATION_MODES.CELL_DIFFERENCING);
  const [gridSidePoints, setGridSidePoints] = useState(24);

  // Crest Slumping Controls
  const [crestLengthM, setCrestLengthM] = useState(560.0);
  const [designFreeboardM, setDesignFreeboardM] = useState(3.5);
  const [reservoirPoolElevationM, setReservoirPoolElevationM] = useState(320.0);

  // Transect Cross-Section Controls
  const [sampleSpacingM, setSampleSpacingM] = useState(5.0);

  // LiDAR CSF Controls
  const [csfRigidness, setCsfRigidness] = useState('relief_slope');
  const [csfClothResolutionM, setCsfClothResolutionM] = useState(1.2);
  const [csfClassificationThresholdM, setCsfClassificationThresholdM] = useState(0.35);

  // Drone Epipolar Controls
  const [stereoPairCount, setStereoPairCount] = useState(8);

  // Results State
  const [cutFillResult, setCutFillResult] = useState(activeSimulation || null);
  const [crestSlumpResult, setCrestSlumpResult] = useState(null);
  const [transectResult, setTransectResult] = useState(null);
  const [csfResult, setCsfResult] = useState(null);
  const [epipolarResult, setEpipolarResult] = useState(null);

  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [tilePreviewMetric, setTilePreviewMetric] = useState('elevation_delta');
  const [tileOpacity, setTileOpacity] = useState(0.85);

  // Synchronize active simulation prop if provided
  useEffect(() => {
    if (activeSimulation) {
      setCutFillResult(activeSimulation);
    }
  }, [activeSimulation]);

  // Handle Preset Selection
  const handleSelectPreset = (key) => {
    const p = PRESET_SCENARIOS[key];
    if (!p) return;
    setSelectedPresetKey(key);
    setAssetId(p.asset_id);
    setAssetName(p.asset_name);
    setDemPreId(p.dem_pre_id);
    setDemPostId(p.dem_post_id);
    setGridResolutionM(p.grid_resolution_m);
    setDeadbandThresholdM(p.deadband_threshold_m);
    setCalculationMode(p.calculation_mode);
    setCrestLengthM(p.crest_length_m);
    setDesignFreeboardM(p.design_freeboard_m);
    setReservoirPoolElevationM(p.reservoir_pool_elevation_m);
    setSampleSpacingM(p.transect_spacing_m);
    setCsfRigidness(p.csf_rigidness);
    setCsfClothResolutionM(p.csf_cloth_resolution_m);
    setCsfClassificationThresholdM(p.csf_classification_threshold_m);
    setStereoPairCount(p.stereo_pair_count);
  };

  // Execute full suite of topographic analyses
  const handleExecuteAllAnalyses = useCallback(async () => {
    setIsProcessing(true);
    try {
      // 1. Cut and Fill Volumetric Differencing
      const cutFillPayload = {
        simulation_id: `CUTFILL_${assetId}_${Date.now()}`,
        asset_id: assetId,
        asset_name: assetName,
        dem_pre_id: demPreId,
        dem_post_id: demPostId,
        grid_resolution_m: gridResolutionM,
        calculation_mode: calculationMode,
        deadband_threshold_m: deadbandThresholdM,
        grid_side_points: gridSidePoints
      };
      let resCutFill;
      try {
        resCutFill = await analyzeCutAndFillDifferential(cutFillPayload);
      } catch {
        resCutFill = calculateCutAndFillDifferencing(cutFillPayload);
      }
      setCutFillResult(resCutFill);

      // 2. Crest Slumping Profile
      const crestPayload = {
        dam_id: assetId,
        dam_name: assetName,
        crest_length_m: crestLengthM,
        design_freeboard_m: designFreeboardM,
        reservoir_pool_elevation_m: reservoirPoolElevationM
      };
      let resCrest;
      try {
        resCrest = await analyzeCrestSlump(crestPayload);
      } catch {
        resCrest = calculateCrestSlumpingProfile(crestPayload);
      }
      setCrestSlumpResult(resCrest);

      // 3. Topographic Transect Delta
      const transectPayload = {
        asset_id: assetId,
        sample_spacing_m: sampleSpacingM,
        dem_pre_id: demPreId,
        dem_post_id: demPostId
      };
      let resTransect;
      try {
        resTransect = await analyzeTopographicTransectDelta(transectPayload);
      } catch {
        resTransect = calculateTopographicTransectDelta(transectPayload);
      }
      setTransectResult(resTransect);

      // 4. Cloth Simulation Filter (CSF)
      const csfPayload = {
        cloud_id: `UAV_${assetId}`,
        cloth_resolution_m: csfClothResolutionM,
        rigidness: csfRigidness,
        classification_threshold_m: csfClassificationThresholdM
      };
      let resCsf;
      try {
        resCsf = await analyzeCsfGroundFilter(csfPayload);
      } catch {
        resCsf = calculateClothSimulationFilter({
          cloudId: `UAV_${assetId}`,
          clothResolutionM: csfClothResolutionM,
          rigidness: csfRigidness,
          classificationThresholdM: csfClassificationThresholdM
        });
      }
      setCsfResult(resCsf);

      // 5. Drone Epipolar Differential
      const epipolarPayload = {
        flight_pre_id: demPreId,
        flight_post_id: demPostId,
        stereo_pair_count: stereoPairCount
      };
      let resEpipolar;
      try {
        resEpipolar = await analyzeDroneEpipolarDifferential(epipolarPayload);
      } catch {
        resEpipolar = calculateDroneEpipolarDifferential(epipolarPayload);
      }
      setEpipolarResult(resEpipolar);

    } catch (err) {
      console.error('Failed to compute topographic analyses:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [
    assetId, assetName, demPreId, demPostId, gridResolutionM, calculationMode, 
    deadbandThresholdM, gridSidePoints, crestLengthM, designFreeboardM, 
    reservoirPoolElevationM, sampleSpacingM, csfClothResolutionM, csfRigidness, 
    csfClassificationThresholdM, stereoPairCount
  ]);

  // Initial computation on mount if none active
  useEffect(() => {
    if (!cutFillResult) {
      handleExecuteAllAnalyses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Broadcast to Map Explorer
  const handleApplyToMap = () => {
    if (!cutFillResult) return;
    if (onApplySimulation) {
      onApplySimulation(cutFillResult, {
        selectedMetric: tilePreviewMetric,
        opacity: tileOpacity
      });
    }
    onClose();
  };

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Volumetric Balance Chart Data (Tab 1)
  const volumeBalanceChartData = useMemo(() => {
    if (!cutFillResult?.summary) return null;
    const s = cutFillResult.summary;
    return {
      labels: ['Gross Excavation / Cut', 'Gross Deposition / Fill', 'Net Earthwork Balance'],
      datasets: [
        {
          label: 'Volume (m³)',
          data: [s.gross_cut_volume_m3, s.gross_fill_volume_m3, s.net_volume_change_m3],
          backgroundColor: [
            'rgba(239, 68, 68, 0.75)',   // Cut - red
            'rgba(59, 130, 246, 0.75)',   // Fill - blue
            s.net_volume_change_m3 >= 0 ? 'rgba(16, 185, 129, 0.75)' : 'rgba(249, 115, 22, 0.75)' // Net
          ],
          borderColor: [
            '#ef4444',
            '#3b82f6',
            s.net_volume_change_m3 >= 0 ? '#10b981' : '#f97316'
          ],
          borderWidth: 1.5,
          borderRadius: 6
        }
      ]
    };
  }, [cutFillResult]);

  // Elevation Transect Profile Chart Data (Tab 3)
  const transectChartData = useMemo(() => {
    if (!transectResult?.nodes) return null;
    const nodes = transectResult.nodes;
    const labels = nodes.map(n => `${n.distance_m}m`);
    const zPre = nodes.map(n => n.z_pre_m);
    const zPost = nodes.map(n => n.z_post_m);
    const dz = nodes.map(n => n.delta_z_m);

    return {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Pre-Event DEM Z (m)',
          data: zPre,
          borderColor: '#94a3b8',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 2,
          fill: false,
          tension: 0.2,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Post-Event Survey DEM Z (m)',
          data: zPost,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2.5,
          pointRadius: 3,
          fill: false,
          tension: 0.2,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'Elevation Delta ΔZ (m)',
          data: dz,
          backgroundColor: dz.map(v => v < 0 ? 'rgba(239, 68, 68, 0.65)' : 'rgba(59, 130, 246, 0.65)'),
          borderColor: dz.map(v => v < 0 ? '#ef4444' : '#3b82f6'),
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    };
  }, [transectResult]);

  // Crest Slumping Profile Chart Data (Tab 2)
  const crestSlumpChartData = useMemo(() => {
    if (!crestSlumpResult?.stations) return null;
    const stations = crestSlumpResult.stations;
    const labels = stations.map(s => `${s.station_id} (${s.chainage_m}m)`);
    const zPre = stations.map(s => s.z_pre_m);
    const zPost = stations.map(s => s.z_post_m);
    const poolElev = crestSlumpResult.summary?.design_freeboard_m 
      ? zPre[0] - crestSlumpResult.summary.design_freeboard_m 
      : 320.0;
    const poolLine = stations.map(() => poolElev);

    return {
      labels,
      datasets: [
        {
          label: 'Design Crest Elevation (m)',
          data: zPre,
          borderColor: '#38bdf8',
          borderWidth: 2,
          pointRadius: 4,
          tension: 0.2
        },
        {
          label: 'Post-Event Slumped Crest (m)',
          data: zPost,
          borderColor: '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.15)',
          borderWidth: 2.5,
          pointRadius: 5,
          fill: true,
          tension: 0.2
        },
        {
          label: 'Reservoir Pool Elevation (m)',
          data: poolLine,
          borderColor: '#06b6d4',
          borderDash: [6, 4],
          borderWidth: 1.5,
          pointRadius: 0
        }
      ]
    };
  }, [crestSlumpResult]);

  // Active Hazard Tier info
  const hazardMeta = useMemo(() => {
    if (!cutFillResult?.hazard_tier) return TOPOGRAPHIC_DELTA_HAZARD_CONFIGS.negligible_change;
    return TOPOGRAPHIC_DELTA_HAZARD_CONFIGS[cutFillResult.hazard_tier] || TOPOGRAPHIC_DELTA_HAZARD_CONFIGS.negligible_change;
  }, [cutFillResult]);

  const crestHazardMeta = useMemo(() => {
    if (!crestSlumpResult?.summary?.hazard_tier) return CREST_SLUMP_HAZARD_CONFIGS.stable_freeboard;
    return CREST_SLUMP_HAZARD_CONFIGS[crestSlumpResult.summary.hazard_tier] || CREST_SLUMP_HAZARD_CONFIGS.stable_freeboard;
  }, [crestSlumpResult]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-950 border border-emerald-500/30 rounded-2xl shadow-2xl text-slate-100 overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900/90 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/30 text-emerald-400 border border-emerald-500/30 shadow-lg">
              <Mountain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  3D Topographic Elevation Differential & Cut-and-Fill Studio
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Cycle v2.5.17
                </span>
                <span 
                  className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold border"
                  style={{
                    backgroundColor: `${hazardMeta.color}20`,
                    color: hazardMeta.color,
                    borderColor: `${hazardMeta.color}60`
                  }}
                >
                  {hazardMeta.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                2.5D DEM Volumetric Earthwork Differencing, Embankment Crest Slumping & LiDAR CSF Ground Point Cloud Separation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleApplyToMap}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-all shadow-lg hover:shadow-emerald-500/20"
              title="Broadcast active simulation tile layer to Leaflet Map Explorer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Apply to Map Explorer</span>
            </button>
            <button
              onClick={handleExecuteAllAnalyses}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-mono transition border border-slate-700 disabled:opacity-50"
              title="Recalculate models with current parameters"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>Re-run</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preset Selector Banner */}
        <div className="px-6 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Preset Scenarios:</span>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(PRESET_SCENARIOS).map(([key, sc]) => (
                <button
                  key={key}
                  onClick={() => handleSelectPreset(key)}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                    selectedPresetKey === key
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                  }`}
                >
                  {sc.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Asset: <strong className="text-white">{assetId}</strong></span>
            <span>Pre-DEM: <strong className="text-slate-300">{demPreId}</strong></span>
            <span>Post-DEM: <strong className="text-slate-300">{demPostId}</strong></span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 bg-slate-900/40 border-b border-slate-800/60 shrink-0 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('volumetric')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-all ${
              activeTab === 'volumetric'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Box className="w-3.5 h-3.5 text-emerald-400" />
            <span>Volumetric Differencing</span>
          </button>

          <button
            onClick={() => setActiveTab('crest_slump')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-all ${
              activeTab === 'crest_slump'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Crest Slump & Freeboard</span>
          </button>

          <button
            onClick={() => setActiveTab('transect')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-all ${
              activeTab === 'transect'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Scissors className="w-3.5 h-3.5 text-cyan-400" />
            <span>LiDAR Profile Transect</span>
          </button>

          <button
            onClick={() => setActiveTab('csf_filter')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-all ${
              activeTab === 'csf_filter'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-teal-400" />
            <span>LiDAR CSF Ground Separation</span>
          </button>

          <button
            onClick={() => setActiveTab('epipolar')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-all ${
              activeTab === 'epipolar'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>UAV Stereo Epipolar Disparity</span>
          </button>

          <button
            onClick={() => setActiveTab('tile_preview')}
            className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition-all ${
              activeTab === 'tile_preview'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dynamic Tile Layer</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: VOLUMETRIC DIFFERENCING */}
          {activeTab === 'volumetric' && (
            <div className="space-y-6">
              {/* Parameter Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <div>
                  <label className="block text-slate-400 font-mono mb-1">Calculation Mode</label>
                  <select
                    value={calculationMode}
                    onChange={(e) => setCalculationMode(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value={CUT_FILL_CALCULATION_MODES.CELL_DIFFERENCING}>2.5D Cell Differencing</option>
                    <option value={CUT_FILL_CALCULATION_MODES.TRAPEZOIDAL_PRISM}>Trapezoidal Prism Integration</option>
                    <option value={CUT_FILL_CALCULATION_MODES.TIN_DIFFERENTIAL}>TIN Differential Surface</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">
                    Grid Resolution (Δx = Δy): <span className="text-white font-bold">{gridResolutionM} m</span>
                  </label>
                  <input
                    type="range"
                    min="0.25"
                    max="5.0"
                    step="0.25"
                    value={gridResolutionM}
                    onChange={(e) => setGridResolutionM(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0.25m (Centimeter)</span>
                    <span>5.0m (Coarse)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">
                    Deadband Noise Threshold: <span className="text-white font-bold">{deadbandThresholdM} m</span>
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.25"
                    step="0.01"
                    value={deadbandThresholdM}
                    onChange={(e) => setDeadbandThresholdM(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>0.01m (Raw)</span>
                    <span>0.25m (Strict)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-mono mb-1">
                    Grid Side Dimension: <span className="text-white font-bold">{gridSidePoints} × {gridSidePoints} ({gridSidePoints * gridSidePoints} cells)</span>
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="48"
                    step="4"
                    value={gridSidePoints}
                    onChange={(e) => setGridSidePoints(parseInt(e.target.value, 10))}
                    className="w-full accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                    <span>144 cells</span>
                    <span>2,304 cells</span>
                  </div>
                </div>
              </div>

              {/* KPI Summary Cards */}
              {cutFillResult?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                  <div className="p-3.5 bg-slate-900/80 border border-rose-500/30 rounded-xl">
                    <div className="flex items-center justify-between text-[11px] text-rose-400 font-mono uppercase">
                      <span>Gross Excavation</span>
                      <ArrowDownCircle className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {cutFillResult.summary.gross_cut_volume_m3.toLocaleString()} m³
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Area: {cutFillResult.summary.area_cut_ha} ha
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-blue-500/30 rounded-xl">
                    <div className="flex items-center justify-between text-[11px] text-blue-400 font-mono uppercase">
                      <span>Gross Deposition</span>
                      <ArrowUpCircle className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-white mt-1">
                      {cutFillResult.summary.gross_fill_volume_m3.toLocaleString()} m³
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Area: {cutFillResult.summary.area_fill_ha} ha
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-emerald-500/30 rounded-xl">
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 font-mono uppercase">
                      <span>Net Earthwork</span>
                      <Box className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className={`text-xl font-bold font-mono mt-1 ${
                      cutFillResult.summary.net_volume_change_m3 >= 0 ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      {cutFillResult.summary.net_volume_change_m3 > 0 ? '+' : ''}
                      {cutFillResult.summary.net_volume_change_m3.toLocaleString()} m³
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {cutFillResult.summary.net_volume_change_m3 >= 0 ? 'Surplus Fill' : 'Deficit Void'}
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Max Cut Depth</div>
                    <div className="text-xl font-bold font-mono text-rose-300 mt-1">
                      {cutFillResult.summary.max_cut_depth_m} m
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Peak excavation sag</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Max Fill Height</div>
                    <div className="text-xl font-bold font-mono text-blue-300 mt-1">
                      {cutFillResult.summary.max_fill_height_m} m
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Peak fill crest</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Mean Delta ΔZ</div>
                    <div className="text-xl font-bold font-mono text-slate-200 mt-1">
                      {cutFillResult.summary.mean_elevation_change_m > 0 ? '+' : ''}
                      {cutFillResult.summary.mean_elevation_change_m} m
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Total Area: {cutFillResult.summary.total_area_ha} ha
                    </div>
                  </div>
                </div>
              )}

              {/* Hazard Action Recommendation Banner */}
              <div 
                className="p-4 rounded-xl border flex items-start gap-3.5 text-xs font-mono"
                style={{
                  backgroundColor: `${hazardMeta.color}15`,
                  borderColor: `${hazardMeta.color}50`
                }}
              >
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" style={{ color: hazardMeta.color }} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-white text-sm">{hazardMeta.label}</strong>
                    <span 
                      className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${hazardMeta.color}30`, color: hazardMeta.color }}
                    >
                      {hazardMeta.badge}
                    </span>
                  </div>
                  <p className="text-slate-300">{hazardMeta.description}</p>
                  <p className="text-slate-200">
                    <span className="text-emerald-400 font-bold">Action Protocol:</span> {hazardMeta.action}
                  </p>
                </div>
              </div>

              {/* Volumetric Balance Chart & Cell Matrix Distribution */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      Earthwork Volumetric Balance (m³)
                    </span>
                    <span className="text-slate-400 text-[10px]">ΔV = Σ (Z_post - Z_pre) · ΔA</span>
                  </div>
                  <div className="h-64">
                    {volumeBalanceChartData ? (
                      <Bar 
                        data={volumeBalanceChartData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (ctx) => `${ctx.parsed.y.toLocaleString()} m³`
                              }
                            }
                          },
                          scales: {
                            y: {
                              grid: { color: 'rgba(255,255,255,0.06)' },
                              ticks: { color: '#94a3b8', font: { family: 'monospace' } }
                            },
                            x: {
                              grid: { display: false },
                              ticks: { color: '#cbd5e1', font: { family: 'monospace', size: 10 } }
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                        No volumetric data loaded
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Cut Cells Table */}
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white flex items-center gap-2">
                      <ArrowDownCircle className="w-4 h-4 text-rose-400" />
                      Critical Excavation / Void Cells (Top 8)
                    </span>
                    <span className="text-rose-400 text-[10px] font-bold">Largest Void Displacement</span>
                  </div>
                  <div className="overflow-x-auto max-h-64 text-xs font-mono">
                    <table className="w-full text-left">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-2">Cell ID</th>
                          <th className="p-2">Coord (X, Y)</th>
                          <th className="p-2">Z_pre (m)</th>
                          <th className="p-2">Z_post (m)</th>
                          <th className="p-2">ΔZ (m)</th>
                          <th className="p-2">Cut Vol (m³)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {cutFillResult?.top_cut_cells?.slice(0, 8).map((c) => (
                          <tr key={c.cell_id} className="hover:bg-slate-800/40 transition">
                            <td className="p-2 text-rose-300 font-bold">{c.cell_id}</td>
                            <td className="p-2 text-slate-400">{c.x_m}m, {c.y_m}m</td>
                            <td className="p-2">{c.z_pre_m}</td>
                            <td className="p-2">{c.z_post_m}</td>
                            <td className="p-2 text-rose-400 font-bold">{c.delta_z_m}</td>
                            <td className="p-2 text-white font-bold">{c.cut_volume_m3.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREST SLUMP & FREEBOARD */}
          {activeTab === 'crest_slump' && (
            <div className="space-y-6">
              {/* Crest Parameters Bar */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 mb-1">Crest Length: <span className="text-white font-bold">{crestLengthM} m</span></label>
                  <input
                    type="range"
                    min="100"
                    max="1200"
                    step="20"
                    value={crestLengthM}
                    onChange={(e) => setCrestLengthM(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Design Freeboard: <span className="text-white font-bold">{designFreeboardM} m</span></label>
                  <input
                    type="range"
                    min="1.0"
                    max="8.0"
                    step="0.1"
                    value={designFreeboardM}
                    onChange={(e) => setDesignFreeboardM(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Reservoir Pool Elevation: <span className="text-white font-bold">{reservoirPoolElevationM} m</span></label>
                  <input
                    type="range"
                    min="50"
                    max="800"
                    step="5"
                    value={reservoirPoolElevationM}
                    onChange={(e) => setReservoirPoolElevationM(parseFloat(e.target.value))}
                    className="w-full accent-emerald-500"
                  />
                </div>
              </div>

              {/* Crest Slump KPI Summary Cards */}
              {crestSlumpResult?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Critical Station</div>
                    <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                      {crestSlumpResult.summary.critical_station_id}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Maximum crest sag</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-rose-500/30 rounded-xl">
                    <div className="text-[11px] text-rose-400 font-mono uppercase">Max Freeboard Loss</div>
                    <div className="text-xl font-bold font-mono text-rose-300 mt-1">
                      {crestSlumpResult.summary.max_freeboard_loss_m} m
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Mean: {crestSlumpResult.summary.mean_freeboard_loss_m} m
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-emerald-500/30 rounded-xl">
                    <div className="text-[11px] text-emerald-400 font-mono uppercase">Min Residual Freeboard</div>
                    <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                      {crestSlumpResult.summary.min_residual_freeboard_m} m
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Design: {crestSlumpResult.summary.design_freeboard_m} m
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Total Slump Volume</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      {crestSlumpResult.summary.total_slump_volume_m3.toLocaleString()} m³
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">8m nominal crest width</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Overtopping Risk</div>
                    <div 
                      className="text-sm font-bold font-mono mt-1 uppercase"
                      style={{ color: crestHazardMeta.color }}
                    >
                      {crestHazardMeta.badge}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {crestHazardMeta.label}
                    </div>
                  </div>
                </div>
              )}

              {/* Crest Slump Profile Chart */}
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    Longitudinal Embankment Crest Elevation & Freeboard Profile
                  </span>
                  <span className="text-slate-400 text-[10px]">Survey Stations STA_01 to STA_07</span>
                </div>
                <div className="h-64">
                  {crestSlumpChartData ? (
                    <Line 
                      data={crestSlumpChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { labels: { color: '#cbd5e1', font: { family: 'monospace' } } },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y} m`
                            }
                          }
                        },
                        scales: {
                          y: {
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { color: '#94a3b8', font: { family: 'monospace' } }
                          },
                          x: {
                            grid: { color: 'rgba(255,255,255,0.04)' },
                            ticks: { color: '#cbd5e1', font: { family: 'monospace', size: 10 } }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                      No crest slump data available
                    </div>
                  )}
                </div>
              </div>

              {/* Station Detail Table */}
              {crestSlumpResult?.stations && (
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">Station Freeboard & Slump Metrics</span>
                    <span className="text-slate-400 text-[10px]">{crestSlumpResult.stations.length} Monitoring Stations</span>
                  </div>
                  <div className="overflow-x-auto text-xs font-mono">
                    <table className="w-full text-left">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-2">Station ID</th>
                          <th className="p-2">Chainage (m)</th>
                          <th className="p-2">Coord (Lat, Lon)</th>
                          <th className="p-2">Z_pre (m)</th>
                          <th className="p-2">Z_post (m)</th>
                          <th className="p-2">Slump ΔZ (m)</th>
                          <th className="p-2">Residual Freeboard</th>
                          <th className="p-2">Loss (m)</th>
                          <th className="p-2">Hazard Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {crestSlumpResult.stations.map((st) => {
                          const tier = CREST_SLUMP_HAZARD_CONFIGS[st.hazard_tier] || CREST_SLUMP_HAZARD_CONFIGS.stable_freeboard;
                          return (
                            <tr key={st.station_id} className="hover:bg-slate-800/40 transition">
                              <td className="p-2 font-bold text-white">{st.station_id}</td>
                              <td className="p-2">{st.chainage_m} m</td>
                              <td className="p-2 text-slate-400">{st.latitude}, {st.longitude}</td>
                              <td className="p-2">{st.z_pre_m}</td>
                              <td className="p-2">{st.z_post_m}</td>
                              <td className="p-2 text-rose-400 font-bold">{st.delta_z_m}</td>
                              <td className="p-2 text-emerald-300 font-bold">{st.freeboard_post_m} m</td>
                              <td className="p-2 text-amber-300 font-bold">{st.freeboard_loss_m} m</td>
                              <td className="p-2">
                                <span 
                                  className="px-2 py-0.5 rounded text-[10px] uppercase font-bold border"
                                  style={{
                                    backgroundColor: `${tier.color}20`,
                                    color: tier.color,
                                    borderColor: `${tier.color}50`
                                  }}
                                >
                                  {tier.badge}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LIDAR PROFILE TRANSECT */}
          {activeTab === 'transect' && (
            <div className="space-y-6">
              {/* Spacing Input */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-3">
                  <Scissors className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-300 font-bold">Polyline Profile Sample Spacing (Δs):</span>
                </div>
                <div className="flex items-center gap-2">
                  {[2.0, 5.0, 10.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSampleSpacingM(s)}
                      className={`px-2.5 py-1 rounded text-xs transition ${
                        sampleSpacingM === s
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s} m
                    </button>
                  ))}
                </div>
              </div>

              {/* Transect KPI Cards */}
              {transectResult && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Transect Distance</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      {transectResult.total_distance_m} m
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Nodes: {transectResult.node_count} sampled
                    </div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-rose-500/30 rounded-xl">
                    <div className="text-[11px] text-rose-400 font-mono uppercase">Transect Cut Prism</div>
                    <div className="text-lg font-bold font-mono text-rose-300 mt-1">
                      {transectResult.gross_cut_volume_m3} m³
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Unit width (1.0m)</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-blue-500/30 rounded-xl">
                    <div className="text-[11px] text-blue-400 font-mono uppercase">Transect Fill Prism</div>
                    <div className="text-lg font-bold font-mono text-blue-300 mt-1">
                      {transectResult.gross_fill_volume_m3} m³
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Unit width (1.0m)</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Max Cut Sag</div>
                    <div className="text-lg font-bold font-mono text-rose-300 mt-1">
                      {transectResult.max_cut_depth_m} m
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Peak local displacement</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Max Fill Raising</div>
                    <div className="text-lg font-bold font-mono text-blue-300 mt-1">
                      {transectResult.max_fill_height_m} m
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Peak deposition height</div>
                  </div>
                </div>
              )}

              {/* Transect Profile Chart */}
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-white flex items-center gap-2">
                    <Scissors className="w-4 h-4 text-cyan-400" />
                    1D Cross-Section Elevation & Elevation Difference ΔZ
                  </span>
                  <span className="text-slate-400 text-[10px]">Left Axis: Elevation (m) | Right Axis: ΔZ (m)</span>
                </div>
                <div className="h-72">
                  {transectChartData ? (
                    <Bar
                      data={transectChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                          legend: { labels: { color: '#cbd5e1', font: { family: 'monospace' } } }
                        },
                        scales: {
                          y: {
                            type: 'linear',
                            position: 'left',
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { color: '#94a3b8', font: { family: 'monospace' } },
                            title: { display: true, text: 'Elevation Z (m)', color: '#94a3b8' }
                          },
                          y1: {
                            type: 'linear',
                            position: 'right',
                            grid: { display: false },
                            ticks: { color: '#38bdf8', font: { family: 'monospace' } },
                            title: { display: true, text: 'Delta ΔZ (m)', color: '#38bdf8' }
                          },
                          x: {
                            grid: { color: 'rgba(255,255,255,0.04)' },
                            ticks: { color: '#cbd5e1', font: { family: 'monospace', size: 10 } }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                      No transect profile data loaded
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LIDAR CSF GROUND SEPARATION */}
          {activeTab === 'csf_filter' && (
            <div className="space-y-6">
              {/* CSF Parameters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono">
                <div>
                  <label className="block text-slate-400 mb-1">Terrain Rigidness</label>
                  <select
                    value={csfRigidness}
                    onChange={(e) => setCsfRigidness(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value="flat_terrain">Flat Terrain (Low Rigidness, RI=1)</option>
                    <option value="relief_slope">Relief Slope (Moderate Rigidness, RI=2)</option>
                    <option value="steep_mountain">Steep Mountain (High Rigidness, RI=3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Cloth Grid Resolution: <span className="text-white font-bold">{csfClothResolutionM} m</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={csfClothResolutionM}
                    onChange={(e) => setCsfClothResolutionM(parseFloat(e.target.value))}
                    className="w-full accent-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">
                    Classification Threshold: <span className="text-white font-bold">{csfClassificationThresholdM} m</span>
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={csfClassificationThresholdM}
                    onChange={(e) => setCsfClassificationThresholdM(parseFloat(e.target.value))}
                    className="w-full accent-teal-500"
                  />
                </div>
              </div>

              {/* CSF Metrics Cards */}
              {csfResult && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Total Point Returns</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      {csfResult.total_points?.toLocaleString() || csfResult.point_count || 120} pts
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">UAV / LiDAR survey</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-emerald-500/30 rounded-xl">
                    <div className="text-[11px] text-emerald-400 font-mono uppercase">Ground Returns</div>
                    <div className="text-lg font-bold font-mono text-emerald-300 mt-1">
                      {csfResult.ground_points?.toLocaleString() || csfResult.ground_count || 85} pts
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Bare-earth DTM mesh</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-teal-500/30 rounded-xl">
                    <div className="text-[11px] text-teal-400 font-mono uppercase">Non-Ground / Canopy</div>
                    <div className="text-lg font-bold font-mono text-teal-300 mt-1">
                      {csfResult.non_ground_points?.toLocaleString() || (120 - (csfResult.ground_count || 85))} pts
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Vegetation & crest berms</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Ground Ratio</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      {csfResult.ground_ratio_pct ? `${csfResult.ground_ratio_pct}%` : '70.8%'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Simulation convergence</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">CSF Tier Quality</div>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-1 uppercase">
                      {CSF_TIER_METADATA[csfResult.classification_tier]?.name || 'Optimal Separation'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Residual &lt; 0.15m
                    </div>
                  </div>
                </div>
              )}

              {/* CSF Mechanics Architecture Callout */}
              <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <Zap className="w-4 h-4" />
                  Cloth Simulation Filter Mechanics (Zhang et al. 2016)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  The CSF algorithm inverts the 3D LiDAR point cloud along the vertical axis and drops a simulated elastic cloth
                  governed by mass-spring particle mechanics. Rigidness determines cloth bending stiffness across steep slopes.
                  Particles resting on inverted points delineate the bare-earth Digital Terrain Model (DTM), filtering out canopy,
                  conveyor belts, and tailings discharge pipelines.
                </p>
              </div>
            </div>
          )}

          {/* TAB 5: STEREO UAV EPIPOLAR DISPARITY */}
          {activeTab === 'epipolar' && (
            <div className="space-y-6">
              {/* Epipolar Parameters */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-300">
                  <Compass className="w-4 h-4 text-indigo-400" />
                  <span>Stereo Image Pairs Evaluated:</span>
                </div>
                <div className="flex items-center gap-2">
                  {[6, 8, 12, 16].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setStereoPairCount(cnt)}
                      className={`px-2.5 py-1 rounded text-xs transition ${
                        stereoPairCount === cnt
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 font-bold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cnt} Pairs
                    </button>
                  ))}
                </div>
              </div>

              {/* Epipolar KPI Cards */}
              {epipolarResult && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Disparity RMSE</div>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                      {epipolarResult.disparity_rmse_px} px
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">Sub-pixel photogrammetry</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Inlier Ratio</div>
                    <div className="text-lg font-bold font-mono text-white mt-1">
                      {epipolarResult.overall_inlier_ratio_pct}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">SIFT / SGM feature matches</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Stereo Baseline</div>
                    <div className="text-lg font-bold font-mono text-indigo-300 mt-1">
                      {epipolarResult.stereo_pairs_evaluated} pairs
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">B/H ratio ~ 0.28</div>
                  </div>

                  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-mono uppercase">Disparity Tier</div>
                    <div className="text-sm font-bold font-mono text-emerald-400 mt-1 uppercase">
                      {EPIPOLAR_DISPARITY_QUALITY_CONFIGS[epipolarResult.overall_quality]?.badge || 'OPTIMAL'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {EPIPOLAR_DISPARITY_QUALITY_CONFIGS[epipolarResult.overall_quality]?.label || 'Sub-Pixel Convergence'}
                    </div>
                  </div>
                </div>
              )}

              {/* Stereo Pair Residual Table */}
              {epipolarResult?.differential_pairs && (
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">Multi-View Stereo Pair Disparity Residuals</span>
                    <span className="text-slate-400 text-[10px]">{epipolarResult.differential_pairs.length} Pairs Analyzed</span>
                  </div>
                  <div className="overflow-x-auto text-xs font-mono">
                    <table className="w-full text-left">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-2">Pair ID</th>
                          <th className="p-2">Pre / Post Images</th>
                          <th className="p-2">Air Baseline (m)</th>
                          <th className="p-2">Mean Disparity (px)</th>
                          <th className="p-2">RMSE (px)</th>
                          <th className="p-2">Inlier Ratio</th>
                          <th className="p-2">Disparity Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {epipolarResult.differential_pairs.map((p) => {
                          const qualConfig = EPIPOLAR_DISPARITY_QUALITY_CONFIGS[p.quality] || EPIPOLAR_DISPARITY_QUALITY_CONFIGS.sub_pixel_convergence;
                          return (
                            <tr key={p.pair_id} className="hover:bg-slate-800/40 transition">
                              <td className="p-2 font-bold text-white">{p.pair_id}</td>
                              <td className="p-2 text-slate-400">{p.image_pre_id} → {p.image_post_id}</td>
                              <td className="p-2">{p.baseline_distance_m} m</td>
                              <td className="p-2">{p.mean_disparity_px} px</td>
                              <td className="p-2 text-emerald-400 font-bold">{p.disparity_rmse_px} px</td>
                              <td className="p-2">{p.inlier_ratio_pct}%</td>
                              <td className="p-2">
                                <span 
                                  className="px-2 py-0.5 rounded text-[10px] uppercase font-bold border"
                                  style={{
                                    backgroundColor: `${qualConfig.color}20`,
                                    color: qualConfig.color,
                                    borderColor: `${qualConfig.color}50`
                                  }}
                                >
                                  {qualConfig.badge}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: DYNAMIC TILE LAYER INSPECTOR */}
          {activeTab === 'tile_preview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Metric Selector & Symbology */}
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-400" />
                      Dynamic Raster Symbology Metric
                    </span>
                    <span className="text-slate-400 text-[10px]">6 Symbology Channels</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {Object.values(TOPOGRAPHIC_DELTA_TILE_METRICS).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setTilePreviewMetric(m.id)}
                        className={`p-3 rounded-lg text-left transition flex items-center justify-between border ${
                          tilePreviewMetric === m.id
                            ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-md'
                            : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/70'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-emerald-300">{m.name}</div>
                          <div className="text-[10px] text-slate-400">{m.description}</div>
                        </div>
                        <div className="text-right shrink-0 ml-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700">
                            {m.colormap} [{m.min} to {m.max} {m.unit}]
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-slate-400">Tile Layer Opacity:</span>
                      <strong className="text-white font-bold">{Math.round(tileOpacity * 100)}%</strong>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={tileOpacity}
                      onChange={(e) => setTileOpacity(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500"
                    />
                  </div>
                </div>

                {/* Tile URL Template & Endpoint Verification */}
                <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl space-y-4 text-xs font-mono">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      Dynamic XYZ Tile URL Template
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      RFC 7946 / Slippy Map
                    </span>
                  </div>

                  <div className="p-3 bg-black/60 border border-slate-800 rounded-lg text-emerald-400 break-all select-all text-[11px]">
                    {buildTopographicElevationDeltaTileUrlTemplate(
                      cutFillResult?.simulation_id || 'CUTFILL_SIM_ACTIVE',
                      tilePreviewMetric
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(
                        getTopographicElevationDeltaTileUrlTemplate(
                          cutFillResult?.simulation_id || 'CUTFILL_SIM_ACTIVE',
                          tilePreviewMetric
                        ),
                        'tileUrl'
                      )}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300 hover:text-white transition"
                    >
                      {copiedKey === 'tileUrl' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>Copy Tile URL</span>
                    </button>
                    <button
                      onClick={handleApplyToMap}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold transition shadow-lg"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Broadcast Layer to Map Explorer</span>
                    </button>
                  </div>

                  <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg space-y-2 text-slate-300 text-[11px]">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Backend High-Speed Tile Server Contract
                    </div>
                    <p className="text-slate-400">
                      Tiles stream dynamically at 256×256 pixels rendered in single-precision float32.
                      Colormaps match the backend raster pipeline with sub-50ms latency.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="flex items-center gap-3 text-slate-400">
            <span>Simulation: <strong className="text-slate-200">{cutFillResult?.simulation_id || 'ACTIVE'}</strong></span>
            <span>•</span>
            <span>Mode: <strong className="text-slate-200">{calculationMode}</strong></span>
            <span>•</span>
            <span>Res: <strong className="text-slate-200">{gridResolutionM}m</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(JSON.stringify(cutFillResult, null, 2), 'fullJson')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
            >
              {copiedKey === 'fullJson' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy Full Results JSON</span>
            </button>
            <button
              onClick={handleApplyToMap}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded shadow-lg transition"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Broadcast to Map</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
