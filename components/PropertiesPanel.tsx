import React, { ChangeEvent, useCallback } from 'react';
import { Shape, Tool, Layer, RectangleShape, TextShape } from '../types';

interface PropertiesPanelProps {
  selectedShapes: Shape[];
  updateShape: (shape: Shape) => void;
  deleteShapes: (ids: string[]) => void;
  layers: Layer[];
}

const PropertyInput: React.FC<{
    label: string;
    type: string;
    value: string | number;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    min?: number;
    step?: number;
    className?: string;
}> = ({ label, className, ...props }) => (
    <div className={`flex items-center justify-between ${className}`}>
        <label className="text-sm text-gray-400">{label}</label>
        <input
            {...props}
            className="w-28 bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    </div>
);

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedShapes, updateShape, deleteShapes, layers }) => {
  const selectedShape = selectedShapes.length === 1 ? selectedShapes[0] : null;

  const handlePropertyChange = useCallback((prop: string, value: string | number) => {
    if (!selectedShape) return;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue) && typeof(value) !== 'string' && prop !== 'layerId' && prop !== 'content') return;
    
    updateShape({ ...selectedShape, [prop]: (prop === 'color' || prop === 'layerId' || prop === 'content') ? value : numValue });
  }, [selectedShape, updateShape]);
  
  const handlePointChange = (pointKey: 'p1' | 'p2', coord: 'x' | 'y', value: string) => {
    if (!selectedShape || selectedShape.type !== Tool.LINE) return;
    const numValue = parseFloat(value);
    if(isNaN(numValue)) return;
    const updatedPoint = { ...selectedShape[pointKey], [coord]: numValue };
    updateShape({ ...selectedShape, [pointKey]: updatedPoint });
  }

  const handleDeleteClick = () => {
      if (selectedShapes.length > 0) {
          deleteShapes(selectedShapes.map(s => s.id));
      }
  };

  const renderShapeProperties = () => {
    if (!selectedShape) return null;

    const commonProps = (
        <>
            <PropertyInput label="Stroke Width" type="number" value={selectedShape.strokeWidth} min={1} onChange={(e) => handlePropertyChange('strokeWidth', e.target.value)} />
            <PropertyInput label="Rotation" type="number" value={selectedShape.rotation} step={1} onChange={(e) => handlePropertyChange('rotation', e.target.value)} />
            <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Layer</label>
                <select 
                    value={selectedShape.layerId}
                    onChange={(e) => handlePropertyChange('layerId', e.target.value)}
                    className="w-28 bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {layers.map(layer => (
                        <option key={layer.id} value={layer.id}>{layer.name}</option>
                    ))}
                </select>
            </div>
        </>
    );

    switch (selectedShape.type) {
      case Tool.LINE:
        return <>
            {commonProps}
            <h4 className="text-xs text-gray-500 mt-2 font-bold uppercase">Start Point</h4>
            <PropertyInput label="P1.X" type="number" value={selectedShape.p1.x} onChange={(e) => handlePointChange('p1', 'x', e.target.value)} />
            <PropertyInput label="P1.Y" type="number" value={selectedShape.p1.y} onChange={(e) => handlePointChange('p1', 'y', e.target.value)} />
            <h4 className="text-xs text-gray-500 mt-2 font-bold uppercase">End Point</h4>
            <PropertyInput label="P2.X" type="number" value={selectedShape.p2.x} onChange={(e) => handlePointChange('p2', 'x', e.target.value)} />
            <PropertyInput label="P2.Y" type="number" value={selectedShape.p2.y} onChange={(e) => handlePointChange('p2', 'y', e.target.value)} />
        </>;
      case Tool.RECTANGLE:
      case Tool.IMAGE:
        return <>
            {commonProps}
            <PropertyInput label="X" type="number" value={selectedShape.x} onChange={(e) => handlePropertyChange('x', e.target.value)} />
            <PropertyInput label="Y" type="number" value={selectedShape.y} onChange={(e) => handlePropertyChange('y', e.target.value)} />
            <PropertyInput label="Width" type="number" min={0} value={selectedShape.width} onChange={(e) => handlePropertyChange('width', e.target.value)} />
            <PropertyInput label="Height" type="number" min={0} value={selectedShape.height} onChange={(e) => handlePropertyChange('height', e.target.value)} />
            {selectedShape.type === Tool.RECTANGLE &&
                <PropertyInput label="Corner Radius" type="number" min={0} value={(selectedShape as RectangleShape).rx || 0} onChange={(e) => {
                    handlePropertyChange('rx', e.target.value);
                    handlePropertyChange('ry', e.target.value);
                }} />
            }
        </>;
      case Tool.CIRCLE:
        return <>
            {commonProps}
            <PropertyInput label="CX" type="number" value={selectedShape.cx} onChange={(e) => handlePropertyChange('cx', e.target.value)} />
            <PropertyInput label="CY" type="number" value={selectedShape.cy} onChange={(e) => handlePropertyChange('cy', e.target.value)} />
            <PropertyInput label="Radius" type="number" min={0} value={selectedShape.r} onChange={(e) => handlePropertyChange('r', e.target.value)} />
        </>;
      case Tool.ARC:
        return <>
            {commonProps}
            <PropertyInput label="CX" type="number" value={selectedShape.cx} onChange={(e) => handlePropertyChange('cx', e.target.value)} />
            <PropertyInput label="CY" type="number" value={selectedShape.cy} onChange={(e) => handlePropertyChange('cy', e.target.value)} />
            <PropertyInput label="Radius" type="number" min={0} value={selectedShape.r} onChange={(e) => handlePropertyChange('r', e.target.value)} />
            <PropertyInput label="Start Angle" type="number" value={selectedShape.startAngle} onChange={(e) => handlePropertyChange('startAngle', e.target.value)} />
            <PropertyInput label="End Angle" type="number" value={selectedShape.endAngle} onChange={(e) => handlePropertyChange('endAngle', e.target.value)} />
        </>;
      case Tool.POLYLINE:
          return <>
            {commonProps}
            <p className="text-xs text-gray-500 text-center mt-2">Polyline point editing not yet available.</p>
          </>
      case Tool.TEXT:
          const textShape = selectedShape as TextShape;
          return <>
            {commonProps}
            <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Content</label>
                <input
                    type="text"
                    value={textShape.content}
                    onChange={(e) => handlePropertyChange('content', e.target.value)}
                    className="w-28 bg-gray-700 text-white rounded px-2 py-1 text-sm border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <PropertyInput label="Font Size" type="number" min={1} value={textShape.fontSize} onChange={(e) => handlePropertyChange('fontSize', e.target.value)} />
          </>
      default:
        return null;
    }
  };

  return (
    <div className="p-4 flex-1 flex flex-col space-y-4 overflow-y-auto">
      <h3 className="text-md font-semibold text-gray-200 border-b border-gray-700 pb-2">Properties</h3>
      {selectedShapes.length > 0 ? (
        <div className="flex-1 flex flex-col">
            <div className="space-y-3 flex-1">
                {selectedShape ? (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-400">Type</span>
                            <span className="text-sm font-semibold text-gray-200 bg-gray-700 px-2 py-1 rounded">{selectedShape.type}</span>
                        </div>
                        {renderShapeProperties()}
                    </>
                ) : (
                    <div className="text-center text-gray-400 pt-8">
                        <p>{selectedShapes.length} objects selected</p>
                        <p className="text-xs text-gray-500 mt-2">Common properties editing is not yet available.</p>
                    </div>
                )}
            </div>
            <button 
                onClick={handleDeleteClick}
                className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded transition-colors"
            >
                Delete Selected
            </button>
        </div>
      ) : (
        <div className="text-center text-gray-500 pt-8">
          <p>No object selected</p>
        </div>
      )}
    </div>
  );
};

export default PropertiesPanel;
