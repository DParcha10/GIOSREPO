import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X, Camera, Layers, Crosshair, Play, RotateCcw,
  Clock, Download, MapPin, Eye, Copy, Plus, Trash2,
  Sparkles, Grid, FileSpreadsheet, Activity,
  HardDrive, Gauge, Image as ImageIcon, ArrowRight,
  Compass, UploadCloud, AlertOctagon, Check
} from 'lucide-react';
import {
  createDronePhotogrammetryTask,
  cancelDronePhotogrammetryTask,
  restartDronePhotogrammetryTask,
  getDronePhotogrammetryTileUrlTemplate,
  simulateDronePhotogrammetryTask
} from '../api/giosApi';
import {
  DRONE_CAMERA_PRESETS,
  DRONE_PHOTOGRAMMETRY_TILE_METRIC_CONFIGS,
  NODEODM_PIPELINE_STAGE_METADATA,
  solveGcpAffineTransform,
  calculateDroneFlightPlan,
  formatOdmGcpFile,
  parseOdmGcpFile
} from '../config/constants';

// Benchmark Pre-Configured Photogrammetry Survey Missions
const PRESET_MISSIONS = {
  san_luis_crest: {
    id: 'san_luis_crest',
    task_id: 'ODM-BENCHMARK-001',
    project_name: 'San Luis Dam Crest High-Resolution Photogrammetry Survey',
    description: 'High-precision centimeter UAV survey of San Luis Dam crest, freeboard revetment, and upstream impoundment slope with sub-pixel GCP georeferencing.',
    camera_model: 'DJI_FC6310R',
    target_gsd_cm: 2.5,
    forward_overlap_percent: 80,
    side_overlap_percent: 70,
    survey_area_ha: 25.0,
    flight_speed_ms: 10.0,
    image_count: 120,
    center: [37.0582, -121.0744],
    footprint: [
      [37.0540, -121.0820],
      [37.0540, -121.0700],
      [37.0640, -121.0700],
      [37.0640, -121.0820],
      [37.0540, -121.0820]
    ],
    gcps: [
      {
        gcp_id: 'GCP-01',
        name: 'Crest Station A Benchmark',
        pixel_x: 500.0,
        pixel_y: 450.0,
        world_x: 671230.12,
        world_y: 4103140.45,
        elevation_z: 165.40,
        lat: 37.0585,
        lng: -121.0745,
        is_check_point: false,
        is_enabled: true
      },
      {
        gcp_id: 'GCP-02',
        name: 'Crest Station B Benchmark',
        pixel_x: 4800.0,
        pixel_y: 520.0,
        world_x: 671450.88,
        world_y: 4103000.12,
        elevation_z: 165.25,
        lat: 37.0572,
        lng: -121.0720,
        is_check_point: false,
        is_enabled: true
      },
      {
        gcp_id: 'GCP-03',
        name: 'Downstream Toe Target',
        pixel_x: 600.0,
        pixel_y: 3200.0,
        world_x: 671010.55,
        world_y: 4103280.90,
        elevation_z: 164.95,
        lat: 37.0598,
        lng: -121.0770,
        is_check_point: false,
        is_enabled: true
      },
      {
        gcp_id: 'CHK-01',
        name: 'Spillway Basin Check Point',
        pixel_x: 4700.0,
        pixel_y: 3150.0,
        world_x: 671320.40,
        world_y: 4103090.60,
        elevation_z: 165.10,
        lat: 37.0580,
        lng: -121.0735,
        is_check_point: true,
        is_enabled: true
      }
    ]
  },
  brumadinho_tailings: {
    id: 'brumadinho_tailings',
    task_id: 'ODM-TAILINGS-2026',
    project_name: 'Brumadinho Tailings Upstream Embankment Survey',
    description: 'Multi-temporal centimeter drone photogrammetry monitoring unseasonal moisture accumulation, slope toe slumping, and structural crest creep.',
    camera_model: 'DJI_P1_35',
    target_gsd_cm: 2.0,
    forward_overlap_percent: 85,
    side_overlap_percent: 75,
    survey_area_ha: 40.0,
    flight_speed_ms: 8.0,
    image_count: 180,
    center: [-20.1200, -44.1200],
    footprint: [
      [-20.1250, -44.1250],
      [-20.1250, -44.1150],
      [-20.1150, -44.1150],
      [-20.1150, -44.1250],
      [-20.1250, -44.1250]
    ],
    gcps: [
      {
        gcp_id: 'GCP-BRU-01',
        name: 'North Abutment Station 1',
        pixel_x: 620.0,
        pixel_y: 480.0,
        world_x: 591820.50,
        world_y: 7775120.30,
        elevation_z: 840.50,
        lat: -20.1180,
        lng: -44.1220,
        is_check_point: false,
        is_enabled: true
      },
      {
        gcp_id: 'GCP-BRU-02',
        name: 'South Abutment Station 2',
        pixel_x: 4950.0,
        pixel_y: 530.0,
        world_x: 592180.10,
        world_y: 7774980.20,
        elevation_z: 838.20,
        lat: -20.1220,
        lng: -44.1180,
        is_check_point: false,
        is_enabled: true
      },
      {
        gcp_id: 'GCP-BRU-03',
        name: 'Tailings Retention Toe Pin',
        pixel_x: 750.0,
        pixel_y: 3350.0,
        world_x: 591740.80,
        world_y: 7774850.90,
        elevation_z: 812.10,
        lat: -20.1240,
        lng: -44.1235,
        is_check_point: false,
        is_enabled: true
      },
      {
        gcp_id: 'CHK-BRU-01',
        name: 'Tailings Slurry Decant Check Point',
        pixel_x: 4600.0,
        pixel_y: 3200.0,
        world_x: 592050.40,
        world_y: 7774780.00,
        elevation_z: 815.40,
        lat: -20.1230,
        lng: -44.1195,
        is_check_point: true,
        is_enabled: true
      }
    ]
  }
};

const STAGE_ORDER = [
  'queued',
  'dataset_initialization',
  'feature_extraction_matching',
  'structure_from_motion',
  'mvs_dense_point_cloud',
  'dem_csf_surface_extraction',
  'orthophoto_mosaicing',
  'cog_pyramidal_tiles',
  'completed'
];

/**
 * Sub-Pixel Crosshair Target Visualizer Component
 */
