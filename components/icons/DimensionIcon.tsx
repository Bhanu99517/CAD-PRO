import React from 'react';

export const DimensionIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/>
    <path d="M12 5l-7 7 7 7"/>
    <path d="M19 12l-7-7 7-7"/>
    <path d="M5 7V5h2"/>
    <path d="M19 17v2h-2"/>
  </svg>
);
