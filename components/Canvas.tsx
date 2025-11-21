
import React, { useState, useRef, MouseEvent, useEffect } from 'react';
import { Tool, Shape, Point, LineShape, RectangleShape, CircleShape, PolylineShape, Layer, ImageShape, ArcShape, TextShape, ViewMode, EllipseShape, PolygonShape, TableShape, DimensionShape } from '../types';
import { getShapeCenter, polarToCartesian, getShapeBoundingBox, doBBoxesIntersect, generatePolygonPoints, calculatePolygonArea, getDistance, calculateArcFrom3Points, rotatePoint, scalePoint, mirrorPoint, getAngle, getLineIntersection, getSegmentIntersection, projectPointToSegment } from '../utils';

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

const getInitialMousePos = (svg: SVGSVGElement, e: MouseEvent | React.MouseEvent): Point => {
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
  const [toolStep, setToolStep] = useState(0);
  const [tempPoint, setTempPoint] = useState<Point | null>(null); // Base point
  const [dragGrip, setDragGrip] = useState<{shapeId: string, index: number, type: string} | null>(null);
  
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<Point | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ start: Point, end: Point } | null>(null);
  const [isDraggingFreehand, setIsDraggingFreehand] = useState(false);

  const resetTool = () => {
      setClickPoints([]);
      setCurrentShape(null);
      setToolStep(0);
      setTempPoint(null);
      setIsDraggingFreehand(false);
      setDragGrip(null);
  };

  // Effect to handle Cancellation
  useEffect(() => {
      resetTool();
      setSelectionRect(null);
      setIsPanning(false);
  }, [cancelTrigger, activeTool]);

  // Effect to handle Completion (Enter key)
  useEffect(() => {
      if ((activeTool === Tool.POLYLINE || activeTool === Tool.POLYGON || activeTool === Tool.FREEHAND) && currentShape) {
          addShape(currentShape);
          resetTool();
          setStatusMessage("Shape completed");
      } else if (activeTool === Tool.TRIM || activeTool === Tool.EXTEND) {
           resetTool();
           setActiveTool(Tool.SELECT);
           setStatusMessage("Finished");
      }
  }, [completeTrigger]);

  const getMousePos = (e: MouseEvent<SVGSVGElement>): Point => {
      if (!svgRef.current) return { x: 0, y: 0 };
      return getInitialMousePos(svgRef.current, e);
  };

  const getSnapPoint = (mousePos: Point): Point => {
    if (!snapEnabled || !svgRef.current) return mousePos;
    const gridSize = 10;
    let bestPoint = { x: Math.round(mousePos.x / gridSize) * gridSize, y: Math.round(mousePos.y / gridSize) * gridSize };
    let minDist = (mousePos.x - bestPoint.x)**2 + (mousePos.y - bestPoint.y)**2;
    
    const snapThreshold = (viewBox.w / 1920) * 20; 
    const snapThresholdSq = snapThreshold * snapThreshold;
    
    const check = (p: Point) => {
        const d = (mousePos.x - p.x)**2 + (mousePos.y - p.y)**2;
        if (d < minDist && d < snapThresholdSq) {
            minDist = d;
            bestPoint = p;
        }
    };
    
    shapes.forEach(s => {
        if(!s.visible && s.layerId !== activeLayer.id) return; // Only snap to visible
        if (s.type === Tool.LINE) { check(s.p1); check(s.p2); check({x:(s.p1.x+s.p2.x)/2, y:(s.p1.y+s.p2.y)/2}); }
        else if (s.type === Tool.RECTANGLE) { check({x:s.x, y:s.y}); check({x:s.x+s.width, y:s.y}); check({x:s.x+s.width, y:s.y+s.height}); check({x:s.x, y:s.y+s.height}); }
        else if (s.type === Tool.CIRCLE || s.type === Tool.ELLIPSE) { check({x:s.cx, y:s.cy}); check({x:s.cx+s.r, y:s.cy}); check({x:s.cx, y:s.cy+s.r}); }
        else if (s.type === Tool.POLYLINE || s.type === Tool.POLYGON || s.type === Tool.FREEHAND) { s.points.forEach(check); }
        else if (s.type === Tool.ARC) { check(polarToCartesian(s.cx, s.cy, s.r, s.startAngle)); check(polarToCartesian(s.cx, s.cy, s.r, s.endAngle)); }
    });
    return bestPoint;
  };

  const applyOrtho = (p1: Point, p2: Point): Point => {
      if (!orthoEnabled) return p2;
      const dx = Math.abs(p2.x - p1.x);
      const dy = Math.abs(p2.y - p1.y);
      return dx > dy ? { x: p2.x, y: p1.y } : { x: p1.x, y: p2.y };
  };

  // GRIP LOGIC
  const handleGripDown = (e: MouseEvent, shapeId: string, index: number, type: string) => {
      e.stopPropagation();
      setDragGrip({ shapeId, index, type });
      setStatusMessage("Stretch point");
  };

  const updateGrip = (pos: Point) => {
      if (!dragGrip) return;
      const shape = shapes.find(s => s.id === dragGrip.shapeId);
      if (!shape) return;
      
      let updated = { ...shape };
      
      if (shape.type === Tool.LINE) {
          const l = updated as LineShape;
          if (dragGrip.index === 0) l.p1 = pos; // Start
          else if (dragGrip.index === 1) l.p2 = pos; // End
          else { // Mid - Move Line
             const dx = pos.x - (l.p1.x + l.p2.x)/2;
             const dy = pos.y - (l.p1.y + l.p2.y)/2;
             l.p1 = {x: l.p1.x+dx, y: l.p1.y+dy};
             l.p2 = {x: l.p2.x+dx, y: l.p2.y+dy};
          }
      } else if (shape.type === Tool.CIRCLE) {
          const c = updated as CircleShape;
          if (dragGrip.index === 0) { c.cx = pos.x; c.cy = pos.y; } // Center
          else { c.r = getDistance({x:c.cx, y:c.cy}, pos); } // Radius
      } else if (shape.type === Tool.RECTANGLE) {
          const r = updated as RectangleShape;
          // 0:TL, 1:TR, 2:BL, 3:BR
          if (dragGrip.index === 0) { const dx = pos.x - r.x; const dy = pos.y - r.y; r.x = pos.x; r.y = pos.y; r.width -= dx; r.height -= dy; }
          else if (dragGrip.index === 1) { const dy = pos.y - r.y; r.y = pos.y; r.width = pos.x - r.x; r.height -= dy; }
          else if (dragGrip.index === 2) { const dx = pos.x - r.x; r.x = pos.x; r.width -= dx; r.height = pos.y - r.y; }
          else if (dragGrip.index === 3) { r.width = pos.x - r.x; r.height = pos.y - r.y; }
          if(r.width < 0) { r.x += r.width; r.width *= -1; } // Handle Flip
          if(r.height < 0) { r.y += r.height; r.height *= -1; }
      } else if (shape.type === Tool.POLYLINE || shape.type === Tool.POLYGON) {
          const p = updated as PolylineShape;
          if (dragGrip.index < p.points.length) {
              p.points[dragGrip.index] = pos;
          }
      }
      updateShape(updated);
  };

  const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (activeTool === Tool.POLYLINE && currentShape) {
           addShape(currentShape);
           resetTool();
           setStatusMessage("Polyline finished");
      } else {
           // Generic finish/cancel
           resetTool();
           setActiveTool(Tool.SELECT);
      }
  };

  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (e.button === 2) { return; } // Right handled by ContextMenu
    if (e.button === 1) { setIsPanning(true); setPanStart(getInitialMousePos(svgRef.current!, e)); e.preventDefault(); return; }
    
    let pos = getMousePos(e);
    pos = getSnapPoint(pos);
    
    if (dragGrip) return; // Handled by Grip Down

    // Freehand
    if (activeTool === Tool.FREEHAND) {
        setIsDraggingFreehand(true);
        const poly: PolylineShape = {
            id: `shape_${Date.now()}`, type: Tool.FREEHAND, points: [pos],
            layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0
        };
        setCurrentShape(poly);
        setStatusMessage("Drawing freehand...");
        return;
    }

    if (activeTool === Tool.SELECT) {
        if (e.target === svgRef.current) {
            setSelectionRect({ start: pos, end: pos });
            if (!e.ctrlKey && !e.metaKey) setSelectedShapeIds([]);
        } else {
            const targetId = (e.target as Element).id;
             if (targetId && targetId.startsWith('shape_')) {
                 if (e.ctrlKey || e.metaKey) setSelectedShapeIds(prev => prev.includes(targetId) ? prev.filter(i => i !== targetId) : [...prev, targetId]);
                 else setSelectedShapeIds([targetId]);
            }
        }
        return;
    }
    
    if (activeTool === Tool.PAN) { setIsPanning(true); setPanStart(getInitialMousePos(svgRef.current!, e)); return; }

    const newPoints = [...clickPoints, pos];
    setClickPoints(newPoints);

    // MODIFY TOOLS
    if (activeTool === Tool.MOVE || activeTool === Tool.COPY || activeTool === Tool.ROTATE || activeTool === Tool.SCALE || activeTool === Tool.MIRROR) {
        if (selectedShapeIds.length === 0) { setStatusMessage("Select objects first!"); setActiveTool(Tool.SELECT); return; }
        
        if (toolStep === 0) { // Base Point
            setTempPoint(pos);
            setToolStep(1);
            if(activeTool === Tool.ROTATE) setStatusMessage("Specify rotation angle (click point):");
            else if(activeTool === Tool.SCALE) setStatusMessage("Specify scale factor (click point):");
            else if(activeTool === Tool.MIRROR) setStatusMessage("Specify second point of mirror line:");
            else setStatusMessage("Specify destination:");
        } else if (toolStep === 1) { // Action
            const origin = tempPoint!;
            let toUpdate = shapes.filter(s => selectedShapeIds.includes(s.id));
            
            if (activeTool === Tool.COPY) {
                 const copies = toUpdate.map(s => {
                    const copy = JSON.parse(JSON.stringify(s));
                    copy.id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                    return copy;
                 });
                 toUpdate = copies;
                 // We need to add these first to updates, handling logic below is consistent
            }

            let updatedShapes: Shape[] = [];

            if (activeTool === Tool.MOVE || activeTool === Tool.COPY) {
                const dx = pos.x - origin.x;
                const dy = pos.y - origin.y;
                updatedShapes = toUpdate.map(s => {
                     const n = {...s};
                     if(n.p1) { n.p1.x+=dx; n.p1.y+=dy; n.p2.x+=dx; n.p2.y+=dy; }
                     else if(n.points) { n.points = n.points.map(p => ({x:p.x+dx, y:p.y+dy})); }
                     else if(n.x !== undefined) { n.x+=dx; n.y+=dy; }
                     else if(n.cx !== undefined) { n.cx+=dx; n.cy+=dy; }
                     return n;
                });
            } else if (activeTool === Tool.ROTATE) {
                const angle = Math.atan2(pos.y - origin.y, pos.x - origin.x) * 180 / Math.PI;
                const startAngle = 0; // Assuming base vector is 0 or we need 3 points. 
                // Simplified: Rotation relative to base point based on mouse angle.
                updatedShapes = toUpdate.map(s => {
                    const center = activeTool === Tool.ROTATE ? origin : getShapeCenter(s); // Rotate around base point
                    // Actually rotating geometry points is better than setting .rotation property for some shapes
                    // For now, rotate points manually
                    let n = {...s};
                    if(n.p1) { n.p1 = rotatePoint(n.p1, origin, angle); n.p2 = rotatePoint(n.p2, origin, angle); }
                    else if(n.points) { n.points = n.points.map(p => rotatePoint(p, origin, angle)); }
                    else if(n.cx !== undefined && n.type !== Tool.RECTANGLE) { const c = rotatePoint({x:n.cx, y:n.cy}, origin, angle); n.cx=c.x; n.cy=c.y; n.rotation = (n.rotation||0) + angle; }
                    else if(n.x !== undefined) {
                        // Rectangle rotation is complex if not center. Convert to Polygon?
                        // For simplicity, rotate center and add rotation
                        const c = rotatePoint({x:n.x+n.width/2, y:n.y+n.height/2}, origin, angle);
                        n.x = c.x - n.width/2; n.y = c.y - n.height/2;
                        n.rotation = (n.rotation||0) + angle;
                    }
                    return n;
                });
            } else if (activeTool === Tool.SCALE) {
                const dist = getDistance(origin, pos);
                const factor = Math.max(0.1, dist / 100); // 100px is 1.0
                updatedShapes = toUpdate.map(s => {
                    let n = {...s};
                     if(n.p1) { n.p1 = scalePoint(n.p1, origin, factor); n.p2 = scalePoint(n.p2, origin, factor); }
                     else if(n.points) { n.points = n.points.map(p => scalePoint(p, origin, factor)); }
                     else if(n.r) { n.r *= factor; const c = scalePoint({x:n.cx, y:n.cy}, origin, factor); n.cx=c.x; n.cy=c.y; }
                     else if(n.width) { n.width *= factor; n.height *= factor; const c = scalePoint({x:n.x, y:n.y}, origin, factor); n.x=c.x; n.y=c.y; }
                    return n;
                });
            } else if (activeTool === Tool.MIRROR) {
                updatedShapes = toUpdate.map(s => {
                    let n = {...s};
                    if(n.p1) { n.p1 = mirrorPoint(n.p1, origin, pos); n.p2 = mirrorPoint(n.p2, origin, pos); }
                    else if(n.points) { n.points = n.points.map(p => mirrorPoint(p, origin, pos)); }
                    else if(n.cx) { const c = mirrorPoint({x:n.cx, y:n.cy}, origin, pos); n.cx=c.x; n.cy=c.y; }
                    else if(n.x) { const c = mirrorPoint({x:n.x, y:n.y}, origin, pos); n.x=c.x; n.y=c.y; /* Rect mirror is messy */ }
                    return n;
                });
            }

            if(activeTool === Tool.COPY) updateShapes([...shapes, ...updatedShapes]);
            else updateShapes(updatedShapes);

            resetTool();
            setActiveTool(Tool.SELECT);
            setStatusMessage("Modify Complete");
        }
        return;
    }

    if (activeTool === Tool.OFFSET) {
        const targetId = (e.target as Element).id;
        if (toolStep === 0) {
             if(!targetId.startsWith('shape')) return;
             setSelectedShapeIds([targetId]);
             const dist = parseFloat(prompt("Offset Distance:", "20") || "0");
             if(dist > 0) {
                 setToolStep(1);
                 // Store distance in tempPoint.x as a hack or use a ref
                 setTempPoint({x: dist, y: 0}); 
                 setStatusMessage("Click side to offset");
             } else { resetTool(); }
        } else if (toolStep === 1) {
            const shape = shapes.find(s => s.id === selectedShapeIds[0]);
            const dist = tempPoint!.x;
            if(shape && shape.type === Tool.LINE) {
                // Calc direction
                const l = shape as LineShape;
                const angle = Math.atan2(l.p2.y - l.p1.y, l.p2.x - l.p1.x);
                // Determine side
                // Vector P1->Mouse
                const vm = {x: pos.x - l.p1.x, y: pos.y - l.p1.y};
                // Rotated vector 90
                const normal = {x: -Math.sin(angle), y: Math.cos(angle)};
                const dot = vm.x * normal.x + vm.y * normal.y;
                const sign = dot > 0 ? 1 : -1;
                
                const offsetX = sign * normal.x * dist;
                const offsetY = sign * normal.y * dist;
                
                const newShape = {...l, id: `shape_${Date.now()}`, p1: {x: l.p1.x + offsetX, y: l.p1.y + offsetY}, p2: {x: l.p2.x + offsetX, y: l.p2.y + offsetY}};
                addShape(newShape);
            }
            // Rect/Circle/Polyline offset is complex, skipping for brevity or implementing simplified
            resetTool();
        }
        return;
    }

    if (activeTool === Tool.TRIM) {
        const targetId = (e.target as Element).id;
        if (!targetId.startsWith('shape')) return;
        
        const shape = shapes.find(s => s.id === targetId);
        if (!shape) return;

        // Find intersections with ALL other shapes
        const cutPoints: Point[] = [];
        shapes.forEach(other => {
            if (other.id === shape.id) return;
            if (shape.type === Tool.LINE && other.type === Tool.LINE) {
                const int = getLineIntersection(shape.p1, shape.p2, (other as LineShape).p1, (other as LineShape).p2);
                if(int) {
                    // Check if int is on segments
                    const on1 = projectPointToSegment(int, shape.p1, shape.p2);
                    const on2 = projectPointToSegment(int, (other as LineShape).p1, (other as LineShape).p2);
                    if(getDistance(int, on1) < 0.1 && getDistance(int, on2) < 0.1) cutPoints.push(int);
                }
            }
        });

        if (shape.type === Tool.LINE) {
            // Sort points by distance from p1
            const p1 = shape.p1;
            cutPoints.sort((a, b) => getDistance(p1, a) - getDistance(p1, b));
            
            // Add endpoints
            const allPoints = [shape.p1, ...cutPoints, shape.p2];
            
            // Find which segment was clicked
            // Project mouse to line
            const proj = projectPointToSegment(pos, shape.p1, shape.p2);
            const dToP1 = getDistance(shape.p1, proj);
            
            let segIndex = -1;
            for(let i=0; i<allPoints.length-1; i++) {
                const d1 = getDistance(shape.p1, allPoints[i]);
                const d2 = getDistance(shape.p1, allPoints[i+1]);
                if(dToP1 >= d1 && dToP1 <= d2) {
                    segIndex = i; break;
                }
            }
            
            if(segIndex !== -1) {
                // Remove this segment, meaning:
                // If we have A-B-C-D, and remove B-C.
                // We get Line A-B and Line C-D.
                // Replace original
                deleteShapes([shape.id]);
                
                // Create Left part if exists
                if(segIndex > 0) {
                    addShape({...shape, id: `shape_${Date.now()}_1`, p1: shape.p1, p2: allPoints[segIndex]});
                }
                // Create Right part if exists
                if(segIndex < allPoints.length - 2) {
                    addShape({...shape, id: `shape_${Date.now()}_2`, p1: allPoints[segIndex+1], p2: shape.p2});
                }
                setStatusMessage("Trimmed");
            }
        }
        return;
    }
    
    if (activeTool === Tool.EXTEND) {
         const targetId = (e.target as Element).id;
         const shape = shapes.find(s => s.id === targetId);
         if(shape && shape.type === Tool.LINE) {
             // Cast ray from closest endpoint
             const d1 = getDistance(pos, shape.p1);
             const d2 = getDistance(pos, shape.p2);
             const start = d1 < d2 ? shape.p2 : shape.p1; // Far point
             const end = d1 < d2 ? shape.p1 : shape.p2; // Near point (to extend)
             const vec = {x: end.x - start.x, y: end.y - start.y};
             const len = Math.sqrt(vec.x*vec.x + vec.y*vec.y);
             const dir = {x: vec.x/len, y: vec.y/len};
             
             // Ray: end + t * dir. Find min t > 0 intersecting other shapes.
             let minT = Infinity;
             let bestInt: Point | null = null;
             
             shapes.forEach(other => {
                 if(other.id === shape.id) return;
                 if(other.type === Tool.LINE) {
                     // Ray vs Segment intersection
                     // Using line-line intersection
                     const farPoint = {x: end.x + dir.x * 10000, y: end.y + dir.y * 10000};
                     const int = getSegmentIntersection(end, farPoint, other.p1, other.p2);
                     if(int) {
                         const d = getDistance(end, int);
                         if(d < minT) { minT = d; bestInt = int; }
                     }
                 }
             });
             
             if(bestInt) {
                 const updated = {...shape};
                 if(d1 < d2) updated.p1 = bestInt; else updated.p2 = bestInt;
                 updateShape(updated);
                 setStatusMessage("Extended");
             }
         }
         return;
    }
    
    if (activeTool === Tool.FILLET || activeTool === Tool.CHAMFER) {
        const targetId = (e.target as Element).id;
        if(!targetId.startsWith('shape')) return;
        
        if(toolStep === 0) {
             setSelectedShapeIds([targetId]);
             setToolStep(1);
             setStatusMessage(`Select second line to ${activeTool === Tool.FILLET ? 'Fillet' : 'Chamfer'}`);
        } else {
             const s1 = shapes.find(s => s.id === selectedShapeIds[0]);
             const s2 = shapes.find(s => s.id === targetId);
             if(s1 && s2 && s1.type === Tool.LINE && s2.type === Tool.LINE) {
                 // Calc intersection
                 const int = getLineIntersection(s1.p1, s1.p2, s2.p1, s2.p2);
                 if(int) {
                     const r = 20; // Default Radius/Chamfer dist
                     // Trim lines to intersection - radius offset (simplified visual fillet)
                     // Real fillet finds tangent points.
                     // Simplified: Just trim to intersection and add circle?
                     // Let's just trim to intersection for now (0 radius fillet)
                     
                     // Update s1 endpoint closest to int to be int
                     const u1 = {...s1};
                     if(getDistance(s1.p1, int) < getDistance(s1.p2, int)) u1.p1 = int; else u1.p2 = int;
                     
                     const u2 = {...s2};
                     if(getDistance(s2.p1, int) < getDistance(s2.p2, int)) s2.p1 = int; else u2.p2 = int;
                     
                     updateShapes(shapes.map(s => s.id === s1.id ? u1 : s.id === s2.id ? u2 : s));
                     setStatusMessage("Fillet/Chamfer (Zero Radius) applied");
                 }
             }
             resetTool();
             setActiveTool(Tool.SELECT);
        }
        return;
    }

    // DRAW TOOLS
    if (activeTool === Tool.LINE) {
        if (newPoints.length === 1) {
            setCurrentShape({ id: 'temp', type: Tool.LINE, p1: pos, p2: pos, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0 });
            setStatusMessage("Specify next point:");
        } else {
            addShape({ id: `shape_${Date.now()}`, type: Tool.LINE, p1: newPoints[0], p2: pos, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0 });
            setClickPoints([pos]); // Chain lines
            setCurrentShape({ id: 'temp', type: Tool.LINE, p1: pos, p2: pos, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0 });
        }
    } else if (activeTool === Tool.RECTANGLE) {
        if (newPoints.length === 1) {
             setCurrentShape({ id: 'temp', type: Tool.RECTANGLE, x: pos.x, y: pos.y, width: 0, height: 0, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0 });
             setStatusMessage("Specify corner:");
        } else {
             if(currentShape) addShape(currentShape); resetTool(); setStatusMessage("Rectangle created");
        }
    } else if (activeTool === Tool.CIRCLE) {
        if (newPoints.length === 1) {
             setCurrentShape({ id: 'temp', type: Tool.CIRCLE, cx: pos.x, cy: pos.y, r: 0, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0 });
             setStatusMessage("Specify radius point:");
        } else {
             if(currentShape) addShape(currentShape); resetTool(); setStatusMessage("Circle created");
        }
    } else if (activeTool === Tool.ARC) {
        if (newPoints.length === 1) {
            setStatusMessage("Specify second point:");
        } else if (newPoints.length === 2) {
            setStatusMessage("Specify end point:");
        } else if (newPoints.length === 3) {
            const arcParams = calculateArcFrom3Points(newPoints[0], newPoints[1], newPoints[2]);
            if (arcParams) {
                addShape({ id: `shape_${Date.now()}`, type: Tool.ARC, ...arcParams, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0 });
            }
            resetTool();
        }
    } else if (activeTool === Tool.ELLIPSE) {
        if (newPoints.length === 1) {
            setStatusMessage("Specify axis end point:");
            setCurrentShape({ id: 'temp', type: Tool.ELLIPSE, cx: pos.x, cy: pos.y, rx: 0, ry: 0, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0 });
        } else if (newPoints.length === 2) {
            const rx = getDistance(newPoints[0], pos) / 2;
            const cx = (newPoints[0].x + pos.x) / 2;
            const cy = (newPoints[0].y + pos.y) / 2;
            const rotation = Math.atan2(pos.y - newPoints[0].y, pos.x - newPoints[0].x) * 180 / Math.PI;
            setCurrentShape({ ...currentShape!, cx, cy, rx, ry: rx * 0.5, rotation });
            // We need to store the center/rotation for the next step (minor axis)
            // Hack: use clickPoints[0] and pos to define major axis
            setStatusMessage("Specify distance to other axis:");
        } else {
            // pos is distance point
            const center = {x: (clickPoints[0].x + clickPoints[1].x)/2, y: (clickPoints[0].y + clickPoints[1].y)/2 };
            // Distance from center to pos is ry (simplified, assuming pos is perpendicular)
            const ry = getDistance(center, pos);
            const rx = getDistance(clickPoints[0], clickPoints[1]) / 2;
            const rotation = Math.atan2(clickPoints[1].y - clickPoints[0].y, clickPoints[1].x - clickPoints[0].x) * 180 / Math.PI;
            
            addShape({ id: `shape_${Date.now()}`, type: Tool.ELLIPSE, cx: center.x, cy: center.y, rx, ry, rotation, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2 });
            resetTool();
        }
    } else if (activeTool === Tool.POLYLINE) {
        if (newPoints.length === 1) {
            setCurrentShape({ id: 'temp', type: Tool.POLYLINE, points: [pos, pos], layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0 });
        } else {
            const poly = currentShape as PolylineShape;
            // Check if closed (near start)
            if (getDistance(pos, poly.points[0]) < 10 && poly.points.length > 2) {
                addShape({...poly, points: [...poly.points.slice(0, -1), poly.points[0]]}); // Close it
                resetTool();
            } else {
                setCurrentShape({ ...poly, points: [...poly.points, pos] });
            }
        }
    } else if (activeTool === Tool.POLYGON) {
        if (newPoints.length === 1) {
            const sides = parseInt(prompt("Number of sides:", "5") || "5");
            setCurrentShape({ id: 'temp', type: Tool.POLYGON, points: [], sides: sides, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0 });
            setStatusMessage("Specify radius:");
        } else {
            if(currentShape) addShape(currentShape); resetTool();
        }
    } else if (activeTool === Tool.DIMENSION_LINEAR || activeTool === Tool.DIMENSION_ALIGNED) {
        if (newPoints.length === 1) setStatusMessage("Specify second extension line origin:");
        else if (newPoints.length === 2) setStatusMessage("Specify dimension line location:");
        else {
            const type = activeTool === Tool.DIMENSION_LINEAR ? 'linear' : 'aligned';
            const dim: DimensionShape = {
                id: `shape_${Date.now()}`, type: activeTool, p1: newPoints[0], p2: newPoints[1], textPosition: pos, offset: 20, dimType: type,
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 1, rotation: 0
            };
            addShape(dim); resetTool();
        }
    } else if (activeTool === Tool.DIMENSION_ANGULAR) {
        if (newPoints.length === 1) setStatusMessage("Specify first line endpoint (Vertex):");
        else if (newPoints.length === 2) setStatusMessage("Specify second line endpoint:");
        else {
             // Vertex is p1, p2 is start, p3 is end
             // We need 3 points: Center (vertex), P1, P2
             // Click 1: Vertex, Click 2: P1, Click 3: P2
             // Wait, standard is: Select Line 1, Select Line 2 OR Vertex, P1, P2.
             // Let's do Vertex (Center), P1, P2.
             // Wait, state check:
             // 1 click: Center. 2 clicks: P1. 3 clicks: P2.
             const dim: any = { // AngularDimensionShape
                id: `shape_${Date.now()}`, type: Tool.DIMENSION_ANGULAR, center: newPoints[0], p1: newPoints[1], p2: pos, textPosition: pos,
                layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 1, rotation: 0
             };
             addShape(dim); resetTool();
        }
    }
  };

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    let pos = getMousePos(e);
    setCoords(pos);
    pos = getSnapPoint(pos);

    if (dragGrip) {
        updateGrip(pos);
        return;
    }

    if (isPanning && panStart) {
        const currentPanPos = getInitialMousePos(svgRef.current, e);
        setViewBox({ ...viewBox, x: viewBox.x - (currentPanPos.x - panStart.x), y: viewBox.y - (currentPanPos.y - panStart.y) });
        return;
    }
    
    if (activeTool === Tool.FREEHAND && isDraggingFreehand && currentShape) {
        const poly = currentShape as PolylineShape;
        if (getDistance(poly.points[poly.points.length - 1], pos) > 2) { // Min dist
            setCurrentShape({...poly, points: [...poly.points, pos]});
        }
        return;
    }

    if (selectionRect) { setSelectionRect({ ...selectionRect, end: pos }); return; }

    // Preview logic
    if (clickPoints.length > 0 || tempPoint) {
        const start = clickPoints.length > 0 ? clickPoints[clickPoints.length - 1] : tempPoint || pos;
        
        if (activeTool === Tool.LINE && currentShape) {
            const p = orthoEnabled ? applyOrtho(start, pos) : pos;
            setCurrentShape({ ...currentShape, p2: p } as LineShape);
        } else if (activeTool === Tool.POLYLINE && currentShape) {
             const p = orthoEnabled ? applyOrtho(start, pos) : pos;
             const pts = [...(currentShape as PolylineShape).points];
             pts[pts.length - 1] = p;
             setCurrentShape({...currentShape, points: pts} as PolylineShape);
        } else if (activeTool === Tool.RECTANGLE && currentShape) {
            const s = clickPoints[0];
            const w = Math.abs(pos.x - s.x);
            const h = Math.abs(pos.y - s.y);
            const x = Math.min(s.x, pos.x);
            const y = Math.min(s.y, pos.y);
            setCurrentShape({ ...currentShape, x, y, width: w, height: h } as RectangleShape);
        } else if (activeTool === Tool.CIRCLE && currentShape) {
            const r = getDistance(clickPoints[0], pos);
            setCurrentShape({ ...currentShape, r } as CircleShape);
        } else if (activeTool === Tool.ELLIPSE && currentShape) {
             if (clickPoints.length === 1) {
                 // Visualizing Axis 1
                 const rx = getDistance(clickPoints[0], pos) / 2;
                 const cx = (clickPoints[0].x + pos.x) / 2;
                 const cy = (clickPoints[0].y + pos.y) / 2;
                 const rot = Math.atan2(pos.y - clickPoints[0].y, pos.x - clickPoints[0].x) * 180 / Math.PI;
                 setCurrentShape({...currentShape, cx, cy, rx, ry: rx * 0.2, rotation: rot } as EllipseShape);
             } else if (clickPoints.length === 2) {
                 // Visualizing Axis 2 (Rubber band from center to mouse, projected)
                 // Simplified: Just update ry
                 const center = {x: (clickPoints[0].x + clickPoints[1].x)/2, y: (clickPoints[0].y + clickPoints[1].y)/2 };
                 const ry = getDistance(center, pos);
                 setCurrentShape({...currentShape, ry } as EllipseShape);
             }
        } else if (activeTool === Tool.POLYGON && currentShape) {
            const r = getDistance(clickPoints[0], pos);
            const sides = (currentShape as PolygonShape).sides || 5;
            // Rotate points so vertex points to mouse
            const angleOffset = Math.atan2(pos.y - clickPoints[0].y, pos.x - clickPoints[0].x) * 180 / Math.PI + 90;
            // generatePolygonPoints generates starting at -90 (Top). We want to rotate that.
            // Actually let's just pass calculated points
            // simple generation
             const points: Point[] = [];
             for (let i = 0; i < sides; i++) {
                 const rad = (i * 360 / sides + angleOffset - 90) * Math.PI / 180;
                 points.push({ x: clickPoints[0].x + r * Math.cos(rad), y: clickPoints[0].y + r * Math.sin(rad) });
             }
            setCurrentShape({...currentShape, points} as PolygonShape);
        }
    }
  };

  const handleMouseUp = (e: MouseEvent<SVGSVGElement>) => {
    if (isPanning) { setIsPanning(false); setPanStart(null); }
    if (dragGrip) { setDragGrip(null); setStatusMessage("Ready"); }
    if (activeTool === Tool.FREEHAND) {
        if (currentShape) { addShape(currentShape); resetTool(); }
    }
    if (selectionRect) {
        const b1 = { minX: Math.min(selectionRect.start.x, selectionRect.end.x), minY: Math.min(selectionRect.start.y, selectionRect.end.y), maxX: Math.max(selectionRect.start.x, selectionRect.end.x), maxY: Math.max(selectionRect.start.y, selectionRect.end.y) };
        const hits = shapes.filter(s => doBBoxesIntersect(b1, getShapeBoundingBox(s))).map(s => s.id);
        if (e.ctrlKey || e.metaKey) setSelectedShapeIds(prev => [...new Set([...prev, ...hits])]);
        else setSelectedShapeIds(hits);
        setSelectionRect(null);
    }
  };
  
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      const pt = getInitialMousePos(svgRef.current!, e as any);
      setViewBox({ x: pt.x - (pt.x - viewBox.x) * zoomFactor, y: pt.y - (pt.y - viewBox.y) * zoomFactor, w: viewBox.w * zoomFactor, h: viewBox.h * zoomFactor });
  };

  const renderGrips = (shape: Shape) => {
      const gripSize = viewBox.w / 150; 
      const G: React.FC<{x: number, y: number, i: number, t?: string}> = ({x, y, i, t='point'}) => (
          <rect 
            x={x-gripSize/2} y={y-gripSize/2} width={gripSize} height={gripSize} 
            fill="#3b82f6" stroke="white" strokeWidth={1} 
            vectorEffect="non-scaling-stroke" 
            className="cursor-pointer hover:fill-blue-300"
            onMouseDown={(e) => handleGripDown(e as any, shape.id, i, t)}
          />
      );
      
      if (shape.type === Tool.LINE) return <><G x={shape.p1.x} y={shape.p1.y} i={0}/><G x={shape.p2.x} y={shape.p2.y} i={1}/><G x={(shape.p1.x+shape.p2.x)/2} y={(shape.p1.y+shape.p2.y)/2} i={2} t="mid"/></>;
      if (shape.type === Tool.RECTANGLE) return <><G x={shape.x} y={shape.y} i={0}/><G x={shape.x+shape.width} y={shape.y} i={1}/><G x={shape.x} y={shape.y+shape.height} i={2}/><G x={shape.x+shape.width} y={shape.y+shape.height} i={3}/></>;
      if (shape.type === Tool.CIRCLE) return <><G x={shape.cx} y={shape.cy} i={0} t="center"/><G x={shape.cx+shape.r} y={shape.cy} i={1} t="rad"/></>;
      if (shape.type === Tool.POLYLINE || shape.type === Tool.POLYGON) return <>{shape.points.map((p, i) => <G key={i} x={p.x} y={p.y} i={i}/>)}</>;
      return null;
  }

  const renderShape = (shape: Shape) => {
      const isSel = selectedShapeIds.includes(shape.id);
      const stroke = isSel ? '#3b82f6' : shape.color;
      const strokeWidth = shape.strokeWidth + (isSel ? 1 : 0);
      const fill = shape.fill || 'none';
      const rot = shape.rotation ? `rotate(${shape.rotation}, ${getShapeCenter(shape).x}, ${getShapeCenter(shape).y})` : undefined;
      const common = { stroke, strokeWidth, fill, vectorEffect: 'non-scaling-stroke', transform: rot };

      let el;
      if (shape.type === Tool.LINE) el = <line x1={shape.p1.x} y1={shape.p1.y} x2={shape.p2.x} y2={shape.p2.y} {...common} />;
      else if (shape.type === Tool.RECTANGLE) el = <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} {...common} />;
      else if (shape.type === Tool.CIRCLE) el = <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />;
      else if (shape.type === Tool.ELLIPSE) el = <ellipse cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...common} />;
      else if (shape.type === Tool.ARC) {
          const start = polarToCartesian(shape.cx, shape.cy, shape.r, shape.startAngle);
          const end = polarToCartesian(shape.cx, shape.cy, shape.r, shape.endAngle);
          const largeArc = Math.abs(shape.endAngle - shape.startAngle) > 180 ? 1 : 0;
          const d = `M ${start.x} ${start.y} A ${shape.r} ${shape.r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
          el = <path d={d} {...common} fill="none" />;
      }
      else if (shape.type === Tool.POLYLINE || shape.type === Tool.POLYGON || shape.type === Tool.FREEHAND) el = <polyline points={shape.points.map(p => `${p.x},${p.y}`).join(' ')} {...common} />;
      else if (shape.type === Tool.TEXT) el = <text x={shape.x} y={shape.y} fontSize={shape.fontSize} fill={shape.color} stroke="none" transform={rot}>{shape.content}</text>;
      else if (shape.type === Tool.DIMENSION_LINEAR || shape.type === Tool.DIMENSION_ALIGNED) {
          const dShape = shape as DimensionShape;
          const dist = getDistance(dShape.p1, dShape.p2).toFixed(2);
          el = (
              <g>
                  <line x1={dShape.p1.x} y1={dShape.p1.y} x2={dShape.p2.x} y2={dShape.p2.y} stroke={stroke} strokeWidth={1} />
                  <text x={dShape.textPosition?.x} y={dShape.textPosition?.y} fill={stroke} fontSize={12} textAnchor="middle">{dist}</text>
              </g>
          );
      } else if (shape.type === Tool.DIMENSION_ANGULAR) {
           const d = shape as any; // AngularDimensionShape
           const a1 = Math.atan2(d.p1.y - d.center.y, d.p1.x - d.center.x) * 180/Math.PI;
           const a2 = Math.atan2(d.p2.y - d.center.y, d.p2.x - d.center.x) * 180/Math.PI;
           const angle = Math.abs(a2 - a1).toFixed(1);
           el = (
              <g>
                  <line x1={d.center.x} y1={d.center.y} x2={d.p1.x} y2={d.p1.y} stroke={stroke} strokeWidth={1} />
                  <line x1={d.center.x} y1={d.center.y} x2={d.p2.x} y2={d.p2.y} stroke={stroke} strokeWidth={1} />
                  <text x={d.textPosition?.x} y={d.textPosition?.y} fill={stroke} fontSize={12}>{angle}°</text>
              </g>
           )
      }

      return (
          <g key={shape.id} id={shape.id}>
              {el}
              {isSel && renderGrips(shape)}
          </g>
      );
  };

  const renderDynamicInput = () => {
      let text = "";
      let pos = coords;
      const start = clickPoints[clickPoints.length - 1] || tempPoint;
      
      if (activeTool === Tool.SELECT || activeTool === Tool.PAN) return null;
      if (!start) return null;

      if (activeTool === Tool.LINE || activeTool === Tool.POLYLINE) {
         if(orthoEnabled) pos = applyOrtho(start, pos);
         const d = getDistance(start, pos);
         const a = Math.atan2(pos.y - start.y, pos.x - start.x) * 180 / Math.PI;
         text = `L: ${d.toFixed(2)} ∠ ${a.toFixed(0)}°`;
      } else if (activeTool === Tool.CIRCLE) {
         text = `R: ${getDistance(start, pos).toFixed(2)}`;
      }
      
      if (!text) return null;

      const fontSize = Math.max(12, viewBox.w / 60);
      return (
          <g transform={`translate(${coords.x + 15}, ${coords.y - 15})`} pointerEvents="none">
              <rect width={text.length * fontSize * 0.6 + 10} height={fontSize + 10} fill={theme === 'DARK' ? "#333" : "#fff"} stroke="#888" rx={4} fillOpacity={0.8} />
              <text x={5} y={fontSize} fill={theme === 'DARK' ? "#fff" : "#000"} fontSize={fontSize} fontFamily="monospace">{text}</text>
          </g>
      );
  };

  return (
    <div className={`h-full w-full ${theme === 'DARK' ? 'bg-black' : 'bg-white'} cursor-crosshair relative`}>
      <svg 
        ref={svgRef} 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} 
        className="w-full h-full block touch-none"
        onMouseDown={handleMouseDown} 
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      >
        <defs>
            <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke={theme === 'DARK' ? '#333' : '#e5e5e5'} strokeWidth="0.5" vectorEffect="non-scaling-stroke"/>
            </pattern>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="url(#smallGrid)"/>
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke={theme === 'DARK' ? '#555' : '#d4d4d4'} strokeWidth="1" vectorEffect="non-scaling-stroke"/>
            </pattern>
        </defs>
        
        {gridVisible && <rect x={viewBox.x - viewBox.w} y={viewBox.y - viewBox.h} width={viewBox.w * 3} height={viewBox.h * 3} fill="url(#grid)" pointerEvents="none" />}
        
        {shapes.map(renderShape)}
        {currentShape && renderShape(currentShape)}
        
        {selectionRect && (
            <rect x={Math.min(selectionRect.start.x, selectionRect.end.x)} y={Math.min(selectionRect.start.y, selectionRect.end.y)} width={Math.abs(selectionRect.end.x - selectionRect.start.x)} height={Math.abs(selectionRect.end.y - selectionRect.start.y)} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        )}

        {renderDynamicInput()}
      </svg>
    </div>
  );
};

export default Canvas;
