import React, { useState, useMemo, useCallback } from 'react';
import {
  X, Sun, Compass, Sliders, Check, Activity, Split, Copy,
  CheckCircle2, Layers, RefreshCw, Satellite, Sparkles,
  ArrowRight, ArrowLeftRight, Info
} from 'lucide-react';
import {
  fetchHlsHarmonizationAnalysis,
  fetchHlsBrdfGeometry,
  fetchHlsBandpassAdjustment
} from '../api/giosApi';
import {
  HlsSensorType,
  BrdfKernelModel,
  HlsHarmonizationStage,
  HlsMetric,
  HLS_BANDPASS_COEFFICIENTS,
  HLS_BRDF_SPECTRAL_PARAMETERS,
  HLS_BENCHMARK_SCENES,
  DEFAULT_HLS_GEOMETRY,
  calculateRossThickVolumetricKernel,
  calculateLiSparseGeometricKernel,
  calculateNbarBrdfFactor,
  applyNbarNormalization,
  applyCrossSensorBandpassAdjustment,
  applyHlsHarmonization,
  buildHlsTileUrlTemplate,
  buildHlsNbarTileUrlTemplate
} from '../config/constants';

/**
 * Colormap choices for Harmonized Landsat Sentinel-2 dynamic tile visualization.
 */
const HLS_COLORMAP_OPTIONS = [
  { id: 'spectral', label: 'Spectral (Multi-Band Balanced)', desc: 'Standard Earth observation multispectral stretch' },
  { id: 'viridis', label: 'Viridis (Perceptually Uniform)', desc: 'Luminescent continuous scale ideal for NBAR surface reflectance' },
  { id: 'magma', label: 'Magma Radiance', desc: 'High-contrast solar irradiance & BRDF kernel distribution' },
  { id: 'terrain', label: 'Topographic Relief Natural', desc: 'Natural terrestrial hypsometric tone for cross-sensor validation' },
  { id: 'rdylbu', label: 'Red-Yellow-Blue Divergent', desc: 'Differential cross-sensor delta and residual anomalies' }
];

/**
 * Harmonized Landsat Sentinel-2 (HLS) Harmonization Studio Modal (Cycle v2.5.33, Task T-260).
 * 
 * Provides interactive multi-sensor cross-calibration, RossThick-LiSparse-R Nadir BRDF-Adjusted
 * Reflectance (NBAR) kernel visualization, Claverie et al. (2018) Table 1 spectral bandpass
 * adjustment curves (rho_MSI = c0 + c1 * rho_OLI), interactive polar view geometry compass,
 * multi-band surface reflectance simulation probe, and dynamic Leaflet TileLayer controls.
 */
