import React, { useState, useEffect } from 'react';
import { 
  X, Database, HardDrive, CheckCircle2, AlertCircle, RefreshCw, 
  Layers, Sliders, Globe, ZoomIn, Play, Sparkles
} from 'lucide-react';
import { 
  preloadTileCache,
  formatBbox,
  parseBbox
} from '../api/giosApi';
import { 
  calculateTilePyramidCount,
  SATELLITE_COLLECTIONS
} from '../config/constants';

export default function TilePreloadModal({
  isOpen,
  onClose,
  currentBbox = null,
  activeItemId = 'S2A_MSIL2A_20260820_T10SEH',
  activeCollection = 'sentinel-2-l2a'
}) {
  const [collection, setCollection] = useState(activeCollection || 'sentinel-2-l2a');
  const [itemId, setItemId] = useState(activeItemId || 'S2A_MSIL2A_20260820_T10SEH');
  const [bboxInput, setBboxInput] = useState(() => {
    if (currentBbox) return formatBbox(currentBbox);
    return '-121.1500, 37.0000, -121.0000, 37.1000';
  });
  const [minZoom, setMinZoom] = useState(10);
  const [maxZoom, setMaxZoom] = useState(14);
  const [selectedIndices, setSelectedIndices] = useState(['ndmi', 'ndvi']);
  const [selectedColormaps, setSelectedColormaps] = useState(['spectral']);

  // Preload calculation & job state
  const [tileSummary, setTileSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [jobResult, setJobResult] = useState(null);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Synchronize when opened with new props
  useEffect(() => {
    if (isOpen) {
      if (currentBbox) setBboxInput(formatBbox(currentBbox));
      if (activeItemId) setItemId(activeItemId);
      if (activeCollection) setCollection(activeCollection);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen, currentBbox, activeItemId, activeCollection]);

  // Recalculate tile pyramid count whenever bbox or zoom levels change
  useEffect(() => {
    try {
      const parsed = parseBbox(bboxInput, [-121.15, 37.0, -121.0, 37.1]);
      const [minLon, minLat, maxLon, maxLat] = parsed;
      const summary = calculateTilePyramidCount(
        minLon, minLat, maxLon, maxLat,
        Math.min(minZoom, maxZoom),
        Math.max(minZoom, maxZoom)
      );
      setTileSummary(summary);
    } catch {
      setTileSummary(null);
    }
  }, [bboxInput, minZoom, maxZoom]);

  if (!isOpen) return null;

  const handleUseCurrentViewport = () => {
    if (currentBbox) {
      setBboxInput(formatBbox(currentBbox));
    }
  };

  const toggleIndex = (idx) => {
    setSelectedIndices(prev => 
      prev.includes(idx) ? (prev.length > 1 ? prev.filter(i => i !== idx) : prev) : [...prev, idx]
    );
  };

  const toggleColormap = (cmap) => {
    setSelectedColormaps(prev => 
      prev.includes(cmap) ? (prev.length > 1 ? prev.filter(c => c !== cmap) : prev) : [...prev, cmap]
    );
  };

  const handleDispatchPreload = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    setJobResult(null);

    try {
      const parsedBbox = parseBbox(bboxInput, [-121.15, 37.0, -121.0, 37.1]);
      const payload = {
        collection,
        item_id: itemId || 'S2A_MSIL2A_20260820_T10SEH',
        bbox: parsedBbox,
        min_zoom: Number(minZoom),
        max_zoom: Number(maxZoom),
        indices: selectedIndices,
        colormaps: selectedColormaps
      };

      const result = await preloadTileCache(payload);
      setJobResult(result);
      setSuccessMsg(`Preload job dispatched successfully. Job ID: ${result?.job_id || 'PRELOAD-SLD-01'}`);
    } catch (err) {
      setError(err?.response?.data?.detail || err.message || 'Failed to dispatch tile cache preload job');
    } finally {
      setLoading(false);
    }
  };

  const totalCalculatedTiles = (tileSummary?.total_tiles || 0) * selectedIndices.length * selectedColormaps.length;
  const estimatedStorageMb = ((totalCalculatedTiles * 58) / 1024).toFixed(1);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Multi-Scale Tile Pyramid Cache Preload
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                  Slippy Web Mercator
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Warm in-memory and disk tile caches across zoom levels for sub-100ms pans
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

        {/* Alerts */}
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

        {/* Body */}
        <form onSubmit={handleDispatchPreload} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-300 text-sm">
          
          <div className="grid grid-cols-2 gap-4">
            
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Satellite Imagery Collection *
              </label>
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value={SATELLITE_COLLECTIONS.SENTINEL_2}>Sentinel-2 L2A (10m Optical/SWIR)</option>
                <option value={SATELLITE_COLLECTIONS.LANDSAT}>Landsat C2 L2 (30m Optical/Thermal)</option>
                <option value={SATELLITE_COLLECTIONS.DRONE}>Drone Orthomosaic (2.8cm Micro-GSD)</option>
                <option value={SATELLITE_COLLECTIONS.SENTINEL_1}>Sentinel-1 RTC (C-Band SAR Radar)</option>
                <option value={SATELLITE_COLLECTIONS.COP_DEM}>Copernicus DEM (30m Elevation)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Target Scene / Item ID *
              </label>
              <input
                type="text"
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                required
                className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">
                  Area of Interest Envelope (WGS84 minLon, minLat, maxLon, maxLat) *
                </label>
                {currentBbox && (
                  <button
                    type="button"
                    onClick={handleUseCurrentViewport}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                  >
                    <Globe className="w-3 h-3" />
                    Use Current Viewport
                  </button>
                )}
              </div>
              <input
                type="text"
                value={bboxInput}
                onChange={(e) => setBboxInput(e.target.value)}
                required
                placeholder="-121.15, 37.00, -121.00, 37.10"
                className="w-full bg-slate-950/70 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Zoom Range */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Minimum Zoom Level (Macro View)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="8"
                  max="14"
                  value={minZoom}
                  onChange={(e) => setMinZoom(parseInt(e.target.value, 10))}
                  className="flex-1 accent-indigo-500 cursor-pointer"
                />
                <span className="font-mono font-bold text-white text-xs w-6 text-right">{minZoom}</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Maximum Zoom Level (Detailed Pyramids)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="18"
                  value={maxZoom}
                  onChange={(e) => setMaxZoom(parseInt(e.target.value, 10))}
                  className="flex-1 accent-indigo-500 cursor-pointer"
                />
                <span className="font-mono font-bold text-white text-xs w-6 text-right">{maxZoom}</span>
              </div>
            </div>

            {/* Biophysical Indices */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Pre-Rendered Biophysical & Radar Indices
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'ndmi', label: 'NDMI (Moisture Seepage)' },
                  { id: 'ndvi', label: 'NDVI (Vegetation Vigour)' },
                  { id: 'mndwi', label: 'MNDWI (Water Boundary)' },
                  { id: 'nbr', label: 'NBR (Burn Ratio)' },
                  { id: 'lst', label: 'LST (Thermal Infrared)' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleIndex(item.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedIndices.includes(item.id)
                        ? 'bg-indigo-500 text-white shadow-sm'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Colormaps */}
            <div className="col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Pre-Cached Colormaps
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'spectral', label: 'Spectral' },
                  { id: 'viridis', label: 'Viridis' },
                  { id: 'turbo', label: 'Turbo' },
                  { id: 'rdylbu', label: 'RdYlBu' }
                ].map(cmap => (
                  <button
                    key={cmap.id}
                    type="button"
                    onClick={() => toggleColormap(cmap.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      selectedColormaps.includes(cmap.id)
                        ? 'bg-teal-500 text-slate-950 font-bold shadow-sm'
                        : 'bg-slate-800/60 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cmap.label}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Live Calculation Estimate Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Tile Pyramid Cache Forecast
              </span>
              <span className="text-slate-400 font-mono">
                {minZoom} &le; z &le; {maxZoom}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block mb-1">Spatial Tile Grids</span>
                <div className="text-xl font-bold font-mono text-white">
                  {tileSummary?.total_tiles || 0}
                </div>
                <span className="text-[10px] text-slate-500">Unique [z,x,y] coordinates</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block mb-1">Total Cached Tiles</span>
                <div className="text-xl font-bold font-mono text-indigo-300">
                  {totalCalculatedTiles}
                </div>
                <span className="text-[10px] text-slate-500">{selectedIndices.length} indices &times; {selectedColormaps.length} cmaps</span>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/80 rounded-lg p-3">
                <span className="text-[11px] text-slate-400 block mb-1">Estimated Footprint</span>
                <div className="text-xl font-bold font-mono text-emerald-400 flex items-baseline gap-1">
                  <span>{estimatedStorageMb}</span>
                  <span className="text-xs text-slate-400 font-normal">MB</span>
                </div>
                <span className="text-[10px] text-slate-500">~58 KB per PNG tile</span>
              </div>
            </div>

            {/* Per-Zoom Breakdown Chips */}
            {tileSummary?.zoom_tile_counts && (
              <div className="pt-2 border-t border-slate-800/60 flex flex-wrap gap-2 text-xs">
                {Object.entries(tileSummary.zoom_tile_counts).map(([z, cnt]) => (
                  <div key={z} className="px-2.5 py-1 rounded bg-slate-800/70 border border-slate-700/50 flex items-center gap-1.5 font-mono">
                    <span className="text-slate-400">z{z}:</span>
                    <strong className="text-white">{cnt}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Job Result Banner */}
          {jobResult && (
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Preload Worker Active #{jobResult.job_id}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase">
                  {jobResult.status || 'queued'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Backend worker is asynchronously generating and persisting {jobResult.total_tiles_to_cache || totalCalculatedTiles} tiles into local disk cache. Real-time pans will stream with 0 latency.
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/40 rounded-lg"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading || totalCalculatedTiles === 0}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Dispatch Preload Job
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
