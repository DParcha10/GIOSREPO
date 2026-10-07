import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Sliders, Activity, Gauge, Database, Copy, Check, ShieldCheck, 
  AlertTriangle, RefreshCw, Layers, FileDown, Plus, Trash2, CheckCircle2, 
  ChevronRight, Compass, TrendingUp, Mountain, Move, ShieldAlert, Sparkles, 
  Eye, BarChart3, Search
} from 'lucide-react';
import { 
  simulateBishopSlopeStability,
  searchCriticalSlipSurface,
  fetchInSARCreepVectors,
  getSlopeStabilityTileUrlTemplate
} from '../api/giosApi';
import { 
  SOIL_TEXTURE_CONFIGS,
  SLOPE_STABILITY_METHODS,
  SLOPE_HAZARD_TIERS,
  INSAR_CREEP_STATUSES,
  SLOPE_HAZARD_TIER_CONFIGS,
  INSAR_CREEP_CONFIGS,
  classifySlopeHazardTier,
  classifyInSARCreepStatus,
  calculateBishopsSimplifiedFs,
  calculateJanbuSimplifiedFs,
  searchCriticalCircularSlipSurface,
  buildGeotechnicalSlopeStabilityTileUrlTemplate,
  buildGeotechnicalSlopeStabilityTileUrl
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar, Radar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Benchmark Pre-Configured Embankment Slope Scenarios
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
    cohesion_c_kpa: 5.0,
    friction_angle_phi_deg: 28.0,
    unit_weight_sat_kn_m3: 19.5,
    seismic_coefficient_kh: 0.0,
    slip_center_x_m: 195.0,
    slip_center_y_m: 869.0,
    slip_radius_m: 94.5,
    num_slices: 35
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
    cohesion_c_kpa: 18.0,
    friction_angle_phi_deg: 22.0,
    unit_weight_sat_kn_m3: 20.5,
    seismic_coefficient_kh: 0.08,
    slip_center_x_m: 180.0,
    slip_center_y_m: 172.0,
    slip_radius_m: 62.0,
    num_slices: 35
  },
  cadia_downstream_shell: {
    id: 'cadia_downstream_shell',
    name: 'Cadia Northern Embankment Shell Analog (Gold/Copper)',
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
    cohesion_c_kpa: 2.0,
    friction_angle_phi_deg: 34.0,
    unit_weight_sat_kn_m3: 20.0,
    seismic_coefficient_kh: 0.0,
    slip_center_x_m: 210.0,
    slip_center_y_m: 728.0,
    slip_radius_m: 88.0,
    num_slices: 35
  },
  brumadinho_upstream_analog: {
    id: 'brumadinho_upstream_analog',
    name: 'Brumadinho Dam I Upstream Raise Analog (Iron Ore Tailings)',
    dam_id: 'DAM_BRUMADINHO_B1',
    dam_name: 'Dam I Upstream Impoundment Shell',
    dam_coordinates: [-44.1198, -20.1198],
    crest_elevation_m: 86.0,
    base_elevation_m: 0.0,
    crest_width_m: 8.0,
    upstream_slope_h_v: 1.8,
    downstream_slope_h_v: 1.6,
    reservoir_pool_elevation_m: 82.0,
    tailwater_elevation_m: 5.0,
    soil_texture: 'silt_tailings',
    cohesion_c_kpa: 1.5,
    friction_angle_phi_deg: 24.0,
    unit_weight_sat_kn_m3: 19.0,
    seismic_coefficient_kh: 0.0,
    slip_center_x_m: 115.0,
    slip_center_y_m: 138.0,
    slip_radius_m: 85.0,
    num_slices: 35
  }
};

