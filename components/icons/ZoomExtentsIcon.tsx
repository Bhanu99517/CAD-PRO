import React from 'react';

export const ZoomExtentsIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 8V6a2 2 0 0 1 2-2h2"/>
    <path d="M3 16v2a2 2 0 0 0 2 2h2"/>
    <path d="M16 3h2a2 2 0 0 1 2 2v2"/>
    <path d="M21 16v2a2 2 0 0 1-2 2h-2"/>
  </svg>
);
