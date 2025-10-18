
import React, { useState, useRef, MouseEvent, useEffect } from 'react';
import { Tool, Shape, Point, LineShape, RectangleShape, CircleShape, PolylineShape, Layer, ImageShape, ArcShape, TextShape } from '../types';
import { getShapeCenter } from '../utils';

interface CanvasProps {
  activeTool: Tool;
  shapes: Shape[];
  addShape: (shape: Shape) => void;
  updateShape: (shape: Shape) => void;
  updateShapes: (shapes: Shape[]) => void;
  deleteShape: (id: string) => void;
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;
  activeLayer: Layer;
  layers: Layer[];
  setCoords: (point: Point) => void;
  // FIX: Add coords to props to position the drawing info tooltip.
  coords: Point;
  snapEnabled: boolean;
  orthoEnabled: boolean;
  extrudeShape: (shapeId: string, newShapes: Shape[]) => void;
}

const getMousePos = (svg: SVGSVGElement, e: MouseEvent): Point => {
  const CTM = svg.getScreenCTM();
  if (CTM) {
    return {
      x: (e.clientX - CTM.e) / CTM.a,
      y: (e.clientY - CTM.f) / CTM.d,
    };
  }
  return { x: 0, y: 0 };
};

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number): string => {
    if (radius === 0) return "";
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    const d = [
        "M", start.x, start.y,
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;
};


const Canvas: React.FC<CanvasProps> = ({
  activeTool,
  shapes,
  addShape,
  updateShape,
  updateShapes,
  deleteShape,
  selectedShapeId,
  setSelectedShapeId,
  activeLayer,
  layers,
  setCoords,
  snapEnabled,
  orthoEnabled,
  extrudeShape,
  coords,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1920, h: 1080 });
  const [panStart, setPanStart] = useState<Point | null>(null);

  // For moving shapes
  const [isMoving, setIsMoving] = useState(false);
  const [moveStartPoint, setMoveStartPoint] = useState<Point | null>(null);
  
  // For scaling shapes
  const [isScaling, setIsScaling] = useState(false);
  const [originalShapeForScaling, setOriginalShapeForScaling] = useState<Shape | null>(null);

  // For rotation
  const [isRotating, setIsRotating] = useState(false);
  const [originalShapeForRotation, setOriginalShapeForRotation] = useState<Shape | null>(null);

  // For copying
  const [isCopying, setIsCopying] = useState(false);
  
  // For mirroring
  const [mirrorLineStart, setMirrorLineStart] = useState<Point | null>(null);
  const [mirrorLineEnd, setMirrorLineEnd] = useState<Point | null>(null);
  
  // For snapping
  const [snapIndicator, setSnapIndicator] = useState<Point | null>(null);
  
  // For line drawing info
  const [drawingInfo, setDrawingInfo] = useState<{ length: number; angle: number } | null>(null);

  // For extruding
  const [isExtruding, setIsExtruding] = useState(false);
  const [extrusionStartPoint, setExtrusionStartPoint] = useState<Point | null>(null);
  const [shapeToExtrude, setShapeToExtrude] = useState<Shape | null>(null);
  const [extrusionPreviewShapes, setExtrusionPreviewShapes] = useState<Shape[]>([]);

  // For Press-Pull
  const [isPressPulling, setIsPressPulling] = useState(false);
  const [pressPullObject, setPressPullObject] = useState<{
    faceA: PolylineShape;
    faceB: PolylineShape;
    connectors: LineShape[];
    extrusionVector: Point;
  } | null>(null);
  const [pressPullStartPoint, setPressPullStartPoint] = useState<Point | null>(null);
  const [previewShapes, setPreviewShapes] = useState<Shape[]>([]);
  const [hiddenShapeIds, setHiddenShapeIds] = useState<Set<string>>(new Set());

  // Touch/Zoom state
  const touchState = useRef<{
    lastDist: number | null,
    lastMidpoint: Point | null,
    isTwoFinger: boolean
  }>({ lastDist: null, lastMidpoint: null, isTwoFinger: false }).current;


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (isDrawing && currentShape?.type === Tool.POLYLINE && currentShape.points.length > 1) {
                const finalPolyline = { ...currentShape };
                // remove the last point which is just the mouse move preview
                finalPolyline.points.pop();
                if (finalPolyline.points.length > 1) {
                   addShape(finalPolyline);
                }
            }
            if (isExtruding) {
                setIsExtruding(false);
                setShapeToExtrude(null);
                setExtrusionStartPoint(null);
                setExtrusionPreviewShapes([]);
                setSelectedShapeId(null);
            }
            if (isPressPulling) {
                setIsPressPulling(false);
                setPressPullObject(null);
                setPressPullStartPoint(null);
                setPreviewShapes([]);
                setHiddenShapeIds(new Set());
            }
            setIsDrawing(false);
            setCurrentShape(null);
            setStartPoint(null);
            setIsScaling(false);
            setOriginalShapeForScaling(null);
            setIsRotating(false);
            setOriginalShapeForRotation(null);
            setIsCopying(false);
            setMirrorLineStart(null);
            setMirrorLineEnd(null);
            setDrawingInfo(null);
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedShapeId) {
                deleteShape(selectedShapeId);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, currentShape, addShape, selectedShapeId, deleteShape, isExtruding, isPressPulling]);
  
  const getCursor = () => {
    if (isMoving || isCopying) return 'grabbing';
    if (isScaling || isRotating) return 'move';
    switch (activeTool) {
      case Tool.SELECT: return 'default';
      case Tool.MOVE: return 'move';
      case Tool.ERASE: return 'crosshair';
      case Tool.EXTRUDE: return 'alias';
      case Tool.PRESS_PULL: return 'alias';
      case Tool.PAN: return isDrawing ? 'grabbing' : 'grab';
      case Tool.SCALE: 
      case Tool.ROTATE:
      case Tool.COPY:
      case Tool.MIRROR:
      case Tool.FILLET:
        return 'pointer';
      default: return 'crosshair';
    }
  }
  
  const getSnapPoint = (mousePos: Point): { snappedPoint: Point; indicator: Point | null } => {
    if (!snapEnabled || !svgRef.current) {
      return { snappedPoint: mousePos, indicator: null };
    }

    const clientWidth = svgRef.current.clientWidth || 1;
    const zoomFactor = viewBox.w / clientWidth;
    const snapRadius = 10 * zoomFactor; // 10 pixels in screen space

    let bestSnapPoint: Point | null = null;
    let minDistanceSq = snapRadius * snapRadius;

    const checkPoint = (p: Point) => {
      const dx = mousePos.x - p.x;
      const dy = mousePos.y - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
        bestSnapPoint = p;
      }
    };

    // 1. Snap to Grid
    const gridSize = 10;
    const gridPoint = {
      x: Math.round(mousePos.x / gridSize) * gridSize,
      y: Math.round(mousePos.y / gridSize) * gridSize,
    };
    checkPoint(gridPoint);

    // 2. Snap to Vertices
    shapes.forEach(shape => {
      const layer = layers.find(l => l.id === shape.layerId);
      if (!layer || !layer.visible) return;

      switch (shape.type) {
        case Tool.LINE:
          checkPoint(shape.p1);
          checkPoint(shape.p2);
          checkPoint({ x: (shape.p1.x + shape.p2.x) / 2, y: (shape.p1.y + shape.p2.y) / 2 }); // Midpoint
          break;
        case Tool.RECTANGLE:
        case Tool.IMAGE:
          const r = shape as RectangleShape | ImageShape;
          const p1 = { x: r.x, y: r.y };
          const p2 = { x: r.x + r.width, y: r.y };
          const p3 = { x: r.x + r.width, y: r.y + r.height };
          const p4 = { x: r.x, y: r.y + r.height };
          checkPoint(p1); checkPoint(p2); checkPoint(p3); checkPoint(p4);
          checkPoint({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }); // Top mid
          checkPoint({ x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 }); // Right mid
          checkPoint({ x: (p3.x + p4.x) / 2, y: (p3.y + p4.y) / 2 }); // Bottom mid
          checkPoint({ x: (p4.x + p1.x) / 2, y: (p4.y + p1.y) / 2 }); // Left mid
          break;
        case Tool.CIRCLE:
          checkPoint({ x: shape.cx, y: shape.cy });
          break;
        case Tool.ARC:
          checkPoint({ x: shape.cx, y: shape.cy });
          checkPoint(polarToCartesian(shape.cx, shape.cy, shape.r, shape.startAngle));
          checkPoint(polarToCartesian(shape.cx, shape.cy, shape.r, shape.endAngle));
          break;
        case Tool.POLYLINE:
          shape.points.forEach(checkPoint);
          for (let i = 0; i < shape.points.length - 1; i++) {
              const pA = shape.points[i];
              const pB = shape.points[i+1];
              checkPoint({ x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 }); // Segment midpoints
          }
          break;
      }
    });

    if (bestSnapPoint) {
      return { snappedPoint: bestSnapPoint, indicator: bestSnapPoint };
    }

    return { snappedPoint: mousePos, indicator: null };
  };

  const createExtrusionShapes = (baseShape: Shape, height: number): Shape[] => {
    if (baseShape.type !== Tool.RECTANGLE) return [];

    const rect = baseShape as RectangleShape;
    const newShapes: Shape[] = [];
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
        layerId: baseShape.layerId,
        color: '#FFFFFF',
        strokeWidth: baseShape.strokeWidth,
        rotation: 0,
    };

    const frontFace: PolylineShape = { ...commonProps, id: `shape_${Date.now()}_f`, type: Tool.POLYLINE, points: [p1, p2, p3, p4, p1] };
    const backFace: PolylineShape = { ...commonProps, id: `shape_${Date.now()}_b`, type: Tool.POLYLINE, points: [p1_, p2_, p3_, p4_, p1_] };
    const line1: LineShape = { ...commonProps, id: `shape_${Date.now()}_l1`, type: Tool.LINE, p1, p2: p1_ };
    const line2: LineShape = { ...commonProps, id: `shape_${Date.now()}_l2`, type: Tool.LINE, p1: p2, p2: p2_ };
    const line3: LineShape = { ...commonProps, id: `shape_${Date.now()}_l3`, type: Tool.LINE, p1: p3, p2: p3_ };
    const line4: LineShape = { ...commonProps, id: `shape_${Date.now()}_l4`, type: Tool.LINE, p1: p4, p2: p4_ };

    newShapes.push(frontFace, backFace, line1, line2, line3, line4);
    return newShapes;
  }

  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    let pos = getMousePos(svgRef.current, e);
    const { snappedPoint } = getSnapPoint(pos);
    pos = snappedPoint;
    
    if (activeTool === Tool.FILLET) {
        if (e.target instanceof SVGElement && (e.target as SVGElement).id.startsWith('shape_')) {
            const targetId = (e.target as SVGElement).id;
            const shapeToFillet = shapes.find(s => s.id === targetId);
            if (shapeToFillet && shapeToFillet.type === Tool.RECTANGLE) {
                const radiusStr = prompt("Enter fillet radius:", `${(shapeToFillet as RectangleShape).rx || 10}`);
                if (radiusStr) {
                    const radius = parseFloat(radiusStr);
                    if (!isNaN(radius) && radius >= 0) {
                        const maxRadius = Math.min(shapeToFillet.width, shapeToFillet.height) / 2;
                        const finalRadius = Math.min(radius, maxRadius);
                        updateShape({ ...shapeToFillet, rx: finalRadius, ry: finalRadius });
                    }
                }
            }
        }
        return;
    }

    if (activeTool === Tool.TEXT) {
        const content = prompt("Enter text:");
        if (content) {
            const fontSizeStr = prompt("Enter font size:", "16");
            const fontSize = fontSizeStr ? parseInt(fontSizeStr, 10) : 16;
            if (!isNaN(fontSize) && fontSize > 0) {
                const newShape: TextShape = {
                    id: `shape_${Date.now()}`,
                    type: Tool.TEXT,
                    x: pos.x,
                    y: pos.y,
                    content,
                    fontSize,
                    layerId: activeLayer.id,
                    color: activeLayer.color,
                    strokeWidth: 0,
                    rotation: 0,
                };
                addShape(newShape);
            }
        }
        return;
    }

    if (activeTool === Tool.EXTRUDE) {
        if (!isExtruding) {
            if (e.target instanceof SVGElement && (e.target as SVGElement).id.startsWith('shape_')) {
                const targetId = (e.target as SVGElement).id;
                const selected = shapes.find(s => s.id === targetId);
                if (selected && selected.type === Tool.RECTANGLE) {
                    setIsExtruding(true);
                    setShapeToExtrude(selected);
                    setExtrusionStartPoint(pos);
                    setSelectedShapeId(selected.id);
                }
            }
        } else if (shapeToExtrude && extrusionStartPoint) { // Finalize extrusion
            const height = extrusionStartPoint.y - pos.y;
            const newShapes = createExtrusionShapes(shapeToExtrude, height);
            if (newShapes.length > 0) {
                extrudeShape(shapeToExtrude.id, newShapes);
            }
            // Reset state
            setIsExtruding(false);
            setShapeToExtrude(null);
            setExtrusionStartPoint(null);
            setExtrusionPreviewShapes([]);
        }
        return;
    }

    if (activeTool === Tool.PRESS_PULL) {
        if (e.target instanceof SVGElement && (e.target as SVGElement).id.startsWith('shape_')) {
            const targetId = (e.target as SVGElement).id;
            const selected = shapes.find(s => s.id === targetId);
            if (selected && selected.type === Tool.POLYLINE) {
                const extrudedObject = findExtrudedObject(selected as PolylineShape, shapes);
                if (extrudedObject) {
                    setIsPressPulling(true);
                    setPressPullObject(extrudedObject);
                    setPressPullStartPoint(pos);
        
                    const idsToHide = [
                        extrudedObject.faceA.id,
                        ...extrudedObject.connectors.map(c => c.id)
                    ];
                    setHiddenShapeIds(new Set(idsToHide));
        
                    setPreviewShapes([
                        extrudedObject.faceA,
                        ...extrudedObject.connectors
                    ]);
                }
            }
        }
        return;
    }

    if (activeTool === Tool.ERASE) {
        if (e.target instanceof SVGElement && (e.target as SVGElement).id.startsWith('shape_')) {
            deleteShape((e.target as SVGElement).id);
        }
        return;
    }

    if (activeTool === Tool.PAN) {
        setIsDrawing(true);
        setPanStart(pos);
        return;
    }
    
    if (activeTool === Tool.MOVE) {
        if (selectedShapeId) {
            setIsMoving(true);
            setMoveStartPoint(pos);
        }
        return;
    }

    if (activeTool === Tool.SCALE) {
        if (e.target instanceof SVGElement && (e.target as SVGElement).id.startsWith('shape_')) {
            const targetId = (e.target as SVGElement).id;
            setSelectedShapeId(targetId);
            const shapeToScale = shapes.find(s => s.id === targetId);
            if (shapeToScale) {
                setIsScaling(true);
                setOriginalShapeForScaling(shapeToScale);
                setStartPoint(pos);
            }
        } else {
            setSelectedShapeId(null);
        }
        return;
    }

    if (activeTool === Tool.ROTATE) {
        if (e.target instanceof SVGElement && (e.target as SVGElement).id.startsWith('shape_')) {
            const targetId = (e.target as SVGElement).id;
            setSelectedShapeId(targetId);
            const shapeToRotate = shapes.find(s => s.id === targetId);
            if (shapeToRotate) {
                setIsRotating(true);
                setOriginalShapeForRotation(shapeToRotate);
                setStartPoint(pos);
            }
        }
        return;
    }
    
    if (activeTool === Tool.COPY) {
        if (e.target instanceof SVGElement && (e.target as SVGElement).id.startsWith('shape_')) {
            const targetId = (e.target as SVGElement).id;
            const shapeToCopy = shapes.find(s => s.id === targetId);
            if (shapeToCopy) {
                setSelectedShapeId(targetId);
                setIsCopying(true);
                setStartPoint(pos);
                setCurrentShape(JSON.parse(JSON.stringify(shapeToCopy)));
            }
        }
        return;
    }

    if (activeTool === Tool.MIRROR) {
        if (selectedShapeId) {
            if (!mirrorLineStart) {
                setMirrorLineStart(pos);
            } else {
                const shapeToMirror = shapes.find(s => s.id === selectedShapeId);
                if (shapeToMirror) {
                    const mirroredShape = JSON.parse(JSON.stringify(shapeToMirror)) as Shape;
                    mirroredShape.id = `shape_${Date.now()}`;

                    const reflectPoint = (p: Point, p1: Point, p2: Point): Point => {
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        if (dx === 0 && dy === 0) return p;
                        const a = (dx * dx - dy * dy) / (dx * dx + dy * dy);
                        const b = 2 * dx * dy / (dx * dx + dy * dy);
                        const x = a * (p.x - p1.x) + b * (p.y - p1.y) + p1.x;
                        const y = b * (p.x - p1.x) - a * (p.y - p1.y) + p1.y;
                        return { x, y };
                    };
                    
                    switch(mirroredShape.type) {
                        case Tool.LINE:
                            (mirroredShape as LineShape).p1 = reflectPoint((mirroredShape as LineShape).p1, mirrorLineStart, pos);
                            (mirroredShape as LineShape).p2 = reflectPoint((mirroredShape as LineShape).p2, mirrorLineStart, pos);
                            break;
                        case Tool.RECTANGLE:
                        case Tool.IMAGE:
                        case Tool.TEXT:
                            const center = getShapeCenter(shapeToMirror);
                            const newCenter = reflectPoint(center, mirrorLineStart, pos);
                             if (mirroredShape.type === Tool.TEXT) {
                                (mirroredShape as TextShape).x = newCenter.x;
                                (mirroredShape as TextShape).y = newCenter.y;
                            } else {
                                (mirroredShape as RectangleShape | ImageShape).x = newCenter.x - (mirroredShape as RectangleShape | ImageShape).width / 2;
                                (mirroredShape as RectangleShape | ImageShape).y = newCenter.y - (mirroredShape as RectangleShape | ImageShape).height / 2;
                            }
                            // This simplified version doesn't handle rotation flipping. A true mirror would be more complex.
                            break;
                        case Tool.CIRCLE:
                        case Tool.ARC:
                            const circleCenter = {x: (mirroredShape as CircleShape | ArcShape).cx, y: (mirroredShape as CircleShape | ArcShape).cy};
                            const newCircleCenter = reflectPoint(circleCenter, mirrorLineStart, pos);
                            (mirroredShape as CircleShape | ArcShape).cx = newCircleCenter.x;
                            (mirroredShape as CircleShape | ArcShape).cy = newCircleCenter.y;
                            break;
                        case Tool.POLYLINE:
                            (mirroredShape as PolylineShape).points = (mirroredShape as PolylineShape).points.map(p => reflectPoint(p, mirrorLineStart, pos));
                            break;
                    }
                    addShape(mirroredShape);
                }
                setMirrorLineStart(null);
                setMirrorLineEnd(null);
            }
        }
        return;
    }
    
    if (activeTool === Tool.SELECT) {
      if (e.target instanceof SVGElement && (e.target as SVGElement).id.startsWith('shape_')) {
        setSelectedShapeId((e.target as SVGElement).id);
      } else {
        setSelectedShapeId(null);
      }
      return;
    }
    
    if (activeTool === Tool.POLYLINE) {
        if (!isDrawing) {
            setIsDrawing(true);
            const newShape: PolylineShape = {
                id: `shape_${Date.now()}`,
                type: Tool.POLYLINE,
                points: [pos, pos],
                layerId: activeLayer.id,
                color: activeLayer.color,
                strokeWidth: 2,
                rotation: 0,
            };
            setCurrentShape(newShape);
        } else if (currentShape?.type === Tool.POLYLINE) {
            setCurrentShape({
                ...currentShape,
                points: [...currentShape.points, pos],
            });
        }
        return;
    }

    setIsDrawing(true);
    setStartPoint(pos);

    const newShape: Shape = {
      id: `shape_${Date.now()}`,
      type: activeTool,
      layerId: activeLayer.id,
      color: activeLayer.color,
      strokeWidth: 2,
      rotation: 0,
      ...getInitialShapeProps(activeTool, pos),
    } as Shape;

    setCurrentShape(newShape);
  };
  
  const getInitialShapeProps = (tool: Tool, pos: Point) => {
    switch (tool) {
        case Tool.LINE:
            return { p1: pos, p2: pos };
        case Tool.RECTANGLE:
            return { x: pos.x, y: pos.y, width: 0, height: 0, rx: 0, ry: 0 };
        case Tool.CIRCLE:
            return { cx: pos.x, cy: pos.y, r: 0 };
        case Tool.ARC:
            return { cx: pos.x, cy: pos.y, r: 0, startAngle: 0, endAngle: 180 };
        default:
            return {};
    }
  };


  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    let pos = getMousePos(svgRef.current, e);
    setCoords({ x: parseFloat(pos.x.toFixed(2)), y: parseFloat(pos.y.toFixed(2)) });
    
    const { snappedPoint, indicator } = getSnapPoint(pos);
    pos = snappedPoint;
    setSnapIndicator(indicator);

    if (isExtruding && extrusionStartPoint && shapeToExtrude) {
        const height = extrusionStartPoint.y - pos.y;
        const previewShapes = createExtrusionShapes(shapeToExtrude, height);
        setExtrusionPreviewShapes(previewShapes);
        return;
    }

    if (isPressPulling && pressPullObject && pressPullStartPoint) {
        const { faceA, connectors, extrusionVector } = pressPullObject;

        const mouseDelta = { x: pos.x - pressPullStartPoint.x, y: pos.y - pressPullStartPoint.y };

        const updatedFaceA = JSON.parse(JSON.stringify(faceA)) as PolylineShape;
        updatedFaceA.points = updatedFaceA.points.map(p => ({ x: p.x + mouseDelta.x, y: p.y + mouseDelta.y }));

        const updatedConnectors = connectors.map(conn => {
            const updatedConn = JSON.parse(JSON.stringify(conn)) as LineShape;
            const isP1OnFaceA = faceA.points.some(p => arePointsEqual(p, conn.p1));
            
            if (isP1OnFaceA) {
                updatedConn.p1 = { x: conn.p1.x + mouseDelta.x, y: conn.p1.y + mouseDelta.y };
            } else {
                updatedConn.p2 = { x: conn.p2.x + mouseDelta.x, y: conn.p2.y + mouseDelta.y };
            }
            return updatedConn;
        });
        setPreviewShapes([updatedFaceA, ...updatedConnectors]);
        return;
    }

    if (isDrawing && orthoEnabled && (currentShape?.type === Tool.LINE || currentShape?.type === Tool.POLYLINE)) {
        let referencePoint: Point | null = null;
        if (currentShape.type === Tool.LINE && startPoint) {
            referencePoint = startPoint;
        } else if (currentShape.type === Tool.POLYLINE) {
            const points = (currentShape as PolylineShape).points;
            if (points.length >= 2) {
                referencePoint = points[points.length - 2];
            }
        }

        if (referencePoint) {
            const dx = Math.abs(pos.x - referencePoint.x);
            const dy = Math.abs(pos.y - referencePoint.y);

            if (dx > dy) {
                pos.y = referencePoint.y; // Snap horizontally
            } else {
                pos.x = referencePoint.x; // Snap vertically
            }
        }
    }


    if (activeTool === Tool.PAN && isDrawing && panStart) {
        const dx = pos.x - panStart.x;
        const dy = pos.y - panStart.y;
        setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
        return;
    }

    if (isDrawing && currentShape?.type === Tool.LINE && startPoint) {
        const dx = pos.x - startPoint.x;
        const dy = pos.y - startPoint.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        setDrawingInfo({ length, angle });
    } else if (drawingInfo) {
        setDrawingInfo(null);
    }

    if (isScaling && startPoint && originalShapeForScaling) {
        const center = getShapeCenter(originalShapeForScaling);
        const initialDx = startPoint.x - center.x;
        const initialDy = startPoint.y - center.y;
        const initialDist = Math.sqrt(initialDx * initialDx + initialDy * initialDy);
        if (initialDist === 0) return;
        const currentDx = pos.x - center.x;
        const currentDy = pos.y - center.y;
        const currentDist = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
        const scaleFactor = currentDist / initialDist;
        let scaledShape = { ...originalShapeForScaling } as Shape;
        
        switch (scaledShape.type) {
            case Tool.RECTANGLE:
            case Tool.IMAGE:
                const originalWidth = (originalShapeForScaling as RectangleShape | ImageShape).width;
                const originalHeight = (originalShapeForScaling as RectangleShape | ImageShape).height;
                (scaledShape as RectangleShape | ImageShape).width = originalWidth * scaleFactor;
                (scaledShape as RectangleShape | ImageShape).height = originalHeight * scaleFactor;
                (scaledShape as RectangleShape | ImageShape).x = center.x - (scaledShape as RectangleShape | ImageShape).width / 2;
                (scaledShape as RectangleShape | ImageShape).y = center.y - (scaledShape as RectangleShape | ImageShape).height / 2;
                break;
            case Tool.CIRCLE:
            case Tool.ARC:
                (scaledShape as CircleShape | ArcShape).r = (originalShapeForScaling as CircleShape | ArcShape).r * scaleFactor;
                break;
            case Tool.LINE:
                const origLine = originalShapeForScaling as LineShape;
                const p1Vec = { x: origLine.p1.x - center.x, y: origLine.p1.y - center.y };
                const p2Vec = { x: origLine.p2.x - center.x, y: origLine.p2.y - center.y };
                scaledShape.p1 = { x: center.x + p1Vec.x * scaleFactor, y: center.y + p1Vec.y * scaleFactor };
                scaledShape.p2 = { x: center.x + p2Vec.x * scaleFactor, y: center.y + p2Vec.y * scaleFactor };
                break;
            case Tool.POLYLINE:
                const origPoly = originalShapeForScaling as PolylineShape;
                scaledShape.points = origPoly.points.map(p => {
                    const vec = { x: p.x - center.x, y: p.y - center.y };
                    return { x: center.x + vec.x * scaleFactor, y: center.y + vec.y * scaleFactor };
                });
                break;
            case Tool.TEXT:
                (scaledShape as TextShape).fontSize = (originalShapeForScaling as TextShape).fontSize * scaleFactor;
                break;
        }
        updateShape(scaledShape);
        return;
    }
    
    if (isRotating && startPoint && originalShapeForRotation) {
        const center = getShapeCenter(originalShapeForRotation);
        const startAngleRad = Math.atan2(startPoint.y - center.y, startPoint.x - center.x);
        const currentAngleRad = Math.atan2(pos.y - center.y, pos.x - center.x);
        const angleDiffDeg = (currentAngleRad - startAngleRad) * (180 / Math.PI);
        const rotatedShape = { ...originalShapeForRotation, rotation: originalShapeForRotation.rotation + angleDiffDeg };
        updateShape(rotatedShape);
        return;
    }
    
    if (isCopying && currentShape && startPoint) {
        const dx = pos.x - startPoint.x;
        const dy = pos.y - startPoint.y;
        const originalShape = shapes.find(s => s.id === selectedShapeId);
        if (!originalShape) return;
        
        const movedShape = JSON.parse(JSON.stringify(originalShape));
        movedShape.id = currentShape.id;

        switch (movedShape.type) {
            case Tool.LINE:
                (movedShape as LineShape).p1 = { x: (movedShape as LineShape).p1.x + dx, y: (movedShape as LineShape).p1.y + dy };
                (movedShape as LineShape).p2 = { x: (movedShape as LineShape).p2.x + dx, y: (movedShape as LineShape).p2.y + dy };
                break;
            case Tool.RECTANGLE:
            case Tool.IMAGE:
            case Tool.TEXT:
                if (movedShape.type === Tool.TEXT) {
                    (movedShape as TextShape).x += dx;
                    (movedShape as TextShape).y += dy;
                } else {
                    (movedShape as RectangleShape | ImageShape).x += dx;
                    (movedShape as RectangleShape | ImageShape).y += dy;
                }
                break;
            case Tool.CIRCLE:
            case Tool.ARC:
                (movedShape as CircleShape | ArcShape).cx += dx;
                (movedShape as CircleShape | ArcShape).cy += dy;
                break;
            case Tool.POLYLINE:
                (movedShape as PolylineShape).points = (movedShape as PolylineShape).points.map((p: Point) => ({ x: p.x + dx, y: p.y + dy }));
                break;
        }
        setCurrentShape(movedShape);
        return;
    }
    
    if (activeTool === Tool.MIRROR && mirrorLineStart) {
        setMirrorLineEnd(pos);
    }

    if (isMoving && moveStartPoint && selectedShapeId) {
      const selectedShape = shapes.find(s => s.id === selectedShapeId);
      if (!selectedShape) return;
      
      const dx = pos.x - moveStartPoint.x;
      const dy = pos.y - moveStartPoint.y;

      let movedShape = { ...selectedShape } as Shape;
      switch (movedShape.type) {
        case Tool.LINE:
          (movedShape as LineShape).p1 = { x: (movedShape as LineShape).p1.x + dx, y: (movedShape as LineShape).p1.y + dy };
          (movedShape as LineShape).p2 = { x: (movedShape as LineShape).p2.x + dx, y: (movedShape as LineShape).p2.y + dy };
          break;
        case Tool.RECTANGLE:
        case Tool.IMAGE:
        case Tool.TEXT:
          if (movedShape.type === Tool.TEXT) {
              (movedShape as TextShape).x += dx;
              (movedShape as TextShape).y += dy;
          } else {
              (movedShape as RectangleShape | ImageShape).x += dx;
              (movedShape as RectangleShape | ImageShape).y += dy;
          }
          break;
        case Tool.CIRCLE:
        case Tool.ARC:
          (movedShape as CircleShape | ArcShape).cx += dx;
          (movedShape as CircleShape | ArcShape).cy += dy;
          break;
        case Tool.POLYLINE:
          (movedShape as PolylineShape).points = (movedShape as PolylineShape).points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          break;
      }
      updateShape(movedShape);
      setMoveStartPoint(pos);
      return;
    }

    if (!isDrawing) return;
    
    if (currentShape?.type === Tool.POLYLINE) {
        const updatedPoints = [...(currentShape as PolylineShape).points];
        updatedPoints[updatedPoints.length - 1] = pos;
        setCurrentShape({ ...currentShape, points: updatedPoints });
        return;
    }

    if (!currentShape || !startPoint) return;
    
    let updatedShape = { ...currentShape } as Shape;
    switch (updatedShape.type) {
      case Tool.LINE:
        (updatedShape as LineShape).p2 = pos;
        break;
      case Tool.RECTANGLE:
        const rect = updatedShape as RectangleShape;
        rect.x = Math.min(pos.x, startPoint.x);
        rect.y = Math.min(pos.y, startPoint.y);
        rect.width = Math.abs(pos.x - startPoint.x);
        rect.height = Math.abs(pos.y - startPoint.y);
        break;
      case Tool.CIRCLE:
      case Tool.ARC:
        const dx = pos.x - startPoint.x;
        const dy = pos.y - startPoint.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        (updatedShape as CircleShape | ArcShape).r = radius;
        break;
    }
    setCurrentShape(updatedShape);
  };

  const handleMouseUp = () => {
    if (activeTool === Tool.PAN) {
        setIsDrawing(false);
        setPanStart(null);
    }
    
    if (isMoving) {
        setIsMoving(false);
        setMoveStartPoint(null);
    }
    
    if (isScaling) {
        setIsScaling(false);
        setStartPoint(null);
        setOriginalShapeForScaling(null);
    }
    
    if (isRotating) {
        setIsRotating(false);
        setOriginalShapeForRotation(null);
        setStartPoint(null);
    }

    if (isCopying && currentShape) {
        const newShape = {...currentShape, id: `shape_${Date.now()}`};
        addShape(newShape);
        setIsCopying(false);
        setCurrentShape(null);
        setStartPoint(null);
    }

    if (isPressPulling) {
        updateShapes(previewShapes); 
        setIsPressPulling(false);
        setPressPullObject(null);
        setPressPullStartPoint(null);
        setPreviewShapes([]);
        setHiddenShapeIds(new Set());
    }

    if (activeTool === Tool.EXTRUDE && isExtruding) {
        // This is the first click, don't do anything on mouse up.
        // The second click to finalize is handled in mouseDown.
        return;
    }
    if (activeTool === Tool.MIRROR) {
        // No action on mouse up, wait for second click
    } else if (activeTool === Tool.POLYLINE) {
        // No action on mouse up, wait for escape or another click
    } else if (currentShape) {
      if (
        (currentShape.type === Tool.RECTANGLE && ((currentShape as RectangleShape).width === 0 || (currentShape as RectangleShape).height === 0)) ||
        (currentShape.type === Tool.LINE && (currentShape as LineShape).p1.x === (currentShape as LineShape).p2.x && (currentShape as LineShape).p1.y === (currentShape as LineShape).p2.y) ||
        ((currentShape.type === Tool.CIRCLE || currentShape.type === Tool.ARC) && (currentShape as CircleShape | ArcShape).r === 0)
      ) {
         // It's just a click, don't add shape
      } else {
        addShape(currentShape);
      }
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentShape(null);
    }
    
    setDrawingInfo(null);
    setSnapIndicator(null);
  };

  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      e.preventDefault();
      
      const pos = getMousePos(svgRef.current, e as any);
      const zoomFactor = 1.1;
      const newViewBox = { ...viewBox };

      if (e.deltaY < 0) { // Zoom in
          newViewBox.w /= zoomFactor;
          newViewBox.h /= zoomFactor;
      } else { // Zoom out
          newViewBox.w *= zoomFactor;
          newViewBox.h *= zoomFactor;
      }

      newViewBox.x = pos.x - (pos.x - viewBox.x) * (newViewBox.w / viewBox.w);
      newViewBox.y = pos.y - (pos.y - viewBox.y) * (newViewBox.h / viewBox.h);
      
      setViewBox(newViewBox);
  };

  const getTouchPos = (svg: SVGSVGElement, touch: React.Touch): Point => {
      const CTM = svg.getScreenCTM();
      if (CTM) {
          return {
              x: (touch.clientX - CTM.e) / CTM.a,
              y: (touch.clientY - CTM.f) / CTM.d,
          };
      }
      return { x: 0, y: 0 };
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;

      if (e.touches.length === 2) {
          e.preventDefault();
          touchState.isTwoFinger = true;
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const dx = t1.clientX - t2.clientX;
          const dy = t1.clientY - t2.clientY;
          touchState.lastDist = Math.sqrt(dx * dx + dy * dy);
          
          const p1 = getTouchPos(svgRef.current, t1);
          const p2 = getTouchPos(svgRef.current, t2);
          touchState.lastMidpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

      } else if (e.touches.length === 1) {
          touchState.isTwoFinger = false;
          const touch = e.touches[0];
          // Simulate mouse down
          handleMouseDown({
              ...e,
              clientX: touch.clientX,
              clientY: touch.clientY,
          } as any);
      }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;

      if (e.touches.length === 2 && touchState.isTwoFinger) {
            e.preventDefault();
          const t1 = e.touches[0];
          const t2 = e.touches[1];
          const dx = t1.clientX - t2.clientX;
          const dy = t1.clientY - t2.clientY;
          const currentDist = Math.sqrt(dx*dx + dy*dy);
          
          const p1 = getTouchPos(svgRef.current, t1);
          const p2 = getTouchPos(svgRef.current, t2);
          const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

          if (touchState.lastDist && touchState.lastMidpoint) {
              // Zoom
              const scale = touchState.lastDist / currentDist;
              const newViewBox = {...viewBox};
              newViewBox.w = viewBox.w * scale;
              newViewBox.h = viewBox.h * scale;
              newViewBox.x = midpoint.x - (midpoint.x - viewBox.x) * scale;
              newViewBox.y = midpoint.y - (midpoint.y - viewBox.y) * scale;

              // Pan
              const panDx = touchState.lastMidpoint.x - midpoint.x;
              const panDy = touchState.lastMidpoint.y - midpoint.y;
              newViewBox.x += panDx;
              newViewBox.y += panDy;
              
              setViewBox(newViewBox);
          }

          touchState.lastDist = currentDist;
          touchState.lastMidpoint = midpoint;

      } else if (e.touches.length === 1 && !touchState.isTwoFinger) {
          const touch = e.touches[0];
          // Simulate mouse move
            handleMouseMove({
              ...e,
              clientX: touch.clientX,
              clientY: touch.clientY,
          } as any);
      }
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length < 2) {
            touchState.isTwoFinger = false;
            touchState.lastDist = null;
            touchState.lastMidpoint = null;
      }
      if (e.touches.length === 0) {
          // Simulate mouse up
          handleMouseUp();
      }
  };

  const renderShape = (shape: Shape) => {
    if (hiddenShapeIds.has(shape.id)) return null;

    const isSelected = shape.id === selectedShapeId;
    const layer = layers.find(l => l.id === shape.layerId);
    if (layer && !layer.visible) return null;
    const color = layer ? layer.color : '#FFFFFF';
    const center = getShapeCenter(shape);

    const props: any = {
      key: shape.id,
      id: shape.id,
      stroke: isSelected ? '#3b82f6' : color,
      strokeWidth: shape.strokeWidth + (isSelected ? 1.5 : 0),
      fill: 'none',
      transform: `rotate(${shape.rotation || 0} ${center.x} ${center.y})`,
    };

    switch (shape.type) {
      case Tool.LINE:
        const line = shape as LineShape;
        return <line x1={line.p1.x} y1={line.p1.y} x2={line.p2.x} y2={line.p2.y} {...props} />;
      case Tool.RECTANGLE:
        const rect = shape as RectangleShape;
        return <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} rx={rect.rx} ry={rect.ry} {...props} />;
      case Tool.CIRCLE:
        const circle = shape as CircleShape;
        return <circle cx={circle.cx} cy={circle.cy} r={circle.r} {...props} />;
      case Tool.ARC:
        const arc = shape as ArcShape;
        return <path d={describeArc(arc.cx, arc.cy, arc.r, arc.startAngle, arc.endAngle)} {...props} />;
      case Tool.POLYLINE:
        const poly = shape as PolylineShape;
        const pointsString = poly.points.map(p => `${p.x},${p.y}`).join(' ');
        return <polyline points={pointsString} {...props} />;
      case Tool.IMAGE: {
        const img = shape as ImageShape;
        const transform = `rotate(${img.rotation || 0} ${center.x} ${center.y})`;
        return (
            <g key={img.id}>
                <image 
                    href={img.href}
                    x={img.x}
                    y={img.y}
                    width={img.width}
                    height={img.height}
                    transform={transform}
                    style={{pointerEvents: 'none'}}
                />
                <rect 
                    id={img.id}
                    x={img.x} 
                    y={img.y}
                    width={img.width}
                    height={img.height}
                    transform={transform}
                    fill="transparent"
                    stroke={isSelected ? '#3b82f6' : 'none'}
                    strokeWidth="2"
                />
            </g>
        );
      }
      case Tool.TEXT: {
        const text = shape as TextShape;
        // Override some props for text
        const textProps = {
            ...props,
            stroke: 'none',
            fill: isSelected ? '#3b82f6' : color,
            fontSize: text.fontSize,
            // Dominant baseline helps align text vertically to the 'y' coordinate
            dominantBaseline: "middle",
            textAnchor: "start"
        };
        return <text x={text.x} y={text.y} {...textProps}>{text.content}</text>;
      }
      default:
        return null;
    }
  };

  const renderDimensions = (shape: Shape, zoomFactor: number) => {
    if (shape.id === selectedShapeId) return null; // Don't show dimensions for selected shape to reduce clutter

    const FONT_SIZE = 10 * zoomFactor;
    const OFFSET = 15 * zoomFactor;
    const EXTENSION = 5 * zoomFactor;
    const COLOR = "#a1a1aa"; // Zinc-400, for a subtle look

    const center = getShapeCenter(shape);

    const dimensionGroupProps = {
        stroke: COLOR,
        fill: COLOR,
        fontSize: FONT_SIZE,
        fontFamily: "sans-serif",
        textAnchor: "middle" as const,
        transform: `rotate(${shape.rotation || 0} ${center.x} ${center.y})`,
        style: { pointerEvents: 'none' as const }
    };

    const formatDim = (val: number) => val.toFixed(1);

    switch (shape.type) {
        case Tool.LINE: {
            const line = shape as LineShape;
            const length = Math.sqrt(Math.pow(line.p2.x - line.p1.x, 2) + Math.pow(line.p2.y - line.p1.y, 2));
            if (length < OFFSET) return null;

            const angleRad = Math.atan2(line.p2.y - line.p1.y, line.p2.x - line.p1.x);
            let angleDeg = angleRad * 180 / Math.PI;

            const midX = (line.p1.x + line.p2.x) / 2;
            const midY = (line.p1.y + line.p2.y) / 2;
            
            const offsetX = OFFSET * Math.sin(angleRad);
            const offsetY = OFFSET * -Math.cos(angleRad);

            const textX = midX + offsetX;
            const textY = midY + offsetY;
            
            // Flip text if it's upside down
            if (angleDeg > 90 || angleDeg < -90) {
              angleDeg += 180;
            }

            return (
                <g {...dimensionGroupProps}>
                    <text x={textX} y={textY} transform={`rotate(${angleDeg}, ${textX}, ${textY})`} dominantBaseline="alphabetic">
                        {formatDim(length)}
                    </text>
                </g>
            );
        }
        case Tool.RECTANGLE: {
            const rect = shape as RectangleShape;
            if (rect.width < 1 || rect.height < 1) return null;
            
            return (
                <g {...dimensionGroupProps}>
                    {/* Width */}
                    {rect.width > FONT_SIZE * 3 &&
                      <text x={rect.x + rect.width / 2} y={rect.y + rect.height + OFFSET} dominantBaseline="hanging">{formatDim(rect.width)}</text>
                    }
                    {/* Height */}
                    {rect.height > FONT_SIZE * 3 &&
                      <text x={rect.x + rect.width + OFFSET} y={rect.y + rect.height / 2} transform={`rotate(90, ${rect.x + rect.width + OFFSET}, ${rect.y + rect.height / 2})`} dominantBaseline="middle">{formatDim(rect.height)}</text>
                    }
                </g>
            );
        }
        case Tool.CIRCLE:
        case Tool.ARC: {
            const circle = shape as CircleShape | ArcShape;
            if (circle.r < 1) return null;
            // FIX: Explicitly cast shape to ArcShape to access startAngle and endAngle, which are not on CircleShape.
            const angle = shape.type === Tool.ARC ? ((shape as ArcShape).startAngle + (shape as ArcShape).endAngle) / 2 : 45;
            const edgePoint = polarToCartesian(circle.cx, circle.cy, circle.r, angle);
            
            return (
                 <g {...dimensionGroupProps}>
                    <line x1={circle.cx} y1={circle.cy} x2={edgePoint.x} y2={edgePoint.y} strokeWidth={0.5 * zoomFactor} />
                    <text x={(circle.cx + edgePoint.x) / 2 + 5*zoomFactor} y={(circle.cy + edgePoint.y) / 2} dominantBaseline="middle" textAnchor="start">
                        R{formatDim(circle.r)}
                    </text>
                </g>
            )
        }
        default:
            return null;
    }
  };

  const clientWidth = svgRef.current?.clientWidth || 1;
  const zoomFactor = viewBox.w / clientWidth;

  return (
    <div className="h-full w-full bg-gray-900 cursor-crosshair" style={{ cursor: getCursor() }}>
      <svg
        ref={svgRef}
        className="h-full w-full"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(107, 114, 128, 0.3)" strokeWidth="0.5"/>
            </pattern>
        </defs>
        <rect width={viewBox.w} height={viewBox.h} x={viewBox.x} y={viewBox.y} fill="url(#grid)" />
        
        {shapes.map(shape => {
            const renderedShape = renderShape(shape);
            if (!renderedShape) return null; // Shape is not visible or hidden

            return (
                <React.Fragment key={shape.id}>
                    {renderedShape}
                    {renderDimensions(shape, zoomFactor)}
                </React.Fragment>
            );
        })}

        {currentShape && renderShape(currentShape)}
        
        {isCopying && currentShape && renderShape(currentShape)}

        {previewShapes.map(renderShape)}
        {extrusionPreviewShapes.map(renderShape)}
        
        {mirrorLineStart && mirrorLineEnd &&
            <line 
                x1={mirrorLineStart.x} y1={mirrorLineStart.y}
                x2={mirrorLineEnd.x} y2={mirrorLineEnd.y}
                stroke="#0ea5e9" strokeDasharray="5,5" strokeWidth={1 * zoomFactor}
            />
        }

        {snapIndicator && (
          <rect
            x={snapIndicator.x - 4 * zoomFactor}
            y={snapIndicator.y - 4 * zoomFactor}
            width={8 * zoomFactor}
            height={8 * zoomFactor}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={1 * zoomFactor}
          />
        )}

      </svg>
      {drawingInfo && (
        <div 
            className="absolute p-1 bg-gray-800 text-xs rounded-md pointer-events-none"
            style={{ left: (coords.x - viewBox.x) / viewBox.w * clientWidth + 20, top: (coords.y - viewBox.y) / viewBox.h * (svgRef.current?.clientHeight || 1) + 20 }}
        >
          <div>Length: {drawingInfo.length.toFixed(2)}</div>
          <div>Angle: {drawingInfo.angle.toFixed(2)}°</div>
        </div>
      )}
    </div>
  );
};

export default Canvas;
const arePointsEqual = (p1: Point, p2: Point) => p1.x === p2.x && p1.y === p2.y;
const findExtrudedObject = (face: PolylineShape, allShapes: Shape[]) => { return null; }; // Simplified
