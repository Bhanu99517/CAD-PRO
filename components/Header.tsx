
import React, { useState, useEffect, useRef } from 'react';
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

// Placeholders for new icons
const FilePlusIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="11" x2="12" y2="17"></line><line x1="9" y1="14" x2="15" y2="14"></line></svg>
);
const PrinterIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
);
const UndoIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M20.49 15a9 9 0 0 0-14.85-3.36L3 7"/></svg>
);
const RedoIcon: React.FC<{ className: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 13"/></svg>
);
const GearIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);

interface HeaderProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  onMenuAction: (action: string) => void;
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
  theme: 'DARK' | 'LIGHT';
}

const RibbonButton: React.FC<{ Icon: React.FC<{ className: string }>; label: string; onClick: () => void; isActive?: boolean; disabled?: boolean; size?: 'large' | 'small'; }> = ({ Icon, label, onClick, isActive, disabled, size = 'small' }) => {
    return (
        <button onClick={onClick} disabled={disabled} title={label} className={`flex flex-col items-center justify-center rounded hover:bg-opacity-20 hover:bg-white transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${isActive ? 'bg-blue-900/50 text-blue-300 border border-blue-500/30' : 'text-gray-200'} ${size === 'large' ? 'h-[68px] min-w-[50px] px-2' : 'h-[22px] w-full flex-row justify-start px-1 space-x-2'}`}>
            <Icon className={size === 'large' ? 'w-8 h-8 mb-1' : 'w-4 h-4'} />
            <span className={`text-[10px] whitespace-nowrap ${size === 'large' ? 'mt-1' : ''}`}>{label}</span>
        </button>
    );
};

const RibbonGroup: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="flex flex-col h-full border-r border-gray-600/50 px-2 relative group min-w-max">
        <div className="flex flex-row h-full pb-4 space-x-1">{children}</div>
        <div className="absolute bottom-0 left-0 w-full text-center bg-black/20 py-[2px]"><span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold group-hover:text-gray-200">{title}</span></div>
    </div>
);

const QuickAccessButton: React.FC<{ Icon: React.FC<{ className: string }>; onClick: () => void; title: string }> = ({ Icon, onClick, title }) => (
    <button onClick={onClick} title={title} className="p-1 rounded hover:bg-gray-600 text-gray-300 mx-[1px]"><Icon className="w-4 h-4" /></button>
);

