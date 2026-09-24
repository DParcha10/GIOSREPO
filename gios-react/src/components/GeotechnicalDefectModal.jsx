import React, { useState, useEffect } from 'react';
import { 
  X, AlertTriangle, ShieldAlert, CheckCircle2, Wrench, 
  MapPin, Clock, Camera, FileText, Send, User, ChevronRight,
  ExternalLink, ArrowRight, ShieldCheck, AlertCircle
} from 'lucide-react';
import { 
  createGeotechnicalAnnotation, 
  updateGeotechnicalAnnotationStatus, 
  createMaintenanceWorkOrder,
  DEFECT_CATEGORIES,
  DEFECT_SEVERITIES,
  DEFECT_STATUSES
} from '../api/giosApi';

export default function GeotechnicalDefectModal({
  isOpen,
  onClose,
  initialCoords = null,
  selectedDefect = null,
  onDefectCreated,
  onDefectUpdated,
  onWorkOrderCreated
}) {
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'inspect' | 'work_order'
  
  // Defect Form State
  const [lat, setLat] = useState(37.0540);
  const [lng, setLng] = useState(-121.0725);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(DEFECT_CATEGORIES.SEEPAGE_BOIL);
  const [severity, setSeverity] = useState(DEFECT_SEVERITIES.HIGH);
  const [assetId, setAssetId] = useState('dam-san-luis');
  const [elevationM, setElevationM] = useState(215.4);
  const [photoUrl, setPhotoUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [inspector, setInspector] = useState('Chief Geotechnical Engineer');

  // Status Update State
  const [updateStatus, setUpdateStatus] = useState(DEFECT_STATUSES.INVESTIGATING);
  const [statusNotes, setStatusNotes] = useState('');

  // Work Order State
  const [woPriority, setWoPriority] = useState('high');
  const [woDescription, setWoDescription] = useState('');
  const [woCrew, setWoCrew] = useState('Rapid Geotechnical Response Team Alpha');
  const [woTargetDate, setWoTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [woEstHours, setWoEstHours] = useState(16);

  // Submission / Loading / Error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (selectedDefect) {
      setActiveTab('inspect');
      setUpdateStatus(selectedDefect.status || DEFECT_STATUSES.INVESTIGATING);
      setWoPriority(selectedDefect.severity || 'high');
      setWoDescription(`Immediate stabilization for ${selectedDefect.title || 'geotechnical defect'} (${selectedDefect.category || 'anomaly'}). Install inverted filter / berm drainage.`);
    } else if (initialCoords) {
      setActiveTab('create');
      setLat(Number(initialCoords[0].toFixed(5)));
      setLng(Number(initialCoords[1].toFixed(5)));
      setTitle(`Toe Seepage Boil — Point [${initialCoords[0].toFixed(4)}, ${initialCoords[1].toFixed(4)}]`);
    } else {
      setActiveTab('create');
    }
    setError(null);
    setSuccessMsg(null);
  }, [selectedDefect, initialCoords, isOpen]);

  if (!isOpen) return null;

  const handleCreateDefect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        lat: Number(lat),
        lng: Number(lng),
        title: title || `Geotechnical Defect at ${lat}, ${lng}`,
        category,
        severity,
        asset_id: assetId,
        elevation_m: Number(elevationM),
        photo_urls: photoUrl ? [photoUrl] : ['https://images.unsplash.com/photo-1541888946425-d0fbb18615f8?auto=format&fit=crop&w=400&q=80'],
        notes,
        inspector
      };

      const result = await createGeotechnicalAnnotation(payload);
      setSuccessMsg('Geotechnical defect annotation registered successfully.');
      if (onDefectCreated) onDefectCreated(result);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to create defect:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to submit geotechnical annotation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (!selectedDefect) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const annId = selectedDefect.annotation_id || selectedDefect.id;
    try {
      const result = await updateGeotechnicalAnnotationStatus(annId, updateStatus, statusNotes);
      setSuccessMsg(`Defect status updated to ${updateStatus.toUpperCase()}.`);
      if (onDefectUpdated) onDefectUpdated(result);
    } catch (err) {
      console.error('Failed to update defect status:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorkOrder = async (e) => {
    e.preventDefault();
    if (!selectedDefect) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const annId = selectedDefect.annotation_id || selectedDefect.id;
    try {
      const payload = {
        annotation_id: annId,
        asset_id: selectedDefect.asset_id || assetId,
        priority: woPriority,
        description: woDescription || `Field remediation for ${selectedDefect.title}`,
        assigned_crew: woCrew,
        target_completion_date: woTargetDate,
        estimated_hours: Number(woEstHours)
      };

      const result = await createMaintenanceWorkOrder(payload);
      setSuccessMsg(`Maintenance Work Order ${result.work_order_id || ''} dispatched successfully!`);
      if (onWorkOrderCreated) onWorkOrderCreated(result);
    } catch (err) {
      console.error('Failed to dispatch work order:', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to dispatch work order');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadgeClass = (sev) => {
    switch (sev) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border border-red-500/40';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/40';
      case 'moderate':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/40';
      case 'low':
      default:
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40';
    }
  };

  const getStatusBadgeClass = (st) => {
    switch (st) {
      case 'open':
        return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
      case 'investigating':
        return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
      case 'work_order_issued':
        return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
      case 'repaired':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
      case 'verified':
        return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="bg-gray-900/95 border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.25)] rounded-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                Geotechnical Defect & Asset Operations
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  T-57 / T-58
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Centimeter defect annotation, engineering lifecycle tracking & work order dispatch
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 bg-gray-900/40 px-6 pt-2">
          {selectedDefect ? (
            <>
              <button
                onClick={() => setActiveTab('inspect')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'inspect'
                    ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Defect Inspection
              </button>
              <button
                onClick={() => setActiveTab('work_order')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-all ${
                  activeTab === 'work_order'
                    ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                Dispatch Work Order
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'create'
                  ? 'border-purple-500 text-purple-400 bg-purple-500/10'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Register Geotechnical Defect
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs bg-red-900/30 border border-red-500/40 text-red-300 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 text-xs bg-emerald-900/30 border border-emerald-500/40 text-emerald-300 rounded-lg">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: CREATE DEFECT */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateDefect} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Latitude (WGS84) *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Longitude (WGS84) *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    required
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Defect Title / Summary *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Downstream Toe Seepage Boil near Station 14+20"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Defect Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
                  >
                    {Object.entries(DEFECT_CATEGORIES).map(([key, val]) => (
                      <option key={key} value={val}>
                        {val.replace('_', ' ').toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Defect Severity Level
                  </label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
                  >
                    {Object.entries(DEFECT_SEVERITIES).map(([key, val]) => (
                      <option key={key} value={val}>
                        {val.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Infrastructure Asset ID
                  </label>
                  <input
                    type="text"
                    value={assetId}
                    onChange={(e) => setAssetId(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Surface Elevation (m)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={elevationM}
                    onChange={(e) => setElevationM(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Field Photo / Evidence URL (Optional)
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="https://... or leave blank for photogrammetric capture"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded pl-9 pr-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
                  />
                  <Camera className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Inspector Name & Title
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inspector}
                    onChange={(e) => setInspector(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded pl-9 pr-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
                  />
                  <User className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Engineering Notes & Field Observations
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe soil discoloration, piping fines discharge, crack aperture width, or active bubbling..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white rounded bg-gray-800/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-mono font-bold uppercase rounded bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Registering...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Register Defect
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: INSPECT DEFECT */}
          {activeTab === 'inspect' && selectedDefect && (
            <div className="space-y-5">
              {/* Defect Overview Header Card */}
              <div className="p-4 rounded-lg bg-gray-950/70 border border-gray-800 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono text-purple-400 tracking-wider">
                      {selectedDefect.annotation_id || selectedDefect.id}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {selectedDefect.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${getSeverityBadgeClass(selectedDefect.severity)}`}>
                      {selectedDefect.severity}
                    </span>
                    <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded ${getStatusBadgeClass(selectedDefect.status)}`}>
                      {selectedDefect.status?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono pt-2 border-t border-gray-800">
                  <div>
                    <div className="text-gray-500 text-[10px]">CATEGORY</div>
                    <div className="text-gray-200 capitalize">{selectedDefect.category?.replace('_', ' ')}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-[10px]">COORDINATES</div>
                    <div className="text-gray-200">{Number(selectedDefect.lat).toFixed(4)}, {Number(selectedDefect.lng).toFixed(4)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-[10px]">ELEVATION</div>
                    <div className="text-gray-200">{selectedDefect.elevation_m ? `${selectedDefect.elevation_m}m` : 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 text-[10px]">ASSET</div>
                    <div className="text-gray-200">{selectedDefect.asset_id}</div>
                  </div>
                </div>
              </div>

              {/* Notes & Photo preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-lg bg-gray-950/40 border border-gray-800 space-y-2">
                  <div className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    Field Observations & Inspector
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed italic">
                    "{selectedDefect.notes || 'No specific field notes recorded.'}"
                  </p>
                  <div className="text-[10px] font-mono text-gray-500 pt-1">
                    Recorded by: <span className="text-gray-300">{selectedDefect.inspector || 'Chief Geotechnical Engineer'}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-gray-950/40 border border-gray-800 space-y-2">
                  <div className="text-[11px] font-mono text-gray-400 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-purple-400" />
                    Photogrammetric Photographic Evidence
                  </div>
                  {selectedDefect.photo_urls && selectedDefect.photo_urls.length > 0 ? (
                    <div className="h-28 rounded overflow-hidden border border-gray-700 bg-black flex items-center justify-center">
                      <img 
                        src={selectedDefect.photo_urls[0]} 
                        alt="Defect Evidence" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="h-28 rounded border border-dashed border-gray-800 flex items-center justify-center text-gray-500 text-xs font-mono">
                      No photographic capture attached
                    </div>
                  )}
                </div>
              </div>

              {/* Status Update Form */}
              <form onSubmit={handleUpdateStatus} className="p-4 rounded-lg bg-purple-950/20 border border-purple-500/20 space-y-3">
                <div className="text-xs font-bold text-white font-mono flex items-center justify-between">
                  <span>UPDATE LIFECYCLE STATUS</span>
                  <span className="text-[10px] text-purple-400">STATE MACHINE</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 mb-1">
                      New Status
                    </label>
                    <select
                      value={updateStatus}
                      onChange={(e) => setUpdateStatus(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-100 font-mono focus:border-purple-500 focus:outline-none"
                    >
                      {Object.entries(DEFECT_STATUSES).map(([k, val]) => (
                        <option key={k} value={val}>
                          {val.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono text-gray-400 mb-1">
                      Remarks / Transition Notes
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Field inspection confirmed sand boil active"
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-xs text-gray-100 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('work_order')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono text-purple-300 hover:text-white bg-purple-500/20 hover:bg-purple-500/30 rounded border border-purple-500/30 transition-all"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    Issue Work Order
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 text-xs font-mono font-bold uppercase rounded bg-purple-600 hover:bg-purple-500 text-white transition-all"
                  >
                    {loading ? 'Updating...' : 'Save Status'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: DISPATCH WORK ORDER */}
          {activeTab === 'work_order' && selectedDefect && (
            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-300 font-mono">
                Linking Work Order to Defect #{selectedDefect.annotation_id || selectedDefect.id} ({selectedDefect.title})
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={woPriority}
                    onChange={(e) => setWoPriority(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
                  >
                    <option value="critical">CRITICAL (Immediate Dispatch)</option>
                    <option value="high">HIGH (&lt; 24h Response)</option>
                    <option value="moderate">MODERATE (&lt; 72h Response)</option>
                    <option value="low">LOW (Routine Maintenance)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Assigned Engineering Crew
                  </label>
                  <input
                    type="text"
                    required
                    value={woCrew}
                    onChange={(e) => setWoCrew(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-gray-400 mb-1">
                  Scope of Work & Remediation Instructions *
                </label>
                <textarea
                  rows={3}
                  required
                  value={woDescription}
                  onChange={(e) => setWoDescription(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Target Completion Date
                  </label>
                  <input
                    type="date"
                    required
                    value={woTargetDate}
                    onChange={(e) => setWoTargetDate(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-gray-400 mb-1">
                    Estimated Labor Hours
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="500"
                    value={woEstHours}
                    onChange={(e) => setWoEstHours(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 focus:border-purple-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('inspect')}
                  className="px-4 py-2 text-xs font-mono text-gray-400 hover:text-white rounded bg-gray-800/80 transition-colors"
                >
                  Back to Inspection
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-mono font-bold uppercase rounded bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      Dispatching...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Dispatch Work Order
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
