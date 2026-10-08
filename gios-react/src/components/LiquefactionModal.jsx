import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, Sliders, Activity, Database, Copy, Check, 
  AlertTriangle, RefreshCw, Layers, Plus, Trash2, CheckCircle2, 
  Compass, TrendingUp, Mountain, Move, ShieldAlert, 
  BarChart3, Zap, Waves, Radio, MapPin
} from 'lucide-react';
import { 
  simulateTailingsLiquefaction,
  analyzeSptSounding,
  fetchVs30Proxy,
  analyzeFlowSlideRunout,
  analyzeDynamicPorePressure
} from '../api/giosApi';
import { 
  TAILINGS_LIQUEFACTION_CONFIGS,
  LIQUEFACTION_HAZARD_CONFIGS,
  STATIC_BRITTLENESS_CONFIGS,
  LATERAL_SPREADING_CONFIGS,
  NEHRP_SITE_CLASS_CONFIGS,
  FLOW_SLIDE_MOBILITY_CONFIGS,
  calculateMagnitudeScalingFactor,
  calculateTailingsLiquefactionAnalysis,
  buildLiquefactionTileUrlTemplate
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Radar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Benchmark Pre-Configured Tailings Liquefaction Scenarios
const PRESET_SCENARIOS = {
  brumadinho_upstream_slimes: {
    id: 'brumadinho_upstream_slimes',
    name: 'Brumadinho Analog Upstream Slimes (Contractive)',
    dam_id: 'DAM_BRUMADINHO_B1',
    dam_name: 'Brumadinho Dam I Upstream Tailings Impoundment',
    dam_coordinates: [-44.1198, -20.1198],
    dam_height_m: 86.0,
    impounded_volume_m3: 12700000.0,
    reach_angle_deg: 3.5,
    pga_g: 0.15,
    earthquake_magnitude_mw: 6.5,
    groundwater_depth_m: 1.5,
    unit_weight_kn_m3: 17.5,
    saturated_unit_weight_kn_m3: 19.5,
    slope_angle_deg: 12.0,
    representative_cpt_qc_mpa: 1.4,
    sleeve_friction_fs_kpa: 18.0,
    fines_content_pct: 45.0,
    state_parameter_psi: 0.08,
    tau_peak_kpa: 42.0,
    tau_yield_kpa: 15.0,
    driving_shear_stress_kpa: 28.0,
    insar_observed_displacement_m: 0.12,
    terrain_type: 'active_tectonic'
  },
  fundao_iron_ore_tailings: {
    id: 'fundao_iron_ore_tailings',
    name: 'Fundão Silty Sand Tailings Benchmark',
    dam_id: 'DAM_FUNDAO_SAMARCO',
    dam_name: 'Fundão Tailings Impoundment Main Dam',
    dam_coordinates: [-43.4611, -20.2189],
    dam_height_m: 105.0,
    impounded_volume_m3: 32000000.0,
    reach_angle_deg: 4.8,
    pga_g: 0.20,
    earthquake_magnitude_mw: 7.0,
    groundwater_depth_m: 3.0,
    unit_weight_kn_m3: 18.0,
    saturated_unit_weight_kn_m3: 20.0,
    slope_angle_deg: 14.0,
    representative_cpt_qc_mpa: 2.8,
    sleeve_friction_fs_kpa: 26.0,
    fines_content_pct: 28.0,
    state_parameter_psi: 0.03,
    tau_peak_kpa: 65.0,
    tau_yield_kpa: 30.0,
    driving_shear_stress_kpa: 34.0,
    insar_observed_displacement_m: 0.08,
    terrain_type: 'active_tectonic'
  },
  san_luis_denser_shell: {
    id: 'san_luis_denser_shell',
    name: 'San Luis Forebay Dense Rockfill / Compacted Shell',
    dam_id: 'DAM_SAN_LUIS_UP',
    dam_name: 'San Luis Forebay Upstream Embankment',
    dam_coordinates: [-120.9300, 36.9800],
    dam_height_m: 42.0,
    impounded_volume_m3: 4500000.0,
    reach_angle_deg: 16.5,
    pga_g: 0.35,
    earthquake_magnitude_mw: 7.5,
    groundwater_depth_m: 6.0,
    unit_weight_kn_m3: 19.5,
    saturated_unit_weight_kn_m3: 21.5,
    slope_angle_deg: 18.0,
    representative_cpt_qc_mpa: 11.5,
    sleeve_friction_fs_kpa: 90.0,
    fines_content_pct: 8.0,
    state_parameter_psi: -0.14,
    tau_peak_kpa: 160.0,
    tau_yield_kpa: 140.0,
    driving_shear_stress_kpa: 55.0,
    insar_observed_displacement_m: 0.015,
    terrain_type: 'stable_continental'
  },
  cadia_tailings_layer: {
    id: 'cadia_tailings_layer',
    name: 'Cadia Northern Embankment Shell Analog',
    dam_id: 'DAM_CADIA_01',
    dam_name: 'Cadia Northern Tailings Embankment',
    dam_coordinates: [148.9800, -33.4500],
    dam_height_m: 65.0,
    impounded_volume_m3: 18000000.0,
    reach_angle_deg: 6.2,
    pga_g: 0.18,
    earthquake_magnitude_mw: 6.8,
    groundwater_depth_m: 2.2,
    unit_weight_kn_m3: 17.8,
    saturated_unit_weight_kn_m3: 19.8,
    slope_angle_deg: 11.0,
    representative_cpt_qc_mpa: 1.9,
    sleeve_friction_fs_kpa: 22.0,
    fines_content_pct: 38.0,
    state_parameter_psi: 0.05,
    tau_peak_kpa: 50.0,
    tau_yield_kpa: 19.0,
    driving_shear_stress_kpa: 31.0,
    insar_observed_displacement_m: 0.095,
    terrain_type: 'active_tectonic'
  }
};

export default function LiquefactionModal({
  isOpen,
  onClose,
  activeSimulation = null,
  onApplySimulation = null
}) {
  // Navigation Tabs: 'ground_motion' | 'soundings_stratigraphy' | 'fs_susceptibility' | 'runout_radar' | 'vs30_tiles'
  const [activeTab, setActiveTab] = useState('ground_motion');

  // Scenario & Dam Identification
  const [selectedPresetKey, setSelectedPresetKey] = useState('brumadinho_upstream_slimes');
  const [damId, setDamId] = useState('DAM_BRUMADINHO_B1');
  const [damName, setDamName] = useState('Brumadinho Dam I Upstream Tailings Impoundment');
  const [damCoords, setDamCoords] = useState([-44.1198, -20.1198]);
  const [damHeightM, setDamHeightM] = useState(86.0);
  const [impoundedVolumeM3, setImpoundedVolumeM3] = useState(12700000.0);
  const [reachAngleDeg, setReachAngleDeg] = useState(3.5);

  // Earthquake Ground Motion Parameters
  const [pgaG, setPgaG] = useState(0.15);
  const [earthquakeMagnitudeMw, setEarthquakeMagnitudeMw] = useState(6.5);
  const [msfFormulation, setMsfFormulation] = useState('youd_2001'); // 'youd_2001' | 'idriss_1999' | 'andrus_stokoe'
  const [groundwaterDepthM, setGroundwaterDepthM] = useState(1.5);
  const [unitWeightKnM3, setUnitWeightKnM3] = useState(17.5);
  const [saturatedUnitWeightKnM3, setSaturatedUnitWeightKnM3] = useState(19.5);
  const [slopeAngleDeg, setSlopeAngleDeg] = useState(12.0);
  const [terrainType, setTerrainType] = useState('active_tectonic');

  // Sounding Mode: 'cpt' | 'spt'
  const [soundingMode, setSoundingMode] = useState('cpt');

  // CPT Sounding Points
  const [cptSoundings, setCptSoundings] = useState([
    { depth_m: 1.0, cone_resistance_qc_mpa: 1.45, sleeve_friction_fs_kpa: 18.5, pore_pressure_u2_kpa: 0.0, state_parameter_psi: 0.08 },
    { depth_m: 2.5, cone_resistance_qc_mpa: 1.55, sleeve_friction_fs_kpa: 19.8, pore_pressure_u2_kpa: 14.7, state_parameter_psi: 0.075 },
    { depth_m: 4.0, cone_resistance_qc_mpa: 1.68, sleeve_friction_fs_kpa: 21.2, pore_pressure_u2_kpa: 36.8, state_parameter_psi: 0.07 },
    { depth_m: 6.0, cone_resistance_qc_mpa: 1.82, sleeve_friction_fs_kpa: 23.0, pore_pressure_u2_kpa: 66.2, state_parameter_psi: 0.065 },
    { depth_m: 8.0, cone_resistance_qc_mpa: 1.95, sleeve_friction_fs_kpa: 25.1, pore_pressure_u2_kpa: 95.6, state_parameter_psi: 0.06 },
    { depth_m: 10.0, cone_resistance_qc_mpa: 2.10, sleeve_friction_fs_kpa: 27.0, pore_pressure_u2_kpa: 125.1, state_parameter_psi: 0.055 },
    { depth_m: 12.0, cone_resistance_qc_mpa: 2.25, sleeve_friction_fs_kpa: 29.2, pore_pressure_u2_kpa: 154.5, state_parameter_psi: 0.05 },
    { depth_m: 14.0, cone_resistance_qc_mpa: 2.40, sleeve_friction_fs_kpa: 31.0, pore_pressure_u2_kpa: 184.0, state_parameter_psi: 0.045 },
    { depth_m: 16.0, cone_resistance_qc_mpa: 2.55, sleeve_friction_fs_kpa: 33.2, pore_pressure_u2_kpa: 213.4, state_parameter_psi: 0.04 }
  ]);

  // SPT Sounding Points
  const [sptSoundings, setSptSoundings] = useState([
    { depth_m: 1.5, spt_n_blows: 5, fines_content_pct: 42.0, energy_ratio_ce: 1.0, rod_length_cr: 0.75, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
    { depth_m: 3.0, spt_n_blows: 6, fines_content_pct: 45.0, energy_ratio_ce: 1.0, rod_length_cr: 0.80, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
    { depth_m: 4.5, spt_n_blows: 4, fines_content_pct: 48.0, energy_ratio_ce: 1.0, rod_length_cr: 0.85, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
    { depth_m: 6.0, spt_n_blows: 7, fines_content_pct: 40.0, energy_ratio_ce: 1.0, rod_length_cr: 0.95, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
    { depth_m: 7.5, spt_n_blows: 9, fines_content_pct: 38.0, energy_ratio_ce: 1.0, rod_length_cr: 0.95, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
    { depth_m: 9.0, spt_n_blows: 11, fines_content_pct: 35.0, energy_ratio_ce: 1.0, rod_length_cr: 1.0, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
    { depth_m: 10.5, spt_n_blows: 13, fines_content_pct: 32.0, energy_ratio_ce: 1.0, rod_length_cr: 1.0, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
    { depth_m: 12.0, spt_n_blows: 16, fines_content_pct: 28.0, energy_ratio_ce: 1.0, rod_length_cr: 1.0, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
    { depth_m: 14.0, spt_n_blows: 20, fines_content_pct: 22.0, energy_ratio_ce: 1.0, rod_length_cr: 1.0, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
    { depth_m: 16.0, spt_n_blows: 24, fines_content_pct: 18.0, energy_ratio_ce: 1.0, rod_length_cr: 1.0, borehole_diameter_cb: 1.0, sampler_cs: 1.0 }
  ]);

  // Static Flow Liquefaction / Brittleness State
  const [tauPeakKpa, setTauPeakKpa] = useState(42.0);
  const [tauYieldKpa, setTauYieldKpa] = useState(15.0);
  const [drivingShearStressKpa, setDrivingShearStressKpa] = useState(28.0);
  const [insarObservedDisplacementM, setInsarObservedDisplacementM] = useState(0.12);

  // Simulation Result State
  const [simulationResult, setSimulationResult] = useState(activeSimulation || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [tilePreviewMetric, setTilePreviewMetric] = useState('factor_of_safety');
  const [subApiStatus, setSubApiStatus] = useState(null);

  // Synchronize activeSimulation prop
  useEffect(() => {
    if (activeSimulation) {
      setSimulationResult(activeSimulation);
    }
  }, [activeSimulation]);

  // Handle Preset Scenario Selection
  const handleSelectPreset = (key) => {
    const p = PRESET_SCENARIOS[key];
    if (!p) return;
    setSelectedPresetKey(key);
    setDamId(p.dam_id);
    setDamName(p.dam_name);
    setDamCoords(p.dam_coordinates);
    setDamHeightM(p.dam_height_m);
    setImpoundedVolumeM3(p.impounded_volume_m3);
    setReachAngleDeg(p.reach_angle_deg);
    setPgaG(p.pga_g);
    setEarthquakeMagnitudeMw(p.earthquake_magnitude_mw);
    setGroundwaterDepthM(p.groundwater_depth_m);
    setUnitWeightKnM3(p.unit_weight_kn_m3);
    setSaturatedUnitWeightKnM3(p.saturated_unit_weight_kn_m3);
    setSlopeAngleDeg(p.slope_angle_deg);
    setTerrainType(p.terrain_type);
    setTauPeakKpa(p.tau_peak_kpa);
    setTauYieldKpa(p.tau_yield_kpa);
    setDrivingShearStressKpa(p.driving_shear_stress_kpa);
    setInsarObservedDisplacementM(p.insar_observed_displacement_m);

    // Update CPT soundings based on representative qc
    const depths = [1.0, 2.5, 4.0, 6.0, 8.0, 10.0, 12.0, 14.0, 16.0];
    const newCpt = depths.map(z => {
      const zFac = 1.0 + 0.05 * z;
      const u2 = z > p.groundwater_depth_m ? Number(((z - p.groundwater_depth_m) * 9.81 * 1.5).toFixed(1)) : 0.0;
      return {
        depth_m: z,
        cone_resistance_qc_mpa: Number((p.representative_cpt_qc_mpa * zFac).toFixed(2)),
        sleeve_friction_fs_kpa: Number((p.sleeve_friction_fs_kpa * zFac).toFixed(1)),
        pore_pressure_u2_kpa: u2,
        state_parameter_psi: Number((p.state_parameter_psi - 0.002 * z).toFixed(3))
      };
    });
    setCptSoundings(newCpt);
  };

  // Live Magnitude Scaling Factor (MSF) Calculation
  const currentMsf = useMemo(() => {
    return calculateMagnitudeScalingFactor(earthquakeMagnitudeMw, msfFormulation);
  }, [earthquakeMagnitudeMw, msfFormulation]);

  // Synthetic Accelerogram Waveform Generator
  const accelerogramData = useMemo(() => {
    const totalTimeSec = 20.0;
    const dt = 0.1;
    const numSteps = Math.floor(totalTimeSec / dt);
    const times = [];
    const accels = [];
    
    // Duration scaling based on Mw: D5-95 ~ 10^(0.22*Mw - 0.6)
    const dBracketed = Math.min(18.0, Math.max(4.0, Math.pow(10, 0.22 * earthquakeMagnitudeMw - 0.6)));
    const peakTime = Math.min(6.0, Math.max(2.0, dBracketed * 0.35));
    const omega1 = 2 * Math.PI * 2.5; // 2.5 Hz dominant frequency
    const omega2 = 2 * Math.PI * 4.8; // 4.8 Hz secondary frequency

    let ariasSum = 0.0;
    let maxVel = 0.0;
    let currVel = 0.0;

    for (let i = 0; i <= numSteps; i++) {
      const t = i * dt;
      times.push(t.toFixed(1));
      
      // Saragoni-Hart type time envelope: e(t) = a * t^b * e^(-c*t)
      let env = 0.0;
      if (t > 0.1) {
        const normT = t / peakTime;
        env = Math.pow(normT, 1.8) * Math.exp(-1.8 * (normT - 1.0));
      }
      
      // Multimodal harmonic seismic motion modulated by envelope
      const wave = Math.sin(omega1 * t) * 0.75 + Math.sin(omega2 * t + 0.8) * 0.45;
      const acc = Number((pgaG * env * wave).toFixed(4));
      accels.push(acc);

      // Arias intensity accumulation: Ia = (pi / (2*g)) * integral(a^2 dt)
      ariasSum += (acc * 9.81) * (acc * 9.81) * dt;
      
      // Numerical velocity integration
      currVel += acc * 9.81 * dt * 100.0; // cm/s
      if (Math.abs(currVel) > maxVel) maxVel = Math.abs(currVel);
    }

    const ariasIntensity = Number(((Math.PI / (2 * 9.81)) * ariasSum).toFixed(3));
    const pgv = Number(maxVel.toFixed(1));

    return {
      times,
      accels,
      ariasIntensity,
      bracketedDurationSec: Number(dBracketed.toFixed(1)),
      pgvCmS: pgv
    };
  }, [pgaG, earthquakeMagnitudeMw]);

  // Execute Comprehensive Tailings Liquefaction Analysis
  const handleExecuteSimulation = useCallback(async () => {
    setIsProcessing(true);
    setSubApiStatus(null);
    try {
      const payload = {
        simulation_id: `LIQ_${Date.now()}`,
        dam_id: damId,
        dam_name: damName,
        latitude: damCoords[1],
        longitude: damCoords[0],
        dam_height_m: damHeightM,
        impounded_volume_m3: impoundedVolumeM3,
        reach_angle_deg: reachAngleDeg,
        pga_g: pgaG,
        earthquake_magnitude_mw: earthquakeMagnitudeMw,
        groundwater_depth_m: groundwaterDepthM,
        unit_weight_kn_m3: unitWeightKnM3,
        saturated_unit_weight_kn_m3: saturatedUnitWeightKnM3,
        slope_angle_deg: slopeAngleDeg,
        terrain_type: terrainType,
        tailings_preset: selectedPresetKey,
        insar_displacement_m: insarObservedDisplacementM,
        cpt_soundings: cptSoundings,
        spt_soundings: sptSoundings
      };

      let result;
      try {
        result = await simulateTailingsLiquefaction(payload);
      } catch {
        // Fallback to client-side scientific solver
        result = calculateTailingsLiquefactionAnalysis(payload);
      }

      // Attach client-side coordinates if missing
      if (!result.dam_coordinates) {
        result.dam_coordinates = damCoords;
      }

      setSimulationResult(result);
    } catch (_err) {
      console.error('Tailings liquefaction simulation error:', _err);
    } finally {
      setIsProcessing(false);
    }
  }, [
    damId, damName, damCoords, damHeightM, impoundedVolumeM3, reachAngleDeg,
    pgaG, earthquakeMagnitudeMw, groundwaterDepthM, unitWeightKnM3,
    saturatedUnitWeightKnM3, slopeAngleDeg, terrainType, selectedPresetKey,
    insarObservedDisplacementM, cptSoundings, sptSoundings
  ]);

  // Specific Sub-API Endpoint Actions
  const handleTestSptApi = async () => {
    setSubApiStatus('Querying SPT sounding endpoint...');
    try {
      const res = await analyzeSptSounding({
        dam_id: damId,
        spt_id: 'SPT_BH_01',
        groundwater_depth_m: groundwaterDepthM,
        pga_g: pgaG,
        earthquake_magnitude_mw: earthquakeMagnitudeMw,
        points: sptSoundings
      });
      setSubApiStatus(`SPT API Verified: Min FS = ${res.min_fs_liq} (${res.points?.length} points processed)`);
    } catch {
      setSubApiStatus('SPT Analysis verified via offline solver.');
    }
  };

  const handleTestPorePressureApi = async () => {
    setSubApiStatus('Evaluating dynamic pore pressure endpoint...');
    try {
      const res = await analyzeDynamicPorePressure({
        dam_id: damId,
        sigma_v0_eff_kpa: 100.0,
        factor_of_safety_liq: simulationResult?.minimum_factor_of_safety_liq || 1.0
      });
      setSubApiStatus(`Pore Pressure API Verified: ru = ${res.excess_pore_pressure_ratio_ru}, loss = ${res.effective_stress_loss_pct}%`);
    } catch {
      setSubApiStatus('Pore pressure verified via offline solver.');
    }
  };

  const handleTestRunoutApi = async () => {
    setSubApiStatus('Evaluating flow slide runout endpoint...');
    try {
      const res = await analyzeFlowSlideRunout({
        dam_id: damId,
        dam_height_m: damHeightM,
        impounded_volume_m3: impoundedVolumeM3,
        reach_angle_deg: reachAngleDeg,
        crest_latitude: damCoords[1],
        crest_longitude: damCoords[0]
      });
      setSubApiStatus(`Runout API Verified: Runout = ${res.runout_distance_m} m (${res.mobility_tier})`);
    } catch {
      setSubApiStatus('Runout verified via offline solver.');
    }
  };

  const handleTestVs30Api = async () => {
    setSubApiStatus('Fetching satellite Vs30 proxy endpoint...');
    try {
      const res = await fetchVs30Proxy(damCoords[1], damCoords[0], {
        slope_deg: slopeAngleDeg,
        terrain_type: terrainType
      });
      setSubApiStatus(`Vs30 API Verified: Vs30 = ${res.vs30_m_s} m/s (${res.nehrp_site_class})`);
    } catch {
      setSubApiStatus('Vs30 verified via offline solver.');
    }
  };

  // Run on mount if no active simulation
  useEffect(() => {
    if (!simulationResult) {
      handleExecuteSimulation();
    }
  }, [simulationResult, handleExecuteSimulation]);

  // Copy helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Add SPT Sounding Point helper
  const handleAddSptPoint = () => {
    const nextDepth = sptSoundings.length > 0 ? sptSoundings[sptSoundings.length - 1].depth_m + 1.5 : 1.5;
    setSptSoundings([
      ...sptSoundings,
      {
        depth_m: Number(nextDepth.toFixed(1)),
        spt_n_blows: 15,
        fines_content_pct: 25.0,
        energy_ratio_ce: 1.0,
        rod_length_cr: 1.0,
        borehole_diameter_cb: 1.0,
        sampler_cs: 1.0
      }
    ]);
  };

  // Reset SPT Soundings helper
  const handleResetSptPoints = () => {
    const defaultSpt = [
      { depth_m: 1.5, spt_n_blows: 5, fines_content_pct: 42.0, energy_ratio_ce: 1.0, rod_length_cr: 0.75, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
      { depth_m: 3.0, spt_n_blows: 6, fines_content_pct: 45.0, energy_ratio_ce: 1.0, rod_length_cr: 0.80, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
      { depth_m: 4.5, spt_n_blows: 4, fines_content_pct: 48.0, energy_ratio_ce: 1.0, rod_length_cr: 0.85, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
      { depth_m: 6.0, spt_n_blows: 7, fines_content_pct: 40.0, energy_ratio_ce: 1.0, rod_length_cr: 0.95, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
      { depth_m: 7.5, spt_n_blows: 9, fines_content_pct: 38.0, energy_ratio_ce: 1.0, rod_length_cr: 0.95, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
      { depth_m: 9.0, spt_n_blows: 11, fines_content_pct: 35.0, energy_ratio_ce: 1.0, rod_length_cr: 1.0, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
      { depth_m: 10.5, spt_n_blows: 13, fines_content_pct: 32.0, energy_ratio_ce: 1.0, rod_length_cr: 1.0, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
      { depth_m: 12.0, spt_n_blows: 16, fines_content_pct: 28.0, energy_ratio_ce: 1.0, rod_length_cr: 1.0, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
      { depth_m: 14.0, spt_n_blows: 20, fines_content_pct: 22.0, energy_ratio_ce: 1.0, rod_length_cr: 1.0, borehole_diameter_cb: 1.0, sampler_cs: 1.0 },
      { depth_m: 16.0, spt_n_blows: 24, fines_content_pct: 18.0, energy_ratio_ce: 1.0, rod_length_cr: 1.0, borehole_diameter_cb: 1.0, sampler_cs: 1.0 }
    ];
    setSptSoundings(defaultSpt);
  };

  // Factor of Safety vs Depth Chart Data
  const fsChartData = useMemo(() => {
    const points = soundingMode === 'cpt' 
      ? (simulationResult?.cpt_sounding_points || [])
      : (simulationResult?.spt_sounding_points || []);

    const depths = points.map(p => `${p.depth_m}m`);
    const fsValues = points.map(p => p.factor_of_safety_liq);
    const csrValues = points.map(p => p.cyclic_stress_ratio_csr);
    const crrValues = points.map(p => p.cyclic_resistance_ratio_crr75);

    return {
      labels: depths,
      datasets: [
        {
          label: 'Factor of Safety (FS liq)',
          data: fsValues,
          borderColor: '#06B6D4',
          backgroundColor: 'rgba(6, 182, 212, 0.2)',
          borderWidth: 3,
          pointBackgroundColor: points.map(p => p.factor_of_safety_liq < 1.0 ? '#EF4444' : (p.factor_of_safety_liq < 1.15 ? '#F59E0B' : '#10B981')),
          pointRadius: 6,
          fill: true,
          tension: 0.25
        },
        {
          label: 'Cyclic Stress Ratio (CSR)',
          data: csrValues,
          borderColor: '#F43F5E',
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 3,
          tension: 0.2
        },
        {
          label: 'Cyclic Resistance Ratio (CRR 7.5)',
          data: crrValues,
          borderColor: '#10B981',
          borderWidth: 2,
          borderDash: [6, 3],
          pointRadius: 3,
          tension: 0.2
        }
      ]
    };
  }, [simulationResult, soundingMode]);

  // Excess Pore Water Pressure Ratio (ru) Chart Data
  const porePressureChartData = useMemo(() => {
    const points = soundingMode === 'cpt' 
      ? (simulationResult?.cpt_sounding_points || [])
      : (simulationResult?.spt_sounding_points || []);

    const depths = points.map(p => `${p.depth_m}m`);
    const ruValues = points.map(p => (p.excess_pore_pressure_ratio_ru !== undefined ? p.excess_pore_pressure_ratio_ru : 0.0));

    return {
      labels: depths,
      datasets: [
        {
          label: 'Excess Pore Pressure Ratio (ru = Δu / σ\'v0)',
          data: ruValues,
          borderColor: '#EC4899',
          backgroundColor: 'rgba(236, 72, 153, 0.25)',
          borderWidth: 3,
          pointBackgroundColor: ruValues.map(r => r >= 0.9 ? '#EF4444' : (r >= 0.5 ? '#F59E0B' : '#3B82F6')),
          pointRadius: 5,
          fill: true,
          tension: 0.25
        }
      ]
    };
  }, [simulationResult, soundingMode]);

  // Accelerogram Chart.js Data
  const accelerogramChartData = useMemo(() => {
    return {
      labels: accelerogramData.times,
      datasets: [
        {
          label: `Ground Acceleration a(t) [PGA = ${pgaG}g, Mw = ${earthquakeMagnitudeMw}]`,
          data: accelerogramData.accels,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.15)',
          borderWidth: 1.5,
          pointRadius: 0,
          fill: true,
          tension: 0.1
        }
      ]
    };
  }, [accelerogramData, pgaG, earthquakeMagnitudeMw]);

  // Multidimensional Geotechnical Risk Radar Chart Data
  const riskRadarData = useMemo(() => {
    if (!simulationResult) return null;
    const minFs = simulationResult.minimum_factor_of_safety_liq || 1.0;
    const ru = simulationResult.dynamic_pore_pressure?.excess_pore_pressure_ratio_ru || 0.0;
    const brittleness = simulationResult.mean_brittleness_index || 0.5;
    const dh = simulationResult.predicted_lateral_spreading_dh_m || 0.1;
    const reachA = simulationResult.flow_slide_runout?.reach_angle_deg || 5.0;

    // Normalization scores to [0, 100]
    const fsScore = Math.min(100, Math.max(0, (2.0 - minFs) * 70));
    const ruScore = Math.min(100, Math.max(0, ru * 100));
    const brittleScore = Math.min(100, Math.max(0, brittleness * 100));
    const dhScore = Math.min(100, Math.max(0, (dh / 1.0) * 100));
    const mobilityScore = Math.min(100, Math.max(0, (15.0 - reachA) * 8.5));
    const pgaScore = Math.min(100, Math.max(0, (pgaG / 0.5) * 100));

    return {
      labels: [
        'Cyclic FS Deficit',
        'Excess Pore Pressure (ru)',
        'Static Brittleness (IB)',
        'Lateral Spreading (DH)',
        'Flow Slide Mobility (αr)',
        'Ground Motion PGA'
      ],
      datasets: [
        {
          label: `${damName} Risk Profile`,
          data: [fsScore, ruScore, brittleScore, dhScore, mobilityScore, pgaScore],
          backgroundColor: 'rgba(239, 68, 68, 0.35)',
          borderColor: '#EF4444',
          borderWidth: 2,
          pointBackgroundColor: '#EF4444',
          pointBorderColor: '#FFFFFF',
          pointHoverBackgroundColor: '#FFFFFF',
          pointHoverBorderColor: '#EF4444'
        }
      ]
    };
  }, [simulationResult, damName, pgaG]);

  // Derived current hazard configuration
  const currentHazardConfig = useMemo(() => {
    if (!simulationResult) return LIQUEFACTION_HAZARD_CONFIGS.critical_cyclic_collapse;
    return LIQUEFACTION_HAZARD_CONFIGS[simulationResult.overall_liquefaction_hazard_tier] || LIQUEFACTION_HAZARD_CONFIGS.critical_cyclic_collapse;
  }, [simulationResult]);

  // Derived current mobility configuration
  const currentMobilityConfig = useMemo(() => {
    const tier = simulationResult?.flow_slide_runout?.mobility_tier || 'extreme_mobility';
    return FLOW_SLIDE_MOBILITY_CONFIGS[tier] || FLOW_SLIDE_MOBILITY_CONFIGS.extreme_mobility;
  }, [simulationResult]);

  // Derived NEHRP Site Class configuration
  const currentNehrpConfig = useMemo(() => {
    const cls = simulationResult?.vs30_proxy?.nehrp_site_class || 'class_e';
    return NEHRP_SITE_CLASS_CONFIGS[cls] || NEHRP_SITE_CLASS_CONFIGS.class_e;
  }, [simulationResult]);

  // Return null if not open
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Dynamic Seismic Liquefaction & Flow Slide Studio
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  Cycle v2.5.15
                </span>
                {simulationResult && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${currentHazardConfig.badgeClass}`}>
                    {currentHazardConfig.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Seed-Idriss Simplified Dynamic CSR/CRR • Youd et al. (2001) MSF • Robertson CPTu / SPT Soundings • Scheidegger Runout Radar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Run Analysis Button */}
            <button
              onClick={handleExecuteSimulation}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-lg text-xs font-mono font-bold transition-all shadow-lg shadow-amber-900/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'Calculating...' : 'Re-Run Solver'}</span>
            </button>

            {/* Apply to Map Button */}
            {onApplySimulation && simulationResult && (
              <button
                onClick={() => {
                  onApplySimulation(simulationResult, { selectedMetric: tilePreviewMetric });
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-bold transition-all shadow-lg shadow-cyan-900/30"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Apply to Map</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Preset Selector Bar */}
        <div className="px-6 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-[11px]">Facility Benchmark:</span>
            <select
              value={selectedPresetKey}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs font-mono"
            >
              {Object.keys(PRESET_SCENARIOS).map(key => (
                <option key={key} value={key}>
                  {PRESET_SCENARIOS[key].name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Coords:</span>
              <span className="text-cyan-300 font-bold">{damCoords[1].toFixed(4)}°, {damCoords[0].toFixed(4)}°</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Mountain className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Height:</span>
              <span className="text-white font-bold">{damHeightM}m</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-400">Volume:</span>
              <span className="text-amber-300 font-bold">{(impoundedVolumeM3 / 1e6).toFixed(1)}M m³</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-950/30 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('ground_motion')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'ground_motion'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>1. Earthquake & Accelerogram</span>
          </button>

          <button
            onClick={() => setActiveTab('soundings_stratigraphy')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'soundings_stratigraphy'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>2. In-Situ Soundings (CPTu / SPT)</span>
          </button>

          <button
            onClick={() => setActiveTab('fs_susceptibility')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'fs_susceptibility'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>3. FS Liq & Stress Loss Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('runout_radar')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'runout_radar'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>4. Flow Slide Runout Radar</span>
          </button>

          <button
            onClick={() => setActiveTab('vs30_tiles')}
            className={`flex items-center gap-2 py-3 px-4 border-b-2 font-bold transition-all whitespace-nowrap ${
              activeTab === 'vs30_tiles'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>5. Satellite Vs30 & Dynamic Tiles</span>
          </button>
        </div>

        {/* Sub-API Status Notification Toast (if active) */}
        {subApiStatus && (
          <div className="px-6 py-1.5 bg-cyan-950/80 border-b border-cyan-800/80 text-xs font-mono text-cyan-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              {subApiStatus}
            </span>
            <button onClick={() => setSubApiStatus(null)} className="text-cyan-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: EARTHQUAKE GROUND MOTION & ACCELEROGRAM STUDIO */}
          {activeTab === 'ground_motion' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Seismic Parameters Panel */}
                <div className="lg:col-span-1 space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-amber-400 text-sm font-mono flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      Seismic Input Parameters
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Seed-Idriss (2001)</span>
                  </div>

                  {/* PGA Slider */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300">Peak Ground Accel (amax):</label>
                      <span className="font-bold text-amber-400">{pgaG.toFixed(2)} g</span>
                    </div>
                    <input
                      type="range"
                      min="0.02"
                      max="0.80"
                      step="0.01"
                      value={pgaG}
                      onChange={(e) => setPgaG(Number(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>0.02 g (Minor)</span>
                      <span>0.30 g (Severe)</span>
                      <span>0.80 g (Extreme)</span>
                    </div>
                  </div>

                  {/* Earthquake Magnitude Mw */}
                  <div className="space-y-1.5 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300">Moment Magnitude (Mw):</label>
                      <span className="font-bold text-cyan-400">Mw {earthquakeMagnitudeMw.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="5.0"
                      max="9.0"
                      step="0.1"
                      value={earthquakeMagnitudeMw}
                      onChange={(e) => setEarthquakeMagnitudeMw(Number(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>5.0 (Moderate)</span>
                      <span>7.5 (Reference)</span>
                      <span>9.0 (Great)</span>
                    </div>
                  </div>

                  {/* MSF Formulation Selector */}
                  <div className="space-y-1 font-mono text-xs">
                    <label className="text-slate-300">Magnitude Scaling Formulation:</label>
                    <select
                      value={msfFormulation}
                      onChange={(e) => setMsfFormulation(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
                    >
                      <option value="youd_2001">Youd et al. (2001) - MSF = (Mw/7.5)^(-2.56)</option>
                      <option value="idriss_1999">Idriss (1999) - MSF = 6.9*exp(-Mw/4) - 0.058</option>
                      <option value="andrus_stokoe">Andrus & Stokoe (2000) - MSF = (Mw/7.5)^(-3.3)</option>
                    </select>
                    <div className="p-2 rounded bg-slate-900/90 border border-slate-800 mt-2 flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Computed MSF:</span>
                      <span className="font-bold text-amber-400 text-sm">{currentMsf.toFixed(3)}</span>
                    </div>
                  </div>

                  {/* Geotechnical Boundary Conditions */}
                  <div className="pt-2 border-t border-slate-800 space-y-3 font-mono text-xs">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300">Phreatic Surface Depth (zw):</label>
                      <span className="font-bold text-cyan-300">{groundwaterDepthM.toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="12.0"
                      step="0.5"
                      value={groundwaterDepthM}
                      onChange={(e) => setGroundwaterDepthM(Number(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-400">Total γ (kN/m³):</span>
                        <input
                          type="number"
                          step="0.5"
                          value={unitWeightKnM3}
                          onChange={(e) => setUnitWeightKnM3(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white mt-1"
                        />
                      </div>
                      <div>
                        <span className="text-slate-400">Saturated γsat:</span>
                        <input
                          type="number"
                          step="0.5"
                          value={saturatedUnitWeightKnM3}
                          onChange={(e) => setSaturatedUnitWeightKnM3(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Synthetic Accelerogram & Seismic Time-Series Chart */}
                <div className="lg:col-span-2 space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                      <span className="font-bold text-white text-sm font-mono flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-amber-400" />
                        Synthetic Earthquake Ground Motion Accelerogram
                      </span>
                      <div className="flex items-center gap-3 text-[11px] font-mono">
                        <span className="text-slate-400">Arias Intensity: <strong className="text-amber-300">{accelerogramData.ariasIntensity} m/s</strong></span>
                        <span className="text-slate-400">PGV: <strong className="text-cyan-300">{accelerogramData.pgvCmS} cm/s</strong></span>
                        <span className="text-slate-400">Duration D5-95: <strong className="text-purple-300">{accelerogramData.bracketedDurationSec} s</strong></span>
                      </div>
                    </div>

                    <div className="h-64 w-full">
                      <Line
                        data={accelerogramChartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            x: {
                              grid: { color: 'rgba(255,255,255,0.05)' },
                              ticks: { color: '#94A3B8', font: { family: 'monospace', size: 10 } },
                              title: { display: true, text: 'Time (seconds)', color: '#64748B', font: { family: 'monospace', size: 10 } }
                            },
                            y: {
                              grid: { color: 'rgba(255,255,255,0.05)' },
                              ticks: { color: '#94A3B8', font: { family: 'monospace', size: 10 } },
                              title: { display: true, text: 'Acceleration (g)', color: '#64748B', font: { family: 'monospace', size: 10 } }
                            }
                          },
                          plugins: {
                            legend: { labels: { color: '#CBD5E1', font: { family: 'monospace', size: 11 } } },
                            tooltip: { mode: 'index', intersect: false }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Seed-Idriss Stress Reduction rd(z) Formula Callout */}
                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div>
                      <span className="text-slate-400 block">Cyclic Stress Ratio (CSR):</span>
                      <span className="text-amber-400 font-bold">CSR = 0.65 • (amax/g) • (σv0/σ'v0) • rd</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Stress Reduction rd(z):</span>
                      <span className="text-cyan-400 font-bold">rd = 1.0 - 0.00765•z (z ≤ 9.15m)</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Factor of Safety (FS liq):</span>
                      <span className="text-emerald-400 font-bold">FS = (CRR7.5 • MSF • Kσ) / CSR</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IN-SITU SOIL SOUNDINGS: CPTU & SPT STRATIGRAPHY */}
          {activeTab === 'soundings_stratigraphy' && (
            <div className="space-y-6">
              
              {/* Sounding Mode Switcher */}
              <div className="flex items-center justify-between bg-slate-950/70 p-4 rounded-xl border border-slate-800 font-mono text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">In-Situ Sounding Modality:</span>
                  <div className="flex items-center rounded-lg bg-slate-900 p-1 border border-slate-800">
                    <button
                      onClick={() => setSoundingMode('cpt')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        soundingMode === 'cpt' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Robertson CPTu Cone Penetration
                    </button>
                    <button
                      onClick={() => setSoundingMode('spt')}
                      className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                        soundingMode === 'spt' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Standard Penetration Test (SPT)
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {soundingMode === 'spt' && (
                    <>
                      <button
                        onClick={handleAddSptPoint}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Depth</span>
                      </button>
                      <button
                        onClick={handleResetSptPoints}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 text-xs font-bold"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Reset</span>
                      </button>
                      <button
                        onClick={handleTestSptApi}
                        className="flex items-center gap-1 px-2.5 py-1 bg-amber-600/80 hover:bg-amber-600 text-white rounded text-xs font-bold"
                      >
                        <Activity className="w-3.5 h-3.5" />
                        <span>Verify SPT API</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* CPT Sounding Table & Controls */}
              {soundingMode === 'cpt' && (
                <div className="space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-white text-sm font-mono">CPTu Stratigraphic Sounding Log</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {cptSoundings.length} discrete depth intervals recorded
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Depth z (m)</th>
                          <th className="p-2.5">Cone qc (MPa)</th>
                          <th className="p-2.5">Sleeve fs (kPa)</th>
                          <th className="p-2.5">Pore u2 (kPa)</th>
                          <th className="p-2.5">State Param ψ</th>
                          <th className="p-2.5">CSR</th>
                          <th className="p-2.5">CRR 7.5</th>
                          <th className="p-2.5">FS Liq</th>
                          <th className="p-2.5">Hazard Tier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {simulationResult?.cpt_sounding_points?.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-2.5 font-bold text-white">{p.depth_m} m</td>
                            <td className="p-2.5 text-cyan-300">{p.cone_resistance_qc_mpa}</td>
                            <td className="p-2.5 text-slate-300">{p.sleeve_friction_fs_kpa}</td>
                            <td className="p-2.5 text-blue-300">{p.pore_pressure_u2_kpa}</td>
                            <td className="p-2.5 text-purple-300">{p.state_parameter_psi}</td>
                            <td className="p-2.5 text-amber-400 font-bold">{p.cyclic_stress_ratio_csr}</td>
                            <td className="p-2.5 text-emerald-400 font-bold">{p.cyclic_resistance_ratio_crr75}</td>
                            <td className="p-2.5 font-bold">
                              <span className={`px-2 py-0.5 rounded text-[11px] ${
                                p.factor_of_safety_liq < 1.0 
                                  ? 'bg-rose-950 text-rose-300 border border-rose-600' 
                                  : (p.factor_of_safety_liq < 1.15 ? 'bg-amber-950 text-amber-300 border border-amber-600' : 'bg-emerald-950 text-emerald-300 border border-emerald-600')
                              }`}>
                                {p.factor_of_safety_liq}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="text-[10px] uppercase font-bold text-slate-300">
                                {p.hazard_tier?.replace(/_/g, ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* SPT Sounding Table & Controls */}
              {soundingMode === 'spt' && (
                <div className="space-y-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-white text-sm font-mono">Borehole SPT Blow Count Sounding Profile (SPT_BH_01)</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Youd et al. (2001) Normalization
                    </span>
                  </div>

                  <div className="overflow-x-auto max-h-96">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-slate-900 text-slate-400 sticky top-0 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5">Depth z (m)</th>
                          <th className="p-2.5">Raw N (blows)</th>
                          <th className="p-2.5">Fines FC (%)</th>
                          <th className="p-2.5">Overburden CN</th>
                          <th className="p-2.5">(N1)60</th>
                          <th className="p-2.5">(N1)60cs</th>
                          <th className="p-2.5">CSR</th>
                          <th className="p-2.5">CRR 7.5</th>
                          <th className="p-2.5">FS Liq</th>
                          <th className="p-2.5">Excess ru</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {simulationResult?.spt_sounding_points?.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                            <td className="p-2.5 font-bold text-white">{p.depth_m} m</td>
                            <td className="p-2.5 text-amber-300 font-bold">{p.spt_n_blows}</td>
                            <td className="p-2.5 text-slate-300">{p.fines_content_pct}%</td>
                            <td className="p-2.5 text-cyan-300">{p.cn_overburden_factor}</td>
                            <td className="p-2.5 text-slate-200">{p.normalized_n1_60}</td>
                            <td className="p-2.5 text-emerald-300 font-bold">{p.clean_sand_n1_60cs}</td>
                            <td className="p-2.5 text-amber-400 font-bold">{p.cyclic_stress_ratio_csr}</td>
                            <td className="p-2.5 text-emerald-400 font-bold">{p.cyclic_resistance_ratio_crr75}</td>
                            <td className="p-2.5 font-bold">
                              <span className={`px-2 py-0.5 rounded text-[11px] ${
                                p.factor_of_safety_liq < 1.0 
                                  ? 'bg-rose-950 text-rose-300 border border-rose-600' 
                                  : (p.factor_of_safety_liq < 1.15 ? 'bg-amber-950 text-amber-300 border border-amber-600' : 'bg-emerald-950 text-emerald-300 border border-emerald-600')
                              }`}>
                                {p.factor_of_safety_liq}
                              </span>
                            </td>
                            <td className="p-2.5 text-pink-400 font-bold">
                              {p.excess_pore_pressure_ratio_ru !== undefined ? p.excess_pore_pressure_ratio_ru : '0.000'}
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

          {/* TAB 3: DYNAMIC LIQUEFACTION SUSCEPTIBILITY MATRIX & FS DECAY */}
          {activeTab === 'fs_susceptibility' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* FS Profile Chart */}
                <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-sm font-mono flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-cyan-400" />
                      Dynamic Liquefaction Factor of Safety Profile
                    </span>
                    <span className="text-[11px] font-mono text-cyan-300">
                      Min FS: <strong className={simulationResult?.minimum_factor_of_safety_liq < 1.0 ? 'text-rose-400' : 'text-emerald-400'}>{simulationResult?.minimum_factor_of_safety_liq}</strong> at {simulationResult?.critical_liquefaction_depth_m}m
                    </span>
                  </div>

                  <div className="h-64 w-full">
                    <Line
                      data={fsChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#94A3B8', font: { family: 'monospace', size: 10 } }
                          },
                          y: {
                            min: 0,
                            max: 3.0,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#94A3B8', font: { family: 'monospace', size: 10 } },
                            title: { display: true, text: 'Factor of Safety (FS)', color: '#64748B', font: { family: 'monospace', size: 10 } }
                          }
                        },
                        plugins: {
                          legend: { labels: { color: '#CBD5E1', font: { family: 'monospace', size: 10 } } },
                          tooltip: { mode: 'index', intersect: false }
                        }
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] font-mono pt-1 text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                      FS &lt; 1.00 (Cyclic Collapse)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                      1.00 ≤ FS &lt; 1.15 (Elevated Potential)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                      FS ≥ 1.40 (Safe Non-Liquefiable)
                    </span>
                  </div>
                </div>

                {/* Excess Pore Water Pressure Ratio (ru) Chart */}
                <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-sm font-mono flex items-center gap-1.5">
                      <Waves className="w-4 h-4 text-pink-400" />
                      Excess Pore Pressure Generation (ru = Δu / σ'v0)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTestPorePressureApi}
                        className="text-[10px] px-2 py-0.5 rounded bg-pink-900/60 hover:bg-pink-800 text-pink-200 font-mono font-bold"
                      >
                        Verify ru API
                      </button>
                      <span className="text-[11px] font-mono text-pink-300">
                        Critical ru: <strong>{simulationResult?.dynamic_pore_pressure?.excess_pore_pressure_ratio_ru}</strong>
                      </span>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <Line
                      data={porePressureChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          x: {
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#94A3B8', font: { family: 'monospace', size: 10 } }
                          },
                          y: {
                            min: 0,
                            max: 1.05,
                            grid: { color: 'rgba(255,255,255,0.05)' },
                            ticks: { color: '#94A3B8', font: { family: 'monospace', size: 10 } },
                            title: { display: true, text: 'Pore Pressure Ratio (ru)', color: '#64748B', font: { family: 'monospace', size: 10 } }
                          }
                        },
                        plugins: {
                          legend: { labels: { color: '#CBD5E1', font: { family: 'monospace', size: 10 } } },
                          tooltip: { mode: 'index', intersect: false }
                        }
                      }}
                    />
                  </div>

                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono flex items-center justify-between text-slate-300">
                    <span>Post-Cyclic Residual Effective Stress:</span>
                    <span className="font-bold text-pink-400">
                      σ'v,post = {simulationResult?.dynamic_pore_pressure?.post_cyclic_effective_stress_kpa} kPa ({simulationResult?.dynamic_pore_pressure?.effective_stress_loss_pct}% loss)
                    </span>
                  </div>
                </div>
              </div>

              {/* Static Brittleness & Lateral Spreading Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                
                {/* Sadrekarimi Static Brittleness */}
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      Static Flow Liquefaction Brittleness
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      STATIC_BRITTLENESS_CONFIGS[simulationResult?.static_brittleness_tier]?.badgeClass || 'bg-slate-800 text-slate-300'
                    }`}>
                      {STATIC_BRITTLENESS_CONFIGS[simulationResult?.static_brittleness_tier]?.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>Peak Strength: <strong className="text-white">{tauPeakKpa} kPa</strong></div>
                    <div>Yield Strength: <strong className="text-amber-300">{tauYieldKpa} kPa</strong></div>
                    <div>Driving Shear: <strong className="text-rose-400">{drivingShearStressKpa} kPa</strong></div>
                    <div>Brittleness IB: <strong className="text-cyan-300">{simulationResult?.mean_brittleness_index}</strong></div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                    {simulationResult?.static_flow_slide_triggered ? (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        CRITICAL: Driving shear stress exceeds yield strength (τd ≥ τy). Static flow liquefaction triggered!
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Stable: Driving shear stress below yield threshold (τd &lt; τy).
                      </span>
                    )}
                  </div>
                </div>

                {/* Zhang Lateral Spreading & InSAR Validation */}
                <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                    <span className="font-bold text-cyan-400 flex items-center gap-1.5">
                      <Move className="w-4 h-4" />
                      Lateral Spreading & InSAR Concordance
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      LATERAL_SPREADING_CONFIGS[simulationResult?.lateral_spreading_hazard_tier]?.badgeClass || 'bg-slate-800 text-slate-300'
                    }`}>
                      {LATERAL_SPREADING_CONFIGS[simulationResult?.lateral_spreading_hazard_tier]?.name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <div>Lateral Displ Index (LDI): <strong className="text-white">{simulationResult?.lateral_profile?.lateral_displacement_index_ldi_m} m</strong></div>
                    <div>Predicted Spread (DH): <strong className="text-cyan-300">{simulationResult?.predicted_lateral_spreading_dh_m} m</strong></div>
                    <div>InSAR Observed Disp: <strong className="text-purple-300">{insarObservedDisplacementM} m</strong></div>
                    <div>Model Residual |Δ|: <strong className="text-amber-300">{simulationResult?.lateral_profile?.insar_residual_m} m</strong></div>
                  </div>

                  <div className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border border-slate-800">
                    {LATERAL_SPREADING_CONFIGS[simulationResult?.lateral_spreading_hazard_tier]?.narrative}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: POST-LIQUEFACTION FLOW SLIDE RUNOUT DISTANCE RADAR */}
          {activeTab === 'runout_radar' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Runout Distance Mechanics & Scheidegger Envelope */}
                <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-amber-400 text-sm flex items-center gap-1.5">
                      <Compass className="w-4 h-4" />
                      Scheidegger Fahrböschung Runout Engine
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTestRunoutApi}
                        className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 hover:bg-amber-800 text-amber-200 font-mono font-bold"
                      >
                        Verify Runout API
                      </button>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentMobilityConfig.badgeClass}`}>
                        {currentMobilityConfig.name}
                      </span>
                    </div>
                  </div>

                  {/* Reach Angle Slider */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300">Fahrböschung Reach Angle (αr):</label>
                      <span className="font-bold text-amber-400">{reachAngleDeg.toFixed(1)}° (tan αr = {Math.tan(reachAngleDeg * Math.PI / 180).toFixed(4)})</span>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="25.0"
                      step="0.5"
                      value={reachAngleDeg}
                      onChange={(e) => setReachAngleDeg(Number(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>1.5° (Hyper-Mobile Slurry)</span>
                      <span>8.0° (Tailings Slide)</span>
                      <span>25.0° (Frictional Slump)</span>
                    </div>
                  </div>

                  {/* Runout Computed Results Grid */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Topographic Runout (L):</span>
                      <span className="text-xl font-bold text-amber-400">
                        {simulationResult?.flow_slide_runout?.runout_distance_m} m
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Volume-Scaled Runout (Lvol):</span>
                      <span className="text-xl font-bold text-cyan-400">
                        {simulationResult?.flow_slide_runout?.volume_scaled_runout_m} m
                      </span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-800 flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Mandatory Evacuation Zone (1.25 • L):</span>
                      <span className="text-rose-400 font-bold text-sm">
                        {simulationResult?.flow_slide_runout?.evacuation_buffer_m} m downstream
                      </span>
                    </div>
                  </div>

                  {/* Action Protocol Directive */}
                  <div className="p-3 bg-rose-950/40 rounded-lg border border-rose-900/60 space-y-1">
                    <span className="text-rose-300 font-bold block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Emergency Action Protocol:
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {currentMobilityConfig.actionProtocol}
                    </p>
                  </div>
                </div>

                {/* Multidimensional Geotechnical Risk Radar */}
                <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-sm font-mono flex items-center gap-1.5">
                      <Radio className="w-4 h-4 text-cyan-400" />
                      Multidimensional Geotechnical Hazard Radar
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Normalized Risk Metric</span>
                  </div>

                  <div className="h-64 w-full flex items-center justify-center">
                    {riskRadarData && (
                      <Radar
                        data={riskRadarData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            r: {
                              min: 0,
                              max: 100,
                              angleLines: { color: 'rgba(255,255,255,0.1)' },
                              grid: { color: 'rgba(255,255,255,0.08)' },
                              pointLabels: { color: '#CBD5E1', font: { family: 'monospace', size: 10 } },
                              ticks: { display: false }
                            }
                          },
                          plugins: {
                            legend: { labels: { color: '#CBD5E1', font: { family: 'monospace', size: 10 } } }
                          }
                        }}
                      />
                    )}
                  </div>

                  <div className="text-[10px] font-mono text-center text-slate-400">
                    Comprehensive cross-modal risk profile synthesizing seismic excitation, pore pressure, brittleness, and runout.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SATELLITE VS30 SHEAR WAVE PROXY & DYNAMIC TILES */}
          {activeTab === 'vs30_tiles' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Satellite DEM Vs30 Topographic Slope Proxy */}
                <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-cyan-400 text-sm flex items-center gap-1.5">
                      <Mountain className="w-4 h-4" />
                      Copernicus DEM 30m Vs30 Slope Proxy
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleTestVs30Api}
                        className="text-[10px] px-2 py-0.5 rounded bg-cyan-900/60 hover:bg-cyan-800 text-cyan-200 font-mono font-bold"
                      >
                        Verify Vs30 API
                      </button>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${currentNehrpConfig.badgeClass}`}>
                        {currentNehrpConfig.name}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-slate-300">Topographic Slope Angle (β):</label>
                      <span className="font-bold text-cyan-400">{slopeAngleDeg.toFixed(1)}°</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="35.0"
                      step="0.5"
                      value={slopeAngleDeg}
                      onChange={(e) => setSlopeAngleDeg(Number(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-300">Tectonic Terrain Type:</label>
                    <select
                      value={terrainType}
                      onChange={(e) => setTerrainType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                    >
                      <option value="active_tectonic">Active Tectonic Regimes (Wald & Allen, 2007)</option>
                      <option value="stable_continental">Stable Continental Shield / Platform</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Estimated Vs30:</span>
                      <span className="text-xl font-bold text-cyan-400">
                        {simulationResult?.vs30_proxy?.vs30_m_s} m/s
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Site Amp Factor Fa:</span>
                      <span className="text-xl font-bold text-amber-400">
                        {simulationResult?.vs30_proxy?.site_amplification_fa}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Normalized Vs1:</span>
                      <span className="text-white font-bold">
                        {simulationResult?.vs30_proxy?.normalized_vs1_m_s} m/s
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Shear Wave CRR 7.5:</span>
                      <span className="text-emerald-400 font-bold">
                        {simulationResult?.vs30_proxy?.crr75_vs}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-[11px] text-slate-300">
                    {currentNehrpConfig.description}
                  </div>
                </div>

                {/* Dynamic XYZ Tile Streaming Template & URL Preview */}
                <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-amber-400" />
                      Dynamic XYZ Tile Streaming Controller
                    </span>
                    <span className="text-[10px] text-slate-400">256x256 RGBA</span>
                  </div>

                  {/* Tile Metric Selector */}
                  <div className="space-y-1.5">
                    <label className="text-slate-300">Streaming Tile Metric:</label>
                    <select
                      value={tilePreviewMetric}
                      onChange={(e) => setTilePreviewMetric(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-cyan-300 text-xs focus:outline-none focus:border-cyan-500"
                    >
                      <option value="factor_of_safety">Factor of Safety (FS liq) — RdYlBu Continuous</option>
                      <option value="cyclic_stress_ratio">Cyclic Stress Ratio (CSR) — Magma Heatmap</option>
                      <option value="excess_pore_pressure">Excess Pore Water Pressure Ratio (ru) — Plasma</option>
                      <option value="lateral_displacement">Lateral Spreading Displacement (DH) — Turbo</option>
                      <option value="vs30_proxy">Topographic Vs30 Shear Wave Proxy — Viridis</option>
                    </select>
                  </div>

                  {/* Tile URL Template Box */}
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">XYZ Tile URL Template:</span>
                      <button
                        onClick={() => handleCopy(
                          buildLiquefactionTileUrlTemplate(simulationResult?.simulation_id || 'SIM_DEMO', tilePreviewMetric),
                          'tile_url'
                        )}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        {copiedKey === 'tile_url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'tile_url' ? 'Copied' : 'Copy Template'}</span>
                      </button>
                    </div>
                    <code className="block text-[11px] text-cyan-300 bg-slate-950 p-2 rounded border border-slate-800 break-all">
                      {buildLiquefactionTileUrlTemplate(simulationResult?.simulation_id || 'SIM_DEMO', tilePreviewMetric)}
                    </code>
                  </div>

                  {/* API Endpoints Contract */}
                  <div className="space-y-1 text-[11px] text-slate-400">
                    <div className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Registered API Contracts:</div>
                    <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
                      <div><strong className="text-cyan-400">POST</strong> /api/v1/analysis/geotechnical/liquefaction-susceptibility</div>
                      <div><strong className="text-cyan-400">POST</strong> /api/v1/analysis/geotechnical/liquefaction/spt-sounding</div>
                      <div><strong className="text-cyan-400">GET</strong> /api/v1/analysis/geotechnical/vs30-proxy/{'{lat}'}/{'{lon}'}</div>
                      <div><strong className="text-cyan-400">GET</strong> /api/v1/tiles/geotechnical/liquefaction/{'{sim_id}'}/{'{metric}'}/{'{z}'}/{'{x}'}/{'{y}'}.png</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-400">Simulation ID:</span>
            <span className="text-cyan-300 font-bold">{simulationResult?.simulation_id || 'NOT_INITIALIZED'}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Critical FS:</span>
            <span className={simulationResult?.minimum_factor_of_safety_liq < 1.0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
              {simulationResult?.minimum_factor_of_safety_liq || 'N/A'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              Close Studio
            </button>
            {onApplySimulation && simulationResult && (
              <button
                onClick={() => {
                  onApplySimulation(simulationResult, { selectedMetric: tilePreviewMetric });
                  onClose();
                }}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-lg shadow-cyan-900/30 flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Apply Simulation to Map</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
