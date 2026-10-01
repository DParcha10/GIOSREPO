import React, { useState } from 'react';
import { 
  X, Plane, Crosshair, Compass, Layers, Activity, Radar, 
  LineChart, RefreshCw, Copy, Check, CheckCircle2, 
  AlertTriangle, ShieldAlert, Eye, EyeOff, Sliders, 
  SlidersHorizontal, ArrowUpRight, TrendingDown, Gauge, 
  MapPin, Box, Navigation, Info
} from 'lucide-react';
import { 
  calibrateDirectGeoreferencing,
  analyzeEmbankmentCrestAlignment,
  processPsInsarStack
} from '../api/giosApi';
import { 
  DIRECT_GEOREFERENCING_TIERS,
  classifyDirectGeoreferencingTier,
  calculateDirectGeoreferencing,
  buildDirectGeoreferencingTileUrl,
  CREST_SETTLEMENT_TIERS,
  classifyCrestSettlementTier,
  calculateCrestAlignmentVectorization,
  buildCrestAlignmentTileUrl,
  APS_FILTER_MODES,
  PS_INSAR_STABILITY_TIERS,
  classifyPsInsarStabilityTier,
  calculatePsInsarStackDisplacement,
  buildPsInsarTileUrl
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function DirectGeoreferencingModal({
  isOpen,
  onClose,
  initialTab = 'direct_georef',
  onApplyTileLayer = null,
  onApplyFootprint = null,
  onApplyCrestAlignment = null,
  onApplyPsPoints = null
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'direct_georef' | 'crest_alignment' | 'ps_insar'
  const [copiedKey, setCopiedKey] = useState(null);

  // --------------------------------------------------------------------------
  // Tab 1: Drone Direct Georeferencing & IMU Boresight Calibration States
  // --------------------------------------------------------------------------
  const [missionId, setMissionId] = useState('drone_mission_direct_01');
  const [gnssLat, setGnssLat] = useState(37.0582);
  const [gnssLon, setGnssLon] = useState(-121.0744);
  const [gnssAltM, setGnssAltM] = useState(485.5);
  const [groundElevM, setGroundElevM] = useState(350.0);
  
  // Aircraft attitude
  const [rollDeg, setRollDeg] = useState(1.2);
  const [pitchDeg, setPitchDeg] = useState(-2.4);
  const [yawDeg, setYawDeg] = useState(135.0);

  // Antenna Lever-Arm Offsets
  const [leverLx, setLeverLx] = useState(0.05);
  const [leverLy, setLeverLy] = useState(-0.12);
  const [leverLz, setLeverLz] = useState(0.25);

  // Boresight Misalignment Angles
  const [boresightRoll, setBoresightRoll] = useState(0.045);
  const [boresightPitch, setBoresightPitch] = useState(-0.082);
  const [boresightYaw, setBoresightYaw] = useState(0.120);

  // Camera Sensor Spec
  const [focalLengthMm, setFocalLengthMm] = useState(24.0);
  const [sensorWidthMm, setSensorWidthMm] = useState(35.9);
  const [sensorHeightMm, setSensorHeightMm] = useState(24.0);
  const [imageWidthPx, setImageWidthPx] = useState(6000);
  const [imageHeightPx, setImageHeightPx] = useState(4000);

  // Uncertainties
  const [gnssUncertaintyM, setGnssUncertaintyM] = useState(0.018);
  const [attUncertaintyDeg, setAttUncertaintyDeg] = useState(0.008);

  const [georefResult, setGeorefResult] = useState(null);
  const [loadingGeoref, setLoadingGeoref] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 2: Embankment Crest Alignment & Differential Settlement States
  // --------------------------------------------------------------------------
  const [crestAlignmentId, setCrestAlignmentId] = useState('crest_tsf_main_01');
  const [designElevationM, setDesignElevationM] = useState(350.0);
  const [stationIntervalM, setStationIntervalM] = useState(20.0);
  const [crestWidthM, setCrestWidthM] = useState(12.0);
  const [crestPreset, setCrestPreset] = useState('san_luis'); // 'san_luis' | 'tsf_embankment' | 'tailings_sag'

  const [crestCenterlinePoints, setCrestCenterlinePoints] = useState([
    [37.0580, -121.0760, 349.95],
    [37.0583, -121.0740, 349.88],
    [37.0585, -121.0720, 349.62],
    [37.0588, -121.0700, 349.48],
    [37.0590, -121.0680, 349.70],
    [37.0592, -121.0660, 349.92]
  ]);

  const [crestResult, setCrestResult] = useState(null);
  const [loadingCrest, setLoadingCrest] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 3: PS-InSAR Multi-Temporal Time-Series & APS Phase Stacking States
  // --------------------------------------------------------------------------
  const [psStackId, setPsStackId] = useState('ps_stack_san_luis_01');
  const [masterDate, setMasterDate] = useState('2026-01-10');
  const [apsFilterMode, setApsFilterMode] = useState(APS_FILTER_MODES.SPATIOTEMPORAL_GAUSSIAN);
  const [coherenceThreshold, setCoherenceThreshold] = useState(0.70);
  const [dispersionThreshold, setDispersionThreshold] = useState(0.25);
  const [radarWavelengthM, setRadarWavelengthM] = useState(0.055465); // Sentinel-1 C-band
  const [selectedPsPointId, setSelectedPsPointId] = useState('PS-CREST-02');

  const [psResult, setPsResult] = useState(null);
  const [loadingPs, setLoadingPs] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --------------------------------------------------------------------------
  // Execution Handlers
  // --------------------------------------------------------------------------
  const handleExecuteDirectGeoref = async () => {
    setLoadingGeoref(true);
    try {
      const resp = await calibrateDirectGeoreferencing({
        mission_id: missionId,
        gnss_latitude: gnssLat,
        gnss_longitude: gnssLon,
        gnss_altitude_m: gnssAltM,
        ground_elevation_m: groundElevM,
        roll_deg: rollDeg,
        pitch_deg: pitchDeg,
        yaw_deg: yawDeg,
        lever_arm: { lx_m: leverLx, ly_m: leverLy, lz_m: leverLz },
        boresight: { d_roll_deg: boresightRoll, d_pitch_deg: boresightPitch, d_yaw_deg: boresightYaw },
        sensor_spec: {
          focal_length_mm: focalLengthMm,
          sensor_width_mm: sensorWidthMm,
          sensor_height_mm: sensorHeightMm,
          image_width_px: imageWidthPx,
          image_height_px: imageHeightPx
        },
        gnss_uncertainty_m: gnssUncertaintyM,
        attitude_uncertainty_deg: attUncertaintyDeg
      });
      setGeorefResult(resp);
    } catch {
      // Local robust fallback matching Agent 5 contracts
      const local = calculateDirectGeoreferencing({
        gnssLat,
        gnssLon,
        gnssAltM,
        groundElevM,
        rollDeg,
        pitchDeg,
        yawDeg,
        leverArm: { lx_m: leverLx, ly_m: leverLy, lz_m: leverLz },
        boresight: { d_roll_deg: boresightRoll, d_pitch_deg: boresightPitch, d_yaw_deg: boresightYaw },
        sensorSpec: {
          focal_length_mm: focalLengthMm,
          sensor_width_mm: sensorWidthMm,
          sensor_height_mm: sensorHeightMm,
          image_width_px: imageWidthPx,
          image_height_px: imageHeightPx
        },
        gnssUncertaintyM,
        attitudeUncertaintyDeg: attUncertaintyDeg
      });
      setGeorefResult({
        ...local,
        mission_id: missionId,
        tile_url_template: buildDirectGeoreferencingTileUrl(missionId, '{z}', '{x}', '{y}'),
        analyzed_at: new Date().toISOString()
      });
    } finally {
      setLoadingGeoref(false);
    }
  };

  const handleCrestPresetChange = (presetKey) => {
    setCrestPreset(presetKey);
    if (presetKey === 'san_luis') {
      setDesignElevationM(350.0);
      setCrestWidthM(12.0);
      setCrestCenterlinePoints([
        [37.0580, -121.0760, 349.95],
        [37.0583, -121.0740, 349.88],
        [37.0585, -121.0720, 349.62],
        [37.0588, -121.0700, 349.48],
        [37.0590, -121.0680, 349.70],
        [37.0592, -121.0660, 349.92]
      ]);
    } else if (presetKey === 'tsf_embankment') {
      setDesignElevationM(420.0);
      setCrestWidthM(15.0);
      setCrestCenterlinePoints([
        [37.0550, -121.0780, 419.90],
        [37.0555, -121.0760, 419.82],
        [37.0560, -121.0740, 419.75],
        [37.0565, -121.0720, 419.80],
        [37.0570, -121.0700, 419.88]
      ]);
    } else if (presetKey === 'tailings_sag') {
      setDesignElevationM(350.0);
      setCrestWidthM(10.0);
      setCrestCenterlinePoints([
        [37.0580, -121.0760, 349.90],
        [37.0583, -121.0740, 349.75],
        [37.0585, -121.0720, 349.32], // Critical sag -0.68m
        [37.0588, -121.0700, 349.25], // Critical sag -0.75m
        [37.0590, -121.0680, 349.65],
        [37.0592, -121.0660, 349.85]
      ]);
    }
  };

  const handleExecuteCrestAlignment = async () => {
    setLoadingCrest(true);
    try {
      const resp = await analyzeEmbankmentCrestAlignment({
        alignment_id: crestAlignmentId,
        centerline_points: crestCenterlinePoints,
        design_elevation_m: designElevationM,
        station_interval_m: stationIntervalM,
        crest_width_m: crestWidthM
      });
      setCrestResult(resp);
    } catch {
      const local = calculateCrestAlignmentVectorization(
        crestCenterlinePoints,
        designElevationM,
        stationIntervalM,
        crestWidthM
      );
      setCrestResult({
        ...local,
        alignment_id: crestAlignmentId,
        tile_url_template: buildCrestAlignmentTileUrl(crestAlignmentId, '{z}', '{x}', '{y}'),
        analyzed_at: new Date().toISOString()
      });
    } finally {
      setLoadingCrest(false);
    }
  };

  const handleExecutePsInsar = async () => {
    setLoadingPs(true);
    try {
      const resp = await processPsInsarStack({
        stack_id: psStackId,
        master_date: masterDate,
        aps_filter_mode: apsFilterMode,
        coherence_threshold: coherenceThreshold,
        dispersion_threshold: dispersionThreshold,
        wavelength_m: radarWavelengthM
      });
      setPsResult(resp);
    } catch {
      const local = calculatePsInsarStackDisplacement({
        coherenceThresh: coherenceThreshold,
        dispersionThresh: dispersionThreshold,
        wavelengthM: radarWavelengthM,
        apsFilterMode,
        masterDate
      });
      setPsResult({
        ...local,
        stack_id: psStackId,
        aps_filter_mode: apsFilterMode,
        tile_url_template: buildPsInsarTileUrl(psStackId, '{z}', '{x}', '{y}'),
        analyzed_at: new Date().toISOString()
      });
    } finally {
      setLoadingPs(false);
    }
  };

  // --------------------------------------------------------------------------
  // Tab 2 Chart Data: Embankment Crest Elevation Profile
  // --------------------------------------------------------------------------
  const getCrestChartData = () => {
    if (!crestResult?.stations?.length) return null;
    const labels = crestResult.stations.map(st => st.station_code);
    const measuredData = crestResult.stations.map(st => st.measured_elevation_m);
    const designData = crestResult.stations.map(st => st.design_elevation_m);

    return {
      labels,
      datasets: [
        {
          label: 'Measured Elevation (ASL m)',
          data: measuredData,
          borderColor: '#06b6d4',
          backgroundColor: 'rgba(6, 182, 212, 0.15)',
          borderWidth: 2.5,
          tension: 0.25,
          fill: '-1',
          pointRadius: 4,
          pointBackgroundColor: crestResult.stations.map(st => 
            st.tier_metadata?.color || (Math.abs(st.settlement_m) >= 0.30 ? '#f43f5e' : '#06b6d4')
          )
        },
        {
          label: 'Nominal Design Crest Z₀ (m)',
          data: designData,
          borderColor: '#10b981',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false
        }
      ]
    };
  };

  // --------------------------------------------------------------------------
  // Tab 3 Chart Data: Multi-Temporal PS-InSAR Deformation Time-Series
  // --------------------------------------------------------------------------
  const getPsChartData = () => {
    if (!psResult?.ps_points?.length) return null;
    const currentPoint = psResult.ps_points.find(p => p.point_id === selectedPsPointId) || psResult.ps_points[0];
    if (!currentPoint?.time_series_displacements?.length) return null;

    const labels = currentPoint.time_series_displacements.map(t => t.date);
    const displacementValues = currentPoint.time_series_displacements.map(t => t.displacement_mm);

    return {
      labels,
      datasets: [
        {
          label: `${currentPoint.point_id} Displacement (mm)`,
          data: displacementValues,
          borderColor: currentPoint.tier_metadata?.color || '#f43f5e',
          backgroundColor: 'rgba(244, 63, 94, 0.12)',
          borderWidth: 2.5,
          tension: 0.2,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true
        },
        {
          label: 'Zero Baseline (mm)',
          data: labels.map(() => 0),
          borderColor: '#6b7280',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    };
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-gray-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Crosshair className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  DIRECT GEOREFERENCING & InSAR GEOTECHNICAL STUDIO
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Cycle v2.5.7
                </span>
              </div>
              <p className="text-xs text-gray-400 font-mono mt-0.5">
                Drone IMU Boresight Calibration • Embankment Crest Vectorization • PS-InSAR Phase Stacking
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-950/80">
          <button
            onClick={() => setActiveTab('direct_georef')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold uppercase border-b-2 transition ${
              activeTab === 'direct_georef'
                ? 'border-purple-500 text-purple-400 bg-purple-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Plane className="w-4 h-4" />
            <span>1. Direct Georeferencing & IMU Boresight</span>
          </button>

          <button
            onClick={() => setActiveTab('crest_alignment')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold uppercase border-b-2 transition ${
              activeTab === 'crest_alignment'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>2. Embankment Crest Alignment</span>
          </button>

          <button
            onClick={() => setActiveTab('ps_insar')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold uppercase border-b-2 transition ${
              activeTab === 'ps_insar'
                ? 'border-rose-500 text-rose-400 bg-rose-500/5'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radar className="w-4 h-4" />
            <span>3. PS-InSAR Multi-Temporal Stacking</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ================================================================== */}
          {/* TAB 1: DRONE DIRECT GEOREFERENCING & IMU/BORESIGHT CALIBRATION     */}
          {/* ================================================================== */}
          {activeTab === 'direct_georef' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Column: Flight & Attitude Parameters */}
                <div className="space-y-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-400 uppercase">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>GNSS Position & Aircraft Attitude</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block font-mono mb-1">Mission Identifier</label>
                    <input
                      type="text"
                      value={missionId}
                      onChange={(e) => setMissionId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block font-mono mb-1">GNSS Lat (°)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={gnssLat}
                        onChange={(e) => setGnssLat(parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block font-mono mb-1">GNSS Lon (°)</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={gnssLon}
                        onChange={(e) => setGnssLon(parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block font-mono mb-1">GNSS Alt (m ASL)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={gnssAltM}
                        onChange={(e) => setGnssAltM(parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block font-mono mb-1">Ground Elev (m)</label>
                      <input
                        type="number"
                        step="0.5"
                        value={groundElevM}
                        onChange={(e) => setGroundElevM(parseFloat(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  {/* IMU Attitude */}
                  <div className="pt-2 border-t border-slate-800 space-y-2">
                    <span className="text-[10px] font-bold text-gray-300 font-mono block">IMU Gimbal Attitude (°)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">Roll (ω)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={rollDeg}
                          onChange={(e) => setRollDeg(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">Pitch (φ)</span>
                        <input
                          type="number"
                          step="0.1"
                          value={pitchDeg}
                          onChange={(e) => setPitchDeg(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">Yaw / Heading (κ)</span>
                        <input
                          type="number"
                          step="1.0"
                          value={yawDeg}
                          onChange={(e) => setYawDeg(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Middle Column: Lever-Arm & Boresight Offsets */}
                <div className="space-y-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-400 uppercase">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Lever-Arm & Boresight Matrix</span>
                  </div>

                  {/* Lever Arm */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-300 font-mono block">Antenna Lever-Arm Offsets (m)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">lx (m)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={leverLx}
                          onChange={(e) => setLeverLx(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">ly (m)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={leverLy}
                          onChange={(e) => setLeverLy(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">lz (m)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={leverLz}
                          onChange={(e) => setLeverLz(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Boresight Misalignment */}
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-300 font-mono block">IMU/Camera Boresight Angles (°)</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">Δ Roll (°)</span>
                        <input
                          type="number"
                          step="0.005"
                          value={boresightRoll}
                          onChange={(e) => setBoresightRoll(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">Δ Pitch (°)</span>
                        <input
                          type="number"
                          step="0.005"
                          value={boresightPitch}
                          onChange={(e) => setBoresightPitch(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">Δ Yaw (°)</span>
                        <input
                          type="number"
                          step="0.005"
                          value={boresightYaw}
                          onChange={(e) => setBoresightYaw(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Camera Specs */}
                  <div className="pt-2 border-t border-slate-800 space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-300 font-mono block">Camera Optics & Resolution</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">Focal (mm)</span>
                        <input
                          type="number"
                          step="1"
                          value={focalLengthMm}
                          onChange={(e) => setFocalLengthMm(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">Sensor W</span>
                        <input
                          type="number"
                          step="0.1"
                          value={sensorWidthMm}
                          onChange={(e) => setSensorWidthMm(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-gray-500 font-mono">Sensor H</span>
                        <input
                          type="number"
                          step="0.1"
                          value={sensorHeightMm}
                          onChange={(e) => setSensorHeightMm(parseFloat(e.target.value))}
                          className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Execution & Uncertainties */}
                <div className="space-y-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-400 uppercase">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Uncertainty & Inversion</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1 font-mono">
                        <span className="text-gray-400 text-[10px]">GNSS 1-σ Uncertainty (m)</span>
                        <span className="text-purple-300 font-bold">{gnssUncertaintyM.toFixed(3)} m</span>
                      </div>
                      <input
                        type="range"
                        min="0.005"
                        max="0.100"
                        step="0.005"
                        value={gnssUncertaintyM}
                        onChange={(e) => setGnssUncertaintyM(parseFloat(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1 font-mono">
                        <span className="text-gray-400 text-[10px]">Attitude 1-σ Uncertainty (°)</span>
                        <span className="text-purple-300 font-bold">{attUncertaintyDeg.toFixed(3)}°</span>
                      </div>
                      <input
                        type="range"
                        min="0.002"
                        max="0.050"
                        step="0.002"
                        value={attUncertaintyDeg}
                        onChange={(e) => setAttUncertaintyDeg(parseFloat(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                    </div>

                    <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-gray-400 font-mono space-y-1">
                      <div className="flex justify-between">
                        <span>Flight Height AGL:</span>
                        <span className="text-white font-bold">{Math.max(5.0, gnssAltM - groundElevM).toFixed(1)} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Nominal Footprint:</span>
                        <span className="text-white font-bold">
                          {((sensorWidthMm * (gnssAltM - groundElevM)) / focalLengthMm).toFixed(1)}m × {((sensorHeightMm * (gnssAltM - groundElevM)) / focalLengthMm).toFixed(1)}m
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteDirectGeoref}
                    disabled={loadingGeoref}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
                  >
                    {loadingGeoref ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                    <span>Calculate Direct Georeferencing</span>
                  </button>
                </div>
              </div>

              {/* Georeferencing Results Banner */}
              {georefResult && (
                <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold border ${georefResult.tier_metadata?.badge || 'bg-purple-500/20 text-purple-300 border-purple-500/30'}`}>
                        {georefResult.tier_metadata?.label || georefResult.quality_tier}
                      </span>
                      <span className="text-xs text-gray-400 font-mono">
                        CEP95: <strong className="text-white font-bold">{georefResult.horizontal_cep95_m} m</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {onApplyFootprint && (
                        <button
                          onClick={() => onApplyFootprint(georefResult.footprint_polygon, [georefResult.camera_latitude, georefResult.camera_longitude])}
                          className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Show Footprint on Map</span>
                        </button>
                      )}
                      {onApplyTileLayer && (
                        <button
                          onClick={() => onApplyTileLayer(georefResult.tile_url_template)}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Stream Tiles</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800">
                      <span className="text-[10px] text-gray-400 uppercase block">Mean GSD</span>
                      <span className="text-base font-bold text-white">{georefResult.gsd_cm_px} cm/px</span>
                      <span className="text-[9px] text-purple-400 block mt-0.5">Centimeter Micro-Zoom</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800">
                      <span className="text-[10px] text-gray-400 uppercase block">Flight Height AGL</span>
                      <span className="text-base font-bold text-white">{georefResult.flight_height_agl_m} m</span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">Cam Alt: {georefResult.camera_altitude_m}m</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800">
                      <span className="text-[10px] text-gray-400 uppercase block">Corrected Pose</span>
                      <span className="text-xs font-bold text-white block">
                        R: {georefResult.corrected_roll_deg}°, P: {georefResult.corrected_pitch_deg}°
                      </span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">Heading: {georefResult.corrected_yaw_deg}°</span>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800">
                      <span className="text-[10px] text-gray-400 uppercase block">Ground Footprint</span>
                      <span className="text-xs font-bold text-white block">
                        {georefResult.footprint_width_m}m × {georefResult.footprint_height_m}m
                      </span>
                      <span className="text-[9px] text-purple-400 block mt-0.5">4-Corner Projected WGS84</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-black/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div className="truncate mr-3">
                      <span className="text-gray-500">Dynamic XYZ Tile Template: </span>
                      <span className="text-purple-300 font-bold">{georefResult.tile_url_template}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(georefResult.tile_url_template, 'georef_url')}
                      className="px-2 py-1 rounded bg-slate-800 text-gray-300 hover:text-white flex items-center gap-1 text-[11px]"
                    >
                      {copiedKey === 'georef_url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === 'georef_url' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================== */}
          {/* TAB 2: EMBANKMENT CREST ALIGNMENT & DIFFERENTIAL SETTLEMENT        */}
          {/* ================================================================== */}
          {activeTab === 'crest_alignment' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Controls */}
                <div className="space-y-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-cyan-400 uppercase">
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Crest Alignment Geometry</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block font-mono mb-1">Alignment Identifier</label>
                    <input
                      type="text"
                      value={crestAlignmentId}
                      onChange={(e) => setCrestAlignmentId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block font-mono mb-1">Crest Alignment Preset</label>
                    <select
                      value={crestPreset}
                      onChange={(e) => handleCrestPresetChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                    >
                      <option value="san_luis">San Luis Dam Crest (Stable, Z₀=350m)</option>
                      <option value="tsf_embankment">Tailings TSF Dam Crest (Z₀=420m)</option>
                      <option value="tailings_sag">Tailings Crest with Critical Settlement Sag (&gt;0.30m)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[9px] text-gray-500 font-mono">Design Z₀ (m)</span>
                      <input
                        type="number"
                        step="1.0"
                        value={designElevationM}
                        onChange={(e) => setDesignElevationM(parseFloat(e.target.value))}
                        className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-mono">Interval (m)</span>
                      <input
                        type="number"
                        step="5.0"
                        value={stationIntervalM}
                        onChange={(e) => setStationIntervalM(parseFloat(e.target.value))}
                        className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 font-mono">Width (m)</span>
                      <input
                        type="number"
                        step="1.0"
                        value={crestWidthM}
                        onChange={(e) => setCrestWidthM(parseFloat(e.target.value))}
                        className="w-full px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-gray-400 font-mono">
                    <span className="block text-gray-300 font-bold mb-1">Centerline Geometry:</span>
                    <span>{crestCenterlinePoints.length} vertices loaded along dam axis. Normal transects will be computed at equidistant {stationIntervalM}m steps.</span>
                  </div>

                  <button
                    onClick={handleExecuteCrestAlignment}
                    disabled={loadingCrest}
                    className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition disabled:opacity-50"
                  >
                    {loadingCrest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                    <span>Vectorize Crest & Compute Settlement</span>
                  </button>
                </div>

                {/* Right 2 Columns: Elevation Profile Chart */}
                <div className="md:col-span-2 p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold font-mono text-cyan-400 uppercase">
                      <LineChart className="w-3.5 h-3.5" />
                      <span>Embankment Longitudinal Profile (Design vs Measured)</span>
                    </div>
                    {crestResult && (
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${crestResult.overall_metadata?.badge || 'bg-cyan-500/20 text-cyan-300'}`}>
                        {crestResult.overall_severity_tier}
                      </span>
                    )}
                  </div>

                  <div className="h-60 w-full bg-black/40 p-2 rounded-xl border border-slate-800/80">
                    {crestResult ? (
                      <Line 
                        data={getCrestChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { labels: { color: '#9ca3af', font: { family: 'monospace', size: 10 } } },
                            tooltip: {
                              callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}m`
                              }
                            }
                          },
                          scales: {
                            x: { ticks: { color: '#6b7280', font: { family: 'monospace', size: 9 } } },
                            y: { 
                              ticks: { color: '#6b7280', font: { family: 'monospace', size: 9 } },
                              title: { display: true, text: 'Elevation ASL (m)', color: '#9ca3af', font: { family: 'monospace', size: 10 } }
                            }
                          }
                        }} 
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500 font-mono text-xs">
                        Click "Vectorize Crest" to generate profile and normal cross-sections
                      </div>
                    )}
                  </div>

                  {crestResult && (
                    <div className="grid grid-cols-4 gap-2 pt-3 text-xs font-mono">
                      <div className="p-2 rounded bg-black/40 border border-slate-800">
                        <span className="text-[9px] text-gray-500 block">Total Length</span>
                        <span className="font-bold text-white">{crestResult.total_length_m} m</span>
                      </div>
                      <div className="p-2 rounded bg-black/40 border border-slate-800">
                        <span className="text-[9px] text-gray-500 block">Peak Loss (Sag)</span>
                        <span className={`font-bold ${crestResult.max_settlement_m >= 0.30 ? 'text-rose-400' : 'text-cyan-400'}`}>
                          {crestResult.max_settlement_m} m
                        </span>
                      </div>
                      <div className="p-2 rounded bg-black/40 border border-slate-800">
                        <span className="text-[9px] text-gray-500 block">Mean Loss</span>
                        <span className="font-bold text-white">{crestResult.mean_settlement_m} m</span>
                      </div>
                      <div className="p-2 rounded bg-black/40 border border-slate-800">
                        <span className="text-[9px] text-gray-500 block">Worst Station</span>
                        <span className="font-bold text-amber-300">{crestResult.worst_settlement_station}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Overtopping Warning */}
              {crestResult?.overtopping_risk_detected && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-3 text-rose-300 font-mono text-xs">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <strong className="font-bold text-rose-200">CRITICAL OVERTOPPING RISK DETECTED: </strong>
                    Peak crest settlement loss exceeds the freeboard tolerance limit (≥ 0.30 m) at station {crestResult.worst_settlement_station}. Immediate geotechnical inspection recommended.
                  </div>
                </div>
              )}

              {/* Station Cross-Sections Table */}
              {crestResult?.stations && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-cyan-400 uppercase">
                      Cross-Section Normal Transect Stationing ({crestResult.stations.length} stations)
                    </span>
                    <div className="flex items-center gap-2">
                      {onApplyCrestAlignment && (
                        <button
                          onClick={() => onApplyCrestAlignment(crestResult.stations)}
                          className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Overlay Crest Vector on Map</span>
                        </button>
                      )}
                      {onApplyTileLayer && (
                        <button
                          onClick={() => onApplyTileLayer(crestResult.tile_url_template)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Stream Tile Layer</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl bg-black/40">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/80 text-gray-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2.5">Station</th>
                          <th className="p-2.5">Lat/Lon</th>
                          <th className="p-2.5">Measured Z</th>
                          <th className="p-2.5">Design Z₀</th>
                          <th className="p-2.5">Settlement (Δz)</th>
                          <th className="p-2.5">Normal Azimuth</th>
                          <th className="p-2.5">Status Tier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {crestResult.stations.map((st, idx) => (
                          <tr key={idx} className="hover:bg-slate-800/30 transition">
                            <td className="p-2.5 font-bold text-white">{st.station_code}</td>
                            <td className="p-2.5 text-gray-400">{st.lat.toFixed(5)}, {st.lon.toFixed(5)}</td>
                            <td className="p-2.5 text-white">{st.measured_elevation_m}m</td>
                            <td className="p-2.5 text-gray-400">{st.design_elevation_m}m</td>
                            <td className={`p-2.5 font-bold ${Math.abs(st.settlement_m) >= 0.30 ? 'text-rose-400' : 'text-emerald-400'}`}>
                              {st.settlement_m > 0 ? `+${st.settlement_m}` : st.settlement_m}m
                            </td>
                            <td className="p-2.5 text-gray-300">{st.normal_azimuth_deg}°</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${st.tier_metadata?.badge || 'bg-slate-800'}`}>
                                {st.settlement_tier}
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

          {/* ================================================================== */}
          {/* TAB 3: PS-InSAR MULTI-TEMPORAL STACKING & APS FILTERING            */}
          {/* ================================================================== */}
          {activeTab === 'ps_insar' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Controls */}
                <div className="space-y-4 p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <div className="flex items-center gap-2 text-xs font-bold font-mono text-rose-400 uppercase">
                    <Radar className="w-3.5 h-3.5" />
                    <span>InSAR Interferometric Stack</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block font-mono mb-1">SAR Stack Identifier</label>
                    <input
                      type="text"
                      value={psStackId}
                      onChange={(e) => setPsStackId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block font-mono mb-1">Master Acquisition Date</label>
                    <input
                      type="date"
                      value={masterDate}
                      onChange={(e) => setMasterDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-gray-400 block font-mono mb-1">APS Atmospheric Filter Mode</label>
                    <select
                      value={apsFilterMode}
                      onChange={(e) => setApsFilterMode(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                    >
                      <option value={APS_FILTER_MODES.SPATIOTEMPORAL_GAUSSIAN}>Spatiotemporal 2D Gaussian Filter</option>
                      <option value={APS_FILTER_MODES.SPATIAL_LOWPASS_TEMPORAL_HIGHPASS}>Spatial Low-Pass + Temporal High-Pass</option>
                      <option value={APS_FILTER_MODES.EXTERNAL_WEATHER_ERA5}>External ERA5 Atmospheric Reanalysis</option>
                      <option value={APS_FILTER_MODES.EMPIRICAL_ELEVATION_CORRECTION}>Empirical Topographic Phase Correction</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-400 text-[10px]">Temporal Coherence (γ ≥ {coherenceThreshold})</span>
                      <span className="text-rose-400 font-bold">{coherenceThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="0.95"
                      step="0.05"
                      value={coherenceThreshold}
                      onChange={(e) => setCoherenceThreshold(parseFloat(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1 font-mono">
                      <span className="text-gray-400 text-[10px]">Amplitude Dispersion (DA ≤ {dispersionThreshold})</span>
                      <span className="text-rose-400 font-bold">{dispersionThreshold.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.40"
                      step="0.02"
                      value={dispersionThreshold}
                      onChange={(e) => setDispersionThreshold(parseFloat(e.target.value))}
                      className="w-full accent-rose-500"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-gray-400 font-mono">
                    <span className="text-gray-300 font-bold block mb-1">Radar Carrier Wavelength:</span>
                    <span>λ = {(radarWavelengthM * 100).toFixed(2)} cm (Sentinel-1 C-band). Phase conversion factor: 4π/λ ≈ 226.5 rad/m.</span>
                  </div>

                  <button
                    onClick={handleExecutePsInsar}
                    disabled={loadingPs}
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
                  >
                    {loadingPs ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
                    <span>Filter APS & Process PS Stack</span>
                  </button>
                </div>

                {/* Right 2 Columns: Multi-Temporal Deformation Chart */}
                <div className="md:col-span-2 p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold font-mono text-rose-400 uppercase">
                      <LineChart className="w-3.5 h-3.5" />
                      <span>Persistent Scatterer LOS Displacement Time-Series</span>
                    </div>

                    {psResult?.ps_points?.length && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-mono">Target:</span>
                        <select
                          value={selectedPsPointId}
                          onChange={(e) => setSelectedPsPointId(e.target.value)}
                          className="px-2 py-1 bg-black/60 border border-slate-700 rounded text-xs font-mono text-white"
                        >
                          {psResult.ps_points.map(p => (
                            <option key={p.point_id} value={p.point_id}>
                              {p.point_id} ({p.mean_velocity_mm_yr > 0 ? `+${p.mean_velocity_mm_yr}` : p.mean_velocity_mm_yr} mm/yr)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="h-60 w-full bg-black/40 p-2 rounded-xl border border-slate-800/80">
                    {psResult ? (
                      <Line 
                        data={getPsChartData()} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: { labels: { color: '#9ca3af', font: { family: 'monospace', size: 10 } } },
                            tooltip: {
                              callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} mm`
                              }
                            }
                          },
                          scales: {
                            x: { ticks: { color: '#6b7280', font: { family: 'monospace', size: 9 } } },
                            y: { 
                              ticks: { color: '#6b7280', font: { family: 'monospace', size: 9 } },
                              title: { display: true, text: 'LOS Displacement (mm)', color: '#9ca3af', font: { family: 'monospace', size: 10 } }
                            }
                          }
                        }} 
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-500 font-mono text-xs">
                        Click "Process PS Stack" to filter atmospheric phase screens and view displacement
                      </div>
                    )}
                  </div>

                  {psResult && (
                    <div className="grid grid-cols-4 gap-2 pt-3 text-xs font-mono">
                      <div className="p-2 rounded bg-black/40 border border-slate-800">
                        <span className="text-[9px] text-gray-500 block">Accepted PS Count</span>
                        <span className="font-bold text-white">{psResult.accepted_ps_count} / {psResult.total_candidates}</span>
                      </div>
                      <div className="p-2 rounded bg-black/40 border border-slate-800">
                        <span className="text-[9px] text-gray-500 block">Mean Coherence (γ)</span>
                        <span className="font-bold text-emerald-400">{psResult.mean_temporal_coherence}</span>
                      </div>
                      <div className="p-2 rounded bg-black/40 border border-slate-800">
                        <span className="text-[9px] text-gray-500 block">Peak Subsidence</span>
                        <span className={`font-bold ${psResult.max_subsidence_mm_yr < -15.0 ? 'text-rose-400' : 'text-amber-400'}`}>
                          {psResult.max_subsidence_mm_yr} mm/yr
                        </span>
                      </div>
                      <div className="p-2 rounded bg-black/40 border border-slate-800">
                        <span className="text-[9px] text-gray-500 block">Peak Uplift</span>
                        <span className="font-bold text-cyan-400">+{psResult.max_uplift_mm_yr} mm/yr</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Critical Subsidence Warning */}
              {psResult?.critical_subsidence_detected && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-3 text-rose-300 font-mono text-xs">
                  <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                  <div>
                    <strong className="font-bold text-rose-200">CRITICAL GEOTECHNICAL SUBSIDENCE: </strong>
                    Ground settlement velocity exceeds severe threshold (vLOS &lt; -15.0 mm/yr). Tailings crest or slope instability alert triggered.
                  </div>
                </div>
              )}

              {/* Validated PS Targets Table */}
              {psResult?.ps_points && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold font-mono text-rose-400 uppercase">
                      Validated Persistent Scatterers ({psResult.ps_points.length} points)
                    </span>
                    <div className="flex items-center gap-2">
                      {onApplyPsPoints && (
                        <button
                          onClick={() => onApplyPsPoints(psResult.ps_points)}
                          className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Plot PS Targets on Map</span>
                        </button>
                      )}
                      {onApplyTileLayer && (
                        <button
                          onClick={() => onApplyTileLayer(psResult.tile_url_template)}
                          className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold flex items-center gap-1.5 transition"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Stream Tile Layer</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl bg-black/40">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-900/80 text-gray-400 border-b border-slate-800 sticky top-0">
                        <tr>
                          <th className="p-2.5">Point ID</th>
                          <th className="p-2.5">Coordinates</th>
                          <th className="p-2.5">Elev (m)</th>
                          <th className="p-2.5">Dispersion (DA)</th>
                          <th className="p-2.5">Coherence (γ)</th>
                          <th className="p-2.5">LOS Velocity</th>
                          <th className="p-2.5">Total Displacement</th>
                          <th className="p-2.5">Stability Tier</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {psResult.ps_points.map((pt, idx) => (
                          <tr 
                            key={idx} 
                            onClick={() => setSelectedPsPointId(pt.point_id)}
                            className={`cursor-pointer transition ${selectedPsPointId === pt.point_id ? 'bg-rose-950/30' : 'hover:bg-slate-800/30'}`}
                          >
                            <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                              <span 
                                className="w-2.5 h-2.5 rounded-full inline-block" 
                                style={{ backgroundColor: pt.tier_metadata?.color || '#10b981' }} 
                              />
                              <span>{pt.point_id}</span>
                            </td>
                            <td className="p-2.5 text-gray-400">{pt.lat.toFixed(4)}, {pt.lon.toFixed(4)}</td>
                            <td className="p-2.5 text-gray-300">{pt.elevation_m}m</td>
                            <td className="p-2.5 text-gray-400">{pt.amplitude_dispersion}</td>
                            <td className="p-2.5 font-bold text-emerald-400">{pt.temporal_coherence}</td>
                            <td className={`p-2.5 font-bold ${pt.mean_velocity_mm_yr < -5.0 ? 'text-rose-400' : 'text-white'}`}>
                              {pt.mean_velocity_mm_yr > 0 ? `+${pt.mean_velocity_mm_yr}` : pt.mean_velocity_mm_yr} mm/yr
                            </td>
                            <td className="p-2.5 text-gray-300">{pt.total_displacement_mm} mm</td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${pt.tier_metadata?.badge || 'bg-slate-800'}`}>
                                {pt.stability_tier}
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

        </div>

        {/* Modal Bottom Status Bar */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs font-mono text-gray-400">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-purple-400" />
            <span>Strict parity with Agent 5 Pydantic schemas and Agent 7 remote sensing endpoints</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition"
          >
            Close Studio
          </button>
        </div>

      </div>
    </div>
  );
}
