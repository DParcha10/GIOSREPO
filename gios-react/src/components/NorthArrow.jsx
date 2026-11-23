import React from 'react';

export default function NorthArrow() {
  return (
    <div className="absolute top-[116px] right-5 z-[850] pointer-events-none" aria-label="North is up">
      <svg width="34" height="46" viewBox="0 0 34 46">
        <text x="17" y="11" textAnchor="middle" fontFamily="Source Serif 4, Georgia, serif" fontSize="12" fontWeight="600" fill="#1d1b18">N</text>
        <path d="M17 15 L25 42 L17 35 L9 42 Z" fill="#fbf9f4" stroke="#1d1b18" strokeWidth="1.2" />
        <path d="M17 15 L17 35 L9 42 Z" fill="#1d1b18" />
      </svg>
    </div>
  );
}
