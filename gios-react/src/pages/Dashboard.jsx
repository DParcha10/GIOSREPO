import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import giosApi from '../api/giosApi';
import { useSiteAssessments, AssessmentBadge } from '../components/SiteAssessment';
import { SHOWCASE, snapshot } from '../showcase';

const fmtDate = (iso) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
const fmtTime = (ms) => new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function Section({ title, note, children, right }) {
  return (
    <section className="bg-stone-900 border border-stone-800 rounded-[4px]">
      <header className="px-5 pt-4 pb-3 border-b border-stone-800 flex items-baseline justify-between gap-4">
        <div>
          <h2 className="font-serif text-lg text-stone-50">{title}</h2>
          {note && <p className="text-[12.5px] text-stone-400 mt-0.5">{note}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

function SourceRow({ name, state, detail }) {
  const dot = state === 'ok' ? 'bg-emerald-400' : state === 'down' ? 'bg-red-400' : 'bg-stone-600';
  const word = state === 'ok' ? 'Responding' : state === 'down' ? 'Not responding' : 'Checking…';
  return (
    <li className="flex items-start gap-3 px-5 py-2.5 border-t border-stone-800 first:border-t-0">
      <span className={`mt-1.5 inline-block w-2 h-2 rounded-full ${dot}`} />
      <div className="flex-1">
        <p className="text-[14px] text-stone-100">{name}</p>
        <p className="text-[12px] text-stone-500">{detail}</p>
      </div>
      <span className="text-[12px] text-stone-400">{word}</span>
    </li>
  );
}

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [gauges, setGauges] = useState({});
  const [quakes, setQuakes] = useState(null);
  const [sources, setSources] = useState({ usgsWater: null, usgsQuake: null });
  const assessments = useSiteAssessments(events);

  useEffect(() => {
    giosApi.get('/api/v1/events').then((r) => setEvents(r.data.events || [])).catch(() => setEvents([]));
    fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson')
      .then((r) => r.json())
      .then((d) => { setQuakes(d.features || []); setSources((s) => ({ ...s, usgsQuake: 'ok' })); })
      .catch(() => { setQuakes([]); setSources((s) => ({ ...s, usgsQuake: 'down' })); });
  }, []);

  useEffect(() => {
    events.forEach((e) => {
      giosApi.get(`/api/v1/events/${e.id}/gauge`, { params: { days: 30 } })
        .then((r) => {
          setGauges((g) => ({ ...g, [e.id]: r.data }));
          if (r.data.status === 'ok') setSources((s) => ({ ...s, usgsWater: 'ok' }));
        })
        .catch(() => setGauges((g) => ({ ...g, [e.id]: { status: 'unavailable' } })));
    });
  }, [events]);

  const assessVals = Object.values(assessments);
  const s2State = assessVals.some((a) => a.status === 'ok') ? 'ok'
    : events.length && assessVals.length === events.length ? 'down' : null;

  const maxMag = quakes && quakes.length ? Math.max(...quakes.map((q) => q.properties.mag || 0)) : null;

  return (
    <div className="px-8 py-7 flex flex-col gap-6 max-w-6xl w-full">
      <header>
        <h1 className="font-serif text-3xl text-stone-50">Overview</h1>
        <p className="text-stone-400 mt-1">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}. {SHOWCASE ? `Gauges and earthquakes load live. Site comparisons are a snapshot of the server's output from ${snapshot.generated}.` : 'Everything on this page comes from live public data.'}
        </p>
      </header>

      <Section
        title="Monitored sites"
        note="Same season this year against last year, from real Sentinel-2 imagery. Gauge values are the latest USGS daily mean."
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr className="text-[12px] text-stone-500">
                <th className="px-5 py-2 font-normal">Site</th>
                <th className="px-3 py-2 font-normal">Result</th>
                <th className="px-3 py-2 font-normal text-right">This year</th>
                <th className="px-3 py-2 font-normal text-right">Last year</th>
                <th className="px-3 py-2 font-normal">Nearest gauge</th>
                <th className="px-5 py-2 font-normal" />
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const a = assessments[e.id];
                const ok = a?.status === 'ok';
                const water = a?.index === 'mndwi' || a?.index === 'ndwi';
                const v = (sc) => (water ? `${sc.stats.water_pct}% water` : sc.stats.mean.toFixed(3));
                const g = gauges[e.id];
                const last = g?.status === 'ok' ? g.values[g.values.length - 1] : null;
                return (
                  <tr key={e.id} className="border-t border-stone-800 align-top">
                    <td className="px-5 py-3">
                      <p className="text-stone-50">{e.title}</p>
                      <p className="text-[12px] text-stone-500">{e.subtitle?.split('|')[0]} · {(e.metric || '').toUpperCase()}</p>
                    </td>
                    <td className="px-3 py-3"><AssessmentBadge a={a} /></td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">
                      {ok ? <>{v(a.current)}<span className="block text-[11px] text-stone-500 font-sans">{fmtDate(a.current.date)}</span></> : '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-[13px]">
                      {ok ? <>{v(a.baseline)}<span className="block text-[11px] text-stone-500 font-sans">{fmtDate(a.baseline.date)}</span></> : '—'}
                    </td>
                    <td className="px-3 py-3 text-[13px]">
                      {last ? (
                        <>
                          <span className="font-mono">{last.discharge_cfs.toLocaleString()} ft³/s</span>
                          <span className="block text-[11px] text-stone-500">{g.site_name} · {fmtDate(last.date)}{last.provisional ? ' · provisional' : ''}</span>
                        </>
                      ) : g ? <span className="text-stone-500">No recent record</span> : <span className="text-stone-500">Loading…</span>}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <Link to={`/analytics?site=${e.id}`} className="text-[13px] underline underline-offset-4 decoration-stone-600 text-stone-200">Time series</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid md:grid-cols-[1.4fr_1fr] gap-6">
        <Section
          title="Earthquakes, past 24 hours"
          note="Magnitude 2.5 and above, worldwide. USGS Earthquake Hazards Program."
          right={quakes && <p className="text-[13px] text-stone-400 whitespace-nowrap">{quakes.length} events · largest M {maxMag?.toFixed(1)}</p>}
        >
          <ul className="max-h-[320px] overflow-y-auto">
            {quakes === null && <li className="px-5 py-3 text-stone-500">Loading…</li>}
            {quakes && quakes.slice(0, 12).map((q) => (
              <li key={q.id} className="px-5 py-2 border-t border-stone-800 first:border-t-0 flex items-baseline gap-4">
                <span className="font-mono text-[14px] w-12 text-stone-50">M {q.properties.mag?.toFixed(1)}</span>
                <span className="flex-1 text-[13.5px] text-stone-200 truncate">{q.properties.place}</span>
                <span className="text-[12px] text-stone-500 whitespace-nowrap">{fmtTime(q.properties.time)}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Data sources" note="What this page reads, and whether it answered just now.">
          <ul>
            <SourceRow name="Copernicus Sentinel-2 (Planetary Computer)" state={s2State} detail={SHOWCASE ? `Map layers load live; site comparisons are a snapshot from ${snapshot.generated}` : 'Surface reflectance for site comparisons and map layers'} />
            <SourceRow name="USGS Water Data (NWIS)" state={sources.usgsWater} detail="Daily stream discharge. USGS retires this service in Feb 2027." />
            <SourceRow name="USGS Earthquake feed" state={sources.usgsQuake} detail="GeoJSON summary feed, refreshed every minute by USGS" />
          </ul>
        </Section>
      </div>
    </div>
  );
}
