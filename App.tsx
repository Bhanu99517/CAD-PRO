import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Tool, Shape, Point, Layer, ImageShape, LineShape, CircleShape, RectangleShape, ArcShape, PolylineShape } from './types';
import Header from './components/Header';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import LayersPanel from './components/LayersPanel';
import CommandLine from './components/CommandLine';
import StatusBar from './components/StatusBar';
import { getShapeCenter } from './utils';

const shapeCreationSchema = {
    type: Type.OBJECT,
    properties: {
        shapeType: { 
            type: Type.STRING, 
            description: 'The type of shape to draw. Must be one of: "circle", "rectangle", "line", "arc".',
            enum: ['circle', 'rectangle', 'line', 'arc']
        },
        cx: { type: Type.NUMBER, description: "The x-coordinate of the circle's or arc's center." },
        cy: { type: Type.NUMBER, description: "The y-coordinate of the circle's or arc's center." },
        radius: { type: Type.NUMBER, description: 'The radius of the circle or arc. If diameter is provided in the prompt, convert it to radius.' },
        startAngle: { type: Type.NUMBER, description: "The start angle for an arc, in degrees." },
        endAngle: { type: Type.NUMBER, description: "The end angle for an arc, in degrees." },
        x: { type: Type.NUMBER, description: "The x-coordinate of the rectangle's top-left corner." },
        y: { type: Type.NUMBER, description: "The y-coordinate of the rectangle's top-left corner." },
        width: { type: Type.NUMBER, description: "The width of the rectangle." },
        height: { type: Type.NUMBER, description: "The height of the rectangle." },
        x1: { type: Type.NUMBER, description: "The x-coordinate of the line's start point." },
        y1: { type: Type.NUMBER, description: "The y-coordinate of the line's start point." },
        x2: { type: Type.NUMBER, description: "The x-coordinate of the line's end point." },
        y2: { type: Type.NUMBER, description: "The y-coordinate of the line's end point." },
    },
    required: ['shapeType']
};

