import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import giosApi from '../api/giosApi';
import MapLegend from './MapLegend';
import { SHOWCASE, tileUrl as showcaseTileUrl } from '../showcase';

const V = 'm3';

// What can be draped over the 3D terrain. All of these are real data.
const LAYERS = [
  { id: 'none', label: 'Imagery only' },
  { id: 'mndwi', label: 'MNDWI', kind: 'spectral' },
  { id: 'ndwi', label: 'NDWI', kind: 'spectral' },
  { id: 'ndvi', label: 'NDVI', kind: 'spectral' },
  { id: 'ndmi', label: 'NDMI', kind: 'spectral' },
  { id: 'ndci', label: 'NDCI', kind: 'spectral' },
  { id: 'elevation', label: 'Elevation', kind: 'terrain' },
  { id: 'slope', label: 'Slope', kind: 'terrain' },
  { id: 'vv', label: 'Radar VV', kind: 'sar' },
];

function overlayUrl(layer, site, demRange) {
  const o = window.location.origin;
  if (layer.kind === 'spectral') {
    const q = new URLSearchParams({ index: layer.id, v: V });
    if (site?.start_date) q.set('pre', site.start_date);
    if (site?.end_date) q.set('post', site.end_date);
    return `${o}/api/v1/tiles/sentinel-2-l2a/mosaic/{z}/{x}/{y}.png?${q}`;
  }
  if (layer.kind === 'terrain') {
    const extra = layer.id === 'elevation' && demRange ? `&rescale=${demRange[0]},${demRange[1]}` : '';
    return `${o}/api/v1/tiles/terrain/${layer.id}/{z}/{x}/{y}.png?v=${V}${extra}`;
  }
  if (layer.kind === 'sar') return `${o}/api/v1/tiles/sar/${layer.id}/{z}/{x}/{y}.png?v=${V}`;
  return null;
}

