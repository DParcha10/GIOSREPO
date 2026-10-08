import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Sliders, Activity, Gauge, Database, Copy, Check, ShieldCheck, 
  AlertTriangle, RefreshCw, Layers, FileDown, Plus, Trash2, CheckCircle2, 
  ChevronRight, Compass, TrendingUp, Mountain, ShieldAlert, Sparkles, 
  Eye, BarChart3, CloudRain, Droplets, Sun, Thermometer, Play, 
  Pause, RotateCcw, FastForward, Info
} from 'lucide-react';
import { 
  simulateRainfallInfiltration,
  analyzeApparentThermalInertia
} from '../api/giosApi';
import { 
  GREEN_AMPT_SOIL_CONFIGS,
  RAINFALL_HAZARD_TIER_CONFIGS,
  RAINFALL_HAZARD_TIERS,
  ATI_ANOMALY_CONFIGS,
  ATI_ANOMALY_CLASSES,
  INFILTRATION_PONDING_REGIMES,
  calculateGreenAmptInfiltration,
  calculateApparentThermalInertia,
  calculateFredlundApparentShearStrength,
  buildRainfallInfiltrationTileUrlTemplate,
  buildApparentThermalInertiaTileUrlTemplate
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Benchmark Pre-Configured Rainfall Infiltration Scenarios
const PRESET_SCENARIOS = {
  north_tailings_monsoon: {
    id: 'north_tailings_monsoon',
    name: 'North Tailings Impoundment - Heavy Monsoon Downpour',
    dam_id: 'TAILINGS_DAM_A',
    dam_name: 'North Tailings Impoundment Main Embankment',
    dam_coordinates: [-44.1234, -20.1234],
    soil_texture: 'silt_tailings',
    rainfall_intensity_mm_hr: 28.0,
    storm_duration_hr: 24.0,
    critical_slip_depth_m: 3.5,
    initial_suction_psi0_kpa: 35.0,
    phi_b_deg: 14.0,
    baseline_factor_of_safety: 1.55,
    hyetograph_mode: 'uniform'
  },
  san_luis_atmospheric_river: {
    id: 'san_luis_atmospheric_river',
    name: 'San Luis Forebay - Extended Atmospheric River',
    dam_id: 'DAM_SAN_LUIS_UP',
    dam_name: 'San Luis Forebay Upstream Embankment',
    dam_coordinates: [-120.9300, 36.9800],
    soil_texture: 'clay_core',
    rainfall_intensity_mm_hr: 14.0,
    storm_duration_hr: 48.0,
    critical_slip_depth_m: 4.2,
    initial_suction_psi0_kpa: 45.0,
    phi_b_deg: 12.0,
    baseline_factor_of_safety: 1.62,
    hyetograph_mode: 'custom'
  },
  cadia_cloudburst: {
    id: 'cadia_cloudburst',
    name: 'Cadia Northern Shell - Flash Cloudburst Storm',
    dam_id: 'DAM_CADIA_01',
    dam_name: 'Cadia Northern Embankment Shell',
    dam_coordinates: [148.9800, -33.4500],
    soil_texture: 'sandy_shell',
    rainfall_intensity_mm_hr: 65.0,
    storm_duration_hr: 12.0,
    critical_slip_depth_m: 2.8,
    initial_suction_psi0_kpa: 22.0,
    phi_b_deg: 16.0,
    baseline_factor_of_safety: 1.48,
    hyetograph_mode: 'uniform'
  },
  brumadinho_saturated_analog: {
    id: 'brumadinho_saturated_analog',
    name: 'Brumadinho Upstream Analog - Prolonged Antecedent Saturation',
    dam_id: 'DAM_BRUMADINHO_B1',
    dam_name: 'Brumadinho Dam I Upstream Tailings Analog',
    dam_coordinates: [-44.1190, -20.1190],
    soil_texture: 'silt_tailings',
    rainfall_intensity_mm_hr: 18.0,
    storm_duration_hr: 72.0,
    critical_slip_depth_m: 3.0,
    initial_suction_psi0_kpa: 15.0,
    phi_b_deg: 13.0,
    baseline_factor_of_safety: 1.32,
    hyetograph_mode: 'uniform'
  }
};

export default function RainfallInfiltrationModal({
  isOpen,
  onClose,
  activeSimulation = null,
  onApplySimulation = null,
  onApplyAtiAnalysis = null
}) {
  // Navigation Tabs: 'hyetograph_controls' | 'wetting_front' | 'fs_decay' | 'ati_workbench' | 'tiles_contract'
  const [activeTab, setActiveTab] = useState('hyetograph_controls');

  // Scenario & Dam Identification
  const [selectedPresetKey, setSelectedPresetKey] = useState('north_tailings_monsoon');
  const [damId, setDamId] = useState('TAILINGS_DAM_A');
  const [damName, setDamName] = useState('North Tailings Impoundment');
  const [damCoords, setDamCoords] = useState([-44.1234, -20.1234]);

  // Green-Ampt Soil Parameters
  const [soilTexture, setSoilTexture] = useState('silt_tailings');
  const [thetaS, setThetaS] = useState(GREEN_AMPT_SOIL_CONFIGS.silt_tailings.theta_s);
  const [thetaI, setThetaI] = useState(GREEN_AMPT_SOIL_CONFIGS.silt_tailings.theta_i_default);
  const [psiFMm, setPsiFMm] = useState(GREEN_AMPT_SOIL_CONFIGS.silt_tailings.suction_head_psi_f_mm);
  const [ksMmHr, setKsMmHr] = useState(GREEN_AMPT_SOIL_CONFIGS.silt_tailings.ks_mm_hr);

  // Storm Precipitation Parameters
  const [rainfallIntensityMmHr, setRainfallIntensityMmHr] = useState(28.0);
  const [stormDurationHr, setStormDurationHr] = useState(24.0);
  const [hyetographMode, setHyetographMode] = useState('uniform'); // 'uniform' | 'custom'

  // Custom Hyetograph Points: Array of { time_hr, intensity_mm_hr }
  const [hyetographPoints, setHyetographPoints] = useState([
    { time_hr: 0, intensity_mm_hr: 5.0 },
    { time_hr: 4, intensity_mm_hr: 12.0 },
    { time_hr: 8, intensity_mm_hr: 32.0 },
    { time_hr: 12, intensity_mm_hr: 48.0 },
    { time_hr: 16, intensity_mm_hr: 25.0 },
    { time_hr: 20, intensity_mm_hr: 15.0 },
    { time_hr: 24, intensity_mm_hr: 4.0 }
  ]);

  // Critical Slip Plane & Suction Parameters
  const [criticalSlipDepthM, setCriticalSlipDepthM] = useState(3.5);
  const [initialSuctionPsi0Kpa, setInitialSuctionPsi0Kpa] = useState(35.0);
  const [phiBDeg, setPhiBDeg] = useState(14.0);
  const [baselineFs, setBaselineFs] = useState(1.55);

  // Simulation Result State
  const [simulationResult, setSimulationResult] = useState(activeSimulation || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [tilePreviewMetric, setTilePreviewMetric] = useState('factor_of_safety');

  // Wetting Front Time-Stepping Animator State
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x, 2x, 5x
  const animationTimerRef = useRef(null);

  // Apparent Thermal Inertia (ATI) Remote Sensing State
  const [daySceneId, setDaySceneId] = useState('LC09_L2SP_044033_20260715');
  const [nightSceneId, setNightSceneId] = useState('LC09_L2SP_044033_20260715_NIGHT');
  const [solarCorrectionFactor, setSolarCorrectionFactor] = useState(1.0);
  const [minAtiThreshold, setMinAtiThreshold] = useState(0.045);
  const [atiTransectPoints, setAtiTransectPoints] = useState([
    { station_x_m: 0.0, albedo: 0.22, day_lst_celsius: 36.5, night_lst_celsius: 14.0 },
    { station_x_m: 45.0, albedo: 0.20, day_lst_celsius: 38.0, night_lst_celsius: 13.5 },
    { station_x_m: 90.0, albedo: 0.19, day_lst_celsius: 37.2, night_lst_celsius: 14.2 },
    { station_x_m: 135.0, albedo: 0.15, day_lst_celsius: 29.5, night_lst_celsius: 16.8 },
    { station_x_m: 180.0, albedo: 0.11, day_lst_celsius: 23.0, night_lst_celsius: 17.5 }
  ]);
  const [atiResult, setAtiResult] = useState(null);
  const [isProcessingAti, setIsProcessingAti] = useState(false);
  const [atiTilePreviewMetric, setAtiTilePreviewMetric] = useState('thermal_inertia');

  // Synchronize activeSimulation prop
  useEffect(() => {
    if (activeSimulation) {
      setSimulationResult(activeSimulation);
    }
  }, [activeSimulation]);

  // Handle Preset Selection
  const handleSelectPreset = (key) => {
    const p = PRESET_SCENARIOS[key];
    if (!p) return;
    setSelectedPresetKey(key);
    setDamId(p.dam_id);
    setDamName(p.dam_name);
    setDamCoords(p.dam_coordinates);
    setSoilTexture(p.soil_texture);
    setRainfallIntensityMmHr(p.rainfall_intensity_mm_hr);
    setStormDurationHr(p.storm_duration_hr);
    setCriticalSlipDepthM(p.critical_slip_depth_m);
    setInitialSuctionPsi0Kpa(p.initial_suction_psi0_kpa);
    setPhiBDeg(p.phi_b_deg);
    setBaselineFs(p.baseline_factor_of_safety);
    setHyetographMode(p.hyetograph_mode);

    const meta = GREEN_AMPT_SOIL_CONFIGS[p.soil_texture] || GREEN_AMPT_SOIL_CONFIGS.silt_tailings;
    setThetaS(meta.theta_s);
    setThetaI(meta.theta_i_default);
    setPsiFMm(meta.suction_head_psi_f_mm);
    setKsMmHr(meta.ks_mm_hr);
  };

  // When soil texture changes, auto-fill default Green-Ampt parameters
  const handleSoilTextureChange = (e) => {
    const text = e.target.value;
    setSoilTexture(text);
    const meta = GREEN_AMPT_SOIL_CONFIGS[text];
    if (meta) {
      setThetaS(meta.theta_s);
      setThetaI(meta.theta_i_default);
      setPsiFMm(meta.suction_head_psi_f_mm);
      setKsMmHr(meta.ks_mm_hr);
    }
  };

  // Initial calculation on mount / open if null
  useEffect(() => {
    if (isOpen && !simulationResult) {
      const initial = calculateGreenAmptInfiltration({
        dam_id: damId,
        dam_name: damName,
        soil_texture: soilTexture,
        saturated_moisture_theta_s: thetaS,
        initial_moisture_theta_i: thetaI,
        suction_head_psi_f_mm: psiFMm,
        hydraulic_conductivity_ks_mm_hr: ksMmHr,
        rainfall_intensity_mm_hr: rainfallIntensityMmHr,
        storm_duration_hr: stormDurationHr,
        critical_slip_depth_m: criticalSlipDepthM,
        initial_suction_psi0_kpa: initialSuctionPsi0Kpa,
        phi_b_deg: phiBDeg,
        baseline_factor_of_safety: baselineFs
      });
      setSimulationResult(initial);
      setActiveStepIndex(0);
    }
  }, [
    isOpen, simulationResult, damId, damName, soilTexture, thetaS, thetaI,
    psiFMm, ksMmHr, rainfallIntensityMmHr, stormDurationHr, criticalSlipDepthM,
    initialSuctionPsi0Kpa, phiBDeg, baselineFs
  ]);

  // Initial ATI calculation on mount / open if null
  useEffect(() => {
    if (isOpen && !atiResult) {
      const initAti = calculateApparentThermalInertia({
        dam_id: damId,
        dam_name: damName,
        solar_correction_factor: solarCorrectionFactor,
        min_ati_threshold: minAtiThreshold,
        transect_points: atiTransectPoints
      });
      setAtiResult(initAti);
    }
  }, [isOpen, atiResult, damId, damName, solarCorrectionFactor, minAtiThreshold, atiTransectPoints]);

  // Execute Transient Green-Ampt Simulation
  const handleRunSimulation = async () => {
    setIsProcessing(true);
    try {
      const effectiveIntensity = hyetographMode === 'custom' && hyetographPoints.length > 0
        ? (hyetographPoints.reduce((acc, p) => acc + Number(p.intensity_mm_hr || 0), 0) / hyetographPoints.length)
        : rainfallIntensityMmHr;

      const payload = {
        dam_id: damId,
        dam_name: damName,
        soil_texture: soilTexture,
        saturated_moisture_theta_s: Number(thetaS),
        initial_moisture_theta_i: Number(thetaI),
        suction_head_psi_f_mm: Number(psiFMm),
        hydraulic_conductivity_ks_mm_hr: Number(ksMmHr),
        rainfall_intensity_mm_hr: Number(effectiveIntensity),
        storm_duration_hr: Number(stormDurationHr),
        critical_slip_depth_m: Number(criticalSlipDepthM),
        initial_suction_psi0_kpa: Number(initialSuctionPsi0Kpa),
        phi_b_deg: Number(phiBDeg),
        baseline_factor_of_safety: Number(baselineFs),
        hyetograph: hyetographMode === 'custom' ? hyetographPoints : null
      };

      let result;
      try {
        result = await simulateRainfallInfiltration(payload);
      } catch (err) {
        console.warn('Backend API request failed, utilizing local Green-Ampt physics engine fallback:', err);
        result = calculateGreenAmptInfiltration(payload);
      }

      setSimulationResult(result);
      setActiveStepIndex(0);
      setIsPlaying(false);
    } catch (err) {
      console.error('Infiltration simulation calculation error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Execute ATI Remote Sensing Analysis
  const handleRunAtiAnalysis = async () => {
    setIsProcessingAti(true);
    try {
      const payload = {
        dam_id: damId,
        dam_name: damName,
        day_scene_id: daySceneId,
        night_scene_id: nightSceneId,
        solar_correction_factor: Number(solarCorrectionFactor),
        min_ati_threshold: Number(minAtiThreshold),
        transect_points: atiTransectPoints
      };

      let result;
      try {
        result = await analyzeApparentThermalInertia(payload);
      } catch (err) {
        console.warn('Backend ATI API request failed, utilizing local split-window engine fallback:', err);
        result = calculateApparentThermalInertia(payload);
      }

      setAtiResult(result);
    } catch (err) {
      console.error('Apparent Thermal Inertia analysis error:', err);
    } finally {
      setIsProcessingAti(false);
    }
  };

  // Animator Ticker for Wetting Front Progression
  useEffect(() => {
    if (isPlaying && simulationResult?.time_steps?.length > 1) {
      const intervalMs = Math.max(80, 500 / playbackSpeed);
      animationTimerRef.current = setInterval(() => {
        setActiveStepIndex(prev => {
          if (prev >= simulationResult.time_steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    }

    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    };
  }, [isPlaying, playbackSpeed, simulationResult]);

  // Current Active Time Step Data
  const currentStep = useMemo(() => {
    if (!simulationResult?.time_steps || simulationResult.time_steps.length === 0) return null;
    const idx = Math.min(Math.max(0, activeStepIndex), simulationResult.time_steps.length - 1);
    return simulationResult.time_steps[idx];
  }, [simulationResult, activeStepIndex]);

  // Fredlund Apparent Shear Strength at Current Step
  const fredlundCurrent = useMemo(() => {
    if (!currentStep) return null;
    return calculateFredlundApparentShearStrength(
      5.0,
      28.0,
      phiBDeg,
      currentStep.slip_surface_suction_kpa,
      60.0
    );
  }, [currentStep, phiBDeg]);

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Add / Remove Hyetograph Points
  const handleAddHyetographPoint = () => {
    const lastPoint = hyetographPoints[hyetographPoints.length - 1] || { time_hr: 0, intensity_mm_hr: 10 };
    setHyetographPoints([
      ...hyetographPoints,
      { time_hr: lastPoint.time_hr + 4, intensity_mm_hr: 15.0 }
    ]);
  };

  const handleRemoveHyetographPoint = (index) => {
    if (hyetographPoints.length <= 2) return;
    setHyetographPoints(hyetographPoints.filter((_, idx) => idx !== index));
  };

  const handleUpdateHyetographPoint = (index, field, value) => {
    const updated = [...hyetographPoints];
    updated[index] = { ...updated[index], [field]: Number(value) };
    setHyetographPoints(updated);
  };

  // Presets for Hyetograph shapes
  const handleApplyHyetographShape = (shape) => {
    const dur = stormDurationHr;
    if (shape === 'scs_type_ii') {
      setHyetographPoints([
        { time_hr: 0, intensity_mm_hr: 4.0 },
        { time_hr: Number((dur * 0.25).toFixed(1)), intensity_mm_hr: 12.0 },
        { time_hr: Number((dur * 0.50).toFixed(1)), intensity_mm_hr: 54.0 },
        { time_hr: Number((dur * 0.75).toFixed(1)), intensity_mm_hr: 18.0 },
        { time_hr: dur, intensity_mm_hr: 3.0 }
      ]);
    } else if (shape === 'early_peak') {
      setHyetographPoints([
        { time_hr: 0, intensity_mm_hr: 45.0 },
        { time_hr: Number((dur * 0.25).toFixed(1)), intensity_mm_hr: 35.0 },
        { time_hr: Number((dur * 0.50).toFixed(1)), intensity_mm_hr: 15.0 },
        { time_hr: Number((dur * 0.75).toFixed(1)), intensity_mm_hr: 8.0 },
        { time_hr: dur, intensity_mm_hr: 2.0 }
      ]);
    } else if (shape === 'delayed_peak') {
      setHyetographPoints([
        { time_hr: 0, intensity_mm_hr: 3.0 },
        { time_hr: Number((dur * 0.25).toFixed(1)), intensity_mm_hr: 8.0 },
        { time_hr: Number((dur * 0.50).toFixed(1)), intensity_mm_hr: 20.0 },
        { time_hr: Number((dur * 0.75).toFixed(1)), intensity_mm_hr: 48.0 },
        { time_hr: dur, intensity_mm_hr: 16.0 }
      ]);
    }
  };

  // Charts Configs
  // 1. Hyetograph Profile Chart
  const hyetographChartData = useMemo(() => {
    if (hyetographMode === 'custom') {
      const sorted = [...hyetographPoints].sort((a, b) => a.time_hr - b.time_hr);
      return {
        labels: sorted.map(p => `${p.time_hr}h`),
        datasets: [
          {
            type: 'bar',
            label: 'Rainfall Intensity (mm/hr)',
            data: sorted.map(p => p.intensity_mm_hr),
            backgroundColor: 'rgba(56, 189, 248, 0.6)',
            borderColor: '#38bdf8',
            borderWidth: 1.5,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: `Saturated Conductivity Ks (${ksMmHr} mm/hr)`,
            data: sorted.map(() => ksMmHr),
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            yAxisID: 'y'
          }
        ]
      };
    } else {
      const times = [0, stormDurationHr * 0.25, stormDurationHr * 0.5, stormDurationHr * 0.75, stormDurationHr];
      return {
        labels: times.map(t => `${t.toFixed(1)}h`),
        datasets: [
          {
            type: 'bar',
            label: 'Uniform Rainfall (mm/hr)',
            data: times.map(() => rainfallIntensityMmHr),
            backgroundColor: 'rgba(56, 189, 248, 0.6)',
            borderColor: '#38bdf8',
            borderWidth: 1.5,
            yAxisID: 'y'
          },
          {
            type: 'line',
            label: `Conductivity Ks (${ksMmHr} mm/hr)`,
            data: times.map(() => ksMmHr),
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderDash: [6, 4],
            pointRadius: 0,
            yAxisID: 'y'
          }
        ]
      };
    }
  }, [hyetographMode, hyetographPoints, stormDurationHr, rainfallIntensityMmHr, ksMmHr]);

  // 2. Factor of Safety & Infiltration Decay Curve Chart
  const fsDecayChartData = useMemo(() => {
    if (!simulationResult?.time_steps) return null;
    const steps = simulationResult.time_steps;
    return {
      labels: steps.map(s => `${s.time_hr}h`),
      datasets: [
        {
          label: 'Transient Factor of Safety (FS)',
          data: steps.map(s => s.transient_factor_of_safety),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2.5,
          pointRadius: 2,
          yAxisID: 'yFs',
          fill: false
        },
        {
          label: 'Regulatory Safety Threshold (FS = 1.30)',
          data: steps.map(() => 1.30),
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          yAxisID: 'yFs'
        },
        {
          label: 'Slope Collapse Boundary (FS = 1.00)',
          data: steps.map(() => 1.00),
          borderColor: '#dc2626',
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 0,
          yAxisID: 'yFs'
        },
        {
          label: 'Matric Suction ψ (kPa)',
          data: steps.map(s => s.slip_surface_suction_kpa),
          borderColor: '#a855f7',
          borderWidth: 1.5,
          pointRadius: 0,
          yAxisID: 'ySuction',
          borderDash: [3, 2]
        },
        {
          label: 'Wetting Front Depth zw (m)',
          data: steps.map(s => s.wetting_front_depth_m),
          borderColor: '#38bdf8',
          borderWidth: 1.5,
          pointRadius: 0,
          yAxisID: 'yDepth',
          hidden: true
        }
      ]
    };
  }, [simulationResult]);

  // 3. ATI Transect Profile Chart
  const atiChartData = useMemo(() => {
    if (!atiResult?.ati_points) return null;
    const pts = atiResult.ati_points;
    return {
      labels: pts.map(p => `${p.station_x_m}m`),
      datasets: [
        {
          label: 'Apparent Thermal Inertia (ATI)',
          data: pts.map(p => p.apparent_thermal_inertia),
          borderColor: '#38bdf8',
          backgroundColor: 'rgba(56, 189, 248, 0.15)',
          borderWidth: 2.5,
          pointRadius: 5,
          pointBackgroundColor: pts.map(p => {
            if (p.apparent_thermal_inertia >= 0.070) return '#dc2626';
            if (p.apparent_thermal_inertia >= 0.045) return '#f59e0b';
            if (p.apparent_thermal_inertia >= 0.025) return '#3b82f6';
            return '#10b981';
          }),
          yAxisID: 'yAti',
          fill: true
        },
        {
          label: 'Seepage Anomaly Threshold (0.045)',
          data: pts.map(() => minAtiThreshold),
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderDash: [5, 4],
          pointRadius: 0,
          yAxisID: 'yAti'
        },
        {
          label: 'Diurnal Temperature Range DTR (°C)',
          data: pts.map(p => p.dtr_celsius),
          borderColor: '#f97316',
          borderWidth: 1.5,
          pointRadius: 3,
          yAxisID: 'yDtr',
          borderDash: [3, 3]
        }
      ]
    };
  }, [atiResult, minAtiThreshold]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-7xl bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 font-sans">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <CloudRain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  Transient Rainfall Infiltration & Wetting Front Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950/80 border border-cyan-600/50 text-cyan-300">
                  CYCLE v2.5.14
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                Green-Ampt Unsteady Ponding &bull; Fredlund Suction Cohesion Decay &bull; Apparent Thermal Inertia (ATI)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunSimulation}
              disabled={isProcessing}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase font-mono rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Simulating...' : 'Run Infiltration'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-900/40 text-xs font-mono overflow-x-auto">
          {[
            { id: 'hyetograph_controls', label: '1. Hyetograph & Soil Physics', icon: Sliders },
            { id: 'wetting_front', label: '2. Wetting Front Dynamics', icon: Activity },
            { id: 'fs_decay', label: '3. FS Decay & Suction Loss', icon: TrendingUp },
            { id: 'ati_workbench', label: '4. ATI Remote Sensing', icon: Sun },
            { id: 'tiles_contract', label: '5. Dynamic Tiles & Contracts', icon: Database }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold whitespace-nowrap transition-all ${
                  isActive 
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: HYETOGRAPH & SOIL PHYSICS */}
          {activeTab === 'hyetograph_controls' && (
            <div className="space-y-6">
              {/* Presets & Benchmark Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {Object.values(PRESET_SCENARIOS).map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSelectPreset(p.id)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      selectedPresetKey === p.id
                        ? 'bg-cyan-950/40 border-cyan-500/60 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : 'bg-slate-900/40 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/70'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400 font-bold block mb-1">
                        {p.dam_id}
                      </span>
                      <h4 className="text-xs font-bold text-white leading-tight mb-2">
                        {p.name}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-2 mt-2">
                      <span>{p.rainfall_intensity_mm_hr} mm/hr</span>
                      <span>{p.storm_duration_hr}h</span>
                      <span className="text-cyan-300 uppercase">{p.soil_texture.replace('_', ' ')}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Main Parameter Grids */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Card: Soil Texture & Green-Ampt Hydraulic Parameters */}
                <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      Green-Ampt Embankment Hydraulic Properties
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">USDA-ARS Empirical Matrix</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">SOIL TEXTURE CLASS</label>
                      <select
                        value={soilTexture}
                        onChange={handleSoilTextureChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      >
                        {Object.entries(GREEN_AMPT_SOIL_CONFIGS).map(([key, cfg]) => (
                          <option key={key} value={key}>{cfg.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">HYDRAULIC COND. Ks (mm/hr)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={ksMmHr}
                        onChange={(e) => setKsMmHr(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">SATURATED MOISTURE θs</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.1"
                        max="0.6"
                        value={thetaS}
                        onChange={(e) => setThetaS(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">INITIAL ANTECEDENT θi</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="0.5"
                        value={thetaI}
                        onChange={(e) => setThetaI(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">SUCTION HEAD ψf (mm)</label>
                      <input
                        type="number"
                        step="5"
                        value={psiFMm}
                        onChange={(e) => setPsiFMm(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">MOISTURE DEFICIT Δθ</label>
                      <div className="w-full bg-slate-950/60 border border-slate-800/60 rounded-lg px-3 py-1.5 text-xs text-cyan-300 font-mono">
                        {(Math.max(0.01, thetaS - thetaI)).toFixed(3)} m³/m³
                      </div>
                    </div>
                  </div>

                  {/* Geotechnical Stability Parameters */}
                  <div className="border-t border-slate-800 pt-3 space-y-3">
                    <span className="text-[11px] font-mono text-cyan-400 font-bold block">
                      FREDLUND UNSATURATED SHEAR COUPLING
                    </span>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">CRITICAL SLIP DEPTH z_slip (m)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={criticalSlipDepthM}
                          onChange={(e) => setCriticalSlipDepthM(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">ANTECEDENT SUCTION ψ0 (kPa)</label>
                        <input
                          type="number"
                          step="1.0"
                          value={initialSuctionPsi0Kpa}
                          onChange={(e) => setInitialSuctionPsi0Kpa(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">FREDLUND ANGLE φb (deg)</label>
                        <input
                          type="number"
                          step="0.5"
                          value={phiBDeg}
                          onChange={(e) => setPhiBDeg(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">BASELINE FACTOR OF SAFETY FS0</label>
                        <input
                          type="number"
                          step="0.05"
                          value={baselineFs}
                          onChange={(e) => setBaselineFs(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card: Rainfall Storm Hyetograph Editor */}
                <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-cyan-400" />
                      Dynamic Storm Hyetograph Profile
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <button
                        onClick={() => setHyetographMode('uniform')}
                        className={`px-2.5 py-0.5 rounded font-bold ${
                          hyetographMode === 'uniform' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Uniform
                      </button>
                      <button
                        onClick={() => setHyetographMode('custom')}
                        className={`px-2.5 py-0.5 rounded font-bold ${
                          hyetographMode === 'custom' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Custom Profile
                      </button>
                    </div>
                  </div>

                  {/* Storm Duration & Uniform Controls */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-mono text-slate-400 block mb-1">TOTAL STORM DURATION (hours)</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        max="168"
                        value={stormDurationHr}
                        onChange={(e) => setStormDurationHr(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    {hyetographMode === 'uniform' ? (
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">RAINFALL INTENSITY (mm/hr)</label>
                        <input
                          type="number"
                          step="1"
                          min="0.1"
                          value={rainfallIntensityMmHr}
                          onChange={(e) => setRainfallIntensityMmHr(Number(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="text-[11px] font-mono text-slate-400 block mb-1">PRESET HYETOGRAPH SHAPE</label>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleApplyHyetographShape('scs_type_ii')}
                            className="px-2 py-1 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                          >
                            SCS Type II
                          </button>
                          <button
                            onClick={() => handleApplyHyetographShape('early_peak')}
                            className="px-2 py-1 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                          >
                            Early Peak
                          </button>
                          <button
                            onClick={() => handleApplyHyetographShape('delayed_peak')}
                            className="px-2 py-1 text-[10px] font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded"
                          >
                            Delayed Peak
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Custom Hyetograph Table Editor */}
                  {hyetographMode === 'custom' && (
                    <div className="space-y-2 border-t border-slate-800 pt-3">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>DISCRETE TIME-SERIES HYETOGRAPH STATIONS</span>
                        <button
                          onClick={handleAddHyetographPoint}
                          className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300"
                        >
                          <Plus className="w-3 h-3" /> Add Time Point
                        </button>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {hyetographPoints.map((pt, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs font-mono bg-slate-950/70 p-1.5 rounded border border-slate-800/60">
                            <span className="text-slate-500 w-6">#{idx + 1}</span>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">T:</span>
                              <input
                                type="number"
                                step="1"
                                value={pt.time_hr}
                                onChange={(e) => handleUpdateHyetographPoint(idx, 'time_hr', e.target.value)}
                                className="w-16 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-white text-center"
                              />
                              <span className="text-[10px] text-slate-400">h</span>
                            </div>
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-[10px] text-slate-400">Intensity:</span>
                              <input
                                type="number"
                                step="1"
                                value={pt.intensity_mm_hr}
                                onChange={(e) => handleUpdateHyetographPoint(idx, 'intensity_mm_hr', e.target.value)}
                                className="w-20 bg-slate-900 border border-slate-700 px-1.5 py-0.5 rounded text-white text-center"
                              />
                              <span className="text-[10px] text-slate-400">mm/hr</span>
                            </div>
                            <button
                              onClick={() => handleRemoveHyetographPoint(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1"
                              disabled={hyetographPoints.length <= 2}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hyetograph Chart Preview */}
                  <div className="h-44 bg-slate-950/50 rounded-xl p-2 border border-slate-800/80">
                    <Bar
                      data={hyetographChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { labels: { color: '#94a3b8', font: { size: 10 } } },
                          tooltip: { backgroundColor: '#0f172a' }
                        },
                        scales: {
                          x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 9 } } },
                          y: { 
                            grid: { color: '#1e293b' }, 
                            ticks: { color: '#94a3b8', font: { size: 9 } },
                            title: { display: true, text: 'Intensity (mm/hr)', color: '#64748b', font: { size: 9 } }
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Simulation Scorecard */}
              {simulationResult && (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 p-4 bg-slate-900/60 border border-cyan-500/20 rounded-2xl">
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 block">TIME TO PONDING tp</span>
                    <span className="text-base font-bold font-mono text-white">
                      {simulationResult.time_to_ponding_hr !== null ? `${simulationResult.time_to_ponding_hr} hr` : 'No Ponding'}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      {simulationResult.time_to_ponding_hr !== null ? 'Ponding Infiltration Active' : 'Pre-ponding regime'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 block">CUMULATIVE INFILTRATION F</span>
                    <span className="text-base font-bold font-mono text-cyan-300">
                      {simulationResult.total_cumulative_infiltration_mm} mm
                    </span>
                    <span className="text-[9px] text-slate-400 block">Mass Conserved Water</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 block">SURFACE RUNOFF R</span>
                    <span className="text-base font-bold font-mono text-amber-300">
                      {simulationResult.total_surface_runoff_mm} mm
                    </span>
                    <span className="text-[9px] text-slate-400 block">Excess Precipitation</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 block">WETTING FRONT DEPTH zw</span>
                    <span className="text-base font-bold font-mono text-purple-300">
                      {simulationResult.final_wetting_front_depth_m} m
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      Slip Plane at {criticalSlipDepthM}m
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 block">MINIMUM FACTOR OF SAFETY</span>
                    <span className={`text-base font-bold font-mono ${
                      simulationResult.minimum_transient_fs < 1.00 ? 'text-rose-400' :
                      simulationResult.minimum_transient_fs < 1.30 ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {simulationResult.minimum_transient_fs}
                    </span>
                    <span className="text-[9px] text-slate-400 block">
                      Antecedent FS0: {baselineFs}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-500 block">HAZARD CLASSIFICATION</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold text-center ${
                      simulationResult.tier_metadata?.badge_class || 'bg-slate-800 text-slate-300'
                    }`}>
                      {simulationResult.hazard_tier?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] text-slate-400 block text-center truncate">
                      {simulationResult.tier_metadata?.action_protocol || 'Standard monitoring'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WETTING FRONT DYNAMICS ANIMATOR */}
          {activeTab === 'wetting_front' && (
            <div className="space-y-6">
              {/* Animation Header & Scrubber Bar */}
              <div className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`p-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
                        isPlaying 
                          ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]' 
                          : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                      <span className="font-mono text-xs">{isPlaying ? 'PAUSE' : 'PLAY ANIMATION'}</span>
                    </button>
                    <button
                      onClick={() => { setIsPlaying(false); setActiveStepIndex(0); }}
                      className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Reset to Time Zero"
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                      {[1, 2, 5].map(spd => (
                        <button
                          key={spd}
                          onClick={() => setPlaybackSpeed(spd)}
                          className={`px-2 py-1 rounded font-bold ${
                            playbackSpeed === spd ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {spd}x
                        </button>
                      ))}
                    </div>
                  </div>

                  {currentStep && (
                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">TIME ELAPSED</span>
                        <span className="text-lg font-bold text-cyan-300">{currentStep.time_hr} hr</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">WETTING FRONT DEPTH</span>
                        <span className="text-lg font-bold text-purple-300">{currentStep.wetting_front_depth_m} m</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">TRANSIENT FS</span>
                        <span className={`text-lg font-bold ${
                          currentStep.transient_factor_of_safety < 1.00 ? 'text-rose-400' :
                          currentStep.transient_factor_of_safety < 1.30 ? 'text-amber-400' : 'text-emerald-400'
                        }`}>
                          {currentStep.transient_factor_of_safety}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scrubber Range Slider */}
                {simulationResult?.time_steps && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span>t = 0.0 hr</span>
                      <span className="text-cyan-400 font-bold">Scrubber: Step #{activeStepIndex + 1} of {simulationResult.time_steps.length}</span>
                      <span>t = {stormDurationHr} hr</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={simulationResult.time_steps.length - 1}
                      value={activeStepIndex}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setActiveStepIndex(Number(e.target.value));
                      }}
                      className="w-full accent-cyan-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Visual 2D Soil Column Profile Diagram & Penetration Inspector */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 2D Stratigraphic Column Schematic */}
                <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Mountain className="w-4 h-4 text-cyan-400" />
                      Wetting Front Downward Penetration Cross-Section
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">Green-Ampt Sharp Front</span>
                  </div>

                  {currentStep && (
                    <div className="relative h-80 bg-slate-950 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-between p-4 font-mono text-xs">
                      {/* Depth Gauge Lines */}
                      <div className="absolute left-2 top-0 bottom-0 w-8 flex flex-col justify-between text-[9px] text-slate-500 py-3 pointer-events-none">
                        <span>0.0m</span>
                        <span>{(criticalSlipDepthM * 0.5).toFixed(1)}m</span>
                        <span className="text-rose-400 font-bold">{criticalSlipDepthM.toFixed(1)}m (Slip)</span>
                        <span>{(criticalSlipDepthM * 1.5).toFixed(1)}m</span>
                      </div>

                      {/* Visual Soil Column Layers */}
                      <div className="ml-10 h-full relative rounded-lg border border-slate-800 overflow-hidden bg-amber-950/20">
                        {/* Ponding / Surface Runoff Layer */}
                        <div 
                          className="w-full bg-cyan-500/30 border-b border-cyan-400/50 flex items-center justify-between px-3 text-[10px] text-cyan-200 transition-all duration-300"
                          style={{ height: `${Math.min(30, Math.max(10, currentStep.runoff_rate_mm_hr * 0.8))}px` }}
                        >
                          <span className="flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-cyan-300" />
                            Runoff: {currentStep.runoff_rate_mm_hr} mm/hr
                          </span>
                          <span>Regime: {currentStep.ponding_regime}</span>
                        </div>

                        {/* Saturated Infiltrated Zone: 0 to zw */}
                        <div
                          className="w-full bg-gradient-to-b from-blue-700/80 to-blue-900/90 border-b-2 border-cyan-300 shadow-[0_4px_20px_rgba(6,182,212,0.5)] transition-all duration-300 relative flex items-end justify-between p-2 text-[10px] text-cyan-100"
                          style={{
                            height: `${Math.min(
                              100,
                              Math.max(8, (currentStep.wetting_front_depth_m / (criticalSlipDepthM * 1.5)) * 100)
                            )}%`
                          }}
                        >
                          <div className="font-bold flex items-center gap-1">
                            <Compass className="w-3.5 h-3.5 text-cyan-300 animate-spin" />
                            Saturated Infiltration Front (zw = {currentStep.wetting_front_depth_m}m)
                          </div>
                          <span className="bg-blue-950/90 px-1.5 py-0.5 rounded border border-blue-400/40 font-mono">
                            θ = {thetaS.toFixed(2)} (Saturated)
                          </span>
                        </div>

                        {/* Critical Slip Surface Boundary Marker */}
                        <div 
                          className="absolute w-full border-b-2 border-dashed border-rose-500 pointer-events-none flex items-center justify-between px-3 text-[10px] font-bold text-rose-300 bg-rose-950/30 py-0.5"
                          style={{ top: `${(criticalSlipDepthM / (criticalSlipDepthM * 1.5)) * 100}%` }}
                        >
                          <span>CRITICAL SHEAR FAILURE PLANE (z = {criticalSlipDepthM}m)</span>
                          <span>
                            {currentStep.wetting_front_depth_m >= criticalSlipDepthM 
                              ? '⚠️ SHEAR PLANE INUNDATED' 
                              : `Headroom: ${(criticalSlipDepthM - currentStep.wetting_front_depth_m).toFixed(2)}m`}
                          </span>
                        </div>

                        {/* Unsaturated Zone below front */}
                        <div className="absolute bottom-2 right-3 text-[10px] text-amber-300/80 bg-slate-950/80 px-2 py-1 rounded border border-amber-500/30">
                          Antecedent Unsaturated Matrix: θi = {thetaI.toFixed(2)} &bull; ψ = {currentStep.slip_surface_suction_kpa} kPa
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Step Details & Instantaneous Shear Strength Panel */}
                <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-cyan-400" />
                      Time-Step Instantaneous Physics & Shear Resistance
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-300">Fredlund & Rahardjo (1993)</span>
                  </div>

                  {currentStep && fredlundCurrent && (
                    <div className="space-y-4">
                      {/* Metric Tiles */}
                      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">INFILTRATION RATE f(t)</span>
                          <span className="text-base font-bold text-cyan-300">{currentStep.infiltration_rate_mm_hr} mm/hr</span>
                          <span className="text-[9px] text-slate-400 block">Ks: {ksMmHr} mm/hr</span>
                        </div>

                        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">CUMULATIVE INFILTRATION F(t)</span>
                          <span className="text-base font-bold text-blue-300">{currentStep.cumulative_infiltration_mm} mm</span>
                          <span className="text-[9px] text-slate-400 block">Mass Balance: P = F + R</span>
                        </div>

                        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">MATRIC SUCTION AT SLIP PLANE</span>
                          <span className="text-base font-bold text-purple-300">{currentStep.slip_surface_suction_kpa} kPa</span>
                          <span className="text-[9px] text-slate-400 block">Initial: {initialSuctionPsi0Kpa} kPa</span>
                        </div>

                        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">APPARENT SUCTION COHESION</span>
                          <span className="text-base font-bold text-emerald-300">{fredlundCurrent.suction_cohesion_kpa} kPa</span>
                          <span className="text-[9px] text-slate-400 block">cψ = ψ &bull; tan(φb)</span>
                        </div>
                      </div>

                      {/* Shear Strength Formulation Breakdown */}
                      <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                        <span className="text-[11px] font-bold text-white block">
                          TOTAL EXTENDED MOHR-COULOMB SHEAR STRENGTH τ:
                        </span>
                        <div className="text-slate-300 leading-relaxed text-[11px]">
                          τ = c' + (ua - uw) tan(φb) + (σ - ua) tan(φ')
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[9px]">EFFECTIVE COHESION c'</span>
                            <span className="text-white font-bold">{fredlundCurrent.cohesion_prime_kpa} kPa</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">APPARENT COHESION c</span>
                            <span className="text-cyan-300 font-bold">{fredlundCurrent.apparent_cohesion_kpa} kPa</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">TOTAL STRENGTH τ</span>
                            <span className="text-emerald-300 font-bold">{fredlundCurrent.shear_strength_tau_kpa} kPa</span>
                          </div>
                        </div>
                      </div>

                      {/* Safety Assessment Alert */}
                      <div className={`p-3 rounded-xl border flex items-start gap-3 ${
                        currentStep.transient_factor_of_safety < 1.00
                          ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                          : currentStep.transient_factor_of_safety < 1.30
                          ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
                          : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                      }`}>
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-xs block">
                            Regime: {currentStep.ponding_regime.toUpperCase()} &bull; FS = {currentStep.transient_factor_of_safety}
                          </span>
                          <p className="text-[11px] opacity-90 leading-normal">
                            {currentStep.transient_factor_of_safety < 1.00 
                              ? 'Critical instability reached: Wetting front has compromised matric suction cohesion below the required driving shear stress.'
                              : currentStep.transient_factor_of_safety < 1.30
                              ? 'Elevated risk: Significant suction depletion has occurred along the potential failure plane.'
                              : 'Stable buffer: Retained matric suction maintains positive factor of safety above design thresholds.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FS DECAY CURVE & SUCTION LOSS */}
          {activeTab === 'fs_decay' && (
            <div className="space-y-6">
              {/* Decay Curve Full Chart */}
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-400" />
                    Transient Factor of Safety (FS) Decay & Matric Suction Loss Trajectory
                  </h3>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> FS(t)
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Req 1.30
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-500">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Fail 1.00
                    </span>
                    <span className="flex items-center gap-1.5 text-purple-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span> Suction ψ
                    </span>
                  </div>
                </div>

                <div className="h-72 bg-slate-950/50 rounded-xl p-3 border border-slate-800">
                  {fsDecayChartData && (
                    <Line
                      data={fsDecayChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: {
                          legend: { labels: { color: '#94a3b8', font: { size: 10 } } },
                          tooltip: { backgroundColor: '#0f172a' }
                        },
                        scales: {
                          x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 9 } } },
                          yFs: {
                            type: 'linear',
                            position: 'left',
                            min: 0.5,
                            max: Math.max(2.0, (baselineFs || 1.6) * 1.2),
                            grid: { color: '#1e293b' },
                            ticks: { color: '#10b981', font: { size: 9 } },
                            title: { display: true, text: 'Factor of Safety (FS)', color: '#10b981', font: { size: 10 } }
                          },
                          ySuction: {
                            type: 'linear',
                            position: 'right',
                            min: 0,
                            grid: { drawOnChartArea: false },
                            ticks: { color: '#a855f7', font: { size: 9 } },
                            title: { display: true, text: 'Matric Suction ψ (kPa)', color: '#a855f7', font: { size: 10 } }
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              {/* Data Table with Search and Export */}
              {simulationResult?.time_steps && (
                <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Database className="w-4 h-4 text-cyan-400" />
                      Discretized Time-Steps Numerical Record ({simulationResult.time_steps.length} intervals)
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-mono">
                      <button
                        onClick={() => handleCopy(JSON.stringify(simulationResult.time_steps, null, 2), 'steps_json')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      >
                        {copiedKey === 'steps_json' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>JSON</span>
                      </button>
                    </div>
                  </div>

                  <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Time (h)</th>
                          <th className="p-2.5">Infil Rate (mm/h)</th>
                          <th className="p-2.5">Cum Infil (mm)</th>
                          <th className="p-2.5">Runoff (mm/h)</th>
                          <th className="p-2.5">Front Depth (m)</th>
                          <th className="p-2.5">Suction (kPa)</th>
                          <th className="p-2.5">Factor of Safety</th>
                          <th className="p-2.5">Regime</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {simulationResult.time_steps.map((ts, idx) => (
                          <tr 
                            key={idx} 
                            className={`hover:bg-cyan-950/20 transition-colors ${
                              ts.transient_factor_of_safety < 1.00 ? 'bg-rose-950/20 text-rose-200' :
                              ts.transient_factor_of_safety < 1.30 ? 'bg-amber-950/15 text-amber-200' : ''
                            }`}
                          >
                            <td className="p-2.5 font-bold">{ts.time_hr}</td>
                            <td className="p-2.5">{ts.infiltration_rate_mm_hr}</td>
                            <td className="p-2.5 text-cyan-300">{ts.cumulative_infiltration_mm}</td>
                            <td className="p-2.5 text-amber-300">{ts.runoff_rate_mm_hr}</td>
                            <td className="p-2.5 text-purple-300 font-bold">{ts.wetting_front_depth_m}</td>
                            <td className="p-2.5">{ts.slip_surface_suction_kpa}</td>
                            <td className="p-2.5 font-bold">{ts.transient_factor_of_safety}</td>
                            <td className="p-2.5 text-[10px] uppercase text-slate-400">{ts.ponding_regime}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: APPARENT THERMAL INERTIA (ATI) WORKBENCH */}
          {activeTab === 'ati_workbench' && (
            <div className="space-y-6">
              {/* ATI Scientific Overview & Scene Controls */}
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold text-white">
                      Split-Window Diurnal Apparent Thermal Inertia (ATI) Seepage Tracer
                    </h3>
                  </div>
                  <button
                    onClick={handleRunAtiAnalysis}
                    disabled={isProcessingAti}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isProcessingAti ? 'animate-spin' : ''}`} />
                    <span>{isProcessingAti ? 'Analyzing...' : 'Recalculate ATI'}</span>
                  </button>
                </div>

                {/* Physics Formulation Banner */}
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
                  <div>
                    <span className="text-cyan-400 font-bold">Price (1985) Split-Window Formulation: </span>
                    <span>ATI = S &bull; (1 - α) / ΔT_DTR, where ΔT_DTR = Day LST - Night LST</span>
                  </div>
                  <span className="text-[10px] text-slate-500">Landsat-9 / Sentinel-3 SLSTR Fusion</span>
                </div>

                {/* Sensor & Threshold Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">DAY SCENE ID</label>
                    <input
                      type="text"
                      value={daySceneId}
                      onChange={(e) => setDaySceneId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">NIGHT SCENE ID</label>
                    <input
                      type="text"
                      value={nightSceneId}
                      onChange={(e) => setNightSceneId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>SOLAR CORRECTION FACTOR S</span>
                      <span className="text-white">{solarCorrectionFactor.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={solarCorrectionFactor}
                      onChange={(e) => setSolarCorrectionFactor(Number(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>SEEPAGE THRESHOLD</span>
                      <span className="text-amber-400">{minAtiThreshold.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.020"
                      max="0.080"
                      step="0.005"
                      value={minAtiThreshold}
                      onChange={(e) => setMinAtiThreshold(Number(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* ATI Scorecard & Seepage Footprint */}
              {atiResult && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-900/60 border border-amber-500/20 rounded-2xl">
                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 block">MEAN TRANSECT ATI</span>
                    <span className="text-base font-bold font-mono text-white">
                      {atiResult.mean_apparent_thermal_inertia}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Cross-Section Baseline</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 block">MAX PEAK ATI</span>
                    <span className="text-base font-bold font-mono text-amber-300">
                      {atiResult.max_apparent_thermal_inertia}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Anomaly Maximum</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 block">SEEPAGE DETECTED</span>
                    <span className={`text-base font-bold font-mono ${
                      atiResult.thermal_seepage_detected ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {atiResult.thermal_seepage_detected ? 'YES (ANOMALY)' : 'NORMAL'}
                    </span>
                    <span className="text-[9px] text-slate-400 block">Threshold: {minAtiThreshold}</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] font-mono text-slate-500 block">ESTIMATED SEEPAGE AREA</span>
                    <span className="text-base font-bold font-mono text-cyan-300">
                      {atiResult.seepage_area_hectares} ha
                    </span>
                    <span className="text-[9px] text-slate-400 block">Surface Daylighting</span>
                  </div>

                  <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                    <span className="text-[10px] font-mono text-slate-500 block">SYNC WITH MAP</span>
                    <button
                      onClick={() => {
                        if (onApplyAtiAnalysis) onApplyAtiAnalysis(atiResult);
                        onClose();
                      }}
                      className="px-2 py-1 text-[10px] font-mono font-bold bg-amber-600 hover:bg-amber-500 text-white rounded shadow"
                    >
                      Apply ATI to Map
                    </button>
                  </div>
                </div>
              )}

              {/* ATI Transect Chart & Table */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
                  <h4 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    Cross-Sectional ATI & Diurnal Thermal Damping Profile
                  </h4>
                  <div className="h-60 bg-slate-950/50 rounded-xl p-2 border border-slate-800">
                    {atiChartData && (
                      <Line
                        data={atiChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { labels: { color: '#94a3b8', font: { size: 9 } } },
                            tooltip: { backgroundColor: '#0f172a' }
                          },
                          scales: {
                            x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 9 } } },
                            yAti: {
                              type: 'linear',
                              position: 'left',
                              grid: { color: '#1e293b' },
                              ticks: { color: '#38bdf8', font: { size: 9 } },
                              title: { display: true, text: 'ATI', color: '#38bdf8', font: { size: 9 } }
                            },
                            yDtr: {
                              type: 'linear',
                              position: 'right',
                              grid: { drawOnChartArea: false },
                              ticks: { color: '#f97316', font: { size: 9 } },
                              title: { display: true, text: 'DTR (°C)', color: '#f97316', font: { size: 9 } }
                            }
                          }
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* Transect Points Table */}
                <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h4 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                      <Thermometer className="w-4 h-4 text-amber-400" />
                      Transect Station Stations & Classification
                    </h4>
                    <button
                      onClick={() => setAtiTransectPoints([
                        { station_x_m: 0.0, albedo: 0.22, day_lst_celsius: 36.5, night_lst_celsius: 14.0 },
                        { station_x_m: 45.0, albedo: 0.20, day_lst_celsius: 38.0, night_lst_celsius: 13.5 },
                        { station_x_m: 90.0, albedo: 0.19, day_lst_celsius: 37.2, night_lst_celsius: 14.2 },
                        { station_x_m: 135.0, albedo: 0.15, day_lst_celsius: 29.5, night_lst_celsius: 16.8 },
                        { station_x_m: 180.0, albedo: 0.11, day_lst_celsius: 23.0, night_lst_celsius: 17.5 }
                      ])}
                      className="flex items-center gap-1 text-[10px] font-mono text-slate-400 hover:text-cyan-300 transition-colors"
                      title="Reset Transect Stations"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Stations</span>
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-xl">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-950 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-2">Station (m)</th>
                          <th className="p-2">Albedo α</th>
                          <th className="p-2">Day/Night (°C)</th>
                          <th className="p-2">DTR (°C)</th>
                          <th className="p-2">ATI</th>
                          <th className="p-2">Class</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {atiResult?.ati_points?.map((pt, idx) => (
                          <tr key={idx} className="hover:bg-cyan-950/20">
                            <td className="p-2 font-bold">{pt.station_x_m}m</td>
                            <td className="p-2">{pt.albedo}</td>
                            <td className="p-2">{pt.day_lst_celsius}° / {pt.night_lst_celsius}°</td>
                            <td className="p-2 text-orange-300 font-bold">{pt.dtr_celsius}°C</td>
                            <td className="p-2 text-cyan-300 font-bold">{pt.apparent_thermal_inertia}</td>
                            <td className="p-2">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase ${
                                ATI_ANOMALY_CONFIGS[pt.anomaly_class]?.badge_class || 'bg-slate-800 text-slate-300'
                              }`}>
                                {pt.anomaly_class?.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DYNAMIC TILES & CONTRACT INSPECTOR */}
          {activeTab === 'tiles_contract' && (
            <div className="space-y-6">
              {/* Dynamic Tile Layer Previewer */}
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Dynamic XYZ Tile Stream Inspector (Raster Services)
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    {['factor_of_safety', 'wetting_front', 'suction', 'infiltration_rate'].map(m => (
                      <button
                        key={m}
                        onClick={() => setTilePreviewMetric(m)}
                        className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          tilePreviewMetric === m ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m === 'factor_of_safety' ? 'FS' : m === 'wetting_front' ? 'Wetting Front' : m === 'suction' ? 'Suction' : 'Rate'}
                      </button>
                    ))}
                  </div>
                </div>

                {simulationResult && (
                  <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                    <span className="text-[10px] text-slate-500 block">CANONICAL INFILTRATION TILE TEMPLATE</span>
                    <div className="text-cyan-300 break-all bg-slate-900/80 p-2 rounded border border-slate-800">
                      {buildRainfallInfiltrationTileUrlTemplate(simulationResult.simulation_id, tilePreviewMetric)}
                    </div>
                  </div>
                )}

                {/* ATI Dynamic XYZ Tile Stream Inspector */}
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      Apparent Thermal Inertia (ATI) Tile Stream
                    </span>
                    <div className="flex items-center gap-1 text-xs font-mono">
                      {[
                        { id: 'thermal_inertia', label: 'ATI' },
                        { id: 'seepage_anomaly', label: 'Anomaly' },
                        { id: 'dtr', label: 'ΔT DTR' }
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => setAtiTilePreviewMetric(m.id)}
                          className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] transition-all ${
                            atiTilePreviewMetric === m.id ? 'bg-amber-600 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {atiResult && (
                    <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1 text-xs font-mono">
                      <span className="text-[10px] text-slate-500 block">CANONICAL ATI TILE TEMPLATE</span>
                      <div className="text-amber-300 break-all bg-slate-900/80 p-2 rounded border border-slate-800">
                        {buildApparentThermalInertiaTileUrlTemplate(atiResult.analysis_id, atiTilePreviewMetric)}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* JSON Contract Inspector */}
              <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    Backend API Schema Contract Inspector
                  </h3>
                  <button
                    onClick={() => handleCopy(JSON.stringify(simulationResult, null, 2), 'full_contract_json')}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-mono rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                  >
                    {copiedKey === 'full_contract_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Full Payload</span>
                  </button>
                </div>

                <div className="h-64 overflow-y-auto bg-slate-950/90 rounded-xl p-4 border border-slate-800 font-mono text-[11px] text-slate-300 leading-relaxed">
                  <pre>{JSON.stringify(simulationResult, null, 2)}</pre>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Info className="w-4 h-4 text-cyan-400" />
            <span>Cycle v2.5.14 &bull; Green-Ampt Ponding &amp; Suction Loss Dynamics</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (onApplySimulation && simulationResult) {
                  onApplySimulation(simulationResult, {
                    selectedMetric: tilePreviewMetric,
                    damCoordinates: damCoords
                  });
                }
                onClose();
              }}
              className="flex items-center gap-2 px-5 py-2 text-xs font-mono font-bold uppercase rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Map Explorer</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