function SubPixelCrosshairCanvas({ pixelX = 2736, pixelY = 1824, pointId = 'GCP-01' }) {
  return (
    <div className="relative w-40 h-40 bg-zinc-950 rounded-lg border border-cyan-500/40 overflow-hidden flex items-center justify-center shadow-inner group">
      {/* High-zoom synthetic pixel grid background */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #06b6d4 1px, transparent 1px), linear-gradient(to bottom, #06b6d4 1px, transparent 1px)',
          backgroundSize: '16px 16px'
        }}
      />
      {/* Target checkerboard quadrants */}
      <div className="absolute w-24 h-24 rounded-full border border-cyan-400/50 flex flex-wrap overflow-hidden opacity-40">
        <div className="w-12 h-12 bg-cyan-400/30" />
        <div className="w-12 h-12 bg-transparent" />
        <div className="w-12 h-12 bg-transparent" />
        <div className="w-12 h-12 bg-cyan-400/30" />
      </div>
      {/* Concentric rings */}
      <div className="absolute w-16 h-16 rounded-full border border-cyan-400/60 animate-pulse" />
      <div className="absolute w-8 h-8 rounded-full border border-sky-300" />
      <div className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />

      {/* Sub-pixel crosshair lines */}
      <div className="absolute w-full h-[1px] bg-cyan-400/80" />
      <div className="absolute h-full w-[1px] bg-cyan-400/80" />

      {/* Sub-pixel readout badge */}
      <div className="absolute bottom-1 right-1.5 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-mono text-cyan-300 border border-cyan-500/30">
        [{pixelX.toFixed(1)}, {pixelY.toFixed(1)}] px
      </div>
      <div className="absolute top-1 left-1.5 px-1.5 py-0.5 bg-black/80 rounded text-[9px] font-mono text-white font-bold border border-cyan-500/30">
        {pointId}
      </div>
    </div>
  );
}

