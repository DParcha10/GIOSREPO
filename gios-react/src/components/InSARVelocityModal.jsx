import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, Radio, Compass, Activity, SlidersHorizontal, Layers, Eye, Copy, Check,
  CheckCircle2, ShieldAlert, AlertTriangle, ArrowRight, Info, Play, RefreshCw,
  BarChart3, TrendingUp, Search, Sliders, ChevronRight, HelpCircle, MapPin
} from 'lucide-react';
import { 
  analyzeInSARPersistentScatterers,
  fetchInSARSimulation,
  decomposeDualOrbitInSAR,
  getInSARVelocityTileUrlTemplate
} from '../api/giosApi';
import { 
  INSAR_HAZARD_CONFIGS,
  INSAR_VELOCITY_TILE_METRICS,
  INSAR_SENSOR_WAVELENGTHS,
  calculateInterferometricBaselineGeometry,
  decomposeDualOrbitInSARVelocities,
  calculateInSARPersistentScattererAnalysis,
  buildInSARVelocityTileUrlTemplate
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Benchmark Pre-Configured InSAR Monitoring Scenarios
const PRESET_SCENARIOS = {
  cadia_ntsf_prebreach_creep: {
    id: 'cadia_ntsf_prebreach_creep',
    name: 'Cadia Northern Tailings Facility Pre-Breach Creep (Australia)',
    asset_id: 'DAM_CADIA_NTSF_01',
    asset_name: 'Cadia Valley NTSF Embankment Crest',
    coordinates: [148.9950, -33.4730],
    satellite_mission: 'sentinel-1',
    sensor_band: 'c_band',
    orbit_direction: 'ascending',
    incidence_angle_deg: 38.5,
    heading_angle_deg: 348.0,
    perpendicular_baseline_m: 42.0,
    parallel_baseline_m: 6.0,
    temporal_coherence_threshold: 0.65,
    ps_points_count: 28,
    description: 'Rapid embankment toe and crest deformation precursor prior to the March 2018 foundation shear failure.'
  },
  san_luis_crest_subsidence: {
    id: 'san_luis_crest_subsidence',
    name: 'San Luis Dam Crest Consolidation Subsidence (California)',
    asset_id: 'DAM_SAN_LUIS_01',
    asset_name: 'B.F. Sisk San Luis Dam Crest Embankment',
    coordinates: [-121.0500, 37.0500],
    satellite_mission: 'sentinel-1',
    sensor_band: 'c_band',
    orbit_direction: 'descending',
    incidence_angle_deg: 39.2,
    heading_angle_deg: 192.0,
    perpendicular_baseline_m: 35.0,
    parallel_baseline_m: 4.0,
    temporal_coherence_threshold: 0.70,
    ps_points_count: 32,
    description: 'Long-term post-construction consolidation creep and seasonal drawdown subsidence monitoring.'
  },
  brumadinho_precursor_shear: {
    id: 'brumadinho_precursor_shear',
    name: 'Brumadinho Dam B1 Precursor Shear Deformation (Brazil)',
    asset_id: 'DAM_BRUMADINHO_B1',
    asset_name: 'Córrego do Feijão Dam B1 Embankment Face',
    coordinates: [-44.1189, -20.1200],
    satellite_mission: 'sentinel-1',
    sensor_band: 'c_band',
    orbit_direction: 'ascending',
    incidence_angle_deg: 36.8,
    heading_angle_deg: 348.0,
    perpendicular_baseline_m: 55.0,
    parallel_baseline_m: 8.0,
    temporal_coherence_threshold: 0.60,
    ps_points_count: 30,
    description: 'Accelerated millimeter creep and progressive internal creep preceding catastrophic static liquefaction.'
  },
  oroville_spillway_crest_baseline: {
    id: 'oroville_spillway_crest_baseline',
    name: 'Oroville Dam Emergency Spillway Headworks Baseline (California)',
    asset_id: 'DAM_OROVILLE_01',
    asset_name: 'Oroville Dam Concrete Spillway Headworks',
    coordinates: [-121.4880, 39.5390],
    satellite_mission: 'sentinel-1',
    sensor_band: 'c_band',
    orbit_direction: 'ascending',
    incidence_angle_deg: 41.5,
    heading_angle_deg: 348.0,
    perpendicular_baseline_m: 28.0,
    parallel_baseline_m: 3.0,
    temporal_coherence_threshold: 0.75,
    ps_points_count: 24,
    description: 'Post-reconstruction structural stability baseline verification of concrete crest monoliths.'
  }
};

export const InSARVelocityModal = ({
  isOpen,
  onClose,
  activeSimulation,
  onApplyToMap
}) => {
  // Navigation Tabs: 'parameters' | 'timeseries' | 'dual_orbit' | 'scatterers_aps' | 'tiles'
  const [activeTab, setActiveTab] = useState('parameters');

  // Selected Preset
  const [selectedPresetId, setSelectedPresetId] = useState('cadia_ntsf_prebreach_creep');

  // Form Inputs
  const [assetId, setAssetId] = useState('DAM_CADIA_NTSF_01');
  const [assetName, setAssetName] = useState('Cadia Valley NTSF Embankment Crest');
  const [satelliteMission, setSatelliteMission] = useState('sentinel-1');
  const [sensorBand, setSensorBand] = useState('c_band');
  const [orbitDirection, setOrbitDirection] = useState('ascending');
  const [incidenceAngleDeg, setIncidenceAngleDeg] = useState(38.5);
  const [headingAngleDeg, setHeadingAngleDeg] = useState(348.0);
  const [perpendicularBaselineM, setPerpendicularBaselineM] = useState(42.0);
  const [parallelBaselineM, setParallelBaselineM] = useState(6.0);
  const [coherenceThreshold, setCoherenceThreshold] = useState(0.65);
  const [psPointsCount, setPsPointsCount] = useState(28);

  // Dual-Orbit Calculator State (Tab 3)
  const [calcAscVelocity, setCalcAscVelocity] = useState(-8.4);
  const [calcDescVelocity, setCalcDescVelocity] = useState(-9.2);
  const [calcIncAsc, setCalcIncAsc] = useState(38.5);
  const [calcIncDesc, setCalcIncDesc] = useState(39.2);
  const [calcHeadAsc, setCalcHeadAsc] = useState(348.0);
  const [calcHeadDesc, setCalcHeadDesc] = useState(192.0);
  const [isSolvingDualOrbit, setIsSolvingDualOrbit] = useState(false);
  const [dualOrbitApiResult, setDualOrbitApiResult] = useState(null);

  // Time-Series & Scatterer Selection State
  const [selectedPointId, setSelectedPointId] = useState('PS_01');
  const [scattererSearchTerm, setScattererSearchTerm] = useState('');
  const [hazardTierFilter, setHazardTierFilter] = useState('all');

  // Dynamic Tile Layer State
  const [selectedMetric, setSelectedMetric] = useState('velocity_vertical');
  const [tileOpacity, setTileOpacity] = useState(0.85);
  const [copiedTileUrl, setCopiedTileUrl] = useState(false);

  // Simulation Results & Loading State
  const [simulation, setSimulation] = useState(activeSimulation || null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simError, setSimError] = useState(null);
  const [simLookupId, setSimLookupId] = useState('');
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  // Initialize simulation with default preset if none exists
  useEffect(() => {
    if (activeSimulation) {
      setSimulation(activeSimulation);
      if (activeSimulation.critical_ps_point_id) {
        setSelectedPointId(activeSimulation.critical_ps_point_id);
      }
    } else if (!simulation) {
      const defaultRun = calculateInSARPersistentScattererAnalysis({
        preset_id: 'cadia_ntsf_prebreach_creep',
        asset_id: 'DAM_CADIA_NTSF_01',
        asset_name: 'Cadia Valley NTSF Embankment Crest',
        satellite_mission: 'sentinel-1',
        sensor_band: 'c_band',
        orbit_direction: 'ascending',
        incidence_angle_deg: 38.5,
        heading_angle_deg: 348.0,
        perpendicular_baseline_m: 42.0,
        parallel_baseline_m: 6.0,
        temporal_coherence_threshold: 0.65,
        ps_points_count: 28
      });
      setSimulation(defaultRun);
      if (defaultRun.critical_ps_point_id) {
        setSelectedPointId(defaultRun.critical_ps_point_id);
      }
    }
  }, [activeSimulation, simulation]);

  // Handle Preset Switching
  const handleSelectPreset = useCallback((presetKey) => {
    const p = PRESET_SCENARIOS[presetKey];
    if (!p) return;
    setSelectedPresetId(presetKey);
    setAssetId(p.asset_id);
    setAssetName(p.asset_name);
    setSatelliteMission(p.satellite_mission);
    setSensorBand(p.sensor_band);
    setOrbitDirection(p.orbit_direction);
    setIncidenceAngleDeg(p.incidence_angle_deg);
    setHeadingAngleDeg(p.heading_angle_deg);
    setPerpendicularBaselineM(p.perpendicular_baseline_m);
    setParallelBaselineM(p.parallel_baseline_m);
    setCoherenceThreshold(p.temporal_coherence_threshold);
    setPsPointsCount(p.ps_points_count);
  }, []);

  // Real-Time Baseline Geometry Inversion Preview
  const liveBaseline = useMemo(() => {
    const wavelength = INSAR_SENSOR_WAVELENGTHS[sensorBand] || 0.055465;
    return calculateInterferometricBaselineGeometry({
      perpendicular_baseline_m: perpendicularBaselineM,
      parallel_baseline_m: parallelBaselineM,
      slant_range_m: 850000.0,
      incidence_angle_deg: incidenceAngleDeg,
      wavelength_m: wavelength
    });
  }, [perpendicularBaselineM, parallelBaselineM, incidenceAngleDeg, sensorBand]);

  // Execute PS-InSAR Simulation
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    setSimError(null);

    const payload = {
      asset_id: assetId,
      asset_name: assetName,
      satellite_mission: satelliteMission,
      sensor_band: sensorBand,
      orbit_direction: orbitDirection,
      incidence_angle_deg: incidenceAngleDeg,
      heading_angle_deg: headingAngleDeg,
      temporal_coherence_threshold: coherenceThreshold,
      perpendicular_baseline_m: perpendicularBaselineM,
      parallel_baseline_m: parallelBaselineM,
      ps_points_count: psPointsCount
    };

    try {
      let result;
      try {
        result = await analyzeInSARPersistentScatterers(payload);
      } catch {
        // Fallback to offline mathematical calculation
        result = calculateInSARPersistentScattererAnalysis(payload);
      }

      setSimulation(result);
      if (result.critical_ps_point_id) {
        setSelectedPointId(result.critical_ps_point_id);
      }
    } catch (err) {
      setSimError(err.message || 'PS-InSAR simulation execution failed');
    } finally {
      setIsSimulating(false);
    }
  };

  // Fetch Historical Simulation Run
  const handleFetchHistorical = async () => {
    if (!simLookupId.trim()) return;
    setIsFetchingHistory(true);
    setSimError(null);
    try {
      const res = await fetchInSARSimulation(simLookupId.trim());
      setSimulation(res);
      if (res.critical_ps_point_id) {
        setSelectedPointId(res.critical_ps_point_id);
      }
    } catch (err) {
      setSimError(`Could not retrieve simulation ${simLookupId}: ${err.message}`);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  // Copy Dynamic Tile URL Template
  const handleCopyTileUrl = () => {
    if (!simulation) return;
    const url = getInSARVelocityTileUrlTemplate(simulation.simulation_id, selectedMetric);
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
        tileUrlTemplate: simulation.tile_url_template || buildInSARVelocityTileUrlTemplate(simulation.simulation_id, selectedMetric)
      });
    }
  };

  // Dual-Orbit Live Calculation Solver (Tab 3)
  const dualOrbitCalcResult = useMemo(() => {
    return decomposeDualOrbitInSARVelocities({
      velocity_asc_mm_yr: calcAscVelocity,
      velocity_desc_mm_yr: calcDescVelocity,
      inc_angle_asc_deg: calcIncAsc,
      inc_angle_desc_deg: calcIncDesc,
      heading_asc_deg: calcHeadAsc,
      heading_desc_deg: calcHeadDesc
    });
  }, [calcAscVelocity, calcDescVelocity, calcIncAsc, calcIncDesc, calcHeadAsc, calcHeadDesc]);

  // Async Dual Orbit API Solver Handler
  const handleSolveDualOrbit = async () => {
    setIsSolvingDualOrbit(true);
    try {
      const res = await decomposeDualOrbitInSAR({
        velocity_asc_mm_yr: calcAscVelocity,
        velocity_desc_mm_yr: calcDescVelocity,
        inc_angle_asc_deg: calcIncAsc,
        inc_angle_desc_deg: calcIncDesc,
        heading_asc_deg: calcHeadAsc,
        heading_desc_deg: calcHeadDesc
      });
      setDualOrbitApiResult(res);
    } catch {
      setDualOrbitApiResult(null);
    } finally {
      setIsSolvingDualOrbit(false);
    }
  };

  const activeDualOrbitResult = dualOrbitApiResult || dualOrbitCalcResult;

  // Selected PS Point Object
  const selectedPoint = useMemo(() => {
    if (!simulation?.ps_points || simulation.ps_points.length === 0) return null;
    return simulation.ps_points.find(p => p.point_id === selectedPointId) || simulation.ps_points[0];
  }, [simulation, selectedPointId]);

  // Chart 1: Multi-Temporal Millimeter Displacement Time-Series
  const timeSeriesChartData = useMemo(() => {
    if (!selectedPoint || !selectedPoint.time_series) return null;
    const ts = selectedPoint.time_series;
    const labels = ts.map(item => item.date);
    const dispData = ts.map(item => item.displacement_mm);
    const upperData = ts.map(item => Number((item.displacement_mm + (item.displacement_uncertainty_mm || 1.2)).toFixed(2)));
    const lowerData = ts.map(item => Number((item.displacement_mm - (item.displacement_uncertainty_mm || 1.2)).toFixed(2)));

    // Linear regression line
    const n = ts.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += ts[i].displacement_mm;
      sumXY += i * ts[i].displacement_mm;
      sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / Math.max(1, (n * sumX2 - sumX * sumX));
    const intercept = (sumY - slope * sumX) / n;
    const trendData = ts.map((_, i) => Number((slope * i + intercept).toFixed(2)));

    const isSevere = Math.abs(selectedPoint.velocity_vertical_mm_yr) >= 12.0;

    return {
      labels,
      datasets: [
        {
          label: 'InSAR Displacement (mm)',
          data: dispData,
          borderColor: isSevere ? '#ef4444' : '#8b5cf6',
          backgroundColor: isSevere ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: false,
          tension: 0.2
        },
        {
          label: 'Linear Velocity Rate (mm/yr)',
          data: trendData,
          borderColor: '#f59e0b',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'Upper 1-σ Uncertainty (+1.2mm)',
          data: upperData,
          borderColor: 'transparent',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          pointRadius: 0,
          fill: '+1'
        },
        {
          label: 'Lower 1-σ Uncertainty (-1.2mm)',
          data: lowerData,
          borderColor: 'transparent',
          backgroundColor: 'transparent',
          pointRadius: 0,
          fill: false
        }
      ]
    };
  }, [selectedPoint]);

  // Chart 2: Retained Scatterers Velocity Distribution Histogram
  const velocityHistogramChartData = useMemo(() => {
    if (!simulation?.ps_points || simulation.ps_points.length === 0) return null;
    const bins = [
      { label: '< -15 mm/yr (Severe Subsidence)', min: -999, max: -15, count: 0, color: '#ef4444' },
      { label: '-15 to -5 mm/yr (Accelerating)', min: -15, max: -5, count: 0, color: '#f97316' },
      { label: '-5 to -2 mm/yr (Moderate)', min: -5, max: -2, count: 0, color: '#f59e0b' },
      { label: '-2 to +2 mm/yr (Stable Baseline)', min: -2, max: 2, count: 0, color: '#10b981' },
      { label: '> +2 mm/yr (Uplift / Rebound)', min: 2, max: 999, count: 0, color: '#38bdf8' }
    ];

    simulation.ps_points.forEach(p => {
      const v = p.velocity_vertical_mm_yr;
      const bin = bins.find(b => v >= b.min && v < b.max);
      if (bin) bin.count += 1;
    });

    return {
      labels: bins.map(b => b.label),
      datasets: [
        {
          label: 'Scatterer Count',
          data: bins.map(b => b.count),
          backgroundColor: bins.map(b => b.color),
          borderColor: '#1e293b',
          borderWidth: 1.5,
          borderRadius: 4
        }
      ]
    };
  }, [simulation]);

  // Filtered Scatterers List for Tab 4
  const filteredScatterers = useMemo(() => {
    if (!simulation?.ps_points) return [];
    return simulation.ps_points.filter(p => {
      const matchSearch = scattererSearchTerm.trim() === '' || 
        p.point_id.toLowerCase().includes(scattererSearchTerm.toLowerCase());
      const matchTier = hazardTierFilter === 'all' || p.hazard_tier === hazardTierFilter;
      return matchSearch && matchTier;
    });
  }, [simulation, scattererSearchTerm, hazardTierFilter]);

  if (!isOpen) return null;

  const worstHazardConfig = INSAR_HAZARD_CONFIGS[simulation?.worst_hazard_tier] || INSAR_HAZARD_CONFIGS.stable;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 text-violet-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  InSAR Persistent Scatterer Velocity Studio
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-violet-950/80 text-violet-400 border border-violet-700/50">
                  Cycle v2.5.20
                </span>
              </div>
              <p className="text-xs text-slate-400">
                StaMPS PSI Phase Unwrapping • Millimeter Creep Inversion • 3D Dual-Orbit Vector Decomposition • Dynamic Leaflet Deformation Tiles
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

        {/* Live Empirical Parameter & Hazard Inversion Banner */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Sensor Band:</span>
              <span className="font-bold text-violet-400 uppercase">
                {simulation?.sensor_band || sensorBand} (λ = {((INSAR_SENSOR_WAVELENGTHS[simulation?.sensor_band || sensorBand] || 0.055465) * 1000).toFixed(1)}mm)
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Baseline B_perp:</span>
              <span className="font-bold text-cyan-400">
                {simulation?.baseline_geometry?.perpendicular_baseline_m ?? perpendicularBaselineM} m
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Ambiguity h_a:</span>
              <span className="font-bold text-emerald-400">
                {simulation?.baseline_geometry?.height_of_ambiguity_m ?? liveBaseline.height_of_ambiguity_m} m
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">PS Retained:</span>
              <span className="font-bold text-white">
                {simulation?.ps_points_retained ?? 0} / {simulation?.ps_candidates_evaluated ?? psPointsCount}
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Mean Coherence:</span>
              <span className="font-bold text-amber-400">
                {simulation?.mean_temporal_coherence?.toFixed(3) ?? '0.000'}
              </span>
            </div>
            <div className="w-px h-3 bg-slate-700" />
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Max Subsidence:</span>
              <span className={`font-bold ${
                (simulation?.max_subsidence_velocity_mm_yr || 0) <= -15 ? 'text-rose-400' :
                (simulation?.max_subsidence_velocity_mm_yr || 0) <= -5 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {simulation?.max_subsidence_velocity_mm_yr?.toFixed(2) ?? '0.00'} mm/yr
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span 
              className="px-2.5 py-1 rounded-full text-xs font-semibold flex items-center space-x-1.5 border"
              style={{
                backgroundColor: `${worstHazardConfig.color}20`,
                borderColor: worstHazardConfig.color,
                color: worstHazardConfig.color
              }}
            >
              {worstHazardConfig.id === 'critical_instability' || worstHazardConfig.id === 'accelerating_deformation' ? (
                <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              <span>{worstHazardConfig.badge}</span>
            </span>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-6 overflow-x-auto">
          {[
            { id: 'parameters', label: '1. Orbit & Baseline Geometry', icon: SlidersHorizontal },
            { id: 'timeseries', label: '2. Millimeter Time-Series Chart', icon: TrendingUp },
            { id: 'dual_orbit', label: '3. 3D Vector Decomposition & Compass', icon: Compass },
            { id: 'scatterers_aps', label: '4. Persistent Scatterers & APS', icon: BarChart3 },
            { id: 'tiles', label: '5. Dynamic Deformation TileLayer', icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-violet-400 text-violet-400 bg-violet-500/10'
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
          
          {/* TAB 1: PARAMETERS & BASELINE GEOMETRY */}
          {activeTab === 'parameters' && (
            <div className="space-y-6">
              
              {/* Presets Grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Pre-Configured Benchmark InSAR Monitoring Scenarios
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.values(PRESET_SCENARIOS).map(p => {
                    const isSelected = selectedPresetId === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPreset(p.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-violet-950/40 border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.25)]'
                            : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono text-violet-400 font-bold uppercase">{p.sensor_band}</span>
                          <span className="text-[10px] font-mono text-slate-400">{p.orbit_direction}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white mb-1 line-clamp-1">{p.name}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{p.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1: Satellite & Orbit Configuration */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center space-x-2">
                    <Radio className="w-4 h-4 text-violet-400" />
                    <span>Satellite Radar Geometry</span>
                  </h3>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Satellite Mission</label>
                    <select
                      value={satelliteMission}
                      onChange={(e) => setSatelliteMission(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                    >
                      <option value="sentinel-1">Sentinel-1 (Copernicus C-band)</option>
                      <option value="alos-2">ALOS-2 PALSAR-2 (JAXA L-band)</option>
                      <option value="terrasar-x">TerraSAR-X (DLR X-band)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Radar Sensor Band</label>
                    <select
                      value={sensorBand}
                      onChange={(e) => setSensorBand(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                    >
                      <option value="c_band">C-band (λ = 55.46 mm, Sentinel-1 standard)</option>
                      <option value="l_band">L-band (λ = 236.0 mm, High canopy penetration)</option>
                      <option value="x_band">X-band (λ = 31.0 mm, Millimeter resolution)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Orbit Direction</label>
                      <select
                        value={orbitDirection}
                        onChange={(e) => setOrbitDirection(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                      >
                        <option value="ascending">Ascending</option>
                        <option value="descending">Descending</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Heading (°)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={headingAngleDeg}
                        onChange={(e) => setHeadingAngleDeg(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Radar Incidence Angle θ:</span>
                      <span className="font-mono font-bold text-white">{incidenceAngleDeg.toFixed(1)}°</span>
                    </div>
                    <input
                      type="range"
                      min="20.0"
                      max="50.0"
                      step="0.5"
                      value={incidenceAngleDeg}
                      onChange={(e) => setIncidenceAngleDeg(parseFloat(e.target.value))}
                      className="w-full accent-violet-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Column 2: Interferometric Baseline Vector Geometry */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>Baseline Vector Geometry</span>
                  </h3>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Perpendicular Baseline B_perp:</span>
                      <span className="font-mono font-bold text-cyan-400">{perpendicularBaselineM.toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="-150.0"
                      max="150.0"
                      step="1.0"
                      value={perpendicularBaselineM}
                      onChange={(e) => setPerpendicularBaselineM(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Parallel Baseline B_parallel:</span>
                      <span className="font-mono font-bold text-white">{parallelBaselineM.toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="-50.0"
                      max="50.0"
                      step="1.0"
                      value={parallelBaselineM}
                      onChange={(e) => setParallelBaselineM(parseFloat(e.target.value))}
                      className="w-full accent-slate-500 cursor-pointer"
                    />
                  </div>

                  {/* Derived Physics Card */}
                  <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 space-y-2 text-xs font-mono">
                    <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold border-b border-slate-800 pb-1">
                      Derived InSAR Invariants
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Baseline B:</span>
                      <span className="text-white font-bold">{liveBaseline.total_baseline_m} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Height of Ambiguity h_a:</span>
                      <span className="text-emerald-400 font-bold">{liveBaseline.height_of_ambiguity_m} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Critical Baseline B_crit:</span>
                      <span className="text-amber-400 font-bold">{liveBaseline.critical_baseline_m} m</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Topo Phase Sensitivity:</span>
                      <span className="text-cyan-400 font-bold">{liveBaseline.topographic_phase_sensitivity_rad_m} rad/m</span>
                    </div>
                  </div>
                </div>

                {/* Column 3: PS Selection Criteria & Execution */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center space-x-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span>StaMPS PSI Selection</span>
                    </h3>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Coherence Threshold γ_thresh:</span>
                        <span className="font-mono font-bold text-amber-400">{coherenceThreshold.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.30"
                        max="0.95"
                        step="0.05"
                        value={coherenceThreshold}
                        onChange={(e) => setCoherenceThreshold(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500">Filters decorrelated vegetation noise; γ ≥ 0.65 recommended</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                        <span>Candidate Scatterer Points:</span>
                        <span className="font-mono font-bold text-white">{psPointsCount}</span>
                      </div>
                      <input
                        type="range"
                        min="8"
                        max="60"
                        step="2"
                        value={psPointsCount}
                        onChange={(e) => setPsPointsCount(parseInt(e.target.value, 10))}
                        className="w-full accent-violet-500 cursor-pointer"
                      />
                    </div>

                    {/* Historical Lookup */}
                    <div className="pt-2 border-t border-slate-700/60">
                      <label className="block text-[11px] text-slate-400 mb-1">Historical Simulation ID Lookup</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="e.g. SIM_INSAR_001"
                          value={simLookupId}
                          onChange={(e) => setSimLookupId(e.target.value)}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                        />
                        <button
                          onClick={handleFetchHistorical}
                          disabled={isFetchingHistory}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition"
                        >
                          {isFetchingHistory ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Fetch'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Run Button */}
                  <div className="pt-4">
                    {simError && (
                      <div className="mb-2 p-2 bg-rose-950/60 border border-rose-800 rounded text-rose-300 text-xs flex items-center space-x-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        <span className="line-clamp-2">{simError}</span>
                      </div>
                    )}
                    <button
                      onClick={handleRunSimulation}
                      disabled={isSimulating}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg shadow-violet-900/30 transition disabled:opacity-50"
                    >
                      {isSimulating ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Solving StaMPS PSI Phase Inversion...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Run PS-InSAR Deformation Inversion</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: MILLIMETER TIME-SERIES CHART */}
          {activeTab === 'timeseries' && (
            <div className="space-y-6">
              
              {/* Point Selection Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-semibold text-slate-300">Selected Scatterer:</span>
                  <select
                    value={selectedPointId}
                    onChange={(e) => setSelectedPointId(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-violet-300 font-mono font-bold focus:outline-none focus:border-violet-500"
                  >
                    {simulation?.ps_points?.map(p => (
                      <option key={p.point_id} value={p.point_id}>
                        {p.point_id} — v_vert: {p.velocity_vertical_mm_yr.toFixed(2)} mm/yr (γ={p.temporal_coherence.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                {selectedPoint && (
                  <div className="flex items-center space-x-4 text-xs font-mono">
                    <div>
                      <span className="text-slate-400">Coherence γ: </span>
                      <span className="text-amber-400 font-bold">{selectedPoint.temporal_coherence.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Amp Disp D_A: </span>
                      <span className="text-cyan-400 font-bold">{selectedPoint.amplitude_dispersion.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">v_LOS: </span>
                      <span className="text-white font-bold">{selectedPoint.velocity_los_mm_yr.toFixed(2)} mm/yr</span>
                    </div>
                    <div>
                      <span className="text-slate-400">v_Vertical: </span>
                      <span className={`font-bold ${
                        selectedPoint.velocity_vertical_mm_yr <= -12 ? 'text-rose-400' :
                        selectedPoint.velocity_vertical_mm_yr <= -5 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {selectedPoint.velocity_vertical_mm_yr.toFixed(2)} mm/yr
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Chart Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 24-Month Time-Series Line Chart */}
                <div className="lg:col-span-2 bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                      <TrendingUp className="w-4 h-4 text-violet-400" />
                      <span>24-Month Millimeter Displacement History ({selectedPointId})</span>
                    </h4>
                    <span className="text-[11px] font-mono text-slate-400">
                      Rate: <strong className="text-violet-400">{selectedPoint?.velocity_vertical_mm_yr.toFixed(2)} mm/yr</strong>
                    </span>
                  </div>

                  <div className="h-72">
                    {timeSeriesChartData ? (
                      <Line
                        data={timeSeriesChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          interaction: { mode: 'index', intersect: false },
                          plugins: {
                            legend: {
                              position: 'top',
                              labels: { color: '#94a3b8', font: { size: 10, family: 'monospace' } }
                            },
                            tooltip: {
                              callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} mm`
                              }
                            }
                          },
                          scales: {
                            x: {
                              grid: { color: 'rgba(255, 255, 255, 0.05)' },
                              ticks: { color: '#94a3b8', font: { size: 9, family: 'monospace' }, maxRotation: 45 }
                            },
                            y: {
                              title: { display: true, text: 'Displacement Δr (mm)', color: '#94a3b8', font: { size: 10 } },
                              grid: { color: 'rgba(255, 255, 255, 0.05)' },
                              ticks: { color: '#94a3b8', font: { size: 10, family: 'monospace' } }
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                        No time-series data available.
                      </div>
                    )}
                  </div>
                </div>

                {/* Velocity Histogram Bar Chart */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4 text-cyan-400" />
                      <span>Velocity Distribution</span>
                    </h4>
                  </div>

                  <div className="h-72">
                    {velocityHistogramChartData ? (
                      <Bar
                        data={velocityHistogramChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          indexAxis: 'y',
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (ctx) => `Scatterers: ${ctx.raw}`
                              }
                            }
                          },
                          scales: {
                            x: {
                              grid: { color: 'rgba(255, 255, 255, 0.05)' },
                              ticks: { color: '#94a3b8', font: { size: 10, family: 'monospace' } }
                            },
                            y: {
                              grid: { display: false },
                              ticks: { color: '#cbd5e1', font: { size: 9 } }
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                        No distribution data.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: 3D VECTOR DECOMPOSITION & COMPASS */}
          {activeTab === 'dual_orbit' && (
            <div className="space-y-6">
              
              {/* Theory Header Card */}
              <div className="p-4 bg-gradient-to-r from-violet-950/40 to-slate-900 border border-violet-800/40 rounded-xl text-xs space-y-2">
                <div className="flex items-center space-x-2 text-violet-300 font-bold uppercase tracking-wider">
                  <Compass className="w-4 h-4 text-violet-400" />
                  <span>Dual-Orbit 3D InSAR Velocity Vector Decomposition</span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  Single-orbit InSAR only measures 1D displacement along the satellite Line-of-Sight (LOS). By combining 
                  <strong> Ascending</strong> (East-looking) and <strong>Descending</strong> (West-looking) orbits, we solve the inverse matrix 
                  to uncouple true <strong>Vertical Subsidence (v_v)</strong> from <strong>East-West Embankment Shear (v_e)</strong>.
                </p>
                <div className="font-mono text-[11px] text-cyan-300 bg-slate-950/70 p-2 rounded border border-slate-800">
                  [v_asc, v_desc]ᵀ = [ -sin(θ)cos(α), cos(θ) ] • [v_e, v_v]ᵀ
                </div>
              </div>

              {/* Visualizer & Calculator Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Visualizer: SVG Orbit Compass */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center">
                  <h4 className="text-xs font-bold text-white mb-2 self-start flex items-center space-x-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <span>Satellite Look & Flight Heading Geometry</span>
                  </h4>

                  {/* SVG Polar Visualizer */}
                  <div className="w-64 h-64 relative my-2">
                    <svg viewBox="0 0 200 200" className="w-full h-full">
                      {/* Compass Circle */}
                      <circle cx="100" cy="100" r="85" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx="100" cy="100" r="45" fill="none" stroke="#1e293b" strokeWidth="1" />
                      <line x1="100" y1="10" x2="100" y2="190" stroke="#475569" strokeWidth="1" />
                      <line x1="10" y1="100" x2="190" y2="100" stroke="#475569" strokeWidth="1" />

                      {/* Direction Labels */}
                      <text x="100" y="8" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">N (0°)</text>
                      <text x="194" y="103" fill="#94a3b8" fontSize="8" textAnchor="start" fontFamily="monospace">E</text>
                      <text x="100" y="198" fill="#94a3b8" fontSize="8" textAnchor="middle" fontFamily="monospace">S</text>
                      <text x="4" y="103" fill="#94a3b8" fontSize="8" textAnchor="end" fontFamily="monospace">W</text>

                      {/* Ascending Orbit Line (Heading ~348°) */}
                      <g transform="rotate(348 100 100)">
                        <line x1="100" y1="100" x2="100" y2="20" stroke="#8b5cf6" strokeWidth="3" markerEnd="url(#arrow-asc)" />
                        <text x="100" y="15" fill="#a78bfa" fontSize="7" textAnchor="middle" fontFamily="monospace">ASC Track</text>
                        {/* Radar Look (90 deg to right: 78 deg) */}
                        <line x1="100" y1="100" x2="170" y2="100" stroke="#a855f7" strokeWidth="2" strokeDasharray="4 2" />
                      </g>

                      {/* Descending Orbit Line (Heading ~192°) */}
                      <g transform="rotate(192 100 100)">
                        <line x1="100" y1="100" x2="100" y2="20" stroke="#06b6d4" strokeWidth="3" />
                        <text x="100" y="15" fill="#67e8f9" fontSize="7" textAnchor="middle" fontFamily="monospace">DESC Track</text>
                        {/* Radar Look (90 deg to right: 282 deg) */}
                        <line x1="100" y1="100" x2="170" y2="100" stroke="#22d3ee" strokeWidth="2" strokeDasharray="4 2" />
                      </g>

                      {/* Center Point */}
                      <circle cx="100" cy="100" r="5" fill="#f59e0b" />
                      <circle cx="100" cy="100" r="2" fill="#ffffff" />
                    </svg>
                  </div>

                  <div className="flex space-x-6 text-[11px] font-mono">
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3 h-3 rounded-full bg-violet-500" />
                      <span className="text-slate-300">Ascending Track (348°)</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <div className="w-3 h-3 rounded-full bg-cyan-500" />
                      <span className="text-slate-300">Descending Track (192°)</span>
                    </div>
                  </div>
                </div>

                {/* Calculator Tool */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-4 space-y-4">
                  <h4 className="text-xs font-bold text-white flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-violet-400" />
                    <span>Interactive Dual-Track Velocity Inverter</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Ascending LOS v_asc (mm/yr)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={calcAscVelocity}
                        onChange={(e) => setCalcAscVelocity(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-violet-300 font-mono font-bold focus:outline-none focus:border-violet-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Descending LOS v_desc (mm/yr)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={calcDescVelocity}
                        onChange={(e) => setCalcDescVelocity(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Inc θ_asc (°)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={calcIncAsc}
                        onChange={(e) => setCalcIncAsc(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Heading α_asc (°)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={calcHeadAsc}
                        onChange={(e) => setCalcHeadAsc(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Inc θ_desc (°)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={calcIncDesc}
                        onChange={(e) => setCalcIncDesc(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Heading α_desc (°)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={calcHeadDesc}
                        onChange={(e) => setCalcHeadDesc(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleSolveDualOrbit}
                    disabled={isSolvingDualOrbit}
                    className="w-full py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-xs flex items-center justify-center space-x-1.5 transition"
                  >
                    {isSolvingDualOrbit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                    <span>Solve Inversion Matrix (Asc/Desc)</span>
                  </button>

                  {/* Solved Velocity Vector Output */}
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-3 font-mono text-xs">
                    <div className="text-[10px] text-slate-400 uppercase font-sans font-semibold border-b border-slate-800 pb-1 flex justify-between items-center">
                      <span>Decomposed 2D Velocity Vector</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        activeDualOrbitResult.hazard_tier === 'critical_instability' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                        activeDualOrbitResult.hazard_tier === 'accelerating_deformation' ? 'bg-orange-950 text-orange-400 border border-orange-800' :
                        activeDualOrbitResult.hazard_tier === 'moderate_displacement' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {activeDualOrbitResult.hazard_tier.toUpperCase()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">Vertical Velocity (v_v)</div>
                        <div className={`text-base font-bold ${
                          activeDualOrbitResult.velocity_vertical_mm_yr < 0 ? 'text-rose-400' : 'text-emerald-400'
                        }`}>
                          {activeDualOrbitResult.velocity_vertical_mm_yr.toFixed(2)} mm/yr
                        </div>
                        <div className="text-[9px] text-slate-500">
                          {activeDualOrbitResult.velocity_vertical_mm_yr < 0 ? 'Subsidence' : 'Uplift'}
                        </div>
                      </div>

                      <div className="bg-slate-900/90 p-2.5 rounded border border-slate-800">
                        <div className="text-[10px] text-slate-400 uppercase">East-West Velocity (v_e)</div>
                        <div className="text-base font-bold text-cyan-400">
                          {activeDualOrbitResult.velocity_east_west_mm_yr.toFixed(2)} mm/yr
                        </div>
                        <div className="text-[9px] text-slate-500">
                          {activeDualOrbitResult.velocity_east_west_mm_yr > 0 ? 'Eastward Drift' : 'Westward Drift'}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px]">
                      <span className="text-slate-400">Total 2D Displacement Magnitude:</span>
                      <span className="text-white font-bold">{activeDualOrbitResult.total_magnitude_mm_yr.toFixed(2)} mm/yr</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Decomposed Table from Current Simulation */}
              {simulation?.dual_orbit_decomposition && simulation.dual_orbit_decomposition.length > 0 && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-white mb-3 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span>Decomposed Persistent Scatterers ({simulation.dual_orbit_decomposition.length} points)</span>
                  </h4>
                  <div className="overflow-x-auto max-h-48">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead className="bg-slate-900 text-slate-400 sticky top-0">
                        <tr>
                          <th className="p-2">Point ID</th>
                          <th className="p-2">v_ASC (mm/yr)</th>
                          <th className="p-2">v_DESC (mm/yr)</th>
                          <th className="p-2">v_Vert (mm/yr)</th>
                          <th className="p-2">v_EW (mm/yr)</th>
                          <th className="p-2">Total Mag (mm/yr)</th>
                          <th className="p-2">Hazard Tier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {simulation.dual_orbit_decomposition.map(row => (
                          <tr key={row.point_id} className="hover:bg-slate-800/40">
                            <td className="p-2 font-bold text-white">{row.point_id}</td>
                            <td className="p-2 text-violet-300">{row.velocity_asc_mm_yr.toFixed(2)}</td>
                            <td className="p-2 text-cyan-300">{row.velocity_desc_mm_yr.toFixed(2)}</td>
                            <td className={`p-2 font-bold ${
                              row.velocity_vertical_mm_yr <= -12 ? 'text-rose-400' :
                              row.velocity_vertical_mm_yr <= -5 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {row.velocity_vertical_mm_yr.toFixed(2)}
                            </td>
                            <td className="p-2 text-cyan-400">{row.velocity_east_west_mm_yr.toFixed(2)}</td>
                            <td className="p-2 text-white font-bold">{row.total_magnitude_mm_yr.toFixed(2)}</td>
                            <td className="p-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 uppercase">
                                {row.hazard_tier}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: PERSISTENT SCATTERERS & APS */}
          {activeTab === 'scatterers_aps' && (
            <div className="space-y-6">
              
              {/* Atmospheric Phase Screen (APS) Decomposition Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Height Delay Coeff k_elev</div>
                  <div className="text-base font-bold text-cyan-400 mt-1">
                    {simulation?.atmospheric_phase_screen?.elevation_delay_coefficient_rad_m?.toFixed(6) ?? '0.000000'}
                  </div>
                  <div className="text-[10px] text-slate-500">rad/m stratified troposphere</div>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Planar Spatial Ramp (a1, a2)</div>
                  <div className="text-base font-bold text-amber-400 mt-1">
                    {simulation?.atmospheric_phase_screen?.spatial_ramp_a1?.toFixed(6) ?? '0.000000'}, {simulation?.atmospheric_phase_screen?.spatial_ramp_a2?.toFixed(6) ?? '0.000000'}
                  </div>
                  <div className="text-[10px] text-slate-500">rad/m orbital tilt ramp</div>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Turbulent Residual σ_turb</div>
                  <div className="text-base font-bold text-emerald-400 mt-1">
                    {simulation?.atmospheric_phase_screen?.residual_std_dev_rad?.toFixed(4) ?? '0.0000'} rad
                  </div>
                  <div className="text-[10px] text-slate-500">Random turbulent noise std dev</div>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3">
                  <div className="text-[10px] text-slate-400 uppercase font-sans">Selection Ratio</div>
                  <div className="text-base font-bold text-violet-400 mt-1">
                    {(((simulation?.ps_points_retained ?? 0) / Math.max(1, simulation?.ps_candidates_evaluated ?? 1)) * 100).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-slate-500">Candidates passing γ ≥ {coherenceThreshold}</div>
                </div>
              </div>

              {/* Retained Scatterers Table with Search & Filter */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-violet-400" />
                    <h4 className="text-xs font-bold text-white">Retained High-Coherence Scatterer Registry</h4>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {filteredScatterers.length} points
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Search Point ID..."
                        value={scattererSearchTerm}
                        onChange={(e) => setScattererSearchTerm(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono"
                      />
                    </div>

                    <select
                      value={hazardTierFilter}
                      onChange={(e) => setHazardTierFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono focus:outline-none focus:border-violet-500"
                    >
                      <option value="all">All Hazard Tiers</option>
                      <option value="critical_instability">Critical Instability</option>
                      <option value="accelerating_deformation">Accelerating Deformation</option>
                      <option value="moderate_displacement">Moderate Displacement</option>
                      <option value="minor_creep">Minor Creep</option>
                      <option value="stable">Stable Creep</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead className="bg-slate-900 text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2.5">Point ID</th>
                        <th className="p-2.5">Coordinates (Lat, Lon)</th>
                        <th className="p-2.5">Elevation (m)</th>
                        <th className="p-2.5">Coherence γ</th>
                        <th className="p-2.5">Amp Disp D_A</th>
                        <th className="p-2.5">v_LOS (mm/yr)</th>
                        <th className="p-2.5">v_Vert (mm/yr)</th>
                        <th className="p-2.5">Hazard Tier</th>
                        <th className="p-2.5 text-right">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredScatterers.map(p => {
                        const hCfg = INSAR_HAZARD_CONFIGS[p.hazard_tier] || INSAR_HAZARD_CONFIGS.stable;
                        const isSelected = selectedPointId === p.point_id;
                        return (
                          <tr
                            key={p.point_id}
                            className={`transition cursor-pointer ${
                              isSelected ? 'bg-violet-950/40' : 'hover:bg-slate-800/40'
                            }`}
                            onClick={() => setSelectedPointId(p.point_id)}
                          >
                            <td className="p-2.5 font-bold text-white flex items-center space-x-1.5">
                              <span>{p.point_id}</span>
                              {p.point_id === simulation?.critical_ps_point_id && (
                                <span className="px-1 py-0.2 text-[9px] bg-rose-950 text-rose-400 rounded font-bold">PEAK</span>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-400">
                              {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                            </td>
                            <td className="p-2.5 text-slate-300">{p.elevation_m.toFixed(1)}</td>
                            <td className="p-2.5 text-amber-400 font-bold">{p.temporal_coherence.toFixed(3)}</td>
                            <td className="p-2.5 text-cyan-400">{p.amplitude_dispersion.toFixed(3)}</td>
                            <td className="p-2.5 text-slate-300">{p.velocity_los_mm_yr.toFixed(2)}</td>
                            <td className={`p-2.5 font-bold ${
                              p.velocity_vertical_mm_yr <= -12 ? 'text-rose-400' :
                              p.velocity_vertical_mm_yr <= -5 ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {p.velocity_vertical_mm_yr.toFixed(2)}
                            </td>
                            <td className="p-2.5">
                              <span 
                                className="px-2 py-0.5 rounded text-[10px] font-bold border"
                                style={{
                                  backgroundColor: `${hCfg.color}20`,
                                  borderColor: hCfg.color,
                                  color: hCfg.color
                                }}
                              >
                                {hCfg.badge}
                              </span>
                            </td>
                            <td className="p-2.5 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPointId(p.point_id);
                                  setActiveTab('timeseries');
                                }}
                                className="px-2 py-1 bg-slate-800 hover:bg-violet-600 text-slate-300 hover:text-white rounded text-[10px] font-bold uppercase transition flex items-center space-x-1 ml-auto"
                              >
                                <span>Chart</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
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

          {/* TAB 5: DYNAMIC DEFORMATION TILELAYER */}
          {activeTab === 'tiles' && (
            <div className="space-y-6">
              
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-violet-300 uppercase tracking-wider flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-violet-400" />
                    <span>Dynamic Slippy InSAR Deformation TileLayer Configuration</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400">XYZ Slippy Map 256x256 RGBA</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Select InSAR Raster Metric</label>
                    <select
                      value={selectedMetric}
                      onChange={(e) => setSelectedMetric(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500 font-mono"
                    >
                      {Object.entries(INSAR_VELOCITY_TILE_METRICS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {k} — {v}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Tile Layer Opacity:</span>
                      <span className="font-mono font-bold text-white">{Math.round(tileOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={tileOpacity}
                      onChange={(e) => setTileOpacity(parseFloat(e.target.value))}
                      className="w-full accent-violet-500 cursor-pointer mt-2"
                    />
                  </div>
                </div>

                {/* Tile URL Template Box */}
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">XYZ Tile Endpoint Template</label>
                  <div className="flex items-center space-x-2 bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-xs text-violet-300">
                    <span className="flex-1 truncate">
                      {getInSARVelocityTileUrlTemplate(simulation?.simulation_id || 'SIM_INSAR_001', selectedMetric)}
                    </span>
                    <button
                      onClick={handleCopyTileUrl}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition flex items-center space-x-1 text-xs"
                      title="Copy URL"
                    >
                      {copiedTileUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedTileUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                {/* Colormap Legend Guide */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 space-y-2">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Deformation Rate Scale (mm/yr)</div>
                  <div className="h-4 rounded bg-gradient-to-r from-red-600 via-amber-500 via-emerald-500 to-cyan-400 border border-slate-700" />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400">
                    <span className="text-red-400 font-bold">&le; -25 mm/yr (Collapse Risk)</span>
                    <span className="text-amber-400 font-bold">-5 mm/yr</span>
                    <span className="text-emerald-400 font-bold">0 mm/yr (Stable)</span>
                    <span className="text-cyan-400 font-bold">&ge; +10 mm/yr (Uplift)</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-700/60">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                  >
                    Close Studio
                  </button>
                  <button
                    onClick={handleApplyToMap}
                    className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center space-x-2 shadow-lg shadow-violet-900/30 transition"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Apply InSAR Deformation Layer to GIS Map</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default InSARVelocityModal;