export default function HlsHarmonizationModal({
  isOpen,
  onClose,
  onApply,
  onLaunchCurtain,
  initialSceneKey = 'MGRS_10TFK_SAN_FRANCISCO_2026'
}) {
  // Navigation tabs: 'scenes' | 'geometry' | 'bandpass' | 'simulation' | 'tiles'
  const [activeTab, setActiveTab] = useState('scenes');

  // Benchmark Scene Selection
  const [selectedBenchmarkKey, setSelectedBenchmarkKey] = useState(initialSceneKey);
  const benchmarkKeys = useMemo(() => Object.keys(HLS_BENCHMARK_SCENES || {}), []);
  const activeBenchmark = useMemo(() => {
    return (HLS_BENCHMARK_SCENES && HLS_BENCHMARK_SCENES[selectedBenchmarkKey])
      || (benchmarkKeys.length > 0 ? HLS_BENCHMARK_SCENES[benchmarkKeys[0]] : {
        id: 'MGRS_10TFK_SAN_FRANCISCO_2026',
        name: 'San Francisco Bay Area, California',
        mgrs_tile: '10TFK',
        description: 'MGRS 10TFK coastal urban and agricultural transition zone.',
        landsat_scene_id: 'LC09_L2SP_044034_20260718_02_T1',
        sentinel_scene_id: 'S2A_MSIL2A_20260719T184921_N0500_R113_T10TFK',
        mean_solar_zenith_deg: 28.5,
        mean_solar_azimuth_deg: 134.2,
        mean_view_zenith_deg: 4.8,
        mean_view_azimuth_deg: 102.5,
        target_solar_zenith_deg: 45.0,
        target_view_zenith_deg: 0.0
      });
  }, [selectedBenchmarkKey, benchmarkKeys]);

  // Sensor Selection & Scene Configuration
  const [selectedSensor, setSelectedSensor] = useState(HlsSensorType?.LANDSAT_OLI || 'landsat_oli');
  const [targetSensor, setTargetSensor] = useState(HlsSensorType?.SENTINEL_MSI || 'sentinel_msi');
  const [sceneId, setSceneId] = useState(activeBenchmark.landsat_scene_id);
  const [mgrsTile, setMgrsTile] = useState(activeBenchmark.mgrs_tile || '10TFK');
  const [collection, setCollection] = useState('landsat-c2-l2');

  // BRDF View and Illumination Angles
  const [solarZenith, setSolarZenith] = useState(activeBenchmark.mean_solar_zenith_deg ?? DEFAULT_HLS_GEOMETRY.solar_zenith_deg);
  const [solarAzimuth, setSolarAzimuth] = useState(activeBenchmark.mean_solar_azimuth_deg ?? DEFAULT_HLS_GEOMETRY.solar_azimuth_deg);
  const [viewZenith, setViewZenith] = useState(activeBenchmark.mean_view_zenith_deg ?? DEFAULT_HLS_GEOMETRY.view_zenith_deg);
  const [viewAzimuth, setViewAzimuth] = useState(activeBenchmark.mean_view_azimuth_deg ?? DEFAULT_HLS_GEOMETRY.view_azimuth_deg);
  const [targetSolarZenith, setTargetSolarZenith] = useState(45.0);
  const [targetViewZenith, setTargetViewZenith] = useState(0.0);
  const [crownRatio, setCrownRatio] = useState(1.0); // b/r
  const [shapeRatio, setShapeRatio] = useState(2.0); // h/b
  const [brdfKernelModel, setBrdfKernelModel] = useState(BrdfKernelModel?.ROSSTHICK_LISPARSE_R || 'rossthick_lisparse_r');

  // Bandpass Adjustment State
  const [selectedBandpassBand, setSelectedBandpassBand] = useState('red');
  const [applyBandpass, setApplyBandpass] = useState(true);
  const [bandpassProbeReflectance, setBandpassProbeReflectance] = useState(0.20);

  // Simulation Probe State across 7 optical bands
  const [probeBands, setProbeBands] = useState({
    coastal: 0.120,
    blue: 0.145,
    green: 0.165,
    red: 0.150,
    nir: 0.380,
    swir1: 0.240,
    swir2: 0.160
  });

  // Dynamic Tile Controls
  const [selectedMetric, setSelectedMetric] = useState(HlsMetric?.HARMONIZED_REFLECTANCE || 'harmonized_reflectance');
  const [selectedStage, setSelectedStage] = useState(HlsHarmonizationStage?.HARMONIZED || 'harmonized');
  const [activeColormap, setActiveColormap] = useState('spectral');
  const [layerOpacity, setLayerOpacity] = useState(0.85);
  const [rescaleMin, setRescaleMin] = useState(0.0);
  const [rescaleMax, setRescaleMax] = useState(0.5);

  // Async Execution State
  const [executing, setExecuting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Relative Azimuth Angle phi = |phi_s - phi_v|
  const relativeAzimuth = useMemo(() => {
    let diff = Math.abs(solarAzimuth - viewAzimuth) % 360;
    if (diff > 180) diff = 360 - diff;
    return Number(diff.toFixed(2));
  }, [solarAzimuth, viewAzimuth]);

  // Synchronize state when active benchmark changes
  const handleSelectBenchmark = useCallback((key) => {
    setSelectedBenchmarkKey(key);
    const b = HLS_BENCHMARK_SCENES[key];
    if (b) {
      setMgrsTile(b.mgrs_tile);
      if (selectedSensor === 'landsat_oli') {
        setSceneId(b.landsat_scene_id);
        setCollection('landsat-c2-l2');
      } else {
        setSceneId(b.sentinel_scene_id);
        setCollection('sentinel-2-l2a');
      }
      setSolarZenith(b.mean_solar_zenith_deg ?? DEFAULT_HLS_GEOMETRY.solar_zenith_deg);
      setSolarAzimuth(b.mean_solar_azimuth_deg ?? DEFAULT_HLS_GEOMETRY.solar_azimuth_deg);
      setViewZenith(b.mean_view_zenith_deg ?? DEFAULT_HLS_GEOMETRY.view_zenith_deg);
      setViewAzimuth(b.mean_view_azimuth_deg ?? DEFAULT_HLS_GEOMETRY.view_azimuth_deg);
      setTargetSolarZenith(b.target_solar_zenith_deg ?? 45.0);
      setTargetViewZenith(b.target_view_zenith_deg ?? 0.0);
    }
  }, [selectedSensor]);

  // Switch sensor platform (Landsat OLI vs Sentinel MSI)
  const handleToggleSensor = (sensorKey) => {
    setSelectedSensor(sensorKey);
    if (sensorKey === 'landsat_oli') {
      setTargetSensor('sentinel_msi');
      setCollection('landsat-c2-l2');
      if (activeBenchmark?.landsat_scene_id) {
        setSceneId(activeBenchmark.landsat_scene_id);
      }
    } else if (sensorKey === 'sentinel_msi') {
      setTargetSensor('landsat_oli');
      setCollection('sentinel-2-l2a');
      if (activeBenchmark?.sentinel_scene_id) {
        setSceneId(activeBenchmark.sentinel_scene_id);
      }
    } else {
      setTargetSensor('sentinel_msi');
      setCollection('landsat-c2-l2');
    }
  };

  // Live Kernels Calculation
  const liveKernels = useMemo(() => {
    if (brdfKernelModel === 'none' || brdfKernelModel === 'lambertian') {
      return {
        kVolObs: 0.0,
        kGeoObs: 0.0,
        kVolTgt: 0.0,
        kGeoTgt: 0.0,
        cBrdfRed: 1.0,
        cBrdfNir: 1.0,
        cBrdfMean: 1.0
      };
    }

    const kVolObs = calculateRossThickVolumetricKernel(solarZenith, viewZenith, relativeAzimuth);
    const kGeoObs = calculateLiSparseGeometricKernel(solarZenith, viewZenith, relativeAzimuth, crownRatio, shapeRatio);
    const kVolTgt = calculateRossThickVolumetricKernel(targetSolarZenith, targetViewZenith, 0.0);
    const kGeoTgt = calculateLiSparseGeometricKernel(targetSolarZenith, targetViewZenith, 0.0, crownRatio, shapeRatio);

    const cBrdfRed = calculateNbarBrdfFactor(solarZenith, viewZenith, relativeAzimuth, targetSolarZenith, targetViewZenith, 'red');
    const cBrdfNir = calculateNbarBrdfFactor(solarZenith, viewZenith, relativeAzimuth, targetSolarZenith, targetViewZenith, 'nir');
    const cBrdfBlue = calculateNbarBrdfFactor(solarZenith, viewZenith, relativeAzimuth, targetSolarZenith, targetViewZenith, 'blue');
    const cBrdfGreen = calculateNbarBrdfFactor(solarZenith, viewZenith, relativeAzimuth, targetSolarZenith, targetViewZenith, 'green');
    const cBrdfSwir1 = calculateNbarBrdfFactor(solarZenith, viewZenith, relativeAzimuth, targetSolarZenith, targetViewZenith, 'swir1');
    const cBrdfSwir2 = calculateNbarBrdfFactor(solarZenith, viewZenith, relativeAzimuth, targetSolarZenith, targetViewZenith, 'swir2');

    const cBrdfMean = (cBrdfRed + cBrdfNir + cBrdfBlue + cBrdfGreen + cBrdfSwir1 + cBrdfSwir2) / 6.0;

    return {
      kVolObs: Number(kVolObs.toFixed(4)),
      kGeoObs: Number(kGeoObs.toFixed(4)),
      kVolTgt: Number(kVolTgt.toFixed(4)),
      kGeoTgt: Number(kGeoTgt.toFixed(4)),
      cBrdfRed: Number(cBrdfRed.toFixed(4)),
      cBrdfNir: Number(cBrdfNir.toFixed(4)),
      cBrdfMean: Number(cBrdfMean.toFixed(4))
    };
  }, [solarZenith, viewZenith, relativeAzimuth, targetSolarZenith, targetViewZenith, crownRatio, shapeRatio, brdfKernelModel]);

  // Active Bandpass Regression Details
  const activeBandpassSpec = useMemo(() => {
    return HLS_BANDPASS_COEFFICIENTS[selectedBandpassBand] || HLS_BANDPASS_COEFFICIENTS.red;
  }, [selectedBandpassBand]);

  // Live Bandpass Probe Reflectance Output
  const liveBandpassAdjusted = useMemo(() => {
    return applyCrossSensorBandpassAdjustment(
      bandpassProbeReflectance,
      selectedBandpassBand,
      selectedSensor,
      targetSensor
    );
  }, [bandpassProbeReflectance, selectedBandpassBand, selectedSensor, targetSensor]);

  // Full Multi-Band Harmonization Simulation Probe Table
  const simulatedTable = useMemo(() => {
    const bands = ['coastal', 'blue', 'green', 'red', 'nir', 'swir1', 'swir2'];
    const rows = bands.map(b => {
      const raw = probeBands[b] ?? 0.15;
      const cFactor = brdfKernelModel !== 'none'
        ? calculateNbarBrdfFactor(solarZenith, viewZenith, relativeAzimuth, targetSolarZenith, targetViewZenith, b)
        : 1.0;
      const rhoNbar = applyNbarNormalization(raw, solarZenith, viewZenith, relativeAzimuth, targetSolarZenith, targetViewZenith, b);
      const rhoHarmonized = applyHlsHarmonization(
        raw,
        b,
        solarZenith,
        viewZenith,
        relativeAzimuth,
        selectedSensor,
        targetSensor,
        targetSolarZenith,
        targetViewZenith,
        applyBandpass
      );
      const delta = rhoHarmonized - raw;
      const pctChange = raw > 0 ? (delta / raw) * 100 : 0.0;
      const coef = HLS_BANDPASS_COEFFICIENTS[b];

      return {
        band: b,
        name: coef?.name || b.toUpperCase(),
        oliBand: coef?.oli_band || '—',
        msiBand: coef?.msi_band || '—',
        raw: Number(raw.toFixed(4)),
        cFactor: Number(cFactor.toFixed(4)),
        rhoNbar: Number(rhoNbar.toFixed(4)),
        rhoHarmonized: Number(rhoHarmonized.toFixed(4)),
        delta: Number(delta.toFixed(4)),
        pctChange: Number(pctChange.toFixed(1))
      };
    });

    // Compute vegetation indices before vs after
    const rawRed = probeBands.red ?? 0.15;
    const rawNir = probeBands.nir ?? 0.38;
    const rawBlue = probeBands.blue ?? 0.145;

    const rowRed = rows.find(r => r.band === 'red');
    const rowNir = rows.find(r => r.band === 'nir');
    const rowBlue = rows.find(r => r.band === 'blue');

    const harmRed = rowRed?.rhoHarmonized ?? rawRed;
    const harmNir = rowNir?.rhoHarmonized ?? rawNir;
    const harmBlue = rowBlue?.rhoHarmonized ?? rawBlue;

    const rawNdvi = (rawNir + rawRed) > 0 ? (rawNir - rawRed) / (rawNir + rawRed) : 0;
    const harmNdvi = (harmNir + harmRed) > 0 ? (harmNir - harmRed) / (harmNir + harmRed) : 0;

    const eviDenomRaw = rawNir + 6.0 * rawRed - 7.5 * rawBlue + 1.0;
    const rawEvi = Math.abs(eviDenomRaw) > 1e-5 ? 2.5 * ((rawNir - rawRed) / eviDenomRaw) : 0;

    const eviDenomHarm = harmNir + 6.0 * harmRed - 7.5 * harmBlue + 1.0;
    const harmEvi = Math.abs(eviDenomHarm) > 1e-5 ? 2.5 * ((harmNir - harmRed) / eviDenomHarm) : 0;

    return {
      rows,
      rawNdvi: Number(rawNdvi.toFixed(4)),
      harmNdvi: Number(harmNdvi.toFixed(4)),
      deltaNdvi: Number((harmNdvi - rawNdvi).toFixed(4)),
      rawEvi: Number(rawEvi.toFixed(4)),
      harmEvi: Number(harmEvi.toFixed(4)),
      deltaEvi: Number((harmEvi - rawEvi).toFixed(4))
    };
  }, [
    probeBands, solarZenith, viewZenith, relativeAzimuth,
    targetSolarZenith, targetViewZenith, selectedSensor,
    targetSensor, applyBandpass, brdfKernelModel
  ]);

  // Construct dynamic Leaflet tile URL template
  const tileUrlTemplate = useMemo(() => {
    return buildHlsTileUrlTemplate({
      collection,
      itemId: sceneId,
      metric: selectedMetric,
      stage: selectedStage,
      sensor: selectedSensor,
      colormap: activeColormap,
      rescale: `${rescaleMin},${rescaleMax}`
    });
  }, [
    collection, sceneId, selectedMetric, selectedStage,
    selectedSensor, activeColormap, rescaleMin, rescaleMax
  ]);

  // Construct NBAR specific tile URL template
  const nbarTileUrlTemplate = useMemo(() => {
    return buildHlsNbarTileUrlTemplate({
      collection,
      itemId: sceneId,
      targetSolarZenith
    });
  }, [collection, sceneId, targetSolarZenith]);

  // Execute full server-side HLS harmonization analysis
  const handleExecuteAnalysis = async () => {
    try {
      setExecuting(true);
      const res = await fetchHlsHarmonizationAnalysis({
        scene_id: sceneId,
        collection,
        sensor: selectedSensor,
        mgrs_tile: mgrsTile,
        geometry: {
          solar_zenith_deg: Number(solarZenith),
          solar_azimuth_deg: Number(solarAzimuth),
          view_zenith_deg: Number(viewZenith),
          view_azimuth_deg: Number(viewAzimuth),
          relative_azimuth_deg: Number(relativeAzimuth),
          target_solar_zenith_deg: Number(targetSolarZenith),
          target_view_zenith_deg: Number(targetViewZenith)
        },
        config: {
          source_sensor: selectedSensor,
          target_sensor: targetSensor,
          brdf_model: brdfKernelModel,
          target_solar_zenith_deg: Number(targetSolarZenith),
          target_view_zenith_deg: Number(targetViewZenith),
          apply_bandpass_adjustment: Boolean(applyBandpass),
          bands: ['coastal', 'blue', 'green', 'red', 'nir', 'swir1', 'swir2']
        }
      });
      setAnalysisResult(res);
    } catch (err) {
      console.error('Failed to run server HLS harmonization analysis:', err);
    } finally {
      setExecuting(false);
    }
  };

  // Sync geometry from server BRDF endpoint
  const handleFetchServerGeometry = async () => {
    try {
      setExecuting(true);
      const res = await fetchHlsBrdfGeometry({
        solar_zenith_deg: Number(solarZenith),
        solar_azimuth_deg: Number(solarAzimuth),
        view_zenith_deg: Number(viewZenith),
        view_azimuth_deg: Number(viewAzimuth),
        relative_azimuth_deg: Number(relativeAzimuth),
        target_solar_zenith_deg: Number(targetSolarZenith),
        target_view_zenith_deg: Number(targetViewZenith)
      });
      if (res?.solar_zenith_deg !== undefined) {
        setSolarZenith(res.solar_zenith_deg);
      }
    } catch (err) {
      console.error('Failed to sync server BRDF geometry:', err);
    } finally {
      setExecuting(false);
    }
  };

  // Sync bandpass regression from server endpoint
  const handleFetchBandpass = async () => {
    try {
      setExecuting(true);
      await fetchHlsBandpassAdjustment({
        source_sensor: selectedSensor,
        target_sensor: targetSensor,
        band: selectedBandpassBand,
        reflectance: bandpassProbeReflectance
      });
    } catch (err) {
      console.error('Failed to sync server bandpass adjustment:', err);
    } finally {
      setExecuting(false);
    }
  };

  // Copy tile URL to clipboard
  const handleCopyTileUrl = () => {
    navigator.clipboard.writeText(tileUrlTemplate);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Apply layer configuration to Leaflet MapExplorer
  const handleApplyToMap = () => {
    if (onApply) {
      onApply({
        sceneId,
        collection,
        sensor: selectedSensor,
        targetSensor,
        mgrsTile,
        stage: selectedStage,
        metric: selectedMetric,
        colormap: activeColormap,
        opacity: layerOpacity,
        rescale: `${rescaleMin},${rescaleMax}`,
        solarZenith,
        solarAzimuth,
        viewZenith,
        viewAzimuth,
        relativeAzimuth,
        targetSolarZenith,
        targetViewZenith,
        brdfKernelModel,
        applyBandpass,
        tileUrlTemplate,
        nbarTileUrlTemplate,
        summary: analysisResult?.summary || {
          mean_brdf_adjustment_factor: liveKernels.cBrdfMean,
          cross_sensor_rmse: activeBandpassSpec.rmse || 0.0054,
          bands_processed: ['coastal', 'blue', 'green', 'red', 'nir', 'swir1', 'swir2'],
          mean_volumetric_kernel: liveKernels.kVolObs,
          mean_geometric_kernel: liveKernels.kGeoObs
        }
      });
    }
    if (onClose) onClose();
  };

  // Launch split curtain comparison
  const handleLaunchCurtain = () => {
    if (onLaunchCurtain) {
      onLaunchCurtain({
        referenceSceneId: sceneId,
        secondarySceneId: selectedSensor === 'landsat_oli'
          ? (activeBenchmark?.sentinel_scene_id || 'S2A_MSIL2A_20260719T184921_N0500_R113_T10TFK')
          : (activeBenchmark?.landsat_scene_id || 'LC09_L2SP_044034_20260718_02_T1'),
        collection,
        metric: selectedMetric,
        tileUrlTemplate
      });
    }
    if (onClose) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-indigo-500/30 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-zinc-900 via-indigo-950/40 to-zinc-900 border-b border-indigo-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Satellite className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Harmonized Landsat Sentinel-2 (HLS) Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Cycle v2.5.33 | T-260
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono">
                Nadir BRDF-Adjusted Reflectance (RossThick-LiSparse-R NBAR) & Claverie et al. (2018) Cross-Sensor Bandpass Transformation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="px-6 bg-zinc-900/60 border-b border-zinc-800 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'scenes', label: 'MGRS Scenes & Sensor', icon: Satellite },
            { id: 'geometry', label: 'BRDF Anisotropy Polar Plot', icon: Compass },
            { id: 'bandpass', label: 'Bandpass Curves & OLI↔MSI', icon: ArrowLeftRight },
            { id: 'simulation', label: 'Multi-Band Harmonization Probe', icon: Activity },
            { id: 'tiles', label: 'Dynamic Tiles & Leaflet', icon: Layers }
          ].map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                  active
                    ? 'border-indigo-400 text-indigo-300 bg-indigo-500/5'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-zinc-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: MGRS BENCHMARK SCENES & SENSOR */}
          {activeTab === 'scenes' && (
            <div className="space-y-6">
              
              {/* Sensor Selection Bar */}
              <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-white uppercase font-mono block">Source Satellite Optical Imager</span>
                  <p className="text-[11px] text-zinc-400 font-mono">Select the source instrument to harmonize onto the Sentinel-2 MSI reference frame.</p>
                </div>
                <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                  <button
                    onClick={() => handleToggleSensor('landsat_oli')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      selectedSensor === 'landsat_oli'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Satellite className="w-3.5 h-3.5" />
                    Landsat-8/9 OLI (HLSL30)
                  </button>
                  <button
                    onClick={() => handleToggleSensor('sentinel_msi')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      selectedSensor === 'sentinel_msi'
                        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Satellite className="w-3.5 h-3.5" />
                    Sentinel-2 MSI (HLS.S30)
                  </button>
                  <button
                    onClick={() => handleToggleSensor('harmonized_hls')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                      selectedSensor === 'harmonized_hls'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Harmonized HLS Multi-Sensor
                  </button>
                </div>
              </div>

              {/* Benchmark Scenes Grid */}
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Satellite className="w-4 h-4 text-indigo-400" />
                  Calibrated MGRS 100km UTM Overlap Tiles
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Select a standardized Military Grid Reference System (MGRS) tile for cross-sensor validation.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {benchmarkKeys.map((key) => {
                  const b = HLS_BENCHMARK_SCENES[key];
                  const isSelected = selectedBenchmarkKey === key;
                  return (
                    <div
                      key={key}
                      onClick={() => handleSelectBenchmark(key)}
                      className={`cursor-pointer rounded-xl p-4 border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                          : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-indigo-300 border border-indigo-500/30 font-bold">
                            MGRS: {b.mgrs_tile}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            θs={b.mean_solar_zenith_deg}° | θv={b.mean_view_zenith_deg}°
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{b.name}</h4>
                        <p className="text-xs text-zinc-400 line-clamp-2 mb-3">{b.description}</p>
                      </div>

                      <div className="pt-3 border-t border-zinc-800/80 space-y-1 text-[11px] font-mono text-zinc-400">
                        <div className="flex justify-between">
                          <span>Landsat OLI:</span>
                          <span className="text-indigo-400 truncate max-w-[140px]">{b.landsat_scene_id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sentinel MSI:</span>
                          <span className="text-teal-400 truncate max-w-[140px]">{b.sentinel_scene_id}</span>
                        </div>
                        <div className="flex justify-between text-zinc-500 pt-1">
                          <span>Target Zenith:</span>
                          <span className="text-white">θs=45.0°, θv=0.0°</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Active Scene Metadata Form */}
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <span className="text-xs font-bold text-zinc-300 font-mono uppercase block">Active Scene & Tile Identification</span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">MGRS 100km Tile ID</label>
                    <input
                      type="text"
                      value={mgrsTile}
                      onChange={(e) => setMgrsTile(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Observation Scene ID</label>
                    <input
                      type="text"
                      value={sceneId}
                      onChange={(e) => setSceneId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">STAC Ingestion Collection</label>
                    <input
                      type="text"
                      value={collection}
                      onChange={(e) => setCollection(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRDF ANISOTROPY POLAR PLOT & VIEW ANGLES */}
          {activeTab === 'geometry' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    RossThick-LiSparse-R BRDF Viewing Geometry & Anisotropy Polar Visualizer
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    NBAR Target: Solar Zenith θs = 45.0°, Nadir View θv = 0.0°, Relative Azimuth ϕ = |ϕs - ϕv|
                  </p>
                </div>
                <button
                  onClick={handleFetchServerGeometry}
                  disabled={executing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-indigo-300 text-xs font-mono border border-indigo-500/30 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
                  Sync BRDF Server
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                {/* SVG Polar Visualizer */}
                <div className="p-5 rounded-2xl bg-zinc-900/80 border border-indigo-500/20 flex flex-col items-center justify-center relative">
                  <span className="text-xs font-bold text-zinc-300 font-mono uppercase mb-2 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-400" />
                    BRDF Viewing & Illumination Polar Plot
                  </span>

                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 240 240">
                      {/* Outer Dial & Zenith Elevation Rings */}
                      <circle cx="120" cy="120" r="105" fill="#09090b" stroke="#27272a" strokeWidth="2" />
                      <circle cx="120" cy="120" r="85" fill="none" stroke="#27272a" strokeDasharray="3 3" />
                      <circle cx="120" cy="120" r="60" fill="none" stroke="#27272a" strokeDasharray="2 2" />
                      <circle cx="120" cy="120" r="35" fill="none" stroke="#27272a" strokeDasharray="2 2" />

                      {/* 45° Target Solar Zenith Ring (Amber Dotted) */}
                      <circle cx="120" cy="120" r="62" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />

                      {/* Cardinal Crosshairs */}
                      <line x1="120" y1="15" x2="120" y2="225" stroke="#3f3f46" strokeWidth="1" />
                      <line x1="15" y1="120" x2="225" y2="120" stroke="#3f3f46" strokeWidth="1" />

                      {/* Cardinal Labels */}
                      <text x="120" y="27" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontWeight="bold">N (0°)</text>
                      <text x="215" y="124" textAnchor="middle" fill="#71717a" fontSize="9">E (90°)</text>
                      <text x="120" y="220" textAnchor="middle" fill="#71717a" fontSize="9">S (180°)</text>
                      <text x="25" y="124" textAnchor="middle" fill="#71717a" fontSize="9">W (270°)</text>

                      {/* Principal Plane (Sun azimuth through origin to anti-sun) */}
                      {(() => {
                        const sunRad = ((solarAzimuth - 90) * Math.PI) / 180;
                        const x1 = 120 + 105 * Math.cos(sunRad);
                        const y1 = 120 + 105 * Math.sin(sunRad);
                        const x2 = 120 - 105 * Math.cos(sunRad);
                        const y2 = 120 - 105 * Math.sin(sunRad);
                        return (
                          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 4" opacity="0.4" />
                        );
                      })()}

                      {/* Satellite Sensor View Vector (Cyan / Indigo Indicator) */}
                      {(() => {
                        const viewRad = ((viewAzimuth - 90) * Math.PI) / 180;
                        const viewLen = (viewZenith / 80.0) * 100;
                        const vx = 120 + viewLen * Math.cos(viewRad);
                        const vy = 120 + viewLen * Math.sin(viewRad);
                        return (
                          <g>
                            <line x1="120" y1="120" x2={vx} y2={vy} stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx={vx} cy={vy} r="5" fill="#06b6d4" stroke="#0891b2" strokeWidth="2" />
                            <text x={vx + 8} y={vy + 4} fill="#06b6d4" fontSize="9" fontWeight="bold">θv={viewZenith}°</text>
                          </g>
                        );
                      })()}

                      {/* Sun Illumination Vector (Amber Beacon) */}
                      {(() => {
                        const sunRad = ((solarAzimuth - 90) * Math.PI) / 180;
                        const sunLen = (solarZenith / 80.0) * 100;
                        const sx = 120 + sunLen * Math.cos(sunRad);
                        const sy = 120 + sunLen * Math.sin(sunRad);
                        return (
                          <g>
                            <line x1="120" y1="120" x2={sx} y2={sy} stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 2" strokeLinecap="round" />
                            <circle cx={sx} cy={sy} r="7" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
                            <text x={sx + 8} y={sy + 4} fill="#fbbf24" fontSize="9" fontWeight="bold">θs={solarZenith}°</text>
                          </g>
                        );
                      })()}

                      {/* Nadir Target Center Bullseye (0°, 0°) */}
                      <circle cx="120" cy="120" r="6" fill="#10b981" stroke="#047857" strokeWidth="2" />
                      <circle cx="120" cy="120" r="2" fill="#ffffff" />
                    </svg>
                  </div>

                  {/* Polar Compass Legend */}
                  <div className="flex items-center gap-4 mt-3 text-[11px] font-mono">
                    <div className="flex items-center gap-1.5 text-amber-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span>Solar Vector ({solarAzimuth}°)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-cyan-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                      <span>Sensor View ({viewAzimuth}°)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>Target Nadir (0°)</span>
                    </div>
                  </div>
                </div>

                {/* Live BRDF Kernel Values & Angle Sliders */}
                <div className="space-y-4">
                  
                  {/* Kernel Value HUD Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">Relative Azimuth ϕ</span>
                      <span className="text-lg font-bold font-mono text-indigo-400">{relativeAzimuth}°</span>
                      <span className="text-[10px] text-zinc-500 font-mono block">|ϕs - ϕv|</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">NBAR Factor c</span>
                      <span className="text-lg font-bold font-mono text-emerald-400">{liveKernels.cBrdfMean}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block">Target / Observed</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">RossThick k_vol</span>
                      <span className="text-sm font-bold font-mono text-cyan-400">{liveKernels.kVolObs}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block">Target: {liveKernels.kVolTgt}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                      <span className="text-[10px] font-mono uppercase text-zinc-500 block">LiSparse-R k_geo</span>
                      <span className="text-sm font-bold font-mono text-rose-400">{liveKernels.kGeoObs}</span>
                      <span className="text-[10px] text-zinc-500 font-mono block">Target: {liveKernels.kGeoTgt}</span>
                    </div>
                  </div>

                  {/* Kernel Model Selection */}
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">BRDF Kernel Formulation</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'rossthick_lisparse_r', label: 'RossThick-LiSparse-R', desc: 'HLS / MODIS standard reciprocal' },
                        { id: 'lambertian', label: 'Lambertian', desc: 'Isotropic c = 1.0' },
                        { id: 'none', label: 'Uncorrected', desc: 'Raw observed BOA' }
                      ].map(m => (
                        <button
                          key={m.id}
                          onClick={() => setBrdfKernelModel(m.id)}
                          className={`p-2 rounded-lg text-left text-xs font-mono border transition-all ${
                            brdfKernelModel === m.id
                              ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 font-bold'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                          }`}
                        >
                          <div>{m.label}</div>
                          <div className="text-[10px] text-zinc-500">{m.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sliders: Solar Zenith, Solar Azimuth, View Zenith, View Azimuth */}
                  <div className="space-y-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
                    <div>
                      <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                        <span>Solar Zenith (θs):</span>
                        <span className="text-amber-400 font-bold">{solarZenith}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        step="0.5"
                        value={solarZenith}
                        onChange={(e) => setSolarZenith(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                        <span>Solar Azimuth (ϕs):</span>
                        <span className="text-amber-400 font-bold">{solarAzimuth}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={solarAzimuth}
                        onChange={(e) => setSolarAzimuth(parseFloat(e.target.value))}
                        className="w-full accent-amber-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                        <span>Sensor View Zenith (θv):</span>
                        <span className="text-cyan-400 font-bold">{viewZenith}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="0.2"
                        value={viewZenith}
                        onChange={(e) => setViewZenith(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                        <span>Sensor View Azimuth (ϕv):</span>
                        <span className="text-cyan-400 font-bold">{viewAzimuth}°</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        step="1"
                        value={viewAzimuth}
                        onChange={(e) => setViewAzimuth(parseFloat(e.target.value))}
                        className="w-full accent-cyan-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
                      <div>
                        <div className="flex justify-between text-[11px] font-mono text-zinc-300 mb-1">
                          <span>Crown Ratio (b/r):</span>
                          <span className="text-indigo-400 font-bold">{crownRatio.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.5"
                          step="0.1"
                          value={crownRatio}
                          onChange={(e) => setCrownRatio(parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between text-[11px] font-mono text-zinc-300 mb-1">
                          <span>Height Ratio (h/b):</span>
                          <span className="text-indigo-400 font-bold">{shapeRatio.toFixed(1)}</span>
                        </div>
                        <input
                          type="range"
                          min="1.0"
                          max="4.0"
                          step="0.2"
                          value={shapeRatio}
                          onChange={(e) => setShapeRatio(parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BANDPASS ADJUSTMENT & OLI <-> MSI CURVES */}
          {activeTab === 'bandpass' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-400" />
                    Cross-Sensor Spectral Bandpass Adjustment Curves (Claverie et al. 2018)
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Linear regression harmonization: ρ_MSI = c0 + c1 · ρ_OLI across 7 standardized optical bands.
                  </p>
                </div>
                <button
                  onClick={handleFetchBandpass}
                  disabled={executing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-indigo-300 text-xs font-mono border border-indigo-500/30 transition-all"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
                  Sync Bandpass Server
                </button>
              </div>

              {/* Band Pills Selection */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'coastal', label: 'Coastal (B01)', color: '#06b6d4' },
                  { id: 'blue', label: 'Blue (B02)', color: '#3b82f6' },
                  { id: 'green', label: 'Green (B03)', color: '#10b981' },
                  { id: 'red', label: 'Red (B04)', color: '#ef4444' },
                  { id: 'nir', label: 'NIR (B8A)', color: '#8b5cf6' },
                  { id: 'swir1', label: 'SWIR-1 (B11)', color: '#f59e0b' },
                  { id: 'swir2', label: 'SWIR-2 (B12)', color: '#ec4899' }
                ].map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBandpassBand(b.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all border ${
                      selectedBandpassBand === b.id
                        ? 'bg-zinc-800 border-indigo-500 text-white shadow-md'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: b.color }} />
                    {b.label}
                  </button>
                ))}
              </div>

              {/* Curve Graph + Live Regression Inspector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                
                {/* SVG Transformation Curve Plot */}
                <div className="p-5 rounded-2xl bg-zinc-900/80 border border-indigo-500/20 flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-zinc-300 font-mono uppercase mb-3 flex items-center justify-between w-full">
                    <span>{activeBandpassSpec.name} Bandpass Transformation</span>
                    <span className="text-indigo-400">R² = {activeBandpassSpec.r_squared}</span>
                  </span>

                  <div className="relative w-64 h-64 flex items-center justify-center">
                    <svg className="w-full h-full" viewBox="0 0 240 240">
                      {/* Grid background */}
                      <rect x="25" y="15" width="200" height="200" fill="#09090b" stroke="#27272a" strokeWidth="1" />
                      
                      {/* Grid lines */}
                      {[0.2, 0.4, 0.6].map(val => {
                        const pos = 215 - (val / 0.6) * 200;
                        return (
                          <g key={val}>
                            <line x1="25" y1={pos} x2="225" y2={pos} stroke="#27272a" strokeDasharray="2 2" />
                            <line x1={225 - pos + 25} y1="15" x2={225 - pos + 25} y2="215" stroke="#27272a" strokeDasharray="2 2" />
                            <text x="18" y={pos + 3} textAnchor="end" fill="#71717a" fontSize="8" fontMono>{val}</text>
                            <text x={225 - pos + 25} y="228" textAnchor="middle" fill="#71717a" fontSize="8" fontMono>{val}</text>
                          </g>
                        );
                      })}

                      {/* 1:1 Identity Reference Line (dashed) */}
                      <line x1="25" y1="215" x2="225" y2="15" stroke="#71717a" strokeWidth="1.5" strokeDasharray="4 4" />

                      {/* Transformation Line y = c0 + c1 * x */}
                      {(() => {
                        const { c0, c1 } = activeBandpassSpec;
                        const xMin = 0.0;
                        const yMinVal = c0 + c1 * xMin;
                        const xMax = 0.6;
                        const yMaxVal = c0 + c1 * xMax;

                        const px1 = 25 + (xMin / 0.6) * 200;
                        const py1 = 215 - (yMinVal / 0.6) * 200;
                        const px2 = 25 + (xMax / 0.6) * 200;
                        const py2 = 215 - (yMaxVal / 0.6) * 200;

                        return (
                          <line x1={px1} y1={py1} x2={px2} y2={py2} stroke="#6366f1" strokeWidth="2.5" />
                        );
                      })()}

                      {/* Probe Point Indicator */}
                      {(() => {
                        const px = 25 + (bandpassProbeReflectance / 0.6) * 200;
                        const py = 215 - (liveBandpassAdjusted / 0.6) * 200;
                        return (
                          <g>
                            <line x1={px} y1="215" x2={px} y2={py} stroke="#6366f1" strokeDasharray="2 2" />
                            <line x1="25" y1={py} x2={px} y2={py} stroke="#6366f1" strokeDasharray="2 2" />
                            <circle cx={px} cy={py} r="5" fill="#a55eea" stroke="#ffffff" strokeWidth="1.5" />
                          </g>
                        );
                      })()}
                    </svg>
                  </div>

                  {/* Chart Axes Labels */}
                  <div className="flex justify-between w-full text-[10px] font-mono text-zinc-500 mt-2">
                    <span>X: Landsat OLI ({activeBandpassSpec.oli_band})</span>
                    <span>Y: Sentinel MSI ({activeBandpassSpec.msi_band})</span>
                  </div>
                </div>

                {/* Probe Slider & Parameters Table */}
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                    <span className="text-xs font-bold text-white uppercase font-mono block">Interactive Reflectance Probe</span>
                    <div>
                      <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                        <span>Input Reflectance (ρ_in):</span>
                        <span className="text-indigo-400 font-bold">{bandpassProbeReflectance.toFixed(4)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="0.6"
                        step="0.005"
                        value={bandpassProbeReflectance}
                        onChange={(e) => setBandpassProbeReflectance(parseFloat(e.target.value))}
                        className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-[10px] uppercase font-mono text-zinc-500 block">MSI-Equivalent ρ</span>
                        <span className="text-sm font-bold font-mono text-emerald-400">{liveBandpassAdjusted.toFixed(5)}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800">
                        <span className="text-[10px] uppercase font-mono text-zinc-500 block">Spectral Delta Δρ</span>
                        <span className={`text-sm font-bold font-mono ${
                          (liveBandpassAdjusted - bandpassProbeReflectance) >= 0 ? 'text-cyan-400' : 'text-amber-400'
                        }`}>
                          {((liveBandpassAdjusted - bandpassProbeReflectance) >= 0 ? '+' : '')}
                          {(liveBandpassAdjusted - bandpassProbeReflectance).toFixed(5)}
                        </span>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-zinc-800/80 text-xs font-mono text-zinc-300">
                      <input
                        type="checkbox"
                        checked={applyBandpass}
                        onChange={(e) => setApplyBandpass(e.target.checked)}
                        className="rounded accent-indigo-600 cursor-pointer"
                      />
                      <span>Apply Cross-Sensor Spectral Bandpass Adjustment</span>
                    </label>
                  </div>

                  {/* Coefficients Summary */}
                  <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-zinc-400">
                      <span>Regression Equation:</span>
                      <span className="text-white font-bold">
                        ρ_MSI = {activeBandpassSpec.c0} + {activeBandpassSpec.c1} · ρ_OLI
                      </span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Root-Mean-Square Error:</span>
                      <span className="text-emerald-400 font-bold">RMSE = {activeBandpassSpec.rmse}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400">
                      <span>Coefficient of Determination:</span>
                      <span className="text-indigo-400 font-bold">R² = {activeBandpassSpec.r_squared}</span>
                    </div>
                    <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800">
                      <span>Inverse Transformation:</span>
                      <span className="text-zinc-300">
                        ρ_OLI = (ρ_MSI - {activeBandpassSpec.c0}) / {activeBandpassSpec.c1}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MULTI-BAND SIMULATION PROBE */}
          {activeTab === 'simulation' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-400" />
                    Multi-Spectral End-to-End Harmonization Simulation Probe
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">
                    Raw Surface Reflectance → RossThick-LiSparse-R NBAR (θs=45°, θv=0°) → Claverie et al. Bandpass Adjustment → Fully Harmonized HLS
                  </p>
                </div>
                <button
                  onClick={handleExecuteAnalysis}
                  disabled={executing}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Activity className={`w-3.5 h-3.5 ${executing ? 'animate-spin' : ''}`} />
                  {executing ? 'Inverting...' : 'Run Server Harmonization'}
                </button>
              </div>

              {/* Simulation Table */}
              <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/60">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="p-3">Spectral Band</th>
                      <th className="p-3">OLI / MSI</th>
                      <th className="p-3">Raw Reflectance (ρ_raw)</th>
                      <th className="p-3">BRDF Factor (c)</th>
                      <th className="p-3">NBAR (ρ_NBAR)</th>
                      <th className="p-3">Harmonized (ρ_HLS)</th>
                      <th className="p-3">Delta (Δρ)</th>
                      <th className="p-3">Change %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {simulatedTable.rows.map(row => (
                      <tr key={row.band} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="p-3 font-bold text-white">{row.name}</td>
                        <td className="p-3 text-zinc-400">{row.oliBand} / {row.msiBand}</td>
                        <td className="p-3">
                          <input
                            type="number"
                            min="0"
                            max="1"
                            step="0.01"
                            value={probeBands[row.band] ?? 0.15}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setProbeBands(prev => ({ ...prev, [row.band]: val }));
                            }}
                            className="w-20 bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-indigo-400 focus:outline-none"
                          />
                        </td>
                        <td className="p-3 text-amber-400 font-bold">{row.cFactor}</td>
                        <td className="p-3 text-cyan-400 font-bold">{row.rhoNbar}</td>
                        <td className="p-3 text-emerald-400 font-extrabold">{row.rhoHarmonized}</td>
                        <td className={`p-3 font-bold ${row.delta >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                          {row.delta >= 0 ? '+' : ''}{row.delta}
                        </td>
                        <td className="p-3 text-zinc-300 font-bold">{row.pctChange}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Derived Spectral Indices Cards (NDVI & EVI) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-300 font-mono uppercase block">NDVI (Vegetation Index)</span>
                    <span className="text-[10px] text-zinc-500 font-mono block">(NIR - Red) / (NIR + Red)</span>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs text-zinc-400">Raw: {simulatedTable.rawNdvi} → <span className="text-emerald-400 font-bold">Harmonized: {simulatedTable.harmNdvi}</span></div>
                    <div className={`text-[11px] font-bold ${simulatedTable.deltaNdvi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      ΔNDVI: {simulatedTable.deltaNdvi >= 0 ? '+' : ''}{simulatedTable.deltaNdvi}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-300 font-mono uppercase block">EVI (Enhanced Vegetation)</span>
                    <span className="text-[10px] text-zinc-500 font-mono block">2.5 · (NIR - Red) / (NIR + 6Red - 7.5Blue + 1)</span>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-xs text-zinc-400">Raw: {simulatedTable.rawEvi} → <span className="text-indigo-400 font-bold">Harmonized: {simulatedTable.harmEvi}</span></div>
                    <div className={`text-[11px] font-bold ${simulatedTable.deltaEvi >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                      ΔEVI: {simulatedTable.deltaEvi >= 0 ? '+' : ''}{simulatedTable.deltaEvi}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: DYNAMIC TILES & LEAFLET INTEGRATION */}
          {activeTab === 'tiles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  Dynamic Leaflet XYZ Tile Streaming & Layer Properties
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  Configure raster tile layer endpoints, color ramps, value stretching, and cross-sensor swipe curtain.
                </p>
              </div>

              {/* Metric & Stage Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1.5">Tile Metric</label>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-mono focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="harmonized_reflectance">Harmonized Surface Reflectance (MSI-Equivalent NBAR)</option>
                    <option value="nbar_reflectance">Nadir BRDF-Adjusted Reflectance (NBAR)</option>
                    <option value="brdf_adjustment_factor">BRDF Adjustment Scaling Ratio (c)</option>
                    <option value="volumetric_kernel">RossThick Volumetric Kernel (k_vol)</option>
                    <option value="geometric_kernel">LiSparse-R Geometric Kernel (k_geo)</option>
                    <option value="bandpass_difference">Spectral Bandpass Difference (Δρ)</option>
                    <option value="ndvi">Harmonized NDVI</option>
                    <option value="evi">Harmonized EVI</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1.5">Harmonization Processing Stage</label>
                  <select
                    value={selectedStage}
                    onChange={(e) => setSelectedStage(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2.5 text-xs text-white font-mono focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="harmonized">Stage 4: Fully Harmonized (NBAR + Bandpass Adjusted)</option>
                    <option value="spectral_adjusted">Stage 3: Spectral Bandpass Adjusted Only</option>
                    <option value="nbar">Stage 2: Nadir BRDF-Adjusted Only (NBAR)</option>
                    <option value="raw">Stage 1: Raw Observed Surface Reflectance (BOA)</option>
                  </select>
                </div>
              </div>

              {/* Colormap Options Grid */}
              <div>
                <label className="text-xs font-mono text-zinc-400 block mb-2">Colormap Stretch Palette</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {HLS_COLORMAP_OPTIONS.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setActiveColormap(c.id)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        activeColormap === c.id
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs font-bold font-mono mb-1">{c.label}</div>
                      <div className="text-[10px] text-zinc-500 leading-tight">{c.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Opacity & Rescale Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div>
                  <div className="flex justify-between text-xs font-mono text-zinc-300 mb-1">
                    <span>Tile Layer Opacity:</span>
                    <span className="text-indigo-400 font-bold">{Math.round(layerOpacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={layerOpacity}
                    onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Rescale Min</label>
                    <input
                      type="number"
                      step="0.05"
                      value={rescaleMin}
                      onChange={(e) => setRescaleMin(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-zinc-400 block mb-1">Rescale Max</label>
                    <input
                      type="number"
                      step="0.05"
                      value={rescaleMax}
                      onChange={(e) => setRescaleMax(parseFloat(e.target.value) || 0.5)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-xs text-white font-mono focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Generated Leaflet Tile URL Template Box */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-300 font-mono uppercase flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-indigo-400" />
                    Dynamic Leaflet TileLayer URL Template
                  </span>
                  <button
                    onClick={handleCopyTileUrl}
                    className="flex items-center gap-1 text-xs font-mono text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedUrl ? 'Copied' : 'Copy Template'}
                  </button>
                </div>
                <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800/80 font-mono text-[11px] text-zinc-300 break-all select-all">
                  {tileUrlTemplate}
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  NBAR Endpoint: {nbarTileUrlTemplate}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>MGRS: {mgrsTile}</span>
            <span>•</span>
            <span className="text-indigo-300">NBAR Factor: {liveKernels.cBrdfMean}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLaunchCurtain}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono font-semibold transition-all border border-zinc-700"
            >
              <Split className="w-3.5 h-3.5 text-amber-400" />
              Launch Cross-Sensor Curtain
            </button>
            <button
              onClick={handleApplyToMap}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-bold shadow-lg shadow-indigo-600/30 transition-all"
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
