
import React, { useState, useRef, MouseEvent, useEffect } from 'react';
import { Tool, Shape, Point, LineShape, RectangleShape, CircleShape, PolylineShape, Layer, ImageShape, ArcShape, TextShape, ViewMode, EllipseShape, PolygonShape, TableShape, DimensionShape } from '../types';
import { getShapeCenter, polarToCartesian, getShapeBoundingBox, doBBoxesIntersect, generatePolygonPoints, calculatePolygonArea, getDistance } from '../utils';

interface CanvasProps {
  activeTool: Tool;
  shapes: Shape[];
  addShape: (shape: Shape) => void;
  updateShape: (shape: Shape) => void;
  updateShapes: (shapes: Shape[]) => void;
  deleteShapes: (ids: string[]) => void;
  selectedShapeIds: string[];
  setSelectedShapeIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  activeLayer: Layer;
  layers: Layer[];
  setCoords: (point: Point) => void;
  coords: Point;
  snapEnabled: boolean;
  orthoEnabled: boolean;
  extrudeShape: (shapeId: string, newShapes: Shape[]) => void;
  viewBox: { x: number; y: number; w: number; h: number };
  setViewBox: (viewBox: { x: number; y: number; w: number; h: number }) => void;
  gridVisible: boolean;
  viewMode: ViewMode;
  setActiveTool: (tool: Tool) => void;
  theme: 'DARK' | 'LIGHT';
  setStatusMessage: (msg: string) => void;
  cancelTrigger: number;
  completeTrigger: number;
}

const getInitialMousePos = (svg: SVGSVGElement, e: MouseEvent): Point => {
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const inverseCTM = svg.getScreenCTM()?.inverse();
    if (inverseCTM) {
        return pt.matrixTransform(inverseCTM);
    }
    return { x: 0, y: 0 };
};

