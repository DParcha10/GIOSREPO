import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  X, Waves, Play, Pause, SkipBack, SkipForward, RotateCcw, 
  AlertTriangle, Activity, Gauge, Database, Eye, Copy, Check,
  ShieldAlert, SlidersHorizontal, Navigation, Users, Clock, 
  Compass, Layers, ArrowRight, BarChart3, TrendingUp, AlertOctagon,
  CheckCircle2, ChevronRight, Droplets, MapPin, Radio
} from 'lucide-react';
import { 
  analyzeDamBreachInundation,
  fetchDamBreachSimulation,
  getHydrodynamicTileUrlTemplate
} from '../api/giosApi';
import { 
  BREACH_METHODOLOGIES,
  HYDRODYNAMIC_ROUTING_METHODS,
  INUNDATION_HAZARD_RATINGS,
  DAM_BREACH_MATERIAL_TYPES,
  DAM_BREACH_HAZARD_CONFIGS,
  BREACH_METHOD_CONFIGS,
  MANNING_ROUGHNESS_CONFIGS,
  HYDRODYNAMIC_TILE_METRICS,
  calculateFroehlichBreachParameters,
  calculateMacDonaldMonopolisBreachParameters,
  classifyInundationHazardRating,
  calculateDamBreachInundationAnalysis,
  buildHydrodynamicTileUrlTemplate
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Pre-configured Benchmark Tailings Dam Breach Scenarios
const PRESET_SCENARIOS = {
  brumadinho_tailings: {
    id: 'brumadinho_tailings',
    name: 'Brumadinho Dam I Failure (Brazil Analog)',
    dam_id: 'DAM_BRUMADINHO_01',
    dam_name: 'Córrego do Feijão Tailings Dam I',
    coordinates: [-44.1200, -20.1200],
    reservoir_volume_m3: 12700000.0,
    dam_height_m: 86.0,
    water_depth_m: 80.0,
    failure_mode: 'seismic_liquefaction',
    breach_methodology: 'froehlich_2008',
    material_type: 'silt_tailings',
    reach_length_km: 25.0,
    bed_slope: 0.009,
    manning_n_id: 'tailings_slurry_mud',
    manning_n: 0.065,
    simulation_duration_hours: 8.0,
    time_step_min: 5.0
  },
  mount_polley: {
    id: 'mount_polley',
    name: 'Mount Polley Embankment Breach (Canada)',
    dam_id: 'DAM_MOUNT_POLLEY_01',
    dam_name: 'Mount Polley Tailings Storage Facility Main Embankment',
    coordinates: [-121.6000, 52.5400],
    reservoir_volume_m3: 25000000.0,
    dam_height_m: 40.0,
    water_depth_m: 35.0,
    failure_mode: 'slope_instability',
    breach_methodology: 'hybrid_ensemble',
    material_type: 'sand_tailings',
    reach_length_km: 30.0,
    bed_slope: 0.006,
    manning_n_id: 'gravel_bed_channel',
    manning_n: 0.040,
    simulation_duration_hours: 12.0,
    time_step_min: 5.0
  },
  fundao_samarco: {
    id: 'fundao_samarco',
    name: 'Fundão Samarco Tailings Collapse (Brazil)',
    dam_id: 'DAM_FUNDAO_01',
    dam_name: 'Fundão Tailings Impoundment Main Dam',
    coordinates: [-43.4611, -20.2189],
    reservoir_volume_m3: 32000000.0,
    dam_height_m: 90.0,
    water_depth_m: 82.0,
    failure_mode: 'seismic_liquefaction',
    breach_methodology: 'froehlich_2008',
    material_type: 'silt_tailings',
    reach_length_km: 40.0,
    bed_slope: 0.007,
    manning_n_id: 'tailings_slurry_mud',
    manning_n: 0.065,
    simulation_duration_hours: 14.0,
    time_step_min: 5.0
  },
  san_luis_forebay: {
    id: 'san_luis_forebay',
    name: 'San Luis Forebay Embankment Piping (California)',
    dam_id: 'DAM_SAN_LUIS_UP',
    dam_name: 'San Luis Forebay Upstream Embankment',
    coordinates: [-120.9300, 36.9800],
    reservoir_volume_m3: 8400000.0,
    dam_height_m: 38.0,
    water_depth_m: 32.0,
    failure_mode: 'piping',
    breach_methodology: 'macdonald_langridge_monopolis_1984',
    material_type: 'compacted_earthfill',
    reach_length_km: 20.0,
    bed_slope: 0.005,
    manning_n_id: 'clean_natural_channel',
    manning_n: 0.030,
    simulation_duration_hours: 6.0,
    time_step_min: 5.0
  }
};

// Synthetic critical receptors along the downstream valley
const DEFAULT_RECEPTORS = [
  { id: 'REC_01', name: 'Mine Beneficiation Plant & Offices', chainage_km: 1.2, elevation_offset_m: 1.5, population: 350, priority: 'IMMEDIATE', safe_zone: 'North High Ridge (Zone A)' },
  { id: 'REC_02', name: 'Valley Access Road & Culvert Bridge', chainage_km: 3.5, elevation_offset_m: 0.8, population: 45, priority: 'IMMEDIATE', safe_zone: 'East Hilltop Access Spur' },
  { id: 'REC_03', name: 'Downstream Rural Community (Vila Nova)', chainage_km: 6.8, elevation_offset_m: 2.2, population: 1200, priority: 'URGENT', safe_zone: 'Community Upland Assembly Point' },
  { id: 'REC_04', name: 'Regional Highway Route 12 Crossing', chainage_km: 12.4, elevation_offset_m: 1.0, population: 180, priority: 'URGENT', safe_zone: 'Highway Overpass Embankment' },
  { id: 'REC_05', name: 'Agricultural River Valley Settlement', chainage_km: 18.5, elevation_offset_m: 1.8, population: 620, priority: 'WARNING', safe_zone: 'South Plateau Terraces' },
  { id: 'REC_06', name: 'Municipal Water Treatment Intake', chainage_km: 24.0, elevation_offset_m: 0.5, population: 85, priority: 'WARNING', safe_zone: 'Pumping Station Ridge' }
];

export default function DamBreachModal({
  isOpen,
  onClose,
  activeSimulation = null,
  onApplySimulation = null
}) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('hydrograph'); // 'hydrograph' | 'wave_arrival' | 'transect_profile' | 'evacuation' | 'tile_inspector'

  // Input states initialized from benchmark preset
  const [selectedPresetKey, setSelectedPresetKey] = useState('brumadinho_tailings');
  const [damId, setDamId] = useState('DAM_BRUMADINHO_01');
  const [damName, setDamName] = useState('Córrego do Feijão Tailings Dam I');
  const [damCoordinates, setDamCoordinates] = useState([-44.1200, -20.1200]);
  const [reservoirVolumeM3, setReservoirVolumeM3] = useState(12700000.0);
  const [damHeightM, setDamHeightM] = useState(86.0);
  const [waterDepthM, setWaterDepthM] = useState(80.0);
  const [failureMode, setFailureMode] = useState('seismic_liquefaction');
  const [breachMethodology, setBreachMethodology] = useState('froehlich_2008');
  const [materialType, setMaterialType] = useState('silt_tailings');
  const [reachLengthKm, setReachLengthKm] = useState(25.0);
  const [bedSlope, setBedSlope] = useState(0.009);
  const [manningRoughnessId, setManningRoughnessId] = useState('tailings_slurry_mud');
  const [manningN, setManningN] = useState(0.065);
  const [simulationDurationHours, setSimulationDurationHours] = useState(8.0);
  const [timeStepMin, setTimeStepMin] = useState(5.0);

  // Simulation Results & State
  const [simulationResult, setSimulationResult] = useState(activeSimulation || null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedContract, setCopiedContract] = useState(false);
  const [copiedTileUrl, setCopiedTileUrl] = useState(false);

  // Tile inspector states
  const [selectedMetric, setSelectedMetric] = useState('inundation_depth');
  const [tileOpacity, setTileOpacity] = useState(0.85);

  // Wave Arrival Playback Scrubber States
  const [scrubberTimeMinutes, setScrubberTimeMinutes] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0); // 1.0x, 2.0x, 5.0x, 10.0x
  const timerRef = useRef(null);
  const [loadSimId, setLoadSimId] = useState('');

  // Live empirical breach parameter previews
  const liveFroehlich = useMemo(() => {
    return calculateFroehlichBreachParameters(reservoirVolumeM3, waterDepthM, failureMode);
  }, [reservoirVolumeM3, waterDepthM, failureMode]);

  const liveMacDonald = useMemo(() => {
    return calculateMacDonaldMonopolisBreachParameters(reservoirVolumeM3, waterDepthM);
  }, [reservoirVolumeM3, waterDepthM]);

  // Load preset handler
  const handleSelectPreset = useCallback((presetKey) => {
    const p = PRESET_SCENARIOS[presetKey];
    if (!p) return;
    setSelectedPresetKey(presetKey);
    setDamId(p.dam_id);
    setDamName(p.dam_name);
    setDamCoordinates(p.coordinates);
    setReservoirVolumeM3(p.reservoir_volume_m3);
    setDamHeightM(p.dam_height_m);
    setWaterDepthM(p.water_depth_m);
    setFailureMode(p.failure_mode);
    setBreachMethodology(p.breach_methodology);
    setMaterialType(p.material_type);
    setReachLengthKm(p.reach_length_km);
    setBedSlope(p.bed_slope);
    setManningRoughnessId(p.manning_n_id);
    setManningN(p.manning_n);
    setSimulationDurationHours(p.simulation_duration_hours);
    setTimeStepMin(p.time_step_min);
  }, []);

  // Handle Manning Roughness Preset change
  const handleManningChange = (mKey) => {
    setManningRoughnessId(mKey);
    const cfg = MANNING_ROUGHNESS_CONFIGS[mKey];
    if (cfg) setManningN(cfg.n);
  };

  // Run or Recompute Simulation
  const handleRunSimulation = useCallback(async () => {
    setIsSimulating(true);
    const reqPayload = {
      simulation_id: `BREACH_SIM_${Date.now()}`,
      dam_id: damId,
      dam_name: damName,
      latitude: damCoordinates[1],
      longitude: damCoordinates[0],
      dam_height_m: parseFloat(damHeightM),
      reservoir_volume_m3: parseFloat(reservoirVolumeM3),
      water_depth_above_invert_m: parseFloat(waterDepthM),
      failure_mode: failureMode,
      methodology: breachMethodology,
      material_type: materialType,
      reach_length_km: parseFloat(reachLengthKm),
      bed_slope_avg: parseFloat(bedSlope),
      default_manning_n: parseFloat(manningN),
      simulation_duration_hours: parseFloat(simulationDurationHours),
      time_step_minutes: parseFloat(timeStepMin),
      station_interval_m: 1000.0
    };

    try {
      // First attempt backend API call
      const res = await analyzeDamBreachInundation(reqPayload);
      setSimulationResult(res);
      setScrubberTimeMinutes(0);
      setIsPlaying(false);
    } catch {
      // Offline fallback: evaluate using deterministic mathematical solver defined by Agent 5
      const fallbackRes = calculateDamBreachInundationAnalysis(reqPayload);
      setSimulationResult(fallbackRes);
      setScrubberTimeMinutes(0);
      setIsPlaying(false);
    } finally {
      setIsSimulating(false);
    }
  }, [
    damId, damName, damCoordinates, damHeightM, reservoirVolumeM3, waterDepthM,
    failureMode, breachMethodology, materialType, reachLengthKm, bedSlope,
    manningN, simulationDurationHours, timeStepMin
  ]);

  // Fetch previously computed simulation by identifier
  const handleFetchSimulation = useCallback(async (simIdToFetch) => {
    const target = simIdToFetch || loadSimId;
    if (!target) return;
    setIsSimulating(true);
    try {
      const res = await fetchDamBreachSimulation(target);
      if (res) {
        setSimulationResult(res);
        setScrubberTimeMinutes(0);
        setIsPlaying(false);
      }
    } catch {
      // Fallback
    } finally {
      setIsSimulating(false);
    }
  }, [loadSimId]);


  // Initial simulation computation if none active
  useEffect(() => {
    if (!simulationResult && isOpen) {
      handleRunSimulation();
    }
  }, [isOpen, simulationResult, handleRunSimulation]);

  // Sync activeSimulation from parent if updated externally
  useEffect(() => {
    if (activeSimulation) {
      setSimulationResult(activeSimulation);
    }
  }, [activeSimulation]);

  // Playback timer ticker for wave arrival scrubber
  useEffect(() => {
    if (isPlaying) {
      const maxTimeMin = (simulationResult?.hydrograph?.[simulationResult.hydrograph.length - 1]?.time_minutes) || (simulationDurationHours * 60.0);
      timerRef.current = setInterval(() => {
        setScrubberTimeMinutes((prev) => {
          const next = prev + (5.0 * playbackSpeed);
          if (next >= maxTimeMin) {
            setIsPlaying(false);
            return maxTimeMin;
          }
          return next;
        });
      }, 500);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, simulationResult, simulationDurationHours]);

  // Quick Scrubber Control Handlers
  const handlePlayPause = () => setIsPlaying(!isPlaying);
  const handleResetScrubber = () => {
    setIsPlaying(false);
    setScrubberTimeMinutes(0);
  };
  const handleStepBack = () => {
    setScrubberTimeMinutes((prev) => Math.max(0, prev - 15));
  };
  const handleStepForward = () => {
    const maxTimeMin = (simulationResult?.hydrograph?.[simulationResult.hydrograph.length - 1]?.time_minutes) || (simulationDurationHours * 60.0);
    setScrubberTimeMinutes((prev) => Math.min(maxTimeMin, prev + 15));
  };

  // Derive wave front position and active flooded stations at the scrubbed time
  const currentScrubMetrics = useMemo(() => {
    if (!simulationResult?.stations?.length) return null;
    const stations = simulationResult.stations;
    
    // Find stations where wave has arrived by scrubberTimeMinutes
    const flooded = stations.filter(st => st.wave_arrival_time_min <= scrubberTimeMinutes);
    const frontStation = flooded.length > 0 ? flooded[flooded.length - 1] : null;
    const nextStation = flooded.length < stations.length ? stations[flooded.length] : null;

    let reachFloodedKm = 0.0;
    if (frontStation) {
      if (nextStation && scrubberTimeMinutes < nextStation.wave_arrival_time_min) {
        const dt = nextStation.wave_arrival_time_min - frontStation.wave_arrival_time_min;
        const progress = dt > 0 ? (scrubberTimeMinutes - frontStation.wave_arrival_time_min) / dt : 0;
        reachFloodedKm = Number((frontStation.chainage_km + progress * (nextStation.chainage_km - frontStation.chainage_km)).toFixed(2));
      } else {
        reachFloodedKm = frontStation.chainage_km;
      }
    }

    // Current outflow at dam face from hydrograph
    const hydro = simulationResult.hydrograph || [];
    let curDischarge = 0.0;
    let curStage = 0.0;
    if (hydro.length > 0) {
      const match = hydro.find(h => h.time_minutes >= scrubberTimeMinutes) || hydro[hydro.length - 1];
      curDischarge = match.discharge_m3s;
      curStage = match.stage_m;
    }

    return {
      floodedCount: flooded.length,
      totalCount: stations.length,
      reachFloodedKm,
      frontStation,
      curDischarge,
      curStage,
      isWaveInitiated: scrubberTimeMinutes > 0
    };
  }, [simulationResult, scrubberTimeMinutes]);

  // Derived Receptors Status at Current Time
  const evaluatedReceptors = useMemo(() => {
    if (!simulationResult?.stations?.length) return DEFAULT_RECEPTORS;
    return DEFAULT_RECEPTORS.map(rec => {
      // Find closest downstream station
      const st = simulationResult.stations.reduce((prev, curr) => {
        return Math.abs(curr.chainage_km - rec.chainage_km) < Math.abs(prev.chainage_km - rec.chainage_km) ? curr : prev;
      });

      const arrivalMin = st.wave_arrival_time_min;
      const peakDepthM = Math.max(0.1, Number((st.peak_depth_m - rec.elevation_offset_m * 0.4).toFixed(2)));
      const peakVelMs = st.peak_velocity_ms;
      const hazardRating = classifyInundationHazardRating(peakDepthM, peakVelMs);
      const isFlooded = scrubberTimeMinutes >= arrivalMin;
      const timeRemainingMin = Math.max(0, Number((arrivalMin - scrubberTimeMinutes).toFixed(1)));

      return {
        ...rec,
        arrival_time_min: arrivalMin,
        peak_depth_m: peakDepthM,
        peak_velocity_ms: peakVelMs,
        hazard_rating: hazardRating,
        is_flooded: isFlooded,
        time_remaining_min: timeRemainingMin,
        matched_station_id: st.station_id
      };
    });
  }, [simulationResult, scrubberTimeMinutes]);

  // Apply Simulation to Map Explorer
  const handleApplyToMap = () => {
    if (onApplySimulation && simulationResult) {
      onApplySimulation(simulationResult, {
        selectedMetric,
        opacity: tileOpacity
      });
      onClose();
    }
  };

  // Copy Contract JSON
  const handleCopyContract = () => {
    if (!simulationResult) return;
    navigator.clipboard.writeText(JSON.stringify(simulationResult, null, 2));
    setCopiedContract(true);
    setTimeout(() => setCopiedContract(false), 2000);
  };

  // Copy Tile URL
  const handleCopyTileUrl = () => {
    if (!simulationResult) return;
    const url = getHydrodynamicTileUrlTemplate(simulationResult.simulation_id, selectedMetric);
    navigator.clipboard.writeText(url);
    setCopiedTileUrl(true);
    setTimeout(() => setCopiedTileUrl(false), 2000);
  };

  // Chart Data: Outflow Hydrograph
  const hydrographChartData = useMemo(() => {
    if (!simulationResult?.hydrograph?.length) {
      return { labels: [], datasets: [] };
    }
    const hydro = simulationResult.hydrograph;
    const labels = hydro.map(pt => `${pt.time_hours.toFixed(1)}h`);
    const discharges = hydro.map(pt => pt.discharge_m3s);
    const stages = hydro.map(pt => pt.stage_m);

    return {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Breach Outflow Discharge Q(t) (m³/s)',
          data: discharges,
          borderColor: '#06b6d4', // cyan-500
          backgroundColor: 'rgba(6, 182, 212, 0.20)',
          fill: true,
          tension: 0.25,
          pointRadius: 2,
          pointHoverRadius: 5,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Reservoir Pool Head / Stage (m)',
          data: stages,
          borderColor: '#f59e0b', // amber-500
          backgroundColor: 'transparent',
          borderDash: [5, 4],
          pointRadius: 0,
          yAxisID: 'y1'
        }
      ]
    };
  }, [simulationResult]);

  // Chart Options: Outflow Hydrograph
  const hydrographChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { family: 'monospace', size: 11 } }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1'
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } }
      },
      y: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Discharge (m³/s)', color: '#06b6d4' },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
        ticks: { color: '#06b6d4', font: { family: 'monospace', size: 10 } }
      },
      y1: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Reservoir Stage (m)', color: '#f59e0b' },
        grid: { drawOnChartArea: false },
        ticks: { color: '#f59e0b', font: { family: 'monospace', size: 10 } }
      }
    }
  };

  // Chart Data: Wave Arrival & Time to Peak along Reach
  const waveArrivalChartData = useMemo(() => {
    if (!simulationResult?.stations?.length) {
      return { labels: [], datasets: [] };
    }
    const stations = simulationResult.stations;
    const labels = stations.map(st => `${st.chainage_km.toFixed(1)} km`);
    const arrivalTimes = stations.map(st => st.wave_arrival_time_min);
    const peakTimes = stations.map(st => st.time_to_peak_min);
    const evacWindows = stations.map(st => st.evacuation_time_window_min);

    return {
      labels,
      datasets: [
        {
          label: 'Wave Front Arrival Time (min)',
          data: arrivalTimes,
          borderColor: '#3b82f6', // blue-500
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          fill: false,
          tension: 0.2,
          pointRadius: 3,
          yAxisID: 'y'
        },
        {
          label: 'Time to Peak Stage (min)',
          data: peakTimes,
          borderColor: '#8b5cf6', // purple-500
          borderDash: [4, 4],
          fill: false,
          tension: 0.2,
          pointRadius: 2,
          yAxisID: 'y'
        },
        {
          label: 'Safe Evacuation Window (min)',
          data: evacWindows,
          borderColor: '#10b981', // emerald-500
          fill: false,
          tension: 0.2,
          pointRadius: 2,
          yAxisID: 'y'
        }
      ]
    };
  }, [simulationResult]);

  // Chart Data: Valley Longitudinal Transect Profile (Bed Elevation vs WSE & Depth)
  const longitudinalChartData = useMemo(() => {
    if (!simulationResult?.stations?.length) {
      return { labels: [], datasets: [] };
    }
    const stations = simulationResult.stations;
    const labels = stations.map(st => `km ${st.chainage_km.toFixed(1)}`);
    const bedElevs = stations.map(st => st.bed_elevation_m);
    const wseVals = stations.map(st => st.peak_wse_m);
    const depths = stations.map(st => st.peak_depth_m);

    return {
      labels,
      datasets: [
        {
          type: 'line',
          label: 'Peak Water Surface Elevation (WSE, m)',
          data: wseVals,
          borderColor: '#38bdf8', // sky-400
          backgroundColor: 'rgba(56, 189, 248, 0.25)',
          fill: '+1',
          tension: 0.15,
          pointRadius: 3,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Valley Thalweg Bed Elevation (m)',
          data: bedElevs,
          borderColor: '#78716c', // stone-500
          backgroundColor: '#292524',
          fill: 'origin',
          tension: 0.15,
          pointRadius: 2,
          yAxisID: 'y'
        },
        {
          type: 'bar',
          label: 'Peak Inundation Depth (m)',
          data: depths,
          backgroundColor: 'rgba(239, 68, 68, 0.45)',
          borderColor: '#ef4444',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    };
  }, [simulationResult]);

  const longitudinalChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: { color: '#94a3b8', font: { family: 'monospace', size: 11 } }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1'
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.06)' },
        ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } }
      },
      y: {
        type: 'linear',
        position: 'left',
        title: { display: true, text: 'Elevation (m ASL)', color: '#38bdf8' },
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
        ticks: { color: '#38bdf8', font: { family: 'monospace', size: 10 } }
      },
      y1: {
        type: 'linear',
        position: 'right',
        title: { display: true, text: 'Inundation Depth (m)', color: '#ef4444' },
        grid: { drawOnChartArea: false },
        ticks: { color: '#ef4444', font: { family: 'monospace', size: 10 } },
        min: 0
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-7xl h-[92vh] bg-[#090d16] border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden text-slate-200 font-sans">
        
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900/90 border-b border-cyan-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Waves className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Tailings Dam Breach Hydrodynamic Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Cycle v2.5.18
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase rounded bg-slate-800 text-slate-300">
                  Froehlich (2008) • 2D De Saint-Venant
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Physical hydrograph peak discharge, shallow water wave arrival attenuation & downstream inundation hazards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {simulationResult && (
              <button
                onClick={handleApplyToMap}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-600/30 transition-all font-mono uppercase"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Apply to Map Explorer</span>
              </button>
            )}
            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-all disabled:opacity-50 font-mono uppercase"
            >
              <Activity className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
              <span>{isSimulating ? 'Simulating...' : 'Recalculate Run'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-6 bg-slate-950 border-b border-slate-800/80 flex items-center justify-between overflow-x-auto">
          <div className="flex items-center gap-1 py-2">
            {[
              { id: 'hydrograph', label: '1. Breach & Hydrograph', icon: BarChart3 },
              { id: 'wave_arrival', label: '2. Wave Arrival Playback', icon: Clock },
              { id: 'transect_profile', label: '3. Valley Cross-Sections', icon: TrendingUp },
              { id: 'evacuation', label: '4. Receptors & Evacuation', icon: Users },
              { id: 'tile_inspector', label: '5. Dynamic Tile Layer', icon: Layers }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Quick Simulation Status Badge */}
          {simulationResult && (
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
              <span className="text-slate-500">SIM_ID:</span>
              <span className="text-cyan-400 font-bold">{simulationResult.simulation_id}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] uppercase font-bold"
                style={{
                  backgroundColor: `${DAM_BREACH_HAZARD_CONFIGS[simulationResult.worst_hazard_rating]?.color}25`,
                  color: DAM_BREACH_HAZARD_CONFIGS[simulationResult.worst_hazard_rating]?.color || '#06b6d4'
                }}
              >
                {DAM_BREACH_HAZARD_CONFIGS[simulationResult.worst_hazard_rating]?.badge || 'ACTIVE'}
              </span>
            </div>
          )}
        </div>

        {/* Modal Main Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0f1d]/90">

          {/* =========================================================================
              TAB 1: BREACH GEOMETRY & OUTFLOW HYDROGRAPH
             ========================================================================= */}
          {activeTab === 'hydrograph' && (
            <div className="space-y-6">
              
              {/* Presets and Scenario Banner */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Compass className="w-3 h-3 text-cyan-400" />
                    <span>Benchmark Scenario Analog</span>
                  </label>
                  <select
                    value={selectedPresetKey}
                    onChange={(e) => handleSelectPreset(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {Object.entries(PRESET_SCENARIOS).map(([key, sc]) => (
                      <option key={key} value={key}>{sc.name}</option>
                    ))}
                  </select>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Radio className="w-3 h-3 text-cyan-400" />
                    <span>Initiating Failure Mode</span>
                  </label>
                  <select
                    value={failureMode}
                    onChange={(e) => setFailureMode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="overtopping">Overtopping (k0 = 1.3)</option>
                    <option value="piping">Piping Internal Erosion (k0 = 1.0)</option>
                    <option value="slope_instability">Slope Instability / Shear Slide</option>
                    <option value="seismic_liquefaction">Seismic Liquefaction & Flow</option>
                  </select>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-cyan-400" />
                    <span>Breach Methodology</span>
                  </label>
                  <select
                    value={breachMethodology}
                    onChange={(e) => setBreachMethodology(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="froehlich_2008">Froehlich (2008) Multi-Regression</option>
                    <option value="macdonald_langridge_monopolis_1984">MacDonald & Langridge-Monopolis (1984)</option>
                    <option value="hybrid_ensemble">Hybrid Multi-Model Ensemble</option>
                  </select>
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Gauge className="w-3 h-3 text-cyan-400" />
                    <span>Downstream Valley Roughness</span>
                  </label>
                  <select
                    value={manningRoughnessId}
                    onChange={(e) => handleManningChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {Object.entries(MANNING_ROUGHNESS_CONFIGS).map(([k, cfg]) => (
                      <option key={k} value={k}>{cfg.label} (n={cfg.n})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Physical Parameter Sliders / Numeric Inputs */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Reservoir Vol (m³)</span>
                  <input
                    type="number"
                    value={reservoirVolumeM3}
                    onChange={(e) => setReservoirVolumeM3(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono mt-1"
                  />
                  <span className="text-[9px] text-slate-500">{(reservoirVolumeM3 / 1000000.0).toFixed(2)} M m³</span>
                </div>

                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Dam Height H (m)</span>
                  <input
                    type="number"
                    value={damHeightM}
                    onChange={(e) => setDamHeightM(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono mt-1"
                  />
                  <span className="text-[9px] text-slate-500">Crest to toe elevation</span>
                </div>

                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Water Head hw (m)</span>
                  <input
                    type="number"
                    value={waterDepthM}
                    onChange={(e) => setWaterDepthM(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono mt-1"
                  />
                  <span className="text-[9px] text-slate-500">Depth above invert</span>
                </div>

                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Reach Length (km)</span>
                  <input
                    type="number"
                    value={reachLengthKm}
                    onChange={(e) => setReachLengthKm(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono mt-1"
                  />
                  <span className="text-[9px] text-slate-500">Downstream routing</span>
                </div>

                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Bed Slope S₀ (m/m)</span>
                  <input
                    type="number"
                    step="0.001"
                    value={bedSlope}
                    onChange={(e) => setBedSlope(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono mt-1"
                  />
                  <span className="text-[9px] text-slate-500">{(bedSlope * 100).toFixed(2)}% grade</span>
                </div>

                <div className="p-3 bg-slate-900/70 border border-slate-800 rounded-xl">
                  <span className="text-[10px] font-mono text-slate-400 uppercase">Duration (hours)</span>
                  <input
                    type="number"
                    value={simulationDurationHours}
                    onChange={(e) => setSimulationDurationHours(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-cyan-300 font-mono mt-1"
                  />
                  <span className="text-[9px] text-slate-500">Step: {timeStepMin} min</span>
                </div>
              </div>

              {/* Real-time Empirical Prediction Preview Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-200 font-bold uppercase tracking-wider">Empirical Peak Discharge Forecast:</span>
                </div>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="text-slate-400">
                    Froehlich (2008): <strong className="text-cyan-300">{liveFroehlich.peak_discharge_m3s?.toLocaleString()} m³/s</strong> (B_avg: {liveFroehlich.average_breach_width_m}m, tf: {liveFroehlich.formation_time_minutes}m)
                  </span>
                  <span className="text-slate-400">
                    MacDonald (1984): <strong className="text-purple-300">{liveMacDonald.peak_discharge_m3s?.toLocaleString()} m³/s</strong> (tf: {liveMacDonald.formation_time_minutes}m)
                  </span>
                </div>
              </div>

              {/* KPI Summary Cards */}
              {simulationResult && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/30">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-mono uppercase">Peak Outflow Qp</span>
                      <Waves className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-cyan-300">
                      {simulationResult.peak_discharge_m3s?.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-400">m³/s at dam face</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-mono uppercase">Breach Width Bavg</span>
                      <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {simulationResult.breach_geometry?.average_breach_width_m?.toFixed(1) || '0.0'}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      m (Top: {simulationResult.breach_geometry?.top_breach_width_m?.toFixed(1)}m)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-mono uppercase">Formation Time tf</span>
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {simulationResult.breach_geometry?.formation_time_hours?.toFixed(2) || '0.00'}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      hours ({simulationResult.breach_geometry?.formation_time_minutes?.toFixed(0)} min)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-mono uppercase">Eroded Volume</span>
                      <Droplets className="w-3.5 h-3.5 text-amber-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-white">
                      {(simulationResult.breach_geometry?.eroded_volume_m3 / 1000.0)?.toFixed(0) || '0'}
                    </div>
                    <span className="text-[10px] text-slate-400">k m³ embankment fill</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-mono uppercase">Max Flood Depth</span>
                      <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-rose-400">
                      {simulationResult.max_flood_depth_m?.toFixed(1) || '0.0'} m
                    </div>
                    <span className="text-[10px] text-slate-400">Peak flow: {simulationResult.max_flow_velocity_ms?.toFixed(1)} m/s</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center justify-between text-slate-400 mb-1">
                      <span className="text-[10px] font-mono uppercase">Flooded Reach Area</span>
                      <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {simulationResult.peak_inundation_area_ha?.toLocaleString() || '0'}
                    </div>
                    <span className="text-[10px] text-slate-400">ha ({simulationResult.stations_count || 0} stations)</span>
                  </div>
                </div>
              )}

              {/* Outflow Hydrograph Chart */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                      Breach Outflow Hydrograph Time Series Q(t)
                    </h3>
                  </div>
                  {simulationResult?.peak_discharge_bounds && (
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
                      <span>Froehlich: <strong className="text-cyan-400">{simulationResult.peak_discharge_bounds.froehlich_2008?.toLocaleString()} m³/s</strong></span>
                      <span>MacDonald: <strong className="text-purple-400">{simulationResult.peak_discharge_bounds.macdonald_langridge_monopolis_1984?.toLocaleString()} m³/s</strong></span>
                      <span>USBR Envelope: <strong className="text-amber-400">{simulationResult.peak_discharge_bounds.usbr_envelope_1982?.toLocaleString()} m³/s</strong></span>
                    </div>
                  )}
                </div>

                <div className="h-72 w-full">
                  <Line data={hydrographChartData} options={hydrographChartOptions} />
                </div>
              </div>

              {/* Mathematical Methodology References Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 space-y-1.5">
                <div className="flex items-center gap-2 text-slate-200 font-bold uppercase text-[11px]">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Governing Empirical Formulations</span>
                </div>
                <p>• <strong>Froehlich (2008)</strong>: Peak discharge Qp = 0.607 · Vw^0.295 · hw^1.24; Average breach width B_avg = 0.27 · k0 · Vw^0.32 · hb^0.04; Formation time tf = 63.2 · √(Vw / (g · hb²)).</p>
                <p>• <strong>MacDonald &amp; Langridge-Monopolis (1984)</strong>: Eroded volume V_eroded = 0.0261 · (Vw · hw)^0.769; Peak discharge Qp = 1.154 · (Vw · hw)^0.412; Formation time tf = 0.0179 · V_eroded^0.364.</p>
                <p>• <strong>2D Wave Attenuation</strong>: Discharge attenuation Q(x) = Qp / (1 + 0.038 · x^0.82); Celerity c = √(g · h) + v under Manning resistance n = {manningN}.</p>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 2: DOWNSTREAM WAVE ARRIVAL & PLAYBACK SCRUBBER
             ========================================================================= */}
          {activeTab === 'wave_arrival' && (
            <div className="space-y-6">

              {/* Temporal Wave Arrival Scrubber Controller */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-cyan-500/30 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                      <Clock className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold font-mono text-white tracking-wide">
                        Downstream Flood Wave Propagation Scrubber
                      </h3>
                      <p className="text-xs text-slate-400">
                        Interactive time stepper from breach initiation (t = 0.0h) to downstream dissipation
                      </p>
                    </div>
                  </div>

                  {/* Playback Clock Display */}
                  <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800">
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Elapsed Time</div>
                      <div className="text-lg font-bold font-mono text-cyan-400">
                        {(scrubberTimeMinutes / 60.0).toFixed(2)} <span className="text-xs font-normal text-slate-400">hours</span>
                      </div>
                    </div>
                    <div className="h-6 w-px bg-slate-800" />
                    <div className="text-center">
                      <div className="text-[10px] font-mono text-slate-400 uppercase">Minutes</div>
                      <div className="text-lg font-bold font-mono text-white">
                        {scrubberTimeMinutes.toFixed(0)} <span className="text-xs font-normal text-slate-400">min</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scrubber Range Slider */}
                <div className="space-y-1.5">
                  <input
                    type="range"
                    min="0"
                    max={simulationDurationHours * 60.0}
                    step="2"
                    value={scrubberTimeMinutes}
                    onChange={(e) => setScrubberTimeMinutes(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>t = 0 min (Breach Initiation)</span>
                    <span>t = {(simulationDurationHours * 30.0).toFixed(0)} min</span>
                    <span>t = {(simulationDurationHours * 60.0).toFixed(0)} min (Reach End)</span>
                  </div>
                </div>

                {/* Control Buttons & Playback Speed */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleResetScrubber}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Reset to 0"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleStepBack}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Step back 15 min"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handlePlayPause}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold transition shadow-lg shadow-cyan-600/30"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlaying ? 'PAUSE PLAYBACK' : 'PLAY SIMULATION'}</span>
                    </button>
                    <button
                      onClick={handleStepForward}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                      title="Step forward 15 min"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Playback Speed Toggles */}
                  <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <span className="text-[10px] font-mono text-slate-500 px-1.5">Speed:</span>
                    {[1.0, 2.0, 5.0, 10.0].map(spd => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition ${
                          playbackSpeed === spd 
                            ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' 
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Dynamic Wave Front Tracking Status Cards */}
              {currentScrubMetrics && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Flooded Reach Distance</div>
                    <div className="text-xl font-bold font-mono text-cyan-300">
                      {currentScrubMetrics.reachFloodedKm} <span className="text-xs text-slate-400">km</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {currentScrubMetrics.floodedCount} of {currentScrubMetrics.totalCount} valley stations flooded
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Dam Face Outflow Q(t)</div>
                    <div className="text-xl font-bold font-mono text-white">
                      {currentScrubMetrics.curDischarge?.toLocaleString()} <span className="text-xs text-slate-400">m³/s</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Pool head remaining: {currentScrubMetrics.curStage?.toFixed(1)} m
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Wave Front Location</div>
                    <div className="text-xl font-bold font-mono text-purple-400">
                      {currentScrubMetrics.frontStation ? currentScrubMetrics.frontStation.station_name : 'At Dam Face'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {currentScrubMetrics.frontStation ? `Front velocity: ${currentScrubMetrics.frontStation.peak_velocity_ms} m/s` : 'Pre-breach state'}
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">Active Hazard Severity</div>
                    <div className="text-xl font-bold font-mono text-rose-400 uppercase">
                      {currentScrubMetrics.frontStation?.inundation_hazard_rating || 'NOMINAL'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Front depth: {currentScrubMetrics.frontStation?.peak_depth_m?.toFixed(1) || '0.0'} m
                    </div>
                  </div>
                </div>
              )}

              {/* Wave Arrival & Travel Time Curve Chart */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                    Downstream Flood Wave Arrival & Evacuation Time Window (Celerity c = √(g·h) + v)
                  </h3>
                </div>
                <div className="h-72 w-full">
                  <Line data={waveArrivalChartData} options={hydrographChartOptions} />
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 3: VALLEY CROSS-SECTIONS & LONGITUDINAL PROFILE
             ========================================================================= */}
          {activeTab === 'transect_profile' && (
            <div className="space-y-6">

              {/* Longitudinal Profile Chart */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-400" />
                    <h3 className="text-xs font-bold font-mono text-white uppercase tracking-wider">
                      Longitudinal Valley Thalweg & Peak Flood Stage Profile
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Reach: 0 to {reachLengthKm} km • Bed Slope S₀ = {(bedSlope * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="h-72 w-full">
                  <Line data={longitudinalChartData} options={longitudinalChartOptions} />
                </div>
              </div>

              {/* Downstream Stations Cross-Section Table */}
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold font-mono text-white uppercase">
                      Downstream Hydrodynamic Station Transects ({simulationResult?.stations?.length || 0} Points)
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">1,000m Station Spacing</span>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Station</th>
                        <th className="py-2.5 px-3">Chainage</th>
                        <th className="py-2.5 px-3">Bed Elev</th>
                        <th className="py-2.5 px-3">Peak Depth</th>
                        <th className="py-2.5 px-3">Peak WSE</th>
                        <th className="py-2.5 px-3">Velocity</th>
                        <th className="py-2.5 px-3">h × v</th>
                        <th className="py-2.5 px-3">Arrival Time</th>
                        <th className="py-2.5 px-3">Evac Window</th>
                        <th className="py-2.5 px-3">Hazard Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {simulationResult?.stations?.map((st) => {
                        const hCfg = DAM_BREACH_HAZARD_CONFIGS[st.inundation_hazard_rating] || DAM_BREACH_HAZARD_CONFIGS.low;
                        return (
                          <tr key={st.station_id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2 px-3 font-bold text-white">{st.station_id}</td>
                            <td className="py-2 px-3">{st.chainage_km.toFixed(1)} km</td>
                            <td className="py-2 px-3">{st.bed_elevation_m.toFixed(1)} m</td>
                            <td className="py-2 px-3 text-cyan-300 font-bold">{st.peak_depth_m.toFixed(2)} m</td>
                            <td className="py-2 px-3 text-sky-300">{st.peak_wse_m.toFixed(1)} m</td>
                            <td className="py-2 px-3">{st.peak_velocity_ms.toFixed(2)} m/s</td>
                            <td className="py-2 px-3">{st.depth_velocity_product_m2s.toFixed(2)} m²/s</td>
                            <td className="py-2 px-3 text-blue-400 font-bold">{st.wave_arrival_time_min.toFixed(0)} min</td>
                            <td className="py-2 px-3 text-emerald-400">{st.evacuation_time_window_min.toFixed(0)} min</td>
                            <td className="py-2 px-3">
                              <span
                                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                                style={{ backgroundColor: `${hCfg.color}25`, color: hCfg.color }}
                              >
                                {hCfg.badge}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 4: RECEPTORS EXPOSURE & EVACUATION CORRIDORS
             ========================================================================= */}
          {activeTab === 'evacuation' && (
            <div className="space-y-6">

              {/* Exposure Summary Alert Banner */}
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3">
                <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold font-mono text-rose-300 uppercase tracking-wider">
                    Downstream Vulnerability Assessment & Emergency Evacuation Priority
                  </h4>
                  <p className="text-xs text-slate-300 mt-1">
                    Based on hydrodynamic wave celerity and breach peak discharge, downstream assets are categorized by expected arrival time and impulse hazard (h × v). Emergency Action Plan (EAP) Level 3 evacuation routes must follow designated upland corridors.
                  </p>
                </div>
              </div>

              {/* Critical Receptors Table */}
              <div className="rounded-xl bg-slate-900/80 border border-slate-800 overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold font-mono text-white uppercase">
                      Downstream Receptors Exposure & Evacuation Windows
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Scrubber Time: {(scrubberTimeMinutes / 60.0).toFixed(1)}h ({scrubberTimeMinutes.toFixed(0)} min)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Receptor Asset</th>
                        <th className="py-2.5 px-3">Chainage</th>
                        <th className="py-2.5 px-3">Population</th>
                        <th className="py-2.5 px-3">Wave Arrival</th>
                        <th className="py-2.5 px-3">Time Left</th>
                        <th className="py-2.5 px-3">Peak Depth</th>
                        <th className="py-2.5 px-3">Peak Velocity</th>
                        <th className="py-2.5 px-3">Hazard Tier</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Designated Safe Corridor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {evaluatedReceptors.map((rec) => {
                        const hCfg = DAM_BREACH_HAZARD_CONFIGS[rec.hazard_rating] || DAM_BREACH_HAZARD_CONFIGS.low;
                        return (
                          <tr key={rec.id} className="hover:bg-slate-800/40 transition">
                            <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                              <span>{rec.name}</span>
                            </td>
                            <td className="py-2.5 px-3">{rec.chainage_km.toFixed(1)} km</td>
                            <td className="py-2.5 px-3 text-slate-300">{rec.population} persons</td>
                            <td className="py-2.5 px-3 text-cyan-400 font-bold">{rec.arrival_time_min?.toFixed(0)} min</td>
                            <td className="py-2.5 px-3">
                              {rec.is_flooded ? (
                                <span className="text-rose-400 font-bold uppercase text-[10px]">FLOODED</span>
                              ) : (
                                <span className="text-amber-400 font-bold">{rec.time_remaining_min?.toFixed(0)} min</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-rose-300 font-bold">{rec.peak_depth_m?.toFixed(2)} m</td>
                            <td className="py-2.5 px-3">{rec.peak_velocity_ms?.toFixed(2)} m/s</td>
                            <td className="py-2.5 px-3">
                              <span
                                className="px-2 py-0.5 rounded text-[9px] font-bold uppercase"
                                style={{ backgroundColor: `${hCfg.color}25`, color: hCfg.color }}
                              >
                                {hCfg.badge}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              {rec.is_flooded ? (
                                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase border border-rose-500/30">
                                  IMPACTED
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase border border-emerald-500/30">
                                  CLEAR
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-sans text-xs">
                              {rec.safe_zone}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hazard Severity Tiers Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {Object.entries(DAM_BREACH_HAZARD_CONFIGS).map(([k, cfg]) => (
                  <div key={k} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase" style={{ color: cfg.color }}>
                        {cfg.badge}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500">
                        {cfg.max_depth_m > 1000 ? `>${cfg.min_depth_m}m` : `${cfg.min_depth_m}-${cfg.max_depth_m}m`}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white">{cfg.label}</div>
                    <p className="text-[10px] text-slate-400">{cfg.description}</p>
                    <div className="text-[10px] text-cyan-400 pt-1 border-t border-slate-800/80">
                      <strong>Action:</strong> {cfg.action}
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}

          {/* =========================================================================
              TAB 5: DYNAMIC XYZ TILE LAYER INSPECTOR
             ========================================================================= */}
          {activeTab === 'tile_inspector' && (
            <div className="space-y-6">

              {/* Metric Selector and Symbology Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 rounded-xl bg-slate-900/80 border border-slate-800">
                
                {/* Metric Dropdown */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dynamic Tile Metric Product</span>
                  </label>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                  >
                    {Object.entries(HYDRODYNAMIC_TILE_METRICS).map(([k, met]) => (
                      <option key={k} value={k}>
                        {met.name} ({met.unit})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    {HYDRODYNAMIC_TILE_METRICS[selectedMetric]?.description}
                  </p>
                </div>

                {/* Opacity Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-[11px] font-mono uppercase text-slate-400 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Layer Transparency / Opacity</span>
                    </label>
                    <span className="text-xs font-mono text-cyan-400 font-bold">
                      {Math.round(tileOpacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.10"
                    max="1.0"
                    step="0.05"
                    value={tileOpacity}
                    onChange={(e) => setTileOpacity(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                    <span>10% (Subtle)</span>
                    <span>100% (Solid Opaque)</span>
                  </div>
                </div>

                {/* Colormap Ramp Preview */}
                <div>
                  <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1.5">
                    Scientific Symbology Ramp
                  </label>
                  <div className="h-9 rounded-lg bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-700 flex items-center justify-between px-3 text-[10px] font-mono text-white font-bold shadow-inner">
                    <span>Min ({HYDRODYNAMIC_TILE_METRICS[selectedMetric]?.min || 0} {HYDRODYNAMIC_TILE_METRICS[selectedMetric]?.unit})</span>
                    <span>Max ({HYDRODYNAMIC_TILE_METRICS[selectedMetric]?.max || 10} {HYDRODYNAMIC_TILE_METRICS[selectedMetric]?.unit})</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    Colormap: {HYDRODYNAMIC_TILE_METRICS[selectedMetric]?.colormap || 'blues'}
                  </span>
                </div>
              </div>

              {/* Retrieve Historical Hydrodynamic Simulation */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Retrieve Historical Hydrodynamic Simulation Run</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter Simulation ID (e.g., BREACH_SIM_...)"
                    value={loadSimId}
                    onChange={(e) => setLoadSimId(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    onClick={() => handleFetchSimulation()}
                    disabled={isSimulating || !loadSimId.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold uppercase transition disabled:opacity-50"
                  >
                    Load Run
                  </button>
                </div>
              </div>

              {/* Streaming URL Template Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Dynamic XYZ Raster Streaming Endpoint Template</span>
                  </span>
                  <button
                    onClick={handleCopyTileUrl}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 transition"
                  >
                    {copiedTileUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedTileUrl ? 'Copied' : 'Copy URL'}</span>
                  </button>
                </div>
                <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 font-mono text-xs text-cyan-400 select-all break-all">
                  {simulationResult ? buildHydrodynamicTileUrlTemplate(simulationResult.simulation_id, selectedMetric) : '/api/v1/tiles/hydrodynamic/inundation/{simId}/{metric}/{z}/{x}/{y}.png'}
                </div>
              </div>

              {/* JSON Simulation Contract Payload Inspector */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                    <span>DamBreachInundationAnalysisResponse Contract Payload</span>
                  </span>
                  <button
                    onClick={handleCopyContract}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-cyan-300 transition"
                  >
                    {copiedContract ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedContract ? 'Copied JSON' : 'Copy JSON'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-slate-900 border border-slate-800/80 rounded font-mono text-[11px] text-slate-300 max-h-60 overflow-y-auto">
                  {simulationResult ? JSON.stringify(simulationResult, null, 2) : 'No simulation executed yet.'}
                </pre>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleApplyToMap}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono font-bold text-xs shadow-lg shadow-cyan-600/30 transition-all uppercase"
                >
                  <Layers className="w-4 h-4" />
                  <span>Broadcast Layer to Web GIS Map Explorer</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
