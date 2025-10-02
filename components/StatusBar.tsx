import React from 'react';
import { Point } from '../types';

interface StatusBarProps {
    coords: Point;
    snapEnabled: boolean;
    setSnapEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
    orthoEnabled: boolean;
    setOrthoEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
}

const StatusBarItem: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={`px-3 py-1 border-l border-gray-700 h-full flex items-center ${className}`}>
        {children}
    </div>
)

const StatusBarButton: React.FC<{
    children: React.ReactNode;
    onClick: () => void;
    isActive: boolean;
}> = ({ children, onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1 border-l border-gray-700 h-full flex items-center transition-colors ${isActive ? 'text-blue-400 bg-gray-700' : 'hover:bg-gray-700'}`}
    >
        {children}
    </button>
)

const StatusBar: React.FC<StatusBarProps> = ({ coords, snapEnabled, setSnapEnabled, orthoEnabled, setOrthoEnabled }) => {
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
        <StatusBarButton onClick={() => setOrthoEnabled(prev => !prev)} isActive={orthoEnabled}>
            ORTHO
        </StatusBarButton>
        <StatusBarButton onClick={() => setSnapEnabled(prev => !prev)} isActive={snapEnabled}>
            SNAP
        </StatusBarButton>
      </div>
    </div>
  );
};

export default StatusBar;