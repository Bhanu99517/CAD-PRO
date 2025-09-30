import React from 'react';

export const ArrayIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12H2"/>
    <path d="M10 12H8"/>
    <path d="M16 12h-2"/>
    <path d="M22 12h-2"/>
    <path d="M12 4v2"/>
    <path d="M12 10v2"/>
    <path d="M12 16v2"/>
    <path d="M12 22v-2"/>
  </svg>
);
