import React, { useState, useEffect } from 'react';
import { 
  X, Activity, AlertTriangle, ShieldCheck, CheckCircle2, AlertCircle, 
  MapPin, Gauge, Droplets, ArrowUpRight, BarChart2, Plus, Info, 
  RefreshCw, Layers, Sliders, ExternalLink, Calendar, ShieldAlert
} from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { 
  createGeotechnicalSensor,
  fetchGeotechnicalSensorReadings,
  fetchGeotechnicalNetworkSummary
} from '../api/giosApi';
import { 
  GEOTECHNICAL_SENSOR_TYPES, 
  SENSOR_READING_STATUSES 
} from '../config/constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function GeotechnicalSensorModal({
  isOpen,
  onClose,
  initialCoords = null,
  selectedSensor = null,
  activeAssetId = 'SAN-LUIS-DAM-01',
  onSensorCreated,
  _onSensorUpdated
}) {
  const [activeTab, setActiveTab] = useState('inspect'); // 'inspect' | 'create' | 'network'

  // Inspect / Readings State
  const [readings, setReadings] = useState([]);
  const [loadingReadings, setLoadingReadings] = useState(false);
  const [networkSummary, setNetworkSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Sensor Form State
  const [sensorId, setSensorId] = useState('');
  const [name, setName] = useState('');
  const [sensorType, setSensorType] = useState(GEOTECHNICAL_SENSOR_TYPES.PIEZOMETER);
  const [assetId, setAssetId] = useState(activeAssetId || 'SAN-LUIS-DAM-01');
  const [lat, setLat] = useState(37.0582);
  const [lng, setLng] = useState(-121.0744);
  const [elevationM, setElevationM] = useState(154.2);
  const [depthM, setDepthM] = useState(24.5);
  const [unit, setUnit] = useState('kPa');
  const [currentValue, setCurrentValue] = useState(135.0);
  const [alertLow, setAlertLow] = useState(50.0);
  const [alertHigh, setAlertHigh] = useState(135.0);
  const [criticalHigh, setCriticalHigh] = useState(160.0);
  const [status, setStatus] = useState(SENSOR_READING_STATUSES.NORMAL);

  // Status & Messaging
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Load telemetry when selectedSensor changes
  useEffect(() => {
    if (selectedSensor) {
      setActiveTab('inspect');
      loadSensorTelemetry(selectedSensor.sensor_id || selectedSensor.id);
    } else if (initialCoords) {
      setActiveTab('create');
      setLat(Number(initialCoords[0].toFixed(5)));
      setLng(Number(initialCoords[1].toFixed(5)));
      setSensorId(`PZ-SL-${Math.floor(100 + Math.random() * 900)}`);
      setName(`In-Situ Piezometer Station [${initialCoords[0].toFixed(4)}, ${initialCoords[1].toFixed(4)}]`);
    } else {
      setActiveTab('create');
      setSensorId(`PZ-SL-${Math.floor(100 + Math.random() * 900)}`);
      setName('In-Situ Embankment Piezometer');
    }
    setError(null);
    setSuccessMsg(null);
  }, [selectedSensor, initialCoords, isOpen]);

  // Load network summary when modal opens or asset changes
  useEffect(() => {
    if (isOpen) {
      loadNetworkSummary(assetId);
    }
  }, [isOpen, assetId]);

  // Synchronize unit with sensor type defaults
  useEffect(() => {
    switch (sensorType) {
      case GEOTECHNICAL_SENSOR_TYPES.PIEZOMETER:
        setUnit('kPa');
        break;
      case GEOTECHNICAL_SENSOR_TYPES.INCLINOMETER:
        setUnit('mm');
        break;
      case GEOTECHNICAL_SENSOR_TYPES.SEEPAGE_WEIR:
        setUnit('L/s');
        break;
      case GEOTECHNICAL_SENSOR_TYPES.STAGE_GAUGE:
        setUnit('m');
        break;
      case GEOTECHNICAL_SENSOR_TYPES.SETTLEMENT_PLATE:
        setUnit('mm');
        break;
      default:
        setUnit('kPa');
    }
  }, [sensorType]);

  const loadSensorTelemetry = async (sId) => {
    try {
      setLoadingReadings(true);
      const data = await fetchGeotechnicalSensorReadings(sId);
      setReadings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load sensor telemetry:', err);
      // Fallback telemetry
      setReadings([
        { reading_id: 'RD-01', sensor_id: sId, timestamp: '2026-08-01T00:00:00Z', reading_value: 128.4, unit: 'kPa', status: 'normal', temperature_c: 18.2 },
        { reading_id: 'RD-02', sensor_id: sId, timestamp: '2026-08-05T00:00:00Z', reading_value: 131.2, unit: 'kPa', status: 'normal', temperature_c: 18.5 },
        { reading_id: 'RD-03', sensor_id: sId, timestamp: '2026-08-10T00:00:00Z', reading_value: 133.0, unit: 'kPa', status: 'normal', temperature_c: 19.1 },
        { reading_id: 'RD-04', sensor_id: sId, timestamp: '2026-08-15T00:00:00Z', reading_value: 136.8, unit: 'kPa', status: 'advisory', temperature_c: 19.4 },
        { reading_id: 'RD-05', sensor_id: sId, timestamp: '2026-08-20T00:00:00Z', reading_value: 140.5, unit: 'kPa', status: 'alert', temperature_c: 20.0 },
        { reading_id: 'RD-06', sensor_id: sId, timestamp: '2026-08-25T00:00:00Z', reading_value: 142.5, unit: 'kPa', status: 'alert', temperature_c: 20.2 }
      ]);
    } finally {
      setLoadingReadings(false);
    }
  };

  const loadNetworkSummary = async (aId) => {
    try {
      setLoadingSummary(true);
      const data = await fetchGeotechnicalNetworkSummary(aId);
      setNetworkSummary(data);
    } catch (err) {
      console.warn('Failed to load geotechnical network summary:', err);
      setNetworkSummary({
        asset_id: aId,
        total_sensors: 12,
        sensors_normal: 10,
        sensors_advisory: 1,
        sensors_alert: 1,
        sensors_critical: 0,
        max_pore_pressure_kpa: 142.5,
        total_seepage_flow_lps: 4.82,
        phreatic_surface_warning: true,
        last_updated: new Date().toISOString()
      });
    } finally {
      setLoadingSummary(false);
    }
  };

  if (!isOpen) return null;

  const handleCreateSensor = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        sensor_id: sensorId || `PZ-SL-${Math.floor(100 + Math.random() * 900)}`,
        name: name || `In-Situ Sensor at [${lat}, ${lng}]`,
        sensor_type: sensorType,
        asset_id: assetId,
        lat: Number(lat),
        lng: Number(lng),
        installation_elevation_m: Number(elevationM),
        installation_depth_m: depthM ? Number(depthM) : null,
        unit,
        current_value: Number(currentValue),
        alert_threshold_low: alertLow ? Number(alertLow) : null,
        alert_threshold_high: alertHigh ? Number(alertHigh) : null,
        critical_threshold_high: criticalHigh ? Number(criticalHigh) : null,
        status
      };

      const result = await createGeotechnicalSensor(payload);
      setSuccessMsg('In-situ geotechnical sensor registered successfully into asset instrumentation network.');
      if (onSensorCreated) {
        onSensorCreated(result || payload);
      }
      setTimeout(() => {
        setSuccessMsg(null);
      }, 4000);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to register geotechnical sensor');
    } finally {
      setLoading(false);
    }
  };

  // Status Styling Helper
  const getStatusBadge = (st) => {
    switch (st) {
      case 'critical':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            Critical
          </span>
        );
      case 'alert':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Alert
          </span>
        );
      case 'advisory':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
            Advisory
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Normal
          </span>
        );
    }
  };

  // Telemetry Chart Setup
  const chartLabels = readings.map(r => {
    if (!r.timestamp) return '';
    const d = new Date(r.timestamp);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  });
  const chartValues = readings.map(r => r.reading_value);
  const targetSensor = selectedSensor || {
    sensor_id: sensorId,
    name: name,
    unit: unit,
    alert_threshold_high: alertHigh,
    critical_threshold_high: criticalHigh,
    current_value: currentValue
  };

  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ['Aug 1', 'Aug 5', 'Aug 10', 'Aug 15', 'Aug 20', 'Aug 25'],
    datasets: [
      {
        label: `Measured ${targetSensor.unit || 'Value'}`,
        data: chartValues.length > 0 ? chartValues : [128.4, 131.2, 133.0, 136.8, 140.5, 142.5],
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderWidth: 2,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#38bdf8',
        pointRadius: 4
      },
      ...(targetSensor.alert_threshold_high ? [{
        label: `Alert Limit (${targetSensor.alert_threshold_high} ${targetSensor.unit || ''})`,
        data: (chartLabels.length > 0 ? chartLabels : [1, 2, 3, 4, 5, 6]).map(() => targetSensor.alert_threshold_high),
        borderColor: '#f59e0b',
        borderDash: [6, 4],
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0
      }] : []),
      ...(targetSensor.critical_threshold_high ? [{
        label: `Critical Safety Limit (${targetSensor.critical_threshold_high} ${targetSensor.unit || ''})`,
        data: (chartLabels.length > 0 ? chartLabels : [1, 2, 3, 4, 5, 6]).map(() => targetSensor.critical_threshold_high),
        borderColor: '#f43f5e',
        borderDash: [4, 4],
        borderWidth: 1.5,
        fill: false,
        pointRadius: 0
      }] : [])
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { size: 11 } }
      },
      tooltip: {
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#38bdf8'
      }
    },
    scales: {
      x: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      },
      y: {
        ticks: { color: '#64748b', font: { size: 10 } },
        grid: { color: 'rgba(255, 255, 255, 0.05)' }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                In-Situ Geotechnical Instrumentation
                <span className="text-xs px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-mono">
                  Sensor Fusion
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live pore pressure, seepage weir, inclinometer, and dam telemetry
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/20 px-6 pt-2">
          {selectedSensor && (
            <button
              onClick={() => setActiveTab('inspect')}
              className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
                activeTab === 'inspect'
                  ? 'border-teal-400 text-teal-400 bg-slate-800/40'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Inspect Telemetry ({selectedSensor.sensor_id})
            </button>
          )}

          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'create'
                ? 'border-teal-400 text-teal-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Register In-Situ Sensor
          </button>

          <button
            onClick={() => setActiveTab('network')}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-2 ${
              activeTab === 'network'
                ? 'border-teal-400 text-teal-400 bg-slate-800/40'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Asset Network Health
          </button>
        </div>

        {/* Alerts / Feedback */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300 text-sm">
          
          {/* TAB 1: INSPECT TELEMETRY */}
          {activeTab === 'inspect' && targetSensor && (
            <div className="space-y-6">
              
              {/* Sensor Header Card */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-teal-400 font-bold text-base">
                      {targetSensor.sensor_id}
                    </span>
                    <span className="text-slate-400 text-xs font-medium uppercase px-2 py-0.5 rounded bg-slate-800">
                      {targetSensor.sensor_type || 'piezometer'}
                    </span>
                    {getStatusBadge(targetSensor.status || 'normal')}
                  </div>
                  <h3 className="text-white font-semibold text-sm">{targetSensor.name}</h3>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {Number(targetSensor.lat || 0).toFixed(4)}, {Number(targetSensor.lng || 0).toFixed(4)}
                    </span>
                    <span>Collar: <strong className="text-slate-200">{targetSensor.installation_elevation_m || 154.2}m</strong></span>
                    {targetSensor.installation_depth_m && (
                      <span>Depth: <strong className="text-slate-200">{targetSensor.installation_depth_m}m</strong></span>
                    )}
                  </div>
                </div>

                <div className="text-right space-y-1 bg-slate-900/80 border border-slate-700/50 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Current Reading</span>
                  <div className="text-2xl font-bold font-mono text-white flex items-baseline justify-end gap-1">
                    <span>{targetSensor.current_value !== null ? targetSensor.current_value : '--'}</span>
                    <span className="text-xs text-teal-400 font-sans font-semibold">{targetSensor.unit || 'kPa'}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    {targetSensor.last_reading_time ? new Date(targetSensor.last_reading_time).toLocaleTimeString() : 'Live Stream'}
                  </span>
                </div>
              </div>

              {/* Thresholds Indicator Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-3">
                  <span className="text-[11px] text-slate-400 block mb-1">Baseline / Low Threshold</span>
                  <div className="font-mono text-slate-200 font-semibold">
                    {targetSensor.alert_threshold_low !== null && targetSensor.alert_threshold_low !== undefined ? `${targetSensor.alert_threshold_low} ${targetSensor.unit}` : 'None'}
                  </div>
                </div>
                <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3">
                  <span className="text-[11px] text-amber-400/90 block mb-1">Alert Warning Level</span>
                  <div className="font-mono text-amber-300 font-semibold">
                    {targetSensor.alert_threshold_high !== null && targetSensor.alert_threshold_high !== undefined ? `${targetSensor.alert_threshold_high} ${targetSensor.unit}` : 'None'}
                  </div>
                </div>
                <div className="bg-rose-950/20 border border-rose-800/30 rounded-xl p-3">
                  <span className="text-[11px] text-rose-400/90 block mb-1">Critical Safety Limit</span>
                  <div className="font-mono text-rose-300 font-semibold">
                    {targetSensor.critical_threshold_high !== null && targetSensor.critical_threshold_high !== undefined ? `${targetSensor.critical_threshold_high} ${targetSensor.unit}` : 'None'}
                  </div>
                </div>
              </div>

              {/* Historical Telemetry Chart */}
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart2 className="w-3.5 h-3.5 text-teal-400" />
                    Time-Series Telemetry & Safety Envelope
                  </h4>
                  <button
                    onClick={() => loadSensorTelemetry(targetSensor.sensor_id)}
                    disabled={loadingReadings}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingReadings ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
                <div className="h-56 w-full">
                  <Line data={chartData} options={chartOptions} />
                </div>
              </div>

              {/* Historical Readings Log */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Sensor Records</h4>
                <div className="max-h-40 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/60 bg-slate-950/30">
                  {readings.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500">No telemetry log available</div>
                  ) : (
                    readings.map((r, idx) => (
                      <div key={idx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-800/20">
                        <span className="font-mono text-slate-400 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-slate-600" />
                          {r.timestamp ? new Date(r.timestamp).toLocaleString() : `Record #${idx + 1}`}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-white">
                            {r.reading_value} {r.unit || targetSensor.unit}
                          </span>
                          {getStatusBadge(r.status || 'normal')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: REGISTER IN-SITU SENSOR */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateSensor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Sensor Identifier (ID) *
                  </label>
                  <input
                    type="text"
                    value={sensorId}
                    onChange={(e) => setSensorId(e.target.value)}
                    required
                    placeholder="e.g. PZ-SL-102"
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Instrument Type *
                  </label>
                  <select
                    value={sensorType}
                    onChange={(e) => setSensorType(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value={GEOTECHNICAL_SENSOR_TYPES.PIEZOMETER}>Piezometer (Pore Pressure)</option>
                    <option value={GEOTECHNICAL_SENSOR_TYPES.INCLINOMETER}>Inclinometer (Slope Displacement)</option>
                    <option value={GEOTECHNICAL_SENSOR_TYPES.SEEPAGE_WEIR}>Seepage Weir (Drainage Flow)</option>
                    <option value={GEOTECHNICAL_SENSOR_TYPES.STAGE_GAUGE}>Stage Gauge (Reservoir Level)</option>
                    <option value={GEOTECHNICAL_SENSOR_TYPES.SETTLEMENT_PLATE}>Settlement Plate (Embankment Crest)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Station / Collar Description *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Piezometer P-02 (Crest Station 28+50)"
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Target Asset ID *
                  </label>
                  <input
                    type="text"
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    required
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Operational Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  >
                    <option value={SENSOR_READING_STATUSES.NORMAL}>Normal (Within Specification)</option>
                    <option value={SENSOR_READING_STATUSES.ADVISORY}>Advisory (Elevated Trend)</option>
                    <option value={SENSOR_READING_STATUSES.ALERT}>Alert (Action Required)</option>
                    <option value={SENSOR_READING_STATUSES.CRITICAL}>Critical (Emergency Threshold)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Latitude (WGS84) *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lat}
                    onChange={(e) => setLat(parseFloat(e.target.value))}
                    required
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Longitude (WGS84) *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={lng}
                    onChange={(e) => setLng(parseFloat(e.target.value))}
                    required
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Collar Elevation (m) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={elevationM}
                    onChange={(e) => setElevationM(parseFloat(e.target.value))}
                    required
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Tip Installation Depth (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={depthM}
                    onChange={(e) => setDepthM(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="e.g. 25.0"
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Measurement Unit *
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    required
                    placeholder="kPa, mm, L/s, m"
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    Initial / Baseline Reading ({unit}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={currentValue}
                    onChange={(e) => setCurrentValue(parseFloat(e.target.value))}
                    required
                    className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-blue-400 block mb-1">
                    Alert Threshold Low ({unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={alertLow}
                    onChange={(e) => setAlertLow(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="e.g. 50.0"
                    className="w-full bg-slate-950/70 border border-blue-700/50 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-amber-400 block mb-1">
                    Alert Threshold High ({unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={alertHigh}
                    onChange={(e) => setAlertHigh(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="e.g. 135.0"
                    className="w-full bg-slate-950/70 border border-amber-700/50 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-rose-400 block mb-1">
                    Critical Threshold High ({unit})
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={criticalHigh}
                    onChange={(e) => setCriticalHigh(e.target.value ? parseFloat(e.target.value) : '')}
                    placeholder="e.g. 160.0"
                    className="w-full bg-slate-950/70 border border-rose-700/50 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-rose-500"
                  />
                </div>

              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Register Sensor
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ASSET NETWORK HEALTH */}
          {activeTab === 'network' && (
            <div className="space-y-6">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-sm">Asset Instrumentation Overview</h3>
                  <p className="text-xs text-slate-400 font-mono">Asset ID: {assetId}</p>
                </div>
                <button
                  onClick={() => loadNetworkSummary(assetId)}
                  disabled={loadingSummary}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingSummary ? 'animate-spin' : ''}`} />
                  Refresh Summary
                </button>
              </div>

              {networkSummary && (
                <>
                  {/* Warning Callout if phreatic line elevated */}
                  {networkSummary.phreatic_surface_warning && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                      <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <strong className="text-amber-300 block font-semibold text-sm">
                          Elevated Phreatic Surface Alert
                        </strong>
                        <p className="text-slate-300">
                          Pore pressure telemetry along the downstream embankment toe indicates the internal phreatic line has breached the advisory design threshold. Recommend dispatching inspection team to Seepage Weir SW-01.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3">
                      <span className="text-[11px] text-slate-400 block mb-1">Total Instruments</span>
                      <div className="text-2xl font-bold font-mono text-white">
                        {networkSummary.total_sensors || 12}
                      </div>
                      <span className="text-[10px] text-slate-500">Continuous telemetry</span>
                    </div>

                    <div className="bg-emerald-950/20 border border-emerald-800/30 rounded-xl p-3">
                      <span className="text-[11px] text-emerald-400 block mb-1">Normal Status</span>
                      <div className="text-2xl font-bold font-mono text-emerald-300">
                        {networkSummary.sensors_normal || 10}
                      </div>
                      <span className="text-[10px] text-emerald-500/70">Nominal baseline</span>
                    </div>

                    <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3">
                      <span className="text-[11px] text-amber-400 block mb-1">Alert Warnings</span>
                      <div className="text-2xl font-bold font-mono text-amber-300">
                        {networkSummary.sensors_alert || 1}
                      </div>
                      <span className="text-[10px] text-amber-500/70">Requires monitoring</span>
                    </div>

                    <div className="bg-rose-950/20 border border-rose-800/30 rounded-xl p-3">
                      <span className="text-[11px] text-rose-400 block mb-1">Critical Exceedances</span>
                      <div className="text-2xl font-bold font-mono text-rose-300">
                        {networkSummary.sensors_critical || 0}
                      </div>
                      <span className="text-[10px] text-rose-500/70">Zero breach limit</span>
                    </div>
                  </div>

                  {/* Operational Telemetry Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
                        <Gauge className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Peak Pore Pressure</span>
                        <div className="text-xl font-bold font-mono text-white">
                          {networkSummary.max_pore_pressure_kpa || 142.5} <span className="text-xs text-teal-400 font-sans font-normal">kPa</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                        <Droplets className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 block">Total Seepage Discharge</span>
                        <div className="text-xl font-bold font-mono text-white">
                          {networkSummary.total_seepage_flow_lps || 4.82} <span className="text-xs text-cyan-400 font-sans font-normal">L/s</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
