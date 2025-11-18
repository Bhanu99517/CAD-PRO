
import React, { useState } from 'react';
import { Tool, ViewMode } from '../types';
import { CursorIcon } from './icons/CursorIcon';
import { LineIcon } from './icons/LineIcon';
import { RectangleIcon } from './icons/RectangleIcon';
import { CircleIcon } from './icons/CircleIcon';
import { HandIcon } from './icons/HandIcon';
import { PolylineIcon } from './icons/PolylineIcon';
import { MoveIcon } from './icons/MoveIcon';
import { RotateIcon } from './icons/RotateIcon';
import { ScaleIcon } from './icons/ScaleIcon';
import { ArcIcon } from './icons/ArcIcon';
import { CopyIcon } from './icons/CopyIcon';
import { MirrorIcon } from './icons/MirrorIcon';
import { StretchIcon } from './icons/StretchIcon';
import { TrimIcon } from './icons/TrimIcon';
import { FilletIcon } from './icons/FilletIcon';
import { ArrayIcon } from './icons/ArrayIcon';
import { TextIcon } from './icons/TextIcon';
import { DimensionIcon } from './icons/DimensionIcon';
import { LeaderIcon } from './icons/LeaderIcon';
import { TableIcon } from './icons/TableIcon';
import { LayersIcon } from './icons/LayersIcon';
import { EraseIcon } from './icons/EraseIcon';
import { SlidersIcon } from './icons/SlidersIcon';
import { ExtrudeIcon } from './icons/ExtrudeIcon';
import { PresspullIcon } from './icons/PresspullIcon';
import { OffsetIcon } from './icons/OffsetIcon';
import { ZoomExtentsIcon } from './icons/ZoomExtentsIcon';
import { SaveIcon } from './icons/SaveIcon';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { ZooAiIcon } from './icons/ZooAiIcon';

// Simple SVG placeholders for icons not in the original set but requested in design
const PrinterIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9"></polyline>
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
    <rect x="6" y="14" width="12" height="8"></rect>
  </svg>
);

const FilePlusIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="12" y1="11" x2="12" y2="17"></line>
    <line x1="9" y1="14" x2="15" y2="14"></line>
  </svg>
);

const GearIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
);

const UndoIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"/>
    <path d="M20.49 15a9 9 0 0 0-14.85-3.36L3 7"/>
  </svg>
);

const RedoIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 13"/>
  </svg>
);

interface HeaderProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  setMobilePanel: (panel: 'PROPERTIES' | 'LAYERS' | 'ZOO_AI' | null) => void;
  onSave: () => void;
  onLoad: () => void;
  onZoomExtents: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  desktopPanel: 'PROPERTIES_LAYERS' | 'ZOO_AI';
  setDesktopPanel: (panel: 'PROPERTIES_LAYERS' | 'ZOO_AI') => void;
}

// --- Components ---

const RibbonButton: React.FC<{
    Icon: React.FC<{ className: string }>;
    label: string;
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    size?: 'large' | 'small';
}> = ({ Icon, label, onClick, isActive, disabled, size = 'small' }) => {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={label}
            className={`
                flex flex-col items-center justify-center rounded hover:bg-[#4c4c4c] hover:shadow-inner transition-colors
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isActive ? 'bg-[#404c5e] text-blue-300 border border-blue-500/30' : 'text-gray-200'}
                ${size === 'large' ? 'h-[68px] min-w-[50px] px-2' : 'h-[22px] w-full flex-row justify-start px-1 space-x-2'}
            `}
        >
            <Icon className={size === 'large' ? 'w-8 h-8 mb-1' : 'w-4 h-4'} />
            <span className={`text-[10px] whitespace-nowrap ${size === 'large' ? 'mt-1' : ''}`}>{label}</span>
        </button>
    );
};

const RibbonGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="flex flex-col h-full border-r border-gray-600/50 px-2 relative group min-w-max">
        <div className="flex flex-row h-full pb-4 space-x-1">
            {children}
        </div>
        <div className="absolute bottom-0 left-0 w-full text-center bg-[#3a3a3a] py-[2px]">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold group-hover:text-gray-200">{title}</span>
        </div>
    </div>
);

