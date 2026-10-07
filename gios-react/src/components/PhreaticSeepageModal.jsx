import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Droplets, Droplet, Sliders, Activity, Gauge, Database,
  Copy, Check, ShieldCheck, AlertTriangle, RefreshCw, Layers,
  FileDown, Plus, Trash2, CheckCircle2, ChevronRight, Compass
} from 'lucide-react';
import { 
  simulatePhreaticSeepage,
  calculateSwrcInversion
} from '../api/giosApi';
import { 
  SOIL_TEXTURE_CONFIGS,
  SEEPAGE_HAZARD_TIER_CONFIGS,
  PIEZOMETER_ANOMALY_CONFIGS,
  calculateVanGenuchtenSwrc,
  calculateSwrcInversionCurve,
  classifySeepageHazardTier,
  classifyPiezometerAnomaly,
  calculatePhreaticSurfaceSeepage,
  buildPhreaticSeepageTileUrlTemplate
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Benchmark Pre-Configured Embankment Seepage Scenarios
const PRESET_SCENARIOS = {
  north_tailings_standard: {
    id: 'north_tailings_standard',
    name: 'North Tailings Impoundment Main Dam (Facility A)',
    dam_id: 'TAILINGS_DAM_A',
    dam_name: 'North Tailings Impoundment Main Embankment',
    dam_coordinates: [-44.1234, -20.1234],
    crest_elevation_m: 820.0,
    base_elevation_m: 750.0,
    crest_width_m: 12.0,
    upstream_slope_h_v: 2.5,
    downstream_slope_h_v: 2.0,
    reservoir_pool_elevation_m: 812.0,
    tailwater_elevation_m: 752.0,
    soil_texture: 'silt_tailings',
    ksat_m_s: 1.2e-6,
    transect_stations_count: 50
  },
  san_luis_zoned: {
    id: 'san_luis_zoned',
    name: 'San Luis Forebay Zoned Embankment (California)',
    dam_id: 'DAM_SAN_LUIS_UP',
    dam_name: 'San Luis Forebay Upstream Embankment',
    dam_coordinates: [-120.9300, 36.9800],
    crest_elevation_m: 142.0,
    base_elevation_m: 100.0,
    crest_width_m: 10.0,
    upstream_slope_h_v: 3.0,
    downstream_slope_h_v: 2.5,
    reservoir_pool_elevation_m: 138.0,
    tailwater_elevation_m: 104.0,
    soil_texture: 'clay_core',
    ksat_m_s: 5.0e-9,
    transect_stations_count: 50
  },
  cadia_downstream_shell: {
    id: 'cadia_downstream_shell',
    name: 'Cadia Downstream Shell Analog (Gold/Copper Tailings)',
    dam_id: 'DAM_CADIA_01',
    dam_name: 'Cadia Northern Embankment Shell',
    dam_coordinates: [148.9800, -33.4500],
    crest_elevation_m: 680.0,
    base_elevation_m: 610.0,
    crest_width_m: 15.0,
    upstream_slope_h_v: 2.2,
    downstream_slope_h_v: 1.9,
    reservoir_pool_elevation_m: 672.0,
    tailwater_elevation_m: 613.0,
    soil_texture: 'sandy_shell',
    ksat_m_s: 4.5e-5,
    transect_stations_count: 50
  }
};

export default function PhreaticSeepageModal({
  isOpen,
  onClose,
  onApplySimulation = null,
  activeSimulation = null
}) {
  // Navigation tabs: 'seepage_studio' | 'swrc_analyzer' | 'piezometers' | 'stations' | 'tile_contract'
  const [activeTab, setActiveTab] = useState('seepage_studio');

  // Selected Preset
  const [selectedPresetKey, setSelectedPresetKey] = useState('north_tailings_standard');

  // Embankment & Hydraulic Inputs
  const [damId, setDamId] = useState('TAILINGS_DAM_A');
  const [damName, setDamName] = useState('North Tailings Impoundment Main Embankment');
  const [damCoords, setDamCoords] = useState([-44.1234, -20.1234]);
  const [crestElevationM, setCrestElevationM] = useState(820.0);
  const [baseElevationM, setBaseElevationM] = useState(750.0);
  const [crestWidthM, setCrestWidthM] = useState(12.0);
  const [upstreamSlopeHV, setUpstreamSlopeHV] = useState(2.5);
  const [downstreamSlopeHV, setDownstreamSlopeHV] = useState(2.0);
  const [reservoirPoolElevationM, setReservoirPoolElevationM] = useState(812.0);
  const [tailwaterElevationM, setTailwaterElevationM] = useState(752.0);
  const [soilTexture, setSoilTexture] = useState('silt_tailings');
  const [ksatMS, setKsatMS] = useState(1.2e-6);
  const [transectStationsCount, setTransectStationsCount] = useState(50);

  // In-situ piezometers editable array
  const [piezometers, setPiezometers] = useState([
    {
      piezometer_id: 'PZ_CREST_01',
      name: 'Crest Central Vibrating Wire',
      piezometer_type: 'vibrating_wire',
      station_x_m: 181.0,
      tip_elevation_m: 765.0,
      pore_water_pressure_kpa: 334.0
    },
    {
      piezometer_id: 'PZ_DOWNSTREAM_02',
      name: 'Downstream Intermediate Shell Piezometer',
      piezometer_type: 'vibrating_wire',
      station_x_m: 243.0,
      tip_elevation_m: 758.0,
      pore_water_pressure_kpa: 230.0
    },
    {
      piezometer_id: 'PZ_TOE_DRAIN_03',
      name: 'Toe Drainage Blanket Verification Well',
      piezometer_type: 'standpipe_casagrande',
      station_x_m: 302.0,
      tip_elevation_m: 752.0,
      pore_water_pressure_kpa: 2.0
    }
  ]);

  // SWRC Interactive State
  const [swrcSoilTexture, setSwrcSoilTexture] = useState('silt_tailings');
  const [swrcThetaS, setSwrcThetaS] = useState(0.42);
  const [swrcThetaR, setSwrcThetaR] = useState(0.06);
  const [swrcAlpha, setSwrcAlpha] = useState(0.015);
  const [swrcN, setSwrcN] = useState(1.80);
  const [swrcKsat, setSwrcKsat] = useState(1.2e-6);
  const [testSuctionKpa, setTestSuctionKpa] = useState(15.0);
  const [swrcResult, setSwrcResult] = useState(null);

  // Seepage Simulation Result State
  const [simulationResult, setSimulationResult] = useState(activeSimulation || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [tilePreviewMetric, setTilePreviewMetric] = useState('saturation');

  // Handle preset switching
  const handleSelectPreset = (key) => {
    const p = PRESET_SCENARIOS[key];
    if (!p) return;
    setSelectedPresetKey(key);
    setDamId(p.dam_id);
    setDamName(p.dam_name);
    setDamCoords(p.dam_coordinates);
    setCrestElevationM(p.crest_elevation_m);
    setBaseElevationM(p.base_elevation_m);
    setCrestWidthM(p.crest_width_m);
    setUpstreamSlopeHV(p.upstream_slope_h_v);
    setDownstreamSlopeHV(p.downstream_slope_h_v);
    setReservoirPoolElevationM(p.reservoir_pool_elevation_m);
    setTailwaterElevationM(p.tailwater_elevation_m);
    setSoilTexture(p.soil_texture);
    setKsatMS(p.ksat_m_s);
    setTransectStationsCount(p.transect_stations_count);

    // Sync SWRC parameters from texture config
    const meta = SOIL_TEXTURE_CONFIGS[p.soil_texture];
    if (meta) {
      setSwrcSoilTexture(p.soil_texture);
      setSwrcThetaS(meta.theta_s);
      setSwrcThetaR(meta.theta_r);
      setSwrcAlpha(meta.alpha_1_kpa);
      setSwrcN(meta.n_param);
      setSwrcKsat(meta.ksat_m_s);
    }
  };

  // Synchronize activeSimulation prop
  useEffect(() => {
    if (activeSimulation) {
      setSimulationResult(activeSimulation);
    }
  }, [activeSimulation]);

  // Initial calculation on mount / open if null
  useEffect(() => {
    if (isOpen && !simulationResult) {
      const initial = calculatePhreaticSurfaceSeepage({
        dam_id: damId,
        dam_name: damName,
        embankment: {
          crest_elevation_m: crestElevationM,
          base_elevation_m: baseElevationM,
          crest_width_m: crestWidthM,
          upstream_slope_h_v: upstreamSlopeHV,
          downstream_slope_h_v: downstreamSlopeHV
        },
        reservoir_pool_elevation_m: reservoirPoolElevationM,
        tailwater_elevation_m: tailwaterElevationM,
        soil_params: {
          soil_texture: soilTexture,
          ksat_m_s: ksatMS
        },
        transect_stations_count: transectStationsCount,
        piezometers: piezometers
      });
      setSimulationResult(initial);
    }
  }, [isOpen, simulationResult, damId, damName, crestElevationM, baseElevationM, crestWidthM, upstreamSlopeHV, downstreamSlopeHV, reservoirPoolElevationM, tailwaterElevationM, soilTexture, ksatMS, transectStationsCount, piezometers]);

  // Re-compute SWRC curve on parameters change
  useEffect(() => {
    const swrc = calculateSwrcInversionCurve({
      soil_texture: swrcSoilTexture,
      van_genuchten: {
        theta_s: Number(swrcThetaS),
        theta_r: Number(swrcThetaR),
        alpha_1_kpa: Number(swrcAlpha),
        n_param: Number(swrcN),
        ksat_m_s: Number(swrcKsat)
      }
    });
    setSwrcResult(swrc);
  }, [swrcSoilTexture, swrcThetaS, swrcThetaR, swrcAlpha, swrcN, swrcKsat]);

  // Texture change handler for SWRC tab
  const handleSwrcTextureChange = (tex) => {
    setSwrcSoilTexture(tex);
    const meta = SOIL_TEXTURE_CONFIGS[tex];
    if (meta) {
      setSwrcThetaS(meta.theta_s);
      setSwrcThetaR(meta.theta_r);
      setSwrcAlpha(meta.alpha_1_kpa);
      setSwrcN(meta.n_param);
      setSwrcKsat(meta.ksat_m_s);
    }
  };

  // Run full simulation
  const handleRunSimulation = async () => {
    setIsProcessing(true);
    const payload = {
      simulation_id: `SIM_SEEPAGE_${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`,
      dam_id: damId,
      dam_name: damName,
      embankment: {
        crest_elevation_m: Number(crestElevationM),
        base_elevation_m: Number(baseElevationM),
        crest_width_m: Number(crestWidthM),
        upstream_slope_h_v: Number(upstreamSlopeHV),
        downstream_slope_h_v: Number(downstreamSlopeHV)
      },
      reservoir_pool_elevation_m: Number(reservoirPoolElevationM),
      tailwater_elevation_m: Number(tailwaterElevationM),
      soil_params: {
        soil_texture: soilTexture,
        ksat_m_s: Number(ksatMS)
      },
      transect_stations_count: Number(transectStationsCount),
      piezometers: piezometers
    };

    try {
      const res = await simulatePhreaticSeepage(payload);
      const data = res?.data || res || calculatePhreaticSurfaceSeepage(payload);
      if (data?.factor_of_safety_piping != null && data?.exit_gradient_max != null) {
        data.hazard_tier_classified = classifySeepageHazardTier(data.factor_of_safety_piping, data.exit_gradient_max);
      }
      setSimulationResult(data);
    } catch {
      // Offline fallback
      const fallback = calculatePhreaticSurfaceSeepage(payload);
      fallback.hazard_tier_classified = classifySeepageHazardTier(fallback.factor_of_safety_piping, fallback.exit_gradient_max);
      setSimulationResult(fallback);
    } finally {
      setIsProcessing(false);
    }
  };

  // Server SWRC Inversion call
  const handleRunSwrcServerInversion = async () => {
    try {
      const res = await calculateSwrcInversion({
        soil_texture: swrcSoilTexture,
        van_genuchten: {
          theta_s: Number(swrcThetaS),
          theta_r: Number(swrcThetaR),
          alpha_1_kpa: Number(swrcAlpha),
          n_param: Number(swrcN),
          ksat_m_s: Number(swrcKsat)
        }
      });
      if (res?.curve_points) {
        setSwrcResult(res);
      }
    } catch {
      // Keep local calculation
    }
  };

  // Add / remove piezometers
  const handleAddPiezometer = (newPz) => {
    setPiezometers((prev) => {
      const updated = [...prev, newPz];
      return updated;
    });
  };

  const handleRemovePiezometer = (pzId) => {
    setPiezometers((prev) => prev.filter((p) => p.piezometer_id !== pzId));
  };

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Computed geometry helpers
  const damHeightM = Math.max(1.0, crestElevationM - baseElevationM);
  const upLengthM = upstreamSlopeHV * damHeightM;
  const downLengthM = downstreamSlopeHV * damHeightM;
  const totalBaseLengthM = upLengthM + crestWidthM + downLengthM;

  // Single suction point calculation
  const testPointRetention = useMemo(() => {
    return calculateVanGenuchtenSwrc(testSuctionKpa, {
      theta_s: swrcThetaS,
      theta_r: swrcThetaR,
      alpha_1_kpa: swrcAlpha,
      n_param: swrcN,
      ksat_m_s: swrcKsat
    });
  }, [testSuctionKpa, swrcThetaS, swrcThetaR, swrcAlpha, swrcN, swrcKsat]);

  // Cross-Section Profile Chart Data
  const crossSectionChartData = useMemo(() => {
    if (!simulationResult) return null;

    // Embankment ground boundary points
    const groundProfile = [
      { x: 0, y: baseElevationM },
      { x: upLengthM, y: crestElevationM },
      { x: upLengthM + crestWidthM, y: crestElevationM },
      { x: totalBaseLengthM, y: baseElevationM }
    ];

    // Phreatic line points
    const phreaticLine = (simulationResult.phreatic_stations || []).map((st) => ({
      x: st.station_x_m,
      y: st.phreatic_elevation_m
    }));

    // Upstream reservoir pool line
    const xEntry = (Math.max(1.0, reservoirPoolElevationM - baseElevationM) / damHeightM) * upLengthM;
    const poolLine = [
      { x: 0, y: reservoirPoolElevationM },
      { x: Math.min(xEntry, upLengthM), y: reservoirPoolElevationM }
    ];

    // Piezometer measured head points
    const piezometersMeas = (simulationResult.piezometer_fusion || []).map((p) => ({
      x: p.station_x_m,
      y: p.measured_head_m
    }));

    // Piezometer tip points
    const piezometerTips = (simulationResult.piezometer_fusion || []).map((p) => ({
      x: p.station_x_m,
      y: p.tip_elevation_m
    }));

    return {
      datasets: [
        {
          label: 'Embankment Shell Geometry',
          data: groundProfile,
          borderColor: '#94a3b8',
          borderWidth: 2.5,
          backgroundColor: 'rgba(51, 65, 85, 0.4)',
          fill: true,
          tension: 0,
          pointRadius: 4,
          pointBackgroundColor: '#e2e8f0'
        },
        {
          label: 'Phreatic Water Table (Dupuit-Casagrande)',
          data: phreaticLine,
          borderColor: '#06b6d4',
          borderWidth: 3,
          backgroundColor: 'rgba(6, 182, 212, 0.25)',
          fill: true,
          tension: 0.1,
          pointRadius: 2,
          pointBackgroundColor: '#06b6d4'
        },
        {
          label: 'Reservoir Pool Water Level',
          data: poolLine,
          borderColor: '#3b82f6',
          borderWidth: 2,
          borderDash: [5, 5],
          backgroundColor: 'transparent',
          pointRadius: 3,
          pointBackgroundColor: '#3b82f6'
        },
        {
          label: 'In-Situ Piezometer Head (h_meas)',
          data: piezometersMeas,
          borderColor: '#f59e0b',
          backgroundColor: '#f59e0b',
          pointRadius: 7,
          pointHoverRadius: 9,
          showLine: false
        },
        {
          label: 'Piezometer Filter Tip (z_tip)',
          data: piezometerTips,
          borderColor: '#ef4444',
          backgroundColor: '#ef4444',
          pointRadius: 5,
          pointStyle: 'triangle',
          showLine: false
        }
      ]
    };
  }, [simulationResult, baseElevationM, crestElevationM, upLengthM, crestWidthM, totalBaseLengthM, reservoirPoolElevationM, damHeightM]);

  // SWRC Retention Curve Chart Data
  const swrcChartData = useMemo(() => {
    if (!swrcResult?.curve_points) return null;
    const labels = swrcResult.curve_points.map((p) => `${p.matric_suction_kpa} kPa`);
    const thetaData = swrcResult.curve_points.map((p) => p.volumetric_water_content);
    const seData = swrcResult.curve_points.map((p) => p.effective_saturation);

    return {
      labels,
      datasets: [
        {
          label: 'Volumetric Water Content θ(ψ) [m³/m³]',
          data: thetaData,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.2)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y'
        },
        {
          label: 'Effective Saturation Se(ψ)',
          data: seData,
          borderColor: '#10b981',
          backgroundColor: 'transparent',
          borderDash: [4, 4],
          borderWidth: 2,
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    };
  }, [swrcResult]);

  // Relative Conductivity Chart Data
  const krChartData = useMemo(() => {
    if (!swrcResult?.curve_points) return null;
    const labels = swrcResult.curve_points.map((p) => `${p.matric_suction_kpa} kPa`);
    const krData = swrcResult.curve_points.map((p) => p.relative_conductivity);

    return {
      labels,
      datasets: [
        {
          label: 'Mualem Relative Conductivity kr(ψ)',
          data: krData,
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          fill: true,
          tension: 0.3
        }
      ]
    };
  }, [swrcResult]);

  // Piezometer Head Residuals Bar Chart Data
  const piezoResidualChartData = useMemo(() => {
    if (!simulationResult?.piezometer_fusion) return null;
    const labels = simulationResult.piezometer_fusion.map((p) => p.piezometer_id);
    const residuals = simulationResult.piezometer_fusion.map((p) => p.residual_head_m);
    const bgColors = simulationResult.piezometer_fusion.map((p) => {
      const cfg = PIEZOMETER_ANOMALY_CONFIGS[p.anomaly_status] || PIEZOMETER_ANOMALY_CONFIGS.normal_convergence;
      return cfg.color;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Head Residual Δh = h_meas - h_sim (m)',
          data: residuals,
          backgroundColor: bgColors,
          borderWidth: 1,
          borderColor: '#1e293b'
        }
      ]
    };
  }, [simulationResult]);

  if (!isOpen) return null;

  const currentHazardTier = simulationResult?.hazard_tier 
    ? SEEPAGE_HAZARD_TIER_CONFIGS[simulationResult.hazard_tier] 
    : SEEPAGE_HAZARD_TIER_CONFIGS.safe_stable;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[94vh] flex flex-col rounded-2xl bg-slate-950 border border-slate-800 shadow-[0_0_50px_rgba(6,182,212,0.15)] text-slate-100 overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Droplets className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Embankment Phreatic Surface Seepage Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-cyan-950 text-cyan-300 border border-cyan-600/50">
                  Cycle v2.5.12
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Dupuit-Casagrande Unconfined Seepage Inversion &bull; Van Genuchten SWRC &bull; In-Situ Piezometer Sensor Fusion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {simulationResult && (
              <button
                onClick={() => {
                  if (onApplySimulation) {
                    onApplySimulation(simulationResult, {
                      selectedMetric: tilePreviewMetric,
                      damCoordinates: damCoords
                    });
                  }
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                title="Send active phreatic seepage flow net to MapExplorer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Apply to Map</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800/80 bg-slate-900/30 font-mono text-xs overflow-x-auto">
          {[
            { id: 'seepage_studio', label: '1. 2D Seepage & Phreatic Line', icon: Droplet },
            { id: 'swrc_analyzer', label: '2. Van Genuchten SWRC Analyzer', icon: Activity },
            { id: 'piezometers', label: '3. Piezometer Sensor Fusion', icon: Gauge },
            { id: 'stations', label: '4. Transect Stations & Darcy Flux', icon: Database },
            { id: 'tile_contract', label: '5. Dynamic XYZ Tiles & Contracts', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-cyan-500 text-cyan-300 bg-cyan-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================================================================= */}
          {/* TAB 1: 2D SEEPAGE & PHREATIC LINE STUDIO                         */}
          {/* ================================================================= */}
          {activeTab === 'seepage_studio' && (
            <div className="space-y-6">
              {/* Presets and Controls Bar */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Presets Card */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      Facility Preset
                    </span>
                    <span className="text-[10px] text-slate-500">Benchmark Library</span>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(PRESET_SCENARIOS).map(([key, p]) => (
                      <button
                        key={key}
                        onClick={() => handleSelectPreset(key)}
                        className={`w-full text-left p-2.5 rounded-lg border text-xs font-mono transition-all ${
                          selectedPresetKey === key
                            ? 'bg-cyan-950/60 border-cyan-500/80 text-cyan-200'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <div className="font-bold text-white text-[11px] truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-500">
                          H: {p.crest_elevation_m - p.base_elevation_m}m &bull; Material: {SOIL_TEXTURE_CONFIGS[p.soil_texture]?.name || p.soil_texture}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Geometry Inputs Card */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-300">
                    <span>Embankment Geometry</span>
                    <span className="text-[10px] text-cyan-400">Dam Height H = {damHeightM.toFixed(1)} m</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="text-[10px] text-slate-400">Crest El. (m)</label>
                      <input
                        type="number"
                        step="1.0"
                        value={crestElevationM}
                        onChange={(e) => setCrestElevationM(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Base El. (m)</label>
                      <input
                        type="number"
                        step="1.0"
                        value={baseElevationM}
                        onChange={(e) => setBaseElevationM(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Crest Width (m)</label>
                      <input
                        type="number"
                        step="1.0"
                        value={crestWidthM}
                        onChange={(e) => setCrestWidthM(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Transect Nodes</label>
                      <input
                        type="number"
                        min="20"
                        max="100"
                        value={transectStationsCount}
                        onChange={(e) => setTransectStationsCount(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Up Slope (H:1V)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={upstreamSlopeHV}
                        onChange={(e) => setUpstreamSlopeHV(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Down Slope (H:1V)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={downstreamSlopeHV}
                        onChange={(e) => setDownstreamSlopeHV(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Hydraulic Boundaries & Soil Card */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-300">
                    <span>Hydraulics & Material</span>
                    <span className="text-[10px] text-cyan-400">h1: {(reservoirPoolElevationM - baseElevationM).toFixed(1)}m</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="text-[10px] text-slate-400">Pool El. (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={reservoirPoolElevationM}
                        onChange={(e) => setReservoirPoolElevationM(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Tailwater El. (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={tailwaterElevationM}
                        onChange={(e) => setTailwaterElevationM(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400">Embankment Soil Material</label>
                      <select
                        value={soilTexture}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSoilTexture(val);
                          const m = SOIL_TEXTURE_CONFIGS[val];
                          if (m) setKsatMS(m.ksat_m_s);
                        }}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none text-xs"
                      >
                        {Object.entries(SOIL_TEXTURE_CONFIGS).map(([k, c]) => (
                          <option key={k} value={k}>
                            {c.name} ({k})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-slate-400">Saturated Permeability Ksat (m/s)</label>
                      <input
                        type="text"
                        value={ksatMS}
                        onChange={(e) => setKsatMS(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleRunSimulation}
                    disabled={isProcessing}
                    className="w-full mt-2 py-2 flex items-center justify-center gap-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold transition-all shadow-md"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                    <span>{isProcessing ? 'Inverting Seepage Flow...' : 'Execute Dupuit Seepage Inversion'}</span>
                  </button>
                </div>
              </div>

              {/* KPI Performance Banner */}
              {simulationResult && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 rounded-xl bg-slate-900/40 border border-slate-800 font-mono text-xs">
                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase">Unit Discharge q</div>
                    <div className="text-sm font-bold text-cyan-300 mt-1">
                      {simulationResult.seepage_discharge_m3s_m} m³/s/m
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {(simulationResult.seepage_discharge_m3s_m * 86400 * 1000).toFixed(1)} L/day/m
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase">Max Exit Gradient</div>
                    <div className="text-sm font-bold text-amber-300 mt-1">
                      {simulationResult.exit_gradient_max}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Threshold &lt; 0.35 stable
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase">Piping Safety Factor</div>
                    <div className="text-sm font-bold text-emerald-300 mt-1">
                      FS = {simulationResult.factor_of_safety_piping}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Terzaghi Heave Criteria
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase">Seepage Hazard Tier</div>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded uppercase ${currentHazardTier.badge_class}`}>
                        {currentHazardTier.name}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                      {currentHazardTier.piping_risk}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 uppercase">Piezometer Network</div>
                    <div className="text-sm font-bold text-white mt-1">
                      {simulationResult.piezometer_fusion?.length || 0} Instruments
                    </div>
                    <div className="text-[10px] text-cyan-400 mt-0.5">
                      Residuals Calibrated
                    </div>
                  </div>
                </div>
              )}

              {/* Cross-Section Graphical Profile Chart */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between font-mono text-xs">
                  <div className="flex items-center gap-2">
                    <Droplet className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-white">
                      Embankment Cross-Section Phreatic Surface Profile (Elevation vs Station)
                    </span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Total Footprint Length: {totalBaseLengthM.toFixed(1)} m
                  </span>
                </div>

                <div className="h-[320px] w-full bg-slate-950/80 rounded-lg p-2 border border-slate-800">
                  {crossSectionChartData ? (
                    <Line
                      data={crossSectionChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 300 },
                        scales: {
                          x: {
                            type: 'linear',
                            title: {
                              display: true,
                              text: 'Station Distance Across Dam Base x (m)',
                              color: '#94a3b8',
                              font: { family: 'monospace', size: 11 }
                            },
                            grid: { color: 'rgba(51, 65, 85, 0.4)' },
                            ticks: { color: '#94a3b8', font: { family: 'monospace' } }
                          },
                          y: {
                            title: {
                              display: true,
                              text: 'Elevation Z (m)',
                              color: '#94a3b8',
                              font: { family: 'monospace', size: 11 }
                            },
                            grid: { color: 'rgba(51, 65, 85, 0.4)' },
                            ticks: { color: '#94a3b8', font: { family: 'monospace' } }
                          }
                        },
                        plugins: {
                          legend: {
                            labels: { color: '#cbd5e1', font: { family: 'monospace', size: 10 } }
                          },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: x=${ctx.parsed.x.toFixed(1)}m, Z=${ctx.parsed.y.toFixed(2)}m`
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500 font-mono text-xs">
                      Simulate seepage to view cross-section geometry and phreatic line.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 2: VAN GENUCHTEN SWRC ANALYZER                              */}
          {/* ================================================================= */}
          {activeTab === 'swrc_analyzer' && (
            <div className="space-y-6">
              {/* SWRC Parameter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Soil Texture Selection */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="font-bold text-slate-200">Soil Water Retention Parameters</div>
                  <div>
                    <label className="text-[10px] text-slate-400">Material Texture Class</label>
                    <select
                      value={swrcSoilTexture}
                      onChange={(e) => handleSwrcTextureChange(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                    >
                      {Object.entries(SOIL_TEXTURE_CONFIGS).map(([k, c]) => (
                        <option key={k} value={k}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
                    {SOIL_TEXTURE_CONFIGS[swrcSoilTexture]?.description}
                  </div>

                  <div className="space-y-2 pt-1">
                    <div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Saturated Moisture θs</span>
                        <span className="text-cyan-400 font-bold">{swrcThetaS}</span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="0.60"
                        step="0.01"
                        value={swrcThetaS}
                        onChange={(e) => setSwrcThetaS(Number(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Residual Moisture θr</span>
                        <span className="text-cyan-400 font-bold">{swrcThetaR}</span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="0.20"
                        step="0.01"
                        value={swrcThetaR}
                        onChange={(e) => setSwrcThetaR(Number(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* van Genuchten alpha & n */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="font-bold text-slate-200">Capillary & Pore Geometry</div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Scaling Parameter α (1/kPa)</span>
                        <span className="text-cyan-400 font-bold">{swrcAlpha}</span>
                      </div>
                      <input
                        type="range"
                        min="0.001"
                        max="0.100"
                        step="0.001"
                        value={swrcAlpha}
                        onChange={(e) => setSwrcAlpha(Number(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded"
                      />
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Air-Entry Suction: {(1.0 / Math.max(0.001, swrcAlpha)).toFixed(1)} kPa
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Pore Size Index n</span>
                        <span className="text-cyan-400 font-bold">{swrcN}</span>
                      </div>
                      <input
                        type="range"
                        min="1.10"
                        max="4.00"
                        step="0.05"
                        value={swrcN}
                        onChange={(e) => setSwrcN(Number(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded"
                      />
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Mualem exponent m = {(1.0 - 1.0 / swrcN).toFixed(3)}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400">Ksat (m/s)</label>
                      <input
                        type="text"
                        value={swrcKsat}
                        onChange={(e) => setSwrcKsat(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Instantaneous Suction Probe Calculator */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs">
                  <div className="font-bold text-slate-200">Interactive Suction Inversion Probe</div>
                  <div>
                    <label className="text-[10px] text-slate-400">Matric Suction ψ (kPa)</label>
                    <input
                      type="number"
                      step="1.0"
                      min="0.0"
                      value={testSuctionKpa}
                      onChange={(e) => setTestSuctionKpa(Number(e.target.value))}
                      className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-950 border border-slate-800 text-white focus:border-cyan-500 outline-none"
                    />
                  </div>

                  <div className="space-y-1.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Effective Saturation Se:</span>
                      <strong className="text-emerald-400">{testPointRetention.effective_saturation}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Moisture Content θ:</span>
                      <strong className="text-cyan-400">{testPointRetention.volumetric_water_content} m³/m³</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Relative Permeability kr:</span>
                      <strong className="text-amber-400">{testPointRetention.relative_conductivity}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Unsat Conductivity K:</span>
                      <strong className="text-white">{testPointRetention.unsaturated_conductivity_m_s} m/s</strong>
                    </div>
                  </div>

                  <button
                    onClick={handleRunSwrcServerInversion}
                    className="w-full mt-2 py-1.5 flex items-center justify-center gap-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-[11px] transition-all"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Run Backend SWRC API Inversion</span>
                  </button>
                </div>
              </div>

              {/* Dual SWRC Curves (Retention and Relative Conductivity) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Retention Curve Plot */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="font-mono text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Soil Water Retention Curve θ(ψ)</span>
                    <span className="text-[10px] text-cyan-400 font-normal">Van Genuchten (1980)</span>
                  </div>
                  <div className="h-[260px] w-full bg-slate-950/80 rounded-lg p-2 border border-slate-800">
                    {swrcChartData ? (
                      <Line
                        data={swrcChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            x: {
                              ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } },
                              grid: { color: 'rgba(51, 65, 85, 0.3)' }
                            },
                            y: {
                              title: { display: true, text: 'θ (m³/m³)', color: '#06b6d4' },
                              ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } },
                              grid: { color: 'rgba(51, 65, 85, 0.3)' }
                            },
                            y1: {
                              position: 'right',
                              title: { display: true, text: 'Se (0-1)', color: '#10b981' },
                              ticks: { color: '#10b981', font: { family: 'monospace', size: 10 } },
                              grid: { drawOnChartArea: false }
                            }
                          },
                          plugins: {
                            legend: { labels: { color: '#cbd5e1', font: { family: 'monospace', size: 10 } } }
                          }
                        }}
                      />
                    ) : null}
                  </div>
                </div>

                {/* Relative Conductivity Plot */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="font-mono text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>Mualem Relative Conductivity kr(ψ)</span>
                    <span className="text-[10px] text-amber-400 font-normal">Mualem (1976)</span>
                  </div>
                  <div className="h-[260px] w-full bg-slate-950/80 rounded-lg p-2 border border-slate-800">
                    {krChartData ? (
                      <Line
                        data={krChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            x: {
                              ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } },
                              grid: { color: 'rgba(51, 65, 85, 0.3)' }
                            },
                            y: {
                              title: { display: true, text: 'kr (0-1)', color: '#f59e0b' },
                              ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } },
                              grid: { color: 'rgba(51, 65, 85, 0.3)' }
                            }
                          },
                          plugins: {
                            legend: { labels: { color: '#cbd5e1', font: { family: 'monospace', size: 10 } } }
                          }
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 3: PIEZOMETER SENSOR FUSION & MODEL CALIBRATION               */}
          {/* ================================================================= */}
          {activeTab === 'piezometers' && (
            <div className="space-y-6">
              {/* Instruments Overview Table */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    In-Situ Piezometer Sensor Network Calibration
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 font-normal">
                      Head Residual Δh = h_meas - h_sim
                    </span>
                    <button
                      onClick={() => {
                        const nextNum = piezometers.length + 1;
                        const newPz = {
                          piezometer_id: `PZ_BOREHOLE_0${nextNum}`,
                          name: `Embankment Verification Well #${nextNum}`,
                          piezometer_type: 'vibrating_wire',
                          station_x_m: Number((upLengthM + crestWidthM * 0.5 + nextNum * 15).toFixed(1)),
                          tip_elevation_m: Number((baseElevationM + 10.0).toFixed(1)),
                          pore_water_pressure_kpa: 120.0
                        };
                        const estHead = newPz.tip_elevation_m + (newPz.pore_water_pressure_kpa / 9.81);
                        newPz.anomaly_status = classifyPiezometerAnomaly(estHead - (baseElevationM + 25.0)).id;
                        handleAddPiezometer(newPz);
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[10px]"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Instrument</span>
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                        <th className="py-2 px-3">Instrument ID</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Station x (m)</th>
                        <th className="py-2 px-3">Tip El. (m)</th>
                        <th className="py-2 px-3">Pore Press. (kPa)</th>
                        <th className="py-2 px-3">h_meas (m)</th>
                        <th className="py-2 px-3">h_sim (m)</th>
                        <th className="py-2 px-3">Residual Δh</th>
                        <th className="py-2 px-3">Calibration Status</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {(simulationResult?.piezometer_fusion || []).map((pz) => {
                        const statusCfg = PIEZOMETER_ANOMALY_CONFIGS[pz.anomaly_status] || PIEZOMETER_ANOMALY_CONFIGS.normal_convergence;
                        return (
                          <tr key={pz.piezometer_id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-2 px-3 font-bold text-cyan-300">{pz.piezometer_id}</td>
                            <td className="py-2 px-3 text-slate-400 uppercase text-[10px]">{pz.piezometer_type}</td>
                            <td className="py-2 px-3 text-slate-300">{pz.station_x_m.toFixed(1)}</td>
                            <td className="py-2 px-3 text-slate-300">{pz.tip_elevation_m.toFixed(1)}</td>
                            <td className="py-2 px-3 text-slate-300">{pz.pore_water_pressure_kpa.toFixed(1)}</td>
                            <td className="py-2 px-3 font-bold text-amber-300">{pz.measured_head_m.toFixed(2)}</td>
                            <td className="py-2 px-3 text-slate-400">{pz.simulated_head_m.toFixed(2)}</td>
                            <td className="py-2 px-3 font-mono font-bold">
                              <span className={pz.residual_head_m > 1.5 ? 'text-red-400' : pz.residual_head_m > 0.5 ? 'text-amber-400' : 'text-emerald-400'}>
                                {pz.residual_head_m > 0 ? `+${pz.residual_head_m.toFixed(2)}` : pz.residual_head_m.toFixed(2)} m
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusCfg.badge_class}`}>
                                {statusCfg.name.split(' (')[0]}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => handleRemovePiezometer(pz.piezometer_id)}
                                className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                title="Remove Piezometer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Residual Bar Chart */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="font-mono text-xs font-bold text-slate-200">
                  Instrument Head Residual Discrepancies (Δh = h_meas - h_sim)
                </div>
                <div className="h-[220px] w-full bg-slate-950/80 rounded-lg p-2 border border-slate-800">
                  {piezoResidualChartData ? (
                    <Bar
                      data={piezoResidualChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: { ticks: { color: '#94a3b8', font: { family: 'monospace' } }, grid: { color: 'rgba(51, 65, 85, 0.3)' } },
                          y: {
                            title: { display: true, text: 'Residual Δh (m)', color: '#cbd5e1' },
                            ticks: { color: '#94a3b8', font: { family: 'monospace' } },
                            grid: { color: 'rgba(51, 65, 85, 0.3)' }
                          }
                        },
                        plugins: {
                          legend: { display: false }
                        }
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 4: TRANSECT STATIONS & DARCY FLUX                            */}
          {/* ================================================================= */}
          {activeTab === 'stations' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between">
                <div className="text-slate-300 font-bold flex items-center gap-2">
                  <Database className="w-4 h-4 text-cyan-400" />
                  <span>1D Transect Node Discrete Flow Net Data ({simulationResult?.phreatic_stations?.length || 0} Stations)</span>
                </div>
                <button
                  onClick={() => handleCopy(simulationResult?.phreatic_stations, 'stations_json')}
                  className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
                >
                  {copiedKey === 'stations_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'stations_json' ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>

              <div className="max-h-[460px] overflow-y-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="sticky top-0 bg-slate-900 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2 px-3">Node #</th>
                      <th className="py-2 px-3">Station x (m)</th>
                      <th className="py-2 px-3">Phreatic Z (m)</th>
                      <th className="py-2 px-3">Total Head (m)</th>
                      <th className="py-2 px-3">Pore Press. (kPa)</th>
                      <th className="py-2 px-3">Exit Grad. i</th>
                      <th className="py-2 px-3">Saturation Se</th>
                      <th className="py-2 px-3">Suction ψ (kPa)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {(simulationResult?.phreatic_stations || []).map((st, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/40">
                        <td className="py-1.5 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-bold text-white">{st.station_x_m.toFixed(1)}</td>
                        <td className="py-1.5 px-3 text-cyan-300 font-bold">{st.phreatic_elevation_m.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-slate-300">{st.total_head_m.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-amber-300">{st.pore_pressure_kpa.toFixed(1)}</td>
                        <td className="py-1.5 px-3 text-slate-400">{st.exit_gradient.toFixed(4)}</td>
                        <td className="py-1.5 px-3 text-emerald-300">{st.effective_saturation.toFixed(2)}</td>
                        <td className="py-1.5 px-3 text-slate-400">{st.matric_suction_kpa.toFixed(1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================= */}
          {/* TAB 5: DYNAMIC XYZ TILES & API CONTRACTS                          */}
          {/* ================================================================= */}
          {activeTab === 'tile_contract' && (
            <div className="space-y-6 font-mono text-xs">
              {/* Dynamic Tile Streaming Preview */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Dynamic Slippy Hydrogeological XYZ Tile Service
                  </span>
                  <div className="flex items-center gap-1.5">
                    {['saturation', 'pore_pressure', 'exit_gradient'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setTilePreviewMetric(m)}
                        className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-all ${
                          tilePreviewMetric === m
                            ? 'bg-cyan-600 text-white shadow'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] space-y-1">
                  <div className="text-slate-400">Endpoint Template:</div>
                  <div className="text-cyan-300 break-all select-all">
                    {buildPhreaticSeepageTileUrlTemplate(simulationResult?.simulation_id || 'SIM_SEEPAGE_ID', tilePreviewMetric)}
                  </div>
                </div>
              </div>

              {/* JSON Contract Inspector */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between font-bold text-slate-200">
                  <span>Pydantic & TypeScript Schema Contract Output</span>
                  <button
                    onClick={() => handleCopy(simulationResult, 'full_sim_json')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
                  >
                    {copiedKey === 'full_sim_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'full_sim_json' ? 'Copied' : 'Copy Response'}</span>
                  </button>
                </div>

                <pre className="max-h-[300px] overflow-y-auto p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-cyan-200/90 leading-relaxed">
                  {JSON.stringify(simulationResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 font-mono text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Simulation ID: {simulationResult?.simulation_id || 'Uninitialized'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
            >
              Close
            </button>
            {simulationResult && (
              <button
                onClick={() => {
                  if (onApplySimulation) {
                    onApplySimulation(simulationResult, {
                      selectedMetric: tilePreviewMetric,
                      damCoordinates: damCoords
                    });
                  }
                  onClose();
                }}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Apply to Map Explorer</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
