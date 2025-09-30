import React from 'react';

export const MirrorIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z"/>
    <path d="M12 22V12"/>
    <path d="M21 7l-9 5-9-5"/>
  </svg>
);
