import React from 'react';

export const EraseIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.17 13.17a2.24 2.24 0 0 0 0-3.17L13.17 2a2.24 2.24 0 0 0-3.17 0L2 10l10 10 9.17-9.17z" />
    <path d="m18 6-12 12" />
  </svg>
);