export default function Map3D({ site, initialLayer = 'none', onClose }) {
  const box = useRef(null);
  const map = useRef(null);
  const [ready, setReady] = useState(false);
  const [layerId, setLayerId] = useState(LAYERS.some((l) => l.id === initialLayer) ? initialLayer : 'none');
  const [exaggeration, setExaggeration] = useState(1.5);
  const [opacity, setOpacity] = useState(0.8);
  const [demRange, setDemRange] = useState(null);
  const [demTiles, setDemTiles] = useState(SHOWCASE ? null : `${window.location.origin}/api/v1/tiles/terrain/terrarium/{z}/{x}/{y}.png?v=${V}`);
  const [overlayTiles, setOverlayTiles] = useState(null);

  useEffect(() => {
    if (SHOWCASE) showcaseTileUrl('terrain', 'terrarium').then(setDemTiles);
  }, []);
  const layer = LAYERS.find((l) => l.id === layerId);

  // Elevation colour stretch for this site, so 3D matches the 2D legend.
  useEffect(() => {
    if (!site) return;
    giosApi.get('/api/v1/analysis/imagery/layer', { params: { kind: 'terrain', key: 'elevation', lat: site.lat, lon: site.lng } })
      .then((r) => setDemRange(r.data?.legend?.range || null)).catch(() => {});
  }, [site]);

  useEffect(() => {
    if (!demTiles) return undefined;
    const token = (() => { try { return localStorage.getItem('gios_token'); } catch { return null; } })();
    const origin = window.location.origin;
    const m = new maplibregl.Map({
      container: box.current,
      center: [site?.lng ?? -121.07, site?.lat ?? 37.06],
      zoom: 12.6,
      pitch: 62,
      bearing: -20,
      maxPitch: 80,
      minZoom: 8,
      attributionControl: false,
      transformRequest: (url) => (url.startsWith(`${origin}/api/`) && token
        ? { url, headers: { Authorization: `Bearer ${token}` } } : { url }),
      style: {
        version: 8,
        sources: {
          imagery: {
            type: 'raster', tileSize: 256, maxzoom: 19,
            tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            attribution: 'Imagery © Esri, Maxar',
          },
          dem: {
            type: 'raster-dem', encoding: 'terrarium', tileSize: 256, minzoom: 8, maxzoom: 13,
            tiles: [demTiles],
            attribution: 'Copernicus DEM © DLR, Airbus (EU/ESA)',
          },
          demShade: {
            type: 'raster-dem', encoding: 'terrarium', tileSize: 256, minzoom: 8, maxzoom: 13,
            tiles: [demTiles],
          },
        },
        layers: [
          { id: 'bg', type: 'background', paint: { 'background-color': '#e9e4d8' } },
          { id: 'imagery', type: 'raster', source: 'imagery', paint: { 'raster-saturation': -0.15 } },
          { id: 'shade', type: 'hillshade', source: 'demShade',
            paint: { 'hillshade-exaggeration': 0.35, 'hillshade-shadow-color': '#1d1b18', 'hillshade-highlight-color': '#fbf9f4' } },
        ],
        terrain: { source: 'dem', exaggeration: 1.5 },
      },
    });
    m.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    m.addControl(new maplibregl.ScaleControl({ maxWidth: 140, unit: 'metric' }), 'bottom-left');
    m.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    m.on('load', () => {
      m.resize();
      if (site) {
        new maplibregl.Marker({ color: '#1d1b18', scale: 0.7 }).setLngLat([site.lng, site.lat]).addTo(m);
      }
      setReady(true);
    });
    map.current = m;
    return () => { m.remove(); map.current = null; setReady(false); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demTiles]);

  useEffect(() => {
    if (!SHOWCASE) return;
    setOverlayTiles(null);
    if (!layer || layer.id === 'none') return;
    showcaseTileUrl(layer.kind, layer.id, site, { range: demRange }).then(setOverlayTiles);
  }, [layer, site, demRange]);

  // Drape the chosen layer.
  useEffect(() => {
    const m = map.current;
    if (!m || !ready) return;
    if (m.getLayer('overlay')) m.removeLayer('overlay');
    if (m.getSource('overlay')) m.removeSource('overlay');
    const url = SHOWCASE ? overlayTiles : (layer && overlayUrl(layer, site, demRange));
    if (url) {
      m.addSource('overlay', { type: 'raster', tiles: [url], tileSize: 256, minzoom: 8, maxzoom: layer.kind === 'terrain' ? 13 : 15 });
      m.addLayer({ id: 'overlay', type: 'raster', source: 'overlay', paint: { 'raster-opacity': opacity } }, 'shade');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layerId, ready, demRange, overlayTiles]);

  useEffect(() => {
    const m = map.current;
    if (m && ready && m.getLayer('overlay')) m.setPaintProperty('overlay', 'raster-opacity', opacity);
  }, [opacity, ready]);

  useEffect(() => {
    const m = map.current;
    if (m && ready) m.setTerrain({ source: 'dem', exaggeration });
  }, [exaggeration, ready]);

  const resetView = () => map.current?.easeTo({
    center: [site?.lng ?? -121.07, site?.lat ?? 37.06], zoom: 12.6, pitch: 62, bearing: -20, duration: 900,
  });

  const legendMode = layer?.kind === 'sar' ? 'sar' : layer?.kind === 'terrain' ? 'terrain' : 'spectral';

  return (
    <div className="absolute inset-0 z-[1200] bg-stone-950">
      <div ref={box} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      <div className="absolute top-3 left-3 w-64 bg-stone-900 border border-stone-700 rounded-[3px] text-stone-200">
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-stone-800">
          <div>
            <p className="font-serif text-[15px] text-stone-50 leading-tight">3D view</p>
            <p className="text-[11px] text-stone-500">{site?.title || 'Terrain'}</p>
          </div>
          <button onClick={onClose} className="text-[13px] underline underline-offset-4 decoration-stone-600 hover:text-stone-50">Back to 2D</button>
        </div>
        <div className="px-3 py-2.5 flex flex-col gap-3">
          <label className="block">
            <span className="block text-[12px] text-stone-400 mb-1">Draped layer</span>
            <select value={layerId} onChange={(e) => setLayerId(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-[3px] px-2 py-1.5 text-[14px] text-stone-50">
              {LAYERS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </label>
          {layerId !== 'none' && (
            <label className="block">
              <span className="flex justify-between text-[12px] text-stone-400 mb-1"><span>Layer opacity</span><span className="font-mono">{Math.round(opacity * 100)}%</span></span>
              <input type="range" min="0.2" max="1" step="0.05" value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="w-full accent-[var(--primary)]" />
            </label>
          )}
          <label className="block">
            <span className="flex justify-between text-[12px] text-stone-400 mb-1"><span>Vertical exaggeration</span><span className="font-mono">{exaggeration.toFixed(1)}×</span></span>
            <input type="range" min="1" max="4" step="0.1" value={exaggeration} onChange={(e) => setExaggeration(+e.target.value)} className="w-full accent-[var(--primary)]" />
          </label>
          <div className="flex items-center justify-between">
            <button onClick={resetView} className="text-[13px] px-2.5 py-1 border border-stone-700 rounded-[3px] hover:bg-stone-950">Reset view</button>
            <span className="text-[11px] text-stone-500">Right-drag to tilt and rotate</span>
          </div>
        </div>
        <p className="px-3 pb-2.5 text-[11px] text-stone-500 leading-snug">
          Terrain: Copernicus DEM GLO-30. Imagery: Esri World Imagery.
        </p>
      </div>

      {layer && layer.id !== 'none' && site && (
        <div className="[&>div]:!bottom-10">
          <MapLegend mode={legendMode} index={layer.id} terrainMetric={layer.id} sarPol={layer.id} site={site} />
        </div>
      )}
    </div>
  );
}
