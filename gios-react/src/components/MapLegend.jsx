import React, { useEffect, useState } from 'react';
import giosApi from '../api/giosApi';

// Approximate colour stops for the ramps the tile service uses.
const RAMPS = {
  rdbu: ['#67001f', '#d6604d', '#fddbc7', '#f7f7f7', '#d1e5f0', '#4393c3', '#053061'],
  rdylgn: ['#a50026', '#f46d43', '#fee08b', '#ffffbf', '#d9ef8b', '#66bd63', '#006837'],
  brbg: ['#543005', '#bf812d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#35978f', '#003c30'],
  viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
  spectral: ['#9e0142', '#f46d43', '#fee08b', '#ffffbf', '#e6f598', '#66c2a5', '#5e4fa2'],
  gist_earth: ['#000000', '#1c3b78', '#2f7c84', '#47a05a', '#a3b561', '#c9a77a', '#e8d6c9', '#fdfbfb'],
  greys: ['#ffffff', '#000000'],
  greys_r: ['#000000', '#ffffff'],
  ylorrd: ['#ffffcc', '#fed976', '#fd8d3c', '#e31a1c', '#800026'],
  hypso: ['#4a794a', '#8caa60', '#d8cc8c', '#ba8c5c', '#966e5a', '#f8f6f2'],
};

const NAMES = {
  mndwi: 'Modified Normalized Difference Water Index',
  ndwi: 'Normalized Difference Water Index',
  ndvi: 'Normalized Difference Vegetation Index',
  ndmi: 'Normalized Difference Moisture Index',
  ndci: 'Normalized Difference Chlorophyll Index',
  nbr: 'Normalized Burn Ratio',
};

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function fmtSource(scene) {
  if (!scene) return null;
  if (scene.collection === 'cop-dem-glo-30') {
    return <>Source: Copernicus DEM GLO-30 (30 m). &copy; DLR e.V. 2010-2014 and &copy; Airbus Defence and Space GmbH 2014-2018, provided under COPERNICUS by the European Union and ESA.</>;
  }
  if (scene.collection === 'sentinel-1-rtc') {
    return <>Source: mosaic of Sentinel-1 IW GRD passes, radiometrically terrain corrected, newest first. At the site: {(scene.platform || 'Sentinel-1').replace(/^sentinel-/i, 'Sentinel-')}, {fmtDate(scene.datetime)}{scene.orbit ? `, ${scene.orbit} pass` : ''}. Copernicus data via Microsoft Planetary Computer.</>;
  }
  return <>Source: mosaic of Sentinel-2 L2A scenes (20% cloud or less, clearest first). At the site: {(scene.platform || 'Sentinel-2').replace(/^sentinel-/i, 'Sentinel-')}, {fmtDate(scene.datetime)}, tile {scene.mgrs_tile}, {Number(scene.cloud_cover).toFixed(1)}% cloud. Copernicus data via Microsoft Planetary Computer.</>;
}

const TERRAIN_NAMES = { elevation: 'Elevation', slope: 'Slope', hillshade: 'Hillshade', aspect: 'Aspect' };

export default function MapLegend({ mode = 'spectral', index, terrainMetric, sarPol, site, onRange }) {
  const [info, setInfo] = useState(null);
  const layerKey = mode === 'terrain' ? terrainMetric : mode === 'sar' ? sarPol : index;
  const key = `${mode}|${layerKey}|${site?.lat}|${site?.lng}|${site?.start_date}|${site?.end_date}`;

  useEffect(() => {
    if (mode === 'drone') { setInfo({ real: false, drone: true }); return undefined; }
    if (!site?.lat || !site?.lng) return undefined;
    let alive = true;
    setInfo(null);
    const req = mode === 'spectral'
      ? giosApi.get('/api/v1/analysis/imagery/scene', { params: { lat: site.lat, lon: site.lng, index, pre: site.start_date, post: site.end_date } })
      : giosApi.get('/api/v1/analysis/imagery/layer', { params: { kind: mode, key: layerKey, lat: site.lat, lon: site.lng } });
    req.then((r) => {
      if (!alive) return;
      setInfo(r.data);
      if (onRange) onRange(r.data?.legend?.range || null);
    }).catch(() => alive && setInfo({ real: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const legend = info?.legend;
  const real = info?.real && legend;
  const title = mode === 'spectral' ? (layerKey || '').toUpperCase()
    : real ? legend.title : mode === 'terrain' ? TERRAIN_NAMES[layerKey] || 'Terrain'
    : mode === 'sar' ? `Sentinel-1 ${String(layerKey).toUpperCase()}` : 'Drone survey';
  const subtitle = mode === 'spectral' ? (NAMES[layerKey] || 'Index layer') : real ? legend.unit : '';
  const ramp = RAMPS[legend?.colormap] || RAMPS.spectral;
  const lowLabel = legend?.low_label ?? legend?.low;
  const highLabel = legend?.high_label ?? legend?.high;

  return (
    <div className="absolute bottom-[88px] right-4 z-[900] w-72 bg-stone-900 border border-stone-700 rounded-[3px] shadow-sm text-stone-200">
      <div className="px-3 pt-2.5 pb-2 border-b border-stone-800">
        <p className="font-serif text-[15px] leading-tight text-stone-50">{title}</p>
        {subtitle && <p className="text-[11px] text-stone-400 leading-snug">{subtitle}</p>}
      </div>
      <div className="px-3 py-2.5">
        {real && legend.colormap === 'rgb' ? (
          <p className="text-[12px] text-stone-300">Red = VV, green = VH, blue = VV/VH. Water is dark; vegetation looks green; urban areas are bright.</p>
        ) : real ? (
          <>
            <div className="h-3 w-full border border-stone-700" style={{ background: `linear-gradient(to right, ${ramp.join(',')})` }} />
            {legend.range && (
              <div className="flex justify-between text-[11px] font-mono text-stone-300 mt-1">
                <span>{legend.range[0]}</span>
                <span>{legend.range[1]}</span>
              </div>
            )}
            <div className="flex justify-between text-[11px] text-stone-400">
              <span>{lowLabel}</span>
              <span>{highLabel}</span>
            </div>
            {legend.expression && <p className="mt-2 text-[10.5px] font-mono text-stone-500">{legend.expression}</p>}
          </>
        ) : info?.drone ? (
          <p className="text-[12px] text-stone-300 leading-snug">
            Shows drone orthomosaics you upload (GeoTIFF, via Drone Centimeter). No survey has been uploaded for this site, so nothing is drawn.
          </p>
        ) : info ? (
          <p className="text-[12px] text-stone-300 leading-snug">
            <span className="sim-stamp mr-1.5">Simulated</span>
            No real data source for this layer yet. Tiles are stamped SIMULATED.
          </p>
        ) : (
          <p className="text-[12px] text-stone-400">Finding imagery…</p>
        )}
      </div>
      {real && info.scene && (
        <div className="px-3 py-2 border-t border-stone-800 text-[11px] leading-snug text-stone-400">
          {fmtSource(info.scene)}
        </div>
      )}
    </div>
  );
}