const shapeModificationSchema = {
    type: Type.OBJECT,
    properties: {
        action: {
            type: Type.STRING,
            description: 'The modification to perform. Must be one of: "move", "rotate", "scale", "delete".',
            enum: ['move', 'rotate', 'scale', 'delete']
        },
        target: {
            type: Type.STRING,
            description: "The target of the action. Always use 'selected' as the user will be referring to the currently selected object.",
            enum: ['selected']
        },
        dx: { type: Type.NUMBER, description: "The distance to move along the x-axis. Positive is right, negative is left." },
        dy: { type: Type.NUMBER, description: "The distance to move along the y-axis. Positive is down, negative is up." },
        angle: { type: Type.NUMBER, description: "The angle to rotate by, in degrees. Positive is clockwise." },
        scaleFactor: { type: Type.NUMBER, description: "The factor to scale by. E.g., 2 for double size, 0.5 for half size." },
    },
    required: ['action', 'target']
};

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.SELECT);
  const [mobilePanel, setMobilePanel] = useState<'PROPERTIES' | 'LAYERS' | null>(null);

  const defaultLayer: Layer = { id: 'layer_0', name: 'Layer 0', color: '#FFFFFF', visible: true };
  const [layers, setLayers] = useState<Layer[]>([defaultLayer]);
  const [activeLayerId, setActiveLayerId] = useState<string>(defaultLayer.id);

  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const shapes = history[historyIndex];

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [coords, setCoords] = useState<Point>({ x: 0, y: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [orthoEnabled, setOrthoEnabled] = useState<boolean>(false);

  const setShapesAndHistory = (newShapes: Shape[]) => {
    const currentShapes = history[historyIndex];
    if (JSON.stringify(newShapes) === JSON.stringify(currentShapes)) {
        return;
    }
    const nextHistory = [...history.slice(0, historyIndex + 1), newShapes];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };
  
  const addShape = (shape: Shape) => {
    setShapesAndHistory([...shapes, shape]);
  };

  const updateShape = (updatedShape: Shape) => {
    setShapesAndHistory(shapes.map(s => (s.id === updatedShape.id ? updatedShape : s)));
  };

  const deleteShape = (id: string) => {
    setShapesAndHistory(shapes.filter(shape => shape.id !== id));
    if (selectedShapeId === id) {
      setSelectedShapeId(null);
    }
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
  
  const handleCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    
    const commandLower = command.toLowerCase();
    const drawKeywords = ['draw', 'make', 'create', 'add'];
    const modifyKeywords = ['move', 'rotate', 'scale', 'delete', 'remove', 'change', 'modify', 'resize', 'spin'];
    const isDrawCommand = drawKeywords.some(kw => commandLower.startsWith(kw));
    const isModifyCommand = modifyKeywords.some(kw => commandLower.includes(kw));

    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      if (isDrawCommand) {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Parse the following command to extract information for drawing a shape. Respond in JSON format according to the schema. Command: '${command}'. If the user provides a diameter for a circle, calculate and return the radius. If a starting position is not mentioned, use 100, 100 for the center or top-left corner.`,
          config: {
            responseMimeType: "application/json",
            responseSchema: shapeCreationSchema,
          }
        });

        const jsonStr = response.text.trim();
        const shapeData = JSON.parse(jsonStr);

        let newShape: Shape | null = null;
        const commonProps = {
            id: `shape_${Date.now()}`,
            layerId: activeLayerId,
            color: '#FFFFFF',
            strokeWidth: 2,
            rotation: 0,
        };

        switch (shapeData.shapeType) {
            case 'circle':
                if (shapeData.radius > 0) {
                    newShape = { ...commonProps, type: Tool.CIRCLE, cx: shapeData.cx ?? 100, cy: shapeData.cy ?? 100, r: shapeData.radius } as CircleShape;
                }
                break;
            case 'rectangle':
                if (shapeData.width > 0 && shapeData.height > 0) {
                    newShape = { ...commonProps, type: Tool.RECTANGLE, x: shapeData.x ?? 100, y: shapeData.y ?? 100, width: shapeData.width, height: shapeData.height } as RectangleShape;
                }
                break;
            case 'line':
                if (shapeData.x1 != null && shapeData.y1 != null && shapeData.x2 != null && shapeData.y2 != null) {
                    newShape = { ...commonProps, type: Tool.LINE, p1: { x: shapeData.x1, y: shapeData.y1 }, p2: { x: shapeData.x2, y: shapeData.y2 } } as LineShape;
                }
                break;
            case 'arc':
                if (shapeData.radius > 0 && shapeData.startAngle != null && shapeData.endAngle != null) {
                    newShape = { ...commonProps, type: Tool.ARC, cx: shapeData.cx ?? 100, cy: shapeData.cy ?? 100, r: shapeData.radius, startAngle: shapeData.startAngle, endAngle: shapeData.endAngle } as ArcShape;
                }
                break;
        }

        if (newShape) {
            addShape(newShape);
        } else {
            console.warn("Could not create a valid shape from the command.", shapeData);
        }
      } else if (isModifyCommand) {
        const selectedShape = shapes.find(s => s.id === selectedShapeId);
        if (!selectedShape) {
          console.warn("Please select a shape before using a modification command.");
          // TODO: Provide user feedback in the UI
          setIsGenerating(false);
          return;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Parse the following command to extract information for modifying a shape. Respond in JSON format according to the schema. The user wants to modify the currently selected shape. Command: '${command}'`,
          config: {
            responseMimeType: "application/json",
            responseSchema: shapeModificationSchema,
          }
        });
        
        const jsonStr = response.text.trim();
        const modData = JSON.parse(jsonStr);
        let updatedShape = JSON.parse(JSON.stringify(selectedShape)) as Shape;

        switch (modData.action) {
            case 'delete':
                deleteShape(selectedShape.id);
                setIsGenerating(false);
                return;
            case 'move':
                const { dx = 0, dy = 0 } = modData;
                switch (updatedShape.type) {
                    case Tool.LINE: (updatedShape as LineShape).p1 = { x: (updatedShape as LineShape).p1.x + dx, y: (updatedShape as LineShape).p1.y + dy }; (updatedShape as LineShape).p2 = { x: (updatedShape as LineShape).p2.x + dx, y: (updatedShape as LineShape).p2.y + dy }; break;
                    case Tool.RECTANGLE: case Tool.IMAGE: (updatedShape as RectangleShape | ImageShape).x += dx; (updatedShape as RectangleShape | ImageShape).y += dy; break;
                    case Tool.CIRCLE: case Tool.ARC: (updatedShape as CircleShape | ArcShape).cx += dx; (updatedShape as CircleShape | ArcShape).cy += dy; break;
                    case Tool.POLYLINE: (updatedShape as PolylineShape).points = (updatedShape as PolylineShape).points.map((p: Point) => ({ x: p.x + dx, y: p.y + dy })); break;
                }
                break;
            case 'rotate':
                const { angle = 0 } = modData;
                updatedShape.rotation = (updatedShape.rotation || 0) + angle;
                break;
            case 'scale':
                const { scaleFactor = 1 } = modData;
                if (scaleFactor === 1 || scaleFactor <= 0) break;
                const center = getShapeCenter(updatedShape);
                switch (updatedShape.type) {
                    case Tool.RECTANGLE: case Tool.IMAGE: const rect = updatedShape as RectangleShape | ImageShape; rect.width *= scaleFactor; rect.height *= scaleFactor; rect.x = center.x - rect.width / 2; rect.y = center.y - rect.height / 2; break;
                    case Tool.CIRCLE: case Tool.ARC: (updatedShape as CircleShape | ArcShape).r *= scaleFactor; break;
                    case Tool.LINE: const line = updatedShape as LineShape; const p1Vec = { x: line.p1.x - center.x, y: line.p1.y - center.y }; const p2Vec = { x: line.p2.x - center.x, y: line.p2.y - center.y }; line.p1 = { x: center.x + p1Vec.x * scaleFactor, y: center.y + p1Vec.y * scaleFactor }; line.p2 = { x: center.x + p2Vec.x * scaleFactor, y: center.y + p2Vec.y * scaleFactor }; break;
                    case Tool.POLYLINE: const poly = updatedShape as PolylineShape; poly.points = poly.points.map((p: Point) => { const vec = { x: p.x - center.x, y: p.y - center.y }; return { x: center.x + vec.x * scaleFactor, y: center.y + vec.y * scaleFactor }; }); break;
                }
                break;
        }
        updateShape(updatedShape);
      } else {
        const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: command,
          config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '1:1' },
        });

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        
        const newImageShape: ImageShape = {
          id: `shape_${Date.now()}`, type: Tool.IMAGE, layerId: activeLayerId, color: '#FFFFFF',
          strokeWidth: 0, rotation: 0, x: 100, y: 100, width: 512, height: 512, href: imageUrl,
        };
        addShape(newImageShape);
      }
    } catch (error) {
      console.error('Error processing command with Gemini:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [addShape, activeLayerId, shapes, selectedShapeId, deleteShape, updateShape]);
  
  const selectedShape = shapes.find(shape => shape.id === selectedShapeId) || null;
  const activeLayer = layers.find(l => l.id === activeLayerId) || defaultLayer;

  return (
    <div className="flex flex-col h-screen w-screen bg-gray-900 text-white font-sans overflow-hidden">
      <Header 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        setMobilePanel={setMobilePanel}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 relative bg-gray-900">
          <Canvas
            activeTool={activeTool}
            shapes={shapes}
            addShape={addShape}
            updateShape={updateShape}
            deleteShape={deleteShape}
            selectedShapeId={selectedShapeId}
            setSelectedShapeId={setSelectedShapeId}
            activeLayer={activeLayer}
            layers={layers}
            setCoords={setCoords}
            snapEnabled={snapEnabled}
            orthoEnabled={orthoEnabled}
          />
        </main>
        
        {/* Desktop Sidebar */}
        <aside className="w-64 flex-col bg-gray-800 border-l border-gray-700 hidden md:flex">
          <PropertiesPanel
            selectedShape={selectedShape}
            updateShape={updateShape}
            deleteShape={deleteShape}
            layers={layers}
          />
          <LayersPanel
            layers={layers}
            activeLayerId={activeLayerId}
            setActiveLayerId={setActiveLayerId}
            addLayer={addLayer}
            updateLayer={updateLayer}
          />
        </aside>

        {/* Mobile Panel Overlay */}
        {mobilePanel && (
            <div className="md:hidden absolute inset-0 bg-gray-800 z-20 flex flex-col">
                 <div className="p-2 border-b border-gray-700 flex justify-between items-center bg-gray-900">
                    <h3 className="text-md font-semibold text-gray-200">{mobilePanel === 'PROPERTIES' ? 'Properties' : 'Layers'}</h3>
                    <button onClick={() => setMobilePanel(null)} className="p-2 rounded-md hover:bg-gray-700">
                         <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {mobilePanel === 'PROPERTIES' && <PropertiesPanel selectedShape={selectedShape} updateShape={updateShape} deleteShape={deleteShape} layers={layers} />}
                    {mobilePanel === 'LAYERS' && <LayersPanel layers={layers} activeLayerId={activeLayerId} setActiveLayerId={setActiveLayerId} addLayer={addLayer} updateLayer={updateLayer} />}
                </div>
            </div>
        )}

      </div>
      <CommandLine handleCommand={handleCommand} isGenerating={isGenerating} />
      <StatusBar 
        coords={coords} 
        snapEnabled={snapEnabled} 
        setSnapEnabled={setSnapEnabled}
        orthoEnabled={orthoEnabled}
        setOrthoEnabled={setOrthoEnabled}
      />
    </div>
  );
};

export default App;