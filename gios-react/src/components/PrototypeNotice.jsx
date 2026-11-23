import React, { useState } from 'react';

const KEY = 'tiepoint-notice-dismissed';

// Shown on every signed-in page until dismissed for the session.
export default function PrototypeNotice({ compact = false }) {
  const [hidden, setHidden] = useState(() => {
    try { return sessionStorage.getItem(KEY) === '1'; } catch { return false; }
  });
  if (hidden) return null;
  return (
    <div className={`flex items-start gap-3 border-b border-amber-700 bg-amber-950 text-amber-100 ${compact ? 'px-3 py-1.5 text-xs' : 'px-6 py-2.5 text-sm'}`}>
      <span className="sim-stamp mt-0.5 shrink-0">Prototype</span>
      <p className="flex-1 leading-snug">
        Many map layers and tool results here are simulated so the workflow can be shown end to end.
        Don&rsquo;t use them for safety or engineering decisions.
      </p>
      <button
        onClick={() => { try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ } setHidden(true); }}
        className="shrink-0 underline underline-offset-2 text-amber-200 hover:text-amber-50"
      >
        Got it
      </button>
    </div>
  );
}