const Canvas: React.FC<CanvasProps> = ({
  activeTool, shapes, addShape, updateShape, updateShapes, deleteShapes, selectedShapeIds, setSelectedShapeIds,
  activeLayer, layers, setCoords, snapEnabled, orthoEnabled, extrudeShape, coords, viewBox, setViewBox, gridVisible, viewMode, setActiveTool, theme, setStatusMessage,
  cancelTrigger, completeTrigger
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Interaction State
  const [clickPoints, setClickPoints] = useState<Point[]>([]);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ start: Point, end: Point } | null>(null);
  
  // Effect to handle Cancellation (Escape key)
  useEffect(() => {
      setClickPoints([]);
      setCurrentShape(null);
      setSelectionRect(null);
      setIsPanning(false);
  }, [cancelTrigger, activeTool]);

  // Effect to handle Completion (Enter key for Polyline)
  useEffect(() => {
      if (activeTool === Tool.POLYLINE || activeTool === Tool.POLYGON) {
          if (currentShape && clickPoints.length > 1) {
              addShape(currentShape);
              setClickPoints([]);
              setCurrentShape(null);
              setStatusMessage("Polyline completed");
          }
      }
  }, [completeTrigger]);

  const getMousePos = (e: MouseEvent<SVGSVGElement>): Point => {
      if (!svgRef.current) return { x: 0, y: 0 };
      return getInitialMousePos(svgRef.current, e);
  };

  const getSnapPoint = (mousePos: Point): Point => {
    if (!snapEnabled || !svgRef.current) return mousePos;
    
    // Grid Snap
    const gridSize = 10;
    const gridSnap = { x: Math.round(mousePos.x / gridSize) * gridSize, y: Math.round(mousePos.y / gridSize) * gridSize };
    let bestPoint = gridSnap;
    let minDist = (mousePos.x - gridSnap.x)**2 + (mousePos.y - gridSnap.y)**2;
    
    // Object Snap (Endpoints, Centers)
    // Calculate threshold based on current zoom level to keep pixel-distance constant
    const snapThreshold = (viewBox.w / 1920) * 15; 
    const snapThresholdSq = snapThreshold * snapThreshold;
    
    const check = (p: Point) => {
        const d = (mousePos.x - p.x)**2 + (mousePos.y - p.y)**2;
        if (d < minDist && d < snapThresholdSq) {
            minDist = d;
            bestPoint = p;
        }
    };
    
    // Only snap to existing shapes, not the current one being drawn
    shapes.forEach(s => {
        if (s.type === Tool.LINE) { check(s.p1); check(s.p2); }
        if (s.type === Tool.RECTANGLE) { check({x:s.x, y:s.y}); check({x:s.x+s.width, y:s.y}); check({x:s.x+s.width, y:s.y+s.height}); check({x:s.x, y:s.y+s.height}); }
        if (s.type === Tool.CIRCLE) { check({x:s.cx, y:s.cy}); }
        if (s.type === Tool.POLYLINE || s.type === Tool.POLYGON) { s.points.forEach(check); }
    });

    return bestPoint;
  };

  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    // Middle Mouse Button Pan
    if (e.button === 1) {
        setIsPanning(true);
        setPanStart(getInitialMousePos(svgRef.current!, e));
        e.preventDefault();
        return;
    }

    let pos = getMousePos(e);
    const snapped = getSnapPoint(pos);
    pos = snapped;

    // Selection Tool
    if (activeTool === Tool.SELECT) {
        const targetId = (e.target as SVGElement).id;
        // Check if we clicked a shape (and not the SVG background)
        if (targetId && targetId.startsWith('shape_')) {
             if (e.ctrlKey || e.metaKey) {
                 setSelectedShapeIds(prev => prev.includes(targetId) ? prev.filter(i => i !== targetId) : [...prev, targetId]);
             } else {
                 setSelectedShapeIds([targetId]);
             }
        } else {
            // Start selection rectangle
            setSelectionRect({ start: pos, end: pos });
            if (!e.ctrlKey && !e.metaKey) setSelectedShapeIds([]);
        }
        return;
    }
    
    if (activeTool === Tool.PAN) {
        setIsPanning(true);
        setPanStart(getInitialMousePos(svgRef.current!, e));
        return;
    }
    
    // Drawing Tools Logic (Click-Move-Click)
    
    // Single Click Tools (Place Point/Text)
    if (activeTool === Tool.TEXT) {
        const content = prompt("Enter Text:");
        if (content) {
            addShape({
                id: `shape_${Date.now()}`, type: Tool.TEXT, x: pos.x, y: pos.y, content, fontSize: 20,
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 1, rotation: 0
            });
        }
        setActiveTool(Tool.SELECT);
        return;
    }

    // Multi-Step Tools
    const newPoints = [...clickPoints, pos];
    setClickPoints(newPoints);

    if (activeTool === Tool.LINE) {
        if (newPoints.length === 1) {
            // Start Line
            setCurrentShape({
                id: 'temp', type: Tool.LINE, p1: pos, p2: pos,
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0
            });
            setStatusMessage("Specify next point:");
        } else if (newPoints.length === 2) {
            // Finish Line Segment
            addShape({
                id: `shape_${Date.now()}`, type: Tool.LINE, p1: newPoints[0], p2: newPoints[1],
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0
            });
            // Continue line strip: Set start point to previous end point
            setClickPoints([newPoints[1]]); 
            setCurrentShape({
                id: 'temp', type: Tool.LINE, p1: newPoints[1], p2: newPoints[1],
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0
            });
            setStatusMessage("Specify next point:");
        }
    } else if (activeTool === Tool.RECTANGLE) {
        if (newPoints.length === 1) {
             setCurrentShape({
                id: 'temp', type: Tool.RECTANGLE, x: pos.x, y: pos.y, width: 0, height: 0,
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0
            });
            setStatusMessage("Specify other corner:");
        } else {
             if (currentShape) {
                addShape(currentShape);
             }
             setClickPoints([]);
             setCurrentShape(null);
             setStatusMessage("Rectangle created");
        }
    } else if (activeTool === Tool.CIRCLE) {
        if (newPoints.length === 1) {
            setCurrentShape({
                id: 'temp', type: Tool.CIRCLE, cx: pos.x, cy: pos.y, r: 0,
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0
            });
             setStatusMessage("Specify radius:");
        } else {
            if (currentShape) {
                addShape(currentShape);
            }
            setClickPoints([]);
            setCurrentShape(null);
            setStatusMessage("Circle created");
        }
    } else if (activeTool === Tool.ELLIPSE) {
         if (newPoints.length === 1) {
            setCurrentShape({
                id: 'temp', type: Tool.ELLIPSE, cx: pos.x, cy: pos.y, rx: 0, ry: 0,
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0
            });
            setStatusMessage("Specify axis end point:");
         } else {
            if (currentShape) addShape(currentShape);
            setClickPoints([]);
            setCurrentShape(null);
         }
    } else if (activeTool === Tool.POLYLINE) {
        if (newPoints.length === 1) {
            setCurrentShape({
                id: 'temp', type: Tool.POLYLINE, points: [pos, pos],
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0
            });
            setStatusMessage("Specify next point (Enter to finish):");
        } else {
            // Add point to polyline
            const poly = currentShape as PolylineShape;
            // Use previous set of points plus new one
            const updatedPoints = [...poly.points, pos];
            setCurrentShape({ ...poly, points: updatedPoints });
            setStatusMessage("Specify next point (Enter to finish):");
        }
    } else if (activeTool === Tool.POLYGON) {
        if (newPoints.length === 1) {
            setCurrentShape({
                id: 'temp', type: Tool.POLYGON, points: [], sides: 5,
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0
            });
             setStatusMessage("Specify radius:");
        } else {
             if (currentShape) addShape(currentShape);
             setClickPoints([]);
             setCurrentShape(null);
        }
    } else if (activeTool === Tool.MEASURE_DISTANCE) {
         if (newPoints.length === 2) {
             const d = getDistance(newPoints[0], newPoints[1]);
             setStatusMessage(`Distance: ${d.toFixed(2)}`);
             setClickPoints([]);
         } else {
             setStatusMessage("Specify second point:");
         }
    }
  };

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    let pos = getMousePos(e);
    setCoords(pos);
    
    // Only snap if we are drawing or selecting
    const snapped = getSnapPoint(pos);
    pos = snapped;

    if (isPanning && panStart) {
        const currentPanPos = getInitialMousePos(svgRef.current, e);
        setViewBox({ ...viewBox, x: viewBox.x - (currentPanPos.x - panStart.x), y: viewBox.y - (currentPanPos.y - panStart.y) });
        return;
    }

    if (selectionRect) {
        setSelectionRect({ ...selectionRect, end: pos });
        return;
    }

    // Rubber Banding / Preview
    if (clickPoints.length > 0 && currentShape) {
        // For Polyline, start is the last committed point
        const start = clickPoints[clickPoints.length - 1];

        // Only apply ortho for LINE and POLYLINE segments
        if (orthoEnabled && (activeTool === Tool.LINE || activeTool === Tool.POLYLINE)) {
             const dx = Math.abs(pos.x - start.x);
             const dy = Math.abs(pos.y - start.y);
             if (dx > dy) pos.y = start.y; else pos.x = start.x;
        }

        let updated = { ...currentShape } as any;

        if (activeTool === Tool.LINE) {
            updated.p2 = pos;
        } else if (activeTool === Tool.RECTANGLE) {
            // Rectangle starts from clickPoints[0], not necessarily 'start' if we had multiple points logic
            const rectStart = clickPoints[0]; 
            const minX = Math.min(rectStart.x, pos.x);
            const minY = Math.min(rectStart.y, pos.y);
            updated.x = minX;
            updated.y = minY;
            updated.width = Math.abs(pos.x - rectStart.x);
            updated.height = Math.abs(pos.y - rectStart.y);
        } else if (activeTool === Tool.CIRCLE) {
            updated.r = getDistance(clickPoints[0], pos);
        } else if (activeTool === Tool.ELLIPSE) {
            updated.rx = Math.abs(pos.x - clickPoints[0].x);
            updated.ry = Math.abs(pos.y - clickPoints[0].y);
        } else if (activeTool === Tool.POLYLINE) {
            // Update the last point in the array to be the current mouse position
            const pts = [...(currentShape as PolylineShape).points];
            pts[pts.length - 1] = pos;
            updated.points = pts;
        } else if (activeTool === Tool.POLYGON) {
            const r = getDistance(clickPoints[0], pos);
            updated.points = generatePolygonPoints(clickPoints[0].x, clickPoints[0].y, r, 5);
        }
        
        setCurrentShape(updated);
    }
  };

  const handleMouseUp = (e: MouseEvent<SVGSVGElement>) => {
    if (isPanning) {
        setIsPanning(false);
        setPanStart(null);
    }
    if (selectionRect) {
        // Perform selection intersection logic
        const b1 = { minX: Math.min(selectionRect.start.x, selectionRect.end.x), minY: Math.min(selectionRect.start.y, selectionRect.end.y), maxX: Math.max(selectionRect.start.x, selectionRect.end.x), maxY: Math.max(selectionRect.start.y, selectionRect.end.y) };
        const hits = shapes.filter(s => {
            const b2 = getShapeBoundingBox(s);
            return doBBoxesIntersect(b1, b2);
        }).map(s => s.id);
        
        if (e.ctrlKey || e.metaKey) {
             setSelectedShapeIds(prev => [...new Set([...prev, ...hits])]);
        } else {
             setSelectedShapeIds(hits);
        }
        setSelectionRect(null);
    }
  };
  
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const zoomSpeed = 0.1;
      const zoomFactor = e.deltaY > 0 ? 1 + zoomSpeed : 1 - zoomSpeed;
      
      // Zoom towards mouse position
      const pt = getInitialMousePos(svgRef.current!, e as any);
      
      const newW = viewBox.w * zoomFactor;
      const newH = viewBox.h * zoomFactor;
      const newX = pt.x - (pt.x - viewBox.x) * zoomFactor;
      const newY = pt.y - (pt.y - viewBox.y) * zoomFactor;
      
      setViewBox({ x: newX, y: newY, w: newW, h: newH });
  };

  const renderShape = (shape: Shape) => {
      const isSel = selectedShapeIds.includes(shape.id);
      const strokeColor = isSel ? '#3b82f6' : shape.color;
      const strokeWidth = shape.strokeWidth + (isSel ? 1 : 0);
      const common = { stroke: strokeColor, strokeWidth: strokeWidth, fill: shape.fill || 'none', vectorEffect: 'non-scaling-stroke' };

      if (shape.type === Tool.LINE) return <line key={shape.id} id={shape.id} x1={shape.p1.x} y1={shape.p1.y} x2={shape.p2.x} y2={shape.p2.y} {...common} />;
      if (shape.type === Tool.RECTANGLE) return <rect key={shape.id} id={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} ry={shape.ry} {...common} />;
      if (shape.type === Tool.CIRCLE) return <circle key={shape.id} id={shape.id} cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
      if (shape.type === Tool.ELLIPSE) return <ellipse key={shape.id} id={shape.id} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />;
      if (shape.type === Tool.POLYLINE || shape.type === Tool.POLYGON || shape.type === Tool.FREEHAND) return <polyline key={shape.id} id={shape.id} points={shape.points.map(p => `${p.x},${p.y}`).join(' ')} {...common} />;
      if (shape.type === Tool.TEXT) return <text key={shape.id} id={shape.id} x={shape.x} y={shape.y} fontSize={shape.fontSize} fill={shape.color} stroke="none">{shape.content}</text>;
      if (shape.type === Tool.TABLE) {
          const cellW = shape.width / shape.cols;
          const cellH = shape.height / shape.rows;
          const gridLines = [];
          for(let i=0; i<=shape.rows; i++) gridLines.push(<line key={`r${i}`} x1={shape.x} y1={shape.y + i*cellH} x2={shape.x + shape.width} y2={shape.y + i*cellH} stroke={shape.color} strokeWidth={1} vectorEffect="non-scaling-stroke"/>);
          for(let i=0; i<=shape.cols; i++) gridLines.push(<line key={`c${i}`} x1={shape.x + i*cellW} y1={shape.y} x2={shape.x + i*cellW} y2={shape.y + shape.height} stroke={shape.color} strokeWidth={1} vectorEffect="non-scaling-stroke"/>);
          return <g key={shape.id} id={shape.id}>{gridLines}</g>;
      }
      if (shape.type === Tool.IMAGE) return <image key={shape.id} id={shape.id} href={shape.href} x={shape.x} y={shape.y} width={shape.width} height={shape.height} />;
      return null;
  }

  // Dynamic Input Rendering logic (Show dimensions while drawing)
  const renderDynamicInput = () => {
      if (clickPoints.length === 0 || !currentShape) return null;
      
      const start = clickPoints[clickPoints.length - 1];
      let text = "";
      
      // Use the same ortho logic as handleMouseMove to ensure consistency
      let pos = { ...coords };
      if (orthoEnabled && (activeTool === Tool.LINE || activeTool === Tool.POLYLINE)) {
         const dx = Math.abs(pos.x - start.x);
         const dy = Math.abs(pos.y - start.y);
         if (dx > dy) pos.y = start.y; else pos.x = start.x;
      }

      if (activeTool === Tool.LINE || activeTool === Tool.POLYLINE) {
          const d = getDistance(start, pos);
          let angle = Math.atan2(pos.y - start.y, pos.x - start.x) * 180 / Math.PI;
          if (angle < 0) angle += 360;
          text = `L: ${d.toFixed(2)}  ∠ ${angle.toFixed(0)}°`;
      } else if (activeTool === Tool.RECTANGLE) {
          const w = Math.abs(pos.x - clickPoints[0].x);
          const h = Math.abs(pos.y - clickPoints[0].y);
          text = `W: ${w.toFixed(2)}  H: ${h.toFixed(2)}`;
      } else if (activeTool === Tool.CIRCLE || activeTool === Tool.POLYGON) {
          const r = getDistance(clickPoints[0], pos);
          text = `R: ${r.toFixed(2)}`;
      } else if (activeTool === Tool.ELLIPSE) {
          const rx = Math.abs(pos.x - clickPoints[0].x);
          const ry = Math.abs(pos.y - clickPoints[0].y);
          text = `RX: ${rx.toFixed(2)}  RY: ${ry.toFixed(2)}`;
      }
      
      if (!text) return null;
      
      // Scale font size relative to view to keep it readable but not enormous when zoomed
      const fontSize = Math.max(12, viewBox.w / 60);
      const padding = fontSize * 0.6;
      const charWidth = fontSize * 0.6;
      const width = text.length * charWidth + padding * 2;
      
      return (
          <g transform={`translate(${coords.x + fontSize}, ${coords.y - fontSize})`}>
              <rect 
                  x={0} 
                  y={-fontSize} 
                  width={width} 
                  height={fontSize * 1.5} 
                  fill={theme === 'DARK' ? "#222" : "#fff"} 
                  stroke={theme === 'DARK' ? "#666" : "#ccc"} 
                  strokeWidth={viewBox.w/1500} 
                  rx={4}
                  fillOpacity={0.9}
              />
              <text 
                  x={padding} 
                  y={0} 
                  fill={theme === 'DARK' ? "#eee" : "#333"} 
                  fontSize={fontSize} 
                  fontFamily="monospace"
                  dominantBaseline="auto"
              >
                  {text}
              </text>
          </g>
      );
  };

  return (
    <div className={`h-full w-full ${theme === 'DARK' ? 'bg-black' : 'bg-white'} cursor-crosshair`}>
      <svg 
        ref={svgRef} 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} 
        className="w-full h-full block touch-none"
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
            {/* Improved Grid System with explicit lines for better visibility */}
            <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke={theme === 'DARK' ? '#333' : '#e5e5e5'} strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
            </pattern>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="url(#smallGrid)"/>
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke={theme === 'DARK' ? '#555' : '#d4d4d4'} strokeWidth="1" vectorEffect="non-scaling-stroke"/>
            </pattern>
        </defs>
        
        {/* Infinite Grid Layer */}
        {gridVisible && (
            <rect 
                x={viewBox.x - viewBox.w} 
                y={viewBox.y - viewBox.h} 
                width={viewBox.w * 3} 
                height={viewBox.h * 3} 
                fill="url(#grid)" 
                pointerEvents="none" 
            />
        )}
        
        {/* Drawing Layer */}
        {shapes.map(renderShape)}
        {currentShape && renderShape(currentShape)}
        
        {/* UI / Selection Layer */}
        {selectionRect && (
            <rect 
                x={Math.min(selectionRect.start.x, selectionRect.end.x)} 
                y={Math.min(selectionRect.start.y, selectionRect.end.y)} 
                width={Math.abs(selectionRect.end.x - selectionRect.start.x)} 
                height={Math.abs(selectionRect.end.y - selectionRect.start.y)} 
                fill="rgba(59, 130, 246, 0.2)" 
                stroke="#3b82f6" 
                strokeWidth={1 / (1920/viewBox.w)} // Keep stroke constant on screen
                vectorEffect="non-scaling-stroke"
            />
        )}
        
        {/* Measure Points */}
        {activeTool === Tool.MEASURE_DISTANCE && clickPoints.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={3} fill="red" stroke="white" strokeWidth={1} />
        ))}
        
        {/* Dynamic Input (Dimensions) */}
        {renderDynamicInput()}
      </svg>
    </div>
  );
};

export default Canvas;