export default function DronePhotogrammetryModal({
  isOpen,
  onClose,
  _activeTask = null,
  onApplyTileLayer = null,
  onStartGcpPinning = null,
  pinnedCoordinates = null
}) {
  // Navigation & tabs
  const [activeTab, setActiveTab] = useState('mission'); // 'mission' | 'dropzone' | 'gcp' | 'pipeline' | 'artifacts'
  const [selectedPresetKey, setSelectedPresetKey] = useState('san_luis_crest');

  // Mission configuration
  const [projectName, setProjectName] = useState(PRESET_MISSIONS.san_luis_crest.project_name);
  const [cameraModel, setCameraModel] = useState('DJI_FC6310R');
  const [targetGsdCm, setTargetGsdCm] = useState(2.5);
  const [forwardOverlapPercent, setForwardOverlapPercent] = useState(80);
  const [sideOverlapPercent, setSideOverlapPercent] = useState(70);
  const [surveyAreaHa, setSurveyAreaHa] = useState(25.0);
  const [flightSpeedMs, setFlightSpeedMs] = useState(10.0);
  const [surveyFootprint, setSurveyFootprint] = useState(PRESET_MISSIONS.san_luis_crest.footprint);
  const [surveyCenter, setSurveyCenter] = useState(PRESET_MISSIONS.san_luis_crest.center);

  // Multi-image dropzone state
  const [uploadedImages, setUploadedImages] = useState(() => {
    return Array.from({ length: 120 }, (_, i) => {
      const idxStr = String(i + 1).padStart(4, '0');
      return {
        id: `IMG_${idxStr}`,
        name: `DJI_${idxStr}.JPG`,
        size_bytes: 18450000 + (i % 5) * 450000,
        width: 5472,
        height: 3648,
        latitude: Number((37.0582 + (Math.sin(i) * 0.003)).toFixed(6)),
        longitude: Number((-121.0744 + (Math.cos(i) * 0.003)).toFixed(6)),
        altitude_m: 165.4,
        pitch_deg: -89.5,
        roll_deg: 0.1,
        yaw_deg: (i * 3) % 360,
        iso: 100,
        shutter_speed: '1/1250',
        timestamp: new Date().toISOString()
      };
    });
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // GCP coordinate state
  const [gcps, setGcps] = useState(PRESET_MISSIONS.san_luis_crest.gcps);
  const [selectedGcpIdx, setSelectedGcpIdx] = useState(0);
  const [newGcpId, setNewGcpId] = useState('');
  const [newGcpName, setNewGcpName] = useState('');
  const [newGcpPixelX, setNewGcpPixelX] = useState(2736);
  const [newGcpPixelY, setNewGcpPixelY] = useState(1824);
  const [newGcpWorldX, setNewGcpWorldX] = useState(671300.0);
  const [newGcpWorldY, setNewGcpWorldY] = useState(4103100.0);
  const [newGcpElevationZ, setNewGcpElevationZ] = useState(165.0);
  const [newGcpIsCheckPoint, setNewGcpIsCheckPoint] = useState(false);

  // Pipeline runtime state
  const [taskId, setTaskId] = useState(PRESET_MISSIONS.san_luis_crest.task_id);
  const [currentStage, setCurrentStage] = useState('completed');
  const [taskStatus, setTaskStatus] = useState(() =>
    simulateDronePhotogrammetryTask('ODM-BENCHMARK-001', 'completed', 450.0, 120, 2.5)
  );
  const [isSimulating, setIsSimulating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(380.0);
  const [pipelineError, setPipelineError] = useState(null);
  const simulationTimerRef = useRef(null);

  // Tile layer deliverables
  const [selectedMetric, setSelectedMetric] = useState('orthophoto');
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Load preset scenario
  const applyPresetScenario = useCallback((presetKey) => {
    const preset = PRESET_MISSIONS[presetKey];
    if (!preset) return;
    setSelectedPresetKey(presetKey);
    setProjectName(preset.project_name);
    setCameraModel(preset.camera_model);
    setTargetGsdCm(preset.target_gsd_cm);
    setForwardOverlapPercent(preset.forward_overlap_percent);
    setSideOverlapPercent(preset.side_overlap_percent);
    setSurveyAreaHa(preset.survey_area_ha);
    setFlightSpeedMs(preset.flight_speed_ms);
    setSurveyFootprint(preset.footprint);
    setSurveyCenter(preset.center);
    setGcps(preset.gcps);
    setTaskId(preset.task_id);
    setSelectedGcpIdx(0);

    const syntheticFiles = Array.from({ length: preset.image_count }, (_, i) => {
      const idxStr = String(i + 1).padStart(4, '0');
      const latOffset = (Math.sin(i) * 0.003);
      const lngOffset = (Math.cos(i) * 0.003);
      return {
        id: `IMG_${idxStr}`,
        name: `DJI_${idxStr}.JPG`,
        size_bytes: 18450000 + (i % 5) * 450000,
        width: 5472,
        height: 3648,
        latitude: Number((preset.center[0] + latOffset).toFixed(6)),
        longitude: Number((preset.center[1] + lngOffset).toFixed(6)),
        altitude_m: Number((preset.center[0] > 0 ? 165.0 : 840.0).toFixed(1)),
        pitch_deg: -89.5,
        roll_deg: 0.1,
        yaw_deg: (i * 3) % 360,
        iso: 100,
        shutter_speed: '1/1250',
        timestamp: new Date(Date.now() - (preset.image_count - i) * 2500).toISOString()
      };
    });
    setUploadedImages(syntheticFiles);

    const sim = simulateDronePhotogrammetryTask(preset.task_id, 'completed', 450.0, preset.image_count, preset.target_gsd_cm);
    setTaskStatus(sim);
    setCurrentStage('completed');
  }, []);

  // Handle incoming map click coordinate if pinning is completed
  const processedPinRef = useRef(null);
  useEffect(() => {
    if (pinnedCoordinates && Array.isArray(pinnedCoordinates) && pinnedCoordinates.length === 2) {
      if (processedPinRef.current === pinnedCoordinates) return;
      processedPinRef.current = pinnedCoordinates;

      const [lat, lng] = pinnedCoordinates;
      const approxUtmX = 671230.12 + (lng - (-121.0744)) * 88000.0;
      const approxUtmY = 4103140.45 + (lat - 37.0582) * 111000.0;

      const newPoint = {
        gcp_id: `GCP-${Date.now().toString().slice(-4)}`,
        name: `Map-Pinned Station`,
        pixel_x: 2736.0,
        pixel_y: 1824.0,
        world_x: Number(approxUtmX.toFixed(2)),
        world_y: Number(approxUtmY.toFixed(2)),
        elevation_z: 165.20,
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        is_check_point: false,
        is_enabled: true
      };

      const timer = setTimeout(() => {
        setGcps((prev) => [...prev, newPoint]);
        setActiveTab('gcp');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [pinnedCoordinates]);

  // Clean up simulation timer
  useEffect(() => {
    return () => {
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    };
  }, []);

  // Live flight plan calculation
  const flightPlan = useMemo(() => {
    try {
      return calculateDroneFlightPlan({
        camera_model: cameraModel,
        target_gsd_cm: targetGsdCm,
        forward_overlap_percent: forwardOverlapPercent,
        side_overlap_percent: sideOverlapPercent,
        survey_area_ha: surveyAreaHa,
        flight_speed_ms: flightSpeedMs
      });
    } catch {
      return null;
    }
  }, [cameraModel, targetGsdCm, forwardOverlapPercent, sideOverlapPercent, surveyAreaHa, flightSpeedMs]);

  // Live GCP Affine Geotransform Solution
  const affineSolution = useMemo(() => {
    try {
      return solveGcpAffineTransform(gcps);
    } catch (err) {
      return { error: err.message };
    }
  }, [gcps]);

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (files) => {
    const validExtensions = ['.jpg', '.jpeg', '.dng', '.tif', '.tiff', '.raw'];
    const newItems = [];
    const baseCount = uploadedImages.length;

    Array.from(files).forEach((file, i) => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (validExtensions.includes(ext) || file.type.startsWith('image/')) {
        const idx = baseCount + i + 1;
        const latOffset = (Math.sin(idx) * 0.003);
        const lngOffset = (Math.cos(idx) * 0.003);
        newItems.push({
          id: `IMG_${String(idx).padStart(4, '0')}`,
          name: file.name,
          size_bytes: file.size,
          width: 5472,
          height: 3648,
          latitude: Number((surveyCenter[0] + latOffset).toFixed(6)),
          longitude: Number((surveyCenter[1] + lngOffset).toFixed(6)),
          altitude_m: Number((surveyCenter[0] > 0 ? 165.0 : 840.0).toFixed(1)),
          pitch_deg: -89.7,
          roll_deg: 0.1,
          yaw_deg: (idx * 5) % 360,
          iso: 100,
          shutter_speed: '1/1600',
          timestamp: new Date().toISOString()
        });
      }
    });

    if (newItems.length > 0) {
      setUploadedImages((prev) => [...prev, ...newItems]);
    }
  };

  // GCP Management
  const handleToggleGcpEnabled = (idx) => {
    setGcps((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, is_enabled: !p.is_enabled } : p))
    );
  };

  const handleToggleCheckPoint = (idx) => {
    setGcps((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, is_check_point: !p.is_check_point } : p))
    );
  };

  const handleDeleteGcp = (idx) => {
    setGcps((prev) => prev.filter((_, i) => i !== idx));
    if (selectedGcpIdx >= idx && selectedGcpIdx > 0) {
      setSelectedGcpIdx(selectedGcpIdx - 1);
    }
  };

  const handleAddManualGcp = () => {
    const id = newGcpId.trim() || `GCP-${String(gcps.length + 1).padStart(2, '0')}`;
    const name = newGcpName.trim() || `Station ${gcps.length + 1}`;
    const px = parseFloat(newGcpPixelX) || 2736.0;
    const py = parseFloat(newGcpPixelY) || 1824.0;
    const wx = parseFloat(newGcpWorldX) || 671230.0;
    const wy = parseFloat(newGcpWorldY) || 4103140.0;
    const wz = parseFloat(newGcpElevationZ) || 165.0;

    const lat = surveyCenter[0] + (wy - 4103140.0) / 111000.0;
    const lng = surveyCenter[1] + (wx - 671230.0) / 88000.0;

    const newPt = {
      gcp_id: id,
      name,
      pixel_x: px,
      pixel_y: py,
      world_x: wx,
      world_y: wy,
      elevation_z: wz,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      is_check_point: newGcpIsCheckPoint,
      is_enabled: true
    };
    setGcps((prev) => [...prev, newPt]);
    setNewGcpId('');
    setNewGcpName('');
    setSelectedGcpIdx(gcps.length);
  };

  // ODM GCP file export / import
  const handleExportOdmGcp = () => {
    const odmText = formatOdmGcpFile(gcps, 32610, 'drone_survey_frame.jpg');
    const blob = new Blob([odmText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `odm_gcp_${taskId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportOdmGcp = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const parsed = parseOdmGcpFile(text);
        if (parsed.length > 0) {
          const augmented = parsed.map((p, idx) => ({
            ...p,
            name: `Imported Station ${idx + 1}`,
            lat: surveyCenter[0] + (p.world_y - 4103140.0) / 111000.0,
            lng: surveyCenter[1] + (p.world_x - 671230.0) / 88000.0
          }));
          setGcps(augmented);
          setSelectedGcpIdx(0);
        }
      }
    };
    reader.readAsText(file);
  };

  // Pipeline simulation & controls
  const handleStartMission = async () => {
    setPipelineError(null);
    try {
      const payload = {
        task_id: taskId,
        project_name: projectName,
        target_gsd_cm: targetGsdCm,
        camera: DRONE_CAMERA_PRESETS[cameraModel] || DRONE_CAMERA_PRESETS.DJI_FC6310R,
        gcps,
        options: {
          feature_quality: 'high',
          dsm: true,
          dtm: true,
          orthophoto_resolution_cm: targetGsdCm,
          dem_resolution_cm: targetGsdCm * 2.0,
          generate_cog: true
        },
        image_count: uploadedImages.length || 120
      };

      const res = await createDronePhotogrammetryTask(payload);
      setTaskStatus(res);
      setCurrentStage('dataset_initialization');
      setElapsedSeconds(10.0);
      setActiveTab('pipeline');
    } catch (err) {
      setPipelineError(err.message || 'Worker communication offline; continuing in local simulation mode.');
      const sim = simulateDronePhotogrammetryTask(taskId, 'dataset_initialization', 15.0, uploadedImages.length || 120, targetGsdCm);
      setTaskStatus(sim);
      setCurrentStage('dataset_initialization');
      setElapsedSeconds(15.0);
      setActiveTab('pipeline');
    }
  };

  const handleSimulateAutoProgression = () => {
    if (isSimulating) {
      setIsSimulating(false);
      if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
      return;
    }

    setIsSimulating(true);
    simulationTimerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => {
        const nextSec = prev + 12;
        setCurrentStage((prevStage) => {
          const currentIdx = STAGE_ORDER.indexOf(prevStage);
          if (currentIdx >= 0 && currentIdx < STAGE_ORDER.length - 1) {
            const nextStage = STAGE_ORDER[currentIdx + 1];
            const updated = simulateDronePhotogrammetryTask(
              taskId,
              nextStage,
              nextSec,
              uploadedImages.length || 120,
              targetGsdCm
            );
            setTaskStatus(updated);
            return nextStage;
          } else {
            setIsSimulating(false);
            if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
            return prevStage;
          }
        });
        return nextSec;
      });
    }, 1800);
  };

  const handleAbortMission = async () => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    setIsSimulating(false);
    try {
      await cancelDronePhotogrammetryTask(taskId);
    } catch {
      // Ignore in offline mode
    }
    const cancelled = {
      ...(taskStatus || simulateDronePhotogrammetryTask(taskId, 'failed', elapsedSeconds)),
      status: 'cancelled',
      error_message: 'Photogrammetry mission cancelled by operator.'
    };
    setTaskStatus(cancelled);
    setCurrentStage('failed');
  };

  const handleRestartMission = async () => {
    if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
    setIsSimulating(false);
    setElapsedSeconds(0);
    try {
      const res = await restartDronePhotogrammetryTask(taskId);
      setTaskStatus(res);
      setCurrentStage('queued');
    } catch {
      const reset = simulateDronePhotogrammetryTask(taskId, 'queued', 0.0, uploadedImages.length || 120, targetGsdCm);
      setTaskStatus(reset);
      setCurrentStage('queued');
    }
  };

  // Apply layer to Map
  const handleApplyToMap = () => {
    if (onApplyTileLayer) {
      onApplyTileLayer({
        taskId,
        metric: selectedMetric,
        gsdCm: taskStatus?.achieved_gsd_cm || targetGsdCm,
        projectName,
        center: surveyCenter,
        footprint: surveyFootprint,
        gcps,
        tileUrlTemplate: getDronePhotogrammetryTileUrlTemplate(taskId, selectedMetric)
      });
    }
    onClose();
  };

  // Copy template URL
  const handleCopyTileTemplate = () => {
    const template = getDronePhotogrammetryTileUrlTemplate(taskId, selectedMetric);
    navigator.clipboard.writeText(template);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!isOpen) return null;

  const currentStageMeta = NODEODM_PIPELINE_STAGE_METADATA[currentStage] || NODEODM_PIPELINE_STAGE_METADATA.completed;
  const progressPercent = taskStatus?.progress_percent ?? (currentStage === 'completed' ? 100 : 85);
  const selectedCameraPreset = DRONE_CAMERA_PRESETS[cameraModel] || DRONE_CAMERA_PRESETS.DJI_FC6310R;
  const activeGcp = gcps[selectedGcpIdx] || gcps[0];

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div className="relative w-full max-w-6xl max-h-[92vh] bg-zinc-950/95 border border-cyan-500/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <Camera className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Drone Photogrammetry Mission Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                  NodeODM Bridge • v2.5.24
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                  taskStatus?.status === 'completed' || currentStage === 'completed'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                    : taskStatus?.status === 'failed' || currentStage === 'failed'
                    ? 'bg-red-950 text-red-300 border border-red-500/40'
                    : 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                }`}>
                  {taskStatus?.status || (currentStage === 'completed' ? 'COMPLETED' : 'RUNNING')}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Multi-image UAV SfM/MVS reconstruction, sub-pixel GCP georeferencing & dynamic centimeter COG tile streaming
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Benchmark Preset Selector */}
            <select
              value={selectedPresetKey}
              onChange={(e) => applyPresetScenario(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 text-xs font-mono text-cyan-300 rounded-lg px-2.5 py-1.5 focus:border-cyan-400 focus:outline-none"
            >
              <option value="san_luis_crest">Preset: San Luis Dam Crest (CA, USA)</option>
              <option value="brumadinho_tailings">Preset: Brumadinho Tailings (Brazil)</option>
            </select>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Close Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Workflow Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-6 gap-2 text-xs font-mono">
          {[
            { id: 'mission', label: '1. Mission & Flight Plan', icon: Compass },
            { id: 'dropzone', label: `2. Upload Dropzone (${uploadedImages.length})`, icon: UploadCloud },
            { id: 'gcp', label: `3. GCP Georeferencing (${gcps.length})`, icon: Crosshair },
            { id: 'pipeline', label: '4. NodeODM Execution', icon: Activity },
            { id: 'artifacts', label: '5. COG Tile Deliverables', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition-all ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-zinc-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ============================================================= */}
          {/* TAB 1: MISSION SETUP & FLIGHT PLAN                             */}
          {/* ============================================================= */}
          {activeTab === 'mission' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Form: Survey Parameters */}
                <div className="md:col-span-2 space-y-4 bg-zinc-900/60 p-5 rounded-xl border border-zinc-800">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Compass className="w-4 h-4 text-cyan-400" />
                      Photogrammetric Survey Configuration
                    </h3>
                    <span className="text-[11px] text-slate-400 font-mono">ID: {taskId}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="sm:col-span-2">
                      <label className="text-slate-300 block mb-1">Project Name</label>
                      <input
                        type="text"
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1">Camera Sensor Model</label>
                      <select
                        value={cameraModel}
                        onChange={(e) => setCameraModel(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-cyan-300 focus:border-cyan-400 focus:outline-none"
                      >
                        <option value="DJI_FC6310R">DJI FC6310R (Phantom 4 Pro RTK - 20MP)</option>
                        <option value="DJI_M3E">DJI Mavic 3 Enterprise (4/3 CMOS - 20MP)</option>
                        <option value="DJI_P1_35">DJI Zenmuse P1 (Full Frame 35mm - 45MP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1">
                        Target Ground Sample Distance (GSD): <span className="text-cyan-300 font-bold">{targetGsdCm.toFixed(1)} cm/px</span>
                      </label>
                      <input
                        type="range"
                        min="1.0"
                        max="5.0"
                        step="0.1"
                        value={targetGsdCm}
                        onChange={(e) => setTargetGsdCm(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1">
                        Forward Overlap: <span className="text-cyan-300 font-bold">{forwardOverlapPercent}%</span>
                      </label>
                      <input
                        type="range"
                        min="60"
                        max="90"
                        step="5"
                        value={forwardOverlapPercent}
                        onChange={(e) => setForwardOverlapPercent(parseInt(e.target.value, 10))}
                        className="w-full accent-cyan-400 mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1">
                        Side Overlap: <span className="text-cyan-300 font-bold">{sideOverlapPercent}%</span>
                      </label>
                      <input
                        type="range"
                        min="50"
                        max="85"
                        step="5"
                        value={sideOverlapPercent}
                        onChange={(e) => setSideOverlapPercent(parseInt(e.target.value, 10))}
                        className="w-full accent-cyan-400 mt-2"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1">Survey Area (Hectares)</label>
                      <input
                        type="number"
                        min="1.0"
                        max="200.0"
                        step="1.0"
                        value={surveyAreaHa}
                        onChange={(e) => setSurveyAreaHa(parseFloat(e.target.value) || 25.0)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-slate-300 block mb-1">UAV Flight Speed (m/s)</label>
                      <input
                        type="number"
                        min="2.0"
                        max="20.0"
                        step="0.5"
                        value={flightSpeedMs}
                        onChange={(e) => setFlightSpeedMs(parseFloat(e.target.value) || 10.0)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Camera Optical Intrinsics Details */}
                  <div className="p-3 bg-zinc-950/80 rounded-lg border border-zinc-800 text-[11px] font-mono grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300">
                    <div>
                      <span className="text-slate-500 block">Sensor Size</span>
                      <span className="font-bold text-white">{selectedCameraPreset.sensor_width_mm} × {selectedCameraPreset.sensor_height_mm} mm</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Resolution</span>
                      <span className="font-bold text-white">{selectedCameraPreset.image_width_px} × {selectedCameraPreset.image_height_px} px</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Focal Length</span>
                      <span className="font-bold text-white">{selectedCameraPreset.focal_length_mm} mm ({selectedCameraPreset.focal_length_px} px)</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Radial Distortion k1</span>
                      <span className="font-bold text-cyan-300">{selectedCameraPreset.k1}</span>
                    </div>
                  </div>
                </div>

                {/* Right Card: Computed Flight Plan */}
                <div className="space-y-4 bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
                      <Gauge className="w-4 h-4 text-emerald-400" />
                      Calculated Flight Plan
                    </h3>

                    {flightPlan ? (
                      <div className="mt-4 space-y-3 text-xs font-mono">
                        <div className="p-3 bg-cyan-950/30 rounded-lg border border-cyan-500/30">
                          <span className="text-slate-400 block text-[10px]">REQUIRED FLIGHT ALTITUDE</span>
                          <span className="text-xl font-extrabold text-cyan-300">
                            {flightPlan.plan.flight_altitude_m} m
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Yields {targetGsdCm.toFixed(2)} cm/px GSD on ground
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                            <span className="text-slate-500 block text-[10px]">PHOTO COUNT</span>
                            <span className="font-bold text-emerald-400 text-sm">~{flightPlan.plan.estimated_photo_count} imgs</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                            <span className="text-slate-500 block text-[10px]">FLIGHT TIME</span>
                            <span className="font-bold text-amber-400 text-sm">{flightPlan.plan.estimated_flight_time_minutes} min</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                            <span className="text-slate-500 block text-[10px]">TRIGGER INTERVAL</span>
                            <span className="font-bold text-white text-sm">{flightPlan.plan.trigger_interval_seconds}s</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                            <span className="text-slate-500 block text-[10px]">MAX SHUTTER</span>
                            <span className="font-bold text-white text-sm">≤ 1/{Math.round(1 / flightPlan.plan.min_shutter_speed_seconds)}s</span>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-400 p-2 bg-zinc-950/50 rounded border border-zinc-800/80 leading-relaxed">
                          • Ground Footprint: {flightPlan.plan.ground_footprint_width_m}m × {flightPlan.plan.ground_footprint_height_m}m<br/>
                          • Photo Spacing: {flightPlan.plan.forward_photo_spacing_m}m forward, {flightPlan.plan.flight_line_spacing_m}m lateral
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500 font-mono mt-4">Computing flight plan...</p>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveTab('dropzone')}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-black font-bold font-mono text-xs uppercase rounded-lg transition-all flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    <span>Proceed to Upload Dropzone</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 2: MULTI-IMAGE UPLOAD DROPZONE                             */}
          {/* ============================================================= */}
          {activeTab === 'dropzone' && (
            <div className="space-y-6">
              
              {/* Dropzone Container */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
                    : 'border-zinc-700 bg-zinc-900/40 hover:border-cyan-500/60 hover:bg-zinc-900/70'
                }`}
              >
                <input
                  type="file"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileInputChange}
                  accept=".jpg,.jpeg,.dng,.tif,.tiff,.raw"
                  className="hidden"
                />

                <div className="p-4 rounded-2xl bg-zinc-950 border border-cyan-500/40 text-cyan-400 mb-3 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <UploadCloud className="w-8 h-8 animate-bounce" />
                </div>

                <h3 className="text-sm font-bold text-white mb-1">
                  Drag and Drop UAV Flight Images Here
                </h3>
                <p className="text-xs text-slate-400 font-mono text-center max-w-md">
                  Supports multi-file JPEG, DNG RAW, and TIFF drone frames with embedded EXIF GPS tags
                </p>

                <div className="flex items-center gap-3 mt-4">
                  <span className="px-3 py-1 bg-zinc-800 text-slate-200 rounded text-[11px] font-mono border border-zinc-700">
                    Browse Local Files
                  </span>
                  <span className="text-xs text-slate-500 font-mono">or</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      applyPresetScenario(selectedPresetKey);
                    }}
                    className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 rounded text-[11px] font-mono font-bold border border-cyan-500/40 transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Load Sample 120-Image Pack
                  </button>
                </div>
              </div>

              {/* Uploaded Images Table Header & Actions */}
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-cyan-400" />
                      Staged UAV Image Flight Deck ({uploadedImages.length} files)
                    </h3>
                    <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      {(uploadedImages.reduce((acc, img) => acc + (img.size_bytes || 18000000), 0) / 1024 / 1024 / 1024).toFixed(2)} GB Total Volume
                    </span>
                  </div>

                  {uploadedImages.length > 0 && (
                    <button
                      onClick={() => setUploadedImages([])}
                      className="text-xs text-red-400 hover:text-red-300 font-mono flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear All Images
                    </button>
                  )}
                </div>

                {/* Images List Table */}
                {uploadedImages.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-800">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-zinc-950 text-slate-400 text-[10px] uppercase sticky top-0 border-b border-zinc-800">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Image Name</th>
                          <th className="py-2 px-3">Dimensions</th>
                          <th className="py-2 px-3">GPS Geotag [Lat, Lon]</th>
                          <th className="py-2 px-3">Altitude</th>
                          <th className="py-2 px-3">Shutter / ISO</th>
                          <th className="py-2 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                        {uploadedImages.slice(0, 50).map((img, idx) => (
                          <tr key={img.id || idx} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                            <td className="py-2 px-3 text-white font-bold flex items-center gap-2">
                              <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                              {img.name}
                            </td>
                            <td className="py-2 px-3 text-slate-400">{img.width} × {img.height}</td>
                            <td className="py-2 px-3 text-cyan-300">
                              {img.latitude?.toFixed(5)}, {img.longitude?.toFixed(5)}
                            </td>
                            <td className="py-2 px-3 text-emerald-400">{img.altitude_m} m</td>
                            <td className="py-2 px-3 text-slate-400">{img.shutter_speed} • ISO {img.iso}</td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={() => setUploadedImages((prev) => prev.filter((_, i) => i !== idx))}
                                className="text-slate-500 hover:text-red-400 transition-colors"
                                title="Remove Image"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {uploadedImages.length > 50 && (
                      <div className="py-2 px-3 bg-zinc-950 text-center text-[11px] text-slate-400 font-mono border-t border-zinc-800">
                        Showing first 50 of {uploadedImages.length} staged images. All images will be dispatched to NodeODM.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 font-mono text-xs">
                    No UAV images staged yet. Drag and drop image files or click "Load Sample 120-Image Pack".
                  </div>
                )}
              </div>

              {/* Navigation Action */}
              <div className="flex justify-end gap-3 font-mono text-xs">
                <button
                  onClick={() => setActiveTab('mission')}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-300 transition-colors"
                >
                  Back to Mission
                </button>
                <button
                  onClick={() => setActiveTab('gcp')}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  <span>Proceed to GCP Georeferencing</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 3: GCP COORDINATE PINNING & GEOREFERENCING                 */}
          {/* ============================================================= */}
          {activeTab === 'gcp' && (
            <div className="space-y-6">
              
              {/* Header Banner & Accuracy Summary */}
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    Ground Control Points (GCP) & Sub-Pixel Georeferencing
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Least-squares 2D affine geotransform resolution with sub-pixel crosshairs for centimeter bundle adjustment
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  {/* Pin GCP on Map Button */}
                  <button
                    onClick={() => {
                      if (onStartGcpPinning) {
                        onStartGcpPinning();
                        onClose();
                      }
                    }}
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                    title="Click anywhere on the Leaflet map in MapExplorer to capture exact GCP coordinate"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Pin GCP on Map</span>
                  </button>

                  <button
                    onClick={handleExportOdmGcp}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                    title="Export standard OpenDroneMap GCP text file"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export GCP</span>
                  </button>

                  <label className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer">
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Import GCP</span>
                    <input
                      type="file"
                      accept=".txt,.csv"
                      onChange={handleImportOdmGcp}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* 2-Column Grid: Visual Target Crosshair & Solved Geotransform */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Crosshair Visualizer Preview */}
                <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 flex flex-col items-center justify-center space-y-3">
                  <span className="text-xs font-mono font-bold text-slate-300">
                    Sub-Pixel Crosshair Target Reticle
                  </span>
                  
                  {activeGcp ? (
                    <SubPixelCrosshairCanvas
                      pixelX={activeGcp.pixel_x}
                      pixelY={activeGcp.pixel_y}
                      pointId={activeGcp.gcp_id}
                    />
                  ) : (
                    <div className="w-40 h-40 bg-zinc-950 rounded-lg flex items-center justify-center text-xs text-slate-500 font-mono">
                      No GCP Selected
                    </div>
                  )}

                  <div className="text-[11px] font-mono text-center text-slate-400">
                    {activeGcp ? (
                      <div>
                        <span className="text-white font-bold">{activeGcp.name}</span><br/>
                        UTM: {activeGcp.world_x} E, {activeGcp.world_y} N<br/>
                        Elev: {activeGcp.elevation_z} m
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Affine Transformation Matrix Solution Card */}
                <div className="md:col-span-2 bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <h4 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-cyan-400" />
                        Affine Geotransform Matrix & Spatial Accuracy
                      </h4>
                      {affineSolution && !affineSolution.error && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          affineSolution.rmse_xy_m <= 0.05
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        }`}>
                          {affineSolution.rmse_xy_m <= 0.05 ? 'SURVEY-GRADE (< 0.05m)' : 'RECONNAISSANCE GRADE'}
                        </span>
                      )}
                    </div>

                    {affineSolution && !affineSolution.error ? (
                      <div className="mt-4 space-y-3 font-mono text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                            <span className="text-slate-500 block text-[10px]">TOTAL RMSE (XY)</span>
                            <span className="font-bold text-emerald-400 text-sm">{affineSolution.rmse_xy_m} m</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                            <span className="text-slate-500 block text-[10px]">PIXEL RESIDUAL</span>
                            <span className="font-bold text-cyan-300 text-sm">{affineSolution.rmse_pixel} px</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                            <span className="text-slate-500 block text-[10px]">RESOLVED GSD</span>
                            <span className="font-bold text-white text-sm">{affineSolution.mean_gsd_cm} cm/px</span>
                          </div>
                          <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800">
                            <span className="text-slate-500 block text-[10px]">GROUND ROTATION</span>
                            <span className="font-bold text-white text-sm">{affineSolution.rotation_deg}°</span>
                          </div>
                        </div>

                        {/* Affine 6-parameters */}
                        <div className="p-3 bg-zinc-950 rounded border border-zinc-800 text-[10px] space-y-1">
                          <span className="text-slate-400 block font-bold">6-PARAMETER LEAST-SQUARES AFFINE MATRIX [a, b, c, d, e, f]:</span>
                          <p className="text-cyan-300 break-all font-mono">
                            [{affineSolution.affine_matrix.join(', ')}]
                          </p>
                          <span className="text-slate-500 block text-[9px] mt-1">
                            X_geo = a + b*X_px + c*Y_px | Y_geo = d + e*X_px + f*Y_px
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs font-mono text-amber-300 mt-4 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{affineSolution?.error || 'At least 3 enabled GCPs are required to solve 2D affine geotransform.'}</span>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* GCP Interactive Table */}
              <div className="bg-zinc-900/60 p-4 rounded-xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                    <Grid className="w-3.5 h-3.5 text-cyan-400" />
                    Ground Control Points Network ({gcps.length} points)
                  </h4>
                  <button
                    onClick={() => applyPresetScenario(selectedPresetKey)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset to Benchmark Network
                  </button>
                </div>

                <div className="overflow-x-auto rounded-lg border border-zinc-800">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-950 text-slate-400 text-[10px] uppercase border-b border-zinc-800">
                      <tr>
                        <th className="py-2 px-3">Active</th>
                        <th className="py-2 px-3">Point ID</th>
                        <th className="py-2 px-3">Station Name</th>
                        <th className="py-2 px-3">Role</th>
                        <th className="py-2 px-3">Pixel [X, Y]</th>
                        <th className="py-2 px-3">World UTM [E, N]</th>
                        <th className="py-2 px-3">Elevation</th>
                        <th className="py-2 px-3">Residual (m)</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                      {gcps.map((p, idx) => {
                        const isSelected = selectedGcpIdx === idx;
                        const residual = affineSolution?.residuals?.find((r) => r.gcp_id === p.gcp_id);
                        return (
                          <tr
                            key={p.gcp_id || idx}
                            onClick={() => setSelectedGcpIdx(idx)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-cyan-950/40 text-cyan-200'
                                : 'hover:bg-zinc-800/30 text-slate-200'
                            }`}
                          >
                            <td className="py-2 px-3">
                              <input
                                type="checkbox"
                                checked={p.is_enabled !== false}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleToggleGcpEnabled(idx);
                                }}
                                className="accent-cyan-400"
                              />
                            </td>
                            <td className="py-2 px-3 font-bold text-white">{p.gcp_id}</td>
                            <td className="py-2 px-3 text-slate-300">{p.name || `GCP ${idx + 1}`}</td>
                            <td className="py-2 px-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleCheckPoint(idx);
                                }}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                  p.is_check_point
                                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                    : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                                }`}
                              >
                                {p.is_check_point ? 'CHECK POINT' : 'CONTROL POINT'}
                              </button>
                            </td>
                            <td className="py-2 px-3 text-cyan-400">
                              [{p.pixel_x.toFixed(1)}, {p.pixel_y.toFixed(1)}]
                            </td>
                            <td className="py-2 px-3 text-slate-300">
                              {p.world_x.toFixed(1)}, {p.world_y.toFixed(1)}
                            </td>
                            <td className="py-2 px-3 text-emerald-400">{p.elevation_z.toFixed(2)} m</td>
                            <td className="py-2 px-3">
                              {residual ? (
                                <span className={residual.residual_world_xy_m <= 0.05 ? 'text-emerald-400' : 'text-amber-400'}>
                                  ±{residual.residual_world_xy_m.toFixed(4)} m
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGcp(idx);
                                }}
                                className="text-slate-500 hover:text-red-400 transition-colors"
                                title="Delete GCP"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add GCP Inline Form */}
                <div className="pt-2 border-t border-zinc-800 grid grid-cols-2 sm:grid-cols-8 gap-2 text-xs font-mono">
                  <input
                    type="text"
                    placeholder="GCP-ID"
                    value={newGcpId}
                    onChange={(e) => setNewGcpId(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-white text-[11px]"
                  />
                  <input
                    type="text"
                    placeholder="Station Name"
                    value={newGcpName}
                    onChange={(e) => setNewGcpName(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-white text-[11px]"
                  />
                  <input
                    type="number"
                    placeholder="Pixel X"
                    value={newGcpPixelX}
                    onChange={(e) => setNewGcpPixelX(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-white text-[11px]"
                  />
                  <input
                    type="number"
                    placeholder="Pixel Y"
                    value={newGcpPixelY}
                    onChange={(e) => setNewGcpPixelY(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-white text-[11px]"
                  />
                  <input
                    type="number"
                    placeholder="UTM Easting"
                    value={newGcpWorldX}
                    onChange={(e) => setNewGcpWorldX(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-white text-[11px]"
                  />
                  <input
                    type="number"
                    placeholder="UTM Northing"
                    value={newGcpWorldY}
                    onChange={(e) => setNewGcpWorldY(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-white text-[11px]"
                  />
                  <input
                    type="number"
                    placeholder="Elev Z (m)"
                    value={newGcpElevationZ}
                    onChange={(e) => setNewGcpElevationZ(e.target.value)}
                    className="bg-zinc-950 border border-zinc-700 rounded px-2.5 py-1 text-white text-[11px]"
                  />
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1 text-[10px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={newGcpIsCheckPoint}
                        onChange={(e) => setNewGcpIsCheckPoint(e.target.checked)}
                        className="accent-cyan-400"
                      />
                      <span>Check Pt</span>
                    </label>
                    <button
                      onClick={handleAddManualGcp}
                      className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-[11px] rounded px-3 py-1 transition-colors flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Navigation Actions */}
              <div className="flex justify-end gap-3 font-mono text-xs">
                <button
                  onClick={() => setActiveTab('dropzone')}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-300 transition-colors"
                >
                  Back to Dropzone
                </button>
                <button
                  onClick={() => setActiveTab('pipeline')}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  <span>Proceed to NodeODM Execution</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 4: NODEODM PIPELINE EXECUTION & PROGRESS BAR              */}
          {/* ============================================================= */}
          {activeTab === 'pipeline' && (
            <div className="space-y-6">

              {pipelineError && (
                <div className="p-3 bg-red-950/80 border border-red-500/40 rounded-lg text-xs font-mono text-red-300 flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{pipelineError}</span>
                </div>
              )}

              {/* Real-time Progress Bar Card */}
              <div className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      NodeODM Reconstruction Pipeline
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Stage: <span className="text-cyan-300 font-bold">{currentStageMeta.label}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleStartMission}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-mono font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start Reconstruction</span>
                    </button>

                    <button
                      onClick={handleSimulateAutoProgression}
                      className={`px-3 py-1.5 font-mono font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border ${
                        isSimulating
                          ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                          : 'bg-zinc-800 text-slate-200 border-zinc-700 hover:bg-zinc-700'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isSimulating ? 'Pause Simulation' : 'Simulate Progression'}</span>
                    </button>

                    <button
                      onClick={handleRestartMission}
                      className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-200 font-mono text-xs rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>

                    <button
                      onClick={handleAbortMission}
                      className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-500/40 text-red-300 font-mono text-xs rounded-lg transition-colors"
                    >
                      Abort
                    </button>
                  </div>
                </div>

                {/* Animated Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">{currentStageMeta.description}</span>
                    <span className="text-cyan-300 font-extrabold">{progressPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-3 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800 p-0.5">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Pipeline Stepper (8 Stages) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
                  {STAGE_ORDER.slice(1).map((stgKey, sIdx) => {
                    const meta = NODEODM_PIPELINE_STAGE_METADATA[stgKey] || {};
                    const isDone = STAGE_ORDER.indexOf(currentStage) > sIdx + 1 || currentStage === 'completed';
                    const isCurrent = currentStage === stgKey;
                    return (
                      <div
                        key={stgKey}
                        className={`p-2 rounded-lg border text-left font-mono transition-all ${
                          isCurrent
                            ? 'bg-cyan-950/60 border-cyan-400 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                            : isDone
                            ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                            : 'bg-zinc-950/50 border-zinc-800 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <span>{sIdx + 1}.</span>
                          {isDone ? (
                            <span className="text-emerald-400">✓</span>
                          ) : isCurrent ? (
                            <Activity className="w-3 h-3 text-cyan-400 animate-spin" />
                          ) : null}
                        </div>
                        <span className="text-[10px] font-bold block truncate mt-1">{meta.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Telemetry Dashboard */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 font-mono text-xs">
                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-slate-400 block text-[10px]">ELAPSED TIME</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {Math.floor(elapsedSeconds / 60)}m {Math.round(elapsedSeconds % 60)}s
                  </span>
                </div>

                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-slate-400 block text-[10px]">EST. REMAINING</span>
                  <span className="text-lg font-bold text-amber-300 mt-1 block">
                    {currentStage === 'completed' ? '0s' : `${Math.max(0, Math.round((100 - progressPercent) * 4.5))}s`}
                  </span>
                </div>

                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-slate-400 block text-[10px]">RECONSTRUCTED POINTS</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">
                    {taskStatus?.reconstructed_points?.toLocaleString() || '3,480,250'} pts
                  </span>
                </div>

                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-slate-400 block text-[10px]">ACHIEVED GSD</span>
                  <span className="text-lg font-bold text-cyan-300 mt-1 block">
                    {taskStatus?.achieved_gsd_cm?.toFixed(2) || targetGsdCm.toFixed(2)} cm/px
                  </span>
                </div>

                <div className="bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800">
                  <span className="text-slate-400 block text-[10px]">BUNDLE ADJ. RMSE</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {taskStatus?.rmse_reprojection_px?.toFixed(2) || '0.38'} px
                  </span>
                </div>
              </div>

              {/* Navigation Action */}
              <div className="flex justify-end gap-3 font-mono text-xs">
                <button
                  onClick={() => setActiveTab('gcp')}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-300 transition-colors"
                >
                  Back to GCPs
                </button>
                <button
                  onClick={() => setActiveTab('artifacts')}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  <span>View Deliverables & TileLayer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          )}

          {/* ============================================================= */}
          {/* TAB 5: DELIVERABLES & MULTIMODAL CENTIMETER TILESTREAMING     */}
          {/* ============================================================= */}
          {activeTab === 'artifacts' && (
            <div className="space-y-6">

              {/* Metric Selector for TileLayer */}
              <div className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      Dynamic Centimeter Orthomosaic & Multimodal Tile Streaming
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Select raster metric to stream dynamic XYZ tiles at centimeter zoom (Zoom 20–22, max 24)
                    </p>
                  </div>

                  <button
                    onClick={handleCopyTileTemplate}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-slate-200 text-xs font-mono rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied Template' : 'Copy Tile URL'}</span>
                  </button>
                </div>

                {/* Multimodal Metric Selection Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  {Object.entries(DRONE_PHOTOGRAMMETRY_TILE_METRIC_CONFIGS).map(([mKey, mConfig]) => {
                    const isSelected = selectedMetric === mKey;
                    return (
                      <button
                        key={mKey}
                        onClick={() => setSelectedMetric(mKey)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                            : 'bg-zinc-950/60 border-zinc-800 text-slate-400 hover:border-zinc-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-white">{mConfig.name}</span>
                          {isSelected && <span className="text-cyan-400 font-bold">●</span>}
                        </div>
                        <span className="text-[10px] text-slate-400 block">{mConfig.units}</span>
                        <span className="text-[9px] text-cyan-300/80 block mt-1 truncate">
                          {mConfig.description}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Tile URL Preview */}
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 text-[11px] font-mono flex items-center justify-between">
                  <div className="truncate text-slate-300">
                    <span className="text-slate-500 font-bold mr-2">LEAFLET TILE TEMPLATE:</span>
                    <span className="text-cyan-300">{getDronePhotogrammetryTileUrlTemplate(taskId, selectedMetric)}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold uppercase shrink-0 ml-3">
                    Centimeter Zoom 20-22
                  </span>
                </div>
              </div>

              {/* Product Deliverables Cards */}
              <div className="bg-zinc-900/60 p-5 rounded-xl border border-zinc-800 space-y-4">
                <h4 className="text-xs font-bold font-mono text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  Cloud-Optimized GeoTIFF & Point Cloud Deliverables
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">True RGB Orthophoto COG</span>
                      <span className="text-[10px] text-slate-400">Centimeter Multi-band GeoTIFF</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                      READY
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Digital Elevation Model (DSM/DTM)</span>
                      <span className="text-[10px] text-slate-400">CSF Bare-Earth 32-bit Float</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                      READY
                    </span>
                  </div>

                  <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div>
                      <span className="text-white font-bold block">Dense 3D Point Cloud</span>
                      <span className="text-[10px] text-slate-400">ASPRS LAS/LAZ 1.4 Format</span>
                    </div>
                    <span className="text-[10px] text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30">
                      3.48M PTS
                    </span>
                  </div>
                </div>
              </div>

              {/* Primary Map Application Button */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs font-mono text-slate-400">
                  Applies high-resolution Leaflet TileLayer with survey footprint and sub-pixel GCP markers
                </div>

                <div className="flex items-center gap-3 font-mono text-xs">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-300 transition-colors"
                  >
                    Close Studio
                  </button>

                  <button
                    onClick={handleApplyToMap}
                    className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-black font-extrabold rounded-lg transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Apply Centimeter COG TileLayer to Map</span>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
