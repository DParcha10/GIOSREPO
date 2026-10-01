import React, { useState } from 'react';
import { 
  X, Layers, Activity, RefreshCw, Copy, Check, 
  Sliders, Mountain, BarChart3, 
  Crosshair, Radar 
} from 'lucide-react';
import { 
  processSbasStack,
  correctTopographicMinnaert,
  refineTiePointRpc
} from '../api/giosApi';
import { 
  SBAS_INVERSION_METHODS,
  calculateSbasNetworkInversion,
  buildSbasTileUrl,
  TOPOGRAPHIC_CORRECTION_METHODS,
  calculateTopographicRadiometricCorrection,
  buildTopographicMinnaertTileUrl,
  RPC_ADJUSTMENT_MODELS,
  calculateRpcTiePointAlignment,
  buildTiePointRpcTileUrl
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

export default function SbasTopographicModal({
  isOpen,
  onClose,
  initialTab = 'sbas_insar',
  onApplyTileLayer = null,
  onApplyTiePoints = null
}) {
  const [activeTab, setActiveTab] = useState(initialTab); // 'sbas_insar' | 'topographic_minnaert' | 'tie_point_rpc'
  const [copiedKey, setCopiedKey] = useState(null);

  // --------------------------------------------------------------------------
  // Tab 1: SBAS Multi-Temporal InSAR Network Matrix Inversion States
  // --------------------------------------------------------------------------
  const [stackId, setStackId] = useState('SBAS_TSF_2026_STACK');
  const [masterSceneId, setMasterSceneId] = useState('S1A_IW_SLC__1SDV_20260115');
  const [maxPerpBaselineM, setMaxPerpBaselineM] = useState(200.0);
  const [maxTemporalBaselineDays, setMaxTemporalBaselineDays] = useState(120);
  const [coherenceThreshold, setCoherenceThreshold] = useState(0.35);
  const [inversionMethod, setInversionMethod] = useState('svd_least_squares');
  const [wavelengthM, setWavelengthM] = useState(0.055465);
  const [incidenceAngleDeg, setIncidenceAngleDeg] = useState(38.5);

  const [sbasResult, setSbasResult] = useState(null);
  const [loadingSbas, setLoadingSbas] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 2: Topographic Illumination Minnaert & C-Correction States
  // --------------------------------------------------------------------------
  const [topoCollection, setTopoCollection] = useState('sentinel-2-l2a');
  const [topoItemId, setTopoItemId] = useState('S2A_MSIL2A_20260815T183921');
  const [demId, setDemId] = useState('cop-dem-glo-30');
  const [topoMethod, setTopoMethod] = useState('minnaert');
  const [solarZenithDeg, setSolarZenithDeg] = useState(36.5);
  const [solarAzimuthDeg, setSolarAzimuthDeg] = useState(142.0);
  const [slopeDeg, setSlopeDeg] = useState(24.5);
  const [aspectDeg, setAspectDeg] = useState(160.0);
  const [minnaertK, setMinnaertK] = useState(0.72);
  const [cParameter, setCParameter] = useState(0.18);

  const [topoResult, setTopoResult] = useState(null);
  const [loadingTopo, setLoadingTopo] = useState(false);

  // --------------------------------------------------------------------------
  // Tab 3: Automated Sub-Pixel Tie-Point RPC Alignment States
  // --------------------------------------------------------------------------
  const [rpcImageId, setRpcImageId] = useState('WV03_20260905_EXP01');
  const [referenceOrthoId, setReferenceOrthoId] = useState('REF_ORTHO_COMPOSITE_2026');
  const [adjustmentModel, setAdjustmentModel] = useState('affine_rpc_bias');
  const [minCorrelationThreshold, setMinCorrelationThreshold] = useState(0.75);
  const [ransacThresholdPx, setRansacThresholdPx] = useState(1.5);
  const [requestedTiePoints, setRequestedTiePoints] = useState(64);
  const [groundSamplingDistanceM, setGroundSamplingDistanceM] = useState(0.31);

  const [rpcResult, setRpcResult] = useState(null);
  const [loadingRpc, setLoadingRpc] = useState(false);

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --------------------------------------------------------------------------
  // Execution Handlers
  // --------------------------------------------------------------------------
  const handleExecuteSbas = async () => {
    setLoadingSbas(true);
    try {
      const payload = {
        stack_id: stackId,
        master_scene_id: masterSceneId,
        max_perp_baseline_m: Number(maxPerpBaselineM),
        max_temporal_baseline_days: parseInt(maxTemporalBaselineDays, 10),
        coherence_threshold: Number(coherenceThreshold),
        inversion_method: inversionMethod,
        wavelength_m: Number(wavelengthM),
        incidence_angle_deg: Number(incidenceAngleDeg)
      };
      const res = await processSbasStack(payload);
      setSbasResult(res);
    } catch {
      // Local fallback calculation via Agent 5 formula
      const localRes = calculateSbasNetworkInversion({
        stackId,
        masterSceneId,
        maxPerpBaselineM,
        maxTemporalBaselineDays,
        coherenceThreshold,
        inversionMethod,
        wavelengthM,
        incidenceAngleDeg
      });
      setSbasResult(localRes);
    } finally {
      setLoadingSbas(false);
    }
  };

  const handleExecuteTopo = async () => {
    setLoadingTopo(true);
    try {
      const payload = {
        collection: topoCollection,
        item_id: topoItemId,
        dem_id: demId,
        method: topoMethod,
        solar_zenith_deg: Number(solarZenithDeg),
        solar_azimuth_deg: Number(solarAzimuthDeg),
        slope_deg: Number(slopeDeg),
        aspect_deg: Number(aspectDeg),
        minnaert_k: Number(minnaertK),
        c_parameter: Number(cParameter)
      };
      const res = await correctTopographicMinnaert(payload);
      setTopoResult(res);
    } catch {
      // Local fallback calculation via Agent 5 formula
      const localRes = calculateTopographicRadiometricCorrection({
        collection: topoCollection,
        itemId: topoItemId,
        demId,
        method: topoMethod,
        solarZenithDeg,
        solarAzimuthDeg,
        slopeDeg,
        aspectDeg,
        minnaertK,
        cParameter
      });
      setTopoResult(localRes);
    } finally {
      setLoadingTopo(false);
    }
  };

  const handleExecuteRpc = async () => {
    setLoadingRpc(true);
    try {
      const payload = {
        image_id: rpcImageId,
        reference_ortho_id: referenceOrthoId,
        dem_id: demId,
        adjustment_model: adjustmentModel,
        min_correlation_threshold: Number(minCorrelationThreshold),
        ransac_threshold_px: Number(ransacThresholdPx),
        requested_tie_points: parseInt(requestedTiePoints, 10),
        ground_sampling_distance_m: Number(groundSamplingDistanceM)
      };
      const res = await refineTiePointRpc(payload);
      setRpcResult(res);
    } catch {
      // Local fallback calculation via Agent 5 formula
      const localRes = calculateRpcTiePointAlignment({
        imageId: rpcImageId,
        referenceOrthoId,
        demId,
        adjustmentModel,
        minCorrelationThreshold,
        ransacThresholdPx,
        requestedTiePoints,
        groundSamplingDistanceM
      });
      setRpcResult(localRes);
    } finally {
      setLoadingRpc(false);
    }
  };

  // Pre-computed local values if null
  const currentSbas = sbasResult || calculateSbasNetworkInversion({
    stackId,
    masterSceneId,
    maxPerpBaselineM,
    maxTemporalBaselineDays,
    coherenceThreshold,
    inversionMethod,
    wavelengthM,
    incidenceAngleDeg
  });

  const currentTopo = topoResult || calculateTopographicRadiometricCorrection({
    collection: topoCollection,
    itemId: topoItemId,
    demId,
    method: topoMethod,
    solarZenithDeg,
    solarAzimuthDeg,
    slopeDeg,
    aspectDeg,
    minnaertK,
    cParameter
  });

  const currentRpc = rpcResult || calculateRpcTiePointAlignment({
    imageId: rpcImageId,
    referenceOrthoId,
    demId,
    adjustmentModel,
    minCorrelationThreshold,
    ransacThresholdPx,
    requestedTiePoints,
    groundSamplingDistanceM
  });

  // Chart data for Tab 1: SBAS Time-Series Displacement Curve
  const sbasChartData = {
    labels: (currentSbas.time_series_epochs || []).map(e => e.date),
    datasets: [
      {
        label: 'Cumulative LOS Displacement (mm)',
        data: (currentSbas.time_series_epochs || []).map(e => e.cumulative_displacement_mm),
        borderColor: '#06b6d4',
        backgroundColor: 'rgba(6, 182, 212, 0.25)',
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  // Chart data for Tab 2: Topographic Minnaert Band Reflectances
  const topoBandKeys = Object.keys(currentTopo.band_corrections || {});
  const topoChartData = {
    labels: topoBandKeys,
    datasets: [
      {
        label: 'Observed Reflectance (Uncorrected)',
        data: topoBandKeys.map(k => currentTopo.band_corrections[k]?.observed_reflectance ?? 0),
        backgroundColor: 'rgba(148, 163, 184, 0.65)',
        borderColor: '#94a3b8',
        borderWidth: 1.5,
        borderRadius: 4
      },
      {
        label: `Corrected Reflectance (${topoMethod})`,
        data: topoBandKeys.map(k => currentTopo.band_corrections[k]?.corrected_reflectance ?? 0),
        backgroundColor: 'rgba(34, 197, 94, 0.75)',
        borderColor: '#22c55e',
        borderWidth: 1.5,
        borderRadius: 4
      }
    ]
  };

  // Chart data for Tab 3: RPC Tie Points Residual Errors
  const rpcSamplePoints = currentRpc.tie_points_sample || [];
  const rpcChartData = {
    labels: rpcSamplePoints.map(p => p.point_id),
    datasets: [
      {
        label: 'Posterior Residual (px)',
        data: rpcSamplePoints.map(p => p.residual_px),
        backgroundColor: rpcSamplePoints.map(p => p.inlier ? 'rgba(34, 197, 94, 0.75)' : 'rgba(239, 68, 68, 0.75)'),
        borderColor: rpcSamplePoints.map(p => p.inlier ? '#22c55e' : '#ef4444'),
        borderWidth: 1.5,
        borderRadius: 4
      }
    ]
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-cyan-950/40 text-slate-100 overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-600/30 border border-cyan-500/40 text-cyan-400 shadow-inner">
              <Radar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  SBAS InSAR, Topographic Illumination & RPC Alignment Studio
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Cycle v2.5.9
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                SBAS Multi-Baseline InSAR Network • Topographic Solar Minnaert / C-Correction • Sub-Pixel Tie-Point RPC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Close Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 px-6 py-3 border-b border-slate-800/80 bg-slate-900/90 text-sm">
          <button
            onClick={() => setActiveTab('sbas_insar')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'sbas_insar'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Radar className="w-4 h-4" />
            <span>SBAS InSAR Network Inversion</span>
          </button>

          <button
            onClick={() => setActiveTab('topographic_minnaert')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'topographic_minnaert'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Mountain className="w-4 h-4" />
            <span>Topographic Minnaert / C-Correction</span>
          </button>

          <button
            onClick={() => setActiveTab('tie_point_rpc')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all ${
              activeTab === 'tie_point_rpc'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>Sub-Pixel Tie-Point RPC</span>
          </button>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: SBAS Multi-Temporal InSAR Network Matrix Inversion */}
          {activeTab === 'sbas_insar' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Parameters Panel */}
              <div className="lg:col-span-5 space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-sm">
                    <Sliders className="w-4 h-4" />
                    <span>SBAS Baseline Network Gating & Inversion</span>
                  </div>
                  <span className="text-xs text-slate-500">Berardino et al. SVD</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">InSAR Stack ID</label>
                    <input
                      type="text"
                      value={stackId}
                      onChange={(e) => setStackId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-cyan-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Master Scene ID</label>
                    <input
                      type="text"
                      value={masterSceneId}
                      onChange={(e) => setMasterSceneId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Inversion Regularization Method</label>
                  <select
                    value={inversionMethod}
                    onChange={(e) => setInversionMethod(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                  >
                    {SBAS_INVERSION_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Baseline Thresholds */}
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Max Perpendicular Baseline (|B⊥| max)</span>
                      <span className="font-mono text-cyan-400 font-medium">{maxPerpBaselineM} m</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="500"
                      step="10"
                      value={maxPerpBaselineM}
                      onChange={(e) => setMaxPerpBaselineM(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Max Temporal Baseline (BT max)</span>
                      <span className="font-mono text-cyan-400 font-medium">{maxTemporalBaselineDays} days</span>
                    </div>
                    <input
                      type="range"
                      min="24"
                      max="365"
                      step="12"
                      value={maxTemporalBaselineDays}
                      onChange={(e) => setMaxTemporalBaselineDays(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Coherence Threshold (γ thresh)</span>
                      <span className="font-mono text-cyan-400 font-medium">{coherenceThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min="0.20"
                      max="0.75"
                      step="0.05"
                      value={coherenceThreshold}
                      onChange={(e) => setCoherenceThreshold(parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* Radar Geometry Specifications */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Wavelength λ (m)</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={wavelengthM}
                      onChange={(e) => setWavelengthM(parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Incidence Angle θ (°)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={incidenceAngleDeg}
                      onChange={(e) => setIncidenceAngleDeg(parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExecuteSbas}
                    disabled={loadingSbas}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingSbas ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4" />}
                    <span>Invert SBAS Multi-Baseline Network</span>
                  </button>
                </div>
              </div>

              {/* Analytical Results & Visuals */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Mean Velocity</div>
                    <div className={`text-xl font-bold font-mono ${
                      currentSbas.mean_velocity_mm_yr < -10 ? 'text-red-400' : 'text-cyan-300'
                    }`}>
                      {currentSbas.mean_velocity_mm_yr} mm/yr
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Line-Of-Sight (LOS)</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Pairs Accepted</div>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {currentSbas.num_accepted_pairs} / {currentSbas.num_candidate_pairs}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{currentSbas.num_rejected_pairs} dropped</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Network Rank</div>
                    <div className="text-xl font-bold font-mono text-indigo-400">
                      Rank {currentSbas.network_connectivity_rank}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {currentSbas.is_network_connected ? 'Fully Connected' : 'Disconnected Subsets'}
                    </div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Deformation Tier</div>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${
                        currentSbas.tier_metadata?.badgeClass || 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                      }`}>
                        {currentSbas.tier_metadata?.label || currentSbas.deformation_tier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Displacement Time Series Chart */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span>Cumulative Surface Displacement Time-Series d(t)</span>
                    </div>
                    <span className="text-xs text-slate-400">{currentSbas.num_acquisitions} Multi-Date Epochs</span>
                  </div>
                  <div className="h-56">
                    <Line
                      data={sbasChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { labels: { color: '#cbd5e1', font: { size: 11 } } },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `Displacement: ${ctx.raw} mm`
                            }
                          }
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                          y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 11 } } }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Map Streaming & Export Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Tile Endpoint:</span>
                    <code className="text-xs font-mono text-cyan-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      /api/v1/tiles/sar/sbas/{stackId}/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png
                    </code>
                    <button
                      onClick={() => handleCopy(buildSbasTileUrl(stackId, '{z}', '{x}', '{y}'), 'tile_sbas')}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Copy URL"
                    >
                      {copiedKey === 'tile_sbas' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (onApplyTileLayer) {
                        const url = buildSbasTileUrl(stackId, '{z}', '{x}', '{y}');
                        onApplyTileLayer({
                          id: `sbas_${stackId}`,
                          name: `SBAS InSAR (${stackId})`,
                          tileUrl: url,
                          opacity: 0.85,
                          maxZoom: 18
                        });
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/50 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Stream SBAS Displacement to Map</span>
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: Topographic Illumination Minnaert & C-Correction */}
          {activeTab === 'topographic_minnaert' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Parameters Panel */}
              <div className="lg:col-span-5 space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
                    <Mountain className="w-4 h-4" />
                    <span>Topographic Solar Radiometric Correction</span>
                  </div>
                  <span className="text-xs text-slate-500">Minnaert & Teillet C</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Collection</label>
                    <select
                      value={topoCollection}
                      onChange={(e) => setTopoCollection(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="sentinel-2-l2a">Sentinel-2 L2A</option>
                      <option value="landsat-c2-l2">Landsat-C2-L2</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">DEM Source</label>
                    <select
                      value={demId}
                      onChange={(e) => setDemId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="cop-dem-glo-30">Copernicus GLO-30 (30m)</option>
                      <option value="cop-dem-glo-90">Copernicus GLO-90 (90m)</option>
                      <option value="nasadem">NASADEM (30m)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Observation Scene ID</label>
                  <input
                    type="text"
                    value={topoItemId}
                    onChange={(e) => setTopoItemId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-emerald-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Radiometric Correction Model</label>
                  <select
                    value={topoMethod}
                    onChange={(e) => setTopoMethod(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                  >
                    {TOPOGRAPHIC_CORRECTION_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Sun Geometry */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Solar Zenith (θs)</span>
                      <span className="font-mono text-emerald-400">{solarZenithDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="85"
                      step="0.5"
                      value={solarZenithDeg}
                      onChange={(e) => setSolarZenithDeg(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Solar Azimuth (ϕs)</span>
                      <span className="font-mono text-emerald-400">{solarAzimuthDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={solarAzimuthDeg}
                      onChange={(e) => setSolarAzimuthDeg(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* Terrain Slope & Aspect */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Terrain Slope (θn)</span>
                      <span className="font-mono text-emerald-400">{slopeDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="75"
                      step="0.5"
                      value={slopeDeg}
                      onChange={(e) => setSlopeDeg(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Terrain Aspect (ϕn)</span>
                      <span className="font-mono text-emerald-400">{aspectDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={aspectDeg}
                      onChange={(e) => setAspectDeg(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* Model Specific Exponents */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Minnaert k Exponent</span>
                      <span className="font-mono text-emerald-400">{minnaertK}</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.00"
                      step="0.02"
                      value={minnaertK}
                      onChange={(e) => setMinnaertK(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Teillet C Parameter</span>
                      <span className="font-mono text-emerald-400">{cParameter}</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="1.00"
                      step="0.01"
                      value={cParameter}
                      onChange={(e) => setCParameter(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExecuteTopo}
                    disabled={loadingTopo}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingTopo ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mountain className="w-4 h-4" />}
                    <span>Normalize Topographic Illumination</span>
                  </button>
                </div>
              </div>

              {/* Analytical Results & Visuals */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Local Incidence Angle</div>
                    <div className="text-xl font-bold font-mono text-emerald-300">
                      {currentTopo.local_incidence_angle_deg}°
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">cos i = {currentTopo.cos_i}</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Mean Factor</div>
                    <div className="text-xl font-bold font-mono text-teal-300">
                      {currentTopo.mean_correction_factor}x
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Radiometric scaling</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Shadowing</div>
                    <div className={`text-xl font-bold font-mono ${currentTopo.is_shadowed ? 'text-red-400' : 'text-green-400'}`}>
                      {currentTopo.is_shadowed ? 'Self-Shadowed' : 'Direct Sun'}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{currentTopo.is_shadowed ? 'cos i < 0.05' : 'Illuminated slope'}</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Illumination Tier</div>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${
                        currentTopo.tier_metadata?.badgeClass || 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {currentTopo.tier_metadata?.label || currentTopo.illumination_tier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Band Reflectance Comparison Chart */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                      <BarChart3 className="w-4 h-4 text-emerald-400" />
                      <span>Multi-Band Reflectance Correction ({currentTopo.method})</span>
                    </div>
                    <span className="text-xs text-slate-400">Slope {currentTopo.slope_deg}° / Aspect {currentTopo.aspect_deg}°</span>
                  </div>
                  <div className="h-56">
                    <Bar
                      data={topoChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { labels: { color: '#cbd5e1', font: { size: 11 } } },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `${ctx.dataset.label}: ${(ctx.raw * 100).toFixed(2)}%`
                            }
                          }
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
                          y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 11 } } }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Map Streaming & Export Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Tile Endpoint:</span>
                    <code className="text-xs font-mono text-emerald-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      /api/v1/tiles/preprocessing/topographic-minnaert/{topoCollection}/{topoItemId}/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png
                    </code>
                    <button
                      onClick={() => handleCopy(buildTopographicMinnaertTileUrl(topoCollection, topoItemId, '{z}', '{x}', '{y}'), 'tile_topo')}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Copy URL"
                    >
                      {copiedKey === 'tile_topo' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (onApplyTileLayer) {
                        const url = buildTopographicMinnaertTileUrl(topoCollection, topoItemId, '{z}', '{x}', '{y}');
                        onApplyTileLayer({
                          id: `topo_minnaert_${topoItemId}`,
                          name: `Topographic Minnaert (${topoItemId})`,
                          tileUrl: url,
                          opacity: 0.85,
                          maxZoom: 18
                        });
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/50 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Stream Minnaert Layer to Map</span>
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: Automated Sub-Pixel Tie-Point RPC Alignment */}
          {activeTab === 'tie_point_rpc' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Parameters Panel */}
              <div className="lg:col-span-5 space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center space-x-2 text-indigo-400 font-semibold text-sm">
                    <Crosshair className="w-4 h-4" />
                    <span>Sub-Pixel Tie-Point RPC Optimization</span>
                  </div>
                  <span className="text-xs text-slate-500">Grodecki & Dial (2003)</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Target Image ID</label>
                    <input
                      type="text"
                      value={rpcImageId}
                      onChange={(e) => setRpcImageId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-indigo-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Reference Ortho ID</label>
                    <input
                      type="text"
                      value={referenceOrthoId}
                      onChange={(e) => setReferenceOrthoId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Adjustment Transformation Model</label>
                  <select
                    value={adjustmentModel}
                    onChange={(e) => setAdjustmentModel(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none"
                  >
                    {RPC_ADJUSTMENT_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Correlation and RANSAC Thresholds */}
                <div className="space-y-3 pt-1">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">Min Correlation Threshold (NCC)</span>
                      <span className="font-mono text-indigo-400 font-medium">{minCorrelationThreshold}</span>
                    </div>
                    <input
                      type="range"
                      min="0.50"
                      max="0.95"
                      step="0.05"
                      value={minCorrelationThreshold}
                      onChange={(e) => setMinCorrelationThreshold(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">RANSAC Outlier Threshold</span>
                      <span className="font-mono text-indigo-400 font-medium">{ransacThresholdPx} px</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="5.0"
                      step="0.1"
                      value={ransacThresholdPx}
                      onChange={(e) => setRansacThresholdPx(parseFloat(e.target.value))}
                      className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>
                </div>

                {/* Requested Points & GSD */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">Target Tie Points</label>
                    <input
                      type="number"
                      min="16"
                      max="144"
                      step="16"
                      value={requestedTiePoints}
                      onChange={(e) => setRequestedTiePoints(parseInt(e.target.value, 10))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">GSD (meters/px)</label>
                    <input
                      type="number"
                      min="0.05"
                      max="5.0"
                      step="0.05"
                      value={groundSamplingDistanceM}
                      onChange={(e) => setGroundSamplingDistanceM(parseFloat(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleExecuteRpc}
                    disabled={loadingRpc}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl text-sm transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {loadingRpc ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                    <span>Refine RPC Geometric Parameters</span>
                  </button>
                </div>
              </div>

              {/* Analytical Results & Visuals */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Posterior RMSE</div>
                    <div className="text-xl font-bold font-mono text-emerald-400">
                      {currentRpc.rmse_posterior_px} px
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">Prior: {currentRpc.rmse_prior_px} px</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Ground Metric Error</div>
                    <div className="text-xl font-bold font-mono text-indigo-300">
                      {currentRpc.rmse_posterior_meters} m
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">GSD {groundSamplingDistanceM}m</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Inlier Consensus</div>
                    <div className="text-xl font-bold font-mono text-cyan-400">
                      {currentRpc.inlier_tie_points} / {currentRpc.total_candidate_points}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{currentRpc.outlier_points} outliers filtered</div>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                    <div className="text-xs text-slate-400 mb-1">Accuracy Tier</div>
                    <div className="mt-1">
                      <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-md border ${
                        currentRpc.tier_metadata?.badgeClass || 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                      }`}>
                        {currentRpc.tier_metadata?.label || currentRpc.geometric_accuracy_tier}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Residual Distribution Chart */}
                <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2 text-sm font-semibold text-white">
                      <BarChart3 className="w-4 h-4 text-indigo-400" />
                      <span>Post-Alignment Residual Error Distribution (Sample Tie-Points)</span>
                    </div>
                    <span className="text-xs text-slate-400">Shift: Δc={currentRpc.shift_col_px}px, Δr={currentRpc.shift_row_px}px</span>
                  </div>
                  <div className="h-56">
                    <Bar
                      data={rpcChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => `Residual: ${ctx.raw} px`
                            }
                          }
                        },
                        scales: {
                          x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                          y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { size: 11 } } }
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Map Streaming & Export Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-950/40 rounded-xl border border-slate-800">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Tile Endpoint:</span>
                    <code className="text-xs font-mono text-indigo-300 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                      /api/v1/tiles/ortho/tie-point-rpc/{rpcImageId}/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;.png
                    </code>
                    <button
                      onClick={() => handleCopy(buildTiePointRpcTileUrl(rpcImageId, '{z}', '{x}', '{y}'), 'tile_rpc')}
                      className="p-1 hover:text-white text-slate-400 transition-colors"
                      title="Copy URL"
                    >
                      {copiedKey === 'tile_rpc' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="flex items-center space-x-2">
                    {onApplyTiePoints && (
                      <button
                        onClick={() => onApplyTiePoints(currentRpc.tie_points_sample || [])}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-all"
                      >
                        Display Tie-Point Vectors
                      </button>
                    )}

                    <button
                      onClick={() => {
                        if (onApplyTileLayer) {
                          const url = buildTiePointRpcTileUrl(rpcImageId, '{z}', '{x}', '{y}');
                          onApplyTileLayer({
                            id: `rpc_${rpcImageId}`,
                            name: `RPC Alignment (${rpcImageId})`,
                            tileUrl: url,
                            opacity: 0.85,
                            maxZoom: 20
                          });
                        }
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/50 rounded-xl text-xs font-semibold transition-all"
                    >
                      <Layers className="w-4 h-4" />
                      <span>Stream RPC Alignment to Map</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
