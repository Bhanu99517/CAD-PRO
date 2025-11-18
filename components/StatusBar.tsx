
import React from 'react';
import { Point } from '../types';

interface StatusBarProps {
    coords: Point;
    snapEnabled: boolean;
    setSnapEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
    orthoEnabled: boolean;
    setOrthoEnabled: (enabled: boolean | ((prev: boolean) => boolean)) => void;
    gridVisible: boolean;
    setGridVisible: (visible: boolean | ((prev: boolean) => boolean)) => void;
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
        className={`px-3 py-1 border-l border-gray-700 h-full flex items-center transition-colors font-bold text-[10px] tracking-wide ${isActive ? 'text-blue-300 bg-[#404c5e]' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`}
    >
        {children}
    </button>
)

const StatusBar: React.FC<StatusBarProps> = ({ coords, snapEnabled, setSnapEnabled, orthoEnabled, setOrthoEnabled, gridVisible, setGridVisible }) => {
  return (
    <div className="h-6 bg-[#1c1c1c] border-t border-gray-700 flex items-center text-xs text-gray-400 font-sans shrink-0 select-none">
      <div className="flex items-center px-4 bg-[#2b2b2b] h-full border-r border-gray-700 mr-2">
        <span className="font-semibold text-gray-300">Drawing1.dwg</span>
      </div>
      
      <div className="flex-1"></div>
      
      <div className="flex items-center h-full">
        <StatusBarItem className="w-32 md:w-40 font-mono text-[10px]">
            {coords.x.toFixed(2)}, {coords.y.toFixed(2)}, 0.00
        </StatusBarItem>
        <StatusBarButton onClick={() => setGridVisible(prev => !prev)} isActive={gridVisible}>
            GRID
        </StatusBarButton>
        <StatusBarButton onClick={() => setSnapEnabled(prev => !prev)} isActive={snapEnabled}>
            SNAP
        </StatusBarButton>
        <StatusBarButton onClick={() => setOrthoEnabled(prev => !prev)} isActive={orthoEnabled}>
            ORTHO
        </StatusBarButton>
        <StatusBarButton onClick={() => {}} isActive={false}>
            POLAR
        </StatusBarButton>
        <StatusBarButton onClick={() => {}} isActive={true}>
            OSNAP
        </StatusBarButton>
        <StatusBarButton onClick={() => {}} isActive={false}>
            OTRACK
        </StatusBarButton>
      </div>
    </div>
  );
};

export default StatusBar;
