import React, { useEffect, useMemo, useRef, useState } from 'react';

// Groups, in display order. Each tool is matched by name; first match wins.
const GROUPS = [
  { id: 'measure', name: 'Measure & inspect', blurb: 'Probe values, draw areas, cut profiles.',
    match: /inspect pixel|draw polygon|transect|volumetric|symbology/i },
  { id: 'change', name: 'Change & time series', blurb: 'Compare dates and track trends.',
    match: /swipe|time-?lapse|change diff|trend|cva|phenology/i },
  { id: 'imagery', name: 'Imagery processing', blurb: 'Composites, mosaics, calibration, sharpening.',
    match: /composite|mosaic|tile preload|co-?reg|hls|pan-?sharp|super-?res|cross-?calib|topographic scs|topo normal|true ortho|georef|band math|unmixing|multimodal|byoc/i },
  { id: 'water', name: 'Water & hydrology', blurb: 'Bathymetry, water quality, seepage, floods.',
    match: /bathymetry|aquatic|hab water|et studio|rainfall|phreatic|dam breach|dam inundation|piping|flownet/i },
  { id: 'geotech', name: 'Terrain & geotechnical', blurb: 'Slopes, settlement, liquefaction, elevation change.',
    match: /slope|liquefaction|settlement|topo delta|dem relief|geotech/i },
  { id: 'radar', name: 'Radar & InSAR', blurb: 'Backscatter, deformation, damage proxies.',
    match: /insar|sbas|sar /i },
  { id: 'thermal', name: 'Thermal & environment', blurb: 'Surface temperature and biophysical indices.',
    match: /thermal|lst|environmental|biophysical/i },
  { id: 'drone', name: 'Drone & survey', blurb: 'Flight planning, photogrammetry, ground control.',
    match: /drone|odm|lidar|chm|gcp|survey plan|photogrammetry/i },
  { id: 'monitor', name: 'Monitoring & alerts', blurb: 'Sensors, defects, subscriptions, alerts.',
    match: /sensor|defect|subscription|alert/i },
  { id: 'export', name: 'Export', blurb: 'Download rasters and reports.',
    match: /export/i },
];

const clean = (t) => t.replace(/\s+/g, ' ').replace(/\(\d+\)$/, '').trim();

function readTools(root) {
  if (!root) return [];
  const seen = new Set();
  const tools = [];
  root.querySelectorAll('button').forEach((btn) => {
    const raw = (btn.textContent || '').replace(/\s+/g, ' ').trim();
    if (!raw || /synoptic|^macro|^micro/i.test(raw)) return; // zoom readouts, not tools
    const name = clean(raw);
    const key = name.toLowerCase();
    if (seen.has(key)) return; // the old wall had several duplicates
    seen.add(key);
    const count = (raw.match(/\((\d+)\)$/) || [])[1];
    const group = GROUPS.find((g) => g.match.test(name))?.id || 'other';
    const svg = btn.querySelector('svg');
    tools.push({ name, count, group, el: btn, icon: svg ? svg.outerHTML : '' });
  });
  return tools;
}

export default function ToolBrowser({ open, onClose, sourceRef }) {
  const [query, setQuery] = useState('');
  const [tools, setTools] = useState([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setTools(readTools(sourceRef.current));
    setQuery('');
    setActive(0);
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open, sourceRef]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return tools;
    const groupNames = Object.fromEntries(GROUPS.map((g) => [g.id, g.name.toLowerCase()]));
    return tools.filter((t) => t.name.toLowerCase().includes(q) || (groupNames[t.group] || '').includes(q));
  }, [tools, query]);

  const grouped = useMemo(() => {
    const order = [...GROUPS.map((g) => g.id), 'other'];
    return order
      .map((id) => ({ id, meta: GROUPS.find((g) => g.id === id) || { name: 'Other', blurb: '' }, items: filtered.filter((t) => t.group === id) }))
      .filter((g) => g.items.length);
  }, [filtered]);

  const flat = grouped.flatMap((g) => g.items);

  const run = (tool) => {
    onClose();
    // Let the drawer close first so the tool's window opens on top.
    setTimeout(() => tool.el.click(), 0);
  };

  const onKey = (e) => {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && flat[active]) run(flat[active]);
  };

  if (!open) return null;
  let idx = -1;

  return (
    <div className="fixed inset-0 z-[3000]" onKeyDown={onKey}>
      <div className="absolute inset-0 bg-[rgba(29,27,24,0.25)]" onClick={onClose} />
      <aside
        role="dialog"
        aria-label="Tools"
        className="absolute top-0 right-0 h-full w-[420px] max-w-full bg-stone-900 border-l border-stone-700 flex flex-col"
      >
        <header className="px-5 pt-5 pb-3 border-b border-stone-800">
          <div className="flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-stone-50">Tools</h2>
            <button onClick={onClose} className="text-sm text-stone-400 hover:text-stone-100">Close <span className="font-mono text-[11px]">Esc</span></button>
          </div>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            placeholder="Search tools, e.g. slope, InSAR, export"
            className="mt-3 w-full bg-stone-950 border border-stone-700 focus:border-stone-400 text-stone-50 px-3 py-2 rounded-[3px] outline-none text-[15px]"
          />
          <p className="mt-2.5 text-[12px] leading-snug text-stone-400">
            <span className="sim-stamp mr-1.5">Note</span>
            Most tools still run placeholder models; their map overlays are stamped SIMULATED.
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {grouped.length === 0 && <p className="px-3 py-6 text-stone-400">No tools match &ldquo;{query}&rdquo;.</p>}
          {grouped.map((g) => (
            <section key={g.id} className="mb-2">
              <div className="px-3 pt-3 pb-1">
                <h3 className="text-[13px] font-semibold text-stone-100">{g.meta.name}</h3>
                {!query && g.meta.blurb && <p className="text-[11.5px] text-stone-500">{g.meta.blurb}</p>}
              </div>
              <ul>
                {g.items.map((t) => {
                  idx += 1;
                  const i = idx;
                  return (
                    <li key={t.name}>
                      <button
                        onClick={() => run(t)}
                        onMouseEnter={() => setActive(i)}
                        className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-[3px] text-left text-[14px] ${i === active ? 'bg-stone-950 text-stone-50' : 'text-stone-300'}`}
                      >
                        <span className="w-4 h-4 shrink-0 text-stone-500 [&>svg]:w-4 [&>svg]:h-4" dangerouslySetInnerHTML={{ __html: t.icon }} />
                        <span className="flex-1">{t.name}</span>
                        {t.count && <span className="text-[11px] font-mono text-stone-500">{t.count}</span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
        <footer className="px-5 py-2.5 border-t border-stone-800 text-[11px] text-stone-500 font-mono">
          ↑ ↓ to move · Enter to open · / or Ctrl+K to search
        </footer>
      </aside>
    </div>
  );
}
