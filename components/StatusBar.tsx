import React from 'react';
import { Point } from '../types';

interface StatusBarProps {
    coords: Point;
}

const StatusBarItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`px-3 py-1 border-l border-gray-700 ${className}`}>
        {children}
    </div>
)

const StatusBar: React.FC<StatusBarProps> = ({ coords }) => {
  return (
    <div className="h-6 bg-gray-800 border-t border-gray-700 flex items-center text-xs text-gray-400 font-sans">
      <div className="flex-1">
        {/* Can put model/layout tabs here later */}
      </div>
      <div className="flex items-center h-full">
        <StatusBarItem className="w-40 font-mono">
            {coords.x.toFixed(2)}, {coords.y.toFixed(2)}
        </StatusBarItem>
        <StatusBarItem>GRID</StatusBarItem>
        <StatusBarItem>ORTHO</StatusBarItem>
        <StatusBarItem>SNAP</StatusBarItem>
      </div>
    </div>
  );
};

export default StatusBar;
