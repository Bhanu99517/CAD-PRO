
import React from 'react';

export const LineIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="19" x2="19" y2="5" />
    <circle cx="4" cy="20" r="1.5" fill="currentColor" />
    <circle cx="20" cy="4" r="1.5" fill="currentColor" />
  </svg>
);
