
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
    statusMessage: string;
    theme: 'DARK' | 'LIGHT';
}

const StatusBarButton: React.FC<{ children: React.ReactNode; onClick: () => void; isActive: boolean }> = ({ children, onClick, isActive }) => (
    <button onClick={onClick} className={`px-3 py-1 border-l border-gray-700 h-full flex items-center transition-colors font-bold text-[10px] tracking-wide ${isActive ? 'text-blue-300 bg-[#404c5e]' : 'text-gray-400 hover:bg-gray-700'}`}>
        {children}
    </button>
)

const StatusBar: React.FC<StatusBarProps> = ({ coords, snapEnabled, setSnapEnabled, orthoEnabled, setOrthoEnabled, gridVisible, setGridVisible, statusMessage, theme }) => {
  return (
    <div className={`h-6 border-t flex items-center text-xs font-sans shrink-0 select-none ${theme === 'DARK' ? 'bg-[#1c1c1c] border-gray-700 text-gray-400' : 'bg-gray-200 border-gray-300 text-gray-600'}`}>
      <div className={`flex items-center px-4 h-full border-r mr-2 ${theme === 'DARK' ? 'bg-[#2b2b2b] border-gray-700' : 'bg-gray-300 border-gray-400'}`}>
        <span className="font-semibold">Drawing1.dwg</span>
      </div>
      
      <div className="flex-1 px-2 italic">{statusMessage}</div>
      
      <div className="flex items-center h-full">
        <div className="w-32 md:w-40 font-mono text-[10px] px-2">{coords.x.toFixed(2)}, {coords.y.toFixed(2)}, 0.00</div>
        <StatusBarButton onClick={() => setGridVisible(prev => !prev)} isActive={gridVisible}>GRID</StatusBarButton>
        <StatusBarButton onClick={() => setSnapEnabled(prev => !prev)} isActive={snapEnabled}>SNAP</StatusBarButton>
        <StatusBarButton onClick={() => setOrthoEnabled(prev => !prev)} isActive={orthoEnabled}>ORTHO</StatusBarButton>
        <StatusBarButton onClick={() => {}} isActive={false}>POLAR</StatusBarButton>
        <StatusBarButton onClick={() => {}} isActive={true}>OSNAP</StatusBarButton>
      </div>
    </div>
  );
};

export default StatusBar;
