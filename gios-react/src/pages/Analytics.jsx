import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Chart as ChartJS, LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import giosApi from '../api/giosApi';

ChartJS.register(LinearScale, LogarithmicScale, PointElement, LineElement, Tooltip, Filler);

const INK = '#1d1b18';
const SAT = '#2a6380';
const GND = '#a8501e';
const RULE = '#e3dccd';
const DAY = 86400000;

const ts = (iso) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`);
const fmtMonth = (ms) => new Date(ms).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' });
const fmtDay = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

function axisOptions(xMin, xMax, yTitle, extra = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#fbf9f4', titleColor: INK, bodyColor: INK, borderColor: '#cfc7b6', borderWidth: 1,
        callbacks: { title: (items) => fmtDay(items[0].parsed.x), ...extra.tooltip },
      },
    },
    scales: {
      x: {
        type: 'linear', min: xMin, max: xMax,
        grid: { color: RULE }, border: { color: '#a39b8b' },
        ticks: { color: '#5d574d', maxTicksLimit: 9, callback: (v) => fmtMonth(v), font: { family: 'IBM Plex Sans', size: 11 } },
      },
      y: {
        title: { display: true, text: yTitle, color: '#5d574d', font: { family: 'IBM Plex Sans', size: 12 } },
        grid: { color: RULE }, border: { color: '#a39b8b' },
        ticks: { color: '#5d574d', font: { family: 'IBM Plex Mono', size: 11 } },
        ...extra.y,
      },
    },
  };
}

function pearson(xs, ys) {
  const n = xs.length;
  if (n < 4) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0; let sxx = 0; let syy = 0;
  for (let i = 0; i < n; i += 1) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

export default function Analytics() {
  const [params, setParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [series, setSeries] = useState(null);
  const [gauge, setGauge] = useState(null);
  const siteId = params.get('site') || events[0]?.id;
  const site = events.find((e) => e.id === siteId);

  useEffect(() => {
    giosApi.get('/api/v1/events').then((r) => setEvents(r.data.events || [])).catch(() => setEvents([]));
  }, []);

  useEffect(() => {
    if (!siteId) return;
    setSeries(null);
    setGauge(null);
    giosApi.get(`/api/v1/events/${siteId}/timeseries`, { params: { months: 24 } })
      .then((r) => setSeries(r.data)).catch(() => setSeries({ status: 'unavailable', reason: 'Request failed' }));
    giosApi.get(`/api/v1/events/${siteId}/gauge`, { params: { days: 730 } })
      .then((r) => setGauge(r.data)).catch(() => setGauge({ status: 'unavailable', reason: 'Request failed' }));
  }, [siteId]);

  const water = series?.index === 'mndwi' || series?.index === 'ndwi';
  const xMax = Date.now();
  const xMin = xMax - 730 * DAY;

  const satPoints = useMemo(() => (series?.status === 'ok'
    ? series.points.map((p) => ({ x: ts(p.date), y: water ? p.water_pct : p.mean, p })) : []), [series, water]);
  const gaugePoints = useMemo(() => (gauge?.status === 'ok'
    ? gauge.values.map((v) => ({ x: ts(v.date), y: v.discharge_cfs })) : []), [gauge]);

  // Agreement: satellite value vs gauge discharge on the same day.
  const agreement = useMemo(() => {
    if (!satPoints.length || !gaugePoints.length) return null;
    const byDay = new Map(gaugePoints.map((g) => [g.x, g.y]));
    const pairs = satPoints.filter((s) => byDay.has(s.x)).map((s) => [s.y, byDay.get(s.x)]);
    const r = pearson(pairs.map((p) => p[0]), pairs.map((p) => Math.log10(Math.max(p[1], 0.01))));
    return { n: pairs.length, r };
  }, [satPoints, gaugePoints]);

  const yLabel = water ? 'Open water (% of box)' : `${(series?.index || '').toUpperCase()} (box mean)`;

  return (
    <div className="px-8 py-7 flex flex-col gap-6 max-w-6xl w-full">
      <header>
        <h1 className="font-serif text-3xl text-stone-50">Analysis</h1>
        <p className="text-stone-400 mt-1">The satellite record over each site, set against the ground gauge on the same time axis.</p>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Site">
        {events.map((e) => (
          <button
            key={e.id}
            onClick={() => setParams({ site: e.id })}
            className={`px-3 py-1.5 text-[14px] rounded-[3px] border ${e.id === siteId ? 'bg-[var(--ink)] text-[var(--paper)] border-[var(--ink)]' : 'border-stone-700 text-stone-200 hover:bg-stone-900'}`}
          >
            {e.title}
          </button>
        ))}
      </nav>

      {site && (
        <section className="bg-stone-900 border border-stone-800 rounded-[4px]">
          <header className="px-5 pt-4 pb-3 border-b border-stone-800">
            <h2 className="font-serif text-lg text-stone-50">Satellite: {water ? 'open water' : (series?.index || site.metric || '').toUpperCase()} over the site</h2>
            <p className="text-[12.5px] text-stone-400 mt-0.5">{series?.method || 'Copernicus Sentinel-2 L2A via Microsoft Planetary Computer.'}</p>
          </header>
          <div className="h-[260px] px-4 py-3">
            {series === null && <p className="text-stone-500 p-2">Measuring up to 24 monthly scenes… this takes a few seconds the first time.</p>}
            {series?.status === 'unavailable' && <p className="text-stone-400 p-2">Not available: {series.reason}.</p>}
            {series?.status === 'ok' && (
              <Line
                data={{ datasets: [{ data: satPoints, borderColor: SAT, backgroundColor: SAT, pointRadius: 3.5, pointHoverRadius: 5, borderWidth: 1.5, tension: 0 }] }}
                options={axisOptions(xMin, xMax, yLabel, {
                  tooltip: {
                    label: (it) => {
                      const p = it.raw.p;
                      return water ? `${p.water_pct}% open water · ${p.cloud_cover}% cloud` : `${p.mean.toFixed(3)} (sd ${p.std.toFixed(3)}) · ${p.cloud_cover}% cloud`;
                    },
                  },
                })}
              />
            )}
          </div>
        </section>
      )}

      {site && (
        <section className="bg-stone-900 border border-stone-800 rounded-[4px]">
          <header className="px-5 pt-4 pb-3 border-b border-stone-800">
            <h2 className="font-serif text-lg text-stone-50">Ground: {gauge?.site_name || site.station_name || 'stream gauge'}</h2>
            <p className="text-[12.5px] text-stone-400 mt-0.5">
              {gauge?.source || 'USGS daily mean discharge.'}
              {site.station_name && /not at|km from/i.test(site.station_name) && (
                <span className="text-amber-200"> This gauge is not at the site ({site.station_name.replace(/^USGS #\d+ /, '')}), so it describes the wider catchment.</span>
              )}
            </p>
          </header>
          <div className="h-[220px] px-4 py-3">
            {gauge === null && <p className="text-stone-500 p-2">Loading gauge record…</p>}
            {gauge?.status === 'unavailable' && <p className="text-stone-400 p-2">Not available: {gauge.reason}.</p>}
            {gauge?.status === 'ok' && (
              <Line
                data={{ datasets: [{ data: gaugePoints, borderColor: GND, backgroundColor: 'rgba(168,80,30,0.08)', fill: true, pointRadius: 0, borderWidth: 1.2, tension: 0 }] }}
                options={axisOptions(xMin, xMax, 'Discharge (ft³/s, log)', {
                  y: { type: 'logarithmic', ticks: { color: '#5d574d', font: { family: 'IBM Plex Mono', size: 11 }, callback: (v) => (Number.isInteger(Math.log10(v)) ? v.toLocaleString() : '') } },
                  tooltip: { label: (it) => `${it.parsed.y.toLocaleString()} ft³/s` },
                })}
              />
            )}
          </div>
        </section>
      )}

      {site && agreement && (
        <section className="bg-stone-900 border border-stone-800 rounded-[4px] px-5 py-4">
          <h2 className="font-serif text-lg text-stone-50">Do they agree?</h2>
          {agreement.r === null ? (
            <p className="text-[14px] text-stone-300 mt-1">Only {agreement.n} days have both a satellite scene and a gauge reading, too few to compare.</p>
          ) : (
            <p className="text-[14px] text-stone-300 mt-1 leading-relaxed">
              On the <strong className="text-stone-50">{agreement.n}</strong> days with both a clear scene and a gauge reading, the correlation between
              the satellite {water ? 'open-water share' : series.index.toUpperCase()} and log discharge is{' '}
              <strong className="font-mono text-stone-50">r = {agreement.r.toFixed(2)}</strong>
              {' '}({Math.abs(agreement.r) >= 0.7 ? 'strong' : Math.abs(agreement.r) >= 0.4 ? 'moderate' : 'weak'}).
              {' '}A weak value does not mean either record is wrong: the box sees an area, the gauge sees one point, and they respond to different processes.
            </p>
          )}
        </section>
      )}
    </div>
  );
}
