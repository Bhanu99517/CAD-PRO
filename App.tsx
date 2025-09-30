import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Tool, Shape, Point, Layer, ImageShape, LineShape, CircleShape, RectangleShape, ArcShape } from './types';
import Header from './components/Header';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import LayersPanel from './components/LayersPanel';
import CommandLine from './components/CommandLine';
import StatusBar from './components/StatusBar';

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

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.SELECT);

  const defaultLayer: Layer = { id: 'layer_0', name: 'Layer 0', color: '#FFFFFF', visible: true };
  const [layers, setLayers] = useState<Layer[]>([defaultLayer]);
  const [activeLayerId, setActiveLayerId] = useState<string>(defaultLayer.id);

  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const shapes = history[historyIndex];

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [coords, setCoords] = useState<Point>({ x: 0, y: 0 });
  const [isGenerating, setIsGenerating] = useState(false);

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
    const isDrawCommand = drawKeywords.some(kw => commandLower.startsWith(kw));

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
                    newShape = {
                        ...commonProps,
                        type: Tool.CIRCLE,
                        cx: shapeData.cx ?? 100,
                        cy: shapeData.cy ?? 100,
                        r: shapeData.radius,
                    } as CircleShape;
                }
                break;
            case 'rectangle':
                if (shapeData.width > 0 && shapeData.height > 0) {
                    newShape = {
                        ...commonProps,
                        type: Tool.RECTANGLE,
                        x: shapeData.x ?? 100,
                        y: shapeData.y ?? 100,
                        width: shapeData.width,
                        height: shapeData.height,
                    } as RectangleShape;
                }
                break;
            case 'line':
                if (shapeData.x1 != null && shapeData.y1 != null && shapeData.x2 != null && shapeData.y2 != null) {
                    newShape = {
                        ...commonProps,
                        type: Tool.LINE,
                        p1: { x: shapeData.x1, y: shapeData.y1 },
                        p2: { x: shapeData.x2, y: shapeData.y2 },
                    } as LineShape;
                }
                break;
            case 'arc':
                if (shapeData.radius > 0 && shapeData.startAngle != null && shapeData.endAngle != null) {
                    newShape = {
                        ...commonProps,
                        type: Tool.ARC,
                        cx: shapeData.cx ?? 100,
                        cy: shapeData.cy ?? 100,
                        r: shapeData.radius,
                        startAngle: shapeData.startAngle,
                        endAngle: shapeData.endAngle,
                    } as ArcShape;
                }
                break;
        }

        if (newShape) {
            addShape(newShape);
        } else {
            console.warn("Could not create a valid shape from the command.", shapeData);
        }

      } else {
        const response = await ai.models.generateImages({
          model: 'imagen-4.0-generate-001',
          prompt: command,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '1:1',
          },
        });

        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        
        const newImageShape: ImageShape = {
          id: `shape_${Date.now()}`,
          type: Tool.IMAGE,
          layerId: activeLayerId,
          color: '#FFFFFF',
          strokeWidth: 0,
          rotation: 0,
          x: 100,
          y: 100,
          width: 512,
          height: 512,
          href: imageUrl,
        };

        addShape(newImageShape);
      }

    } catch (error) {
      console.error('Error processing command with Gemini:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [addShape, activeLayerId]);
  
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
          />
        </main>
        <aside className="w-64 flex flex-col bg-gray-800 border-l border-gray-700">
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
      </div>
      <CommandLine handleCommand={handleCommand} isGenerating={isGenerating} />
      <StatusBar coords={coords} />
    </div>
  );
};

export default App;
