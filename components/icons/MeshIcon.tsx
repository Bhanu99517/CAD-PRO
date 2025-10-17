import React from 'react';

export const MeshIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3l10 6 10-6"/>
    <path d="M2 9l10 6 10-6"/>
    <path d="M2 15l10 6 10-6"/>
    <line x1="12" y1="3" x2="12" y2="21"/>
    <line x1="4" y1="4.5" x2="4" y2="19.5"/>
    <line x1="20" y1="4.5" x2="20" y2="19.5"/>
  </svg>
);
