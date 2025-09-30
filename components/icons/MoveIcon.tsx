import React from 'react';

export const MoveIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 9l-3 3 3 3"/>
        <path d="M9 5l3-3 3 3"/>
        <path d="M15 19l-3 3-3-3"/>
        <path d="M19 9l3 3-3 3"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
        <line x1="12" y1="2" x2="12" y2="22"/>
    </svg>
);
