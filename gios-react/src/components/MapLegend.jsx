import React, { useEffect, useState } from 'react';
import giosApi from '../api/giosApi';

// Approximate colour stops for the ramps the tile service uses.
const RAMPS = {
  rdbu: ['#67001f', '#d6604d', '#fddbc7', '#f7f7f7', '#d1e5f0', '#4393c3', '#053061'],
  rdylgn: ['#a50026', '#f46d43', '#fee08b', '#ffffbf', '#d9ef8b', '#66bd63', '#006837'],
  brbg: ['#543005', '#bf812d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#35978f', '#003c30'],
  viridis: ['#440154', '#414487', '#2a788e', '#22a884', '#7ad151', '#fde725'],
  spectral: ['#9e0142', '#f46d43', '#fee08b', '#ffffbf', '#e6f598', '#66c2a5', '#5e4fa2'],
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

export default function MapLegend({ index, site }) {
  const [info, setInfo] = useState(null);
  const key = `${index}|${site?.lat}|${site?.lng}|${site?.start_date}|${site?.end_date}`;

  useEffect(() => {
    if (!site?.lat || !site?.lng) return undefined;
    let alive = true;
    setInfo(null);
    giosApi
      .get('/api/v1/analysis/imagery/scene', {
        params: { lat: site.lat, lon: site.lng, index, pre: site.start_date, post: site.end_date },
      })
      .then((r) => alive && setInfo(r.data))
      .catch(() => alive && setInfo({ real: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const legend = info?.legend;
  const ramp = RAMPS[legend?.colormap] || RAMPS.spectral;
  const real = info?.real && legend;

  return (
    <div className="absolute bottom-[88px] right-4 z-[900] w-72 bg-stone-900 border border-stone-700 rounded-[3px] shadow-sm text-stone-200">
      <div className="px-3 pt-2.5 pb-2 border-b border-stone-800">
        <p className="font-serif text-[15px] leading-tight text-stone-50">{index.toUpperCase()}</p>
        <p className="text-[11px] text-stone-400 leading-snug">{NAMES[index] || 'Index layer'}</p>
      </div>
      <div className="px-3 py-2.5">
        {real ? (
          <>
            <div className="h-3 w-full border border-stone-700" style={{ background: `linear-gradient(to right, ${ramp.join(',')})` }} />
            <div className="flex justify-between text-[11px] font-mono text-stone-300 mt-1">
              <span>{legend.range[0]}</span>
              <span>0</span>
              <span>{legend.range[1]}</span>
            </div>
            <div className="flex justify-between text-[11px] text-stone-400">
              <span>{legend.low_label}</span>
              <span>{legend.high_label}</span>
            </div>
            <p className="mt-2 text-[10.5px] font-mono text-stone-500">{legend.expression}</p>
          </>
        ) : info ? (
          <p className="text-[12px] text-stone-300 leading-snug">
            <span className="sim-stamp mr-1.5">Simulated</span>
            No real imagery for this layer yet. Colours are a placeholder pattern, not data.
          </p>
        ) : (
          <p className="text-[12px] text-stone-400">Finding imagery…</p>
        )}
      </div>
      {real && info.scene && (
        <div className="px-3 py-2 border-t border-stone-800 text-[11px] leading-snug text-stone-400">
          Source: {(info.scene.platform || 'Sentinel-2').replace(/^sentinel-/i, 'Sentinel-')} L2A,{' '}
          {fmtDate(info.scene.datetime)}, tile {info.scene.mgrs_tile}, {Number(info.scene.cloud_cover).toFixed(1)}% cloud.
          <br />Copernicus data via Microsoft Planetary Computer.
        </div>
      )}
    </div>
  );
}