const QuickAccessButton: React.FC<{ Icon: React.FC<{ className: string }>; onClick: () => void; title: string }> = ({ Icon, onClick, title }) => (
    <button onClick={onClick} title={title} className="p-1 rounded hover:bg-gray-600 text-gray-300 mx-[1px]">
        <Icon className="w-4 h-4" />
    </button>
);

const MenuLink: React.FC<{ label: string }> = ({ label }) => (
    <button className="px-2 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded-sm cursor-default">
        {label}
    </button>
);

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`
            px-4 py-1 text-sm rounded-t-sm border-r border-gray-700 transition-colors relative top-[1px]
            ${active 
                ? 'bg-[#333333] text-white font-medium border-t-2 border-t-blue-500 z-10' 
                : 'bg-[#2b2b2b] text-gray-400 hover:bg-[#333333] hover:text-gray-200'}
        `}
    >
        {label}
    </button>
);

const Header: React.FC<HeaderProps> = ({ activeTool, setActiveTool, undo, redo, canUndo, canRedo, onSave, onLoad, desktopPanel, setDesktopPanel }) => {
  const [activeTab, setActiveTab] = useState<'Home' | 'Insert' | 'Annotate' | 'Parametric' | 'View' | 'Manage' | 'Output'>('Home');

  return (
    <div className="flex flex-col w-full shrink-0 select-none">
        {/* 1. Quick Access Toolbar */}
        <div className="h-8 bg-[#1c1c1c] flex items-center px-2 border-b border-gray-800 justify-between">
            <div className="flex items-center">
                {/* App Icon */}
                <div className="w-6 h-6 bg-red-700 rounded-sm flex items-center justify-center text-white font-bold mr-3 cursor-pointer shadow-sm">
                    A
                </div>
                
                <div className="h-4 w-[1px] bg-gray-600 mx-1"></div>
                
                <QuickAccessButton Icon={FilePlusIcon} onClick={() => alert('New File')} title="New" />
                <QuickAccessButton Icon={FolderOpenIcon} onClick={onLoad} title="Open" />
                <QuickAccessButton Icon={SaveIcon} onClick={onSave} title="Save" />
                <QuickAccessButton Icon={PrinterIcon} onClick={() => alert('Print')} title="Print" />
                
                <div className="h-4 w-[1px] bg-gray-600 mx-1"></div>

                <QuickAccessButton Icon={UndoIcon} onClick={undo} title="Undo" />
                <QuickAccessButton Icon={RedoIcon} onClick={redo} title="Redo" />
                
                <div className="ml-4 flex items-center bg-[#2a2a2a] border border-gray-700 rounded px-2 py-0.5 cursor-pointer hover:border-gray-500">
                    <GearIcon className="w-3 h-3 text-gray-400 mr-2" />
                    <span className="text-xs text-gray-300 mr-4">Drafting & Annotation</span>
                    <span className="text-[8px] text-gray-500">▼</span>
                </div>
            </div>
            
            {/* Right side QAT items */}
            <div className="flex items-center space-x-2 text-xs text-gray-400 mr-2">
                <div className="bg-[#2a2a2a] px-2 py-0.5 rounded flex items-center border border-gray-700">
                    <span className="mr-2">Layer: 0</span>
                    <span className="text-[8px]">▼</span>
                </div>
            </div>
        </div>

        {/* 2. Menu Bar */}
        <div className="h-6 bg-[#2b2b2b] flex items-center px-2 border-b border-gray-700 shadow-sm z-10">
            <MenuLink label="File" />
            <MenuLink label="Edit" />
            <MenuLink label="View" />
            <MenuLink label="Insert" />
            <MenuLink label="Format" />
            <MenuLink label="Tools" />
            <MenuLink label="Draw" />
            <MenuLink label="Dimension" />
            <MenuLink label="Modify" />
            <MenuLink label="Window" />
            <MenuLink label="Help" />
        </div>

        {/* 3. Ribbon Tabs */}
        <div className="bg-[#2b2b2b] px-2 flex items-end border-b border-gray-600 pt-1">
            <TabButton label="Home" active={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
            <TabButton label="Insert" active={activeTab === 'Insert'} onClick={() => setActiveTab('Insert')} />
            <TabButton label="Annotate" active={activeTab === 'Annotate'} onClick={() => setActiveTab('Annotate')} />
            <TabButton label="Parametric" active={activeTab === 'Parametric'} onClick={() => setActiveTab('Parametric')} />
            <TabButton label="View" active={activeTab === 'View'} onClick={() => setActiveTab('View')} />
            <TabButton label="Manage" active={activeTab === 'Manage'} onClick={() => setActiveTab('Manage')} />
            <TabButton label="Output" active={activeTab === 'Output'} onClick={() => setActiveTab('Output')} />
        </div>

        {/* 4. Ribbon Panel Area */}
        <div className="h-24 bg-[#333333] border-b border-gray-800 flex px-2 py-1 overflow-x-auto shadow-md">
            {activeTab === 'Home' && (
                <>
                    {/* Draw Group */}
                    <RibbonGroup title="Draw">
                        {/* Big buttons column */}
                        <div className="flex flex-col space-y-1">
                             <RibbonButton Icon={LineIcon} label="Line" size="large" isActive={activeTool === Tool.LINE} onClick={() => setActiveTool(Tool.LINE)} />
                        </div>
                         <div className="flex flex-col space-y-1">
                             <RibbonButton Icon={PolylineIcon} label="Polyline" size="large" isActive={activeTool === Tool.POLYLINE} onClick={() => setActiveTool(Tool.POLYLINE)} />
                        </div>
                         <div className="flex flex-col space-y-1">
                             <RibbonButton Icon={CircleIcon} label="Circle" size="large" isActive={activeTool === Tool.CIRCLE} onClick={() => setActiveTool(Tool.CIRCLE)} />
                        </div>
                        {/* Small buttons column */}
                        <div className="flex flex-col space-y-[2px] justify-start min-w-[60px]">
                            <RibbonButton Icon={ArcIcon} label="Arc" isActive={activeTool === Tool.ARC} onClick={() => setActiveTool(Tool.ARC)} />
                            <RibbonButton Icon={RectangleIcon} label="Rectangle" isActive={activeTool === Tool.RECTANGLE} onClick={() => setActiveTool(Tool.RECTANGLE)} />
                            <RibbonButton Icon={CircleIcon} label="Ellipse" onClick={() => alert('Ellipse tool coming soon')} disabled />
                        </div>
                        <div className="flex flex-col space-y-[2px] justify-start min-w-[60px]">
                            <RibbonButton Icon={CursorIcon} label="Hatch" onClick={() => alert('Hatch tool coming soon')} disabled />
                        </div>
                    </RibbonGroup>

                    {/* Modify Group */}
                    <RibbonGroup title="Modify">
                         <div className="flex flex-col space-y-[2px]">
                            <RibbonButton Icon={MoveIcon} label="Move" isActive={activeTool === Tool.MOVE} onClick={() => setActiveTool(Tool.MOVE)} />
                            <RibbonButton Icon={RotateIcon} label="Rotate" isActive={activeTool === Tool.ROTATE} onClick={() => setActiveTool(Tool.ROTATE)} />
                            <RibbonButton Icon={TrimIcon} label="Trim" onClick={() => alert('Trim via command line')} />
                         </div>
                         <div className="flex flex-col space-y-[2px]">
                            <RibbonButton Icon={CopyIcon} label="Copy" isActive={activeTool === Tool.COPY} onClick={() => setActiveTool(Tool.COPY)} />
                            <RibbonButton Icon={MirrorIcon} label="Mirror" isActive={activeTool === Tool.MIRROR} onClick={() => setActiveTool(Tool.MIRROR)} />
                            <RibbonButton Icon={FilletIcon} label="Fillet" isActive={activeTool === Tool.FILLET} onClick={() => setActiveTool(Tool.FILLET)} />
                         </div>
                         <div className="flex flex-col space-y-[2px]">
                            <RibbonButton Icon={StretchIcon} label="Stretch" onClick={() => alert('Stretch via command line')} />
                            <RibbonButton Icon={ScaleIcon} label="Scale" isActive={activeTool === Tool.SCALE} onClick={() => setActiveTool(Tool.SCALE)} />
                            <RibbonButton Icon={ArrayIcon} label="Array" onClick={() => alert('Array via command line')} />
                         </div>
                         <div className="flex flex-col space-y-[2px]">
                            <RibbonButton Icon={EraseIcon} label="Erase" isActive={activeTool === Tool.ERASE} onClick={() => setActiveTool(Tool.ERASE)} />
                            <RibbonButton Icon={OffsetIcon} label="Offset" onClick={() => alert('Offset via command line')} />
                         </div>
                    </RibbonGroup>

                    {/* Annotation Group */}
                    <RibbonGroup title="Annotation">
                        <div className="flex flex-col space-y-1">
                            <RibbonButton Icon={TextIcon} label="Text" size="large" isActive={activeTool === Tool.TEXT} onClick={() => setActiveTool(Tool.TEXT)} />
                        </div>
                        <div className="flex flex-col space-y-[2px]">
                            <RibbonButton Icon={DimensionIcon} label="Dimension" onClick={() => alert('Dimensions coming soon')} />
                            <RibbonButton Icon={LeaderIcon} label="Leader" onClick={() => alert('Leaders coming soon')} />
                            <RibbonButton Icon={TableIcon} label="Table" onClick={() => alert('Tables coming soon')} />
                        </div>
                    </RibbonGroup>

                    {/* Layers Group */}
                    <RibbonGroup title="Layers">
                         <div className="flex flex-col space-y-1">
                            <RibbonButton Icon={LayersIcon} label="Layer Props" size="large" onClick={() => setDesktopPanel('PROPERTIES_LAYERS')} />
                        </div>
                    </RibbonGroup>

                     {/* 3D / Modeling Group (Simplified) */}
                     <RibbonGroup title="Modeling">
                         <div className="flex flex-col space-y-[2px]">
                             <RibbonButton Icon={ExtrudeIcon} label="Extrude" isActive={activeTool === Tool.EXTRUDE} onClick={() => setActiveTool(Tool.EXTRUDE)} />
                             <RibbonButton Icon={PresspullIcon} label="Presspull" isActive={activeTool === Tool.PRESS_PULL} onClick={() => setActiveTool(Tool.PRESS_PULL)} />
                         </div>
                     </RibbonGroup>
                     
                     {/* AI Assistant */}
                     <RibbonGroup title="AI Tools">
                        <div className="flex flex-col space-y-1">
                            <RibbonButton Icon={ZooAiIcon} label="Zoo AI" size="large" isActive={desktopPanel === 'ZOO_AI'} onClick={() => setDesktopPanel(desktopPanel === 'ZOO_AI' ? 'PROPERTIES_LAYERS' : 'ZOO_AI')} />
                        </div>
                     </RibbonGroup>
                </>
            )}
            
            {activeTab === 'View' && (
                <RibbonGroup title="Navigate">
                    <RibbonButton Icon={HandIcon} label="Pan" size="large" isActive={activeTool === Tool.PAN} onClick={() => setActiveTool(Tool.PAN)} />
                    <RibbonButton Icon={ZoomExtentsIcon} label="Zoom Extents" size="large" onClick={() => alert('Zoom Extents')} />
                </RibbonGroup>
            )}
            
            {activeTab !== 'Home' && activeTab !== 'View' && (
                <div className="flex items-center justify-center w-full h-full text-gray-500 text-sm italic">
                    {activeTab} tools are currently under construction.
                </div>
            )}
        </div>
    </div>
  );
};

export default Header;
