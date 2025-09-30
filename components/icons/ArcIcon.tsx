import React from 'react';

export const ArcIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 12A10 10 0 0 0 12 2v10z"/>
    <path d="M2 12a10 10 0 0 0 10 10V12Z"/>
  </svg>
);
