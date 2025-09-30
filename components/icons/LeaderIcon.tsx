import React from 'react';

export const LeaderIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3l7 7"/>
    <path d="M10 3h7v7"/>
    <path d="M10 10l7 7"/>
    <path d="M17 10h4v4"/>
  </svg>
);
