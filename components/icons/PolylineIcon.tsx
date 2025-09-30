import React from 'react';

export const PolylineIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18" />
    <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
    <path d="M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4" />
    <path d="M9 3v1" />
    <path d="M15 3v1" />
    <path d="M9 7v4" />
    <path d="M15 7v4" />
    <polyline points="4 20 4 8 8 8 8 4 16 4 16 8 20 8 20 20 4 20" stroke="none" fill="none" />
    <polyline points="4 12 8 8 12 10 16 8 20 12" />
    <circle cx="4" cy="12" r="1.5" fill="currentColor" />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    <circle cx="12" cy="10" r="1.5" fill="currentColor" />
    <circle cx="16" cy="8" r="1.5" fill="currentColor" />
    <circle cx="20" cy="12" r="1.5" fill="currentColor" />
  </svg>
);
