// Online showcase mode (GitHub Pages): no backend. Map imagery comes straight
// from Microsoft Planetary Computer, gauges and earthquakes straight from USGS,
// and site statistics from a dated snapshot of the real server's output.
import snapshot from './snapshot.json';

export const SHOWCASE = import.meta.env.VITE_SHOWCASE === '1';
export { snapshot };

const PC = 'https://planetarycomputer.microsoft.com/api/data/v1';
const mosaics = new Map();

function windowFor(site) {
  const end = site?.end_date || new Date().toISOString().slice(0, 10);
  const start = site?.start_date || new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  return `${start}/${end}`;
}

// Register (once per session) a Planetary Computer mosaic search and return its id.
export function registerMosaic(collection, site) {
  const win = collection === 'cop-dem-glo-30' ? 'static' : windowFor(site);
  const key = `${collection}|${win}`;
  if (!mosaics.has(key)) {
    const body = { collections: [collection] };
    if (collection === 'sentinel-2-l2a') {
      Object.assign(body, {
        datetime: win, 'filter-lang': 'cql2-json',
        filter: { op: '<=', args: [{ property: 'eo:cloud_cover' }, 20] },
        sortby: [{ field: 'eo:cloud_cover', direction: 'asc' }],
      });
    } else if (collection === 'sentinel-1-rtc') {
      Object.assign(body, { datetime: windowFor(null), sortby: [{ field: 'datetime', direction: 'desc' }] });
    }
    mosaics.set(key, fetch(`${PC}/mosaic/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }).then((r) => r.json()).then((d) => d.searchid || d.id).catch(() => null));
  }
  return mosaics.get(key);
}

const INDEX = {
  mndwi: ['(B03-B11)/(B03+B11)', '-0.6,0.6', 'rdbu'],
  ndwi: ['(B03-B08)/(B03+B08)', '-0.6,0.6', 'rdbu'],
  ndvi: ['(B08-B04)/(B08+B04)', '-0.2,0.9', 'rdylgn'],
  ndmi: ['(B08-B11)/(B08+B11)', '-0.4,0.6', 'brbg'],
  ndci: ['(B05-B04)/(B05+B04)', '-0.1,0.3', 'viridis'],
  nbr: ['(B08-B12)/(B08+B12)', '-0.5,0.8', 'rdylgn'],
};

// Hypsometric tint in ten bands (green lowlands, tan, brown, pale peaks), applied after the stretch.
const HYPSO = [[74, 121, 74], [110, 148, 84], [150, 176, 100], [198, 198, 128], [216, 196, 140],
  [196, 158, 104], [176, 128, 88], [150, 110, 90], [190, 170, 160], [248, 246, 242]];
export const HYPSO_CMAP = JSON.stringify(HYPSO.map((c, i) => [[i * 25.6, i < 9 ? (i + 1) * 25.6 : 256], [...c, 255]]));

const tile = (sid, params) => `${PC}/mosaic/${sid}/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?${new URLSearchParams(params)}`;

// Resolve a Leaflet/MapLibre tile URL template for a layer. Returns null if not available online.
export async function tileUrl(kind, key, site, opts = {}) {
  if (kind === 'spectral' && INDEX[key]) {
    const sid = await registerMosaic('sentinel-2-l2a', site);
    const [expression, rescale, colormap_name] = INDEX[key];
    return sid && tile(sid, { collection: 'sentinel-2-l2a', expression, asset_as_band: 'True', rescale, colormap_name, nodata: '0' });
  }
  if (kind === 'terrain') {
    const sid = await registerMosaic('cop-dem-glo-30');
    if (!sid) return null;
    const base = { collection: 'cop-dem-glo-30', assets: 'data' };
    if (key === 'elevation') return tile(sid, { ...base, rescale: (opts.range || [0, 1000]).join(','), colormap: HYPSO_CMAP });
    if (key === 'hillshade') return tile(sid, { ...base, algorithm: 'hillshade', buffer: '3' });
    if (key === 'slope') return tile(sid, { ...base, algorithm: 'slope', buffer: '3', rescale: '0,45', colormap_name: 'ylorrd' });
    if (key === 'terrarium') return tile(sid, { ...base, algorithm: 'terrarium' });
    return null;
  }
  if (kind === 'sar') {
    const sid = await registerMosaic('sentinel-1-rtc', site);
    if (!sid) return null;
    const base = { collection: 'sentinel-1-rtc', asset_as_band: 'True', nodata: '0' };
    if (key === 'vv') return tile(sid, { ...base, expression: '10*log10(vv)', rescale: '-25,0', colormap_name: 'greys_r' });
    if (key === 'vh') return tile(sid, { ...base, expression: '10*log10(vh)', rescale: '-30,-5', colormap_name: 'greys_r' });
    if (key === 'ratio_vh_vv') return tile(sid, { ...base, expression: '10*log10(vh/vv)', rescale: '-20,-5', colormap_name: 'viridis' });
    if (key === 'dual_pol_rgb') {
      const q = new URLSearchParams({ ...base, expression: '10*log10(vv);10*log10(vh);10*log10(vv/vh)' });
      ['-25,0', '-30,-5', '0,15'].forEach((r) => q.append('rescale', r));
      return `${PC}/mosaic/${sid}/tiles/WebMercatorQuad/{z}/{x}/{y}@1x.png?${q}`;
    }
  }
  return null;
}

// --- Stand-in for the API -------------------------------------------------
const nearestSite = (lat, lon) => snapshot.events.reduce((best, e) => {
  const d = (e.lat - lat) ** 2 + (e.lng - lon) ** 2;
  return !best || d < best.d ? { e, d } : best;
}, null)?.e;

async function liveGauge(site, days) {
  const snap = snapshot.sites[site.id]?.gauge;
  if (!site.usgs_station) return snap || { status: 'unavailable', reason: 'No gauge linked' };
  try {
    const r = await fetch(`https://waterservices.usgs.gov/nwis/dv/?format=json&sites=${site.usgs_station}&parameterCd=00060&period=P${days}D`);
    const ts = (await r.json())?.value?.timeSeries?.[0];
    if (!ts) throw new Error('empty');
    const values = ts.values[0].value
      .map((v) => ({ date: v.dateTime.slice(0, 10), discharge_cfs: +v.value, provisional: (v.qualifiers || []).includes('P') }))
      .filter((v) => v.discharge_cfs >= 0);
    if (!values.length) throw new Error('no values');
    return { status: 'ok', site_id: site.usgs_station, site_name: ts.sourceInfo.siteName, unit: 'ft³/s (daily mean)', values, source: snap?.source || 'USGS NWIS daily values (00060).' };
  } catch {
    if (snap?.status === 'ok') {
      const cutoff = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
      return { ...snap, values: snap.values.filter((v) => v.date >= cutoff) };
    }
    return snap || { status: 'unavailable', reason: 'USGS service unreachable' };
  }
}

export class ShowcaseUnavailable extends Error {
  constructor(path) {
    super(`Not available in the online showcase: ${path}`);
    this.response = { status: 503, data: { detail: 'This feature needs the Tiepoint server; it is not part of the online showcase.' } };
  }
}

// Axios adapter: answers the read-only endpoints the showcase pages use.
export async function showcaseAdapter(config) {
  const url = new URL(config.url, 'https://showcase.local');
  const path = url.pathname.replace(/^\/api\/v1/, '');
  const params = { ...Object.fromEntries(url.searchParams), ...(config.params || {}) };
  const ok = (data) => ({ data, status: 200, statusText: 'OK', headers: {}, config, request: {} });
  const method = (config.method || 'get').toLowerCase();
  if (method !== 'get') throw new ShowcaseUnavailable(path);

  if (path === '/health') return ok({ status: 'healthy' });
  if (path === '/events') return ok({ events: snapshot.events, total_count: snapshot.events.length });
  let m = path.match(/^\/events\/([^/]+)(\/(assessment|timeseries|gauge))?$/);
  if (m) {
    const site = snapshot.events.find((e) => e.id === m[1]);
    if (!site) throw new ShowcaseUnavailable(path);
    if (!m[3]) return ok(site);
    if (m[3] === 'gauge') return ok(await liveGauge(site, +params.days || 730));
    return ok(snapshot.sites[site.id]?.[m[3]] || { status: 'unavailable', reason: 'Not in snapshot' });
  }
  if (path === '/analysis/imagery/scene') {
    const site = nearestSite(+params.lat, +params.lon);
    const legend = snapshot.legends[(params.index || '').toLowerCase()];
    const scene = snapshot.sites[site?.id]?.scene;
    return ok({ real: !!(legend && scene), scene, legend });
  }
  if (path === '/analysis/imagery/layer') {
    const site = nearestSite(+params.lat, +params.lon);
    const info = snapshot.sites[site?.id]?.layers?.[`${params.kind}:${params.key}`];
    return ok(info ? { real: true, ...info } : { real: false });
  }
  throw new ShowcaseUnavailable(path);
}

// Server-only features fail quietly in the showcase: drop only our own
// "not available in the online showcase" errors from the console, keep the rest.
if (SHOWCASE && typeof console !== 'undefined') {
  const original = console.error.bind(console);
  const ours = (a) => a instanceof ShowcaseUnavailable
    || (typeof a === 'string' && /online showcase|needs the Tiepoint server/.test(a))
    || (a && typeof a.message === 'string' && /online showcase/.test(a.message));
  console.error = (...args) => { if (!args.some(ours)) original(...args); };
}
