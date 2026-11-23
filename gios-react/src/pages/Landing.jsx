import React from 'react';
import { Link } from 'react-router-dom';
import TiepointMark from '../components/TiepointMark';

// Hand-drawn style chart: a satellite trend and a ground sensor that drift apart.
function MismatchSketch() {
  const sat = 'M20 60 C 90 66, 150 74, 220 84 S 340 104, 400 112';
  const gnd = 'M20 62 C 90 70, 150 86, 220 104 S 340 142, 400 156';
  return (
    <svg viewBox="0 0 430 190" className="w-full h-auto" role="img"
      aria-label="Sketch: a satellite measurement and a ground sensor start together and drift apart over time">
      <defs>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#e3dccd" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="430" height="190" fill="url(#grid)" />
      <line x1="20" y1="20" x2="20" y2="172" stroke="#7d7669" />
      <line x1="20" y1="172" x2="410" y2="172" stroke="#7d7669" />
      <path d={sat} fill="none" stroke="#2a6380" strokeWidth="2.5" strokeLinecap="round" />
      <path d={gnd} fill="none" stroke="#a8501e" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 6" />
      <path d="M392 114 L392 152" stroke="#1d1b18" strokeWidth="1" />
      <path d="M388 114 h8 M388 152 h8" stroke="#1d1b18" strokeWidth="1" />
      <text x="300" y="98" fontSize="12" fill="#2a6380" fontFamily="IBM Plex Sans">satellite</text>
      <text x="268" y="146" fontSize="12" fill="#a8501e" fontFamily="IBM Plex Sans">ground sensor</text>
      <text x="356" y="136" fontSize="12" fill="#1d1b18" fontFamily="Source Serif 4" fontStyle="italic">why?</text>
      <text x="24" y="186" fontSize="10" fill="#7d7669" fontFamily="IBM Plex Mono">time →</text>
    </svg>
  );
}

const STATUS = [
  ['USGS stream-gauge readings', 'Live when the USGS service answers; otherwise a labelled placeholder.'],
  ['Satellite catalogue search (STAC)', 'Live search of public catalogues.'],
  ['Drone GeoTIFF upload and tiles', 'Real, for files you upload.'],
  ['Most map layers and tool results', 'Simulated, to show the workflow.'],
  ['Assistant', 'Needs a language model on the server (Ollama by default).'],
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 text-stone-50">
          <TiepointMark size={26} />
          <span className="font-serif text-xl font-semibold">Tiepoint</span>
        </Link>
        <nav className="flex items-center gap-6 text-[15px]">
          <a href="#how" className="text-stone-400 hover:text-stone-100">How it works</a>
          <a href="#status" className="text-stone-400 hover:text-stone-100 hidden sm:inline">What&rsquo;s real</a>
          <Link to="/login" className="text-stone-100 underline underline-offset-4 decoration-stone-600">Sign in</Link>
        </nav>
      </header>

      <main>
        <section className="max-w-5xl mx-auto px-6 pt-12 pb-20 grid md:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div>
            <p className="text-sm text-primary font-medium mb-4">For geoscientists who work across scales</p>
            <h1 className="font-serif text-[2.6rem] leading-[1.1] md:text-5xl text-stone-50 mb-6">
              A second opinion for Earth data.
            </h1>
            <p className="text-lg leading-relaxed text-stone-300 mb-8 max-w-xl">
              Satellites see whole regions. Ground sensors see one point very well. When the two
              disagree, someone loses days working out why. Tiepoint puts both on one map and helps
              you decide whether the gap is expected, bad data, or something real.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/map" className="bg-[var(--ink)] text-[var(--paper)] px-5 py-2.5 rounded-[3px] font-medium hover:opacity-90">
                Open the map
              </Link>
              <a href="#status" className="px-5 py-2.5 rounded-[3px] border border-stone-700 text-stone-100 hover:bg-stone-900">
                See what&rsquo;s working
              </a>
            </div>
          </div>
          <figure className="bg-stone-900 border border-stone-800 p-4 rounded-[4px]">
            <MismatchSketch />
            <figcaption className="text-xs text-stone-500 mt-2">Illustration, not data.</figcaption>
          </figure>
        </section>

        <section id="how" className="border-t border-stone-800 bg-stone-900">
          <div className="max-w-5xl mx-auto px-6 py-16">
            <h2 className="font-serif text-3xl text-stone-50 mb-10">How it works</h2>
            <ol className="grid md:grid-cols-3 gap-10">
              {[
                ['Put them side by side', 'Load satellite layers, gauges, GPS and drone surveys for the same place and time.'],
                ['Find where they disagree', 'Compare the two scales directly, with units and corrections shown, not hidden.'],
                ['Decide what to check next', 'Get a short list of likely causes and the cheapest measurement that would settle it.'],
              ].map(([t, d], i) => (
                <li key={t}>
                  <p className="font-mono text-sm text-primary mb-2">{String(i + 1).padStart(2, '0')}</p>
                  <h3 className="font-serif text-xl text-stone-50 mb-2">{t}</h3>
                  <p className="text-stone-400 leading-relaxed">{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="status" className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="font-serif text-3xl text-stone-50 mb-2">What&rsquo;s real today</h2>
          <p className="text-stone-400 mb-8 max-w-2xl">
            Tiepoint is an early research prototype. Here is exactly what is live and what is still a stand-in.
          </p>
          <table className="w-full text-left text-[15px] border-t border-stone-700">
            <tbody>
              {STATUS.map(([k, v]) => (
                <tr key={k} className="border-b border-stone-800 align-top">
                  <th className="py-3 pr-6 font-medium text-stone-100 w-2/5">{k}</th>
                  <td className="py-3 text-stone-400">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>

      <footer className="border-t border-stone-800">
        <div className="max-w-5xl mx-auto px-6 py-8 text-sm text-stone-500 flex flex-wrap justify-between gap-4">
          <p>Tiepoint, a student research project. Not for safety decisions.</p>
          <p>Basemaps &copy; Esri and its data contributors, OpenStreetMap contributors.</p>
        </div>
      </footer>
    </div>
  );
}
