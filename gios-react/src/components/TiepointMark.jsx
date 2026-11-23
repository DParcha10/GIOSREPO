import React from 'react';

// A surveyor's tie point: two crossed lines and an open circle.
export default function TiepointMark({ size = 24, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="6.5" stroke="var(--primary)" strokeWidth="1.8" />
      <path d="M12 1.5v7M12 15.5v7M1.5 12h7M15.5 12h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="square" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}
