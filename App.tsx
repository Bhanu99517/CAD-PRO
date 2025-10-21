
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Tool, Shape, Point, Layer, ImageShape, LineShape, CircleShape, RectangleShape, ArcShape, PolylineShape, TextShape, ViewMode } from './types';
import Header from './components/Header';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import LayersPanel from './LayersPanel';
import CommandLine from './components/CommandLine';
import StatusBar from './components/StatusBar';
import { getShapeCenter } from './utils';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import ZooAiPanel from './components/ZooAiPanel';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.SELECT);
  const [mobilePanel, setMobilePanel] = useState<'PROPERTIES' | 'LAYERS' | 'ZOO_AI' | null>(null);
  const [desktopPanel, setDesktopPanel] = useState<'PROPERTIES_LAYERS' | 'ZOO_AI'>('PROPERTIES_LAYERS');

  const defaultLayer: Layer = { id: 'layer_0', name: 'Layer 0', color: '#FFFFFF', visible: true };
  const [layers, setLayers] = useState<Layer[]>([defaultLayer]);
  const [activeLayerId, setActiveLayerId] = useState<string>(defaultLayer.id);

  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const shapes = history[historyIndex];

  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [coords, setCoords] = useState<Point>({ x: 0, y: 0 });
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [orthoEnabled, setOrthoEnabled] = useState<boolean>(false);
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('TOP');

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1920, h: 1080 });

  const setShapesAndHistory = (newShapes: Shape[], fromHistory = false) => {
      const currentShapes = history[historyIndex];
      if (JSON.stringify(newShapes) === JSON.stringify(currentShapes)) {
          return;
      }
      if (fromHistory) {
          // This path is for undo/redo where we just change the index
          setHistory(newShapes as any); // a bit of a type hack for simplicity
      } else {
          // This path is for new actions
          const nextHistory = [...history.slice(0, historyIndex + 1), newShapes];
          setHistory(nextHistory);
          setHistoryIndex(nextHistory.length - 1);
      }
  };
  
  const addShape = (shape: Shape) => {
    setShapesAndHistory([...shapes, shape]);
  };

  const updateShape = (updatedShape: Shape) => {
    setShapesAndHistory(shapes.map(s => (s.id === updatedShape.id ? updatedShape : s)));
  };

  const updateShapes = (updatedShapes: Shape[]) => {
    const updatedShapesMap = new Map(updatedShapes.map(s => [s.id, s]));
    const newShapes = shapes.map(shape => updatedShapesMap.get(shape.id) || shape);
    setShapesAndHistory(newShapes);
  };

  const deleteShapes = (ids: string[]) => {
      const idsToDelete = new Set(ids);
      setShapesAndHistory(shapes.filter(shape => !idsToDelete.has(shape.id)));
      setSelectedShapeIds(prev => prev.filter(id => !idsToDelete.has(id)));
  };

  const extrudeShape = (shapeId: string, newShapes: Shape[]) => {
      const currentShapes = history[historyIndex];
      const nextShapes = currentShapes.filter(s => s.id !== shapeId).concat(newShapes);
      setShapesAndHistory(nextShapes);
      setSelectedShapeIds(prev => prev.filter(id => id !== shapeId));
      setActiveTool(Tool.SELECT);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = useCallback(() => {
      if (canUndo) {
          setHistoryIndex(i => i - 1);
      }
  }, [canUndo]);

  const redo = useCallback(() => {
      if (canRedo) {
          setHistoryIndex(i => i + 1);
      }
  }, [canRedo]);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isUndo = (isMac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
        const isRedo = (isMac ? e.metaKey : e.ctrlKey) && (e.key.toLowerCase() === 'y' || (isMac && e.shiftKey && e.key.toLowerCase() === 'z'));

        if (isUndo) {
            e.preventDefault();
            undo();
        } else if (isRedo) {
            e.preventDefault();
            redo();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const addLayer = useCallback(() => {
    const newLayer: Layer = {
      id: `layer_${Date.now()}`,
      name: `Layer ${layers.length}`,
      color: `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
      visible: true
    };
    setLayers(prev => [...prev, newLayer]);
    setActiveLayerId(newLayer.id);
  }, [layers.length]);

  const updateLayer = useCallback((updatedLayer: Layer) => {
    setLayers(prev => prev.map(l => l.id === updatedLayer.id ? updatedLayer : l));
  }, []);
  
  const handleSave = () => {
      const drawingData = {
          shapes: shapes,
          layers: layers,
          activeLayerId: activeLayerId,
      };
      const jsonString = JSON.stringify(drawingData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smart-cad-drawing.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const handleLoadRequest = () => {
      fileInputRef.current?.click();
  };

  const handleFileLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
          try {
              const result = e.target?.result;
              if (typeof result === 'string') {
                  const data = JSON.parse(result);
                  // Basic validation
                  if (data && Array.isArray(data.shapes) && Array.isArray(data.layers)) {
                      setLayers(data.layers);
                      setActiveLayerId(data.activeLayerId || data.layers[0]?.id || defaultLayer.id);
                      setShapesAndHistory([data.shapes]);
                      setHistoryIndex(0);
                      setSelectedShapeIds([]);
                  } else {
                      alert('Invalid or corrupted drawing file.');
                  }
              }
          } catch (error) {
              console.error('Error loading file:', error);
              alert('Failed to read the drawing file.');
          }
      };
      reader.readAsText(file);
      // Reset input value to allow loading the same file again
      if(event.target) event.target.value = '';
  };
  
  const zoomExtents = useCallback(() => {
    if (shapes.length === 0) {
        setViewBox({ x: 0, y: 0, w: 1920, h: 1080 });
        return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    shapes.forEach(shape => {
        const getPoints = (s: Shape): Point[] => {
            switch (s.type) {
                case Tool.LINE: return [s.p1, s.p2];
                case Tool.RECTANGLE: case Tool.IMAGE: return [{x: s.x, y: s.y}, {x: s.x + s.width, y: s.y + s.height}];
                case Tool.CIRCLE: case Tool.ARC: return [{x: s.cx - s.r, y: s.cy - s.r}, {x: s.cx + s.r, y: s.cy + s.r}];
                case Tool.POLYLINE: return s.points;
                case Tool.TEXT: return [{x: s.x, y: s.y}, {x: s.x + s.content.length * s.fontSize * 0.6, y: s.y}];
                default: return [];
            }
        };
        getPoints(shape).forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
    });
    
    const width = maxX - minX;
    const height = maxY - minY;
    const padding = Math.max(width, height) * 0.1; // 10% padding

    const newW = width + padding * 2;
    const newH = height + padding * 2;
    
    // Maintain aspect ratio
    const aspectRatio = 1920 / 1080;
    let finalW, finalH;
    if (newW / newH > aspectRatio) {
        finalW = newW;
        finalH = newW / aspectRatio;
    } else {
        finalH = newH;
        finalW = newH * aspectRatio;
    }

    setViewBox({
        x: minX - (finalW - width) / 2,
        y: minY - (finalH - height) / 2,
        w: finalW,
        h: finalH
    });
  }, [shapes]);

  const selectedShapes = shapes.filter(shape => selectedShapeIds.includes(shape.id)) || [];
  const activeLayer = layers.find(l => l.id === activeLayerId) || defaultLayer;
  
  const handleCommand = useCallback(async (command: string) => {
    setIsAiProcessing(true);
    setAiError(null);
    setAiResponseText(null);

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const drawShapeDeclaration: FunctionDeclaration = {
        name: 'drawShape',
        description: 'Draws a shape on the canvas. Available shapes are line, rectangle, circle, polyline, arc, and text.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                shapeType: { type: Type.STRING, enum: ['line', 'rectangle', 'circle', 'polyline', 'arc', 'text'] },
                properties: { type: Type.OBJECT, description: 'An object containing shape-specific properties. E.g. for a circle: { "cx": 100, "cy": 100, "r": 50 }. For a line: { "p1": {"x":0,"y":0}, "p2": {"x":100,"y":100} }. For a rectangle: { "x": 0, "y": 0, "width": 200, "height": 100 }.' },
            },
            required: ['shapeType', 'properties'],
        }
    };

    const modifyShapesDeclaration: FunctionDeclaration = {
        name: 'modifyShapes',
        description: 'Modifies properties of existing shapes. Use this for changing layer, color, position, size, etc. It can operate on selected shapes if shapeIds is not provided.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                shapeIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Array of shape IDs to modify. If empty, modifies the currently selected shapes.' },
                modifications: { type: Type.OBJECT, description: 'An object with properties to change, e.g. { "strokeWidth": 5, "rotation": 45 }.' },
            },
            required: ['modifications'],
        }
    };

    const deleteShapesDeclaration: FunctionDeclaration = {
        name: 'deleteShapes',
        description: 'Deletes shapes from the canvas. It can operate on selected shapes if shapeIds is not provided.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                shapeIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Array of shape IDs to delete. If empty, deletes the currently selected shapes.' },
            },
            required: [],
        }
    };

    const createLayerDeclaration: FunctionDeclaration = {
        name: 'createLayer',
        description: 'Creates a new layer.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                color: { type: Type.STRING, description: 'Hex color code, e.g., #FF5733' },
                visible: { type: Type.BOOLEAN },
            },
            required: ['name'],
        }
    };

    const tools = [drawShapeDeclaration, modifyShapesDeclaration, deleteShapesDeclaration, createLayerDeclaration];

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Given the current state of a CAD drawing, process the following command: "${command}". The current active layer is "${activeLayer.name}". The currently selected shapes have IDs: ${selectedShapeIds.join(', ') || 'none'}. Use the available tools to modify the drawing. If the command is unclear or cannot be fulfilled with the tools, provide a helpful text response.`,
        config: {
            tools: [{ functionDeclarations: tools }],
        },
      });

      if (response.functionCalls && response.functionCalls.length > 0) {
        for (const fc of response.functionCalls) {
            const args = fc.args;
            switch (fc.name) {
                case 'drawShape': {
                    const { shapeType, properties } = args;
                    const type = Tool[shapeType.toUpperCase() as keyof typeof Tool];
                    if (!type) {
                        setAiError(`Unknown shape type: ${shapeType}`);
                        break;
                    }
                    const newShape: Omit<Shape, 'id' | 'type'> & { type: Tool } = {
                        type,
                        layerId: activeLayer.id,
                        color: activeLayer.color,
                        strokeWidth: 2,
                        rotation: 0,
                        ...properties
                    };
                    addShape({ ...newShape, id: `shape_${Date.now()}` } as Shape);
                    break;
                }
                case 'modifyShapes': {
                    const idsToModify = args.shapeIds?.length > 0 ? args.shapeIds : selectedShapeIds;
                    if (idsToModify.length > 0) {
                        const shapesToUpdate = shapes
                            .filter(s => idsToModify.includes(s.id))
                            .map(s => ({ ...s, ...args.modifications }));
                        updateShapes(shapesToUpdate);
                    }
                    break;
                }
                case 'deleteShapes': {
                    const idsToDelete = args.shapeIds?.length > 0 ? args.shapeIds : selectedShapeIds;
                    if (idsToDelete.length > 0) {
                        deleteShapes(idsToDelete);
                    }
                    break;
                }
                case 'createLayer': {
                    const newLayer: Layer = {
                        id: `layer_${Date.now()}`,
                        name: args.name,
                        color: args.color || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`,
                        visible: args.visible ?? true,
                    };
                    setLayers(prev => [...prev, newLayer]);
                    setActiveLayerId(newLayer.id);
                    break;
                }
            }
        }
      } else {
        setAiResponseText(response.text);
      }
    } catch (error) {
        console.error('AI command failed:', error);
        setAiError('An error occurred while processing the command.');
    } finally {
      setIsAiProcessing(false);
    }
  }, [shapes, layers, activeLayer, selectedShapeIds]);
  

  return (
    <div className="flex flex-col h-screen w-screen bg-black text-white font-sans overflow-hidden">
      <Header 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        setMobilePanel={setMobilePanel}
        onSave={handleSave}
        onLoad={handleLoadRequest}
        onZoomExtents={zoomExtents}
        viewMode={viewMode}
        setViewMode={setViewMode}
        desktopPanel={desktopPanel}
        setDesktopPanel={setDesktopPanel}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 relative bg-black">
          <Canvas
            activeTool={activeTool}
            shapes={shapes}
            addShape={addShape}
            updateShape={updateShape}
            updateShapes={updateShapes}
            deleteShapes={deleteShapes}
            selectedShapeIds={selectedShapeIds}
            setSelectedShapeIds={setSelectedShapeIds}
            activeLayer={activeLayer}
            layers={layers}
            setCoords={setCoords}
            coords={coords}
            snapEnabled={snapEnabled}
            orthoEnabled={orthoEnabled}
            extrudeShape={extrudeShape}
            viewBox={viewBox}
            setViewBox={setViewBox}
            gridVisible={gridVisible}
            viewMode={viewMode}
          />
        </main>
        
        {/* Desktop Sidebar */}
        <aside className="w-64 flex-col bg-gray-800 border-l border-gray-700 hidden md:flex">
            {desktopPanel === 'PROPERTIES_LAYERS' ? (
                <>
                    <PropertiesPanel
                        selectedShapes={selectedShapes}
                        updateShape={updateShape}
                        deleteShapes={deleteShapes}
                        layers={layers}
                    />
                    <LayersPanel
                        layers={layers}
                        activeLayerId={activeLayerId}
                        setActiveLayerId={setActiveLayerId}
                        addLayer={addLayer}
                        updateLayer={updateLayer}
                    />
                </>
            ) : (
                <ZooAiPanel 
                    handleCommand={handleCommand}
                    isProcessing={isAiProcessing}
                    error={aiError}
                    aiResponseText={aiResponseText}
                />
            )}
        </aside>

        {/* Mobile Panel Overlay */}
        {mobilePanel && (
            <div className="md:hidden absolute inset-0 bg-gray-800 z-20 flex flex-col">
                 <div className="p-2 border-b border-gray-700 flex justify-between items-center bg-gray-900">
                    <h3 className="text-md font-semibold text-gray-200">{
                        mobilePanel === 'PROPERTIES' ? 'Properties' :
                        mobilePanel === 'LAYERS' ? 'Layers' : 'Zoo AI'
                    }</h3>
                    <button onClick={() => setMobilePanel(null)} className="p-2 rounded-md hover:bg-gray-700">
                         <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {mobilePanel === 'PROPERTIES' && <PropertiesPanel selectedShapes={selectedShapes} updateShape={updateShape} deleteShapes={deleteShapes} layers={layers} />}
                    {mobilePanel === 'LAYERS' && <LayersPanel layers={layers} activeLayerId={activeLayerId} setActiveLayerId={setActiveLayerId} addLayer={addLayer} updateLayer={updateLayer} />}
                    {mobilePanel === 'ZOO_AI' && <ZooAiPanel handleCommand={handleCommand} isProcessing={isAiProcessing} error={aiError} aiResponseText={aiResponseText} />}
                </div>
            </div>
        )}

      </div>
      <CommandLine handleCommand={handleCommand} />
      <StatusBar 
        coords={coords} 
        snapEnabled={snapEnabled} 
        setSnapEnabled={setSnapEnabled}
        orthoEnabled={orthoEnabled}
        setOrthoEnabled={setOrthoEnabled}
        gridVisible={gridVisible}
        setGridVisible={setGridVisible}
      />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileLoad}
        accept=".json"
        className="hidden"
      />
    </div>
  );
};

export default App;
