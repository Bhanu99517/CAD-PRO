import React from 'react';

export const FilletIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 22H2"/>
    <path d="M12 2v10c0 5.52-4.48 10-10 10"/>
  </svg>
);
