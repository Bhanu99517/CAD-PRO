import React from 'react';

export const StretchIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 17H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4"/>
    <path d="M16 7h4a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4"/>
    <path d="M12 2v20"/>
  </svg>
);
