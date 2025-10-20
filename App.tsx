
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { Tool, Shape, Point, Layer, ImageShape, LineShape, CircleShape, RectangleShape, ArcShape, PolylineShape, TextShape } from './types';
import Header from './components/Header';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import LayersPanel from './LayersPanel';
import CommandLine from './components/CommandLine';
import StatusBar from './components/StatusBar';
import ZooAiPanel from './components/ZooAiPanel';
import { getShapeCenter } from './utils';

const shapeCreationSchema = {
    type: Type.OBJECT,
    properties: {
        shapeType: { 
            type: Type.STRING, 
            description: 'The type of shape to draw. Must be one of: "circle", "rectangle", "line", "arc", "text".',
            enum: ['circle', 'rectangle', 'line', 'arc', 'text']
        },
        cx: { type: Type.NUMBER, description: "The x-coordinate of the circle's or arc's center." },
        cy: { type: Type.NUMBER, description: "The y-coordinate of the circle's or arc's center." },
        radius: { type: Type.NUMBER, description: 'The radius of the circle or arc. If diameter is provided in the prompt, convert it to radius.' },
        startAngle: { type: Type.NUMBER, description: "The start angle for an arc, in degrees." },
        endAngle: { type: Type.NUMBER, description: "The end angle for an arc, in degrees." },
        x: { type: Type.NUMBER, description: "The x-coordinate of the rectangle's or text's top-left corner." },
        y: { type: Type.NUMBER, description: "The y-coordinate of the rectangle's or text's top-left corner." },
        width: { type: Type.NUMBER, description: "The width of the rectangle." },
        height: { type: Type.NUMBER, description: "The height of the rectangle." },
        x1: { type: Type.NUMBER, description: "The x-coordinate of the line's start point." },
        y1: { type: Type.NUMBER, description: "The y-coordinate of the line's start point." },
        x2: { type: Type.NUMBER, description: "The x-coordinate of the line's end point." },
        y2: { type: Type.NUMBER, description: "The y-coordinate of the line's end point." },
        content: { type: Type.STRING, description: "The text content for a text shape." },
        fontSize: { type: Type.NUMBER, description: "The font size for a text shape. Default is 16." },
    },
    required: ['shapeType']
};

const multipleShapeCreationSchema = {
    type: Type.OBJECT,
    properties: {
        shapes: {
            type: Type.ARRAY,
            description: "An array of shapes to be drawn.",
            items: shapeCreationSchema
        }
    },
    required: ['shapes']
};

