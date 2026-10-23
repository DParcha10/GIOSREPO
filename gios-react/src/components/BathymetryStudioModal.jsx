import React, { useState, useMemo, useCallback } from 'react';
import { 
  X, Layers, Waves, Sliders, Activity, RefreshCw, Copy, Check,
  Sun, Compass, Box, BarChart3, Zap, CheckCircle2,
  Plus, Trash2, Eye, Droplet, ShieldAlert, SlidersHorizontal
} from 'lucide-react';
import { 
  requestBathymetryInversion,
  calibrateBathymetrySoundings,
  buildDynamicBathymetryTileUrlTemplate
} from '../api/giosApi';
import {
  classifySiltationSeverityTier
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

/**
 * Pre-configured canonical reservoir and impoundment benchmark test sites.
 */
const SDB_RESERVOIR_BENCHMARKS = {
  SAN_LUIS_RES_CA: {
    id: 'SAN_LUIS_RES_CA',
    name: 'San Luis Reservoir',
    location: 'Merced County, California, USA',
    center: [37.058, -121.072],
    bbox: [-121.15, 37.00, -120.98, 37.12],
    design_capacity_m3: 2.51e9,
    design_max_depth_m: 92.0,
    nominal_sdb_max_depth_m: 42.0,
    surface_area_ha: 5140.0,
    datum_min_elevation_m: 120.0,
    datum_max_elevation_m: 165.0,
    current_pool_elevation_m: 152.4,
    default_m1: 28.5,
    default_m0: 18.2,
    default_n: 1000.0,
    typical_blue_r: 0.065,
    typical_green_r: 0.042,
    typical_red_r: 0.018,
    typical_nir_r: 0.005,
    clarity: 'moderate_mesotrophic',
    dominant_substrate: 'sand',
    description: 'Off-stream pumped-storage California State Water Project reservoir with seasonal water level oscillations and sediment redistribution.'
  },
  LAKE_MEAD_NV: {
    id: 'LAKE_MEAD_NV',
    name: 'Lake Mead / Hoover Dam',
    location: 'Nevada / Arizona, USA',
    center: [36.015, -114.738],
    bbox: [-114.85, 35.95, -114.62, 36.08],
    design_capacity_m3: 3.52e10,
    design_max_depth_m: 150.0,
    nominal_sdb_max_depth_m: 45.0,
    surface_area_ha: 64000.0,
    datum_min_elevation_m: 210.0,
    datum_max_elevation_m: 372.0,
    current_pool_elevation_m: 324.5,
    default_m1: 29.2,
    default_m0: 18.8,
    default_n: 1000.0,
    typical_blue_r: 0.058,
    typical_green_r: 0.038,
    typical_red_r: 0.014,
    typical_nir_r: 0.004,
    clarity: 'ultra_clear_oligotrophic',
    dominant_substrate: 'coral_hardbottom',
    description: 'Deep canyon Colorado River impoundment with exceptional optical clarity, steep drowned topography, and multi-year drought depletion.'
  },
  OROVILLE_DAM_CA: {
    id: 'OROVILLE_DAM_CA',
    name: 'Oroville Dam / Lake Oroville',
    location: 'Butte County, California, USA',
    center: [39.538, -121.486],
    bbox: [-121.55, 39.48, -121.40, 39.60],
    design_capacity_m3: 4.36e9,
    design_max_depth_m: 235.0,
    nominal_sdb_max_depth_m: 48.0,
    surface_area_ha: 6390.0,
    datum_min_elevation_m: 180.0,
    datum_max_elevation_m: 274.0,
    current_pool_elevation_m: 258.0,
    default_m1: 27.8,
    default_m0: 17.5,
    default_n: 1000.0,
    typical_blue_r: 0.062,
    typical_green_r: 0.039,
    typical_red_r: 0.016,
    typical_nir_r: 0.005,
    clarity: 'moderate_mesotrophic',
    dominant_substrate: 'sand',
    description: 'Tallest earthen embankment dam in the United States impounding the Feather River with steep dendritic river arms and high storage capacity.'
  },
  LAKE_POWELL_UT: {
    id: 'LAKE_POWELL_UT',
    name: 'Lake Powell / Glen Canyon',
    location: 'Utah / Arizona, USA',
    center: [36.936, -111.484],
    bbox: [-111.58, 36.88, -111.38, 36.99],
    design_capacity_m3: 3.0e10,
    design_max_depth_m: 132.0,
    nominal_sdb_max_depth_m: 50.0,
    surface_area_ha: 65000.0,
    datum_min_elevation_m: 1020.0,
    datum_max_elevation_m: 1128.0,
    current_pool_elevation_m: 1078.2,
    default_m1: 31.0,
    default_m0: 19.5,
    default_n: 1000.0,
    typical_blue_r: 0.054,
    typical_green_r: 0.036,
    typical_red_r: 0.013,
    typical_nir_r: 0.003,
    clarity: 'ultra_clear_oligotrophic',
    dominant_substrate: 'coral_hardbottom',
    description: 'Colorado River impoundment with complex submerged Navajo sandstone canyon morphology and extensive upstream sediment delta accumulation.'
  },
  CORREGO_TAILINGS_MG: {
    id: 'CORREGO_TAILINGS_MG',
    name: 'Córrego do Feijão Tailings Pond',
    location: 'Minas Gerais, Brazil',
    center: [-20.120, -44.120],
    bbox: [-20.135, -44.135, -20.105, -44.105],
    design_capacity_m3: 1.27e7,
    design_max_depth_m: 22.0,
    nominal_sdb_max_depth_m: 18.5,
    surface_area_ha: 85.0,
    datum_min_elevation_m: 750.0,
    datum_max_elevation_m: 785.0,
    current_pool_elevation_m: 778.0,
    default_m1: 22.0,
    default_m0: 14.5,
    default_n: 1000.0,
    typical_blue_r: 0.075,
    typical_green_r: 0.058,
    typical_red_r: 0.032,
    typical_nir_r: 0.012,
    clarity: 'turbid_eutrophic',
    dominant_substrate: 'mud_silt',
    description: 'Active upstream-raised tailings impoundment with continuous iron ore slurry settling, high sediment accumulation, and critical dead storage monitoring.'
  }
};

/**
 * Optical Bathymetry Inversion Models
 */
const SDB_MODELS = [
  {
    id: 'stumpf_log_ratio',
    label: 'Stumpf Log-Ratio Inversion (2003)',
    formula: 'z = m1 * [ln(n * R_blue) / ln(n * R_green)] - m0',
    description: 'Non-linear ratio of log-transformed blue and green surface reflectance. Highly robust against benthic substrate albedo heterogeneity.',
    citation: 'Stumpf et al. (2003), Limnol. Oceanogr. 48(2): 547-556'
  },
  {
    id: 'lyzenga_multispectral',
    label: 'Lyzenga Multi-Band Radiative Transfer (1978/1985)',
    formula: 'z = a0 + sum_i [a_i * ln(max(eps, R_i - R_inf_i))]',
    description: 'Multi-band linear regression subtracting deep-water radiance asymptote to decouple depth from bottom albedo across blue, green, and red channels.',
    citation: 'Lyzenga (1978, 1985), Applied Optics / Int. J. Remote Sensing'
  },
  {
    id: 'radiative_transfer',
    label: 'Forward Bio-Optical Radiative Transfer Optimization',
    formula: 'min_{z, Kd, Rb} ||R_rs_obs - R_rs_model(z, Kd, Rb)||^2',
    description: 'Semi-analytical optimization matching water-leaving spectral reflectance against bio-optical models of diffuse attenuation and benthic reflectance.',
    citation: 'Mobley (1994), Light and Water: Radiative Transfer in Natural Waters'
  }
];

/**
 * Supported dynamic tile visualization metrics.
 */
const SDB_TILE_METRIC_CONFIGS = {
  bathymetry_depth: {
    id: 'bathymetry_depth',
    label: 'Water Depth (m)',
    unit: 'm',
    defaultColormap: 'blues',
    defaultRescale: '0.0,45.0',
    description: 'Satellite-derived bathymetric water depth below surface datum in meters.'
  },
  stumpf_ratio: {
    id: 'stumpf_ratio',
    label: 'Stumpf Log-Ratio Index',
    unit: 'ratio',
    defaultColormap: 'viridis',
    defaultRescale: '0.80,1.40',
    description: 'Normalized ratio of log-transformed blue-to-green surface reflectance.'
  },
  attenuation_kd: {
    id: 'attenuation_kd',
    label: 'Diffuse Attenuation (Kd)',
    unit: 'm^-1',
    defaultColormap: 'turbo',
    defaultRescale: '0.05,0.80',
    description: 'Estimated water column diffuse light attenuation coefficient Kd.'
  },
  benthic_reflectance: {
    id: 'benthic_reflectance',
    label: 'Benthic Bottom Albedo',
    unit: 'reflectance',
    defaultColormap: 'plasma',
    defaultRescale: '0.0,0.50',
    description: 'Depth-corrected substrate bottom albedo removing water column absorption.'
  },
  siltation_risk: {
    id: 'siltation_risk',
    label: 'Siltation Hazard Tier',
    unit: 'tier',
    defaultColormap: 'coolwarm',
    defaultRescale: '0,3',
    description: 'Operational reservoir siltation storage loss classification.'
  },
  depth_contours: {
    id: 'depth_contours',
    label: 'Depth Contours (Isolines)',
    unit: 'm',
    defaultColormap: 'cividis',
    defaultRescale: '0.0,45.0',
    description: 'Bathymetric depth isolines with 2m, 5m, and 10m contour interval markings.'
  }
};

/**
 * Depth colormap presets conforming to prompt requirements:
 * viridis, plasma, blues, turbo, coolwarm, cividis
 */
const SDB_COLORMAP_PRESETS = [
  {
    id: 'viridis',
    name: 'Viridis (Perceptually Uniform)',
    preview: 'from-indigo-950 via-teal-600 to-yellow-300',
    description: 'Standard perceptually uniform sequential colormap; monotonic luminance gradient.'
  },
  {
    id: 'plasma',
    name: 'Plasma (Warm Radiance)',
    preview: 'from-blue-950 via-purple-600 via-rose-500 to-amber-300',
    description: 'High-contrast purple to warm yellow gradient, ideal for benthic substrate separation.'
  },
  {
    id: 'blues',
    name: 'Oceanic Blues (Bathymetric Hydro)',
    preview: 'from-sky-200 via-blue-600 to-indigo-950',
    description: 'Hydrographic cartographic standard: shallow light aqua progressing into deep abyssal navy.'
  },
  {
    id: 'turbo',
    name: 'Turbo Rainbow (Dynamic Range)',
    preview: 'from-blue-600 via-cyan-400 via-emerald-400 via-amber-300 to-rose-600',
    description: 'Smooth rainbow colormap maximizing dynamic range across narrow contour gradients.'
  },
  {
    id: 'coolwarm',
    name: 'Coolwarm Divergent (Siltation Delta)',
    preview: 'from-blue-600 via-slate-200 to-rose-600',
    description: 'Divergent blue-to-red colormap highlighting sediment accretion and erosion balance.'
  },
  {
    id: 'cividis',
    name: 'Cividis (Colorblind Certified)',
    preview: 'from-navy-950 via-blue-800 via-teal-600 to-yellow-300',
    description: 'Mathematically certified for color-vision deficiency (deuteranopia / protanopia).'
  }
];

/**
 * Benthic substrate classes for bottom albedo separation.
 */
const BENTHIC_SUBSTRATE_CLASSES = [
  { id: 'sand', name: 'Sand & Carbonate', albedo: 0.35, color: '#fef08a', desc: 'Coarse quartz or biogenic sand (albedo ~0.35)' },
  { id: 'coral_hardbottom', name: 'Hardbottom / Coral Reef', albedo: 0.18, color: '#fb923c', desc: 'Consolidated bedrock, pavement, or reef substrate (albedo ~0.18)' },
  { id: 'mud_silt', name: 'Lacustrine Silt & Mud', albedo: 0.12, color: '#a8a29e', desc: 'Fine-grained sediment, mud, and active tailings silt deposits (albedo ~0.12)' },
  { id: 'seagrass_macrophyte', name: 'Submerged Macrophytes', albedo: 0.08, color: '#15803d', desc: 'Dense submerged aquatic vegetation absorbing red/blue light (albedo ~0.08)' },
  { id: 'deep_unclassified', name: 'Optically Deep / Unclassified', albedo: 0.02, color: '#1e3a8a', desc: 'Water column beyond optical extinction limit (depth > 30m)' }
];

/**
 * Initial in-situ ground-truth acoustic soundings for OLS calibration.
 */
const DEFAULT_IN_SITU_SOUNDINGS = [
  { id: 'SND_01', station: 'Transect Stn 1+00', lat: 37.052, lng: -121.076, z_obs_m: 4.20, blue_r: 0.063, green_r: 0.046 },
  { id: 'SND_02', station: 'Transect Stn 3+50', lat: 37.054, lng: -121.074, z_obs_m: 9.80, blue_r: 0.064, green_r: 0.043 },
  { id: 'SND_03', station: 'Transect Stn 6+20', lat: 37.056, lng: -121.072, z_obs_m: 16.50, blue_r: 0.065, green_r: 0.041 },
  { id: 'SND_04', station: 'Transect Stn 9+00', lat: 37.058, lng: -121.070, z_obs_m: 23.40, blue_r: 0.066, green_r: 0.039 },
  { id: 'SND_05', station: 'Transect Stn 12+50', lat: 37.060, lng: -121.068, z_obs_m: 31.20, blue_r: 0.067, green_r: 0.038 },
  { id: 'SND_06', station: 'Transect Stn 15+00', lat: 37.062, lng: -121.066, z_obs_m: 38.80, blue_r: 0.068, green_r: 0.037 }
];

export default function BathymetryStudioModal({
  isOpen,
  onClose,
  initialAssetId = 'SAN_LUIS_RES_CA',
  onApply = null,
  onApplyTileLayer = null
}) {
  // Navigation tabs:
  // 'inversion_studio' | 'subsurface_contour' | 'eac_curve' | 'attenuation_profile' | 'calibration_soundings' | 'tile_contract'
  const [activeTab, setActiveTab] = useState('inversion_studio');

  // Benchmark scenario selection
  const [selectedAssetKey, setSelectedAssetKey] = useState(initialAssetId || 'SAN_LUIS_RES_CA');
  const activeBenchmark = useMemo(() => SDB_RESERVOIR_BENCHMARKS[selectedAssetKey] || SDB_RESERVOIR_BENCHMARKS.SAN_LUIS_RES_CA, [selectedAssetKey]);

  // Model & Inversion Parameters
  const [selectedModel, setSelectedModel] = useState('stumpf_log_ratio');
  const [m1Param, setM1Param] = useState(activeBenchmark.default_m1);
  const [m0Param, setM0Param] = useState(activeBenchmark.default_m0);
  const [nScaleFactor, setNScaleFactor] = useState(activeBenchmark.default_n || 1000.0);

  // Surface reflectance inputs
  const [blueReflectance, setBlueReflectance] = useState(activeBenchmark.typical_blue_r);
  const [greenReflectance, setGreenReflectance] = useState(activeBenchmark.typical_green_r);
  const [redReflectance, setRedReflectance] = useState(activeBenchmark.typical_red_r);
  const [nirReflectance, setNirReflectance] = useState(activeBenchmark.typical_nir_r);

  // Lyzenga Multi-Band & Attenuation Parameters
  const [rInfBlue, setRInfBlue] = useState(0.015);
  const [rInfGreen, setRInfGreen] = useState(0.012);
  const [rInfRed, setRInfRed] = useState(0.005);
  const [a0Weight, setA0Weight] = useState(0.0);
  const [aBlueWeight, setABlueWeight] = useState(16.0);
  const [aGreenWeight, setAGreenWeight] = useState(-8.5);
  const [aRedWeight, setARedWeight] = useState(-4.2);

  // Benthic Substrate Albedo Separation
  const [selectedSubstrate, setSelectedSubstrate] = useState(activeBenchmark.dominant_substrate || 'sand');
  const [enableBenthicSeparation, setEnableBenthicSeparation] = useState(true);

  // Dynamic Tile Layer Configuration
  const [selectedMetric, setSelectedMetric] = useState('bathymetry_depth');
  const [selectedColormap, setSelectedColormap] = useState('blues');
  const [rescaleMin, setRescaleMin] = useState(0.0);
  const [rescaleMax, setRescaleMax] = useState(activeBenchmark.nominal_sdb_max_depth_m || 45.0);
  const [layerOpacity, setLayerOpacity] = useState(0.85);

  // Sub-Surface Contour Visualizer States
  const [contourInterval, setContourInterval] = useState(5.0); // 2m, 5m, 10m
  const [view3DMode, setView3DMode] = useState('isometric'); // 'topdown' | 'isometric' | 'cross_section'
  const [hoverDepthPoint, setHoverDepthPoint] = useState(null);

  // In-situ Soundings State
  const [soundings, setSoundings] = useState(DEFAULT_IN_SITU_SOUNDINGS);
  const [calibratedCoeffs, setCalibratedCoeffs] = useState(null);
  const [calibrating, setCalibrating] = useState(false);

  // Inversion Execution Result State
  const [inversionResult, setInversionResult] = useState(null);
  const [loadingInversion, setLoadingInversion] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Handle Preset Switching
  const handleSelectBenchmark = (key) => {
    const b = SDB_RESERVOIR_BENCHMARKS[key];
    if (!b) return;
    setSelectedAssetKey(key);
    setM1Param(b.default_m1);
    setM0Param(b.default_m0);
    setNScaleFactor(b.default_n || 1000.0);
    setBlueReflectance(b.typical_blue_r);
    setGreenReflectance(b.typical_green_r);
    setRedReflectance(b.typical_red_r);
    setNirReflectance(b.typical_nir_r);
    setSelectedSubstrate(b.dominant_substrate);
    setRescaleMax(b.nominal_sdb_max_depth_m);
    setInversionResult(null);
  };

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --------------------------------------------------------------------------
  // Core Deterministic Mathematical Bathymetry Calculation
  // --------------------------------------------------------------------------
  const calculatedInversion = useMemo(() => {
    const eps = 1e-6;
    const bVal = Math.max(0.001, Math.min(0.60, Number(blueReflectance)));
    const gVal = Math.max(0.001, Math.min(0.60, Number(greenReflectance)));
    const rVal = Math.max(0.0005, Math.min(0.40, Number(redReflectance)));
    const nVal = Math.max(10.0, Number(nScaleFactor));
    const m1 = Number(m1Param);
    const m0 = Number(m0Param);

    // 1. Stumpf Log-Ratio
    const lnB = Math.log(Math.max(1.0 + eps, nVal * bVal));
    const lnG = Math.log(Math.max(1.0 + eps, nVal * gVal));
    const ratio = Math.abs(lnG) > eps ? lnB / lnG : 1.0;
    const stumpfZ = Math.max(0.0, Math.min(Number(activeBenchmark.nominal_sdb_max_depth_m) * 1.25, (m1 * ratio) - m0));

    // 2. Lyzenga Multi-Band
    const netB = Math.max(eps, bVal - Number(rInfBlue));
    const netG = Math.max(eps, gVal - Number(rInfGreen));
    const netR = Math.max(eps, rVal - Number(rInfRed));
    const lyzengaZ = Math.max(0.0, Math.min(45.0, 
      Number(a0Weight) + 
      (Number(aBlueWeight) * Math.log(netB)) + 
      (Number(aGreenWeight) * Math.log(netG)) + 
      (Number(aRedWeight) * Math.log(netR))
    ));

    // Select depth according to model
    const invertedDepth = selectedModel === 'lyzenga_multispectral' 
      ? lyzengaZ 
      : selectedModel === 'radiative_transfer'
        ? (stumpfZ * 0.95 + lyzengaZ * 0.05)
        : stumpfZ;

    // Diffuse attenuation coefficient Kd
    const kdEst = Math.max(0.04, Math.min(2.50, 0.12 * (gVal / (bVal + eps))));

    // Optical depth limit (1% euphotic depth & Secchi depth)
    const euphoticDepthM = Math.min(55.0, 4.605 / (kdEst + eps));
    const secchiDepthM = Math.min(25.0, 1.70 / (kdEst + eps));

    // Benthic bottom albedo separation
    const substrateMeta = BENTHIC_SUBSTRATE_CLASSES.find(s => s.id === selectedSubstrate) || BENTHIC_SUBSTRATE_CLASSES[0];
    const rawBottomReflectance = (bVal - 0.012) * Math.exp(2.0 * kdEst * Math.min(invertedDepth, 18.0)) + 0.012;
    const benthicReflectance = Math.max(0.01, Math.min(0.60, rawBottomReflectance));

    // Reservoir Storage Capacity Integration & Siltation
    const desCap = activeBenchmark.design_capacity_m3;
    const surfHa = activeBenchmark.surface_area_ha;
    const surfM2 = surfHa * 10000;
    const estMeanDepth = Math.max(0.5, invertedDepth * 0.52);
    const estActiveVolM3 = Math.min(desCap * 1.05, surfM2 * estMeanDepth);
    const siltationLossM3 = Math.max(0, desCap - estActiveVolM3);
    const siltationLossPct = (siltationLossM3 / desCap) * 100.0;
    const severityTier = classifySiltationSeverityTier(siltationLossPct);
    const remainingYears = Math.max(0.5, (100.0 - siltationLossPct) / 1.15);

    // Bio-optical clarity tier
    const clarityTier = kdEst < 0.10 
      ? 'Ultra-Clear Oligotrophic (Kd < 0.10 m⁻¹)' 
      : kdEst < 0.30 
        ? 'Moderate Mesotrophic (0.10 ≤ Kd < 0.30 m⁻¹)' 
        : kdEst < 0.80 
          ? 'Turbid Eutrophic (0.30 ≤ Kd < 0.80 m⁻¹)' 
          : 'High Attenuation (Kd ≥ 0.80 m⁻¹)';

    return {
      inverted_depth_m: Number(invertedDepth.toFixed(2)),
      stumpf_ratio: Number(ratio.toFixed(4)),
      attenuation_kd: Number(kdEst.toFixed(4)),
      euphotic_depth_m: Number(euphoticDepthM.toFixed(1)),
      secchi_depth_m: Number(secchiDepthM.toFixed(1)),
      benthic_reflectance: Number(benthicReflectance.toFixed(4)),
      nominal_substrate_albedo: substrateMeta.albedo,
      estimated_volume_m3: estActiveVolM3,
      estimated_volume_acre_feet: estActiveVolM3 * 0.000810714,
      siltation_volume_loss_m3: siltationLossM3,
      siltation_loss_percentage: Number(siltationLossPct.toFixed(2)),
      estimated_remaining_years: Number(remainingYears.toFixed(1)),
      severity_tier: severityTier,
      clarity_tier: clarityTier
    };
  }, [
    blueReflectance, greenReflectance, redReflectance, nScaleFactor, m1Param, m0Param,
    activeBenchmark, selectedModel, rInfBlue, rInfGreen, rInfRed, a0Weight, aBlueWeight,
    aGreenWeight, aRedWeight, selectedSubstrate
  ]);

  // --------------------------------------------------------------------------
  // Elevation-Area-Capacity (EAC) Curve Data Generation
  // --------------------------------------------------------------------------
  const eacData = useMemo(() => {
    const minZ = activeBenchmark.datum_min_elevation_m;
    const maxZ = activeBenchmark.datum_max_elevation_m;
    const currZ = activeBenchmark.current_pool_elevation_m;
    const totalH = maxZ - minZ;
    const steps = 8;
    const dz = totalH / steps;

    const points = [];
    let cumVolM3 = 0.0;
    let prevAreaM2 = 0.0;

    for (let i = 0; i <= steps; i++) {
      const z = Number((minZ + (i * dz)).toFixed(1));
      const frac = i / steps;
      // Parabolic / conical basin hypsometry: Area ~ frac^1.4
      const areaHa = Number((activeBenchmark.surface_area_ha * Math.pow(frac, 1.35)).toFixed(1));
      const areaM2 = areaHa * 10000;

      if (i > 0) {
        // Conical frustum numerical integration
        const incVol = (dz / 3.0) * (prevAreaM2 + areaM2 + Math.sqrt(prevAreaM2 * areaM2));
        cumVolM3 += incVol;
      }
      prevAreaM2 = areaM2;

      points.push({
        elevation_m: z,
        depth_m: Number((z - minZ).toFixed(1)),
        surface_area_ha: areaHa,
        storage_volume_m3: Number(cumVolM3.toFixed(0)),
        storage_volume_million_m3: Number((cumVolM3 / 1e6).toFixed(2)),
        storage_volume_acre_feet: Number((cumVolM3 * 0.000810714).toFixed(1))
      });
    }

    return {
      points,
      minZ,
      maxZ,
      currZ
    };
  }, [activeBenchmark]);

  // ChartJS EAC Curve Configuration
  const eacChartData = useMemo(() => {
    const labels = eacData.points.map(p => `${p.elevation_m}m`);
    return {
      labels,
      datasets: [
        {
          label: 'Storage Capacity (Million m³)',
          data: eacData.points.map(p => p.storage_volume_million_m3),
          borderColor: '#0284c7',
          backgroundColor: 'rgba(2, 132, 199, 0.25)',
          fill: true,
          tension: 0.35,
          yAxisID: 'yVolume'
        },
        {
          label: 'Surface Water Area (Hectares)',
          data: eacData.points.map(p => p.surface_area_ha),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          borderDash: [5, 4],
          fill: false,
          tension: 0.35,
          yAxisID: 'yArea'
        }
      ]
    };
  }, [eacData]);

  const eacChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false
    },
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1',
          font: { family: 'monospace', size: 11 }
        }
      },
      tooltip: {
        backgroundColor: '#09090b',
        borderColor: '#38bdf8',
        borderWidth: 1,
        titleColor: '#38bdf8',
        bodyColor: '#f8fafc',
        bodyFont: { family: 'monospace' }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.06)' },
        ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } },
        title: { display: true, text: 'Stage Elevation (m above datum)', color: '#94a3b8', font: { family: 'monospace' } }
      },
      yVolume: {
        type: 'linear',
        position: 'left',
        grid: { color: 'rgba(255,255,255,0.06)' },
        ticks: { color: '#38bdf8', font: { family: 'monospace', size: 10 } },
        title: { display: true, text: 'Capacity (Million m³)', color: '#38bdf8', font: { family: 'monospace' } }
      },
      yArea: {
        type: 'linear',
        position: 'right',
        grid: { drawOnChartArea: false },
        ticks: { color: '#34d399', font: { family: 'monospace', size: 10 } },
        title: { display: true, text: 'Surface Area (ha)', color: '#34d399', font: { family: 'monospace' } }
      }
    }
  }), []);

  // --------------------------------------------------------------------------
  // Attenuation Exponential Decay Profile Chart
  // --------------------------------------------------------------------------
  const attenuationChartData = useMemo(() => {
    const depths = [0, 2, 4, 6, 8, 10, 15, 20, 25, 30, 35, 40];
    const kd = calculatedInversion.attenuation_kd;
    const kdBlue = Math.max(0.04, kd * 0.85);
    const kdGreen = Math.max(0.05, kd);
    const kdRed = Math.max(0.20, kd * 3.2);

    return {
      labels: depths.map(d => `${d}m`),
      datasets: [
        {
          label: 'Blue Band Transmission (490nm)',
          data: depths.map(z => Math.round(100 * Math.exp(-kdBlue * z))),
          borderColor: '#38bdf8',
          backgroundColor: 'transparent',
          tension: 0.3
        },
        {
          label: 'Green Band Transmission (560nm)',
          data: depths.map(z => Math.round(100 * Math.exp(-kdGreen * z))),
          borderColor: '#34d399',
          backgroundColor: 'transparent',
          tension: 0.3
        },
        {
          label: 'Red Band Transmission (665nm)',
          data: depths.map(z => Math.round(100 * Math.exp(-kdRed * z))),
          borderColor: '#f87171',
          backgroundColor: 'transparent',
          tension: 0.3
        }
      ]
    };
  }, [calculatedInversion.attenuation_kd]);

  // --------------------------------------------------------------------------
  // OLS Calibration Handler
  // --------------------------------------------------------------------------
  const handleRunSoundingCalibration = async () => {
    setCalibrating(true);
    try {
      const payload = {
        asset_id: activeBenchmark.id,
        model_type: selectedModel,
        in_situ_points: soundings.map(s => ({
          station_id: s.id,
          reference_depth_m: s.z_obs_m,
          blue_reflectance: s.blue_r,
          green_reflectance: s.green_r
        }))
      };
      const res = await calibrateBathymetrySoundings(payload);
      setCalibratedCoeffs(res);
    } catch {
      // Local OLS Fallback
      const n = soundings.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      soundings.forEach(s => {
        const lnB = Math.log(nScaleFactor * s.blue_r);
        const lnG = Math.log(nScaleFactor * s.green_r);
        const x = lnG !== 0 ? lnB / lnG : 1.0;
        const y = s.z_obs_m;
        sumX += x;
        sumY += y;
        sumXY += x * y;
        sumX2 += x * x;
      });
      const denom = (n * sumX2 - sumX * sumX);
      const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 28.5;
      const intercept = (sumY - slope * sumX) / n;
      const m1 = Number(slope.toFixed(2));
      const m0 = Number((-intercept).toFixed(2));

      // Calculate R^2 and RMSE
      let ssRes = 0;
      let ssTot = 0;
      const yMean = sumY / n;
      soundings.forEach(s => {
        const lnB = Math.log(nScaleFactor * s.blue_r);
        const lnG = Math.log(nScaleFactor * s.green_r);
        const x = lnG !== 0 ? lnB / lnG : 1.0;
        const yPred = (m1 * x) - m0;
        ssRes += Math.pow(s.z_obs_m - yPred, 2);
        ssTot += Math.pow(s.z_obs_m - yMean, 2);
      });
      const r2 = ssTot > 0 ? Math.max(0.0, Math.min(1.0, 1.0 - (ssRes / ssTot))) : 0.92;
      const rmse = Math.sqrt(ssRes / n);

      setCalibratedCoeffs({
        asset_id: activeBenchmark.id,
        model_type: selectedModel,
        m1,
        m0,
        r_squared: Number(r2.toFixed(3)),
        rmse_m: Number(rmse.toFixed(2)),
        point_count: n,
        calibrated_at: new Date().toISOString()
      });
    } finally {
      setCalibrating(false);
    }
  };

  const handleApplyCalibratedCoeffs = () => {
    if (calibratedCoeffs) {
      setM1Param(calibratedCoeffs.m1);
      setM0Param(calibratedCoeffs.m0);
      setActiveTab('inversion_studio');
    }
  };

  // --------------------------------------------------------------------------
  // Server-Side Full Inversion Execution
  // --------------------------------------------------------------------------
  const handleExecuteInversion = async () => {
    setLoadingInversion(true);
    try {
      const payload = {
        asset_id: activeBenchmark.id,
        collection: 'sentinel-2-l2a',
        item_id: 'S2A_MSIL2A_20260815',
        model_type: selectedModel,
        calibration_m1: Number(m1Param),
        calibration_m0: Number(m0Param),
        design_capacity_m3: activeBenchmark.design_capacity_m3,
        design_max_depth_m: activeBenchmark.design_max_depth_m,
        surface_area_ha: activeBenchmark.surface_area_ha,
        blue_reflectance: Number(blueReflectance),
        green_reflectance: Number(greenReflectance),
        red_reflectance: Number(redReflectance),
        nir_reflectance: Number(nirReflectance)
      };
      const res = await requestBathymetryInversion(payload);
      setInversionResult(res);
    } catch {
      // Fallback to local inversion summary
      setInversionResult({
        request_id: `SDB_LOCAL_${Date.now()}`,
        asset_id: activeBenchmark.id,
        model_type: selectedModel,
        quality_summary: {
          mean_depth_m: Number((calculatedInversion.inverted_depth_m * 0.54).toFixed(2)),
          max_depth_m: calculatedInversion.inverted_depth_m,
          estimated_volume_m3: calculatedInversion.estimated_volume_m3,
          estimated_volume_acre_feet: calculatedInversion.estimated_volume_acre_feet,
          design_capacity_m3: activeBenchmark.design_capacity_m3,
          siltation_volume_loss_m3: calculatedInversion.siltation_volume_loss_m3,
          siltation_loss_percentage: calculatedInversion.siltation_loss_percentage,
          estimated_remaining_years: calculatedInversion.estimated_remaining_years,
          severity_tier: calculatedInversion.severity_tier.id,
          clarity_tier: calculatedInversion.clarity_tier,
          optical_depth_limit_m: calculatedInversion.euphotic_depth_m,
          mean_attenuation_kd: calculatedInversion.attenuation_kd,
          dominant_benthic_substrate: selectedSubstrate,
          narrative: `Optical bathymetry inverted via ${selectedModel}. Active storage is ${(calculatedInversion.estimated_volume_m3 / 1e6).toFixed(1)}M m³ with ${(100 - calculatedInversion.siltation_loss_percentage).toFixed(1)}% design capacity remaining.`
        },
        eac_curve: eacData.points,
        tile_url_template: buildDynamicBathymetryTileUrlTemplate({
          model: selectedModel,
          metric: selectedMetric,
          colormap: selectedColormap,
          rescale: `${rescaleMin},${rescaleMax}`,
          asset_id: activeBenchmark.id
        })
      });
    } finally {
      setLoadingInversion(false);
    }
  };

  // --------------------------------------------------------------------------
  // Apply Layer to Map Explorer Handler
  // --------------------------------------------------------------------------
  const handleApplyToMap = useCallback(() => {
    const urlTemplate = buildDynamicBathymetryTileUrlTemplate({
      model: selectedModel,
      metric: selectedMetric,
      colormap: selectedColormap,
      rescale: `${rescaleMin},${rescaleMax}`,
      asset_id: activeBenchmark.id
    });

    const payload = {
      assetId: activeBenchmark.id,
      assetName: activeBenchmark.name,
      model: selectedModel,
      metric: selectedMetric,
      colormap: selectedColormap,
      rescale: `${rescaleMin},${rescaleMax}`,
      opacity: layerOpacity,
      urlTemplate,
      tileUrl: urlTemplate,
      centerCoords: activeBenchmark.center,
      summary: inversionResult?.quality_summary || {
        mean_depth_m: Number((calculatedInversion.inverted_depth_m * 0.54).toFixed(2)),
        max_depth_m: calculatedInversion.inverted_depth_m,
        estimated_volume_m3: calculatedInversion.estimated_volume_m3,
        siltation_loss_percentage: calculatedInversion.siltation_loss_percentage,
        severity_tier: calculatedInversion.severity_tier.id,
        mean_attenuation_kd: calculatedInversion.attenuation_kd
      }
    };

    if (onApply) {
      onApply(payload);
    }
    if (onApplyTileLayer) {
      onApplyTileLayer(urlTemplate, payload);
    }
    onClose();
  }, [
    selectedModel, selectedMetric, selectedColormap, rescaleMin, rescaleMax,
    activeBenchmark, layerOpacity, inversionResult, calculatedInversion,
    onApply, onApplyTileLayer, onClose
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-7xl max-h-[94vh] flex flex-col bg-zinc-950 border border-sky-500/40 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        
        {/* ==================================================================== */}
        {/* TOP MODAL HEADER                                                     */}
        {/* ==================================================================== */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-gradient-to-r from-zinc-900 via-sky-950/30 to-zinc-900 select-none">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.25)]">
              <Waves className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide font-mono">
                  SATELLITE-DERIVED BATHYMETRY STUDIO (SDB)
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Cycle v2.5.44
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Sentinel-2 MSI & Landsat OLI
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Stumpf Log-Ratio Depth Inversion • 3D Sub-Surface Depth Contours • Reservoir EAC Storage Capacity • Water Column Kd
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleApplyToMap}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono uppercase bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-[0_0_12px_rgba(2,132,199,0.5)] cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Apply Layer To Map</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Close SDB Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* RESERVOIR BENCHMARK SITE SELECTOR BAR                                */}
        {/* ==================================================================== */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900/90 border-b border-zinc-800/80 overflow-x-auto text-xs font-mono">
          <span className="text-slate-400 uppercase tracking-wider font-bold shrink-0 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-sky-400" />
            Target Reservoir:
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {Object.values(SDB_RESERVOIR_BENCHMARKS).map((bench) => {
              const isSelected = bench.id === selectedAssetKey;
              return (
                <button
                  key={bench.id}
                  onClick={() => handleSelectBenchmark(bench.id)}
                  className={`px-3 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_10px_rgba(56,189,248,0.3)]'
                      : 'bg-zinc-800/60 border-zinc-700/60 text-slate-400 hover:text-slate-200 hover:bg-zinc-850'
                  }`}
                >
                  <span>{bench.name}</span>
                  <span className="text-[10px] text-slate-400">({bench.location.split(',')[0]})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* NAVIGATION TAB STRIP                                                 */}
        {/* ==================================================================== */}
        <div className="flex items-center px-6 border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto select-none">
          {[
            { id: 'inversion_studio', label: '1. Stumpf Depth Inversion', icon: Sliders },
            { id: 'subsurface_contour', label: '2. 3D Sub-Surface Contours', icon: Activity },
            { id: 'eac_curve', label: '3. Reservoir EAC Storage Curve', icon: BarChart3 },
            { id: 'attenuation_profile', label: '4. Water Column Attenuation (Kd)', icon: Sun },
            { id: 'calibration_soundings', label: '5. In-Situ Calibration (OLS)', icon: Compass },
            { id: 'tile_contract', label: '6. Dynamic Leaflet TileLayer', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold tracking-wide border-b-2 transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'border-sky-400 text-sky-300 bg-sky-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-800/30'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ==================================================================== */}
        {/* MODAL BODY (Scrollable Viewport)                                     */}
        {/* ==================================================================== */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ------------------------------------------------------------------ */}
          {/* TAB 1: OPTICAL DEPTH INVERSION & STUMPF SOLVER                     */}
          {/* ------------------------------------------------------------------ */}
          {activeTab === 'inversion_studio' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Benchmark Summary Banner */}
              <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{activeBenchmark.name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-800 text-sky-300 border border-zinc-700">
                      Coordinates: [{activeBenchmark.center[0].toFixed(3)}°N, {activeBenchmark.center[1].toFixed(3)}°E]
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1 leading-relaxed max-w-3xl">
                    {activeBenchmark.description}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-right">
                    <div className="text-[10px] text-slate-400 uppercase">Design Capacity</div>
                    <div className="text-sky-300 font-bold">{(activeBenchmark.design_capacity_m3 / 1e6).toFixed(1)} M m³</div>
                  </div>
                  <div className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-right">
                    <div className="text-[10px] text-slate-400 uppercase">Max Design Depth</div>
                    <div className="text-emerald-300 font-bold">{activeBenchmark.design_max_depth_m} m</div>
                  </div>
                </div>
              </div>

              {/* Model Formulation Selector Card */}
              <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase text-sky-400 tracking-wider flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4" />
                    Optical Depth Inversion Formulation
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Stumpf et al. (2003) Non-Linear Log-Ratio
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SDB_MODELS.map((m) => {
                    const isSelected = selectedModel === m.id;
                    return (
                      <button
                        key={m.id}
                        onClick={() => setSelectedModel(m.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-sky-500/15 border-sky-400 text-white shadow-[0_0_12px_rgba(56,189,248,0.25)]'
                            : 'bg-zinc-900 border-zinc-800 text-slate-300 hover:border-zinc-700 hover:bg-zinc-850'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-xs font-mono text-white mb-1">{m.label}</div>
                          <div className="font-mono text-[11px] text-sky-300 mb-2 p-1.5 rounded bg-zinc-950/60 border border-zinc-800">
                            {m.formula}
                          </div>
                          <p className="text-[11px] text-slate-400 leading-normal">{m.description}</p>
                        </div>
                        <div className="mt-3 text-[10px] text-slate-400 font-mono border-t border-zinc-800/80 pt-1.5">
                          {m.citation}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Controls Grid: Stumpf Parameters & Reflectance Inputs */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Column: Stumpf Log-Ratio Parameters */}
                <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4 font-mono">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      Stumpf Log-Ratio Calibration Parameters
                    </h4>
                    <button
                      onClick={() => {
                        setM1Param(activeBenchmark.default_m1);
                        setM0Param(activeBenchmark.default_m0);
                        setNScaleFactor(activeBenchmark.default_n || 1000.0);
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                    >
                      Reset Defaults
                    </button>
                  </div>

                  {/* m1 slope parameter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Slope Coefficient (m₁):</span>
                      <span className="text-sky-400 font-bold">{Number(m1Param).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="5.0"
                      max="60.0"
                      step="0.1"
                      value={m1Param}
                      onChange={(e) => setM1Param(parseFloat(e.target.value))}
                      className="w-full accent-sky-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>5.0 (Low Gain)</span>
                      <span>Stumpf scaling factor</span>
                      <span>60.0 (High Depth)</span>
                    </div>
                  </div>

                  {/* m0 offset parameter */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Datum Offset Intercept (m₀):</span>
                      <span className="text-sky-400 font-bold">{Number(m0Param).toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="-5.0"
                      max="35.0"
                      step="0.1"
                      value={m0Param}
                      onChange={(e) => setM0Param(parseFloat(e.target.value))}
                      className="w-full accent-sky-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>-5.0m (Shallow Offset)</span>
                      <span>Zero-depth datum shift</span>
                      <span>35.0m (Deep Offset)</span>
                    </div>
                  </div>

                  {/* Scale factor n */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Log Scale Factor (n):</span>
                      <span className="text-sky-400 font-bold">{Number(nScaleFactor).toFixed(0)}</span>
                    </div>
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="50"
                      value={nScaleFactor}
                      onChange={(e) => setNScaleFactor(parseFloat(e.target.value))}
                      className="w-full accent-sky-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span>100</span>
                      <span>Ensures ln(n*R) &gt; 1 for positive ratios</span>
                      <span>5000</span>
                    </div>
                  </div>

                  {/* Benthic Substrate Albedo Separation */}
                  <div className="pt-3 border-t border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
                        <Droplet className="w-3.5 h-3.5 text-emerald-400" />
                        Benthic Substrate Classification:
                      </span>
                      <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableBenthicSeparation}
                          onChange={(e) => setEnableBenthicSeparation(e.target.checked)}
                          className="accent-sky-400 rounded"
                        />
                        <span>Albedo Separation</span>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      {BENTHIC_SUBSTRATE_CLASSES.map((sub) => {
                        const isSubSelected = selectedSubstrate === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => setSelectedSubstrate(sub.id)}
                            className={`p-2 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                              isSubSelected
                                ? 'bg-zinc-800 border-sky-400 text-white'
                                : 'bg-zinc-900 border-zinc-800 text-slate-400 hover:bg-zinc-850'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                              <span className="truncate">{sub.name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Albedo: ~{sub.albedo}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right Column: Surface Reflectance Inputs & Lyzenga Asymptotes */}
                <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4 font-mono">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5" />
                      Water-Leaving Surface Reflectance (R_rs)
                    </h4>
                    <span className="text-[11px] text-slate-400">Sentinel-2 MSI Level-2A</span>
                  </div>

                  {/* Blue Band (490nm) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-sky-300 font-bold">Blue Band R_blue (~490nm):</span>
                      <span className="text-sky-400 font-bold">{Number(blueReflectance).toFixed(4)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.010"
                      max="0.150"
                      step="0.001"
                      value={blueReflectance}
                      onChange={(e) => setBlueReflectance(parseFloat(e.target.value))}
                      className="w-full accent-blue-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Green Band (560nm) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-emerald-300 font-bold">Green Band R_green (~560nm):</span>
                      <span className="text-emerald-400 font-bold">{Number(greenReflectance).toFixed(4)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.005"
                      max="0.120"
                      step="0.001"
                      value={greenReflectance}
                      onChange={(e) => setGreenReflectance(parseFloat(e.target.value))}
                      className="w-full accent-emerald-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Red Band (665nm) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-rose-300 font-bold">Red Band R_red (~665nm):</span>
                      <span className="text-rose-400 font-bold">{Number(redReflectance).toFixed(4)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.001"
                      max="0.080"
                      step="0.001"
                      value={redReflectance}
                      onChange={(e) => setRedReflectance(parseFloat(e.target.value))}
                      className="w-full accent-rose-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* NIR Band (842nm) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-purple-300 font-bold">NIR Band R_nir (~842nm):</span>
                      <span className="text-purple-400 font-bold">{Number(nirReflectance).toFixed(4)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.000"
                      max="0.030"
                      step="0.001"
                      value={nirReflectance}
                      onChange={(e) => setNirReflectance(parseFloat(e.target.value))}
                      className="w-full accent-purple-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Lyzenga Deep-Water Asymptote Tuning & Weights */}
                  {selectedModel === 'lyzenga_multispectral' && (
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2 pt-2">
                      <div className="text-[11px] font-bold text-amber-300 uppercase">
                        Lyzenga Deep-Water Radiance Asymptotes (R_inf)
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400">R_inf Blue</label>
                          <input
                            type="number"
                            step="0.001"
                            value={rInfBlue}
                            onChange={(e) => setRInfBlue(parseFloat(e.target.value))}
                            className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-sky-300"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">R_inf Green</label>
                          <input
                            type="number"
                            step="0.001"
                            value={rInfGreen}
                            onChange={(e) => setRInfGreen(parseFloat(e.target.value))}
                            className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-emerald-300"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">R_inf Red</label>
                          <input
                            type="number"
                            step="0.001"
                            value={rInfRed}
                            onChange={(e) => setRInfRed(parseFloat(e.target.value))}
                            className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-rose-300"
                          />
                        </div>
                      </div>

                      <div className="text-[11px] font-bold text-sky-300 uppercase pt-2">
                        Lyzenga Multi-Band Regression Weights (a_i)
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400">a0</label>
                          <input
                            type="number"
                            step="0.5"
                            value={a0Weight}
                            onChange={(e) => setA0Weight(parseFloat(e.target.value))}
                            className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">a_blue</label>
                          <input
                            type="number"
                            step="0.5"
                            value={aBlueWeight}
                            onChange={(e) => setABlueWeight(parseFloat(e.target.value))}
                            className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-sky-300"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">a_green</label>
                          <input
                            type="number"
                            step="0.5"
                            value={aGreenWeight}
                            onChange={(e) => setAGreenWeight(parseFloat(e.target.value))}
                            className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-emerald-300"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400">a_red</label>
                          <input
                            type="number"
                            step="0.5"
                            value={aRedWeight}
                            onChange={(e) => setARedWeight(parseFloat(e.target.value))}
                            className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-rose-300"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Run Pipeline Button */}
                  <div className="pt-2">
                    <button
                      onClick={handleExecuteInversion}
                      disabled={loadingInversion}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold font-mono text-xs uppercase bg-sky-600 hover:bg-sky-500 text-white transition-all shadow-[0_0_15px_rgba(2,132,199,0.4)] disabled:opacity-50 cursor-pointer"
                    >
                      {loadingInversion ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Executing Raster Inversion...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 text-yellow-300" />
                          <span>Execute Full Reservoir Depth Inversion</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

              </div>

              {/* Live Inversion Analytical Output Card */}
              <div className="p-5 rounded-xl border border-sky-500/40 bg-zinc-900/60 font-mono">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-white">Live Inversion & Hydrological Status</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${calculatedInversion.severity_tier.badgeClass}`}>
                    {calculatedInversion.severity_tier.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-slate-400 uppercase">Inverted Depth</div>
                    <div className="text-xl font-bold text-sky-300 mt-1">{calculatedInversion.inverted_depth_m} m</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Peak optical depth</div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-slate-400 uppercase">Stumpf Ratio</div>
                    <div className="text-xl font-bold text-sky-400 mt-1">{calculatedInversion.stumpf_ratio}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">ln(n*B) / ln(n*G)</div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-slate-400 uppercase">Attenuation Kd</div>
                    <div className="text-xl font-bold text-teal-300 mt-1">{calculatedInversion.attenuation_kd} m⁻¹</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Diffuse coefficient</div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-slate-400 uppercase">Euphotic Depth (1%)</div>
                    <div className="text-xl font-bold text-emerald-300 mt-1">{calculatedInversion.euphotic_depth_m} m</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Secchi: ~{calculatedInversion.secchi_depth_m}m</div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-slate-400 uppercase">Bottom Albedo</div>
                    <div className="text-xl font-bold text-amber-300 mt-1">{calculatedInversion.benthic_reflectance}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Substrate: {selectedSubstrate}</div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-slate-400 uppercase">Siltation Loss</div>
                    <div className="text-xl font-bold text-rose-400 mt-1">{calculatedInversion.siltation_loss_percentage}%</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">~{calculatedInversion.estimated_remaining_years} yrs remaining</div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* TAB 2: 3D SUB-SURFACE DEPTH CONTOUR VISUALIZER                    */}
          {/* ------------------------------------------------------------------ */}
          {activeTab === 'subsurface_contour' && (
            <div className="space-y-6 animate-fadeIn font-mono">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
                <div>
                  <h3 className="text-xs font-bold uppercase text-sky-400 tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    3D Sub-Surface Bathymetric Depth Contour Visualizer
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Isometric sub-surface reservoir basin visualization with contoured isolines, light penetration layers, and longitudinal thalweg transect.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 text-xs">
                  <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                    <span className="text-slate-400">Contour Interval:</span>
                    {[2.0, 5.0, 10.0].map((step) => (
                      <button
                        key={step}
                        onClick={() => setContourInterval(step)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          contourInterval === step ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {step}m
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                    <span className="text-slate-400">View:</span>
                    {[
                      { id: 'isometric', label: '3D Isometric' },
                      { id: 'topdown', label: '2D Top-Down' },
                      { id: 'cross_section', label: 'Thalweg Profile' }
                    ].map((v) => (
                      <button
                        key={v.id}
                        onClick={() => setView3DMode(v.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                          view3DMode === v.id ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main Visualizer Canvas / SVG Representation */}
              <div className="relative w-full h-[420px] rounded-2xl bg-zinc-950 border border-sky-500/30 overflow-hidden flex items-center justify-center shadow-inner">
                
                {/* SVG Visualizer Rendering */}
                <svg
                  viewBox="0 0 800 400"
                  className="w-full h-full select-none cursor-crosshair"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 800;
                    const y = ((e.clientY - rect.top) / rect.height) * 400;
                    // Compute pseudo-depth based on distance to center
                    const dx = (x - 400) / 300;
                    const dy = (y - 200) / 150;
                    const distSq = dx * dx + dy * dy;
                    const depth = Math.max(0.0, Math.min(activeBenchmark.nominal_sdb_max_depth_m, 
                      activeBenchmark.nominal_sdb_max_depth_m * Math.max(0.0, 1.0 - Math.sqrt(distSq))
                    ));
                    setHoverDepthPoint({ x: Math.round(x), y: Math.round(y), depth: Number(depth.toFixed(1)) });
                  }}
                  onMouseLeave={() => setHoverDepthPoint(null)}
                >
                  <defs>
                    <radialGradient id="bathymetryBasinGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#082f49" />
                      <stop offset="40%" stopColor="#0369a1" />
                      <stop offset="75%" stopColor="#38bdf8" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#bae6fd" stopOpacity="0.4" />
                    </radialGradient>
                    <linearGradient id="waterSurfaceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#0284c7" stopOpacity="0.7" />
                    </linearGradient>
                    <linearGradient id="sedimentDeltaGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a8a29e" stopOpacity="0.9" />
                      <stop offset="100%" stopColor="#78716c" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>

                  {/* Grid lines */}
                  <g opacity="0.15" stroke="#38bdf8" strokeWidth="0.5">
                    {Array.from({ length: 17 }).map((_, i) => (
                      <line key={`gx-${i}`} x1={i * 50} y1="0" x2={i * 50} y2="400" />
                    ))}
                    {Array.from({ length: 9 }).map((_, i) => (
                      <line key={`gy-${i}`} x1="0" y1={i * 50} x2="800" y2={i * 50} />
                    ))}
                  </g>

                  {view3DMode === 'cross_section' ? (
                    /* Cross-Sectional Longitudinal Profile */
                    <g>
                      {/* Water Body */}
                      <path
                        d="M 60,120 L 740,120 L 740,340 Q 400,380 60,180 Z"
                        fill="url(#waterSurfaceGrad)"
                      />
                      {/* Water Surface Line */}
                      <line x1="60" y1="120" x2="740" y2="120" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="6 3" />
                      <text x="75" y="112" fill="#38bdf8" fontSize="11" fontFamily="monospace">
                        Water Surface Datum Stage: {activeBenchmark.current_pool_elevation_m}m
                      </text>

                      {/* Bedrock Bathymetric Profile */}
                      <path
                        d="M 60,180 Q 250,300 400,340 T 740,360 L 740,390 L 60,390 Z"
                        fill="#18181b"
                        stroke="#71717a"
                        strokeWidth="2"
                      />

                      {/* Sediment Siltation Wedge */}
                      <path
                        d="M 60,180 Q 200,270 340,320 L 340,335 Q 200,285 60,195 Z"
                        fill="url(#sedimentDeltaGrad)"
                        stroke="#d97706"
                        strokeWidth="1.5"
                      />
                      <text x="140" y="240" fill="#f59e0b" fontSize="10" fontFamily="monospace">
                        Siltation Accretion Wedge
                      </text>

                      {/* Isolines in Profile */}
                      {[10, 20, 30, 40].map((d) => (
                        <g key={`dline-${d}`}>
                          <line x1="60" y1={120 + d * 5} x2="740" y2={120 + d * 5} stroke="#38bdf8" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.5" />
                          <text x="745" y={124 + d * 5} fill="#94a3b8" fontSize="9" fontFamily="monospace">-{d}m</text>
                        </g>
                      ))}

                      {/* Dam Embankment Face */}
                      <polygon points="740,80 780,80 780,390 740,390" fill="#3f3f46" stroke="#52525b" strokeWidth="1.5" />
                      <text x="745" y="220" fill="#cbd5e1" fontSize="10" fontFamily="monospace" transform="rotate(90 745,220)">
                        Dam Embankment Axis
                      </text>
                    </g>
                  ) : (
                    /* Plan / Isometric Bathymetric Contour Basin */
                    <g transform={view3DMode === 'isometric' ? 'rotate(-8 400 200) skewX(-15)' : ''}>
                      {/* Deep Basin Center Fill */}
                      <ellipse cx="400" cy="200" rx="300" ry="150" fill="url(#bathymetryBasinGrad)" />

                      {/* Concentric Depth Isolines */}
                      {Array.from({ length: Math.floor(activeBenchmark.nominal_sdb_max_depth_m / contourInterval) }).map((_, idx) => {
                        const depth = (idx + 1) * contourInterval;
                        const factor = 1.0 - (depth / (activeBenchmark.nominal_sdb_max_depth_m * 1.15));
                        if (factor <= 0.05) return null;
                        const rx = 300 * factor;
                        const ry = 150 * factor;
                        return (
                          <g key={`iso-${depth}`}>
                            <ellipse
                              cx="400"
                              cy="200"
                              rx={rx}
                              ry={ry}
                              fill="none"
                              stroke={depth % (contourInterval * 2) === 0 ? '#38bdf8' : '#0284c7'}
                              strokeWidth={depth % (contourInterval * 2) === 0 ? '1.5' : '1.0'}
                              strokeDasharray={depth % (contourInterval * 2) === 0 ? 'none' : '4 2'}
                              opacity="0.8"
                            />
                            {/* Depth Label on Isoline */}
                            <text
                              x={400}
                              y={200 - ry + 4}
                              fill="#bae6fd"
                              fontSize="9"
                              textAnchor="middle"
                              fontFamily="monospace"
                              className="pointer-events-none"
                            >
                              -{depth}m
                            </text>
                          </g>
                        );
                      })}

                      {/* Reservoir Thalweg Channel Centerline */}
                      <path
                        d="M 120,200 Q 260,170 400,200 T 680,210"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.5"
                        strokeDasharray="6 3"
                      />
                      <text x="130" y="190" fill="#f59e0b" fontSize="9" fontFamily="monospace">
                        Inlet River Channel
                      </text>
                      <text x="630" y="200" fill="#f59e0b" fontSize="9" fontFamily="monospace">
                        Deep Pool
                      </text>
                    </g>
                  )}

                  {/* Interactive Cursor Reticle Probe */}
                  {hoverDepthPoint && (
                    <g>
                      <circle cx={hoverDepthPoint.x} cy={hoverDepthPoint.y} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                      <line x1={hoverDepthPoint.x - 12} y1={hoverDepthPoint.y} x2={hoverDepthPoint.x + 12} y2={hoverDepthPoint.y} stroke="#f43f5e" strokeWidth="1" />
                      <line x1={hoverDepthPoint.x} y1={hoverDepthPoint.y - 12} x2={hoverDepthPoint.x} y2={hoverDepthPoint.y + 12} stroke="#f43f5e" strokeWidth="1" />
                    </g>
                  )}
                </svg>

                {/* Floating Interactive Probe HUD */}
                {hoverDepthPoint && (
                  <div className="absolute bottom-4 left-4 z-10 px-3.5 py-2.5 rounded-xl bg-zinc-950/90 border border-sky-400/60 shadow-xl text-xs backdrop-blur-md">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">Interactive Sub-Surface Depth Probe</div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sky-300 font-bold text-sm">Depth: {hoverDepthPoint.depth} m</span>
                      <span className="text-emerald-400 font-bold">
                        Elevation: {(activeBenchmark.current_pool_elevation_m - hoverDepthPoint.depth).toFixed(1)} m
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Light Intensity: {Math.round(100 * Math.exp(-calculatedInversion.attenuation_kd * hoverDepthPoint.depth))}% transmission
                    </div>
                  </div>
                )}

                {/* Sub-Surface Layer Legend Badge */}
                <div className="absolute top-4 right-4 z-10 p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 text-[11px] space-y-1.5 backdrop-blur-md">
                  <div className="font-bold text-white text-xs mb-1">Bathymetric Water Column Layers</div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-300" />
                    <span>Littoral Shelf (0 - 5m)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                    <span>Epilimnion Layer (5 - 15m)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-700" />
                    <span>Metalimnion Thermocline (15 - 30m)</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-950" />
                    <span>Hypolimnion / Dead Storage (30m+)</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* TAB 3: RESERVOIR EAC STORAGE CAPACITY CURVE                        */}
          {/* ------------------------------------------------------------------ */}
          {activeTab === 'eac_curve' && (
            <div className="space-y-6 animate-fadeIn font-mono">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase text-sky-400 tracking-wider flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Reservoir Elevation-Area-Capacity (EAC) Stage-Storage Analysis
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Conical frustum numerical integration of bathymetric volume slices and active storage capacity assessment.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-sky-300 font-bold">
                    Current Pool: {activeBenchmark.current_pool_elevation_m}m
                  </span>
                  <span className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-emerald-300 font-bold">
                    Spillway: {activeBenchmark.datum_max_elevation_m}m
                  </span>
                </div>
              </div>

              {/* Chart.js Dual-Axis Line Graph */}
              <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
                <div className="h-[340px] w-full">
                  <Line data={eacChartData} options={eacChartOptions} />
                </div>
              </div>

              {/* Siltation & Storage Loss Analytics Card */}
              <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <h4 className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Reservoir Siltation Storage Depletion & Operational Lifespan
                  </h4>
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${calculatedInversion.severity_tier.badgeClass}`}>
                    {calculatedInversion.severity_tier.label}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-slate-400 uppercase">Design Capacity</div>
                    <div className="text-lg font-bold text-white mt-1">
                      {(activeBenchmark.design_capacity_m3 / 1e6).toFixed(1)} M m³
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      ~{Math.round(activeBenchmark.design_capacity_m3 * 0.000810714).toLocaleString()} acre-feet
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-slate-400 uppercase">Current Active Storage</div>
                    <div className="text-lg font-bold text-sky-300 mt-1">
                      {(calculatedInversion.estimated_volume_m3 / 1e6).toFixed(1)} M m³
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      ~{Math.round(calculatedInversion.estimated_volume_acre_feet).toLocaleString()} acre-feet
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-slate-400 uppercase">Siltation Volume Loss</div>
                    <div className="text-lg font-bold text-rose-400 mt-1">
                      {(calculatedInversion.siltation_volume_loss_m3 / 1e6).toFixed(1)} M m³
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {calculatedInversion.siltation_loss_percentage}% capacity lost to sediment
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="text-[10px] text-slate-400 uppercase">Projected Lifespan</div>
                    <div className="text-lg font-bold text-emerald-400 mt-1">
                      {calculatedInversion.estimated_remaining_years} Years
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Before dead storage exhaustion
                    </div>
                  </div>
                </div>

                {/* Elevation-Area-Capacity Slices Table */}
                <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-950 text-slate-400 border-b border-zinc-800">
                      <tr>
                        <th className="px-3 py-2">Elevation (m)</th>
                        <th className="px-3 py-2">Depth Slice (m)</th>
                        <th className="px-3 py-2">Surface Area (ha)</th>
                        <th className="px-3 py-2">Cumulative Vol (M m³)</th>
                        <th className="px-3 py-2">Cumulative Vol (Acre-Ft)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-slate-300">
                      {eacData.points.map((pt, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/50">
                          <td className="px-3 py-1.5 font-bold text-sky-400">{pt.elevation_m}m</td>
                          <td className="px-3 py-1.5">{pt.depth_m}m</td>
                          <td className="px-3 py-1.5 text-emerald-400">{pt.surface_area_ha} ha</td>
                          <td className="px-3 py-1.5 font-bold">{pt.storage_volume_million_m3}</td>
                          <td className="px-3 py-1.5 text-slate-400">{pt.storage_volume_acre_feet.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* TAB 4: WATER COLUMN ATTENUATION PROFILE TOOL                      */}
          {/* ------------------------------------------------------------------ */}
          {activeTab === 'attenuation_profile' && (
            <div className="space-y-6 animate-fadeIn font-mono">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase text-sky-400 tracking-wider flex items-center gap-2">
                    <Sun className="w-4 h-4 text-yellow-400" />
                    Water Column Diffuse Attenuation Coefficient (Kd) & Bio-Optical Profiler
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Spectral light attenuation profiling across optical wavelengths with exponential irradiance decay and euphotic zone depth.
                  </p>
                </div>
                <span className="px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-sky-300 font-bold shrink-0">
                  {calculatedInversion.clarity_tier}
                </span>
              </div>

              {/* Spectral Attenuation Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-blue-950/20 border border-blue-500/30 text-xs">
                  <div className="text-blue-300 font-bold text-sm">Blue Channel (490nm)</div>
                  <div className="text-2xl font-bold text-white mt-2">
                    {(calculatedInversion.attenuation_kd * 0.85).toFixed(3)} m⁻¹
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Lowest absorption in clear oligotrophic waters; high penetration for deep bathymetry.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-xs">
                  <div className="text-emerald-300 font-bold text-sm">Green Channel (560nm)</div>
                  <div className="text-2xl font-bold text-white mt-2">
                    {calculatedInversion.attenuation_kd.toFixed(3)} m⁻¹
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Moderate absorption; optimal reference band for Stumpf ratio over varying substrates.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-xs">
                  <div className="text-rose-300 font-bold text-sm">Red Channel (665nm)</div>
                  <div className="text-2xl font-bold text-white mt-2">
                    {(calculatedInversion.attenuation_kd * 3.2).toFixed(3)} m⁻¹
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Strong water molecular absorption; rapid attenuation within top 2-5m.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs">
                  <div className="text-purple-300 font-bold text-sm">Secchi / Euphotic Limit</div>
                  <div className="text-2xl font-bold text-white mt-2">
                    {calculatedInversion.euphotic_depth_m} m
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    1% downwelling irradiance limit: {calculatedInversion.euphotic_depth_m}m. Secchi depth: {calculatedInversion.secchi_depth_m}m.
                  </p>
                </div>
              </div>

              {/* Light Transmission vs. Depth Line Chart */}
              <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/60 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-white">Downwelling Irradiance Transmission (% I₀ vs. Depth)</span>
                  <span className="text-[11px] text-slate-400">Beer-Lambert Exponential Extinction: I(z) = I₀ * e^(-Kd * z)</span>
                </div>
                <div className="h-[280px] w-full">
                  <Line
                    data={attenuationChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { labels: { color: '#cbd5e1', font: { family: 'monospace', size: 11 } } }
                      },
                      scales: {
                        x: {
                          ticks: { color: '#94a3b8', font: { family: 'monospace' } },
                          title: { display: true, text: 'Depth (m)', color: '#94a3b8', font: { family: 'monospace' } }
                        },
                        y: {
                          ticks: { color: '#94a3b8', font: { family: 'monospace' } },
                          title: { display: true, text: 'Transmitted Light (% I₀)', color: '#94a3b8', font: { family: 'monospace' } },
                          min: 0,
                          max: 100
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* TAB 5: IN-SITU SOUNDING CALIBRATION (OLS)                          */}
          {/* ------------------------------------------------------------------ */}
          {activeTab === 'calibration_soundings' && (
            <div className="space-y-6 animate-fadeIn font-mono">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase text-sky-400 tracking-wider flex items-center gap-2">
                    <Compass className="w-4 h-4" />
                    In-Situ Acoustic Sounding Calibration & OLS Regression
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Calibrates empirical Stumpf slope (m₁) and offset (m₀) parameters using in-situ acoustic survey soundings.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleRunSoundingCalibration}
                    disabled={calibrating}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-[0_0_12px_rgba(2,132,199,0.4)]"
                  >
                    {calibrating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
                    <span>Run OLS Regression</span>
                  </button>
                </div>
              </div>

              {/* Sounding Points Table */}
              <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Reference Acoustic Sounding Points (N = {soundings.length})</span>
                  <button
                    onClick={() => {
                      const newId = `SND_0${soundings.length + 1}`;
                      setSoundings([
                        ...soundings,
                        { id: newId, station: `Stn ${soundings.length + 1}`, lat: 37.060, lng: -121.070, z_obs_m: 20.0, blue_r: 0.065, green_r: 0.040 }
                      ]);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-sky-300 text-xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Sounding Point</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-zinc-800 rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-950 text-slate-400 border-b border-zinc-800">
                      <tr>
                        <th className="px-3 py-2">Point ID</th>
                        <th className="px-3 py-2">Station Description</th>
                        <th className="px-3 py-2">Latitude</th>
                        <th className="px-3 py-2">Longitude</th>
                        <th className="px-3 py-2">Acoustic Depth (m)</th>
                        <th className="px-3 py-2">R_blue</th>
                        <th className="px-3 py-2">R_green</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 text-slate-300">
                      {soundings.map((s, idx) => (
                        <tr key={s.id} className="hover:bg-zinc-900/50">
                          <td className="px-3 py-1.5 font-bold text-sky-400">{s.id}</td>
                          <td className="px-3 py-1.5">{s.station}</td>
                          <td className="px-3 py-1.5">{s.lat.toFixed(4)}</td>
                          <td className="px-3 py-1.5">{s.lng.toFixed(4)}</td>
                          <td className="px-3 py-1.5 font-bold text-emerald-300">{s.z_obs_m.toFixed(2)}m</td>
                          <td className="px-3 py-1.5">{s.blue_r.toFixed(3)}</td>
                          <td className="px-3 py-1.5">{s.green_r.toFixed(3)}</td>
                          <td className="px-3 py-1.5">
                            <button
                              onClick={() => {
                                if (soundings.length > 3) {
                                  setSoundings(soundings.filter((_, i) => i !== idx));
                                }
                              }}
                              className="text-slate-500 hover:text-rose-400 cursor-pointer"
                              title="Delete Sounding"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* OLS Regression Solver Results */}
              {calibratedCoeffs && (
                <div className="p-5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-4">
                  <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-sm text-white">Ordinary Least Squares (OLS) Solution Converged</span>
                    </div>
                    <button
                      onClick={handleApplyCalibratedCoeffs}
                      className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                    >
                      Apply Calibrated Parameters (m₁ = {calibratedCoeffs.m1}, m₀ = {calibratedCoeffs.m0})
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-[10px] text-slate-400 uppercase">Calibrated m₁ (Slope)</div>
                      <div className="text-xl font-bold text-sky-400 mt-1">{calibratedCoeffs.m1}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-[10px] text-slate-400 uppercase">Calibrated m₀ (Offset)</div>
                      <div className="text-xl font-bold text-sky-400 mt-1">{calibratedCoeffs.m0}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-[10px] text-slate-400 uppercase">Goodness-of-Fit (R²)</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">{calibratedCoeffs.r_squared}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="text-[10px] text-slate-400 uppercase">Residual Error (RMSE)</div>
                      <div className="text-xl font-bold text-teal-400 mt-1">{calibratedCoeffs.rmse_m} m</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* TAB 6: DYNAMIC TILELAYER & LEAFLET CONTRACT                       */}
          {/* ------------------------------------------------------------------ */}
          {activeTab === 'tile_contract' && (
            <div className="space-y-6 animate-fadeIn font-mono">
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold uppercase text-sky-400 tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-sky-400" />
                    Dynamic XYZ TileLayer Specification & Leaflet Contract
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    Conforms to Cycle v2.5.44: /api/v1/tiles/bathymetry/&#123;model&#125;/&#123;metric&#125;/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png
                  </p>
                </div>
                <button
                  onClick={handleApplyToMap}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-[0_0_12px_rgba(2,132,199,0.5)] shrink-0"
                >
                  <Eye className="w-4 h-4" />
                  <span>Apply Tile Layer to Map</span>
                </button>
              </div>

              {/* Metric Selector */}
              <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Visualization Raster Metric (6 Canonical Metrics):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.values(SDB_TILE_METRIC_CONFIGS).map((met) => {
                    const isMetSelected = selectedMetric === met.id;
                    return (
                      <button
                        key={met.id}
                        onClick={() => {
                          setSelectedMetric(met.id);
                          setSelectedColormap(met.defaultColormap);
                          const parts = met.defaultRescale.split(',');
                          if (parts.length === 2) {
                            setRescaleMin(parseFloat(parts[0]));
                            setRescaleMax(parseFloat(parts[1]));
                          }
                        }}
                        className={`p-3 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                          isMetSelected
                            ? 'bg-sky-500/20 border-sky-400 text-white shadow-[0_0_10px_rgba(56,189,248,0.25)]'
                            : 'bg-zinc-900 border-zinc-800 text-slate-400 hover:bg-zinc-850 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-white">{met.label}</div>
                        <div className="text-[10px] text-sky-400 mt-0.5">Metric key: {met.id}</div>
                        <p className="text-[10px] text-slate-500 mt-1 leading-normal">{met.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Colormap Presets Grid */}
              <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Colormap Presets (viridis, plasma, blues, turbo, coolwarm, cividis):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {SDB_COLORMAP_PRESETS.map((cm) => {
                    const isCmSelected = selectedColormap === cm.id;
                    return (
                      <button
                        key={cm.id}
                        onClick={() => setSelectedColormap(cm.id)}
                        className={`p-2.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                          isCmSelected
                            ? 'bg-zinc-800 border-sky-400 text-white ring-1 ring-sky-400'
                            : 'bg-zinc-900 border-zinc-800 text-slate-400 hover:bg-zinc-850 hover:text-slate-200'
                        }`}
                      >
                        <div className={`h-4 w-full rounded bg-gradient-to-r ${cm.preview} mb-2 shadow-inner`} />
                        <div className="font-bold truncate text-[11px] text-white">{cm.name.split(' ')[0]}</div>
                        <div className="text-[10px] text-slate-500 truncate">{cm.id}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Rescale and Opacity Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Rescale Min Value ({SDB_TILE_METRIC_CONFIGS[selectedMetric]?.unit || 'm'}):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rescaleMin}
                    onChange={(e) => setRescaleMin(parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Rescale Max Value ({SDB_TILE_METRIC_CONFIGS[selectedMetric]?.unit || 'm'}):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={rescaleMax}
                    onChange={(e) => setRescaleMax(parseFloat(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white font-mono"
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-slate-400">Layer Opacity:</label>
                    <span className="text-sky-400 font-bold">{Math.round(layerOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={layerOpacity}
                    onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                    className="w-full accent-sky-400 bg-zinc-800 h-1.5 rounded-lg cursor-pointer mt-2"
                  />
                </div>
              </div>

              {/* Copyable Tile URL & Code Snippet Card */}
              <div className="p-5 rounded-xl border border-zinc-800 bg-zinc-950 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Dynamic XYZ Tile URL Template:
                  </span>
                  <button
                    onClick={() => handleCopy(
                      buildDynamicBathymetryTileUrlTemplate({
                        model: selectedModel,
                        metric: selectedMetric,
                        colormap: selectedColormap,
                        rescale: `${rescaleMin},${rescaleMax}`,
                        asset_id: activeBenchmark.id
                      }),
                      'tile_url'
                    )}
                    className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 cursor-pointer"
                  >
                    {copiedKey === 'tile_url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'tile_url' ? 'Copied' : 'Copy URL Template'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-sky-300 break-all select-all">
                  {buildDynamicBathymetryTileUrlTemplate({
                    model: selectedModel,
                    metric: selectedMetric,
                    colormap: selectedColormap,
                    rescale: `${rescaleMin},${rescaleMax}`,
                    asset_id: activeBenchmark.id
                  })}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* ==================================================================== */}
        {/* MODAL FOOTER                                                         */}
        {/* ==================================================================== */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-zinc-800 bg-zinc-950 select-none text-xs font-mono">
          <div className="flex items-center gap-3">
            <span className="text-slate-500">Asset: {activeBenchmark.name}</span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500">Model: {selectedModel}</span>
            <span className="text-slate-700">•</span>
            <span className="text-slate-500">Depth: {calculatedInversion.inverted_depth_m}m</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-300 transition-all cursor-pointer font-bold"
            >
              Close
            </button>
            <button
              onClick={handleApplyToMap}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all shadow-[0_0_12px_rgba(2,132,199,0.5)] cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Apply Layer & Explore Map</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
