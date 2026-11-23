import { useEffect, useState } from 'react';
import giosApi from '../api/giosApi';
import { fmtLatLng } from '../utils/coords';

// Fetch measured assessments for the monitored sites once per session.
export function useSiteAssessments(events) {
  const [byId, setById] = useState({});
  const ids = (events || []).map((e) => e.id).join(',');
  useEffect(() => {
    let alive = true;
    (events || []).forEach((e) => {
      giosApi
        .get(`/api/v1/events/${e.id}/assessment`)
        .then((r) => alive && setById((m) => ({ ...m, [e.id]: r.data })))
        .catch(() => alive && setById((m) => ({ ...m, [e.id]: { status: 'unavailable', label: 'Not assessed' } })));
    });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);
  return byId;
}

export function AssessmentBadge({ a }) {
  if (!a) return <span className="text-[11px] text-stone-500">Measuring…</span>;
  const cls = a.status !== 'ok'
    ? 'text-stone-400 border-stone-700'
    : a.tone === 'attention'
      ? 'text-amber-200 border-amber-600 bg-amber-950'
      : 'text-stone-200 border-stone-600';
  return (
    <span className={`inline-block text-[11px] px-1.5 py-0.5 rounded-[2px] border ${cls}`}>
      {a.label}{a.confidence === 'low' ? ' (low confidence)' : ''}
    </span>
  );
}

const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

export function AssessmentDetail({ site, a }) {
  const water = a?.index === 'mndwi' || a?.index === 'ndwi';
  const val = (s) => (water ? `${s.stats.water_pct}% water` : s.stats.mean.toFixed(3));
  return (
    <div className="p-4 border-t border-stone-800 bg-stone-900 flex flex-col gap-2.5 text-stone-200">
      <div>
        <p className="font-serif text-[16px] text-stone-50 leading-tight mb-1.5">{site.title}</p>
        <AssessmentBadge a={a} />
      </div>
      <p className="text-[12px] text-stone-400 leading-snug">{site.description}</p>
      {a?.status === 'ok' ? (
        <>
          <dl className="text-[12px] border-t border-stone-800 divide-y divide-stone-800">
            {[['This year', a.current], ['Last year', a.baseline]].map(([k, sc]) => (
              <div key={k} className="flex justify-between gap-3 py-1.5">
                <dt>
                  <span className="text-stone-300">{k}</span>
                  <span className="block text-[11px] text-stone-500">{fmtDate(sc.date)} · {sc.cloud_cover}% cloud</span>
                </dt>
                <dd className="font-mono text-stone-100 self-center">{val(sc)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 py-1.5">
              <dt>
                <span className="text-stone-200">Change in {a.index.toUpperCase()}</span>
                <span className="block text-[11px] text-stone-500">Screening threshold ±{a.threshold}{water ? ' pts' : ''}</span>
              </dt>
              <dd className="font-mono text-stone-50 self-center">{a.change > 0 ? '+' : ''}{a.change}{water ? ' pts' : ''}</dd>
            </div>
          </dl>
          {a.confidence_note && <p className="text-[11.5px] text-amber-200">{a.confidence_note}</p>}
          <details className="text-[11.5px] text-stone-400">
            <summary className="cursor-pointer text-stone-300">How this was measured</summary>
            <p className="mt-1 leading-snug">{a.method}</p>
            <p className="mt-1 leading-snug">Centre {fmtLatLng(site.lat, site.lng)}. Data: Copernicus Sentinel-2 via Microsoft Planetary Computer.</p>
          </details>
        </>
      ) : a ? (
        <p className="text-[12px] text-stone-400">Not assessed: {a.reason || 'imagery unavailable'}.</p>
      ) : (
        <p className="text-[12px] text-stone-500">Measuring from Sentinel-2…</p>
      )}
    </div>
  );
}
