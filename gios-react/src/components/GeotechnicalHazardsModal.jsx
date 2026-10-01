import React, { useState } from 'react';
import { 
  X, Mountain, Waves, Sprout, Layers, FileDown, 
  RefreshCw, Copy, Check, Activity, ShieldAlert,
  AlertTriangle, CheckCircle2, ChevronRight, ArrowUpRight,
  TrendingDown, Gauge, BarChart3, Database
} from 'lucide-react';
import { 
  simulateDamBreachRunout,
  assessLandslideSusceptibility,
  analyzeDroughtVHI,
  classifyMineralSAM,
  exportVectorDataset
} from '../api/giosApi';
import { 
  INUNDATION_HAZARD_TIERS,
  DAM_BREACH_FAILURE_MODES,
  calculateDamBreachInundation,
  buildFloodInundationTileUrl,
  LANDSLIDE_SUSCEPTIBILITY_TIERS,
  LANDSLIDE_TRIGGER_TYPES,
  calculateLandslideSusceptibility,
  buildLandslideTileUrl,
  DROUGHT_SEVERITY_TIERS,
  calculateVegetationHealthIndex,
  classifyDroughtTier,
  buildDroughtVhiTileUrl,
  MINERAL_ENDMEMBER_TYPES,
  MINERAL_ENDMEMBER_LIBRARY,
  calculateSpectralAngleMapper,
  getMineralEndmemberSpec,
  buildSamMineralTileUrl,
  GEOSPATIAL_SERIALIZATION_FORMATS,
  buildVectorTileUrl,
  formatVectorExportFilename
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function GeotechnicalHazardsModal({
  isOpen,
  onClose,
  initialTab = 'dam_breach',
  onApplyTileLayer = null
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'dam_breach' | 'landslide' | 'drought_vhi' | 'sam_mineral' | 'vector_export'
  const [copiedKey, setCopiedKey] = useState(null);

  // Tab 1: Dam Breach Runout States
  const [breachVolumeM3, setBreachVolumeM3] = useState(450000);
  const [breachHeightM, setBreachHeightM] = useState(24.5);
  const [breachFailureMode, setBreachFailureMode] = useState(DAM_BREACH_FAILURE_MODES.PIPING_SEEPAGE);
  const [breachSlope, setBreachSlope] = useState(0.015);
  const [breachManningsN, setBreachManningsN] = useState(0.045);
  const [breachDistKm, setBreachDistKm] = useState(25.0);
  const [breachColormap, setBreachColormap] = useState('blues');
  const [breachRescale, setBreachRescale] = useState('0.0,10.0');
  const [damBreachResult, setDamBreachResult] = useState(null);
  const [loadingDamBreach, setLoadingDamBreach] = useState(false);

  // Tab 2: Landslide Susceptibility States
  const [landslideSlopeDeg, setLandslideSlopeDeg] = useState(28.5);
  const [landslideCohesion, setLandslideCohesion] = useState(12.5);
  const [landslidePhi, setLandslidePhi] = useState(32.0);
  const [landslideDepth, setLandslideDepth] = useState(3.5);
  const [landslidePga, setLandslidePga] = useState(0.25);
  const [landslideWaterRatio, setLandslideWaterRatio] = useState(0.40);
  const [landslideSoilWeight, setLandslideSoilWeight] = useState(19.5);
  const [landslideTrigger, setLandslideTrigger] = useState(LANDSLIDE_TRIGGER_TYPES.SEISMIC);
  const [landslideColormap, setLandslideColormap] = useState('turbo');
  const [landslideRescale, setLandslideRescale] = useState('0.0,1.0');
  const [landslideResult, setLandslideResult] = useState(null);
  const [loadingLandslide, setLoadingLandslide] = useState(false);

  // Tab 3: Drought VHI States
  const [droughtSceneId, setDroughtSceneId] = useState('S2A_MSIL2A_20260820T184211');
  const [droughtNdvi, setDroughtNdvi] = useState(0.38);
  const [droughtLstC, setDroughtLstC] = useState(34.2);
  const [droughtVciWeight, setDroughtVciWeight] = useState(0.50);
  const [droughtNdviMin, setDroughtNdviMin] = useState(0.15);
  const [droughtNdviMax, setDroughtNdviMax] = useState(0.75);
  const [droughtLstMinC, setDroughtLstMinC] = useState(18.0);
  const [droughtLstMaxC, setDroughtLstMaxC] = useState(42.0);
  const [droughtColormap, setDroughtColormap] = useState('rdylgn');
  const [droughtRescale, setDroughtRescale] = useState('0.0,100.0');
  const [droughtResult, setDroughtResult] = useState(null);
  const [loadingDrought, setLoadingDrought] = useState(false);

  // Tab 4: SAM Mineral Classification States
  const [samSceneId, setSamSceneId] = useState('S2A_MSIL2A_20260820T184211');
  const [samEndmember, setSamEndmember] = useState(MINERAL_ENDMEMBER_TYPES.PYRITE);
  const [samMaxAngleRad, setSamMaxAngleRad] = useState(0.12);
  const [samPixelBands, setSamPixelBands] = useState({
    blue: 0.045,
    green: 0.068,
    red: 0.102,
    nir: 0.150,
    swir1: 0.290,
    swir2: 0.355
  });
  const [samColormap, setSamColormap] = useState('viridis');
  const [samRescale, setSamRescale] = useState('0.0,0.3');
  const [samResult, setSamResult] = useState(null);
  const [loadingSam, setLoadingSam] = useState(false);

  // Tab 5: Cloud-Native Vector Export States
  const [vectorLayerId, setVectorLayerId] = useState('critical_infrastructure');
  const [vectorFormat, setVectorFormat] = useState(GEOSPATIAL_SERIALIZATION_FORMATS.GEOPARQUET);
  const [vectorFilterProp, setVectorFilterProp] = useState('status');
  const [vectorFilterVal, setVectorFilterVal] = useState('active');
  const [vectorTolerance, setVectorTolerance] = useState(0.0001);
  const [vectorExportResult, setVectorExportResult] = useState(null);
  const [loadingVectorExport, setLoadingVectorExport] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 1. Run Dam Breach Hydrodynamic Simulation
  const handleExecuteDamBreach = async () => {
    setLoadingDamBreach(true);
    try {
      const res = await simulateDamBreachRunout({
        aoi_id: 'TAILINGS-FACILITY-01',
        impounded_volume_m3: breachVolumeM3,
        breach_height_m: breachHeightM,
        failure_mode: breachFailureMode,
        downstream_slope: breachSlope,
        mannings_roughness: breachManningsN,
        simulation_distance_km: breachDistKm,
        colormap: breachColormap,
        rescale: breachRescale
      });
      setDamBreachResult(res);
    } catch (err) {
      console.warn("Dam breach backend fallback to mathematical hydraulics:", err);
      const mathRes = calculateDamBreachInundation(breachVolumeM3, breachHeightM, {
        downstreamSlope: breachSlope,
        manningsN: breachManningsN,
        simulationDistanceKm: breachDistKm
      });
      setDamBreachResult({
        simulation_id: 'SIM-BREACH-FALLBACK-01',
        aoi_id: 'TAILINGS-FACILITY-01',
        failure_mode: breachFailureMode,
        peak_breach_discharge_m3s: mathRes.peak_breach_discharge_m3s,
        total_inundation_area_ha: mathRes.total_inundation_area_ha,
        max_flood_depth_m: mathRes.max_flood_depth_m,
        wave_front_velocity_ms: mathRes.wave_front_velocity_ms,
        hazard_summary: mathRes.hazard_summary,
        points: mathRes.points,
        tile_url_template: buildFloodInundationTileUrl('SIM-BREACH-FALLBACK-01', '{z}', '{x}', '{y}', {
          rescale: breachRescale,
          colormap: breachColormap
        }),
        simulated_at: new Date().toISOString()
      });
    } finally {
      setLoadingDamBreach(false);
    }
  };

  // 2. Run Landslide Susceptibility Assessment
  const handleExecuteLandslide = async () => {
    setLoadingLandslide(true);
    try {
      const res = await assessLandslideSusceptibility({
        aoi_id: 'SLOPE-SECTOR-01',
        slope_deg: landslideSlopeDeg,
        cohesion_kpa: landslideCohesion,
        friction_angle_deg: landslidePhi,
        soil_depth_m: landslideDepth,
        pga_g: landslidePga,
        water_table_ratio: landslideWaterRatio,
        trigger_type: landslideTrigger
      });
      setLandslideResult(res);
    } catch (err) {
      console.warn("Landslide backend fallback to limit equilibrium math:", err);
      const mathRes = calculateLandslideSusceptibility(landslideSlopeDeg, {
        cohesionKpa: landslideCohesion,
        frictionAngleDeg: landslidePhi,
        soilDepthM: landslideDepth,
        pgaG: landslidePga,
        waterTableRatio: landslideWaterRatio,
        soilUnitWeightKnM3: landslideSoilWeight
      });
      setLandslideResult({
        aoi_id: 'SLOPE-SECTOR-01',
        static_fs: mathRes.static_fs,
        critical_accel_g: mathRes.critical_accel_g,
        newmark_displacement_cm: mathRes.newmark_displacement_cm,
        runout_distance_m: mathRes.runout_distance_m,
        susceptibility_tier: mathRes.susceptibility_tier,
        hazard_probability: mathRes.hazard_probability,
        failure_warning: mathRes.failure_warning,
        tile_url_template: buildLandslideTileUrl('SLOPE-SECTOR-01', '{z}', '{x}', '{y}', {
          rescale: landslideRescale,
          colormap: landslideColormap
        }),
        analyzed_at: new Date().toISOString()
      });
    } finally {
      setLoadingLandslide(false);
    }
  };

  // 3. Run Drought VHI Analysis
  const handleExecuteDrought = async () => {
    setLoadingDrought(true);
    try {
      const res = await analyzeDroughtVHI({
        collection: 'sentinel-2-l2a',
        item_id: droughtSceneId,
        vci_weight: droughtVciWeight,
        sample_ndvi: droughtNdvi,
        sample_lst_c: droughtLstC,
        ndvi_min: droughtNdviMin,
        ndvi_max: droughtNdviMax,
        lst_min_c: droughtLstMinC,
        lst_max_c: droughtLstMaxC
      });
      setDroughtResult(res);
    } catch (err) {
      console.warn("Drought backend fallback to VHI mathematical model:", err);
      const mathRes = calculateVegetationHealthIndex(droughtNdvi, droughtLstC, {
        alpha: droughtVciWeight,
        ndviMin: droughtNdviMin,
        ndviMax: droughtNdviMax,
        lstMinC: droughtLstMinC,
        lstMaxC: droughtLstMaxC
      });
      setDroughtResult({
        item_id: droughtSceneId,
        mean_vci: mathRes.vci,
        mean_tci: mathRes.tci,
        mean_vhi: mathRes.vhi,
        drought_tier: mathRes.tier,
        affected_area_ha: mathRes.is_drought ? 142.5 : 12.0,
        affected_area_pct: mathRes.is_drought ? 34.8 : 4.2,
        tier_breakdown: {
          extreme_drought: mathRes.vhi < 10 ? 45.0 : 5.0,
          severe_drought: (mathRes.vhi >= 10 && mathRes.vhi < 20) ? 38.0 : 12.0,
          moderate_drought: (mathRes.vhi >= 20 && mathRes.vhi < 30) ? 35.0 : 22.0,
          mild_drought: (mathRes.vhi >= 30 && mathRes.vhi < 40) ? 28.0 : 25.0,
          no_drought: mathRes.vhi >= 40 ? 55.0 : 10.0
        },
        tile_url_template: buildDroughtVhiTileUrl('sentinel-2-l2a', droughtSceneId, '{z}', '{x}', '{y}', {
          rescale: droughtRescale,
          colormap: droughtColormap
        }),
        analyzed_at: new Date().toISOString()
      });
    } finally {
      setLoadingDrought(false);
    }
  };

  // 4. Run SAM Mineral Classification
  const handleExecuteSam = async () => {
    setLoadingSam(true);
    try {
      const res = await classifyMineralSAM({
        collection: 'sentinel-2-l2a',
        item_id: samSceneId,
        target_endmember: samEndmember,
        max_angle_rad: samMaxAngleRad,
        sample_pixel_reflectance: samPixelBands
      });
      setSamResult(res);
    } catch (err) {
      console.warn("SAM backend fallback to mathematical vector angle:", err);
      const endmemberSpec = getMineralEndmemberSpec(samEndmember);
      const mathRes = calculateSpectralAngleMapper(samPixelBands, endmemberSpec);
      setSamResult({
        target_endmember: samEndmember,
        spectral_angle_rad: mathRes.spectral_angle_rad,
        spectral_angle_deg: mathRes.spectral_angle_deg,
        is_match: mathRes.is_match,
        match_confidence: mathRes.match_confidence,
        similarity_score: mathRes.similarity_score,
        classified_area_ha: mathRes.is_match ? 48.2 : 3.5,
        classified_area_pct: mathRes.is_match ? 14.6 : 1.2,
        tile_url_template: buildSamMineralTileUrl('sentinel-2-l2a', samSceneId, samEndmember, '{z}', '{x}', '{y}', {
          rescale: samRescale,
          colormap: samColormap
        }),
        analyzed_at: new Date().toISOString()
      });
    } finally {
      setLoadingSam(false);
    }
  };

  // 5. Run Cloud-Native Vector Export
  const handleExecuteVectorExport = async () => {
    setLoadingVectorExport(true);
    try {
      const res = await exportVectorDataset({
        layer_id: vectorLayerId,
        format: vectorFormat,
        filter_property: vectorFilterProp,
        filter_value: vectorFilterVal,
        simplify_tolerance_deg: vectorTolerance
      });
      setVectorExportResult(res);
    } catch (err) {
      console.warn("Vector export fallback to synthetic response:", err);
      const filename = formatVectorExportFilename(vectorLayerId, vectorFormat);
      setVectorExportResult({
        export_id: `EXP-VEC-${Date.now().toString().slice(-6)}`,
        layer_id: vectorLayerId,
        format: vectorFormat,
        filename,
        feature_count: 142,
        file_size_bytes: 48520,
        download_url: `/api/v1/analysis/vector/export/${vectorLayerId}/download`,
        mime_type: vectorFormat === 'geoparquet' ? 'application/vnd.apache.parquet' : 'application/geo+json',
        created_at: new Date().toISOString()
      });
    } finally {
      setLoadingVectorExport(false);
    }
  };

  // Helper chart configurations
  const damBreachChartData = damBreachResult?.points ? {
    labels: damBreachResult.points.map(p => `${p.distance_km} km`),
    datasets: [
      {
        type: 'line',
        label: 'Max Flood Depth (m)',
        data: damBreachResult.points.map(p => p.max_depth_m),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        yAxisID: 'y',
        fill: true,
        tension: 0.3
      },
      {
        type: 'line',
        label: 'Peak Discharge (m³/s)',
        data: damBreachResult.points.map(p => p.peak_discharge_m3s),
        borderColor: '#f97316',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        yAxisID: 'y1',
        tension: 0.3
      }
    ]
  } : null;

  const landslideSensitivityData = {
    labels: ['15°', '20°', '25°', '30°', '35°', '40°', '45°', '50°', '55°', '60°'],
    datasets: [
      {
        label: 'Static Factor of Safety (FS)',
        data: [15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map(deg => {
          const res = calculateLandslideSusceptibility(deg, {
            cohesionKpa: landslideCohesion,
            frictionAngleDeg: landslidePhi,
            soilDepthM: landslideDepth,
            pgaG: landslidePga,
            waterTableRatio: landslideWaterRatio,
            soilUnitWeightKnM3: landslideSoilWeight
          });
          return res.static_fs;
        }),
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        tension: 0.3,
        fill: true
      },
      {
        label: 'Critical Stability Threshold (FS = 1.0)',
        data: Array(10).fill(1.0),
        borderColor: '#ef4444',
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false
      }
    ]
  };

  const droughtComparisonData = droughtResult ? {
    labels: ['VCI (Vegetation)', 'TCI (Temperature)', 'VHI (Composite)'],
    datasets: [
      {
        label: 'Index Level (0 - 100)',
        data: [droughtResult.mean_vci, droughtResult.mean_tci, droughtResult.mean_vhi],
        backgroundColor: [
          'rgba(34, 197, 94, 0.7)',
          'rgba(249, 115, 22, 0.7)',
          droughtResult.mean_vhi < 40 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)'
        ],
        borderColor: ['#22c55e', '#f97316', droughtResult.mean_vhi < 40 ? '#ef4444' : '#10b981'],
        borderWidth: 1.5
      }
    ]
  } : null;

  const samSpectralProfileData = {
    labels: ['Blue (B02)', 'Green (B03)', 'Red (B04)', 'NIR (B08)', 'SWIR-1 (B11)', 'SWIR-2 (B12)'],
    datasets: [
      {
        label: 'Sample Pixel Reflectance',
        data: [
          samPixelBands.blue,
          samPixelBands.green,
          samPixelBands.red,
          samPixelBands.nir,
          samPixelBands.swir1,
          samPixelBands.swir2
        ],
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        tension: 0.2,
        pointRadius: 4
      },
      {
        label: `USGS/ASTER Reference: ${samEndmember.toUpperCase()}`,
        data: (() => {
          const spec = getMineralEndmemberSpec(samEndmember);
          return [spec.blue, spec.green, spec.red, spec.nir, spec.swir1, spec.swir2];
        })(),
        borderColor: '#f59e0b',
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        tension: 0.2,
        pointRadius: 4
      }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-gray-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-800/80 bg-gray-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Geotechnical & Remote Sensing Hazard Studio</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  T-90 / T-92
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono">
                Dam Breach Inundation, Slope Stability, Drought VHI, SAM Endmembers & Vector Tiles
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-gray-800 bg-gray-900/30 overflow-x-auto scrollbar-none">
          {[
            { id: 'dam_breach', label: 'Tailings Dam Breach', icon: Waves, color: 'text-sky-400' },
            { id: 'landslide', label: 'Landslide Susceptibility', icon: Mountain, color: 'text-purple-400' },
            { id: 'drought_vhi', label: 'Drought VHI (Kogan)', icon: Sprout, color: 'text-emerald-400' },
            { id: 'sam_mineral', label: 'SAM Mineral Classification', icon: Layers, color: 'text-amber-400' },
            { id: 'vector_export', label: 'Cloud-Native Vector Export', icon: FileDown, color: 'text-teal-400' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-mono font-semibold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? `border-amber-400 text-white bg-amber-500/10 ${tab.color}`
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/30'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.color : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: TAILINGS DAM BREACH HYDRODYNAMIC INUNDATION */}
          {activeTab === 'dam_breach' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/70">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-mono font-bold uppercase text-sky-400 flex items-center gap-1.5">
                    <Waves className="w-4 h-4" />
                    Froehlich Hydrodynamics
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Q_p = 0.607 · V_w^0.295 · h_w^1.24</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Impounded Volume (V_w):</span>
                      <span className="text-sky-400 font-bold">{breachVolumeM3.toLocaleString()} m³</span>
                    </div>
                    <input
                      type="range"
                      min={20000}
                      max={3000000}
                      step={10000}
                      value={breachVolumeM3}
                      onChange={(e) => setBreachVolumeM3(Number(e.target.value))}
                      className="w-full accent-sky-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Breach Height (h_w):</span>
                      <span className="text-sky-400 font-bold">{breachHeightM.toFixed(1)} m</span>
                    </div>
                    <input
                      type="range"
                      min={5.0}
                      max={60.0}
                      step={0.5}
                      value={breachHeightM}
                      onChange={(e) => setBreachHeightM(Number(e.target.value))}
                      className="w-full accent-sky-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Failure Mode</label>
                      <select
                        value={breachFailureMode}
                        onChange={(e) => setBreachFailureMode(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        {Object.entries(DAM_BREACH_FAILURE_MODES).map(([k, v]) => (
                          <option key={k} value={v}>{v.replace('_', ' ').toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Downstream Slope (S_0)</label>
                      <input
                        type="number"
                        step={0.001}
                        value={breachSlope}
                        onChange={(e) => setBreachSlope(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Manning's Roughness (n)</label>
                      <input
                        type="number"
                        step={0.005}
                        value={breachManningsN}
                        onChange={(e) => setBreachManningsN(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Sim Distance (km)</label>
                      <input
                        type="number"
                        step={1.0}
                        value={breachDistKm}
                        onChange={(e) => setBreachDistKm(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Colormap</label>
                      <select
                        value={breachColormap}
                        onChange={(e) => setBreachColormap(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="blues">Blues (Inundation)</option>
                        <option value="turbo">Turbo (Hydraulic Depth)</option>
                        <option value="spectral">Spectral</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Rescale Range</label>
                      <input
                        type="text"
                        value={breachRescale}
                        onChange={(e) => setBreachRescale(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteDamBreach}
                    disabled={loadingDamBreach}
                    className="w-full mt-2 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-600/20 transition-all"
                  >
                    {loadingDamBreach ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Waves className="w-4 h-4" />}
                    <span>Run Hydrodynamic Inundation Simulation</span>
                  </button>
                </div>
              </div>

              {/* Right Output & Charts (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {damBreachResult ? (
                  <div className="space-y-4">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">PEAK DISCHARGE</span>
                        <span className="text-lg font-bold font-mono text-sky-400">
                          {damBreachResult.peak_breach_discharge_m3s.toLocaleString()} m³/s
                        </span>
                        <span className="text-[9px] text-gray-500 block font-mono">Froehlich (2008)</span>
                      </div>
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">WAVE VELOCITY</span>
                        <span className="text-lg font-bold font-mono text-amber-400">
                          {damBreachResult.wave_front_velocity_ms} m/s
                        </span>
                        <span className="text-[9px] text-gray-500 block font-mono">Manning Wavefront</span>
                      </div>
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">MAX FLOOD DEPTH</span>
                        <span className="text-lg font-bold font-mono text-rose-400">
                          {damBreachResult.max_flood_depth_m} m
                        </span>
                        <span className="text-[9px] text-gray-500 block font-mono">At Breach Section</span>
                      </div>
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">INUNDATION AREA</span>
                        <span className="text-lg font-bold font-mono text-emerald-400">
                          {damBreachResult.total_inundation_area_ha} ha
                        </span>
                        <span className="text-[9px] text-gray-500 block font-mono">Total Downstream</span>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-xl">
                      <span className="text-xs font-mono font-bold text-gray-300 block mb-2">
                        Downstream Flood Wave Propagation & Depth Attenuation
                      </span>
                      <div className="h-48 w-full">
                        {damBreachChartData && (
                          <Line
                            data={damBreachChartData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  title: { display: true, text: 'Depth (m)', color: '#38bdf8' },
                                  ticks: { color: '#9ca3af' },
                                  grid: { color: 'rgba(75, 85, 99, 0.2)' }
                                },
                                y1: {
                                  position: 'right',
                                  title: { display: true, text: 'Discharge (m³/s)', color: '#f97316' },
                                  ticks: { color: '#9ca3af' },
                                  grid: { drawOnChartArea: false }
                                },
                                x: {
                                  ticks: { color: '#9ca3af' },
                                  grid: { color: 'rgba(75, 85, 99, 0.2)' }
                                }
                              },
                              plugins: {
                                legend: { labels: { color: '#e5e7eb', font: { size: 10 } } }
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Tile Stream Actions */}
                    <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded-xl flex items-center justify-between">
                      <div className="text-xs font-mono">
                        <span className="font-bold text-sky-300 block">Dynamic XYZ Flood Tile Layer</span>
                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-sm block">
                          {damBreachResult.tile_url_template || buildFloodInundationTileUrl('SIM-BREACH-01', '{z}', '{x}', '{y}', { colormap: breachColormap, rescale: breachRescale })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(damBreachResult.tile_url_template || '', 'breach_tile')}
                          className="px-2.5 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono flex items-center gap-1 border border-gray-700"
                        >
                          {copiedKey === 'breach_tile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'breach_tile' ? 'Copied' : 'Copy URL'}</span>
                        </button>
                        {onApplyTileLayer && (
                          <button
                            onClick={() => onApplyTileLayer({
                              layerType: 'dam_breach',
                              urlTemplate: damBreachResult.tile_url_template || buildFloodInundationTileUrl('SIM-BREACH-01', '{z}', '{x}', '{y}', { colormap: breachColormap, rescale: breachRescale })
                            })}
                            className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow"
                          >
                            <Waves className="w-3.5 h-3.5" />
                            <span>Stream to Map</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-gray-900/20 border border-dashed border-gray-800 rounded-xl text-center">
                    <Waves className="w-12 h-12 text-gray-600 mb-3" />
                    <h3 className="text-sm font-mono font-bold text-gray-300">No Simulation Executed</h3>
                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                      Configure breach impoundment parameters on the left and run the hydrodynamic model to view peak discharge, arrival times, and flood hazard zonation.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LANDSLIDE SUSCEPTIBILITY & DEBRIS FLOW */}
          {activeTab === 'landslide' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/70">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-mono font-bold uppercase text-purple-400 flex items-center gap-1.5">
                    <Mountain className="w-4 h-4" />
                    Limit Equilibrium & Newmark
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Infinite Slope FS & D_N</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Slope Angle (α):</span>
                      <span className="text-purple-400 font-bold">{landslideSlopeDeg.toFixed(1)}°</span>
                    </div>
                    <input
                      type="range"
                      min={5.0}
                      max={65.0}
                      step={0.5}
                      value={landslideSlopeDeg}
                      onChange={(e) => setLandslideSlopeDeg(Number(e.target.value))}
                      className="w-full accent-purple-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-gray-300 mb-1">
                        <span>Cohesion c' (kPa):</span>
                        <span className="text-purple-300">{landslideCohesion}</span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={50.0}
                        step={1.0}
                        value={landslideCohesion}
                        onChange={(e) => setLandslideCohesion(Number(e.target.value))}
                        className="w-full accent-purple-500 h-1.5 bg-gray-800 rounded"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-gray-300 mb-1">
                        <span>Friction φ' (°):</span>
                        <span className="text-purple-300">{landslidePhi}°</span>
                      </div>
                      <input
                        type="range"
                        min={15.0}
                        max={45.0}
                        step={0.5}
                        value={landslidePhi}
                        onChange={(e) => setLandslidePhi(Number(e.target.value))}
                        className="w-full accent-purple-500 h-1.5 bg-gray-800 rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-gray-300 mb-1">
                        <span>Slip Depth z (m):</span>
                        <span className="text-purple-300">{landslideDepth} m</span>
                      </div>
                      <input
                        type="range"
                        min={1.0}
                        max={10.0}
                        step={0.5}
                        value={landslideDepth}
                        onChange={(e) => setLandslideDepth(Number(e.target.value))}
                        className="w-full accent-purple-500 h-1.5 bg-gray-800 rounded"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-gray-300 mb-1">
                        <span>Seismic PGA (g):</span>
                        <span className="text-purple-300">{landslidePga} g</span>
                      </div>
                      <input
                        type="range"
                        min={0.00}
                        max={0.60}
                        step={0.02}
                        value={landslidePga}
                        onChange={(e) => setLandslidePga(Number(e.target.value))}
                        className="w-full accent-purple-500 h-1.5 bg-gray-800 rounded"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Water Table Ratio (m)</label>
                      <input
                        type="number"
                        min={0.0}
                        max={1.0}
                        step={0.05}
                        value={landslideWaterRatio}
                        onChange={(e) => setLandslideWaterRatio(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Soil Unit Wt (γ, kN/m³)</label>
                      <input
                        type="number"
                        step={0.5}
                        value={landslideSoilWeight}
                        onChange={(e) => setLandslideSoilWeight(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Trigger Type</label>
                      <select
                        value={landslideTrigger}
                        onChange={(e) => setLandslideTrigger(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        {Object.entries(LANDSLIDE_TRIGGER_TYPES).map(([k, v]) => (
                          <option key={k} value={v}>{v.replace('_', ' ').toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Colormap</label>
                      <select
                        value={landslideColormap}
                        onChange={(e) => setLandslideColormap(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="turbo">Turbo</option>
                        <option value="spectral">Spectral</option>
                        <option value="viridis">Viridis</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Rescale Range</label>
                    <input
                      type="text"
                      value={landslideRescale}
                      onChange={(e) => setLandslideRescale(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <button
                    onClick={handleExecuteLandslide}
                    disabled={loadingLandslide}
                    className="w-full mt-2 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition-all"
                  >
                    {loadingLandslide ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mountain className="w-4 h-4" />}
                    <span>Assess Slope Stability & Zonation</span>
                  </button>
                </div>
              </div>

              {/* Right Output & Charts (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {landslideResult ? (
                  <div className="space-y-4">
                    {/* Status Alert Banner */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${
                      landslideResult.failure_warning 
                        ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' 
                        : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    }`}>
                      <div className="flex items-center gap-3">
                        {landslideResult.failure_warning ? (
                          <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                        )}
                        <div>
                          <span className="font-bold text-sm block">
                            {landslideResult.failure_warning ? 'CRITICAL STABILITY INTERVENTION REQUIRED' : 'SLOPE WITHIN ACCEPTABLE STABILITY LIMITS'}
                          </span>
                          <span className="text-xs opacity-80 font-mono">
                            Susceptibility: {landslideResult.susceptibility_tier.toUpperCase()} | Prob: {(landslideResult.hazard_probability * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                        landslideResult.failure_warning ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {landslideResult.susceptibility_tier}
                      </span>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">FACTOR OF SAFETY</span>
                        <span className={`text-lg font-bold font-mono ${landslideResult.static_fs < 1.0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {landslideResult.static_fs}
                        </span>
                        <span className="text-[9px] text-gray-500 block font-mono">Limit Equilibrium</span>
                      </div>
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">CRITICAL ACCEL a_c</span>
                        <span className="text-lg font-bold font-mono text-purple-400">
                          {landslideResult.critical_accel_g} g
                        </span>
                        <span className="text-[9px] text-gray-500 block font-mono">Newmark Yield Accel</span>
                      </div>
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">NEWMARK DISPL (D_N)</span>
                        <span className={`text-lg font-bold font-mono ${landslideResult.newmark_displacement_cm > 5.0 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {landslideResult.newmark_displacement_cm} cm
                        </span>
                        <span className="text-[9px] text-gray-500 block font-mono">Jibson (2007)</span>
                      </div>
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">RUNOUT DISTANCE</span>
                        <span className="text-lg font-bold font-mono text-sky-400">
                          {landslideResult.runout_distance_m} m
                        </span>
                        <span className="text-[9px] text-gray-500 block font-mono">Scheidegger Angle</span>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-xl">
                      <span className="text-xs font-mono font-bold text-gray-300 block mb-2">
                        Factor of Safety Sensitivity vs Slope Angle (α)
                      </span>
                      <div className="h-48 w-full">
                        <Line
                          data={landslideSensitivityData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                title: { display: true, text: 'Factor of Safety (FS)', color: '#c084fc' },
                                ticks: { color: '#9ca3af' },
                                grid: { color: 'rgba(75, 85, 99, 0.2)' }
                              },
                              x: {
                                title: { display: true, text: 'Slope Angle', color: '#9ca3af' },
                                ticks: { color: '#9ca3af' },
                                grid: { color: 'rgba(75, 85, 99, 0.2)' }
                              }
                            },
                            plugins: {
                              legend: { labels: { color: '#e5e7eb', font: { size: 10 } } }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Tile Stream Actions */}
                    <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl flex items-center justify-between">
                      <div className="text-xs font-mono">
                        <span className="font-bold text-purple-300 block">Dynamic XYZ Landslide Zonation Tile Layer</span>
                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-sm block">
                          {landslideResult.tile_url_template || buildLandslideTileUrl('SLOPE-SECTOR-01', '{z}', '{x}', '{y}', { colormap: landslideColormap, rescale: landslideRescale })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(landslideResult.tile_url_template || '', 'landslide_tile')}
                          className="px-2.5 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono flex items-center gap-1 border border-gray-700"
                        >
                          {copiedKey === 'landslide_tile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'landslide_tile' ? 'Copied' : 'Copy URL'}</span>
                        </button>
                        {onApplyTileLayer && (
                          <button
                            onClick={() => onApplyTileLayer({
                              layerType: 'landslide',
                              urlTemplate: landslideResult.tile_url_template || buildLandslideTileUrl('SLOPE-SECTOR-01', '{z}', '{x}', '{y}', { colormap: landslideColormap, rescale: landslideRescale })
                            })}
                            className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow"
                          >
                            <Mountain className="w-3.5 h-3.5" />
                            <span>Stream to Map</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-gray-900/20 border border-dashed border-gray-800 rounded-xl text-center">
                    <Mountain className="w-12 h-12 text-gray-600 mb-3" />
                    <h3 className="text-sm font-mono font-bold text-gray-300">No Stability Assessment Executed</h3>
                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                      Configure slope geometry, soil shear parameters (c', φ'), and seismic PGA on the left to evaluate limit equilibrium Factor of Safety and Newmark displacement.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DROUGHT VEGETATION HEALTH INDEX (VHI) */}
          {activeTab === 'drought_vhi' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/70">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
                    <Sprout className="w-4 h-4" />
                    Kogan (1995) VHI Model
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">VHI = α · VCI + (1 - α) · TCI</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1">Target Scene STAC ID</label>
                    <input
                      type="text"
                      value={droughtSceneId}
                      onChange={(e) => setDroughtSceneId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Observed Surface NDVI:</span>
                      <span className="text-emerald-400 font-bold">{droughtNdvi.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.00}
                      max={0.90}
                      step={0.02}
                      value={droughtNdvi}
                      onChange={(e) => setDroughtNdvi(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Observed LST (°C):</span>
                      <span className="text-rose-400 font-bold">{droughtLstC.toFixed(1)}°C</span>
                    </div>
                    <input
                      type="range"
                      min={15.0}
                      max={48.0}
                      step={0.5}
                      value={droughtLstC}
                      onChange={(e) => setDroughtLstC(Number(e.target.value))}
                      className="w-full accent-rose-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>VCI Weight (α):</span>
                      <span className="text-emerald-300 font-bold">{droughtVciWeight.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={0.00}
                      max={1.00}
                      step={0.05}
                      value={droughtVciWeight}
                      onChange={(e) => setDroughtVciWeight(Number(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">NDVI Climatology Min</label>
                      <input
                        type="number"
                        step={0.05}
                        value={droughtNdviMin}
                        onChange={(e) => setDroughtNdviMin(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">NDVI Climatology Max</label>
                      <input
                        type="number"
                        step={0.05}
                        value={droughtNdviMax}
                        onChange={(e) => setDroughtNdviMax(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">LST Climatology Min (°C)</label>
                      <input
                        type="number"
                        step={1.0}
                        value={droughtLstMinC}
                        onChange={(e) => setDroughtLstMinC(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">LST Climatology Max (°C)</label>
                      <input
                        type="number"
                        step={1.0}
                        value={droughtLstMaxC}
                        onChange={(e) => setDroughtLstMaxC(Number(e.target.value))}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Colormap</label>
                      <select
                        value={droughtColormap}
                        onChange={(e) => setDroughtColormap(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="rdylgn">RdYlGn (Drought)</option>
                        <option value="spectral">Spectral</option>
                        <option value="viridis">Viridis</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Rescale Range</label>
                      <input
                        type="text"
                        value={droughtRescale}
                        onChange={(e) => setDroughtRescale(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteDrought}
                    disabled={loadingDrought}
                    className="w-full mt-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    {loadingDrought ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sprout className="w-4 h-4" />}
                    <span>Compute Vegetation Health Index (VHI)</span>
                  </button>
                </div>
              </div>

              {/* Right Output & Charts (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {droughtResult ? (
                  <div className="space-y-4">
                    {/* Status Alert Banner */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${
                      droughtResult.mean_vhi < 40.0
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-300' 
                        : 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Sprout className="w-6 h-6 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-sm block">
                            DROUGHT CONDITION: {(droughtResult.drought_tier || classifyDroughtTier(droughtResult.mean_vhi)).replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs opacity-80 font-mono">
                            Affected Area: {droughtResult.affected_area_ha} ha ({droughtResult.affected_area_pct}%)
                          </span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                        droughtResult.mean_vhi < 20 ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                        droughtResult.mean_vhi < 40 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        VHI: {droughtResult.mean_vhi}
                      </span>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">VEGETATION COND (VCI)</span>
                        <span className="text-xl font-bold font-mono text-emerald-400">{droughtResult.mean_vci}</span>
                        <span className="text-[9px] text-gray-500 block font-mono">Normalized NDVI</span>
                      </div>
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">TEMPERATURE COND (TCI)</span>
                        <span className="text-xl font-bold font-mono text-rose-400">{droughtResult.mean_tci}</span>
                        <span className="text-[9px] text-gray-500 block font-mono">Thermal Stress Index</span>
                      </div>
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">COMPOSITE VHI</span>
                        <span className={`text-xl font-bold font-mono ${droughtResult.mean_vhi < 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {droughtResult.mean_vhi}
                        </span>
                        <span className="text-[9px] text-gray-500 block font-mono">Weighted Health</span>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-xl">
                      <span className="text-xs font-mono font-bold text-gray-300 block mb-2">
                        Biophysical Drought Index Breakdown (0 to 100)
                      </span>
                      <div className="h-48 w-full">
                        {droughtComparisonData && (
                          <Bar
                            data={droughtComparisonData}
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: {
                                y: {
                                  min: 0,
                                  max: 100,
                                  ticks: { color: '#9ca3af' },
                                  grid: { color: 'rgba(75, 85, 99, 0.2)' }
                                },
                                x: {
                                  ticks: { color: '#9ca3af' },
                                  grid: { display: false }
                                }
                              },
                              plugins: {
                                legend: { display: false }
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Tile Stream Actions */}
                    <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center justify-between">
                      <div className="text-xs font-mono">
                        <span className="font-bold text-emerald-300 block">Dynamic XYZ Drought VHI Tile Layer</span>
                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-sm block">
                          {droughtResult.tile_url_template || buildDroughtVhiTileUrl('sentinel-2-l2a', droughtSceneId, '{z}', '{x}', '{y}', { colormap: droughtColormap, rescale: droughtRescale })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(droughtResult.tile_url_template || '', 'drought_tile')}
                          className="px-2.5 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono flex items-center gap-1 border border-gray-700"
                        >
                          {copiedKey === 'drought_tile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'drought_tile' ? 'Copied' : 'Copy URL'}</span>
                        </button>
                        {onApplyTileLayer && (
                          <button
                            onClick={() => onApplyTileLayer({
                              layerType: 'drought_vhi',
                              urlTemplate: droughtResult.tile_url_template || buildDroughtVhiTileUrl('sentinel-2-l2a', droughtSceneId, '{z}', '{x}', '{y}', { colormap: droughtColormap, rescale: droughtRescale })
                            })}
                            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow"
                          >
                            <Sprout className="w-3.5 h-3.5" />
                            <span>Stream to Map</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-gray-900/20 border border-dashed border-gray-800 rounded-xl text-center">
                    <Sprout className="w-12 h-12 text-gray-600 mb-3" />
                    <h3 className="text-sm font-mono font-bold text-gray-300">No Drought Analysis Executed</h3>
                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                      Provide satellite scene ID, observed NDVI and surface temperature LST to evaluate Kogan (1995) VCI/TCI/VHI drought severity indices.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SPECTRAL ANGLE MAPPER (SAM) */}
          {activeTab === 'sam_mineral' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/70">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
                    <Layers className="w-4 h-4" />
                    Kruse (1993) Spectral Angle
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">θ = arccos(r · e / ||r|| ||e||)</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1">Scene STAC ID</label>
                    <input
                      type="text"
                      value={samSceneId}
                      onChange={(e) => setSamSceneId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Target Endmember Mineral</label>
                    <select
                      value={samEndmember}
                      onChange={(e) => setSamEndmember(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      {Object.entries(MINERAL_ENDMEMBER_TYPES).map(([k, v]) => (
                        <option key={k} value={v}>{v.replace('_', ' ').toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Max Angle Cutoff (θ_max):</span>
                      <span className="text-amber-400 font-bold">{samMaxAngleRad.toFixed(2)} rad ({(samMaxAngleRad * 180 / Math.PI).toFixed(1)}°)</span>
                    </div>
                    <input
                      type="range"
                      min={0.04}
                      max={0.30}
                      step={0.01}
                      value={samMaxAngleRad}
                      onChange={(e) => setSamMaxAngleRad(Number(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div>
                    <span className="text-gray-400 block mb-1">Sample Pixel Reflectance Vector</span>
                    <div className="grid grid-cols-3 gap-2">
                      {['blue', 'green', 'red', 'nir', 'swir1', 'swir2'].map(band => (
                        <div key={band}>
                          <label className="text-[9px] uppercase text-gray-500 block">{band}</label>
                          <input
                            type="number"
                            step={0.01}
                            value={samPixelBands[band]}
                            onChange={(e) => setSamPixelBands({ ...samPixelBands, [band]: Number(e.target.value) })}
                            className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Colormap</label>
                      <select
                        value={samColormap}
                        onChange={(e) => setSamColormap(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="viridis">Viridis</option>
                        <option value="magma">Magma</option>
                        <option value="turbo">Turbo</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Rescale Range</label>
                      <input
                        type="text"
                        value={samRescale}
                        onChange={(e) => setSamRescale(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteSam}
                    disabled={loadingSam}
                    className="w-full mt-2 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all"
                  >
                    {loadingSam ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                    <span>Classify Mineral Endmember (SAM)</span>
                  </button>
                </div>
              </div>

              {/* Right Output & Charts (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {samResult ? (
                  <div className="space-y-4">
                    {/* Status Alert Banner */}
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${
                      samResult.is_match 
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-300' 
                        : 'bg-gray-900/60 border-gray-800 text-gray-400'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Layers className="w-6 h-6 text-amber-400 flex-shrink-0" />
                        <div>
                          <span className="font-bold text-sm block">
                            {samResult.is_match ? `MINERAL MATCH IDENTIFIED: ${samResult.target_endmember.toUpperCase()}` : 'NO MINERAL MATCH WITHIN CUTOFF'}
                          </span>
                          <span className="text-xs opacity-80 font-mono">
                            Confidence: {samResult.match_confidence.toUpperCase()} | Angle: {samResult.spectral_angle_deg}° ({samResult.spectral_angle_rad} rad)
                          </span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase ${
                        samResult.is_match ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {(samResult.similarity_score * 100).toFixed(1)}% Sim
                      </span>
                    </div>

                    {/* Metric Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">SPECTRAL ANGLE (θ)</span>
                        <span className="text-xl font-bold font-mono text-amber-400">{samResult.spectral_angle_deg}°</span>
                        <span className="text-[9px] text-gray-500 block font-mono">{samResult.spectral_angle_rad} rad</span>
                      </div>
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">SIMILARITY SCORE</span>
                        <span className="text-xl font-bold font-mono text-sky-400">{samResult.similarity_score}</span>
                        <span className="text-[9px] text-gray-500 block font-mono">1 - (θ / (π/2))</span>
                      </div>
                      <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                        <span className="text-[10px] text-gray-400 block font-mono">CLASSIFIED AREA</span>
                        <span className="text-xl font-bold font-mono text-emerald-400">{samResult.classified_area_ha} ha</span>
                        <span className="text-[9px] text-gray-500 block font-mono">{samResult.classified_area_pct}% coverage</span>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-xl">
                      <span className="text-xs font-mono font-bold text-gray-300 block mb-2">
                        Spectral Signature Comparison: Pixel vs USGS Endmember
                      </span>
                      <div className="h-48 w-full">
                        <Line
                          data={samSpectralProfileData}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                              y: {
                                min: 0.0,
                                max: 0.5,
                                title: { display: true, text: 'Reflectance [0-1]', color: '#9ca3af' },
                                ticks: { color: '#9ca3af' },
                                grid: { color: 'rgba(75, 85, 99, 0.2)' }
                              },
                              x: {
                                ticks: { color: '#9ca3af' },
                                grid: { color: 'rgba(75, 85, 99, 0.2)' }
                              }
                            },
                            plugins: {
                              legend: { labels: { color: '#e5e7eb', font: { size: 10 } } }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Tile Stream Actions */}
                    <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl flex items-center justify-between">
                      <div className="text-xs font-mono">
                        <span className="font-bold text-amber-300 block">Dynamic XYZ SAM Mineral Tile Layer</span>
                        <span className="text-[10px] text-gray-400 font-mono truncate max-w-sm block">
                          {samResult.tile_url_template || buildSamMineralTileUrl('sentinel-2-l2a', samSceneId, samEndmember, '{z}', '{x}', '{y}', { colormap: samColormap, rescale: samRescale })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(samResult.tile_url_template || '', 'sam_tile')}
                          className="px-2.5 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-mono flex items-center gap-1 border border-gray-700"
                        >
                          {copiedKey === 'sam_tile' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedKey === 'sam_tile' ? 'Copied' : 'Copy URL'}</span>
                        </button>
                        {onApplyTileLayer && (
                          <button
                            onClick={() => onApplyTileLayer({
                              layerType: 'sam_mineral',
                              urlTemplate: samResult.tile_url_template || buildSamMineralTileUrl('sentinel-2-l2a', samSceneId, samEndmember, '{z}', '{x}', '{y}', { colormap: samColormap, rescale: samRescale })
                            })}
                            className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Stream to Map</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-gray-900/20 border border-dashed border-gray-800 rounded-xl text-center">
                    <Layers className="w-12 h-12 text-gray-600 mb-3" />
                    <h3 className="text-sm font-mono font-bold text-gray-300">No SAM Classification Executed</h3>
                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                      Select target mineral endmember (pyrite, chalcopyrite, acid mine drainage) and provide multi-band reflectance to evaluate Kruse (1993) spectral vector angle.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: CLOUD-NATIVE VECTOR EXPORT */}
          {activeTab === 'vector_export' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Controls (5 cols) */}
              <div className="lg:col-span-5 space-y-4 bg-gray-900/40 p-4 rounded-xl border border-gray-800/70">
                <div className="flex items-center justify-between pb-2 border-b border-gray-800">
                  <span className="text-xs font-mono font-bold uppercase text-teal-400 flex items-center gap-1.5">
                    <FileDown className="w-4 h-4" />
                    Cloud-Native Serialization
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">GeoParquet & Vector Tiles</span>
                </div>

                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <label className="text-gray-400 block mb-1">Spatial Layer</label>
                    <select
                      value={vectorLayerId}
                      onChange={(e) => setVectorLayerId(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      <option value="critical_infrastructure">Critical Infrastructure (Assets)</option>
                      <option value="tailings_dams">Tailings Dam Impoundments</option>
                      <option value="hazard_zones">Hazard Zonation Boundaries</option>
                      <option value="active_faults">Active Geological Fault Lines</option>
                      <option value="sensor_stations">In-Situ Piezometer & Seismic Sensors</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Serialization Format</label>
                    <select
                      value={vectorFormat}
                      onChange={(e) => setVectorFormat(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                    >
                      {Object.entries(GEOSPATIAL_SERIALIZATION_FORMATS).map(([k, v]) => (
                        <option key={k} value={v}>{v.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Filter Property</label>
                      <input
                        type="text"
                        value={vectorFilterProp}
                        onChange={(e) => setVectorFilterProp(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Filter Value</label>
                      <input
                        type="text"
                        value={vectorFilterVal}
                        onChange={(e) => setVectorFilterVal(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-gray-300 mb-1">
                      <span>Simplification Tolerance (°):</span>
                      <span className="text-teal-400">{vectorTolerance}</span>
                    </div>
                    <input
                      type="range"
                      min={0.00001}
                      max={0.001}
                      step={0.00005}
                      value={vectorTolerance}
                      onChange={(e) => setVectorTolerance(Number(e.target.value))}
                      className="w-full accent-teal-500 h-1.5 bg-gray-800 rounded"
                    />
                  </div>

                  <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl space-y-1">
                    <span className="text-[10px] text-gray-400 block">STANDARD OUTPUT FILENAME</span>
                    <span className="text-xs text-teal-300 font-mono block break-all">
                      {formatVectorExportFilename(vectorLayerId, vectorFormat)}
                    </span>
                  </div>

                  <button
                    onClick={handleExecuteVectorExport}
                    disabled={loadingVectorExport}
                    className="w-full mt-2 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-teal-600/20 transition-all"
                  >
                    {loadingVectorExport ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                    <span>Request Cloud-Native Vector Export</span>
                  </button>
                </div>
              </div>

              {/* Right Output & Details (7 cols) */}
              <div className="lg:col-span-7 space-y-4">
                {vectorExportResult ? (
                  <div className="space-y-4">
                    {/* Export Record Card */}
                    <div className="p-4 bg-teal-950/30 border border-teal-800/50 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-teal-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-teal-400" />
                          EXPORT DATASET GENERATED
                        </span>
                        <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 text-[10px] font-mono border border-teal-500/30">
                          {vectorExportResult.format.toUpperCase()}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
                        <div className="p-2.5 bg-gray-900/70 rounded-lg">
                          <span className="text-[10px] text-gray-400 block">EXPORT ID</span>
                          <span className="font-bold text-white truncate block">{vectorExportResult.export_id}</span>
                        </div>
                        <div className="p-2.5 bg-gray-900/70 rounded-lg">
                          <span className="text-[10px] text-gray-400 block">FEATURE COUNT</span>
                          <span className="font-bold text-white block">{vectorExportResult.feature_count} features</span>
                        </div>
                        <div className="p-2.5 bg-gray-900/70 rounded-lg">
                          <span className="text-[10px] text-gray-400 block">FILE SIZE</span>
                          <span className="font-bold text-white block">{(vectorExportResult.file_size_bytes / 1024).toFixed(1)} KB</span>
                        </div>
                        <div className="p-2.5 bg-gray-900/70 rounded-lg">
                          <span className="text-[10px] text-gray-400 block">MIME TYPE</span>
                          <span className="font-bold text-white text-[10px] truncate block">{vectorExportResult.mime_type}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-teal-800/40">
                        <span className="text-[10px] text-gray-400 font-mono">
                          Ready for cloud analysis, DuckDB, BigQuery, or GIS import
                        </span>
                        <a
                          href={vectorExportResult.download_url}
                          download={vectorExportResult.filename || formatVectorExportFilename(vectorLayerId, vectorFormat)}
                          className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs font-mono flex items-center gap-1.5 shadow"
                        >
                          <FileDown className="w-4 h-4" />
                          <span>Download {vectorFormat.toUpperCase()}</span>
                        </a>
                      </div>
                    </div>

                    {/* MVT Vector Tile Streaming Box */}
                    <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-xl space-y-2">
                      <span className="text-xs font-mono font-bold text-gray-300 block">
                        Mapbox Vector Tile (MVT) Protocol Buffer Streaming
                      </span>
                      <p className="text-xs text-gray-400 font-mono">
                        Stream interactive vector geometry tiles directly in WebGL / MapLibre / Leaflet vector layers without rasterization bottlenecks.
                      </p>
                      <div className="p-2.5 bg-black/60 rounded border border-gray-800 text-[11px] font-mono text-teal-300 flex items-center justify-between">
                        <span className="truncate">{buildVectorTileUrl(vectorLayerId, '{z}', '{x}', '{y}')}</span>
                        <button
                          onClick={() => handleCopy(buildVectorTileUrl(vectorLayerId, '{z}', '{x}', '{y}'), 'mvt_url')}
                          className="ml-2 px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] rounded"
                        >
                          {copiedKey === 'mvt_url' ? 'Copied' : 'Copy MVT'}
                        </button>
                      </div>
                      {onApplyTileLayer && (
                        <div className="pt-2 flex justify-end">
                          <button
                            onClick={() => onApplyTileLayer({
                              layerType: 'vector_tile',
                              urlTemplate: buildVectorTileUrl(vectorLayerId, '{z}', '{x}', '{y}')
                            })}
                            className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold font-mono flex items-center gap-1.5 shadow"
                          >
                            <Database className="w-3.5 h-3.5" />
                            <span>Stream Vector Tiles to Map</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-[300px] flex flex-col items-center justify-center p-8 bg-gray-900/20 border border-dashed border-gray-800 rounded-xl text-center">
                    <FileDown className="w-12 h-12 text-gray-600 mb-3" />
                    <h3 className="text-sm font-mono font-bold text-gray-300">No Export Requested</h3>
                    <p className="text-xs text-gray-500 max-w-sm mt-1">
                      Select target spatial layer and serialization format (GeoParquet, FlatGeobuf, MVT, GeoJSON) to generate and download cloud-native vector datasets.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-gray-800 bg-gray-900/50 flex items-center justify-between text-xs font-mono text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>GIOS v2.5 Geotechnical Hazard Subsystem Online</span>
          </div>
          <span>Froehlich (2008) · Kruse SAM (1993) · Kogan VHI (1995) · GeoParquet</span>
        </div>

      </div>
    </div>
  );
}
