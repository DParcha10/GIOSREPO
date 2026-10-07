import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Cpu, Layers, Play, CheckCircle2, 
  Clock, Download, MapPin, Eye, FileText, 
  Sliders, Box, AlertTriangle, ArrowRight,
  RotateCcw, Sparkles
} from 'lucide-react';
import { submitOdmTask, getOdmTaskStatus } from '../api/giosApi';
import { 
  ODM_TASK_STATUSES,
  ODM_PROCESSING_STAGES,
  ODM_STAGE_CONFIGS,
  calculateOdmStageProgress
} from '../config/constants';

const STAGE_ORDER = [
  ODM_PROCESSING_STAGES.QUEUED,
  ODM_PROCESSING_STAGES.DATASET_INITIALIZATION,
  ODM_PROCESSING_STAGES.STRUCTURE_FROM_MOTION,
  ODM_PROCESSING_STAGES.MVS_DENSE_POINT_CLOUD,
  ODM_PROCESSING_STAGES.DEM_SURFACE_EXTRACTION,
  ODM_PROCESSING_STAGES.ORTHOPHOTO_MOSAICING,
  ODM_PROCESSING_STAGES.COG_EXPORT_AND_INDEXING,
  ODM_PROCESSING_STAGES.COMPLETED
];

export default function PhotogrammetryQueueModal({
  isOpen,
  onClose,
  onApplyTileLayer = null
}) {
  // Mission configuration parameters
  const [projectName, setProjectName] = useState('Embankment_Drone_Survey_2026');
  const [imageCount, setImageCount] = useState(120);
  const [gsdTargetCm, setGsdTargetCm] = useState(2.5);
  const [cameraSensor, setCameraSensor] = useState('Zenmuse P1 35mm (45MP)');
  const [featureQuality, setFeatureQuality] = useState('high');
  const [demResolutionCm, setDemResolutionCm] = useState(5.0);
  const [enableCsfFilter, setEnableCsfFilter] = useState(true);
  const [generate3dMesh, setGenerate3dMesh] = useState(true);

  // Runtime state
  const [currentStage, setCurrentStage] = useState('queued');
  const [taskStatus, setTaskStatus] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'artifacts' | 'specs'
  const [copiedKey, setCopiedKey] = useState(null);

  const simulationTimerRef = useRef(null);

  // Initialize status on open
  useEffect(() => {
    if (isOpen && !taskStatus) {
      const initial = calculateOdmStageProgress('queued', 0, imageCount, gsdTargetCm);
      setTaskStatus(initial);
      setCurrentStage('queued');
      setElapsedSeconds(0);
    }
  }, [isOpen, taskStatus, imageCount, gsdTargetCm]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, []);

  // Handle auto simulation progression
  useEffect(() => {
    if (isAutoSimulating) {
      simulationTimerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const nextSec = prev + 5;
          setCurrentStage((prevStage) => {
            const currentIdx = STAGE_ORDER.indexOf(prevStage);
            if (currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1) {
              const nextStage = STAGE_ORDER[currentIdx + 1];
              const updated = calculateOdmStageProgress(nextStage, nextSec, imageCount, gsdTargetCm);
              setTaskStatus(updated);
              return nextStage;
            } else {
              setIsAutoSimulating(false);
              return prevStage;
            }
          });
          return nextSec;
        });
      }, 2500);
    } else {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    }
    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, [isAutoSimulating, imageCount, gsdTargetCm]);

  if (!isOpen) return null;

  const handleCopy = (text, key) => {
    navigator.clipboard?.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStartMission = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        project_name: projectName,
        image_count: Number(imageCount),
        gsd_target_cm: Number(gsdTargetCm),
        camera_sensor: cameraSensor,
        feature_quality: featureQuality,
        dem_resolution_cm: Number(demResolutionCm),
        enable_csf_filter: enableCsfFilter,
        generate_3d_mesh: generate3dMesh
      };
      const res = await submitOdmTask(payload);
      const computed = res?.data || res || calculateOdmStageProgress('dataset_initialization', 15.0, imageCount, gsdTargetCm);
      setTaskStatus(computed);
      setCurrentStage('dataset_initialization');
      setElapsedSeconds(15.0);
      setIsAutoSimulating(true);
    } catch {
      const fallback = calculateOdmStageProgress('dataset_initialization', 15.0, imageCount, gsdTargetCm);
      setTaskStatus(fallback);
      setCurrentStage('dataset_initialization');
      setElapsedSeconds(15.0);
      setIsAutoSimulating(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepToStage = async (stageKey) => {
    const nextSec = elapsedSeconds + 20;
    setElapsedSeconds(nextSec);
    setCurrentStage(stageKey);
    try {
      const res = await getOdmTaskStatus(taskStatus?.task_id || 'ODM_TASK_20261001_001');
      if (res && res.current_stage === stageKey) {
        setTaskStatus(res);
        return;
      }
    } catch {
      // fallback
    }
    const updated = calculateOdmStageProgress(stageKey, nextSec, imageCount, gsdTargetCm);
    setTaskStatus(updated);
  };

  const handleResetMission = () => {
    setIsAutoSimulating(false);
    setElapsedSeconds(0);
    setCurrentStage('queued');
    const resetStatus = calculateOdmStageProgress('queued', 0, imageCount, gsdTargetCm);
    setTaskStatus(resetStatus);
  };

  const currentStageIndex = STAGE_ORDER.indexOf(currentStage);
  const currentStageMeta = ODM_STAGE_CONFIGS[currentStage] || ODM_STAGE_CONFIGS.queued;
  const progressPercent = taskStatus?.progress_percent ?? 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  NodeODM Photogrammetry Processing Queue
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  Worker v2.5.10
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  GPU Accelerated
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Asynchronous OpenSfM / OpenMVS pipeline for centimeter-resolution drone orthomosaics & DEM extraction.
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
            title="Close Photogrammetry Queue"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="flex gap-2 py-2">
            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Pipeline & Queue Progress</span>
            </button>
            <button
              onClick={() => setActiveTab('artifacts')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'artifacts'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Deliverable Artifacts</span>
              {taskStatus?.artifacts && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('specs')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'specs'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Mission Parameters</span>
            </button>
          </div>

          {/* Quick status indicator */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-slate-400">Status:</span>
              <span 
                className="px-2 py-0.5 rounded text-[11px] font-bold uppercase"
                style={{ 
                  backgroundColor: `${currentStageMeta.badge_color}25`, 
                  color: currentStageMeta.badge_color,
                  border: `1px solid ${currentStageMeta.badge_color}50` 
                }}
              >
                {taskStatus?.status || ODM_TASK_STATUSES.QUEUED}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>{Math.floor(elapsedSeconds)}s elapsed</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: PIPELINE PROGRESSION */}
          {activeTab === 'pipeline' && (
            <div className="space-y-6">
              
              {/* Active Stage & Progress Banner */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Current Photogrammetry Stage:</span>
                      <span 
                        className="text-sm font-bold font-mono px-2.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: `${currentStageMeta.badge_color}20`, 
                          color: currentStageMeta.badge_color,
                          border: `1px solid ${currentStageMeta.badge_color}60`
                        }}
                      >
                        {currentStageMeta.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {currentStageMeta.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono text-sky-400">
                      {progressPercent.toFixed(1)}%
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      {taskStatus?.estimated_remaining_seconds > 0 
                        ? `~${Math.ceil(taskStatus.estimated_remaining_seconds)}s remaining` 
                        : (currentStage === 'completed' ? 'Processing Complete' : 'Calculating...')}
                    </div>
                  </div>
                </div>

                {/* Main Progress Bar */}
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-700 relative overflow-hidden"
                    style={{ width: `${Math.min(100, Math.max(2, progressPercent))}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                  </div>
                </div>
              </div>

              {/* Multi-Stage Stepper Track */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>8-Stage Reconstruction Stepper</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAutoSimulating(!isAutoSimulating)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase transition-all shadow ${
                        isAutoSimulating
                          ? 'bg-amber-600 hover:bg-amber-500 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isAutoSimulating ? (
                        <>
                          <Clock className="w-3 h-3 animate-spin" />
                          <span>Pause Simulation</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          <span>Auto-Advance Pipeline</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleResetMission}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-all flex items-center gap-1"
                      title="Reset Pipeline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  </div>
                </div>

                {/* Stage Grid Stepper */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {STAGE_ORDER.map((stgKey, idx) => {
                    const meta = ODM_STAGE_CONFIGS[stgKey];
                    const isPassed = currentStageIndex > idx || currentStage === 'completed';
                    const isCurrent = currentStage === stgKey && currentStage !== 'completed';
                    const isCompleteStage = stgKey === 'completed' && currentStage === 'completed';

                    return (
                      <div
                        key={stgKey}
                        onClick={() => handleStepToStage(stgKey)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all relative overflow-hidden ${
                          isCurrent
                            ? 'bg-sky-950/40 border-sky-500/80 shadow-[0_0_15px_rgba(56,189,248,0.2)]'
                            : isPassed || isCompleteStage
                            ? 'bg-slate-900/60 border-emerald-500/40 opacity-90'
                            : 'bg-slate-950/40 border-slate-800 opacity-60 hover:opacity-90'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            STEP {idx + 1}
                          </span>
                          {isPassed || isCompleteStage ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : isCurrent ? (
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                          ) : (
                            <span className="text-[9px] font-mono text-slate-500">{meta.progress_range[0]}%</span>
                          )}
                        </div>

                        <div className="text-xs font-bold text-slate-200 line-clamp-1 mb-1">
                          {meta.label}
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                          {meta.description}
                        </p>

                        {isCurrent && (
                          <div 
                            className="absolute bottom-0 left-0 right-0 h-0.5 bg-sky-400 animate-pulse" 
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Telemetry & Computed Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Input Images</div>
                  <div className="text-lg font-bold font-mono text-white mt-1">
                    {taskStatus?.image_count || imageCount}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">EXIF calibrated & georeferenced</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Reconstructed 3D Points</div>
                  <div className="text-lg font-bold font-mono text-indigo-300 mt-1">
                    {taskStatus?.reconstructed_points?.toLocaleString() || '0'} pts
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">OpenMVS dense point field</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Achieved GSD</div>
                  <div className="text-lg font-bold font-mono text-emerald-300 mt-1">
                    {taskStatus?.gsd_achieved_cm ?? gsdTargetCm} cm/px
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Ground Sampling Distance</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Reprojection RMSE</div>
                  <div className="text-lg font-bold font-mono text-sky-300 mt-1">
                    {taskStatus?.rmse_reprojection_px ?? 0.42} px
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Sub-pixel bundle adjustment</div>
                </div>
              </div>

              {/* Ready Artifacts Quick Banner */}
              {taskStatus?.artifacts && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-slate-950/60 border border-emerald-500/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-emerald-300">
                        Deliverable Orthomosaic & Cloud-Optimized GeoTIFF Online
                      </div>
                      <div className="text-xs text-slate-300">
                        Pyramidal overviews generated. Dynamic XYZ tile streaming is online and ready for Leaflet map overlay.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onApplyTileLayer && taskStatus?.tile_url_template) {
                          onApplyTileLayer(taskStatus.tile_url_template, 'NodeODM Drone Orthomosaic');
                          onClose();
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Stream on Map</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('artifacts')}
                      className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium transition-all"
                    >
                      View All Deliverables
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: DELIVERABLE ARTIFACTS */}
          {activeTab === 'artifacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Photogrammetric Deliverables & Data Assets</h3>
                  <p className="text-xs text-slate-400">
                    High-resolution geospatial rasters and 3D point cloud assets produced by the NodeODM worker.
                  </p>
                </div>
                {taskStatus?.tile_url_template && (
                  <button
                    onClick={() => {
                      if (onApplyTileLayer) {
                        onApplyTileLayer(taskStatus.tile_url_template, 'NodeODM Drone Orthomosaic');
                        onClose();
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Overlay on Active Map</span>
                  </button>
                )}
              </div>

              {taskStatus?.artifacts ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  
                  {/* Orthophoto COG */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        True Orthomosaic (COG)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300">
                        GeoTIFF RGBA
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Color-balanced seamline-blended orthophoto at {taskStatus?.gsd_achieved_cm ?? 2.5} cm ground sampling distance.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(taskStatus.artifacts.orthophoto_asset_url, 'ortho')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>{copiedKey === 'ortho' ? 'Copied URL!' : 'Copy Asset URL'}</span>
                      </button>
                      <button
                        onClick={() => handleCopy(taskStatus.tile_url_template, 'tile')}
                        className="px-2.5 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 text-xs font-mono text-sky-300 flex items-center gap-1 transition-all"
                      >
                        <span>{copiedKey === 'tile' ? 'Copied Tile XYZ!' : 'Copy Tile XYZ'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Digital Surface Model (DSM) */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                        <Box className="w-4 h-4" />
                        Digital Surface Model (DSM)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/20 text-sky-300">
                        Float32 Elevation
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      2.5D topographic canopy and structure elevation raster derived from OpenMVS dense point densification.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(taskStatus.artifacts.dsm_asset_url, 'dsm')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>{copiedKey === 'dsm' ? 'Copied URL!' : 'Copy Asset URL'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Digital Terrain Model (DTM) */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        Digital Terrain Model (DTM)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300">
                        CSF Bare Earth
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Cloth Simulation Filter bare-earth ground model with vegetation, berms, and equipment stripped.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(taskStatus.artifacts.dtm_asset_url, 'dtm')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>{copiedKey === 'dtm' ? 'Copied URL!' : 'Copy Asset URL'}</span>
                      </button>
                    </div>
                  </div>

                  {/* 3D Point Cloud LAZ */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                        <Box className="w-4 h-4" />
                        Dense Point Cloud (.LAZ)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-500/20 text-purple-300">
                        LASzip Classified
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Georeferenced RGB point cloud containing {taskStatus?.reconstructed_points?.toLocaleString() || '1,782,000'} points.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(taskStatus.artifacts.point_cloud_asset_url, 'laz')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>{copiedKey === 'laz' ? 'Copied URL!' : 'Copy Asset URL'}</span>
                      </button>
                    </div>
                  </div>

                  {/* PDF Quality Report */}
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 md:col-span-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        Photogrammetry Quality & Camera Calibration Report (PDF)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/20 text-amber-300">
                        Audit Certified
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      Includes reprojection residual vectors, camera intrinsic focal length adjustments, tie-point density maps, and GCP verification stats.
                    </p>
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleCopy(taskStatus.artifacts.report_pdf_url, 'pdf')}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 flex items-center gap-1 transition-all"
                      >
                        <Download className="w-3 h-3" />
                        <span>{copiedKey === 'pdf' ? 'Copied URL!' : 'Copy Report URL'}</span>
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800/80 text-slate-400 flex items-center justify-center mx-auto">
                    <Layers className="w-6 h-6 animate-pulse" />
                  </div>
                  <div className="text-sm font-bold text-slate-300">Artifacts Still Generating</div>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Deliverables will appear here once the pipeline advances through the COG export and indexing stage. Advance the pipeline in the Pipeline tab to view outputs.
                  </p>
                  <button
                    onClick={() => handleStepToStage('cog_export_and_indexing')}
                    className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold transition-all shadow"
                  >
                    Advance to COG Export Stage
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MISSION PARAMETERS */}
          {activeTab === 'specs' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Photogrammetric Mission Configuration</h3>
                <p className="text-xs text-slate-400">
                  Calibrate camera intrinsics, feature matching density, and DEM surface extraction parameters.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Project Title */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">Project Identifier</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Camera Sensor */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">Optical Payload & Sensor</label>
                  <select
                    value={cameraSensor}
                    onChange={(e) => setCameraSensor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Zenmuse P1 35mm (45MP)">DJI Zenmuse P1 35mm Full-Frame (45 MP)</option>
                    <option value="Phantom 4 RTK 24mm (20MP)">DJI Phantom 4 RTK Mechanical Shutter (20 MP)</option>
                    <option value="Sony RX1R II 35mm (42MP)">Sony RX1R II Fixed 35mm (42 MP)</option>
                    <option value="MicaSense RedEdge-P (MS+PAN)">MicaSense RedEdge-P Multispectral + Panchromatic</option>
                  </select>
                </div>

                {/* Image Count Slider */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Flight Survey Photos:</span>
                    <span className="text-sky-400 font-bold">{imageCount} images</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="450"
                    step="10"
                    value={imageCount}
                    onChange={(e) => setImageCount(Number(e.target.value))}
                    className="w-full accent-sky-500 cursor-pointer"
                  />
                </div>

                {/* Target GSD Slider */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Target Ground Sampling Distance:</span>
                    <span className="text-emerald-400 font-bold">{gsdTargetCm} cm/px</span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="10.0"
                    step="0.5"
                    value={gsdTargetCm}
                    onChange={(e) => setGsdTargetCm(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                {/* Feature Matching Quality */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                  <label className="text-xs font-mono text-slate-400">OpenSfM Feature Matching Density</label>
                  <select
                    value={featureQuality}
                    onChange={(e) => setFeatureQuality(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="ultra">Ultra (Original Resolution, SIFT + AKAZE)</option>
                    <option value="high">High (Default - Downsampled 2x, SIFT)</option>
                    <option value="medium">Medium (Downsampled 4x, Fast SfM)</option>
                    <option value="low">Low (Fast Preview 8x)</option>
                  </select>
                </div>

                {/* DEM Resolution Slider */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">DSM/DTM Grid Cell Size:</span>
                    <span className="text-indigo-400 font-bold">{demResolutionCm} cm</span>
                  </div>
                  <input
                    type="range"
                    min="2.0"
                    max="20.0"
                    step="1.0"
                    value={demResolutionCm}
                    onChange={(e) => setDemResolutionCm(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

              </div>

              {/* Toggles */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={enableCsfFilter}
                    onChange={(e) => setEnableCsfFilter(e.target.checked)}
                    className="accent-sky-500 rounded"
                  />
                  <span>Cloth Simulation Filter (CSF) Ground Classification</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-slate-300">
                  <input
                    type="checkbox"
                    checked={generate3dMesh}
                    onChange={(e) => setGenerate3dMesh(e.target.checked)}
                    className="accent-indigo-500 rounded"
                  />
                  <span>Generate Textured 3D Mesh (.OBJ / .GLTF)</span>
                </label>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleStartMission}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-mono text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Submitting to NodeODM Queue...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      <span>Dispatch Drone Mission to Queue</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Worker Node: `gpu-odm-worker-01`</span>
            <span className="text-slate-600">|</span>
            <span>Task ID: {taskStatus?.task_id || 'ODM_TASK_20261001_001'}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
            >
              Close
            </button>
            {taskStatus?.tile_url_template && (
              <button
                onClick={() => {
                  if (onApplyTileLayer) {
                    onApplyTileLayer(taskStatus.tile_url_template, 'NodeODM Drone Orthomosaic');
                    onClose();
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Apply to Map</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
