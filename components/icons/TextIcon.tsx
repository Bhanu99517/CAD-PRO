import React from 'react';

export const TextIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 6.1H7"/>
    <path d="M21 12.1H3"/>
    <path d="M12 18.1V6"/>
  </svg>
);
