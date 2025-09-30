import React from 'react';

export const ScaleIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 3l-6 6"/>
    <path d="M3 21l6-6"/>
    <path d="M21 16V3h-7"/>
    <path d="M3 8V21h7"/>
  </svg>
);