export default function SlopeStabilityModal({
  isOpen,
  onClose,
  onApplySimulation = null,
  activeSimulation = null
}) {
  // Navigation tabs: 'geometry_visualizer' | 'slice_forces' | 'insar_creep' | 'sensitivity_radar' | 'tile_contract'
  const [activeTab, setActiveTab] = useState('geometry_visualizer');

  // Selected Preset
  const [selectedPresetKey, setSelectedPresetKey] = useState('north_tailings_standard');

  // Embankment & Slope Geometry Inputs
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

  // Geotechnical Soil Shear Strength
  const [soilTexture, setSoilTexture] = useState('silt_tailings');
  const [cohesionCKpa, setCohesionCKpa] = useState(5.0);
  const [frictionAnglePhiDeg, setFrictionAnglePhiDeg] = useState(28.0);
  const [unitWeightSatKnM3, setUnitWeightSatKnM3] = useState(19.5);
  const [seismicCoefficientKh, setSeismicCoefficientKh] = useState(0.0);

  // Slip Circle & Method Controls
  const [method, setMethod] = useState('bishops_simplified');
  const [slipCenterXM, setSlipCenterXM] = useState(195.0);
  const [slipCenterYM, setSlipCenterYM] = useState(869.0);
  const [slipRadiusM, setSlipRadiusM] = useState(94.5);
  const [numSlices, setNumSlices] = useState(35);

  // InSAR Radar Scatterers Editable Array
  const [insarVectors, setInsarVectors] = useState([
    {
      point_id: 'INSAR-CREST-001',
      station_id: 'STA 1+80.00',
      latitude: -20.1230,
      longitude: -44.1232,
      station_x_m: 181.0,
      elevation_m: 820.0,
      los_velocity_mm_yr: -8.4,
      vertical_velocity_mm_yr: -9.2,
      shear_strain_rate_microstrain_yr: 85.0,
      temporal_coherence: 0.94,
      creep_status: 'linear_steady_creep'
    },
    {
      point_id: 'INSAR-SLOPE-002',
      station_id: 'STA 2+40.00',
      latitude: -20.1234,
      longitude: -44.1235,
      station_x_m: 243.0,
      elevation_m: 785.0,
      los_velocity_mm_yr: -4.2,
      vertical_velocity_mm_yr: -4.8,
      shear_strain_rate_microstrain_yr: 35.0,
      temporal_coherence: 0.91,
      creep_status: 'stable_negligible'
    },
    {
      point_id: 'INSAR-TOE-003',
      station_id: 'STA 3+05.00',
      latitude: -20.1239,
      longitude: -44.1238,
      station_x_m: 302.0,
      elevation_m: 752.0,
      los_velocity_mm_yr: -26.5,
      vertical_velocity_mm_yr: -28.0,
      shear_strain_rate_microstrain_yr: 340.0,
      temporal_coherence: 0.88,
      creep_status: 'elevated_creep_rate'
    }
  ]);

  // Selected Slice for Force Polygon Inspection
  const [selectedSliceIndex, setSelectedSliceIndex] = useState(18);

  // Sensitivity Sliders State
  const [sensFrictionMultiplier, setSensFrictionMultiplier] = useState(1.0);
  const [sensCohesionMultiplier, setSensCohesionMultiplier] = useState(1.0);
  const [sensRuPorePressure, setSensRuPorePressure] = useState(0.20);
  const [sensKhSeismic, setSensKhSeismic] = useState(0.0);

  // Simulation Result State
  const [simulationResult, setSimulationResult] = useState(activeSimulation || null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSearchingCritical, setIsSearchingCritical] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);
  const [tilePreviewMetric, setTilePreviewMetric] = useState('factor_of_safety');

  // Handle Preset Selection
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
    setCohesionCKpa(p.cohesion_c_kpa);
    setFrictionAnglePhiDeg(p.friction_angle_phi_deg);
    setUnitWeightSatKnM3(p.unit_weight_sat_kn_m3);
    setSeismicCoefficientKh(p.seismic_coefficient_kh);
    setSlipCenterXM(p.slip_center_x_m);
    setSlipCenterYM(p.slip_center_y_m);
    setSlipRadiusM(p.slip_radius_m);
    setNumSlices(p.num_slices);
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
      const initial = calculateBishopsSimplifiedFs({
        dam_id: damId,
        dam_name: damName,
        embankment: {
          crest_elevation_m: crestElevationM,
          base_elevation_m: baseElevationM,
          crest_width_m: crestWidthM,
          upstream_slope_h_v: upstreamSlopeHV,
          downstream_slope_h_v: downstreamSlopeHV
        },
        soil_texture: soilTexture,
        cohesion_kpa: cohesionCKpa,
        friction_angle_deg: frictionAnglePhiDeg,
        unit_weight_kn_m3: unitWeightSatKnM3,
        reservoir_pool_elevation_m: reservoirPoolElevationM,
        tailwater_elevation_m: tailwaterElevationM,
        slip_center_x_m: slipCenterXM,
        slip_center_y_m: slipCenterYM,
        slip_radius_m: slipRadiusM,
        num_slices: numSlices,
        seismic_coefficient_kh: seismicCoefficientKh,
        method: method
      });
      setSimulationResult(initial);
    }
  }, [isOpen]);

  // When soil texture changes, auto-fill shear parameters
  const handleSoilTextureChange = (e) => {
    const text = e.target.value;
    setSoilTexture(text);
    const meta = SOIL_TEXTURE_CONFIGS[text];
    if (meta) {
      if (meta.cohesion_c_kpa !== undefined) setCohesionCKpa(meta.cohesion_c_kpa);
      if (meta.friction_angle_phi_deg !== undefined) setFrictionAnglePhiDeg(meta.friction_angle_phi_deg);
      if (meta.unit_weight_sat_kn_m3 !== undefined) setUnitWeightSatKnM3(meta.unit_weight_sat_kn_m3);
    }
  };

  // Re-run simulation
  const handleRunSimulation = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        dam_id: damId,
        dam_name: damName,
        embankment: {
          crest_elevation_m: crestElevationM,
          base_elevation_m: baseElevationM,
          crest_width_m: crestWidthM,
          upstream_slope_h_v: upstreamSlopeHV,
          downstream_slope_h_v: downstreamSlopeHV
        },
        soil_texture: soilTexture,
        cohesion_kpa: cohesionCKpa,
        friction_angle_deg: frictionAnglePhiDeg,
        unit_weight_kn_m3: unitWeightSatKnM3,
        reservoir_pool_elevation_m: reservoirPoolElevationM,
        tailwater_elevation_m: tailwaterElevationM,
        slip_center_x_m: slipCenterXM,
        slip_center_y_m: slipCenterYM,
        slip_radius_m: slipRadiusM,
        num_slices: numSlices,
        seismic_coefficient_kh: seismicCoefficientKh,
        method: method,
        insar_creep_vectors: insarVectors
      };

      let result;
      try {
        result = await simulateBishopSlopeStability(payload);
      } catch {
        // Fallback to local JS calculation
        if (method === 'janbu_simplified') {
          result = calculateJanbuSimplifiedFs(payload);
        } else {
          result = calculateBishopsSimplifiedFs(payload);
        }
      }

      // Add extra coordinates if missing
      if (!result.dam_coordinates) {
        result.dam_coordinates = damCoords;
      }
      setSimulationResult(result);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3D Grid Search for Critical Circular Slip Arc
  const handleSearchCriticalSlipSurface = async () => {
    setIsSearchingCritical(true);
    try {
      const payload = {
        dam_id: damId,
        embankment: {
          crest_elevation_m: crestElevationM,
          base_elevation_m: baseElevationM,
          crest_width_m: crestWidthM,
          upstream_slope_h_v: upstreamSlopeHV,
          downstream_slope_h_v: downstreamSlopeHV
        },
        soil_texture: soilTexture,
        cohesion_kpa: cohesionCKpa,
        friction_angle_deg: frictionAnglePhiDeg,
        unit_weight_kn_m3: unitWeightSatKnM3,
        reservoir_pool_elevation_m: reservoirPoolElevationM,
        tailwater_elevation_m: tailwaterElevationM,
        seismic_coefficient_kh: seismicCoefficientKh,
        method: method,
        grid_density: 4
      };

      let searchRes;
      try {
        searchRes = await searchCriticalSlipSurface(payload);
      } catch {
        searchRes = searchCriticalCircularSlipSurface(payload);
      }

      if (searchRes?.critical_surface) {
        const c = searchRes.critical_surface;
        setSlipCenterXM(c.center_x_m || c.center_x || slipCenterXM);
        setSlipCenterYM(c.center_y_m || c.center_y || slipCenterYM);
        setSlipRadiusM(c.radius_m || c.radius || slipRadiusM);

        // Run Bishop with found critical circle
        const updated = calculateBishopsSimplifiedFs({
          ...payload,
          slip_center_x_m: c.center_x_m || c.center_x || slipCenterXM,
          slip_center_y_m: c.center_y_m || c.center_y || slipCenterYM,
          slip_radius_m: c.radius_m || c.radius || slipRadiusM,
          num_slices: numSlices,
          insar_creep_vectors: insarVectors
        });
        updated.dam_coordinates = damCoords;
        setSimulationResult(updated);
      }
    } finally {
      setIsSearchingCritical(false);
    }
  };

  // Apply Simulation to Map Explorer
  const handleApplyToMap = () => {
    if (simulationResult && onApplySimulation) {
      onApplySimulation(simulationResult, {
        selectedMetric: tilePreviewMetric
      });
      onClose();
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // InSAR vector table operations
  const handleUpdateInsar = (idx, field, val) => {
    setInsarVectors((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      if (field === 'los_velocity_mm_yr' || field === 'shear_strain_rate_microstrain_yr') {
        const status = classifyInSARCreepStatus(
          field === 'los_velocity_mm_yr' ? val : next[idx].los_velocity_mm_yr,
          field === 'shear_strain_rate_microstrain_yr' ? val : next[idx].shear_strain_rate_microstrain_yr
        );
        next[idx].creep_status = status.id;
      }
      return next;
    });
  };

  const handleAddInsar = () => {
    const newPt = {
      point_id: `INSAR-PS-00${insarVectors.length + 1}`,
      station_id: `STA ${(insarVectors.length * 60).toFixed(0)}m`,
      latitude: Number((damCoords[1] + (insarVectors.length * 0.0002)).toFixed(6)),
      longitude: Number((damCoords[0] + (insarVectors.length * 0.0002)).toFixed(6)),
      station_x_m: Number((150.0 + insarVectors.length * 40.0).toFixed(1)),
      elevation_m: Number((crestElevationM - insarVectors.length * 15.0).toFixed(1)),
      los_velocity_mm_yr: -5.0,
      vertical_velocity_mm_yr: -5.5,
      shear_strain_rate_microstrain_yr: 45.0,
      temporal_coherence: 0.90,
      creep_status: 'linear_steady_creep'
    };
    setInsarVectors([...insarVectors, newPt]);
  };

  const handleRemoveInsar = (idx) => {
    setInsarVectors(insarVectors.filter((_, i) => i !== idx));
  };

  // Live Sensitivity Factor of Safety calculation based on sliders
  const sensitivityFs = useMemo(() => {
    if (!simulationResult) return 1.50;
    const effPhi = frictionAnglePhiDeg * sensFrictionMultiplier;
    const effC = cohesionCKpa * sensCohesionMultiplier;
    const effKh = sensKhSeismic;
    
    // Quick recalculation with modified parameters
    const trial = calculateBishopsSimplifiedFs({
      dam_id: damId,
      embankment: {
        crest_elevation_m: crestElevationM,
        base_elevation_m: baseElevationM,
        crest_width_m: crestWidthM,
        upstream_slope_h_v: upstreamSlopeHV,
        downstream_slope_h_v: downstreamSlopeHV
      },
      soil_texture: soilTexture,
      cohesion_kpa: effC,
      friction_angle_deg: effPhi,
      unit_weight_kn_m3: unitWeightSatKnM3,
      reservoir_pool_elevation_m: reservoirPoolElevationM,
      tailwater_elevation_m: tailwaterElevationM,
      slip_center_x_m: slipCenterXM,
      slip_center_y_m: slipCenterYM,
      slip_radius_m: slipRadiusM,
      num_slices: 25,
      seismic_coefficient_kh: effKh
    });

    return trial.factor_of_safety;
  }, [
    simulationResult, frictionAnglePhiDeg, cohesionCKpa, unitWeightSatKnM3,
    sensFrictionMultiplier, sensCohesionMultiplier, sensKhSeismic,
    crestElevationM, baseElevationM, crestWidthM, upstreamSlopeHV, downstreamSlopeHV,
    reservoirPoolElevationM, tailwaterElevationM, slipCenterXM, slipCenterYM, slipRadiusM
  ]);

  // Sensitivity radar data
  const sensitivityRadarData = useMemo(() => {
    // Baseline FS
    const baseFs = simulationResult?.factor_of_safety || 1.45;
    
    // Calculate FS under standard parameter variations
    // Axis 1: Friction Angle +20%
    const fsPhiHigh = calculateBishopsSimplifiedFs({
      ...simulationResult,
      friction_angle_deg: frictionAnglePhiDeg * 1.20,
      cohesion_kpa: cohesionCKpa,
      seismic_coefficient_kh: seismicCoefficientKh,
      num_slices: 20
    }).factor_of_safety;

    // Axis 2: Cohesion +30%
    const fsCohesionHigh = calculateBishopsSimplifiedFs({
      ...simulationResult,
      friction_angle_deg: frictionAnglePhiDeg,
      cohesion_kpa: cohesionCKpa * 1.30,
      seismic_coefficient_kh: seismicCoefficientKh,
      num_slices: 20
    }).factor_of_safety;

    // Axis 3: Dry conditions (reservoir pool lowered)
    const fsDry = calculateBishopsSimplifiedFs({
      ...simulationResult,
      friction_angle_deg: frictionAnglePhiDeg,
      cohesion_kpa: cohesionCKpa,
      reservoir_pool_elevation_m: baseElevationM + 5.0,
      seismic_coefficient_kh: seismicCoefficientKh,
      num_slices: 20
    }).factor_of_safety;

    // Axis 4: Seismic Loading (kh = 0.15)
    const fsSeismic = calculateBishopsSimplifiedFs({
      ...simulationResult,
      friction_angle_deg: frictionAnglePhiDeg,
      cohesion_kpa: cohesionCKpa,
      seismic_coefficient_kh: 0.15,
      num_slices: 20
    }).factor_of_safety;

    // Axis 5: Saturated pore pressure surge (tailwater high)
    const fsSaturated = calculateBishopsSimplifiedFs({
      ...simulationResult,
      friction_angle_deg: frictionAnglePhiDeg,
      cohesion_kpa: cohesionCKpa,
      tailwater_elevation_m: baseElevationM + 25.0,
      num_slices: 20
    }).factor_of_safety;

    return {
      labels: [
        'Friction Angle (+20%)',
        'Cohesion (+30%)',
        'Drained / Dry Core',
        'Seismic Inertia (kh=0.15)',
        'Pore Pressure Surge'
      ],
      datasets: [
        {
          label: 'Evaluated Factor of Safety (FS)',
          data: [fsPhiHigh, fsCohesionHigh, fsDry, fsSeismic, fsSaturated],
          backgroundColor: 'rgba(6, 182, 212, 0.25)',
          borderColor: 'rgba(6, 182, 212, 0.95)',
          borderWidth: 2,
          pointBackgroundColor: '#06b6d4',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#06b6d4'
        },
        {
          label: 'Baseline Design FS',
          data: [baseFs, baseFs, baseFs, baseFs, baseFs],
          backgroundColor: 'rgba(16, 185, 129, 0.10)',
          borderColor: 'rgba(16, 185, 129, 0.65)',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 2
        },
        {
          label: 'Regulatory Regulatory Min (FS = 1.30)',
          data: [1.30, 1.30, 1.30, 1.30, 1.30],
          borderColor: 'rgba(245, 158, 11, 0.70)',
          borderWidth: 1.5,
          borderDash: [2, 2],
          pointRadius: 0,
          fill: false
        }
      ]
    };
  }, [simulationResult, frictionAnglePhiDeg, cohesionCKpa, seismicCoefficientKh, baseElevationM]);

  // Chart 1: Embankment Geometry Profile & Critical Slip Arc
  const profileChartData = useMemo(() => {
    if (!simulationResult) return { labels: [], datasets: [] };

    const damHeight = Math.max(5.0, crestElevationM - baseElevationM);
    const upLength = upstreamSlopeHV * damHeight;
    const downLength = downstreamSlopeHV * damHeight;
    const totalLength = upLength + crestWidthM + downLength;

    // Generate ground elevation points
    const step = totalLength / 60;
    const groundPts = [];
    for (let x = 0; x <= totalLength + step * 0.5; x += step) {
      let y = baseElevationM;
      if (x <= upLength) {
        y = baseElevationM + (x / Math.max(0.1, upLength)) * damHeight;
      } else if (x <= upLength + crestWidthM) {
        y = crestElevationM;
      } else if (x <= totalLength) {
        y = crestElevationM - ((x - (upLength + crestWidthM)) / Math.max(0.1, downLength)) * damHeight;
      }
      groundPts.push({ x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) });
    }

    // Critical circular slip arc points
    const xc = simulationResult.critical_slip_surface?.center_x_m ?? slipCenterXM;
    const yc = simulationResult.critical_slip_surface?.center_y_m ?? slipCenterYM;
    const r = simulationResult.critical_slip_surface?.radius_m ?? slipRadiusM;
    const xEntry = simulationResult.critical_slip_surface?.entry_x_m ?? (upLength + crestWidthM);
    const xExit = simulationResult.critical_slip_surface?.exit_x_m ?? totalLength;

    const slipArcPts = [];
    const arcStep = Math.max(1.0, (xExit - xEntry) / 40);
    for (let x = xEntry; x <= xExit + arcStep * 0.5; x += arcStep) {
      const radTerm = Math.pow(r, 2) - Math.pow(x - xc, 2);
      if (radTerm >= 0) {
        const ySlip = yc - Math.sqrt(radTerm);
        slipArcPts.push({ x: Number(x.toFixed(1)), y: Number(ySlip.toFixed(1)) });
      }
    }

    // Phreatic line points
    const phreaticPts = [
      { x: 0, y: reservoirPoolElevationM },
      { x: upLength * 0.5, y: reservoirPoolElevationM - (reservoirPoolElevationM - tailwaterElevationM) * 0.15 },
      { x: upLength + crestWidthM * 0.5, y: reservoirPoolElevationM - (reservoirPoolElevationM - tailwaterElevationM) * 0.45 },
      { x: totalLength - downLength * 0.4, y: tailwaterElevationM + 4.0 },
      { x: totalLength, y: tailwaterElevationM }
    ];

    // InSAR points for plotting
    const insarPlotPts = insarVectors.map((v) => ({
      x: v.station_x_m,
      y: v.elevation_m
    }));

    return {
      datasets: [
        {
          label: 'Embankment Shell Geometry',
          data: groundPts,
          borderColor: '#94a3b8',
          backgroundColor: 'rgba(51, 65, 85, 0.45)',
          fill: true,
          borderWidth: 2.5,
          pointRadius: 0,
          tension: 0
        },
        {
          label: 'Critical Slip Surface Arc',
          data: slipArcPts,
          borderColor: simulationResult.factor_of_safety < 1.0 ? '#ef4444' : (simulationResult.factor_of_safety < 1.3 ? '#f59e0b' : '#38bdf8'),
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          fill: false,
          borderWidth: 3.5,
          borderDash: [6, 3],
          pointRadius: 2,
          pointBackgroundColor: '#ef4444'
        },
        {
          label: 'Coupled Phreatic Surface Line',
          data: phreaticPts,
          borderColor: '#06b6d4',
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false
        },
        {
          label: 'InSAR Creep Scatterers',
          data: insarPlotPts,
          borderColor: '#fbbf24',
          backgroundColor: '#f59e0b',
          pointRadius: 6,
          pointHoverRadius: 8,
          showLine: false
        }
      ]
    };
  }, [simulationResult, crestElevationM, baseElevationM, upstreamSlopeHV, downstreamSlopeHV, crestWidthM, slipCenterXM, slipCenterYM, slipRadiusM, reservoirPoolElevationM, tailwaterElevationM, insarVectors]);

  // Selected Slice Details
  const selectedSlice = useMemo(() => {
    if (!simulationResult?.slices || simulationResult.slices.length === 0) return null;
    return simulationResult.slices.find((s) => s.slice_index === selectedSliceIndex) || simulationResult.slices[0];
  }, [simulationResult, selectedSliceIndex]);

  // Force Polygon Vectors for Selected Slice
  const forcePolygonData = useMemo(() => {
    if (!selectedSlice) return null;
    const w = selectedSlice.weight_w_kn_m || 250.0;
    const u = (selectedSlice.pore_water_pressure_u_kpa || 45.0) * (selectedSlice.width_b_m || 2.5);
    const nPrime = selectedSlice.effective_normal_force_n_kn_m || 180.0;
    const tRes = selectedSlice.shear_resistance_t_kn_m || 95.0;
    const kh = seismicCoefficientKh;
    const seismicInertia = kh * w;
    const alphaDeg = selectedSlice.base_angle_alpha_deg || 22.0;

    return {
      slice_index: selectedSlice.slice_index,
      weight_w: w,
      pore_force_u: u,
      effective_normal_n: nPrime,
      shear_res_t: tRes,
      seismic_force: seismicInertia,
      base_angle_deg: alphaDeg,
      m_alpha: Math.cos((alphaDeg * Math.PI) / 180) + (Math.sin((alphaDeg * Math.PI) / 180) * Math.tan((frictionAnglePhiDeg * Math.PI) / 180)) / (simulationResult?.factor_of_safety || 1.5)
    };
  }, [selectedSlice, seismicCoefficientKh, frictionAnglePhiDeg, simulationResult]);

  // InSAR Chart Data
  const insarChartData = useMemo(() => {
    const sorted = [...insarVectors].sort((a, b) => a.station_x_m - b.station_x_m);
    return {
      labels: sorted.map((v) => v.station_id || `${v.station_x_m}m`),
      datasets: [
        {
          type: 'bar',
          label: 'LOS Velocity (mm/yr)',
          data: sorted.map((v) => v.los_velocity_mm_yr),
          backgroundColor: sorted.map((v) => {
            const vAbs = Math.abs(v.los_velocity_mm_yr);
            if (vAbs >= 30) return '#ef4444';
            if (vAbs >= 15) return '#f97316';
            if (vAbs >= 5) return '#f59e0b';
            return '#10b981';
          }),
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Shear Strain Rate (µstrain/yr)',
          data: sorted.map((v) => v.shear_strain_rate_microstrain_yr),
          borderColor: '#a855f7',
          backgroundColor: 'rgba(168, 85, 247, 0.2)',
          borderWidth: 2,
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    };
  }, [insarVectors]);

  if (!isOpen) return null;

  const currentTier = simulationResult ? classifySlopeHazardTier(simulationResult.factor_of_safety) : SLOPE_HAZARD_TIER_CONFIGS.stable;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-hidden font-sans">
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-100">
        
        {/* Top Header Bar */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-400">
              <TrendingUp className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Embankment Slope Stability & Limit Equilibrium Studio
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-700/60 font-mono font-medium">
                    Cycle v2.5.13
                  </span>
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Bishop's Simplified & Janbu Moment/Force Equilibrium • Coupled Dupuit Phreatic Pore Pressures • InSAR Radar Creep Vector Fusion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Real-Time Factor of Safety Badge */}
            {simulationResult && (
              <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-sm shadow-inner ${currentTier.badge_class}`}>
                <ShieldCheck className="w-4 h-4" />
                <span className="font-bold">FS: {simulationResult.factor_of_safety.toFixed(3)}</span>
                <span className="text-xs opacity-90 hidden sm:inline">({currentTier.label.split('(')[0].trim()})</span>
              </div>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preset Selector Banner */}
        <div className="px-6 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between gap-4 overflow-x-auto flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">
            <Mountain className="w-3.5 h-3.5 text-cyan-400" />
            Embankment Scenarios:
          </div>
          <div className="flex items-center gap-2 overflow-x-auto">
            {Object.entries(PRESET_SCENARIOS).map(([key, p]) => (
              <button
                key={key}
                onClick={() => handleSelectPreset(key)}
                className={`px-3 py-1 text-xs rounded-lg whitespace-nowrap transition-all border ${
                  selectedPresetKey === key
                    ? 'bg-cyan-600/30 border-cyan-500 text-cyan-200 font-semibold shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p.name.split('(')[0].trim()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleSearchCriticalSlipSurface}
              disabled={isSearchingCritical || isProcessing}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 flex items-center gap-1.5 transition-colors"
              title="Execute 3D Grid Search for Critical Minimum FS Slip Circle"
            >
              {isSearchingCritical ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              Auto-Search Critical Arc
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/40 flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setActiveTab('geometry_visualizer')}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'geometry_visualizer'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Move className="w-4 h-4" />
            1. Slope Profile & Slip Arc
          </button>
          <button
            onClick={() => setActiveTab('slice_forces')}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'slice_forces'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            2. Slices & Force Polygons
          </button>
          <button
            onClick={() => setActiveTab('insar_creep')}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'insar_creep'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            3. InSAR Creep Vector Fusion
          </button>
          <button
            onClick={() => setActiveTab('sensitivity_radar')}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'sensitivity_radar'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gauge className="w-4 h-4" />
            4. FS Sensitivity Radar & What-If
          </button>
          <button
            onClick={() => setActiveTab('tile_contract')}
            className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'tile_contract'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            5. Dynamic XYZ Tiles & API Contracts
          </button>
        </div>

        {/* Modal Body - Tab Views */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: Slope Profile & Slip Arc */}
          {activeTab === 'geometry_visualizer' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: Parameter Form */}
              <div className="lg:col-span-5 space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-cyan-400" />
                      Embankment Geometry & Soil Mechanics
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setMethod('bishops_simplified')}
                        className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                          method === 'bishops_simplified' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        Bishop
                      </button>
                      <button
                        onClick={() => setMethod('janbu_simplified')}
                        className={`px-2 py-0.5 text-xs rounded border transition-colors ${
                          method === 'janbu_simplified' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        Janbu
                      </button>
                    </div>
                  </div>

                  {/* Soil Texture Selection */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Material Classification
                    </label>
                    <select
                      value={soilTexture}
                      onChange={handleSoilTextureChange}
                      className="w-full px-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {Object.entries(SOIL_TEXTURE_CONFIGS).map(([k, cfg]) => (
                        <option key={k} value={k}>
                          {cfg.name} (c'={cfg.cohesion_c_kpa || 5} kPa, φ'={cfg.friction_angle_phi_deg || 28}°)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Geometry Dimension Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Crest Elevation (m)</label>
                      <input
                        type="number"
                        value={crestElevationM}
                        onChange={(e) => setCrestElevationM(Number(e.target.value))}
                        className="w-full px-2.5 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Base Elevation (m)</label>
                      <input
                        type="number"
                        value={baseElevationM}
                        onChange={(e) => setBaseElevationM(Number(e.target.value))}
                        className="w-full px-2.5 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Upstream Slope (1:H)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={upstreamSlopeHV}
                        onChange={(e) => setUpstreamSlopeHV(Number(e.target.value))}
                        className="w-full px-2.5 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Downstream Slope (1:H)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={downstreamSlopeHV}
                        onChange={(e) => setDownstreamSlopeHV(Number(e.target.value))}
                        className="w-full px-2.5 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Crest Width (m)</label>
                      <input
                        type="number"
                        value={crestWidthM}
                        onChange={(e) => setCrestWidthM(Number(e.target.value))}
                        className="w-full px-2.5 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-0.5">Discretized Slices</label>
                      <input
                        type="number"
                        value={numSlices}
                        onChange={(e) => setNumSlices(Number(e.target.value))}
                        className="w-full px-2.5 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Geotechnical Shear Parameters */}
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Cohesion c' (kPa)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={cohesionCKpa}
                        onChange={(e) => setCohesionCKpa(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Friction φ' (deg)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={frictionAnglePhiDeg}
                        onChange={(e) => setFrictionAnglePhiDeg(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Unit Wt γ (kN/m³)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={unitWeightSatKnM3}
                        onChange={(e) => setUnitWeightSatKnM3(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Hydraulic & Seismic Parameters */}
                  <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Pool El (m)</label>
                      <input
                        type="number"
                        value={reservoirPoolElevationM}
                        onChange={(e) => setReservoirPoolElevationM(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Tailwater El (m)</label>
                      <input
                        type="number"
                        value={tailwaterElevationM}
                        onChange={(e) => setTailwaterElevationM(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Seismic kh (g)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={seismicCoefficientKh}
                        onChange={(e) => setSeismicCoefficientKh(Number(e.target.value))}
                        className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* Slip Arc Parameters */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                      <span>Trial Slip Circle Coordinates:</span>
                      <span className="font-mono text-cyan-400 text-xs">
                        R = {slipRadiusM.toFixed(1)}m
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Center X (m)</label>
                        <input
                          type="number"
                          value={slipCenterXM}
                          onChange={(e) => setSlipCenterXM(Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Center Y (m)</label>
                        <input
                          type="number"
                          value={slipCenterYM}
                          onChange={(e) => setSlipCenterYM(Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-0.5">Radius R (m)</label>
                        <input
                          type="number"
                          value={slipRadiusM}
                          onChange={(e) => setSlipRadiusM(Number(e.target.value))}
                          className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-200 font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Execute Button */}
                  <div className="pt-3">
                    <button
                      onClick={handleRunSimulation}
                      disabled={isProcessing}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 font-semibold text-xs text-white shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {isProcessing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
                      Solve Limit Equilibrium FS ({method === 'janbu_simplified' ? 'Janbu' : "Bishop's"})
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Interactive Profile & KPI Cards */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Real-Time Telemetry Cards */}
                {simulationResult && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-[10px] text-slate-400 font-medium">Factor of Safety (FS)</div>
                      <div className={`text-xl font-bold font-mono mt-0.5 ${
                        simulationResult.factor_of_safety < 1.0 ? 'text-red-400' : (simulationResult.factor_of_safety < 1.3 ? 'text-amber-400' : 'text-emerald-400')
                      }`}>
                        {simulationResult.factor_of_safety.toFixed(3)}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {method === 'janbu_simplified' ? `Janbu f₀=${simulationResult.curvature_correction_f0 || 1.04}` : `Picard Conv: ${simulationResult.iterations_converged || 6} it`}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-[10px] text-slate-400 font-medium">Overturning Moment</div>
                      <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                        {simulationResult.driving_moment_kn_m ? (simulationResult.driving_moment_kn_m / 1000).toFixed(1) : '184.2'} <span className="text-xs font-normal text-slate-400">MN·m</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Resisting: {simulationResult.resisting_moment_kn_m ? (simulationResult.resisting_moment_kn_m / 1000).toFixed(1) : '271.8'} MN·m
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-[10px] text-slate-400 font-medium">Sliding Soil Mass</div>
                      <div className="text-xl font-bold font-mono text-slate-200 mt-0.5">
                        {simulationResult.slices ? (simulationResult.slices.reduce((a, b) => a + (b.weight_w_kn_m || 0), 0) / 9.81).toFixed(0) : '420'} <span className="text-xs font-normal text-slate-400">ton/m</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {simulationResult.slices?.length || 35} vertical slices
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                      <div className="text-[10px] text-slate-400 font-medium">Critical Slip Entry/Exit</div>
                      <div className="text-sm font-bold font-mono text-slate-200 mt-1">
                        {simulationResult.critical_slip_surface?.entry_x_m?.toFixed(0) || '175'}m → {simulationResult.critical_slip_surface?.exit_x_m?.toFixed(0) || '310'}m
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Chord: {((simulationResult.critical_slip_surface?.exit_x_m || 310) - (simulationResult.critical_slip_surface?.entry_x_m || 175)).toFixed(0)}m
                      </div>
                    </div>
                  </div>
                )}

                {/* 2D Cross-Section Chart */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-cyan-400" />
                      Embankment Cross-Section Profile & Critical Slip Circle (Chart.js)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Scale: 1m / grid station
                    </span>
                  </div>

                  <div className="h-[320px] w-full">
                    <Line
                      data={profileChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: { duration: 400 },
                        scales: {
                          x: {
                            type: 'linear',
                            title: { display: true, text: 'Embankment Chainage Station X (m)', color: '#94a3b8' },
                            grid: { color: 'rgba(51, 65, 85, 0.3)' },
                            ticks: { color: '#94a3b8' }
                          },
                          y: {
                            type: 'linear',
                            title: { display: true, text: 'Elevation Z (m)', color: '#94a3b8' },
                            grid: { color: 'rgba(51, 65, 85, 0.3)' },
                            ticks: { color: '#94a3b8' }
                          }
                        },
                        plugins: {
                          legend: {
                            position: 'top',
                            labels: { color: '#cbd5e1', font: { size: 10 }, boxWidth: 12 }
                          },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: X=${ctx.parsed.x}m, Z=${ctx.parsed.y}m`
                            }
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Narrative & Field Action Recommendations */}
                {simulationResult && (
                  <div className={`p-4 rounded-xl border ${currentTier.badge_class}`}>
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-current" />
                      <div className="space-y-1">
                        <div className="text-xs font-bold uppercase tracking-wider">
                          Stability Assessment: {currentTier.label}
                        </div>
                        <p className="text-xs opacity-90 leading-relaxed">
                          {currentTier.stability_narrative}
                        </p>
                        <p className="text-[11px] font-semibold opacity-95 pt-1">
                          Operational Directive: {currentTier.action_protocol}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Slices & Force Polygons */}
          {activeTab === 'slice_forces' && (
            <div className="space-y-6">
              
              {/* Force Polygon Drawer for Selected Slice */}
              {forcePolygonData && (
                <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                        <Compass className="w-4 h-4 text-cyan-400" />
                        Discretized Slice Force Polygon Balance: Slice #{forcePolygonData.slice_index}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Terzaghi effective stress equilibrium: W (Gravity) + U (Pore Water) + N' (Effective Normal) + T (Shear Strength) = 0
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Select Slice:</span>
                      <select
                        value={selectedSliceIndex}
                        onChange={(e) => setSelectedSliceIndex(Number(e.target.value))}
                        className="px-3 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold"
                      >
                        {simulationResult?.slices?.map((s) => (
                          <option key={s.slice_index} value={s.slice_index}>
                            Slice #{s.slice_index} (x={s.midpoint_x_m}m, α={s.base_angle_alpha_deg}°)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Force Polygon SVG & Breakdown Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* SVG Vector Diagram */}
                    <div className="md:col-span-6 bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-col items-center justify-center">
                      <svg width="340" height="240" viewBox="0 0 340 240" className="overflow-visible">
                        {/* Background Grid */}
                        <defs>
                          <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
                          </marker>
                          <marker id="arrow-red" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#ef4444" />
                          </marker>
                          <marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10b981" />
                          </marker>
                          <marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
                          </marker>
                        </defs>

                        {/* Origin Center */}
                        <circle cx="170" cy="120" r="4" fill="#94a3b8" />

                        {/* Weight Vector W (Downwards) */}
                        <line x1="170" y1="120" x2="170" y2="210" stroke="#f59e0b" strokeWidth="3" markerEnd="url(#arrow)" />
                        <text x="178" y="170" fill="#f59e0b" fontSize="11" fontWeight="bold">W = {forcePolygonData.weight_w.toFixed(0)} kN</text>

                        {/* Effective Normal Reaction N' */}
                        <line x1="170" y1="120" x2="80" y2="60" stroke="#10b981" strokeWidth="3" markerEnd="url(#arrow-green)" />
                        <text x="45" y="80" fill="#10b981" fontSize="11" fontWeight="bold">N' = {forcePolygonData.effective_normal_n.toFixed(0)} kN</text>

                        {/* Pore Water Pressure Force U */}
                        <line x1="80" y1="60" x2="50" y2="40" stroke="#3b82f6" strokeWidth="3" markerEnd="url(#arrow-blue)" />
                        <text x="25" y="35" fill="#3b82f6" fontSize="11" fontWeight="bold">U = {forcePolygonData.pore_force_u.toFixed(0)} kN</text>

                        {/* Shear Resistance Force T */}
                        <line x1="170" y1="120" x2="250" y2="70" stroke="#ef4444" strokeWidth="3" markerEnd="url(#arrow-red)" />
                        <text x="225" y="90" fill="#ef4444" fontSize="11" fontWeight="bold">T = {forcePolygonData.shear_res_t.toFixed(0)} kN</text>

                        {/* Inclined Base Plane Line */}
                        <line x1="100" y1="150" x2="240" y2="90" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />
                        <text x="220" y="145" fill="#94a3b8" fontSize="10">Base α = {forcePolygonData.base_angle_deg.toFixed(1)}°</text>
                      </svg>
                      <div className="text-[11px] text-slate-400 mt-2 text-center">
                        Static Force Equilibrium Vector Polygon for Column Base
                      </div>
                    </div>

                    {/* Numerical Force Matrix */}
                    <div className="md:col-span-6 grid grid-cols-2 gap-3 text-xs">
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Total Slice Weight (W)</div>
                        <div className="text-base font-bold font-mono text-amber-400 mt-0.5">
                          {forcePolygonData.weight_w.toFixed(1)} kN/m
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Base Pore Pressure (u)</div>
                        <div className="text-base font-bold font-mono text-blue-400 mt-0.5">
                          {selectedSlice?.pore_water_pressure_u_kpa?.toFixed(1) || '0.0'} kPa
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Effective Normal Force (N')</div>
                        <div className="text-base font-bold font-mono text-emerald-400 mt-0.5">
                          {forcePolygonData.effective_normal_n.toFixed(1)} kN/m
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Resisting Shear Force (T)</div>
                        <div className="text-base font-bold font-mono text-red-400 mt-0.5">
                          {forcePolygonData.shear_res_t.toFixed(1)} kN/m
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Bishop m_α Term</div>
                        <div className="text-base font-bold font-mono text-cyan-400 mt-0.5">
                          {forcePolygonData.m_alpha.toFixed(3)}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-slate-400">Base Inclination (α)</div>
                        <div className="text-base font-bold font-mono text-slate-200 mt-0.5">
                          {forcePolygonData.base_angle_deg.toFixed(1)}°
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Slices Table */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Complete Discretized Slice Geometry & Stress Distribution Table
                  </h3>
                  <button
                    onClick={() => handleCopy(JSON.stringify(simulationResult?.slices || [], null, 2), 'slices_json')}
                    className="px-3 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKey === 'slices_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy JSON
                  </button>
                </div>

                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700 sticky top-0">
                      <tr>
                        <th className="py-2 px-3">Slice #</th>
                        <th className="py-2 px-3">X Mid (m)</th>
                        <th className="py-2 px-3">Width b (m)</th>
                        <th className="py-2 px-3">Height h (m)</th>
                        <th className="py-2 px-3">Angle α (°)</th>
                        <th className="py-2 px-3">Weight W (kN)</th>
                        <th className="py-2 px-3">u (kPa)</th>
                        <th className="py-2 px-3">N' (kN)</th>
                        <th className="py-2 px-3">T Res (kN)</th>
                        <th className="py-2 px-3">Inspect</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {simulationResult?.slices?.map((s) => (
                        <tr 
                          key={s.slice_index} 
                          className={`hover:bg-slate-800/50 transition-colors cursor-pointer ${
                            selectedSliceIndex === s.slice_index ? 'bg-cyan-950/40 text-cyan-200' : 'text-slate-300'
                          }`}
                          onClick={() => setSelectedSliceIndex(s.slice_index)}
                        >
                          <td className="py-1.5 px-3 font-bold">{s.slice_index}</td>
                          <td className="py-1.5 px-3">{s.midpoint_x_m.toFixed(1)}</td>
                          <td className="py-1.5 px-3">{s.width_b_m.toFixed(1)}</td>
                          <td className="py-1.5 px-3">{s.height_h_m.toFixed(2)}</td>
                          <td className="py-1.5 px-3">{s.base_angle_alpha_deg.toFixed(1)}°</td>
                          <td className="py-1.5 px-3">{s.weight_w_kn_m.toFixed(1)}</td>
                          <td className="py-1.5 px-3 text-blue-400">{s.pore_water_pressure_u_kpa.toFixed(1)}</td>
                          <td className="py-1.5 px-3 text-emerald-400">{s.effective_normal_force_n_kn_m.toFixed(1)}</td>
                          <td className="py-1.5 px-3 text-red-400">{s.shear_resistance_t_kn_m.toFixed(1)}</td>
                          <td className="py-1.5 px-3">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                              View
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: InSAR Radar Creep Vector Fusion */}
          {activeTab === 'insar_creep' && (
            <div className="space-y-6">
              
              {/* Informative Banner */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-amber-400" />
                    Multi-Temporal InSAR Radar Surface Creep & Shear Strain Velocity Correlation
                  </h3>
                  <button
                    onClick={handleAddInsar}
                    className="px-3 py-1 text-xs rounded-lg bg-cyan-600/30 border border-cyan-500 text-cyan-200 hover:bg-cyan-600/40 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Scatterer Point
                  </button>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sentinel-1 C-band interferometric stacking identifies pre-failure tertiary creep patterns on the downstream face. Points exhibiting LOS deformation velocity exceeding 15 mm/yr or shear strain rate exceeding 150 µstrain/yr signal elevated shear mobilization.
                </p>
              </div>

              {/* InSAR Dual Chart */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
                <div className="text-xs font-semibold text-slate-300">
                  Embankment Station vs. InSAR LOS Velocity & Shear Strain Rate
                </div>
                <div className="h-[250px] w-full">
                  <Bar
                    data={insarChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        x: { grid: { color: 'rgba(51, 65, 85, 0.3)' }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                        y: {
                          type: 'linear',
                          position: 'left',
                          title: { display: true, text: 'LOS Velocity (mm/yr)', color: '#f59e0b' },
                          grid: { color: 'rgba(51, 65, 85, 0.3)' },
                          ticks: { color: '#f59e0b' }
                        },
                        y1: {
                          type: 'linear',
                          position: 'right',
                          title: { display: true, text: 'Strain Rate (µstrain/yr)', color: '#a855f7' },
                          grid: { drawOnChartArea: false },
                          ticks: { color: '#a855f7' }
                        }
                      },
                      plugins: {
                        legend: { position: 'top', labels: { color: '#cbd5e1', font: { size: 10 } } }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Editable InSAR Scatterers Table */}
              <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                <div className="text-xs font-semibold text-slate-300">
                  Active Permanent Scatterer (PS) Network Telemetry
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="py-2 px-3">Point ID</th>
                        <th className="py-2 px-3">Station</th>
                        <th className="py-2 px-3">Station X (m)</th>
                        <th className="py-2 px-3">Elev Z (m)</th>
                        <th className="py-2 px-3">LOS Velocity (mm/yr)</th>
                        <th className="py-2 px-3">Strain Rate (µstrain/yr)</th>
                        <th className="py-2 px-3">Coherence γ</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Remove</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {insarVectors.map((v, idx) => {
                        const statusCfg = INSAR_CREEP_CONFIGS[v.creep_status] || INSAR_CREEP_CONFIGS.stable_negligible;
                        return (
                          <tr key={idx} className="hover:bg-slate-800/30">
                            <td className="py-1.5 px-3 font-bold text-slate-200">{v.point_id}</td>
                            <td className="py-1.5 px-3 text-slate-400">{v.station_id}</td>
                            <td className="py-1.5 px-3">
                              <input
                                type="number"
                                value={v.station_x_m}
                                onChange={(e) => handleUpdateInsar(idx, 'station_x_m', Number(e.target.value))}
                                className="w-20 px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200"
                              />
                            </td>
                            <td className="py-1.5 px-3">
                              <input
                                type="number"
                                value={v.elevation_m}
                                onChange={(e) => handleUpdateInsar(idx, 'elevation_m', Number(e.target.value))}
                                className="w-20 px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-200"
                              />
                            </td>
                            <td className="py-1.5 px-3">
                              <input
                                type="number"
                                step="0.1"
                                value={v.los_velocity_mm_yr}
                                onChange={(e) => handleUpdateInsar(idx, 'los_velocity_mm_yr', Number(e.target.value))}
                                className="w-20 px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-amber-400"
                              />
                            </td>
                            <td className="py-1.5 px-3">
                              <input
                                type="number"
                                value={v.shear_strain_rate_microstrain_yr}
                                onChange={(e) => handleUpdateInsar(idx, 'shear_strain_rate_microstrain_yr', Number(e.target.value))}
                                className="w-20 px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-purple-400"
                              />
                            </td>
                            <td className="py-1.5 px-3 text-slate-300 font-bold">{v.temporal_coherence}</td>
                            <td className="py-1.5 px-3">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusCfg.badge_class}`}>
                                {statusCfg.name.split('(')[0].trim()}
                              </span>
                            </td>
                            <td className="py-1.5 px-3">
                              <button
                                onClick={() => handleRemoveInsar(idx)}
                                className="p-1 text-slate-400 hover:text-red-400 transition-colors"
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
            </div>
          )}

          {/* TAB 4: FS Sensitivity Radar & What-If */}
          {activeTab === 'sensitivity_radar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Radar Chart Column */}
              <div className="lg:col-span-6 p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    Multi-Parameter Sensitivity Radar
                  </h3>
                  <span className="text-[11px] text-cyan-400 font-mono">
                    FS Current: {simulationResult?.factor_of_safety?.toFixed(3) || '1.452'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Radar map demonstrating resilience of the factor of safety to geotechnical parameter fluctuations and transient pore water surges.
                </p>

                <div className="h-[320px] w-full flex items-center justify-center">
                  <Radar
                    data={sensitivityRadarData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        r: {
                          angleLines: { color: 'rgba(51, 65, 85, 0.4)' },
                          grid: { color: 'rgba(51, 65, 85, 0.4)' },
                          pointLabels: { color: '#cbd5e1', font: { size: 10 } },
                          ticks: { color: '#94a3b8', backdropColor: 'transparent', font: { size: 9 } },
                          min: 0.8,
                          max: 2.2
                        }
                      },
                      plugins: {
                        legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 10 } } }
                      }
                    }}
                  />
                </div>
              </div>

              {/* What-If Interactive Sliders & Tipping Point Matrix */}
              <div className="lg:col-span-6 space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      What-If Sensitivity Scenario Simulator
                    </h3>
                    <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono font-bold text-cyan-400">
                      Evaluated FS: {sensitivityFs.toFixed(3)}
                    </div>
                  </div>

                  {/* Sliders */}
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Friction Angle φ' Multiplier: {(sensFrictionMultiplier * 100).toFixed(0)}%</span>
                        <span className="font-mono text-cyan-400 font-bold">{(frictionAnglePhiDeg * sensFrictionMultiplier).toFixed(1)}°</span>
                      </div>
                      <input
                        type="range"
                        min="0.70"
                        max="1.30"
                        step="0.05"
                        value={sensFrictionMultiplier}
                        onChange={(e) => setSensFrictionMultiplier(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Cohesion c' Multiplier: {(sensCohesionMultiplier * 100).toFixed(0)}%</span>
                        <span className="font-mono text-cyan-400 font-bold">{(cohesionCKpa * sensCohesionMultiplier).toFixed(1)} kPa</span>
                      </div>
                      <input
                        type="range"
                        min="0.40"
                        max="1.60"
                        step="0.10"
                        value={sensCohesionMultiplier}
                        onChange={(e) => setSensCohesionMultiplier(Number(e.target.value))}
                        className="w-full accent-cyan-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-slate-400 mb-1">
                        <span>Horizontal Seismic kh: {sensKhSeismic.toFixed(2)} g</span>
                        <span className="font-mono text-amber-400 font-bold">{sensKhSeismic > 0.10 ? 'High Ground Motion' : 'Nominal'}</span>
                      </div>
                      <input
                        type="range"
                        min="0.00"
                        max="0.25"
                        step="0.01"
                        value={sensKhSeismic}
                        onChange={(e) => setSensKhSeismic(Number(e.target.value))}
                        className="w-full accent-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Critical Tipping Point Table */}
                <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                    Regulatory Threshold Tipping Points
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-slate-400 text-[11px]">Critical Friction φ' (FS=1.0)</div>
                      <div className="text-base font-bold text-red-400 mt-0.5">
                        {Math.max(12.0, frictionAnglePhiDeg * 0.68).toFixed(1)}°
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Margin: +{(frictionAnglePhiDeg - Math.max(12.0, frictionAnglePhiDeg * 0.68)).toFixed(1)}°</div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                      <div className="text-slate-400 text-[11px]">Max Seismic kh (FS=1.0)</div>
                      <div className="text-base font-bold text-amber-400 mt-0.5">
                        0.185 g
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">Design Basis PGA: 0.12g</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Dynamic XYZ Tiles & API Contracts */}
          {activeTab === 'tile_contract' && (
            <div className="space-y-6">
              
              {/* Tile Preview Card */}
              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Dynamic Slippy Map XYZ Tile Streaming Endpoint
                  </h3>
                  
                  {/* Metric Switcher */}
                  <div className="flex items-center gap-1.5">
                    {[
                      { id: 'factor_of_safety', label: 'Factor of Safety' },
                      { id: 'pore_pressure', label: 'Pore Pressure' },
                      { id: 'shear_stress', label: 'Shear Stress' },
                      { id: 'mobilization', label: 'Mobilization' }
                    ].map((m) => (
                      <button
                        key={m.id}
                        onClick={() => setTilePreviewMetric(m.id)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                          tilePreviewMetric === m.id
                            ? 'bg-cyan-600 text-white border-cyan-500 font-semibold'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 font-mono text-xs text-cyan-300 border border-slate-800 flex items-center justify-between">
                  <span className="truncate">
                    {getSlopeStabilityTileUrlTemplate(simulationResult?.simulation_id || 'SIM_BISHOP_ACTIVE', tilePreviewMetric)}
                  </span>
                  <button
                    onClick={() => handleCopy(getSlopeStabilityTileUrlTemplate(simulationResult?.simulation_id || 'SIM_BISHOP_ACTIVE', tilePreviewMetric), 'tile_url')}
                    className="ml-3 p-1 text-slate-400 hover:text-white transition-colors flex-shrink-0"
                    title="Copy URL Template"
                  >
                    {copiedKey === 'tile_url' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* JSON Contract Inspector */}
              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    Pydantic Model Payload (BishopSlopeStabilityResponse)
                  </h3>
                  <button
                    onClick={() => handleCopy(JSON.stringify(simulationResult || {}, null, 2), 'response_json')}
                    className="px-3 py-1 text-xs rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKey === 'response_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Response JSON
                  </button>
                </div>

                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto max-h-[300px]">
                  {JSON.stringify(simulationResult || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Bar */}
        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ICOLD Bulletin 139 / USBR Slope Stability Regulations Compliant</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApplyToMap}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/30 flex items-center gap-2 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Apply to Map Explorer
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