const shapeModificationSchema = {
    type: Type.OBJECT,
    properties: {
        action: {
            type: Type.STRING,
            description: 'The modification to perform. Must be one of: "move", "rotate", "scale".',
            enum: ['move', 'rotate', 'scale']
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

const eraseSchema = {
    type: Type.OBJECT,
    properties: {
        target: {
            type: Type.STRING,
            description: "The type of shape to erase. Can be 'circle', 'rectangle', 'line', 'arc', 'text', 'polyline', 'image', 'shape' (for any type), or 'all'.",
            enum: ['circle', 'rectangle', 'line', 'arc', 'text', 'polyline', 'image', 'shape', 'all']
        },
        selector: {
            type: Type.STRING,
            description: "Which specific object to select if there are multiple. Can be 'last' (the most recently drawn), or 'all' of the specified type.",
            enum: ['last', 'all']
        },
        position: {
            type: Type.STRING,
            description: "A spatial descriptor. Can be 'left', 'right', 'top', 'bottom'.",
            enum: ['left', 'right', 'top', 'bottom']
        }
    },
    required: ['target']
};


const modelingSchema = {
    type: Type.OBJECT,
    properties: {
        action: {
            type: Type.STRING,
            description: 'The modeling action to perform. Must be one of: "extrude", "presspull".',
            enum: ['extrude', 'presspull']
        },
        target: {
            type: Type.STRING,
            description: "The target of the action. Always use 'selected'.",
            enum: ['selected']
        },
        height: { type: Type.NUMBER, description: "The extrusion height or distance." },
    },
    required: ['action', 'target', 'height']
};

const modelPartSchema = {
    type: Type.OBJECT,
    properties: {
        shapeType: { type: Type.STRING, enum: ['line', 'rectangle', 'circle', 'arc', 'polyline'] },
        x1: { type: Type.NUMBER, description: "The x-coordinate for the start of a line." }, 
        y1: { type: Type.NUMBER, description: "The y-coordinate for the start of a line." }, 
        x2: { type: Type.NUMBER, description: "The x-coordinate for the end of a line." }, 
        y2: { type: Type.NUMBER, description: "The y-coordinate for the end of a line." },
        x: { type: Type.NUMBER, description: "The x-coordinate for a rectangle's top-left corner." }, 
        y: { type: Type.NUMBER, description: "The y-coordinate for a rectangle's top-left corner." }, 
        width: { type: Type.NUMBER, description: "The width of a rectangle." }, 
        height: { type: Type.NUMBER, description: "The height of a rectangle." },
        cx: { type: Type.NUMBER, description: "The x-coordinate for a circle or arc's center." }, 
        cy: { type: Type.NUMBER, description: "The y-coordinate for a circle or arc's center." }, 
        radius: { type: Type.NUMBER, description: "The radius of a circle or arc." },
        startAngle: { type: Type.NUMBER, description: "The start angle for an arc in degrees." }, 
        endAngle: { type: Type.NUMBER, description: "The end angle for an arc in degrees." },
        points: { 
            type: Type.ARRAY,
            description: "An array of {x, y} points for a polyline.",
            items: {
                type: Type.OBJECT,
                properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER }
                },
                required: ['x', 'y']
            }
        }
    },
    required: ['shapeType']
};

const modelGenerationSchema = {
    type: Type.OBJECT,
    properties: {
        modelParts: {
            type: Type.ARRAY,
            description: 'An array of 2D shapes (lines, rectangles, circles, arcs, polylines) that compose the requested model.',
            items: modelPartSchema
        }
    },
    required: ['modelParts']
};


const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.SELECT);
  const [mobilePanel, setMobilePanel] = useState<'PROPERTIES' | 'LAYERS' | null>(null);
  const [isZooAiPanelOpen, setIsZooAiPanelOpen] = useState(false);

  const defaultLayer: Layer = { id: 'layer_0', name: 'Layer 0', color: '#FFFFFF', visible: true };
  const [layers, setLayers] = useState<Layer[]>([defaultLayer]);
  const [activeLayerId, setActiveLayerId] = useState<string>(defaultLayer.id);

  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const shapes = history[historyIndex];

  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [coords, setCoords] = useState<Point>({ x: 0, y: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [orthoEnabled, setOrthoEnabled] = useState<boolean>(false);
  const [gridVisible, setGridVisible] = useState<boolean>(true);

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

  const handleZooAiGenerate = useCallback(async (command: string) => {
    if (!command.trim()) return;

    setIsGenerating(true);
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Generate a 2D model based on the following user request. The model should be composed of basic 2D shapes (lines, rectangles, circles, arcs, polylines). The entire model should fit within a 400x400 bounding box, centered around the point (300, 300). Use an isometric or simplified 3D-like projection if the object is three-dimensional. Request: '${command}'. Respond in JSON format according to the provided schema.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: modelGenerationSchema,
            }
        });

        const jsonStr = response.text.trim();
        const modelData = JSON.parse(jsonStr);

        if (modelData.modelParts && Array.isArray(modelData.modelParts)) {
            const newShapes: Shape[] = [];
            modelData.modelParts.forEach((part: any) => {
                let newShape: Shape | null = null;
                const commonProps = {
                    id: `shape_${Date.now()}_${Math.random()}`,
                    layerId: activeLayerId,
                    color: '#FFFFFF',
                    strokeWidth: 2,
                    rotation: 0,
                };

                switch (part.shapeType) {
                    case 'circle':
                        if (part.radius > 0) {
                            newShape = { ...commonProps, type: Tool.CIRCLE, cx: part.cx, cy: part.cy, r: part.radius } as CircleShape;
                        }
                        break;
                    case 'rectangle':
                        if (part.width > 0 && part.height > 0) {
                            newShape = { ...commonProps, type: Tool.RECTANGLE, x: part.x, y: part.y, width: part.width, height: part.height } as RectangleShape;
                        }
                        break;
                    case 'line':
                        if (part.x1 != null && part.y1 != null && part.x2 != null && part.y2 != null) {
                            newShape = { ...commonProps, type: Tool.LINE, p1: { x: part.x1, y: part.y1 }, p2: { x: part.x2, y: part.y2 } } as LineShape;
                        }
                        break;
                    case 'arc':
                        if (part.radius > 0 && part.startAngle != null && part.endAngle != null) {
                            newShape = { ...commonProps, type: Tool.ARC, cx: part.cx, cy: part.cy, r: part.radius, startAngle: part.startAngle, endAngle: part.endAngle } as ArcShape;
                        }
                        break;
                    case 'polyline':
                        if (part.points && part.points.length > 0) {
                            newShape = { ...commonProps, type: Tool.POLYLINE, points: part.points } as PolylineShape;
                        }
                        break;
                }
                if (newShape) {
                    newShapes.push(newShape);
                }
            });

            if (newShapes.length > 0) {
                setShapesAndHistory([...shapes, ...newShapes]);
                setIsZooAiPanelOpen(false); // Close panel on success
            } else {
                console.warn("AI generated a model with no valid parts.", modelData);
            }
        } else {
            console.warn("Could not generate a valid model from the command.", modelData);
        }
    } catch(error) {
        console.error('Error generating model with Zoo AI:', error);
    } finally {
        setIsGenerating(false);
    }
  }, [activeLayerId, shapes, history, historyIndex]);
  
  const handleCommand = useCallback(async (command: string) => {
    if (!command.trim()) return;
    
    const commandLower = command.toLowerCase();
    const drawKeywords = ['draw', 'make', 'create', 'add'];
    const eraseKeywords = ['erase', 'delete', 'remove', 'clear'];
    const modifyKeywords = ['move', 'rotate', 'scale', 'change', 'modify', 'resize', 'spin'];
    const modelingKeywords = ['extrude', 'presspull'];
    const modelGenKeywords = ['model', 'build', 'design', 'generate a model of'];
    const alphabetKeywords = ['write the alphabet', 'draw the alphabet'];
    const threeDTextKeywords = ['3d text', '3d font', 'extrude text', 'three-dimensional text'];
    const zooAiKeyword = 'zoo ai';
    
    if (commandLower.startsWith(zooAiKeyword)) {
        setIsZooAiPanelOpen(true);
        return;
    }

    const isDrawCommand = drawKeywords.some(kw => commandLower.startsWith(kw));
    const isEraseCommand = eraseKeywords.some(kw => commandLower.startsWith(kw));
    const isModifyCommand = modifyKeywords.some(kw => commandLower.includes(kw));
    const isModelingCommand = modelingKeywords.some(kw => commandLower.includes(kw));
    const isModelGenCommand = modelGenKeywords.some(kw => commandLower.startsWith(kw));
    const isAlphabetCommand = alphabetKeywords.some(kw => commandLower.startsWith(kw));
    const is3DTextCommand = threeDTextKeywords.some(kw => commandLower.includes(kw));

    if (isModelGenCommand) {
        handleZooAiGenerate(command);
        return;
    }
    
    setIsGenerating(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

      if (is3DTextCommand) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: `Generate a 2D model representing 3D text in an isometric view based on the user's request. Decompose each letter into a set of 2D shapes (lines, and closed polylines for faces). The model should fit within a 400x400 area centered at (300, 300). User Request: '${command}'. Respond in JSON format according to the provided schema.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: modelGenerationSchema,
            }
        });

        const jsonStr = response.text.trim();
        const modelData = JSON.parse(jsonStr);

        if (modelData.modelParts && Array.isArray(modelData.modelParts)) {
            const newShapes: Shape[] = modelData.modelParts.map((part: any) => {
                const commonProps = {
                    id: `shape_${Date.now()}_${Math.random()}`, layerId: activeLayerId,
                    color: '#FFFFFF', strokeWidth: 2, rotation: 0,
                };
                switch (part.shapeType) {
                    case 'line': return { ...commonProps, type: Tool.LINE, p1: { x: part.x1, y: part.y1 }, p2: { x: part.x2, y: part.y2 } } as LineShape;
                    case 'polyline': return { ...commonProps, type: Tool.POLYLINE, points: part.points } as PolylineShape;
                    default: return null;
                }
            }).filter(Boolean);

            if (newShapes.length > 0) {
                setShapesAndHistory([...shapes, ...newShapes]);
            }
        }
        setIsGenerating(false);
        return;
      }

      if (isAlphabetCommand) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Parse the following command to generate an array of text shapes for the English alphabet (A-Z). Lay them out in a grid starting near (50, 50). Respond in JSON format according to the schema. Command: '${command}'`,
            config: {
                responseMimeType: "application/json",
                responseSchema: multipleShapeCreationSchema,
            }
        });

        const jsonStr = response.text.trim();
        const multiShapeData = JSON.parse(jsonStr);

        if (multiShapeData.shapes && Array.isArray(multiShapeData.shapes)) {
            const newShapes: Shape[] = multiShapeData.shapes.map((shapeData: any): Shape | null => {
                 const commonProps = {
                    id: `shape_${Date.now()}_${Math.random()}`, layerId: activeLayerId,
                    color: '#FFFFFF', strokeWidth: 0, rotation: 0,
                };
                if (shapeData.shapeType === 'text' && shapeData.content) {
                    return { ...commonProps, type: Tool.TEXT, x: shapeData.x ?? 100, y: shapeData.y ?? 100, content: shapeData.content, fontSize: shapeData.fontSize ?? 16 } as TextShape;
                }
                return null;
            }).filter((s): s is Shape => s !== null);
            
            if (newShapes.length > 0) {
                setShapesAndHistory([...shapes, ...newShapes]);
            }
        }
        setIsGenerating(false);
        return;
      }
      
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
            case 'text':
                if (shapeData.content) {
                    newShape = { ...commonProps, type: Tool.TEXT, x: shapeData.x ?? 100, y: shapeData.y ?? 100, content: shapeData.content, fontSize: shapeData.fontSize ?? 16, strokeWidth: 0 } as TextShape;
                }
                break;
        }

        if (newShape) {
            addShape(newShape);
        } else {
            console.warn("Could not create a valid shape from the command.", shapeData);
        }
      } else if (isEraseCommand) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Parse the user's erase command. Identify the target shape type. This can be 'circle', 'rectangle', 'line', etc., or 'shape' for any type, or 'all' to clear everything. Also identify a positional descriptor if present ('left', 'right', 'top', 'bottom'). Also identify a selector like 'last' or 'all' (of a type). If the user says something like 'erase circle' and there are multiple circles, the selector should be 'last'. If no selector or position is specified, you can omit them from the response. Command: '${command}'`,
            config: {
              responseMimeType: "application/json",
              responseSchema: eraseSchema,
            }
          });

        const jsonStr = response.text.trim();
        const eraseData = JSON.parse(jsonStr);

        if (eraseData.target === 'all') {
            setShapesAndHistory([]);
            setIsGenerating(false);
            return;
        }

        let candidates = [...shapes];

        // 1. Filter by type
        if (eraseData.target && eraseData.target !== 'shape') {
            const toolMap: { [key: string]: Tool } = {
                'line': Tool.LINE, 'rectangle': Tool.RECTANGLE, 'circle': Tool.CIRCLE,
                'arc': Tool.ARC, 'polyline': Tool.POLYLINE, 'image': Tool.IMAGE, 'text': Tool.TEXT,
            };
            const targetTool = toolMap[eraseData.target];
            if (targetTool) {
                candidates = candidates.filter(s => s.type === targetTool);
            }
        }

        // 2. Filter by position
        if (eraseData.position && candidates.length > 1) {
            const centers = candidates.map(s => getShapeCenter(s));
            const avgX = centers.reduce((sum, c) => sum + c.x, 0) / centers.length;
            const avgY = centers.reduce((sum, c) => sum + c.y, 0) / centers.length;

            switch (eraseData.position) {
                case 'left': candidates = candidates.filter(s => getShapeCenter(s).x < avgX); break;
                case 'right': candidates = candidates.filter(s => getShapeCenter(s).x > avgX); break;
                case 'top': candidates = candidates.filter(s => getShapeCenter(s).y < avgY); break;
                case 'bottom': candidates = candidates.filter(s => getShapeCenter(s).y > avgY); break;
            }
        }
        
        if (candidates.length === 0) {
            console.warn("No shapes matched the erase criteria.");
            setIsGenerating(false);
            return;
        }

        let shapesToDeleteIds = new Set<string>();

        // 3. Apply selector
        if (eraseData.selector === 'all') {
            candidates.forEach(s => shapesToDeleteIds.add(s.id));
        } else { // 'last' or default
            const lastCandidate = candidates[candidates.length - 1];
            if (lastCandidate) {
                shapesToDeleteIds.add(lastCandidate.id);
            }
        }

        if (shapesToDeleteIds.size > 0) {
            deleteShapes(Array.from(shapesToDeleteIds));
        }

      } else if (isModifyCommand) {
        const selectedShapes = shapes.filter(s => selectedShapeIds.includes(s.id));
        if (selectedShapes.length === 0) {
          console.warn("Please select a shape before using a modification command.");
          setIsGenerating(false);
          return;
        }

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: `Parse the following command to extract information for modifying a shape. Respond in JSON format according to the schema. The user wants to modify the currently selected shape(s). Command: '${command}'`,
          config: {
            responseMimeType: "application/json",
            responseSchema: shapeModificationSchema,
          }
        });
        
        const jsonStr = response.text.trim();
        const modData = JSON.parse(jsonStr);
        
        const updatedShapes = selectedShapes.map(selectedShape => {
            let updatedShape = JSON.parse(JSON.stringify(selectedShape)) as Shape;

            switch (modData.action) {
                case 'move':
                    const { dx = 0, dy = 0 } = modData;
                    switch (updatedShape.type) {
                        case Tool.LINE: (updatedShape as LineShape).p1 = { x: (updatedShape as LineShape).p1.x + dx, y: (updatedShape as LineShape).p1.y + dy }; (updatedShape as LineShape).p2 = { x: (updatedShape as LineShape).p2.x + dx, y: (updatedShape as LineShape).p2.y + dy }; break;
                        case Tool.RECTANGLE: case Tool.IMAGE: case Tool.TEXT: (updatedShape as RectangleShape | ImageShape | TextShape).x += dx; (updatedShape as RectangleShape | ImageShape | TextShape).y += dy; break;
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
                        case Tool.TEXT: (updatedShape as TextShape).fontSize *= scaleFactor; break;
                    }
                    break;
            }
            return updatedShape;
        });
        updateShapes(updatedShapes);

      } else if (isModelingCommand) {
        const selectedShape = shapes.find(s => s.id === selectedShapeIds[0]);
        if (!selectedShape) {
          console.warn("Please select a shape before using a modeling command.");
          setIsGenerating(false);
          return;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Parse the following command for a 3D modeling operation. Respond in JSON using the schema. The user wants to modify the selected shape. Command: '${command}'`,
            config: {
                responseMimeType: "application/json",
                responseSchema: modelingSchema,
            }
        });

        const jsonStr = response.text.trim();
        const modData = JSON.parse(jsonStr);

        if (modData.action === 'extrude' || modData.action === 'presspull') {
            const { height = 50 } = modData;
            let newShapes: Shape[] = [];

            if (selectedShape.type === Tool.RECTANGLE) {
                const rect = selectedShape as RectangleShape;
                const angle = -30; // Isometric angle
                const rad = angle * (Math.PI / 180);
                const dx = height * Math.cos(rad);
                const dy = height * Math.sin(rad);

                const p1 = { x: rect.x, y: rect.y };
                const p2 = { x: rect.x + rect.width, y: rect.y };
                const p3 = { x: rect.x + rect.width, y: rect.y + rect.height };
                const p4 = { x: rect.x, y: rect.y + rect.height };

                const p1_ = { x: p1.x + dx, y: p1.y + dy };
                const p2_ = { x: p2.x + dx, y: p2.y + dy };
                const p3_ = { x: p3.x + dx, y: p3.y + dy };
                const p4_ = { x: p4.x + dx, y: p4.y + dy };
                
                const commonProps = {
                    layerId: selectedShape.layerId,
                    color: '#FFFFFF',
                    strokeWidth: selectedShape.strokeWidth,
                    rotation: 0,
                };

                const frontFace: PolylineShape = { ...commonProps, id: `shape_${Date.now()}_f`, type: Tool.POLYLINE, points: [p1, p2, p3, p4, p1] };
                const backFace: PolylineShape = { ...commonProps, id: `shape_${Date.now()}_b`, type: Tool.POLYLINE, points: [p1_, p2_, p3_, p4_, p1_] };
                const line1: LineShape = { ...commonProps, id: `shape_${Date.now()}_l1`, type: Tool.LINE, p1, p2: p1_ };
                const line2: LineShape = { ...commonProps, id: `shape_${Date.now()}_l2`, type: Tool.LINE, p1: p2, p2: p2_ };
                const line3: LineShape = { ...commonProps, id: `shape_${Date.now()}_l3`, type: Tool.LINE, p1: p3, p2: p3_ };
                const line4: LineShape = { ...commonProps, id: `shape_${Date.now()}_l4`, type: Tool.LINE, p1: p4, p2: p4_ };

                newShapes.push(frontFace, backFace, line1, line2, line3, line4);
                setShapesAndHistory([...shapes.filter(s => s.id !== selectedShape.id), ...newShapes]);

            } else {
                console.warn("Extrusion is currently only supported for rectangles.");
            }
        }
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
  }, [addShape, activeLayerId, shapes, selectedShapeIds, deleteShapes, updateShape, updateShapes, history, historyIndex, handleZooAiGenerate, setShapesAndHistory]);
  
  const selectedShapes = shapes.filter(shape => selectedShapeIds.includes(shape.id)) || [];
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
        onToggleZooAiPanel={() => setIsZooAiPanelOpen(true)}
        onSave={handleSave}
        onLoad={handleLoadRequest}
        onZoomExtents={zoomExtents}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 relative bg-gray-900">
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
          />
        </main>
        
        {/* Desktop Sidebar */}
        <aside className="w-64 flex-col bg-gray-800 border-l border-gray-700 hidden md:flex">
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
                    {mobilePanel === 'PROPERTIES' && <PropertiesPanel selectedShapes={selectedShapes} updateShape={updateShape} deleteShapes={deleteShapes} layers={layers} />}
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
        gridVisible={gridVisible}
        setGridVisible={setGridVisible}
      />
      <ZooAiPanel 
        isOpen={isZooAiPanelOpen}
        onClose={() => setIsZooAiPanelOpen(false)}
        onGenerate={handleZooAiGenerate}
        isGenerating={isGenerating}
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