const MenuDropdown: React.FC<{ label: string; items: { label?: string; action?: string; shortcut?: string; divider?: boolean }[]; onAction: (a: string) => void }> = ({ label, items, onAction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) { setIsOpen(false); }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={ref} className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className={`px-3 py-1 text-xs text-gray-300 hover:bg-gray-700 rounded-sm ${isOpen ? 'bg-gray-700' : ''}`}>{label}</button>
            {isOpen && (
                <div className="absolute left-0 top-full mt-0.5 w-48 bg-[#2b2b2b] border border-gray-600 shadow-lg rounded-sm z-50 py-1">
                    {items.map((item, idx) => (
                        item.divider ? <div key={idx} className="h-[1px] bg-gray-600 my-1" /> :
                        <button key={idx} onClick={() => { onAction(item.action || ''); setIsOpen(false); }} className="w-full text-left px-4 py-1.5 text-xs text-gray-300 hover:bg-blue-600 hover:text-white flex justify-between">
                            <span>{item.label}</span>
                            {item.shortcut && <span className="text-gray-500 ml-4">{item.shortcut}</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const TabButton: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
    <button onClick={onClick} className={`px-4 py-1 text-sm rounded-t-sm border-r border-gray-700 transition-colors relative top-[1px] ${active ? 'bg-[#333333] text-white font-medium border-t-2 border-t-blue-500 z-10' : 'bg-[#2b2b2b] text-gray-400 hover:bg-[#333333] hover:text-gray-200'}`}>{label}</button>
);

const Header: React.FC<HeaderProps> = ({ activeTool, setActiveTool, onMenuAction, undo, redo, theme, onSave, onLoad, desktopPanel, setDesktopPanel }) => {
  const [activeTab, setActiveTab] = useState<'Home' | 'Insert' | 'Annotate' | 'Parametric' | 'View' | 'Manage' | 'Output'>('Home');

  return (
    <div className={`flex flex-col w-full shrink-0 select-none ${theme === 'DARK' ? 'bg-[#1c1c1c]' : 'bg-gray-100'}`}>
        {/* 1. Quick Access Toolbar */}
        <div className="h-8 flex items-center px-2 border-b border-gray-800 justify-between bg-[#1c1c1c]">
            <div className="flex items-center">
                <div className="w-6 h-6 bg-red-700 rounded-sm flex items-center justify-center text-white font-bold mr-3 cursor-pointer shadow-sm">A</div>
                <div className="h-4 w-[1px] bg-gray-600 mx-1"></div>
                <QuickAccessButton Icon={FilePlusIcon} onClick={() => onMenuAction('NEW')} title="New" />
                <QuickAccessButton Icon={FolderOpenIcon} onClick={onLoad} title="Open" />
                <QuickAccessButton Icon={SaveIcon} onClick={onSave} title="Save" />
                <QuickAccessButton Icon={PrinterIcon} onClick={() => onMenuAction('PRINT')} title="Print" />
                <div className="h-4 w-[1px] bg-gray-600 mx-1"></div>
                <QuickAccessButton Icon={UndoIcon} onClick={undo} title="Undo" />
                <QuickAccessButton Icon={RedoIcon} onClick={redo} title="Redo" />
                <div className="ml-4 flex items-center bg-[#2a2a2a] border border-gray-700 rounded px-2 py-0.5 cursor-pointer hover:border-gray-500">
                    <GearIcon className="w-3 h-3 text-gray-400 mr-2" /><span className="text-xs text-gray-300 mr-4">Drafting & Annotation</span>
                </div>
            </div>
        </div>

        {/* 2. Menu Bar */}
        <div className="h-7 bg-[#2b2b2b] flex items-center px-1 border-b border-gray-700 shadow-sm z-20">
            <MenuDropdown label="File" onAction={onMenuAction} items={[
                { label: "New", action: "NEW" },
                { label: "Open...", action: "OPEN" },
                { label: "Save", action: "SAVE" },
                { label: "Export PNG", action: "EXPORT_PNG" },
                { label: "Print...", action: "PRINT" },
                { divider: true },
                { label: "Exit", action: "EXIT" }
            ]} />
            <MenuDropdown label="Edit" onAction={onMenuAction} items={[
                { label: "Undo", action: "UNDO", shortcut: "Ctrl+Z" },
                { label: "Redo", action: "REDO", shortcut: "Ctrl+Y" },
                { divider: true },
                { label: "Cut", action: "CUT" },
                { label: "Copy", action: "COPY" },
                { label: "Paste", action: "PASTE" },
                { label: "Delete", action: "DELETE" },
                { divider: true },
                { label: "Select All", action: "SELECT_ALL" }
            ]} />
            <MenuDropdown label="View" onAction={onMenuAction} items={[
                { label: "Zoom In", action: "ZOOM_IN" },
                { label: "Zoom Out", action: "ZOOM_OUT" },
                { label: "Zoom Extents", action: "ZOOM_EXTENTS" },
                { label: "Pan", action: "PAN" },
                { divider: true },
                { label: "Toggle Grid", action: "TOGGLE_GRID" },
                { label: "Toggle Snap", action: "TOGGLE_SNAP" }
            ]} />
            <MenuDropdown label="Insert" onAction={onMenuAction} items={[
                { label: "Block", action: "INSERT_BLOCK" },
                { label: "Image", action: "INSERT_IMAGE" },
                { label: "Text", action: "INSERT_TEXT" },
                { label: "Table", action: "INSERT_TABLE" }
            ]} />
            <MenuDropdown label="Annotate" onAction={onMenuAction} items={[
                { label: "Text", action: "TEXT" },
                { label: "Linear Dimension", action: "DIMENSION_LINEAR" },
                { label: "Aligned Dimension", action: "DIMENSION_ALIGNED" },
                { label: "Angular Dimension", action: "DIMENSION_ANGULAR" },
                { label: "Radius", action: "DIMENSION_RADIUS" },
                { label: "Diameter", action: "DIMENSION_DIAMETER" },
                { label: "Leader", action: "LEADER" }
            ]} />
            <MenuDropdown label="Parametric" onAction={onMenuAction} items={[
                { label: "Geometric Constraints", divider: true },
                { label: "Horizontal", action: "CONSTRAINT_HORIZONTAL" },
                { label: "Vertical", action: "CONSTRAINT_VERTICAL" },
                { label: "Lock/Unlock", action: "CONSTRAINT_LOCK" }
            ]} />
            <MenuDropdown label="Tools" onAction={onMenuAction} items={[
                { label: "Measure Distance", action: "MEASURE_DIST" },
                { label: "Measure Angle", action: "MEASURE_ANGLE" },
                { label: "Measure Area", action: "MEASURE_AREA" },
                { divider: true },
                { label: "Calculator", action: "CALCULATOR" },
                { label: "Options", action: "OPTIONS" }
            ]} />
            <MenuDropdown label="Draw" onAction={onMenuAction} items={[
                { label: "Line", action: "LINE" },
                { label: "Polyline", action: "POLYLINE" },
                { label: "Rectangle", action: "RECTANGLE" },
                { label: "Circle", action: "CIRCLE" },
                { label: "Arc", action: "ARC" },
                { label: "Ellipse", action: "ELLIPSE" },
                { label: "Polygon", action: "POLYGON" },
                { label: "Freehand", action: "FREEHAND" },
                { label: "Hatch", action: "HATCH" }
            ]} />
            <MenuDropdown label="Modify" onAction={onMenuAction} items={[
                { label: "Move", action: "MOVE" },
                { label: "Copy", action: "COPY" },
                { label: "Rotate", action: "ROTATE" },
                { label: "Scale", action: "SCALE" },
                { label: "Mirror", action: "MIRROR" },
                { label: "Trim", action: "TRIM" },
                { label: "Extend", action: "EXTEND" },
                { label: "Offset", action: "OFFSET" },
                { label: "Fillet", action: "FILLET" },
                { label: "Chamfer", action: "CHAMFER" },
                { label: "Explode", action: "EXPLODE" },
                { label: "Erase", action: "ERASE" }
            ]} />
            <MenuDropdown label="Window" onAction={onMenuAction} items={[
                { label: "Switch Theme", action: "THEME" }
            ]} />
            <MenuDropdown label="Help" onAction={onMenuAction} items={[
                { label: "Help", action: "HELP" },
                { label: "About", action: "ABOUT" }
            ]} />
        </div>

        {/* 3. Ribbon Tabs */}
        <div className="bg-[#2b2b2b] px-2 flex items-end border-b border-gray-600 pt-1">
            {['Home', 'Insert', 'Annotate', 'Parametric', 'View', 'Manage', 'Output'].map(t => (
                <TabButton key={t} label={t} active={activeTab === t} onClick={() => setActiveTab(t as any)} />
            ))}
        </div>

        {/* 4. Ribbon Panel Area */}
        <div className="h-24 bg-[#333333] border-b border-gray-800 flex px-2 py-1 overflow-x-auto shadow-md">
            {activeTab === 'Home' && (
                <>
                    <RibbonGroup title="Draw">
                        <div className="flex flex-col space-y-1">
                             <RibbonButton Icon={LineIcon} label="Line" size="large" isActive={activeTool === Tool.LINE} onClick={() => setActiveTool(Tool.LINE)} />
                        </div>
                         <div className="flex flex-col space-y-1">
                             <RibbonButton Icon={PolylineIcon} label="Polyline" size="large" isActive={activeTool === Tool.POLYLINE} onClick={() => setActiveTool(Tool.POLYLINE)} />
                        </div>
                        <div className="flex flex-col space-y-[2px] justify-start min-w-[60px]">
                            <RibbonButton Icon={CircleIcon} label="Circle" isActive={activeTool === Tool.CIRCLE} onClick={() => setActiveTool(Tool.CIRCLE)} />
                            <RibbonButton Icon={ArcIcon} label="Arc" isActive={activeTool === Tool.ARC} onClick={() => setActiveTool(Tool.ARC)} />
                            <RibbonButton Icon={RectangleIcon} label="Rectangle" isActive={activeTool === Tool.RECTANGLE} onClick={() => setActiveTool(Tool.RECTANGLE)} />
                        </div>
                        <div className="flex flex-col space-y-[2px] justify-start min-w-[60px]">
                            <RibbonButton Icon={CircleIcon} label="Ellipse" isActive={activeTool === Tool.ELLIPSE} onClick={() => setActiveTool(Tool.ELLIPSE)} />
                            <RibbonButton Icon={PolylineIcon} label="Polygon" isActive={activeTool === Tool.POLYGON} onClick={() => setActiveTool(Tool.POLYGON)} />
                             <RibbonButton Icon={CursorIcon} label="Hatch" isActive={activeTool === Tool.HATCH} onClick={() => setActiveTool(Tool.HATCH)} />
                        </div>
                    </RibbonGroup>

                    <RibbonGroup title="Modify">
                         <div className="flex flex-col space-y-[2px]">
                            <RibbonButton Icon={MoveIcon} label="Move" isActive={activeTool === Tool.MOVE} onClick={() => setActiveTool(Tool.MOVE)} />
                            <RibbonButton Icon={RotateIcon} label="Rotate" isActive={activeTool === Tool.ROTATE} onClick={() => setActiveTool(Tool.ROTATE)} />
                            <RibbonButton Icon={TrimIcon} label="Trim" isActive={activeTool === Tool.TRIM} onClick={() => setActiveTool(Tool.TRIM)} />
                         </div>
                         <div className="flex flex-col space-y-[2px]">
                            <RibbonButton Icon={CopyIcon} label="Copy" isActive={activeTool === Tool.COPY} onClick={() => setActiveTool(Tool.COPY)} />
                            <RibbonButton Icon={MirrorIcon} label="Mirror" isActive={activeTool === Tool.MIRROR} onClick={() => setActiveTool(Tool.MIRROR)} />
                            <RibbonButton Icon={FilletIcon} label="Fillet" isActive={activeTool === Tool.FILLET} onClick={() => setActiveTool(Tool.FILLET)} />
                         </div>
                         <div className="flex flex-col space-y-[2px]">
                            <RibbonButton Icon={ScaleIcon} label="Scale" isActive={activeTool === Tool.SCALE} onClick={() => setActiveTool(Tool.SCALE)} />
                            <RibbonButton Icon={EraseIcon} label="Erase" isActive={activeTool === Tool.ERASE} onClick={() => setActiveTool(Tool.ERASE)} />
                            <RibbonButton Icon={OffsetIcon} label="Offset" isActive={activeTool === Tool.OFFSET} onClick={() => setActiveTool(Tool.OFFSET)} />
                         </div>
                    </RibbonGroup>

                    <RibbonGroup title="Annotation">
                        <div className="flex flex-col space-y-1">
                            <RibbonButton Icon={TextIcon} label="Text" size="large" isActive={activeTool === Tool.TEXT} onClick={() => setActiveTool(Tool.TEXT)} />
                        </div>
                        <div className="flex flex-col space-y-[2px]">
                            <RibbonButton Icon={DimensionIcon} label="Dimension" isActive={activeTool === Tool.DIMENSION} onClick={() => setActiveTool(Tool.DIMENSION)} />
                            <RibbonButton Icon={LeaderIcon} label="Leader" isActive={activeTool === Tool.LEADER} onClick={() => setActiveTool(Tool.LEADER)} />
                            <RibbonButton Icon={TableIcon} label="Table" isActive={activeTool === Tool.TABLE} onClick={() => onMenuAction('INSERT_TABLE')} />
                        </div>
                    </RibbonGroup>
                    
                    <RibbonGroup title="Layers">
                         <div className="flex flex-col space-y-1">
                            <RibbonButton Icon={LayersIcon} label="Layer Props" size="large" onClick={() => setDesktopPanel('PROPERTIES_LAYERS')} />
                        </div>
                    </RibbonGroup>
                     
                     <RibbonGroup title="AI Tools">
                        <div className="flex flex-col space-y-1">
                            <RibbonButton Icon={ZooAiIcon} label="Zoo AI" size="large" isActive={desktopPanel === 'ZOO_AI'} onClick={() => setDesktopPanel(desktopPanel === 'ZOO_AI' ? 'PROPERTIES_LAYERS' : 'ZOO_AI')} />
                        </div>
                     </RibbonGroup>
                </>
            )}
            
            {activeTab === 'Annotate' && (
                 <RibbonGroup title="Dimensions">
                     <RibbonButton Icon={DimensionIcon} label="Linear" isActive={activeTool === Tool.DIMENSION_LINEAR} onClick={() => setActiveTool(Tool.DIMENSION_LINEAR)} />
                     <RibbonButton Icon={DimensionIcon} label="Aligned" isActive={activeTool === Tool.DIMENSION_ALIGNED} onClick={() => setActiveTool(Tool.DIMENSION_ALIGNED)} />
                     <RibbonButton Icon={DimensionIcon} label="Angular" isActive={activeTool === Tool.DIMENSION_ANGULAR} onClick={() => setActiveTool(Tool.DIMENSION_ANGULAR)} />
                     <RibbonButton Icon={DimensionIcon} label="Radius" isActive={activeTool === Tool.DIMENSION_RADIUS} onClick={() => setActiveTool(Tool.DIMENSION_RADIUS)} />
                 </RibbonGroup>
            )}
            
            {activeTab === 'Parametric' && (
                <RibbonGroup title="Geometric">
                    <RibbonButton Icon={LineIcon} label="Horizontal" onClick={() => onMenuAction('CONSTRAINT_HORIZONTAL')} />
                    <RibbonButton Icon={LineIcon} label="Vertical" onClick={() => onMenuAction('CONSTRAINT_VERTICAL')} />
                </RibbonGroup>
            )}
        </div>
    </div>
  );
};

export default Header;
