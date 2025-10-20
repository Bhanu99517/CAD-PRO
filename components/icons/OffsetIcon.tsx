import React from 'react';

export const OffsetIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 12h12"/>
    <path d="M6 6h12"/>
    <path d="M12 6V4"/>
    <path d="M12 14v-2"/>
    <path d="M12 20v-2"/>
  </svg>
);
