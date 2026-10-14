import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, Activity, Gauge, Waves, AlertTriangle, ShieldAlert, Layers, Eye, Copy, Check,
  CheckCircle2, Droplets, SlidersHorizontal, ArrowRight, Compass,
  Radio, Info, Play, RefreshCw, BarChart3, TrendingUp
} from 'lucide-react';
import { 
  analyzeInternalErosionPiping,
  fetchInternalErosionSimulation,
  getFlownetTileUrlTemplate
} from '../api/giosApi';
import { 
  PipingFailureMechanism,
  FlownetBoundaryCondition,
  InternalErosionHazardTier,
  INTERNAL_EROSION_HAZARD_CONFIGS,
  SELLMEIJER_SOIL_PRESETS,
  FLOWNET_TILE_METRICS,
  calculateTerzaghiCriticalGradient,
  calculateSellmeijerCriticalHead,
  classifyInternalErosionHazardTier,
  calculateInternalErosionPipingAnalysis,
  buildFlownetTileUrlTemplate
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Pre-configured Benchmark Internal Erosion & Piping Scenarios
const PRESET_SCENARIOS = {
  teton_foundation_piping: {
    id: 'teton_foundation_piping',
    name: 'Teton Embankment Foundation Piping (1976 Analog)',
    dam_id: 'DAM_TETON_01',
    dam_name: 'Teton Earthfill Dam Abutment Seepage',
    coordinates: [-111.5383, 43.9083],
    soil_classification: 'silty_tailings_sand',
    upstream_head_m: 85.0,
    downstream_head_m: 8.0,
    embankment_base_length_m: 90.0,
    aquifer_depth_m: 25.0,
    potential_drops_nd: 16,
    flow_channels_nf: 5,
    custom_params: {
      specific_gravity: 2.72,
      void_ratio: 0.70,
      d70_m: 0.00010,
      cu: 3.5,
      hydraulic_conductivity_ms: 1.2e-5,
      friction_angle_deg: 31.0
    }
  },
  tarbela_alluvial_foundation: {
    id: 'tarbela_alluvial_foundation',
    name: 'Tarbela Fluvial Foundation Underseepage (Pakistan)',
    dam_id: 'DAM_TARBELA_01',
    dam_name: 'Tarbela Dam Alluvial Foundation Aquifer',
    coordinates: [72.6989, 34.0886],
    soil_classification: 'foundation_alluvium',
    upstream_head_m: 135.0,
    downstream_head_m: 12.0,
    embankment_base_length_m: 210.0,
    aquifer_depth_m: 40.0,
    potential_drops_nd: 20,
    flow_channels_nf: 6,
    custom_params: {
      specific_gravity: 2.67,
      void_ratio: 0.60,
      d70_m: 0.00028,
      cu: 2.8,
      hydraulic_conductivity_ms: 5.0e-5,
      friction_angle_deg: 34.0
    }
  },
  fontenelle_sandstone_seepage: {
    id: 'fontenelle_sandstone_seepage',
    name: 'Fontenelle Left Abutment Seepage (Wyoming 1965)',
    dam_id: 'DAM_FONTENELLE_01',
    dam_name: 'Fontenelle Left Abutment Contact Zone',
    coordinates: [-110.0633, 42.0294],
    soil_classification: 'fine_uniform_sand',
    upstream_head_m: 38.0,
    downstream_head_m: 4.0,
    embankment_base_length_m: 75.0,
    aquifer_depth_m: 18.0,
    potential_drops_nd: 14,
    flow_channels_nf: 4,
    custom_params: {
      specific_gravity: 2.65,
      void_ratio: 0.65,
      d70_m: 0.00015,
      cu: 1.88,
      hydraulic_conductivity_ms: 1.8e-5,
      friction_angle_deg: 32.0
    }
  },
  copper_tailings_embankment: {
    id: 'copper_tailings_embankment',
    name: 'Dense Copper Flotation Tailings Embankment',
    dam_id: 'DAM_COPPER_TSF_01',
    dam_name: 'Main Tailings Storage Facility Perimeter Dike',
    coordinates: [-70.0500, -22.5000],
    soil_classification: 'copper_tailings',
    upstream_head_m: 45.0,
    downstream_head_m: 5.0,
    embankment_base_length_m: 80.0,
    aquifer_depth_m: 20.0,
    potential_drops_nd: 12,
    flow_channels_nf: 4,
    custom_params: {
      specific_gravity: 2.82,
      void_ratio: 0.78,
      d70_m: 0.000065,
      cu: 5.42,
      hydraulic_conductivity_ms: 2.8e-6,
      friction_angle_deg: 30.0
    }
  }
};

export const InternalErosionModal = ({
  isOpen,
  onClose,
  activeSimulation,
  onApplyToMap
}) => {
  // Active Tab
  const [activeTab, setActiveTab] = useState('parameters'); // 'parameters' | 'progression' | 'flownet' | 'exit_gradient' | 'tiles'

  // Selected Preset
  const [selectedPresetId, setSelectedPresetId] = useState('teton_foundation_piping');
  const [selectedSoilPreset, setSelectedSoilPreset] = useState('silty_tailings_sand');

  // Input State
  const [upstreamHead, setUpstreamHead] = useState(85.0);
  const [downstreamHead, setDownstreamHead] = useState(8.0);
  const [baseLength, setBaseLength] = useState(90.0);
  const [aquiferDepth, setAquiferDepth] = useState(25.0);
  const [potentialDropsNd, setPotentialDropsNd] = useState(16);
  const [flowChannelsNf, setFlowChannelsNf] = useState(5);
  const [failureMechanism, setFailureMechanism] = useState(PipingFailureMechanism.BACKWARD_EROSION);

  // Custom Soil Parameters
  const [specificGravity, setSpecificGravity] = useState(2.72);
  const [voidRatio, setVoidRatio] = useState(0.70);
  const [d70M, setD70M] = useState(0.00010);
  const [cu, setCu] = useState(3.5);
  const [hydraulicConductivityMs, setHydraulicConductivityMs] = useState(1.2e-5);
  const [frictionAngleDeg, setFrictionAngleDeg] = useState(31.0);

  // Interactive Pipe Progression Simulation State
  const [pipeProgressionM, setPipeProgressionM] = useState(15.0);

  // Dynamic TileLayer State
  const [selectedMetric, setSelectedMetric] = useState('hydraulic_head');
  const [tileOpacity, setTileOpacity] = useState(0.85);
  const [copiedTileUrl, setCopiedTileUrl] = useState(false);

  // Simulation Results & Loading State
  const [simulation, setSimulation] = useState(activeSimulation || null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState(null);
  const [simLookupId, setSimLookupId] = useState('');
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  // Sync activeSimulation from parent prop
  useEffect(() => {
    if (activeSimulation) {
      setSimulation(activeSimulation);
    }
  }, [activeSimulation]);

  // Handle Preset Switching
  const handleSelectPreset = useCallback((presetKey) => {
    const p = PRESET_SCENARIOS[presetKey];
    if (!p) return;
    setSelectedPresetId(presetKey);
    setSelectedSoilPreset(p.soil_classification);
    setUpstreamHead(p.upstream_head_m);
    setDownstreamHead(p.downstream_head_m);
    setBaseLength(p.embankment_base_length_m);
    setAquiferDepth(p.aquifer_depth_m);
    setPotentialDropsNd(p.potential_drops_nd);
    setFlowChannelsNf(p.flow_channels_nf);

    if (p.custom_params) {
      setSpecificGravity(p.custom_params.specific_gravity);
      setVoidRatio(p.custom_params.void_ratio);
      setD70M(p.custom_params.d70_m);
      setCu(p.custom_params.cu);
      setHydraulicConductivityMs(p.custom_params.hydraulic_conductivity_ms);
      setFrictionAngleDeg(p.custom_params.friction_angle_deg);
    }
  }, []);

  // Handle Soil Preset Switching
  const handleSelectSoilPreset = useCallback((soilKey) => {
    const s = SELLMEIJER_SOIL_PRESETS[soilKey];
    if (!s) return;
    setSelectedSoilPreset(soilKey);
    setSpecificGravity(s.specific_gravity);
    setVoidRatio(s.void_ratio);
    setD70M(s.d70_m);
    setCu(s.cu);
    setHydraulicConductivityMs(s.hydraulic_conductivity_ms);
    setFrictionAngleDeg(s.friction_angle_deg);
  }, []);

  // Real-Time Terzaghi & Sellmeijer Scientific Inversion Preview
  const livePreview = useMemo(() => {
    const appliedHead = Math.max(0.1, upstreamHead - downstreamHead);
    const terzaghi = calculateTerzaghiCriticalGradient(specificGravity, voidRatio, 9.81);
    const sellmeijer = calculateSellmeijerCriticalHead({
      hydraulic_conductivity_ms: hydraulicConductivityMs,
      d70_m: d70M,
      seepage_length_m: baseLength,
      aquifer_depth_m: aquiferDepth,
      specific_gravity: specificGravity,
      friction_angle_deg: frictionAngleDeg,
      applied_head_m: appliedHead,
      cu: cu
    });

    const averageGradient = Number((appliedHead / Math.max(1.0, baseLength)).toFixed(4));
    const factorOfSafety = sellmeijer.factor_of_safety;
    const hazardTier = classifyInternalErosionHazardTier(factorOfSafety, averageGradient * 1.5, terzaghi.critical_gradient);
    const tierConfig = INTERNAL_EROSION_HAZARD_CONFIGS[hazardTier] || INTERNAL_EROSION_HAZARD_CONFIGS.moderate_risk;

    return {
      applied_head_m: appliedHead,
      average_gradient: averageGradient,
      terzaghi,
      sellmeijer,
      factor_of_safety: factorOfSafety,
      hazard_tier: hazardTier,
      tier_config: tierConfig
    };
  }, [
    upstreamHead, downstreamHead, baseLength, aquiferDepth,
    specificGravity, voidRatio, d70M, cu, hydraulicConductivityMs, frictionAngleDeg
  ]);

  // Execute Internal Erosion & Seepage Flownet Simulation
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimError(null);

    const payload = {
      dam_id: PRESET_SCENARIOS[selectedPresetId]?.dam_id || 'DAM_GENERIC_01',
      dam_name: PRESET_SCENARIOS[selectedPresetId]?.dam_name || 'Tailings Facility Embankment',
      failure_mechanism: failureMechanism,
      soil_classification: selectedSoilPreset,
      soil_parameters: {
        specific_gravity: specificGravity,
        void_ratio: voidRatio,
        d70_m: d70M,
        cu: cu,
        hydraulic_conductivity_ms: hydraulicConductivityMs,
        friction_angle_deg: frictionAngleDeg
      },
      upstream_head_m: upstreamHead,
      downstream_head_m: downstreamHead,
      embankment_base_length_m: baseLength,
      aquifer_depth_m: aquiferDepth,
      potential_drops_nd: potentialDropsNd,
      flow_channels_nf: flowChannelsNf,
      pipe_progression_m: pipeProgressionM,
      grid_nx: 25,
      grid_nz: 15
    };

    try {
      let result;
      try {
        result = await analyzeInternalErosionPiping(payload);
      } catch {
        // Fallback to offline mathematical calculation
        result = calculateInternalErosionPipingAnalysis(payload);
      }

      setSimulation(result);
      if (result.sellmeijer_bep?.pipe_progression_m) {
        setPipeProgressionM(result.sellmeijer_bep.pipe_progression_m);
      }
    } catch (err) {
      setSimError(err.message || 'Simulation execution failed');
    } finally {
      setIsSimulating(false);
    }
  };

  // Lookup Historical Simulation
  const handleFetchHistorical = async () => {
    if (!simLookupId.trim()) return;
    setIsFetchingHistory(true);
    setSimError(null);
    try {
      const res = await fetchInternalErosionSimulation(simLookupId.trim());
      setSimulation(res);
    } catch (err) {
      setSimError(`Could not find simulation ${simLookupId}: ${err.message}`);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  // Copy Tile URL Template
  const handleCopyTileUrl = () => {
    if (!simulation) return;
    const url = getFlownetTileUrlTemplate(simulation.simulation_id, selectedMetric);
    navigator.clipboard.writeText(url);
    setCopiedTileUrl(true);
    setTimeout(() => setCopiedTileUrl(false), 2000);
  };

  // Apply to Main Map
  const handleApplyToMap = () => {
    if (!simulation) return;
    if (onApplyToMap) {
      onApplyToMap(simulation, {
        selectedMetric,
        opacity: tileOpacity,
        tileUrlTemplate: simulation.tile_url_template || buildFlownetTileUrlTemplate(simulation.simulation_id, selectedMetric)
      });
    }
  };

  // Chart 1: Flownet Equipotential & Streamline Cross-Section Visualizer
  const flownetChartData = useMemo(() => {
    const flownet = simulation?.flownet_seepage;
    if (!flownet) return null;

    const streamDatasets = (flownet.streamlines || []).map((st, idx) => ({
      label: `Streamline Ψ_${idx + 1}`,
      data: (st.nodes || []).map(node => ({ x: node.x_m, y: -node.z_depth_m })),
      borderColor: idx === 0 ? '#38bdf8' : idx === (flownet.streamlines.length - 1) ? '#0284c7' : '#0ea5e9',
      borderWidth: 2,
      borderDash: [4, 4],
      pointRadius: 0,
      fill: false,
      tension: 0.3
    }));

    const equipotentialDatasets = (flownet.equipotentials || []).map((eq, idx) => ({
      label: `Equipotential Φ_${idx + 1}`,
      data: (eq.nodes || []).map(node => ({ x: node.x_m, y: -node.z_depth_m })),
      borderColor: '#f59e0b',
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
      tension: 0.2
    }));

    // Foundation boundary lines
    const groundSurface = {
      label: 'Ground Surface',
      data: [{ x: 0, y: 0 }, { x: baseLength, y: 0 }],
      borderColor: '#94a3b8',
      borderWidth: 3,
      pointRadius: 0,
      fill: false
    };

    const bedrockBase = {
      label: 'Impervious Bedrock',
      data: [{ x: 0, y: -aquiferDepth }, { x: baseLength, y: -aquiferDepth }],
      borderColor: '#475569',
      borderWidth: 4,
      pointRadius: 0,
      fill: false
    };

    return {
      datasets: [groundSurface, bedrockBase, ...streamDatasets, ...equipotentialDatasets]
    };
  }, [simulation, baseLength, aquiferDepth]);

  // Chart 2: Exit Hydraulic Gradient vs Critical Gradient Distribution
  const exitGradientChartData = useMemo(() => {
    const stations = simulation?.flownet_seepage?.exit_stations;
    if (!stations || stations.length === 0) return null;

    const labels = stations.map(s => s.station_id || `${s.x_offset_m.toFixed(1)}m`);
    const iExitData = stations.map(s => s.exit_gradient);
    const iCritData = stations.map(() => livePreview.terzaghi.critical_gradient);
    const fsData = stations.map(s => s.factor_of_safety);

    return {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Exit Gradient (i_exit)',
          data: iExitData,
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          borderWidth: 3,
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Critical Heave Gradient (i_crit)',
          data: iCritData,
          borderColor: '#f59e0b',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'Factor of Safety (FS)',
          data: fsData,
          backgroundColor: fsData.map(v => v < 1.0 ? 'rgba(239, 68, 68, 0.7)' : v < 1.5 ? 'rgba(245, 158, 11, 0.7)' : 'rgba(16, 185, 129, 0.7)'),
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    };
  }, [simulation, livePreview.terzaghi.critical_gradient]);

  // Chart 3: Sellmeijer Backward Piping Progression Curve
  const progressionChartData = useMemo(() => {
    const deltaH = livePreview.applied_head_m;
    const lTot = baseLength;
    const steps = 15;
    const lengths = Array.from({ length: steps + 1 }, (_, i) => (lTot * i) / steps);

    // Equilibrium critical head vs pipe progression ratio (Sellmeijer 2006 curve)
    const eqHeads = lengths.map(l => {
      const progRatio = l / lTot;
      // Parabolic softening curve where resistance drops as pipe advances
      const decay = 1.0 - 0.65 * Math.pow(progRatio, 1.4);
      return Number((livePreview.sellmeijer.critical_differential_head_m * decay).toFixed(2));
    });

    const appliedHeads = lengths.map(() => deltaH);

    return {
      labels: lengths.map(l => `${l.toFixed(0)}m`),
      datasets: [
        {
          label: 'Sellmeijer Critical Differential Head ΔH_c (m)',
          data: eqHeads,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0.25
        },
        {
          label: 'Applied Differential Head ΔH (m)',
          data: appliedHeads,
          borderColor: '#f43f5e',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0
        }
      ]
    };
  }, [livePreview, baseLength]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-cyan-500/20 border border-amber-500/30 text-amber-400">
              <Waves className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Internal Erosion & Seepage Flownet Studio
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-950/80 text-cyan-400 border border-cyan-700/50">
                  Cycle v2.5.19
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Terzaghi Heave Gradient ($i_{'{'}crit{'}'}$) • Sellmeijer (1988) Backward Piping Inversion • 2D Laplace Seepage Flownet Grid
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              title="Close Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Empirical Parameter Inversion Banner */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Terzaghi i_crit:</span>
              <span className="font-mono font-bold text-amber-400">
                {livePreview.terzaghi.critical_gradient.toFixed(3)}
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Applied ΔH:</span>
              <span className="font-mono font-bold text-cyan-400">
                {livePreview.applied_head_m.toFixed(1)} m
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Sellmeijer ΔH_c:</span>
              <span className="font-mono font-bold text-emerald-400">
                {livePreview.sellmeijer.critical_differential_head_m.toFixed(1)} m
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Global FS:</span>
              <span className={`font-mono font-bold ${
                livePreview.factor_of_safety < 1.0 ? 'text-rose-400' :
                livePreview.factor_of_safety < 1.5 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {livePreview.factor_of_safety.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 ${
              livePreview.factor_of_safety < 1.0
                ? 'bg-rose-950/80 text-rose-400 border border-rose-700/60'
                : livePreview.factor_of_safety < 1.5
                ? 'bg-amber-950/80 text-amber-400 border border-amber-700/60'
                : 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
            }`}>
              {livePreview.factor_of_safety < 1.0 ? (
                <ShieldAlert className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{livePreview.tier_config.label}</span>
            </span>

            {simulation?.sand_boiling_imminent && (
              <span className="px-2 py-1 bg-red-600/30 text-red-300 border border-red-500 rounded text-xs font-bold animate-pulse flex items-center space-x-1">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span>BOILING IMMINENT</span>
              </span>
            )}
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6">
          {[
            { id: 'parameters', label: '1. Terzaghi & Sellmeijer Inversion', icon: SlidersHorizontal },
            { id: 'progression', label: '2. Piping Progression Channel', icon: TrendingUp },
            { id: 'flownet', label: '3. 2D Seepage Flownet', icon: Waves },
            { id: 'exit_gradient', label: '4. Exit Gradient & Heave Stations', icon: BarChart3 },
            { id: 'tiles', label: '5. Dynamic Piezometric TileLayer', icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                  isActive
                    ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: PARAMETERS & SOIL INVERSION */}
          {activeTab === 'parameters' && (
            <div className="space-y-6">
              
              {/* Presets Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                  Benchmark Dam Foundation & Soil Presets
                </label>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {Object.entries(PRESET_SCENARIOS).map(([key, p]) => (
                    <button
                      key={key}
                      onClick={() => handleSelectPreset(key)}
                      className={`text-left p-3 rounded-xl border transition-all ${
                        selectedPresetId === key
                          ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/5'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="text-xs font-bold text-white truncate">{p.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        H={p.upstream_head_m}m • L={p.embankment_base_length_m}m
                      </div>
                      <div className="text-[10px] text-cyan-400 mt-1 truncate">
                        {p.dam_name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Geometry & Foundation Aquifer Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 rounded-xl border border-slate-800 bg-slate-950/30">
                
                {/* Column 1: Hydraulic Heads */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Droplets className="w-4 h-4" />
                    <span>Hydraulic Boundary Heads</span>
                  </h3>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Upstream Reservoir Head H_up:</span>
                      <span className="font-mono text-cyan-400 font-bold">{upstreamHead} m</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="150"
                      step="1"
                      value={upstreamHead}
                      onChange={(e) => setUpstreamHead(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Downstream Tailwater Head H_down:</span>
                      <span className="font-mono text-cyan-400 font-bold">{downstreamHead} m</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      step="0.5"
                      value={downstreamHead}
                      onChange={(e) => setDownstreamHead(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Net Driving Head ΔH:</span>
                      <span className="font-mono font-bold text-white">{(upstreamHead - downstreamHead).toFixed(1)} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Average Hydraulic Gradient:</span>
                      <span className="font-mono font-bold text-white">
                        {((upstreamHead - downstreamHead) / Math.max(1, baseLength)).toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Column 2: Foundation & Embankment Geometry */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Compass className="w-4 h-4" />
                    <span>Embankment & Aquifer Dimensions</span>
                  </h3>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Seepage Path Base Length L:</span>
                      <span className="font-mono text-cyan-400 font-bold">{baseLength} m</span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="250"
                      step="5"
                      value={baseLength}
                      onChange={(e) => setBaseLength(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Permeable Aquifer Depth D:</span>
                      <span className="font-mono text-cyan-400 font-bold">{aquiferDepth} m</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="60"
                      step="1"
                      value={aquiferDepth}
                      onChange={(e) => setAquiferDepth(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Aquifer Aspect Ratio D / L:</span>
                      <span className="font-mono font-bold text-white">{(aquiferDepth / baseLength).toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sellmeijer Geometry F_G:</span>
                      <span className="font-mono font-bold text-white">{livePreview.sellmeijer.geometry_factor_fg.toFixed(3)}</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: Soil Preset & Failure Mode */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Radio className="w-4 h-4" />
                    <span>Soil Classification & Mechanism</span>
                  </h3>

                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Select Soil Preset:</label>
                    <select
                      value={selectedSoilPreset}
                      onChange={(e) => handleSelectSoilPreset(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {Object.entries(SELLMEIJER_SOIL_PRESETS).map(([k, s]) => (
                        <option key={k} value={k}>
                          {s.name} (d70={s.d70_m * 1000}mm, K={s.hydraulic_conductivity_ms.toExponential(1)}m/s)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-xs mb-1">Failure Mechanism:</label>
                    <select
                      value={failureMechanism}
                      onChange={(e) => setFailureMechanism(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value={PipingFailureMechanism.BACKWARD_EROSION}>Backward Erosion Piping (BEP, Sellmeijer)</option>
                      <option value={PipingFailureMechanism.HEAVE_BOIL}>Hydraulic Heave & Sand Boiling (Terzaghi)</option>
                      <option value={PipingFailureMechanism.SUFFUSION}>Internal Suffusion / Gap-Graded Washout</option>
                      <option value={PipingFailureMechanism.CONTACT_EROSION}>Contact Erosion at Foundation Boundary</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Drops (Nd):</span>
                      <input
                        type="number"
                        min="6"
                        max="30"
                        value={potentialDropsNd}
                        onChange={(e) => setPotentialDropsNd(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Channels (Nf):</span>
                      <input
                        type="number"
                        min="2"
                        max="12"
                        value={flowChannelsNf}
                        onChange={(e) => setFlowChannelsNf(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Geotechnical Soil Parameters Editor */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    <span>In-Situ Geotechnical Soil Properties</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Calculated Submerged Unit Weight γ': <strong className="text-amber-400 font-mono">{livePreview.terzaghi.submerged_unit_weight_kn_m3} kN/m³</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block text-[11px]">Specific Gravity G_s</label>
                    <input
                      type="number"
                      step="0.01"
                      min="1.8"
                      max="3.2"
                      value={specificGravity}
                      onChange={(e) => setSpecificGravity(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px]">Void Ratio e</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.2"
                      max="1.5"
                      value={voidRatio}
                      onChange={(e) => setVoidRatio(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px]">Grain Size d_70 (m)</label>
                    <input
                      type="number"
                      step="0.00001"
                      value={d70M}
                      onChange={(e) => setD70M(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px]">Uniformity Cu</label>
                    <input
                      type="number"
                      step="0.1"
                      value={cu}
                      onChange={(e) => setCu(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px]">Permeability K (m/s)</label>
                    <input
                      type="number"
                      step="1e-6"
                      value={hydraulicConductivityMs}
                      onChange={(e) => setHydraulicConductivityMs(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block text-[11px]">Friction Angle φ (°)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="20"
                      max="48"
                      value={frictionAngleDeg}
                      onChange={(e) => setFrictionAngleDeg(Number(e.target.value))}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PIPING PROGRESSION CHANNEL */}
          {activeTab === 'progression' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Progression Control Card */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
                  <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <TrendingUp className="w-4 h-4" />
                    <span>Pipe Channel Progression Inversion</span>
                  </h3>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Penetration Length l_pipe:</span>
                      <span className="font-mono text-amber-400 font-bold">{pipeProgressionM.toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={baseLength}
                      step="1"
                      value={pipeProgressionM}
                      onChange={(e) => setPipeProgressionM(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Progression Ratio (l / L):</span>
                      <span className={`font-mono font-bold ${
                        (pipeProgressionM / baseLength) >= 0.8 ? 'text-rose-400' :
                        (pipeProgressionM / baseLength) >= 0.5 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {((pipeProgressionM / baseLength) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Critical Head ΔH_c:</span>
                      <span className="font-mono font-bold text-white">
                        {livePreview.sellmeijer.critical_differential_head_m.toFixed(2)} m
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Breakthrough Risk:</span>
                      <span className={`font-mono font-bold ${
                        livePreview.sellmeijer.breakthrough_risk ? 'text-rose-400' : 'text-emerald-400'
                      }`}>
                        {livePreview.sellmeijer.breakthrough_risk ? 'CATASTROPHIC' : 'ARRESTED'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                    <p className="font-semibold text-white">Sellmeijer (2006) Three-Phase Law:</p>
                    <p>• <strong>Phase 1:</strong> Particle detachment at exit toe when i_exit exceeds incipient threshold.</p>
                    <p>• <strong>Phase 2:</strong> Stable pipe growth until length reaches ~50% of foundation length.</p>
                    <p>• <strong>Phase 3:</strong> Unstable acceleration to catastrophic breakthrough at l_pipe/L &gt; 80%.</p>
                  </div>
                </div>

                {/* Progression Chart */}
                <div className="md:col-span-2 p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-slate-200">
                      Sellmeijer Equilibrium Resistance vs Pipe Length
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      Intersection indicates critical runaway threshold
                    </span>
                  </div>
                  <div className="flex-1 min-h-[260px]">
                    <Line
                      data={progressionChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { labels: { color: '#94a3b8', font: { size: 10 } } },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} m`
                            }
                          }
                        },
                        scales: {
                          x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 10 } } },
                          y: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 10 } } }
                        }
                      }}
                    />
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: 2D SEEPAGE FLOWNET */}
          {activeTab === 'flownet' && (
            <div className="space-y-6">
              
              {simulation?.flownet_seepage ? (
                <div className="space-y-4">
                  {/* Flownet Telemetry Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[11px]">Shape Factor (Nf / Nd):</span>
                      <span className="text-base font-bold font-mono text-cyan-400">
                        {simulation.flownet_seepage.shape_factor?.toFixed(3) || (flowChannelsNf / potentialDropsNd).toFixed(3)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">Nf={flowChannelsNf}, Nd={potentialDropsNd}</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[11px]">Unit Seepage Rate q:</span>
                      <span className="text-base font-bold font-mono text-emerald-400">
                        {(simulation.flownet_seepage.seepage_flow_rate_m3_s_m * 1000).toFixed(3)} L/s/m
                      </span>
                      <span className="text-[10px] text-slate-500 block">Darcy flow per linear meter</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[11px]">Max Toe Exit Gradient:</span>
                      <span className={`text-base font-bold font-mono ${
                        simulation.flownet_seepage.max_exit_gradient >= livePreview.terzaghi.critical_gradient
                          ? 'text-rose-400'
                          : 'text-amber-400'
                      }`}>
                        {simulation.flownet_seepage.max_exit_gradient.toFixed(3)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">At downstream exit filter</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                      <span className="text-slate-400 block text-[11px]">Min Piping Factor of Safety:</span>
                      <span className={`text-base font-bold font-mono ${
                        simulation.flownet_seepage.min_factor_of_safety < 1.0 ? 'text-rose-400' :
                        simulation.flownet_seepage.min_factor_of_safety < 1.5 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {simulation.flownet_seepage.min_factor_of_safety.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 block">FS = i_crit / i_exit</span>
                    </div>
                  </div>

                  {/* 2D Flownet Canvas Chart */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                          <Waves className="w-4 h-4 text-cyan-400" />
                          <span>2D Equipotential Contours (Φ) & Streamlines (Ψ)</span>
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Orthogonal mesh solving Laplace equation ∇²Φ = 0 across saturated foundation aquifer
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs">
                        <span className="flex items-center space-x-1 text-cyan-400">
                          <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
                          <span>Streamlines</span>
                        </span>
                        <span className="flex items-center space-x-1 text-amber-400">
                          <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
                          <span>Equipotentials</span>
                        </span>
                      </div>
                    </div>

                    <div className="h-[320px] w-full">
                      {flownetChartData && (
                        <Line
                          data={flownetChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { display: false }
                            },
                            scales: {
                              x: {
                                type: 'linear',
                                min: 0,
                                max: baseLength,
                                title: { display: true, text: 'Distance along Foundation x (m)', color: '#94a3b8' },
                                grid: { color: '#1e293b' },
                                ticks: { color: '#64748b' }
                              },
                              y: {
                                type: 'linear',
                                min: -aquiferDepth,
                                max: 2,
                                title: { display: true, text: 'Aquifer Depth z (m)', color: '#94a3b8' },
                                grid: { color: '#1e293b' },
                                ticks: { color: '#64748b' }
                              }
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl space-y-3">
                  <Waves className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400">
                    No 2D Flownet simulation active. Click <strong>"Run Analysis & Invert Flownet"</strong> below to solve the Laplace seepage grid.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: EXIT GRADIENT & HEAVE STATIONS */}
          {activeTab === 'exit_gradient' && (
            <div className="space-y-6">
              
              {simulation?.flownet_seepage?.exit_stations ? (
                <div className="space-y-6">
                  
                  {/* Exit Gradient Distribution Chart */}
                  <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-white flex items-center space-x-1.5">
                        <BarChart3 className="w-4 h-4 text-rose-400" />
                        <span>Downstream Toe Exit Gradient Distribution vs Terzaghi Heave Limit</span>
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Boiling occurs when i_exit ≥ i_crit ({livePreview.terzaghi.critical_gradient.toFixed(3)})
                      </span>
                    </div>

                    <div className="h-[280px]">
                      {exitGradientChartData && (
                        <Bar
                          data={exitGradientChartData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: { labels: { color: '#94a3b8', font: { size: 10 } } }
                            },
                            scales: {
                              x: { grid: { color: '#1e293b' }, ticks: { color: '#64748b', font: { size: 10 } } },
                              y: {
                                position: 'left',
                                title: { display: true, text: 'Gradient i (m/m)', color: '#94a3b8' },
                                grid: { color: '#1e293b' },
                                ticks: { color: '#64748b' }
                              },
                              y1: {
                                position: 'right',
                                title: { display: true, text: 'Factor of Safety FS', color: '#94a3b8' },
                                grid: { drawOnChartArea: false },
                                ticks: { color: '#64748b' }
                              }
                            }
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Stations Table */}
                  <div className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
                    <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
                      <span className="text-xs font-bold text-white">Downstream Foundation Toe Monitoring Stations</span>
                      <span className="text-[11px] text-slate-400">
                        {simulation.flownet_seepage.exit_stations.length} Active Piezometer / Toe Cross-Sections
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                          <tr>
                            <th className="py-2.5 px-3">Station ID</th>
                            <th className="py-2.5 px-3">Offset (m)</th>
                            <th className="py-2.5 px-3">Total Head Φ (m)</th>
                            <th className="py-2.5 px-3">Exit Gradient i_exit</th>
                            <th className="py-2.5 px-3">Factor of Safety</th>
                            <th className="py-2.5 px-3">Sand Boiling Risk</th>
                            <th className="py-2.5 px-3">Hazard Tier</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 font-mono">
                          {simulation.flownet_seepage.exit_stations.map((st) => (
                            <tr key={st.station_id} className="hover:bg-slate-800/30">
                              <td className="py-2 px-3 font-bold text-white">{st.station_id}</td>
                              <td className="py-2 px-3 text-slate-300">+{st.x_offset_m.toFixed(1)}m</td>
                              <td className="py-2 px-3 text-cyan-400">{st.total_head_m.toFixed(2)}m</td>
                              <td className="py-2 px-3 text-amber-400 font-bold">{st.exit_gradient.toFixed(3)}</td>
                              <td className="py-2 px-3">
                                <span className={
                                  st.factor_of_safety < 1.0 ? 'text-rose-400 font-bold' :
                                  st.factor_of_safety < 1.5 ? 'text-amber-400' : 'text-emerald-400'
                                }>
                                  {st.factor_of_safety.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                {st.sand_boiling_risk ? (
                                  <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-bold">
                                    HEAVE / BOIL
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">Normal</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                <span className="capitalize text-[11px] text-slate-300">
                                  {st.hazard_tier.replace('_', ' ')}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl space-y-3">
                  <BarChart3 className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm text-slate-400">
                    Run simulation to compute downstream exit gradient distributions.
                  </p>
                </div>
              )}

            </div>
          )}

          {/* TAB 5: DYNAMIC PIEZOMETRIC TILELAYER */}
          {activeTab === 'tiles' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Metric Selector Card */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                    <Layers className="w-4 h-4" />
                    <span>Dynamic Flownet Raster Metrics</span>
                  </h3>

                  <div className="space-y-2">
                    {Object.entries(FLOWNET_TILE_METRICS).map(([k, m]) => (
                      <button
                        key={k}
                        onClick={() => setSelectedMetric(k)}
                        className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                          selectedMetric === k
                            ? 'border-amber-400 bg-amber-500/10 text-white font-bold'
                            : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div>
                          <div>{m.label}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{m.description}</div>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 ml-2">
                          {m.colormap}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity & Tile URL Card */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                      <Eye className="w-4 h-4" />
                      <span>Tile Layer Opacity & Template</span>
                    </h3>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-400">Layer Opacity:</span>
                        <span className="font-mono text-cyan-400 font-bold">{Math.round(tileOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={tileOpacity}
                        onChange={(e) => setTileOpacity(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    {simulation && (
                      <div className="space-y-2">
                        <label className="text-xs text-slate-400 block">XYZ Dynamic Tile URL Template:</label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            readOnly
                            value={getFlownetTileUrlTemplate(simulation.simulation_id, selectedMetric)}
                            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 select-all"
                          />
                          <button
                            onClick={handleCopyTileUrl}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-semibold text-white flex items-center space-x-1"
                            title="Copy URL Template"
                          >
                            {copiedTileUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedTileUrl ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <p className="text-xs text-slate-300">
                      Mount this dynamic layer directly into <strong>MapExplorer</strong> to stream real-time sub-50ms raster tiles of total piezometric head, exit gradient heaving, and stream functions.
                    </p>
                    <button
                      onClick={handleApplyToMap}
                      disabled={!simulation}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Apply Flownet TileLayer to Map</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Modal Footer / Simulation Trigger & Historical Lookup */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
          
          {/* Historical Simulation ID Lookup */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Lookup Simulation ID (e.g. SIM_FLOWNET_001)..."
              value={simLookupId}
              onChange={(e) => setSimLookupId(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 w-64 focus:outline-none focus:border-amber-400"
            />
            <button
              onClick={handleFetchHistorical}
              disabled={isFetchingHistory || !simLookupId.trim()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center space-x-1"
            >
              {isFetchingHistory ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
              <span>Load</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {simError && (
              <span className="text-xs text-rose-400 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{simError}</span>
              </span>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors"
            >
              Close
            </button>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {isSimulating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Inverting Laplace Seepage Grid...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Run Analysis & Invert Flownet</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default InternalErosionModal;
