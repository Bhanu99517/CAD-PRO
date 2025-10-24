
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
import { BoxIcon } from './icons/BoxIcon';
import { SmoothObjectIcon } from '../SmoothObjectIcon';
import { MeshIcon } from './icons/MeshIcon';
import { SolidEditingIcon } from './icons/SolidEditingIcon';
import { SectionPlaneIcon } from './icons/SectionPlaneIcon';
import { PresspullIcon } from './icons/PresspullIcon';
import { OffsetIcon } from './icons/OffsetIcon';
import { ZoomExtentsIcon } from './icons/ZoomExtentsIcon';
import { SaveIcon } from './icons/SaveIcon';
import { FolderOpenIcon } from './icons/FolderOpenIcon';
import { ViewModeIcon } from './icons/ViewModeIcon';
import { ZooAiIcon } from './icons/ZooAiIcon';


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

const ToolButton: React.FC<{
  Icon: React.FC<{ className: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
  large?: boolean;
}> = ({ Icon, label, isActive, onClick, disabled = false, large = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={disabled ? `${label} (Not available)` : label}
    className={`flex flex-col items-center justify-center p-1 rounded-md transition-colors duration-150 ${
        large ? 'w-20 h-20' : 'w-16 h-16'
    } ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <Icon className={`${large ? 'w-8 h-8' : 'w-6 h-6'} mb-1`} />
    <span className="text-xs text-center leading-tight">{label}</span>
  </button>
);

const SmallToolButton: React.FC<{
  Icon: React.FC<{ className: string }>;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}> = ({ Icon, label, onClick, isActive = false, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={disabled ? `${label} (Coming Soon)` : label}
        className={`flex items-center space-x-2 p-1 w-full rounded-md transition-colors duration-150 ${
            isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
        <Icon className="w-5 h-5" />
        <span className="text-xs">{label}</span>
    </button>
);


const ToolGroup: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`flex flex-col justify-start border-r border-gray-700 px-1 py-1 h-full ${className}`}>
        <div className="flex-grow flex items-center">
            {children}
        </div>
        <div className="text-xs text-gray-400 mt-1 text-center">{title}</div>
    </div>
);

const complexToolAlert = (toolName: string) => {
    alert(`${toolName} functionality is not yet implemented through interactive controls. Please use the command line. For example: "create a 3x4 array of the selected object with 50px spacing"`);
};

const modelingToolAlert = (toolName: string) => {
    alert(`${toolName} functionality is available via the command line. Please select a shape and try a command like: "extrude selected shape by 50"`);
};

const threeDToolAlert = (toolName: string) => {
    alert(`${toolName} is a 3D modeling tool and is not yet implemented in this 2D version.`);
};

const Header: React.FC<HeaderProps> = ({ activeTool, setActiveTool, undo, redo, canUndo, canRedo, setMobilePanel, onSave, onLoad, onZoomExtents, viewMode, setViewMode, desktopPanel, setDesktopPanel }) => {
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);

  const handleViewChange = (mode: ViewMode) => {
      setViewMode(mode);
      setIsViewMenuOpen(false);
  }

  return (
    <header className="bg-gray-800 border-b border-gray-700 flex flex-col shrink-0">
        <div className="flex items-center px-2 md:px-4 h-10 md:h-8">
            <div className="text-xl font-bold text-red-500 mr-4 md:mr-6">A</div>
            <div className="hidden md:flex space-x-4 text-sm">
                <button className="text-white bg-gray-700 px-3 py-1 rounded-t-sm">Home</button>
                <button className="text-gray-400 hover:text-white">Solid</button>
                <button className="text-gray-400 hover:text-white">Surface</button>
                <button className="text-gray-400 hover:text-white">Mesh</button>
                <button className="text-gray-400 hover:text-white">Visualize</button>
                <button className="text-gray-400 hover:text-white">Parametric</button>
                <button className="text-gray-400 hover:text-white">Insert</button>
                <button className="text-gray-400 hover:text-white">Annotate</button>
                <button className="text-gray-400 hover:text-white">View</button>
                <button className="text-gray-400 hover:text-white">Manage</button>
                <button className="text-gray-400 hover:text-white">Output</button>
            </div>
            <div className="flex-grow"></div>
            {/* Mobile Panel Toggles */}
            <div className="flex md:hidden items-center space-x-2">
                 <button onClick={() => setMobilePanel('ZOO_AI')} className="p-2 rounded-md hover:bg-gray-700 text-gray-300" aria-label="Toggle Zoo AI Panel"><ZooAiIcon className="w-6 h-6" /></button>
                 <button onClick={() => setMobilePanel('LAYERS')} className="p-2 rounded-md hover:bg-gray-700 text-gray-300" aria-label="Toggle Layers Panel"><LayersIcon className="w-6 h-6" /></button>
                 <button onClick={() => setMobilePanel('PROPERTIES')} className="p-2 rounded-md hover:bg-gray-700 text-gray-300" aria-label="Toggle Properties Panel"><SlidersIcon className="w-6 h-6" /></button>
            </div>
        </div>
        
        <div className="hidden md:flex bg-gray-800 h-[110px] items-stretch p-1">
            <ToolGroup title="Modeling">
                <div className="flex items-start">
                    <ToolButton Icon={BoxIcon} label="Box" onClick={() => threeDToolAlert('Box')} isActive={false} large/>
                     <div className="flex flex-col space-y-1 ml-1">
                        <SmallToolButton Icon={ExtrudeIcon} label="Extrude" isActive={activeTool === Tool.EXTRUDE} onClick={() => setActiveTool(Tool.EXTRUDE)} />
                        <SmallToolButton Icon={PresspullIcon} label="Press-pull" isActive={activeTool === Tool.PRESS_PULL} onClick={() => setActiveTool(Tool.PRESS_PULL)} />
                        <SmallToolButton Icon={SmoothObjectIcon} label="Smooth Object" onClick={() => threeDToolAlert('Smooth Object')} />
                    </div>
                </div>
            </ToolGroup>

            <ToolGroup title="Mesh">
                <ToolButton Icon={MeshIcon} label="Mesh Tools" onClick={() => threeDToolAlert('Mesh Tools')} isActive={false} />
            </ToolGroup>

            <ToolGroup title="Solid Editing">
                <ToolButton Icon={SolidEditingIcon} label="Boolean Ops" onClick={() => threeDToolAlert('Solid Editing Tools')} isActive={false} />
            </ToolGroup>
            
             <ToolGroup title="Draw">
                <div className="flex items-start">
                    <div className="flex flex-col items-center">
                        <ToolButton Icon={LineIcon} label="Line" isActive={activeTool === Tool.LINE} onClick={() => setActiveTool(Tool.LINE)} large />
                    </div>
                    <div className="flex flex-col space-y-1 ml-1">
                        <SmallToolButton Icon={PolylineIcon} label="Polyline" isActive={activeTool === Tool.POLYLINE} onClick={() => setActiveTool(Tool.POLYLINE)} />
                        <SmallToolButton Icon={CircleIcon} label="Circle" isActive={activeTool === Tool.CIRCLE} onClick={() => setActiveTool(Tool.CIRCLE)} />
                        <SmallToolButton Icon={ArcIcon} label="Arc" isActive={activeTool === Tool.ARC} onClick={() => setActiveTool(Tool.ARC)} />
                    </div>
                     <div className="flex flex-col space-y-1 ml-1">
                        <SmallToolButton Icon={RectangleIcon} label="Rectangle" isActive={activeTool === Tool.RECTANGLE} onClick={() => setActiveTool(Tool.RECTANGLE)} />
                    </div>
                </div>
            </ToolGroup>

            <ToolGroup title="Modify">
                <div className="grid grid-cols-4 gap-1">
                    <ToolButton Icon={MoveIcon} label="Move" isActive={activeTool === Tool.MOVE} onClick={() => setActiveTool(Tool.MOVE)} />
                    <ToolButton Icon={CopyIcon} label="Copy" isActive={activeTool === Tool.COPY} onClick={() => setActiveTool(Tool.COPY)} />
                    <ToolButton Icon={StretchIcon} label="Stretch" onClick={() => complexToolAlert('Stretch')} isActive={false} />
                    <ToolButton Icon={RotateIcon} label="Rotate" isActive={activeTool === Tool.ROTATE} onClick={() => setActiveTool(Tool.ROTATE)} />
                    <ToolButton Icon={MirrorIcon} label="Mirror" isActive={activeTool === Tool.MIRROR} onClick={() => setActiveTool(Tool.MIRROR)} />
                    <ToolButton Icon={ScaleIcon} label="Scale" isActive={activeTool === Tool.SCALE} onClick={() => setActiveTool(Tool.SCALE)} />
                    <ToolButton Icon={TrimIcon} label="Trim" onClick={() => complexToolAlert('Trim')} isActive={false} />
                    <ToolButton Icon={OffsetIcon} label="Offset" onClick={() => complexToolAlert('Offset')} isActive={false} />
                    <ToolButton Icon={FilletIcon} label="Fillet" isActive={activeTool === Tool.FILLET} onClick={() => setActiveTool(Tool.FILLET)} />
                    <ToolButton Icon={ArrayIcon} label="Array" onClick={() => complexToolAlert('Array')} isActive={false} />
                    <ToolButton Icon={EraseIcon} label="Erase" isActive={activeTool === Tool.ERASE} onClick={() => setActiveTool(Tool.ERASE)} />
                </div>
            </ToolGroup>

            <ToolGroup title="Section">
                <ToolButton Icon={SectionPlaneIcon} label="Section Plane" onClick={() => threeDToolAlert('Section Plane')} isActive={false} large />
            </ToolGroup>

             <ToolGroup title="Annotation">
                <div className="flex items-start">
                    <div className="flex flex-col items-center">
                        <ToolButton Icon={TextIcon} label="Text" isActive={activeTool === Tool.TEXT} onClick={() => setActiveTool(Tool.TEXT)} large />
                    </div>
                    <div className="flex flex-col space-y-1 ml-1">
                        <SmallToolButton Icon={DimensionIcon} label="Dimension" onClick={() => complexToolAlert('Dimension')} />
                        <SmallToolButton Icon={LeaderIcon} label="Leader" onClick={() => complexToolAlert('Leader')} />
                        <SmallToolButton Icon={TableIcon} label="Table" onClick={() => complexToolAlert('Table')} />
                    </div>
                </div>
            </ToolGroup>

             <ToolGroup title="Layers">
                <div className="flex items-start">
                    <ToolButton Icon={LayersIcon} label="Layer Properties" onClick={() => alert('Layer properties can be managed in the Layers panel on the right.')} isActive={false} large />
                </div>
            </ToolGroup>
            
             <ToolGroup title="AI">
                <ToolButton
                    Icon={ZooAiIcon}
                    label="Zoo AI"
                    isActive={desktopPanel === 'ZOO_AI'}
                    onClick={() => setDesktopPanel(desktopPanel === 'ZOO_AI' ? 'PROPERTIES_LAYERS' : 'ZOO_AI')}
                    large
                />
            </ToolGroup>

             <div className="flex-grow"></div>

            <ToolGroup title="File">
                 <div className="flex flex-col space-y-2">
                    <ToolButton Icon={SaveIcon} label="Save" isActive={false} onClick={onSave} />
                    <ToolButton Icon={FolderOpenIcon} label="Load" isActive={false} onClick={onLoad} />
                 </div>
            </ToolGroup>

             <ToolGroup title="View" className="relative">
                 <div className="flex flex-col space-y-2">
                    <ToolButton Icon={CursorIcon} label="Select" isActive={activeTool === Tool.SELECT} onClick={() => setActiveTool(Tool.SELECT)} />
                    <ToolButton Icon={HandIcon} label="Pan" isActive={activeTool === Tool.PAN} onClick={() => setActiveTool(Tool.PAN)} />
                 </div>
                 <div className="flex flex-col space-y-2 ml-1">
                    <ToolButton Icon={ZoomExtentsIcon} label="Zoom Extents" isActive={false} onClick={onZoomExtents} />
                    <div className="relative">
                        <ToolButton Icon={ViewModeIcon} label={viewMode} isActive={isViewMenuOpen} onClick={() => setIsViewMenuOpen(prev => !prev)} />
                        {isViewMenuOpen && (
                            <div className="absolute top-full right-0 mt-1 bg-gray-700 rounded-md shadow-lg z-10 w-36 p-1">
                                <button onClick={() => handleViewChange('TOP')} className="w-full text-left text-sm p-2 rounded hover:bg-gray-600 text-gray-200">Top</button>
                                <button onClick={() => handleViewChange('BOTTOM')} className="w-full text-left text-sm p-2 rounded hover:bg-gray-600 text-gray-200">Bottom</button>
                                <button onClick={() => handleViewChange('FRONT')} className="w-full text-left text-sm p-2 rounded hover:bg-gray-600 text-gray-200">Front</button>
                                <button onClick={() => handleViewChange('BACK')} className="w-full text-left text-sm p-2 rounded hover:bg-gray-600 text-gray-200">Back</button>
                                <button onClick={() => handleViewChange('LEFT')} className="w-full text-left text-sm p-2 rounded hover:bg-gray-600 text-gray-200">Left Side</button>
                                <button onClick={() => handleViewChange('RIGHT')} className="w-full text-left text-sm p-2 rounded hover:bg-gray-600 text-gray-200">Right Side</button>
                                <div className="my-1 border-t border-gray-600"></div>
                                <button onClick={() => handleViewChange('ISOMETRIC')} className="w-full text-left text-sm p-2 rounded hover:bg-gray-600 text-gray-200">Isometric</button>
                                <button onClick={() => handleViewChange('PERSPECTIVE')} className="w-full text-left text-sm p-2 rounded hover:bg-gray-600 text-gray-200">Perspective</button>
                                <div className="my-1 border-t border-gray-600"></div>
                                <button onClick={() => handleViewChange('TOP')} className="w-full text-left text-sm p-2 rounded hover:bg-gray-600 text-gray-200">Orthographic</button>
                                <button disabled className="w-full text-left text-sm p-2 rounded text-gray-500 cursor-not-allowed">Custom View</button>
                            </div>
                        )}
                    </div>
                 </div>
             </ToolGroup>

             <ToolGroup title="History">
                 <div className="flex flex-col space-y-2">
                    <ToolButton Icon={UndoIcon} label="Undo" isActive={false} onClick={undo} disabled={!canUndo} />
                    <ToolButton Icon={RedoIcon} label="Redo" isActive={false} onClick={redo} disabled={!canRedo} />
                 </div>
             </ToolGroup>
        </div>

        {/* Mobile Toolbar */}
        <div className="md:hidden flex items-center bg-gray-800 p-1 overflow-x-auto">
            <div className="flex space-x-1">
                <ToolButton Icon={CursorIcon} label="Select" isActive={activeTool === Tool.SELECT} onClick={() => setActiveTool(Tool.SELECT)} />
                <ToolButton Icon={HandIcon} label="Pan" isActive={activeTool === Tool.PAN} onClick={() => setActiveTool(Tool.PAN)} />
                <div className="border-l border-gray-700 mx-1"></div>
                <ToolButton Icon={LineIcon} label="Line" isActive={activeTool === Tool.LINE} onClick={() => setActiveTool(Tool.LINE)} />
                <ToolButton Icon={PolylineIcon} label="Polyline" isActive={activeTool === Tool.POLYLINE} onClick={() => setActiveTool(Tool.POLYLINE)} />
                <ToolButton Icon={RectangleIcon} label="Rectangle" isActive={activeTool === Tool.RECTANGLE} onClick={() => setActiveTool(Tool.RECTANGLE)} />
                <ToolButton Icon={CircleIcon} label="Circle" isActive={activeTool === Tool.CIRCLE} onClick={() => setActiveTool(Tool.CIRCLE)} />
                <ToolButton Icon={ArcIcon} label="Arc" isActive={activeTool === Tool.ARC} onClick={() => setActiveTool(Tool.ARC)} />
                <div className="border-l border-gray-700 mx-1"></div>
                <ToolButton Icon={MoveIcon} label="Move" isActive={activeTool === Tool.MOVE} onClick={() => setActiveTool(Tool.MOVE)} />
                <ToolButton Icon={CopyIcon} label="Copy" isActive={activeTool === Tool.COPY} onClick={() => setActiveTool(Tool.COPY)} />
                <ToolButton Icon={RotateIcon} label="Rotate" isActive={activeTool === Tool.ROTATE} onClick={() => setActiveTool(Tool.ROTATE)} />
                <ToolButton Icon={ScaleIcon} label="Scale" isActive={activeTool === Tool.SCALE} onClick={() => setActiveTool(Tool.SCALE)} />
                <ToolButton Icon={MirrorIcon} label="Mirror" isActive={activeTool === Tool.MIRROR} onClick={() => setActiveTool(Tool.MIRROR)} />
                <ToolButton Icon={EraseIcon} label="Erase" isActive={activeTool === Tool.ERASE} onClick={() => setActiveTool(Tool.ERASE)} />
                <div className="border-l border-gray-700 mx-1"></div>
                <ToolButton Icon={UndoIcon} label="Undo" isActive={false} onClick={undo} disabled={!canUndo} />
                <ToolButton Icon={RedoIcon} label="Redo" isActive={false} onClick={redo} disabled={!canRedo} />
            </div>
        </div>
    </header>
  );
};

export default Header;