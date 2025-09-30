import React from 'react';

export const PresspullIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12H8" />
    <path d="M18 15l3-3-3-3" />
    <path d="M3 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    <path d="M3 12V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
  </svg>
);