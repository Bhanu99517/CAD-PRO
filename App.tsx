
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Tool, Shape, Point, Layer, ImageShape, LineShape, CircleShape, RectangleShape, ArcShape, PolylineShape, TextShape, ViewMode, TableShape } from './types';
import Header from './components/Header';
import Canvas from './components/Canvas';
import PropertiesPanel from './components/PropertiesPanel';
import LayersPanel from './LayersPanel';
import CommandLine from './components/CommandLine';
import StatusBar from './components/StatusBar';
import { getShapeCenter } from './utils';
import { GoogleGenAI, FunctionDeclaration, Type, Modality } from '@google/genai';
import ZooAiPanel from './components/ZooAiPanel';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>(Tool.SELECT);
  const [mobilePanel, setMobilePanel] = useState<'PROPERTIES' | 'LAYERS' | 'ZOO_AI' | null>(null);
  const [desktopPanel, setDesktopPanel] = useState<'PROPERTIES_LAYERS' | 'ZOO_AI'>('PROPERTIES_LAYERS');
  const [statusMessage, setStatusMessage] = useState<string>("Ready");

  const defaultLayer: Layer = { id: 'layer_0', name: 'Layer 0', color: '#FFFFFF', visible: true };
  const [layers, setLayers] = useState<Layer[]>([defaultLayer]);
  const [activeLayerId, setActiveLayerId] = useState<string>(defaultLayer.id);

  const [history, setHistory] = useState<Shape[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const shapes = history[historyIndex];
  
  const [clipboard, setClipboard] = useState<Shape[]>([]);

  const [selectedShapeIds, setSelectedShapeIds] = useState<string[]>([]);
  const [coords, setCoords] = useState<Point>({ x: 0, y: 0 });
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [orthoEnabled, setOrthoEnabled] = useState<boolean>(false);
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<ViewMode>('TOP');
  const [theme, setTheme] = useState<'DARK' | 'LIGHT'>('DARK');

  // Dialog States
  const [showCalculator, setShowCalculator] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState("");
  const [calculatorResult, setCalculatorResult] = useState("");

  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiResponseText, setAiResponseText] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1920, h: 1080 });
  
  // Used to trigger cancellations/completions in Canvas
  const [cancelTrigger, setCancelTrigger] = useState(0);
  const [completeTrigger, setCompleteTrigger] = useState(0);

  const setShapesAndHistory = (newShapes: Shape[], fromHistory = false) => {
      const currentShapes = history[historyIndex];
      if (JSON.stringify(newShapes) === JSON.stringify(currentShapes)) {
          return;
      }
      if (fromHistory) {
          setHistory(newShapes as any); 
      } else {
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
          setStatusMessage("Undo performed");
      }
  }, [canUndo]);

  const redo = useCallback(() => {
      if (canRedo) {
          setHistoryIndex(i => i + 1);
          setStatusMessage("Redo performed");
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
        } else if (e.key === 'Escape') {
            e.preventDefault();
            if (activeTool !== Tool.SELECT) {
                setCancelTrigger(c => c + 1);
                setActiveTool(Tool.SELECT);
                setStatusMessage("Command cancelled");
            } else {
                setSelectedShapeIds([]);
            }
        } else if (e.key === 'Enter') {
             e.preventDefault();
             setCompleteTrigger(c => c + 1);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
             if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
                if (selectedShapeIds.length > 0) {
                    deleteShapes(selectedShapeIds);
                    setStatusMessage("Deleted selected objects");
                }
             }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, activeTool, selectedShapeIds]);

  const handleSetActiveTool = (tool: Tool) => {
    setActiveTool(tool);
    setStatusMessage(tool === Tool.SELECT ? "Ready" : `${tool} command active`);
  };

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
      setStatusMessage("Drawing saved successfully");
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
                  if (data && Array.isArray(data.shapes) && Array.isArray(data.layers)) {
                      setLayers(data.layers);
                      setActiveLayerId(data.activeLayerId || data.layers[0]?.id || defaultLayer.id);
                      setShapesAndHistory([data.shapes]);
                      setHistoryIndex(0);
                      setSelectedShapeIds([]);
                      setStatusMessage("Drawing loaded successfully");
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
      if(event.target) event.target.value = '';
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
          const result = e.target?.result as string;
          const imgShape: ImageShape = {
              id: `shape_${Date.now()}`,
              type: Tool.IMAGE,
              x: viewBox.x + viewBox.w * 0.4,
              y: viewBox.y + viewBox.h * 0.4,
              width: 200,
              height: 150,
              href: result,
              layerId: activeLayerId,
              color: '#FFFFFF',
              strokeWidth: 0,
              rotation: 0
          };
          addShape(imgShape);
          setStatusMessage("Image inserted");
      };
      reader.readAsDataURL(file);
      if(event.target) event.target.value = '';
  }
  
  const zoomExtents = useCallback(() => {
    if (shapes.length === 0) {
        setViewBox({ x: 0, y: 0, w: 1920, h: 1080 });
        return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(shape => {
       if ('x' in shape && typeof shape.x === 'number') { minX=Math.min(minX, shape.x); maxX=Math.max(maxX, shape.x+(shape as any).width); minY=Math.min(minY, shape.y); maxY=Math.max(maxY, shape.y+(shape as any).height); }
       else if ('cx' in shape) { minX=Math.min(minX, (shape as any).cx - (shape as any).r); maxX=Math.max(maxX, (shape as any).cx + (shape as any).r); minY=Math.min(minY, (shape as any).cy - (shape as any).r); maxY=Math.max(maxY, (shape as any).cy + (shape as any).r); }
       else if ('p1' in shape) { 
           minX=Math.min(minX, (shape as LineShape).p1.x, (shape as LineShape).p2.x); 
           maxX=Math.max(maxX, (shape as LineShape).p1.x, (shape as LineShape).p2.x); 
           minY=Math.min(minY, (shape as LineShape).p1.y, (shape as LineShape).p2.y); 
           maxY=Math.max(maxY, (shape as LineShape).p1.y, (shape as LineShape).p2.y); 
       }
       else if ('points' in shape) {
            (shape as PolylineShape).points.forEach(p => {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            });
       }
    });
    
    if (!isFinite(minX)) { minX=0; maxX=1920; minY=0; maxY=1080; }
    
    const width = maxX - minX;
    const height = maxY - minY;
    const padding = Math.max(width, height) * 0.1;
    setViewBox({ x: minX - padding, y: minY - padding, w: width + padding * 2, h: height + padding * 2 });
    setStatusMessage("Zoom Extents");
  }, [shapes]);

  const handleMenuAction = (action: string) => {
      switch(action) {
          case 'NEW':
              if (confirm("Start new drawing? Unsaved changes will be lost.")) {
                  setShapesAndHistory([]);
                  setHistoryIndex(0);
                  setStatusMessage("New drawing started");
              }
              break;
          case 'OPEN': handleLoadRequest(); break;
          case 'SAVE': handleSave(); break;
          case 'EXPORT_PNG':
              const svg = document.querySelector('svg');
              if (svg) {
                  const canvas = document.createElement('canvas');
                  const ctx = canvas.getContext('2d');
                  const svgData = new XMLSerializer().serializeToString(svg);
                  const img = new Image();
                  img.onload = () => {
                      canvas.width = svg.clientWidth;
                      canvas.height = svg.clientHeight;
                      if(ctx) {
                          ctx.fillStyle = theme === 'DARK' ? '#000000' : '#ffffff';
                          ctx.fillRect(0, 0, canvas.width, canvas.height);
                          ctx.drawImage(img, 0, 0);
                          const png = canvas.toDataURL("image/png");
                          const a = document.createElement('a');
                          a.href = png;
                          a.download = 'smart-cad-export.png';
                          a.click();
                          setStatusMessage("Exported as PNG");
                      }
                  };
                  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
              }
              break;
          case 'PRINT': window.print(); break;
          case 'UNDO': undo(); break;
          case 'REDO': redo(); break;
          case 'CUT':
              if(selectedShapeIds.length > 0) {
                  const toCut = shapes.filter(s => selectedShapeIds.includes(s.id));
                  setClipboard(toCut);
                  deleteShapes(selectedShapeIds);
                  setStatusMessage(`${toCut.length} objects cut`);
              }
              break;
          case 'COPY':
              if(selectedShapeIds.length > 0) {
                  const toCopy = shapes.filter(s => selectedShapeIds.includes(s.id));
                  setClipboard(toCopy);
                  setStatusMessage(`${toCopy.length} objects copied`);
              }
              break;
          case 'PASTE':
              if(clipboard.length > 0) {
                  const offset = 20;
                  const newShapes = clipboard.map(s => {
                      const copy = JSON.parse(JSON.stringify(s));
                      copy.id = `shape_${Date.now()}_${Math.random()}`;
                      if('x' in copy) { copy.x += offset; copy.y += offset; }
                      if('p1' in copy) { copy.p1.x += offset; copy.p1.y += offset; copy.p2.x += offset; copy.p2.y += offset; }
                      if('cx' in copy) { copy.cx += offset; copy.cy += offset; }
                      if('points' in copy) { copy.points = copy.points.map((p: Point) => ({x: p.x+offset, y: p.y+offset})); }
                      return copy;
                  });
                  setShapesAndHistory([...shapes, ...newShapes]);
                  setStatusMessage("Objects pasted");
              }
              break;
          case 'DELETE':
              if(selectedShapeIds.length > 0) deleteShapes(selectedShapeIds);
              break;
          case 'SELECT_ALL':
              setSelectedShapeIds(shapes.map(s => s.id));
              setStatusMessage("All objects selected");
              break;
          case 'ZOOM_IN':
              setViewBox(v => ({...v, w: v.w * 0.8, h: v.h * 0.8, x: v.x + v.w * 0.1, y: v.y + v.h * 0.1 }));
              break;
          case 'ZOOM_OUT':
              setViewBox(v => ({...v, w: v.w * 1.2, h: v.h * 1.2, x: v.x - v.w * 0.1, y: v.y - v.h * 0.1 }));
              break;
          case 'ZOOM_EXTENTS': zoomExtents(); break;
          case 'PAN': setActiveTool(Tool.PAN); break;
          case 'TOGGLE_GRID': setGridVisible(v => !v); break;
          case 'TOGGLE_SNAP': setSnapEnabled(v => !v); break;
          case 'INSERT_BLOCK': alert("Block insertion simplified: Select objects and copy/paste to replicate."); break;
          case 'INSERT_IMAGE': imageInputRef.current?.click(); break;
          case 'INSERT_TEXT': setActiveTool(Tool.TEXT); break;
          case 'INSERT_TABLE':
              const tX = viewBox.x + viewBox.w * 0.3;
              const tY = viewBox.y + viewBox.h * 0.3;
              const table: TableShape = {
                  id: `shape_${Date.now()}`, type: Tool.TABLE, x: tX, y: tY, width: 200, height: 100, rows: 4, cols: 4,
                  layerId: activeLayerId, color: '#fff', strokeWidth: 1, rotation: 0
              };
              addShape(table);
              setStatusMessage("Table inserted");
              break;
          case 'CONSTRAINT_HORIZONTAL':
              if(selectedShapeIds.length === 1) {
                  const s = shapes.find(sh => sh.id === selectedShapeIds[0]);
                  if(s && s.type === Tool.LINE) {
                      const l = s as LineShape;
                      const midY = (l.p1.y + l.p2.y) / 2;
                      updateShape({...l, p1: {...l.p1, y: midY}, p2: {...l.p2, y: midY}});
                      setStatusMessage("Horizontal constraint applied");
                  }
              }
              break;
          case 'CONSTRAINT_VERTICAL':
              if(selectedShapeIds.length === 1) {
                  const s = shapes.find(sh => sh.id === selectedShapeIds[0]);
                  if(s && s.type === Tool.LINE) {
                      const l = s as LineShape;
                      const midX = (l.p1.x + l.p2.x) / 2;
                      updateShape({...l, p1: {...l.p1, x: midX}, p2: {...l.p2, x: midX}});
                      setStatusMessage("Vertical constraint applied");
                  }
              }
              break;
          case 'CONSTRAINT_LOCK':
               if(selectedShapeIds.length > 0) {
                   const updates = shapes.filter(s => selectedShapeIds.includes(s.id)).map(s => ({...s, locked: !s.locked}));
                   updateShapes(updates);
                   setStatusMessage("Objects Locked/Unlocked");
               }
               break;
          case 'MEASURE_DIST': setActiveTool(Tool.MEASURE_DISTANCE); break;
          case 'MEASURE_ANGLE': setActiveTool(Tool.MEASURE_ANGLE); break;
          case 'MEASURE_AREA': setActiveTool(Tool.MEASURE_AREA); break;
          case 'CALCULATOR': setShowCalculator(true); break;
          case 'OPTIONS': setShowOptions(true); break;
          case 'EXPLODE':
              if(selectedShapeIds.length > 0) {
                 const newShapesList: Shape[] = [];
                 const idsToRemove: string[] = [];
                 shapes.forEach(s => {
                     if (selectedShapeIds.includes(s.id)) {
                         if (s.type === Tool.RECTANGLE) {
                             idsToRemove.push(s.id);
                             const r = s as RectangleShape;
                             const p1 = {x:r.x, y:r.y}; const p2 = {x:r.x+r.width, y:r.y}; 
                             const p3 = {x:r.x+r.width, y:r.y+r.height}; const p4 = {x:r.x, y:r.y+r.height};
                             const base = {layerId: s.layerId, color: s.color, strokeWidth: s.strokeWidth, rotation: 0, type: Tool.LINE} as any;
                             newShapesList.push({...base, id: s.id+'_1', p1, p2}, {...base, id: s.id+'_2', p1: p2, p2: p3}, {...base, id: s.id+'_3', p1: p3, p2: p4}, {...base, id: s.id+'_4', p1: p4, p2: p1});
                         }
                     }
                 });
                 if(idsToRemove.length > 0) {
                     const remaining = shapes.filter(s => !idsToRemove.includes(s.id));
                     setShapesAndHistory([...remaining, ...newShapesList]);
                     setStatusMessage("Exploded objects");
                 }
              }
              break;
          case 'HELP': setShowHelp(true); break;
          case 'ABOUT': setShowAbout(true); break;
          case 'THEME': setTheme(prev => prev === 'DARK' ? 'LIGHT' : 'DARK'); break;
          default: 
              // Check if action maps to a Tool enum
              if (Tool[action as keyof typeof Tool]) {
                  setActiveTool(Tool[action as keyof typeof Tool]);
              }
              break;
      }
  };

  const calculateResult = () => {
      try {
          // eslint-disable-next-line no-eval
          setCalculatorResult(eval(calculatorInput).toString());
      } catch (e) {
          setCalculatorResult("Error");
      }
  }

  const selectedShapes = shapes.filter(shape => selectedShapeIds.includes(shape.id)) || [];
  const activeLayer = layers.find(l => l.id === activeLayerId) || defaultLayer;
  
  const handleCommand = useCallback(async (command: string) => {
      const cmd = command.trim().toUpperCase();
      
      // Command Aliases
      const aliases: Record<string, Tool> = {
          'L': Tool.LINE, 'LINE': Tool.LINE,
          'C': Tool.CIRCLE, 'CIRCLE': Tool.CIRCLE,
          'R': Tool.RECTANGLE, 'REC': Tool.RECTANGLE, 'RECTANGLE': Tool.RECTANGLE,
          'PL': Tool.POLYLINE, 'POLYLINE': Tool.POLYLINE,
          'A': Tool.ARC, 'ARC': Tool.ARC,
          'E': Tool.ERASE, 'ERASE': Tool.ERASE,
          'M': Tool.MOVE, 'MOVE': Tool.MOVE,
          'CO': Tool.COPY, 'CP': Tool.COPY, 'COPY': Tool.COPY,
          'Z': Tool.PAN, // Simplified
          'T': Tool.TEXT, 'TEXT': Tool.TEXT,
          'DI': Tool.MEASURE_DISTANCE, 'DIST': Tool.MEASURE_DISTANCE,
          'PO': Tool.POLYGON, 'POLYGON': Tool.POLYGON,
          'EL': Tool.ELLIPSE, 'ELLIPSE': Tool.ELLIPSE
      };
      
      if (aliases[cmd]) {
          handleSetActiveTool(aliases[cmd]);
          return;
      }
      
      if (cmd === 'ZOOM EXTENTS' || cmd === 'Z E') {
          zoomExtents();
          return;
      }
      if (cmd === 'GRID ON') { setGridVisible(true); return; }
      if (cmd === 'GRID OFF') { setGridVisible(false); return; }
      if (cmd === 'SNAP ON') { setSnapEnabled(true); return; }
      if (cmd === 'SNAP OFF') { setSnapEnabled(false); return; }

      // Fallback to AI if no standard command
      setIsAiProcessing(true);
      setTimeout(() => {
           setIsAiProcessing(false);
           setAiResponseText("AI Command feature placeholder.");
      }, 500);
  }, [zoomExtents]);

  const handleSetLimits = useCallback((p1: Point, p2: Point) => {
      const w = Math.abs(p2.x - p1.x);
      const h = Math.abs(p2.y - p1.y);
      setViewBox({ x: Math.min(p1.x, p2.x), y: Math.min(p1.y, p2.y), w, h });
      setStatusMessage(`Limits set to ${w}x${h}`);
  }, []);

  return (
    <div className={`flex flex-col h-screen w-screen font-sans overflow-hidden ${theme === 'DARK' ? 'bg-[#1c1c1c] text-white' : 'bg-gray-100 text-black'}`}>
      <Header 
        activeTool={activeTool} 
        setActiveTool={handleSetActiveTool} 
        onMenuAction={handleMenuAction}
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
        theme={theme}
      />
      <div className="flex flex-1 overflow-hidden">
        <main className={`flex-1 relative border-t border-l ${theme === 'DARK' ? 'bg-[#101010] border-gray-700' : 'bg-white border-gray-300'}`}>
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
            setActiveTool={handleSetActiveTool}
            theme={theme}
            setStatusMessage={setStatusMessage}
            cancelTrigger={cancelTrigger}
            completeTrigger={completeTrigger}
          />
        </main>
        
        <aside className={`w-64 flex-col border-l hidden md:flex ${theme === 'DARK' ? 'bg-[#2b2b2b] border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
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
      </div>
      <CommandLine 
        handleCommand={handleCommand}
        isAiProcessing={isAiProcessing}
        setActiveTool={handleSetActiveTool}
        onSetLimits={handleSetLimits}
      />
      <StatusBar 
        coords={coords} 
        snapEnabled={snapEnabled} 
        setSnapEnabled={setSnapEnabled}
        orthoEnabled={orthoEnabled}
        setOrthoEnabled={setOrthoEnabled}
        gridVisible={gridVisible}
        setGridVisible={setGridVisible}
        statusMessage={statusMessage}
        theme={theme}
      />
      
      {/* Hidden Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileLoad} accept=".json" className="hidden" />
      <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />

      {/* Modals */}
      {showCalculator && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-gray-800 p-4 rounded shadow-lg w-64">
                  <h3 className="text-white mb-2 font-bold">Calculator</h3>
                  <input className="w-full mb-2 p-1 text-black" value={calculatorInput} onChange={e => setCalculatorInput(e.target.value)} placeholder="e.g. 50+25" />
                  <button onClick={calculateResult} className="bg-blue-600 text-white px-4 py-1 rounded w-full mb-2">Calculate</button>
                  <div className="text-right text-white text-xl font-mono bg-gray-900 p-1">{calculatorResult}</div>
                  <button onClick={() => setShowCalculator(false)} className="mt-4 text-gray-400 text-xs hover:text-white">Close</button>
              </div>
          </div>
      )}

      {showHelp && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-gray-800 p-6 rounded shadow-lg max-w-md text-white">
                  <h2 className="text-xl font-bold mb-4">Help & Shortcuts</h2>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                      <li><strong>L</strong>: Line Tool</li>
                      <li><strong>R</strong>: Rectangle Tool</li>
                      <li><strong>C</strong>: Circle Tool</li>
                      <li><strong>Delete</strong>: Delete Selected</li>
                      <li><strong>Ctrl+Z</strong>: Undo</li>
                      <li><strong>Ctrl+Y</strong>: Redo</li>
                      <li><strong>Esc</strong>: Cancel Command / Deselect</li>
                      <li><strong>Enter</strong>: Finish Polyline</li>
                      <li><strong>Scroll</strong>: Zoom</li>
                      <li><strong>Middle Drag</strong>: Pan</li>
                  </ul>
                  <button onClick={() => setShowHelp(false)} className="mt-6 bg-gray-700 px-4 py-2 rounded">Close</button>
              </div>
          </div>
      )}

      {showAbout && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
               <div className="bg-gray-800 p-6 rounded shadow-lg text-white text-center">
                   <h2 className="text-2xl font-bold mb-2">SmartCAD AI</h2>
                   <p className="text-gray-400">Version 2.0</p>
                   <p className="text-gray-500 text-xs mt-4">Built with React, TypeScript, and Gemini AI</p>
                   <button onClick={() => setShowAbout(false)} className="mt-6 bg-blue-600 px-4 py-2 rounded">OK</button>
               </div>
           </div>
      )}
      
      {showOptions && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
              <div className="bg-gray-800 p-6 rounded shadow-lg w-80 text-white">
                  <h2 className="text-xl font-bold mb-4">Options</h2>
                  <div className="mb-4">
                      <label className="block text-sm text-gray-400 mb-1">Units</label>
                      <select className="w-full bg-gray-700 border border-gray-600 rounded p-1">
                          <option>Millimeters</option>
                          <option>Inches</option>
                          <option>Meters</option>
                      </select>
                  </div>
                  <div className="mb-4">
                      <label className="block text-sm text-gray-400 mb-1">Grid Spacing</label>
                      <input type="number" defaultValue="10" className="w-full bg-gray-700 border border-gray-600 rounded p-1" />
                  </div>
                  <button onClick={() => setShowOptions(false)} className="mt-2 bg-blue-600 px-4 py-2 rounded w-full">Save</button>
              </div>
          </div>
      )}

    </div>
  );
};

export default App;
