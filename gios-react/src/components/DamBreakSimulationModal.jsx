import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Waves, Play, Pause, SkipBack, SkipForward, RotateCcw, 
  AlertTriangle, Activity, Gauge, Database, Eye, Copy, Check,
  ShieldCheck, Sliders, Navigation, Users, Zap
} from 'lucide-react';
import { 
  simulateDamBreakHydrodynamics
} from '../api/giosApi';
import { 
  HAZARD_INTENSITY_TIER_CONFIGS,
  EVACUATION_URGENCY_TIER_CONFIGS,
  INFRASTRUCTURE_EXPOSURE_CONFIGS,
  BREACH_MECHANISM_CONFIGS,
  calculateDamBreachPeakDischarge,
  calculateDamBreakHydrodynamicSimulation,
  buildDamBreakTileUrlTemplate
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Benchmark Pre-Configured Scenarios
const PRESET_SCENARIOS = {
  brumadinho_benchmark: {
    name: 'Brumadinho Dam I Failure (Analog Benchmark)',
    dam_id: 'DAM_BRUMADINHO_01',
    dam_name: 'Córrego do Feijão Dam I (Tailings Impoundment)',
    dam_coordinates: [-44.1200, -20.1200],
    dam_height_m: 86.0,
    reservoir_volume_m3: 12700000.0,
    breach_mechanism: 'instantaneous_collapse',
    rheology_model: 'herschel_bulkley_tailings',
    manning_n_roughness: 0.045,
    slurry_yield_stress_pa: 48.0,
    slurry_density_kg_m3: 1650.0,
    simulation_duration_hours: 6.0,
    timestep_interval_min: 15.0
  },
  north_tailings_standard: {
    name: 'North Tailings Impoundment (Facility A)',
    dam_id: 'TAILINGS_DAM_A',
    dam_name: 'North Tailings Impoundment Main Embankment',
    dam_coordinates: [-44.1234, -20.1234],
    dam_height_m: 45.0,
    reservoir_volume_m3: 12500000.0,
    breach_mechanism: 'overtopping',
    rheology_model: 'herschel_bulkley_tailings',
    manning_n_roughness: 0.040,
    slurry_yield_stress_pa: 45.0,
    slurry_density_kg_m3: 1450.0,
    simulation_duration_hours: 6.0,
    timestep_interval_min: 15.0
  },
  san_luis_upstream: {
    name: 'San Luis Upstream Embankment (California)',
    dam_id: 'DAM_SAN_LUIS_UP',
    dam_name: 'San Luis Forebay Upstream Embankment',
    dam_coordinates: [-120.9300, 36.9800],
    dam_height_m: 38.0,
    reservoir_volume_m3: 8400000.0,
    breach_mechanism: 'piping_internal_erosion',
    rheology_model: 'bingham_plastic',
    manning_n_roughness: 0.038,
    slurry_yield_stress_pa: 30.0,
    slurry_density_kg_m3: 1350.0,
    simulation_duration_hours: 4.0,
    timestep_interval_min: 15.0
  }
};

export default function DamBreakSimulationModal({
  isOpen,
  onClose,
  onApplySimulation = null,
  activeSimulation = null
}) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('hydrodynamics'); // 'hydrodynamics' | 'time_stepper' | 'receptors' | 'evacuation' | 'contracts'
  
  // Simulation input parameters
  const [selectedPreset, setSelectedPreset] = useState('north_tailings_standard');
  const [damId, setDamId] = useState('TAILINGS_DAM_A');
  const [damName, setDamName] = useState('North Tailings Impoundment Main Embankment');
  const [damCoords, setDamCoords] = useState([-44.1234, -20.1234]);
  const [damHeightM, setDamHeightM] = useState(45.0);
  const [reservoirVolumeM3, setReservoirVolumeM3] = useState(12500000.0);
  const [breachMechanism, setBreachMechanism] = useState('overtopping');
  const [rheologyModel, setRheologyModel] = useState('herschel_bulkley_tailings');
  const [manningNRoughness, setManningNRoughness] = useState(0.040);
  const [slurryYieldStressPa, setSlurryYieldStressPa] = useState(45.0);
  const [slurryDensityKgM3, setSlurryDensityKgM3] = useState(1450.0);
  const [simulationDurationHours, setSimulationDurationHours] = useState(6.0);
  const [timestepIntervalMin, setTimestepIntervalMin] = useState(15.0);
  
  // Simulation Results & State
  const [simulationResult, setSimulationResult] = useState(activeSimulation || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  
  // Time-Stepper Player State
  const [activeTimeSliceIndex, setActiveTimeSliceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeedMs, setPlaybackSpeedMs] = useState(1200);
  const playTimerRef = useRef(null);

  // Receptors filter & sorting
  const [receptorUrgencyFilter, setReceptorUrgencyFilter] = useState('all'); // 'all' | 'immediate' | 'high_priority' | 'precautionary'
  const [receptorSortBy, setReceptorSortBy] = useState('distance'); // 'distance' | 'arrival' | 'vulnerability' | 'population'

  // Dynamic Tile Display metric
  const [tileMetric, setTileMetric] = useState('hazard_product'); // 'hazard_product' | 'depth' | 'velocity'

  // Apply scenario preset
  const handleSelectPreset = (key) => {
    setSelectedPreset(key);
    const p = PRESET_SCENARIOS[key];
    if (p) {
      setDamId(p.dam_id);
      setDamName(p.dam_name);
      setDamCoords(p.dam_coordinates);
      setDamHeightM(p.dam_height_m);
      setReservoirVolumeM3(p.reservoir_volume_m3);
      setBreachMechanism(p.breach_mechanism);
      setRheologyModel(p.rheology_model);
      setManningNRoughness(p.manning_n_roughness);
      setSlurryYieldStressPa(p.slurry_yield_stress_pa);
      setSlurryDensityKgM3(p.slurry_density_kg_m3);
      setSimulationDurationHours(p.simulation_duration_hours);
      setTimestepIntervalMin(p.timestep_interval_min);
    }
  };

  // Initialize simulation on mount if empty
  useEffect(() => {
    if (isOpen && !simulationResult) {
      const initial = calculateDamBreakHydrodynamicSimulation({
        dam_id: damId,
        dam_name: damName,
        dam_coordinates: damCoords,
        breach_params: {
          dam_height_m: damHeightM,
          reservoir_volume_m3: reservoirVolumeM3,
          breach_mechanism: breachMechanism,
          rheology_model: rheologyModel,
          manning_n_roughness: manningNRoughness,
          slurry_yield_stress_pa: slurryYieldStressPa,
          slurry_density_kg_m3: slurryDensityKgM3
        },
        simulation_duration_hours: simulationDurationHours,
        timestep_interval_min: timestepIntervalMin
      });
      setSimulationResult(initial);
      setActiveTimeSliceIndex(0);
    }
  }, [isOpen, simulationResult, damId, damName, damCoords, damHeightM, reservoirVolumeM3, breachMechanism, rheologyModel, manningNRoughness, slurryYieldStressPa, slurryDensityKgM3, simulationDurationHours, timestepIntervalMin]);

  // Synchronize when activeSimulation prop changes
  useEffect(() => {
    if (activeSimulation) {
      setSimulationResult(activeSimulation);
    }
  }, [activeSimulation]);

  // Handle Play/Pause auto-advance timer for time stepper
  useEffect(() => {
    if (isPlaying && simulationResult?.time_slices?.length) {
      playTimerRef.current = setInterval(() => {
        setActiveTimeSliceIndex((prev) => {
          if (prev >= simulationResult.time_slices.length - 1) {
            return 0; // Loop back to start
          }
          return prev + 1;
        });
      }, playbackSpeedMs);
    } else {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    }
    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, playbackSpeedMs, simulationResult?.time_slices?.length]);

  if (!isOpen) return null;

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Interactive live Froehlich peak discharge calculation preview
  const livePeakDischarge = calculateDamBreachPeakDischarge(damHeightM, reservoirVolumeM3, breachMechanism);

  // Execute full 2D hydrodynamic simulation
  const handleRunSimulation = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        simulation_id: `SIM_DAM_BREAK_${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`,
        dam_id: damId,
        dam_name: damName,
        dam_coordinates: damCoords,
        breach_params: {
          dam_height_m: Number(damHeightM),
          reservoir_volume_m3: Number(reservoirVolumeM3),
          breach_mechanism: breachMechanism,
          rheology_model: rheologyModel,
          manning_n_roughness: Number(manningNRoughness),
          slurry_yield_stress_pa: Number(slurryYieldStressPa),
          slurry_density_kg_m3: Number(slurryDensityKgM3),
          peak_discharge_m3s: livePeakDischarge
        },
        simulation_duration_hours: Number(simulationDurationHours),
        timestep_interval_min: Number(timestepIntervalMin),
        generate_evacuation_corridors: true,
        include_time_slices: true
      };

      const res = await simulateDamBreakHydrodynamics(payload);
      const computed = res?.data || res || calculateDamBreakHydrodynamicSimulation(payload);
      setSimulationResult(computed);
      setActiveTimeSliceIndex(0);
      setActiveTab('time_stepper');
    } catch {
      // Fallback to local high-precision calculation engine
      const fallback = calculateDamBreakHydrodynamicSimulation({
        dam_id: damId,
        dam_name: damName,
        dam_coordinates: damCoords,
        breach_params: {
          dam_height_m: Number(damHeightM),
          reservoir_volume_m3: Number(reservoirVolumeM3),
          breach_mechanism: breachMechanism,
          rheology_model: rheologyModel,
          manning_n_roughness: Number(manningNRoughness),
          slurry_yield_stress_pa: Number(slurryYieldStressPa),
          slurry_density_kg_m3: Number(slurryDensityKgM3),
          peak_discharge_m3s: livePeakDischarge
        },
        simulation_duration_hours: Number(simulationDurationHours),
        timestep_interval_min: Number(timestepIntervalMin)
      });
      setSimulationResult(fallback);
      setActiveTimeSliceIndex(0);
      setActiveTab('time_stepper');
    } finally {
      setIsProcessing(false);
    }
  };

  // Active time slice details
  const timeSlices = simulationResult?.time_slices || [];
  const currentTimeSlice = timeSlices[activeTimeSliceIndex] || timeSlices[0] || {
    timestep_minutes: 15,
    inundation_area_ha: 25.4,
    max_depth_m: 13.8,
    mean_depth_m: 5.8,
    max_velocity_ms: 8.6,
    wave_front_distance_km: 3.5,
    slurry_volume_released_m3: 3800000
  };

  // Receptors list & filtering
  const allReceptors = simulationResult?.receptors || [];
  const filteredReceptors = allReceptors.filter((r) => {
    if (receptorUrgencyFilter === 'all') return true;
    if (receptorUrgencyFilter === 'immediate') return r.arrival_time_min <= 15.0;
    if (receptorUrgencyFilter === 'high_priority') return r.arrival_time_min > 15.0 && r.arrival_time_min <= 60.0;
    if (receptorUrgencyFilter === 'precautionary') return r.arrival_time_min > 60.0;
    return true;
  }).sort((a, b) => {
    if (receptorSortBy === 'distance') return a.distance_downstream_km - b.distance_downstream_km;
    if (receptorSortBy === 'arrival') return a.arrival_time_min - b.arrival_time_min;
    if (receptorSortBy === 'vulnerability') return (b.vulnerability_score || 0) - (a.vulnerability_score || 0);
    if (receptorSortBy === 'population') return (b.population_at_risk || 0) - (a.population_at_risk || 0);
    return 0;
  });

  // Evacuation corridors list
  const evacuationCorridors = simulationResult?.evacuation_corridors || [];

  // Summary counts
  const totalReceptorsCount = allReceptors.length;
  const totalPopAtRisk = simulationResult?.total_population_at_risk || allReceptors.reduce((acc, r) => acc + (r.population_at_risk || 0), 0);
  const immediateUrgencyCount = allReceptors.filter(r => r.arrival_time_min <= 15.0).length;
  const overallTierConfig = simulationResult?.tier_metadata || HAZARD_INTENSITY_TIER_CONFIGS[simulationResult?.overall_hazard_tier] || HAZARD_INTENSITY_TIER_CONFIGS.extreme_catastrophic;

  // Chart 1: Time Series Hydrograph & Inundated Area Progression
  const hydrographChartData = {
    labels: timeSlices.map(ts => `T+${ts.timestep_minutes}m`),
    datasets: [
      {
        type: 'line',
        label: 'Inundation Area (ha)',
        data: timeSlices.map(ts => ts.inundation_area_ha),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        yAxisID: 'yArea',
        fill: true,
        tension: 0.3,
        pointRadius: timeSlices.map((_, idx) => idx === activeTimeSliceIndex ? 6 : 2),
        pointBackgroundColor: timeSlices.map((_, idx) => idx === activeTimeSliceIndex ? '#ffffff' : '#38bdf8'),
        pointBorderColor: '#38bdf8'
      },
      {
        type: 'line',
        label: 'Max Wave Depth (m)',
        data: timeSlices.map(ts => ts.max_depth_m),
        borderColor: '#f43f5e',
        backgroundColor: 'rgba(244, 63, 94, 0.1)',
        yAxisID: 'yDepth',
        fill: false,
        tension: 0.3,
        pointRadius: 2
      }
    ]
  };

  const hydrographChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 10, family: 'monospace' } }
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { size: 9, family: 'monospace' } }
      },
      yArea: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Footprint (ha)', color: '#38bdf8', font: { size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#38bdf8', font: { size: 9, family: 'monospace' } }
      },
      yDepth: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Max Depth (m)', color: '#f43f5e', font: { size: 10 } },
        grid: { drawOnChartArea: false },
        ticks: { color: '#f43f5e', font: { size: 9, family: 'monospace' } }
      }
    }
  };

  // Chart 2: Attenuation Profile Across Downstream Receptors
  const receptorAttenuationChartData = {
    labels: allReceptors.map(r => `${r.distance_downstream_km}km (${r.name.slice(0, 14)})`),
    datasets: [
      {
        type: 'bar',
        label: 'Peak Depth (m)',
        data: allReceptors.map(r => r.peak_depth_m),
        backgroundColor: 'rgba(59, 130, 246, 0.65)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        yAxisID: 'yValues'
      },
      {
        type: 'line',
        label: 'Velocity (m/s)',
        data: allReceptors.map(r => r.peak_velocity_ms),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        borderWidth: 2,
        yAxisID: 'yValues'
      },
      {
        type: 'line',
        label: 'Arrival Time (min)',
        data: allReceptors.map(r => r.arrival_time_min),
        borderColor: '#10b981',
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        borderWidth: 2,
        yAxisID: 'yArrival'
      }
    ]
  };

  const receptorAttenuationChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 10, family: 'monospace' } }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', font: { size: 9, family: 'monospace' } }
      },
      yValues: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Depth (m) / Velocity (m/s)', color: '#94a3b8', font: { size: 9 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', font: { size: 9, family: 'monospace' } }
      },
      yArrival: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Arrival (min)', color: '#10b981', font: { size: 9 } },
        grid: { drawOnChartArea: false },
        ticks: { color: '#10b981', font: { size: 9, family: 'monospace' } }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-7xl h-[92vh] flex flex-col bg-slate-900/95 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <Waves className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Geotechnical Tailings Dam Inundation & Hydrodynamics Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  Cycle v2.5.11
                </span>
                <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full ${overallTierConfig.badge_class}`}>
                  {overallTierConfig.name}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                2D Shallow Water Slurry Flow Inversion • Wave Front Time-Stepping • Downstream Vulnerability & Evacuation Corridors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Simulation KPI Chips */}
            <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-400">Peak Q<sub>p</sub>:</span>
              <span className="font-bold text-amber-400">{(simulationResult?.peak_breach_discharge_m3s || livePeakDischarge).toLocaleString()} m³/s</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Max Inundation:</span>
              <span className="font-bold text-cyan-400">{(simulationResult?.max_inundation_area_ha || 0).toFixed(1)} ha</span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Pop. at Risk:</span>
              <span className="font-bold text-rose-400">{totalPopAtRisk.toLocaleString()}</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center justify-between px-6 border-b border-slate-800 bg-slate-900/40">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('hydrodynamics')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider font-mono border-b-2 transition-all ${
                activeTab === 'hydrodynamics'
                  ? 'border-rose-500 text-rose-400 bg-rose-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              1. Dam Breach Parameters
            </button>

            <button
              onClick={() => setActiveTab('time_stepper')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider font-mono border-b-2 transition-all ${
                activeTab === 'time_stepper'
                  ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              2. Wave Front Time-Stepper ({timeSlices.length} Slices)
            </button>

            <button
              onClick={() => setActiveTab('receptors')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider font-mono border-b-2 transition-all ${
                activeTab === 'receptors'
                  ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              3. Downstream Exposure ({allReceptors.length} Assets)
            </button>

            <button
              onClick={() => setActiveTab('evacuation')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider font-mono border-b-2 transition-all ${
                activeTab === 'evacuation'
                  ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              4. Evacuation Corridors ({evacuationCorridors.length} Routes)
            </button>

            <button
              onClick={() => setActiveTab('contracts')}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider font-mono border-b-2 transition-all ${
                activeTab === 'contracts'
                  ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              5. Dynamic Tiles & Contracts
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (onApplySimulation && simulationResult) {
                  onApplySimulation(simulationResult, {
                    activeTimeSliceIndex,
                    selectedMetric: tileMetric
                  });
                  onClose();
                }
              }}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold font-mono uppercase rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              Apply to Map View
            </button>
          </div>
        </div>

        {/* MODAL BODY (SCROLLABLE CONTENT) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: DAM BREACH PARAMETERS & HYDRODYNAMICS */}
          {activeTab === 'hydrodynamics' && (
            <div className="space-y-6">
              {/* Presets Selector */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-rose-400" />
                    Geotechnical Analog Benchmark Presets
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    ICOLD / ANM Dam Safety Classification Standards
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.entries(PRESET_SCENARIOS).map(([key, p]) => (
                    <button
                      key={key}
                      onClick={() => handleSelectPreset(key)}
                      className={`text-left p-3 rounded-lg border transition-all ${
                        selectedPreset === key
                          ? 'bg-rose-500/15 border-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.2)]'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-200">{p.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 mt-1">
                        H: {p.dam_height_m}m • V: {(p.reservoir_volume_m3 / 1e6).toFixed(1)}M m³
                      </div>
                      <div className="text-[10px] font-mono text-rose-300 mt-0.5">
                        {BREACH_MECHANISM_CONFIGS[p.breach_mechanism]?.name || p.breach_mechanism}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dam & Breach Configuration Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Embankment Geometry Card */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                  <div className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                    Dam Embankment Geometry
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Dam Height (h<sub>w</sub>):</span>
                      <span className="font-bold text-cyan-300">{damHeightM} m</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="150"
                      step="1"
                      value={damHeightM}
                      onChange={(e) => setDamHeightM(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Reservoir Volume (V<sub>w</sub>):</span>
                      <span className="font-bold text-cyan-300">{(reservoirVolumeM3 / 1e6).toFixed(2)} M m³</span>
                    </div>
                    <input
                      type="range"
                      min="500000"
                      max="50000000"
                      step="500000"
                      value={reservoirVolumeM3}
                      onChange={(e) => setReservoirVolumeM3(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400">Dam Asset ID & Name:</label>
                    <input
                      type="text"
                      value={damName}
                      onChange={(e) => setDamName(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:border-cyan-500 outline-none"
                    />
                  </div>
                </div>

                {/* Breach Mechanics Card */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                  <div className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Breach Failure Mechanism
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400">Failure Mode Initiation:</label>
                    <select
                      value={breachMechanism}
                      onChange={(e) => setBreachMechanism(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:border-amber-500 outline-none"
                    >
                      {Object.entries(BREACH_MECHANISM_CONFIGS).map(([k, cfg]) => (
                        <option key={k} value={k}>
                          {cfg.name} (×{cfg.peak_discharge_multiplier})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1 italic">
                      {BREACH_MECHANISM_CONFIGS[breachMechanism]?.description}
                    </p>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400">Slurry Rheology Model:</label>
                    <select
                      value={rheologyModel}
                      onChange={(e) => setRheologyModel(e.target.value)}
                      className="w-full mt-1 px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono focus:border-amber-500 outline-none"
                    >
                      <option value="herschel_bulkley_tailings">Herschel-Bulkley Tailings (Yield + Shear Thinning)</option>
                      <option value="bingham_plastic">Bingham Plastic Viscoplastic Slurry</option>
                      <option value="power_law_dilatant">Power-Law Dilatant Dense Mixture</option>
                      <option value="newtonian_clean_water">Newtonian Clean Water (τ₀ = 0 Pa)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Yield Stress (τ₀):</span>
                      <input
                        type="number"
                        min="0"
                        max="250"
                        value={slurryYieldStressPa}
                        onChange={(e) => setSlurryYieldStressPa(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Bulk Density (ρ):</span>
                      <input
                        type="number"
                        min="1000"
                        max="2400"
                        value={slurryDensityKgM3}
                        onChange={(e) => setSlurryDensityKgM3(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Floodplain Hydraulics & Run Time */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-3">
                  <div className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-rose-400" />
                    Hydrodynamic Inversion Domain
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-slate-400">Manning Roughness (n):</span>
                      <span className="font-bold text-rose-300">{manningNRoughness}</span>
                    </div>
                    <input
                      type="range"
                      min="0.015"
                      max="0.120"
                      step="0.005"
                      value={manningNRoughness}
                      onChange={(e) => setManningNRoughness(Number(e.target.value))}
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Duration (hours):</span>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        value={simulationDurationHours}
                        onChange={(e) => setSimulationDurationHours(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400">Interval (min):</span>
                      <input
                        type="number"
                        min="5"
                        max="60"
                        step="5"
                        value={timestepIntervalMin}
                        onChange={(e) => setTimestepIntervalMin(Number(e.target.value))}
                        className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Froehlich Live Calculation Summary */}
                  <div className="p-2.5 rounded bg-slate-900/90 border border-slate-800">
                    <div className="text-[10px] font-mono text-slate-400">Froehlich (2008) Empirical Peak:</div>
                    <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                      Q<sub>p</sub> = {livePeakDischarge.toLocaleString()} m³/s
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 mt-0.5">
                      0.607 · V<sub>w</sub><sup>0.295</sup> · h<sub>w</sub><sup>1.24</sup> · μ<sub>mech</sub>
                    </div>
                  </div>
                </div>

              </div>

              {/* Simulation Trigger Bar */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-950 border border-rose-500/30">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-rose-400" />
                    Execute 2D Shallow Water Hydrodynamic Dam-Break Simulation
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Solves non-linear shallow water continuity and Bingham/Herschel-Bulkley momentum conservation across DEM grid.
                  </p>
                </div>

                <button
                  onClick={handleRunSimulation}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold font-mono uppercase rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Computing Hydrodynamics...
                    </>
                  ) : (
                    <>
                      <Waves className="w-4 h-4" />
                      Run Simulation Engine
                    </>
                  )}
                </button>
              </div>

              {/* Attenuation Curve Preview */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-xs font-mono uppercase text-slate-400 font-bold mb-3 flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Downstream Hydraulic Attenuation Profile (Empirical Solution)
                </div>
                <div className="h-56">
                  <Bar data={receptorAttenuationChartData} options={receptorAttenuationChartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE DAM BREACH TIME-STEPPER */}
          {activeTab === 'time_stepper' && (
            <div className="space-y-6">
              
              {/* Floating Scrub / Player Bar */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 shadow-xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                        isPlaying
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]'
                      }`}
                      title={isPlaying ? 'Pause Simulation' : 'Play Time-Stepper Animation'}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => setActiveTimeSliceIndex(Math.max(0, activeTimeSliceIndex - 1))}
                      disabled={activeTimeSliceIndex === 0}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30"
                      title="Step Backward (15 min)"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setActiveTimeSliceIndex(Math.min(timeSlices.length - 1, activeTimeSliceIndex + 1))}
                      disabled={activeTimeSliceIndex >= timeSlices.length - 1}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-30"
                      title="Step Forward (15 min)"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => {
                        setIsPlaying(false);
                        setActiveTimeSliceIndex(0);
                      }}
                      className="p-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200"
                      title="Reset to Time Zero"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    {/* Playback speed toggle */}
                    <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-[10px] font-mono">
                      {[1800, 1200, 600].map((spd, i) => (
                        <button
                          key={spd}
                          onClick={() => setPlaybackSpeedMs(spd)}
                          className={`px-2 py-0.5 rounded ${
                            playbackSpeedMs === spd ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {i === 0 ? '0.5x' : i === 1 ? '1.0x' : '2.0x'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Current Timestep Big Readout */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[10px] font-mono uppercase text-slate-400">Elapsed Wave Propagation</div>
                      <div className="text-2xl font-black font-mono text-cyan-400 tracking-tight">
                        T + {currentTimeSlice.timestep_minutes} min
                        <span className="text-xs text-slate-400 font-normal ml-1.5">
                          ({(currentTimeSlice.timestep_minutes / 60).toFixed(2)} hr)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Range Scrubber Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Breach Initiation (T+0m)</span>
                    <span className="text-cyan-300 font-bold">
                      Slice {activeTimeSliceIndex + 1} of {timeSlices.length}
                    </span>
                    <span>Max Duration (T+{(simulationDurationHours * 60)}m)</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={Math.max(0, timeSlices.length - 1)}
                    step="1"
                    value={activeTimeSliceIndex}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setActiveTimeSliceIndex(Number(e.target.value));
                    }}
                    className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Active Timestep Metrics Hero Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Wave Front Distance</div>
                  <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                    {currentTimeSlice.wave_front_distance_km} km
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">Downstream axis</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Inundated Area</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                    {currentTimeSlice.inundation_area_ha} ha
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">Wetted footprint</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Max Wave Depth</div>
                  <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                    {currentTimeSlice.max_depth_m} m
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">Mean: {currentTimeSlice.mean_depth_m}m</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Max Flow Velocity</div>
                  <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                    {currentTimeSlice.max_velocity_ms} m/s
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">Leading edge</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Hazard Product (v·h)</div>
                  <div className="text-xl font-bold font-mono text-purple-400 mt-1">
                    {(currentTimeSlice.max_depth_m * currentTimeSlice.max_velocity_ms).toFixed(1)} m²/s
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">Damage intensity</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Volume Released</div>
                  <div className="text-xl font-bold font-mono text-blue-400 mt-1">
                    {(currentTimeSlice.slurry_volume_released_m3 / 1e6).toFixed(2)}M m³
                  </div>
                  <div className="text-[9px] font-mono text-slate-500 mt-0.5">Cumulative slurry</div>
                </div>
              </div>

              {/* Dynamic Hydrograph Chart */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-cyan-400" />
                    Slurry Inundation Envelope Growth Over Time
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    Current active slice highlighted at T+{currentTimeSlice.timestep_minutes}m
                  </span>
                </div>
                <div className="h-64">
                  <Line data={hydrographChartData} options={hydrographChartOptions} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOWNSTREAM INFRASTRUCTURE EXPOSURE */}
          {activeTab === 'receptors' && (
            <div className="space-y-6">
              
              {/* Exposure KPI Banner */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs font-mono text-slate-400 uppercase">Total Critical Assets</div>
                  <div className="text-2xl font-bold font-mono text-white mt-1">
                    {totalReceptorsCount}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-0.5">Evaluated receptors</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-rose-500/40 bg-rose-950/10">
                  <div className="text-xs font-mono text-rose-300 uppercase">Total Population at Risk</div>
                  <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                    {totalPopAtRisk.toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-rose-500 mt-0.5">Direct floodplain exposure</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-red-500/40 bg-red-950/15">
                  <div className="text-xs font-mono text-red-300 uppercase">Immediate Life Safety (&lt;15m)</div>
                  <div className="text-2xl font-bold font-mono text-red-400 mt-1">
                    {immediateUrgencyCount} Assets
                  </div>
                  <div className="text-[10px] font-mono text-red-500 mt-0.5">Siren activation required</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-amber-500/40 bg-amber-950/10">
                  <div className="text-xs font-mono text-amber-300 uppercase">Max Hazard Product</div>
                  <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                    {simulationResult?.max_hazard_product_m2s || 0} m²/s
                  </div>
                  <div className="text-[10px] font-mono text-amber-500 mt-0.5">Structural destruction</div>
                </div>
              </div>

              {/* Filtering & Sorting Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">Urgency Filter:</span>
                  <div className="flex gap-1">
                    {['all', 'immediate', 'high_priority', 'precautionary'].map((filt) => (
                      <button
                        key={filt}
                        onClick={() => setReceptorUrgencyFilter(filt)}
                        className={`px-2.5 py-1 text-[11px] font-mono rounded capitalize transition-all ${
                          receptorUrgencyFilter === filt
                            ? 'bg-slate-700 text-white font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {filt.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-slate-400">Sort By:</span>
                  <select
                    value={receptorSortBy}
                    onChange={(e) => setReceptorSortBy(e.target.value)}
                    className="px-2.5 py-1 text-xs font-mono rounded bg-slate-900 border border-slate-700 text-slate-200 outline-none"
                  >
                    <option value="distance">Distance Downstream</option>
                    <option value="arrival">Wave Arrival Time</option>
                    <option value="vulnerability">Vulnerability Score</option>
                    <option value="population">Population at Risk</option>
                  </select>
                </div>
              </div>

              {/* Receptors Exposure Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/40">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase text-[10px]">
                      <th className="py-3 px-4">Asset / Receptor Name</th>
                      <th className="py-3 px-4">Exposure Type</th>
                      <th className="py-3 px-4">Distance (km)</th>
                      <th className="py-3 px-4">Arrival Time</th>
                      <th className="py-3 px-4">Flood Depth (m)</th>
                      <th className="py-3 px-4">Velocity (m/s)</th>
                      <th className="py-3 px-4">Hazard Product</th>
                      <th className="py-3 px-4">Pop. at Risk</th>
                      <th className="py-3 px-4">Vulnerability</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredReceptors.map((r) => {
                      const urgCfg = EVACUATION_URGENCY_TIER_CONFIGS[r.evacuation_urgency] || EVACUATION_URGENCY_TIER_CONFIGS.monitored_safe_haven;
                      const hazCfg = HAZARD_INTENSITY_TIER_CONFIGS[r.hazard_tier] || HAZARD_INTENSITY_TIER_CONFIGS.medium_hazard;
                      const expCfg = INFRASTRUCTURE_EXPOSURE_CONFIGS[r.exposure_type] || INFRASTRUCTURE_EXPOSURE_CONFIGS.residential_settlement;

                      return (
                        <tr key={r.receptor_id} className="hover:bg-slate-900/60 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-200">
                            {r.name}
                            <div className="text-[10px] text-slate-500 font-normal">{r.receptor_id}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                              {expCfg.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-cyan-300">
                            {r.distance_downstream_km} km
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${urgCfg.badge_class}`}>
                              {r.arrival_time_min} min ({urgCfg.name.split(' ')[0]})
                            </span>
                          </td>
                          <td className="py-3 px-4 text-rose-300 font-bold">
                            {r.peak_depth_m} m
                          </td>
                          <td className="py-3 px-4 text-amber-300">
                            {r.peak_velocity_ms} m/s
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${hazCfg.badge_class}`}>
                              {r.hazard_intensity_product} m²/s
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-200 font-bold">
                            {r.population_at_risk?.toLocaleString() || '0'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500"
                                  style={{ width: `${(r.vulnerability_score || 0) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-300">
                                {((r.vulnerability_score || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: EMERGENCY EVACUATION CORRIDORS */}
          {activeTab === 'evacuation' && (
            <div className="space-y-6">
              
              {/* Civil Defense Directive Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/40 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 mt-0.5">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-300">
                    Civil Defense Emergency Evacuation Directives (ICOLD Bulletin 194)
                  </div>
                  <p className="text-xs text-slate-300 font-mono mt-1">
                    All emergency egress routes avoid floodplain inundation zones by maintaining vertical high-ground targets (El. &gt; 740m) and lateral safety standoff buffers (&ge; 150m).
                  </p>
                </div>
              </div>

              {/* Designated Corridors Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {evacuationCorridors.map((c) => (
                  <div
                    key={c.corridor_id}
                    className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-xs font-mono font-bold text-emerald-400 uppercase">
                          {c.corridor_id}
                        </div>
                        <h3 className="text-sm font-bold text-white mt-0.5">
                          {c.name}
                        </h3>
                      </div>
                      <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Route: {c.route_status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-slate-400">Target Muster Haven:</span>
                        <div className="font-bold text-slate-200 mt-0.5">{c.assembly_point}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Safe Elevation:</span>
                        <div className="font-bold text-cyan-300 mt-0.5">El. {c.safe_elevation_m} m</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Lateral Standoff Buffer:</span>
                        <div className="font-bold text-amber-300 mt-0.5">{c.buffer_distance_m} m</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Estimated Transit Time:</span>
                        <div className="font-bold text-emerald-300 mt-0.5">{c.estimated_evacuation_time_min} min</div>
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] font-mono text-slate-400 uppercase mb-1">
                        Waypoints Coordinates ({c.coordinates?.length || 0} nodes):
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400 max-h-20 overflow-y-auto">
                        {c.coordinates?.map((coord, idx) => (
                          <div key={idx}>
                            Node {idx + 1}: [{coord[0].toFixed(4)}, {coord[1].toFixed(4)}]
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                      <span className="text-[10px] font-mono text-slate-500">
                        GeoJSON MultiLineString Compatible
                      </span>
                      <button
                        onClick={() => handleCopy(c, c.corridor_id)}
                        className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                      >
                        {copiedKey === c.corridor_id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Copy Route JSON
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: DYNAMIC TILES & API CONTRACTS */}
          {activeTab === 'contracts' && (
            <div className="space-y-6">
              {/* Tile Endpoint Specification */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold flex items-center gap-2">
                    <Database className="w-3.5 h-3.5 text-purple-400" />
                    Dynamic XYZ Inundation Tile Streaming Contract
                  </span>
                  <div className="flex items-center gap-1">
                    {['hazard_product', 'depth', 'velocity'].map((m) => (
                      <button
                        key={m}
                        onClick={() => setTileMetric(m)}
                        className={`px-2.5 py-1 text-[10px] font-mono rounded uppercase transition-all ${
                          tileMetric === m
                            ? 'bg-purple-600 text-white font-bold'
                            : 'bg-slate-900 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs flex items-center justify-between">
                  <span className="text-purple-300">
                    GET {buildDamBreakTileUrlTemplate(simulationResult?.simulation_id || 'SIM_DAM_BREAK_001', tileMetric)}
                  </span>
                  <button
                    onClick={() => handleCopy(buildDamBreakTileUrlTemplate(simulationResult?.simulation_id || 'SIM_DAM_BREAK_001', tileMetric), 'tile_template')}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    {copiedKey === 'tile_template' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* JSON Payload Inspection */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold">
                    DamBreakHydrodynamicResponse JSON Contract
                  </span>
                  <button
                    onClick={() => handleCopy(simulationResult, 'sim_json')}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    {copiedKey === 'sim_json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    Copy Full JSON
                  </button>
                </div>
                <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-72 overflow-y-auto">
                  {JSON.stringify(simulationResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/70">
          <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Simulation: <strong className="text-slate-200">{simulationResult?.simulation_id || 'READY'}</strong></span>
            <span className="text-slate-600">•</span>
            <span>{timeSlices.length} time slices available</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase font-bold text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (onApplySimulation && simulationResult) {
                  onApplySimulation(simulationResult, {
                    activeTimeSliceIndex,
                    selectedMetric: tileMetric
                  });
                  onClose();
                }
              }}
              className="flex items-center gap-2 px-6 py-2 text-xs font-bold font-mono uppercase rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all"
            >
              <Eye className="w-4 h-4" />
              Apply Inundation to Map
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
