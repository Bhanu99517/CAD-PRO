
import React, { useState, useRef, MouseEvent, useEffect } from 'react';
import { Tool, Shape, Point, LineShape, RectangleShape, CircleShape, PolylineShape, Layer, ImageShape, ArcShape, TextShape, ViewMode } from '../types';
import { getShapeCenter, polarToCartesian, getShapeBoundingBox, doBBoxesIntersect } from '../utils';

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
  deleteShapes,
  selectedShapeIds,
  setSelectedShapeIds,
  activeLayer,
  layers,
  setCoords,
  snapEnabled,
  orthoEnabled,
  extrudeShape,
  coords,
  viewBox,
  setViewBox,
  gridVisible,
  viewMode,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [panStart, setPanStart] = useState<Point | null>(null);
  
  const [marquee, setMarquee] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);

  const [isMoving, setIsMoving] = useState(false);
  const [moveStartPoint, setMoveStartPoint] = useState<Point | null>(null);
  const [originalShapesForMove, setOriginalShapesForMove] = useState<Shape[]>([]);
  
  const [isScaling, setIsScaling] = useState(false);
  const [originalShapesForScaling, setOriginalShapesForScaling] = useState<Shape[]>([]);

  const [isRotating, setIsRotating] = useState(false);
  const [originalShapesForRotation, setOriginalShapesForRotation] = useState<Shape[]>([]);
  const [rotationCenter, setRotationCenter] = useState<Point | null>(null);

  const [isCopying, setIsCopying] = useState(false);
  
  const [mirrorLineStart, setMirrorLineStart] = useState<Point | null>(null);
  const [mirrorLineEnd, setMirrorLineEnd] = useState<Point | null>(null);
  
  const [snapIndicator, setSnapIndicator] = useState<Point | null>(null);
  
  const [drawingInfo, setDrawingInfo] = useState<{ length: number; angle: number } | null>(null);

  const [isExtruding, setIsExtruding] = useState(false);
  const [extrusionStartPoint, setExtrusionStartPoint] = useState<Point | null>(null);
  const [shapeToExtrude, setShapeToExtrude] = useState<Shape | null>(null);
  const [extrusionPreviewShapes, setExtrusionPreviewShapes] = useState<Shape[]>([]);

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
  
  const [projectionCenter, setProjectionCenter] = useState<Point>({ x: 0, y: 0 });

  const touchState = useRef<{
    lastDist: number | null,
    lastMidpoint: Point | null,
    isTwoFinger: boolean
  }>({ lastDist: null, lastMidpoint: null, isTwoFinger: false }).current;

  useEffect(() => {
    if (shapes.length === 0) {
        setProjectionCenter({ x: viewBox.x + viewBox.w / 2, y: viewBox.y + viewBox.h / 2 });
        return;
    }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    shapes.forEach(shape => {
        const bbox = getShapeBoundingBox(shape);
        minX = Math.min(minX, bbox.minX);
        minY = Math.min(minY, bbox.minY);
        maxX = Math.max(maxX, bbox.maxX);
        maxY = Math.max(maxY, bbox.maxY);
    });
    if (isFinite(minX)) {
        setProjectionCenter({ x: (minX + maxX) / 2, y: (minY + maxY) / 2 });
    }
  }, [shapes, viewBox]);


  const projectPoint = (p: Point, center: Point): Point => {
    if (viewMode !== 'ISOMETRIC') return p;

    const centeredP = { x: p.x - center.x, y: p.y - center.y };
    
    // Oblique projection: scale Y, then rotate.
    const scaledX = centeredP.x;
    const scaledY = centeredP.y * 0.5;

    const angle = -45 * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const finalX = scaledX * cos - scaledY * sin;
    const finalY = scaledX * sin + scaledY * cos;
    
    return { x: finalX + center.x, y: finalY + center.y };
  };

  const unprojectPoint = (p: Point, center: Point): Point => {
    if (viewMode !== 'ISOMETRIC') return p;

    const centeredP = { x: p.x - center.x, y: p.y - center.y };
    
    // Inverse of projection: rotate by +45, then scale Y by 2.
    const angle = 45 * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const unrotatedX = centeredP.x * cos - centeredP.y * sin;
    const unrotatedY = centeredP.x * sin + centeredP.y * cos;
    
    const unscaledX = unrotatedX;
    const unscaledY = unrotatedY * 2;
    
    return { x: unscaledX + center.x, y: unscaledY + center.y };
  };
  
  const getMousePos = (e: MouseEvent<SVGSVGElement>): Point => {
      if (!svgRef.current) return { x: 0, y: 0 };
      const svgPoint = getInitialMousePos(svgRef.current, e);
      return unprojectPoint(svgPoint, projectionCenter);
  };


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            if (isDrawing && currentShape?.type === Tool.POLYLINE && currentShape.points.length > 1) {
                const finalPolyline = { ...currentShape };
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
                setSelectedShapeIds([]);
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
            setOriginalShapesForScaling([]);
            setIsRotating(false);
            setOriginalShapesForRotation([]);
            setIsCopying(false);
            setMirrorLineStart(null);
            setMirrorLineEnd(null);
            setDrawingInfo(null);
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedShapeIds.length > 0) {
                deleteShapes(selectedShapeIds);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, currentShape, addShape, selectedShapeIds, deleteShapes, isExtruding, isPressPulling]);
  
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
    let pos = getMousePos(e);
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
                    setSelectedShapeIds([selected.id]);
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
            deleteShapes([(e.target as SVGElement).id]);
        }
        return;
    }

    if (activeTool === Tool.PAN) {
        setIsDrawing(true);
        setPanStart(getInitialMousePos(svgRef.current!, e));
        return;
    }
    
    if (activeTool === Tool.MOVE) {
        if (selectedShapeIds.length > 0) {
            setIsMoving(true);
            setMoveStartPoint(pos);
            setOriginalShapesForMove(shapes.filter(s => selectedShapeIds.includes(s.id)));
        }
        return;
    }

    if (activeTool === Tool.SCALE) {
        if (selectedShapeIds.length > 0) {
            setIsScaling(true);
            setOriginalShapesForScaling(shapes.filter(s => selectedShapeIds.includes(s.id)));
            setStartPoint(pos);
        }
        return;
    }

    if (activeTool === Tool.ROTATE) {
        if (selectedShapeIds.length > 0) {
            setIsRotating(true);
            const shapesToRotate = shapes.filter(s => selectedShapeIds.includes(s.id));
            setOriginalShapesForRotation(shapesToRotate);
            setStartPoint(pos);

            // Calculate centroid of all selected shapes for rotation center
            let totalX = 0, totalY = 0, pointCount = 0;
            shapesToRotate.forEach(s => {
                const center = getShapeCenter(s);
                totalX += center.x;
                totalY += center.y;
                pointCount++;
            });
            if (pointCount > 0) {
                setRotationCenter({ x: totalX / pointCount, y: totalY / pointCount });
            }
        }
        return;
    }
    
    if (activeTool === Tool.COPY) {
        const shapeToCopy = shapes.find(s => s.id === selectedShapeIds[0]);
        if (shapeToCopy) {
            setIsCopying(true);
            setStartPoint(pos);
            setCurrentShape(JSON.parse(JSON.stringify(shapeToCopy)));
        }
        return;
    }

    if (activeTool === Tool.MIRROR) {
        if (selectedShapeIds.length > 0) {
            if (!mirrorLineStart) {
                setMirrorLineStart(pos);
            } else {
                const shapesToMirror = shapes.filter(s => selectedShapeIds.includes(s.id));
                const newShapes: Shape[] = [];

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
                
                shapesToMirror.forEach(shapeToMirror => {
                    const mirroredShape = JSON.parse(JSON.stringify(shapeToMirror)) as Shape;
                    mirroredShape.id = `shape_${Date.now()}_${Math.random()}`;

                    switch(mirroredShape.type) {
                        case Tool.LINE:
                            (mirroredShape as LineShape).p1 = reflectPoint((mirroredShape as LineShape).p1, mirrorLineStart, pos);
                            (mirroredShape as LineShape).p2 = reflectPoint((mirroredShape as LineShape).p2, mirrorLineStart, pos);
                            break;
                        case Tool.RECTANGLE: case Tool.IMAGE: case Tool.TEXT:
                            const center = getShapeCenter(shapeToMirror);
                            const newCenter = reflectPoint(center, mirrorLineStart, pos);
                             if (mirroredShape.type === Tool.TEXT) {
                                (mirroredShape as TextShape).x = newCenter.x;
                                (mirroredShape as TextShape).y = newCenter.y;
                            } else {
                                (mirroredShape as RectangleShape | ImageShape).x = newCenter.x - (mirroredShape as RectangleShape | ImageShape).width / 2;
                                (mirroredShape as RectangleShape | ImageShape).y = newCenter.y - (mirroredShape as RectangleShape | ImageShape).height / 2;
                            }
                            break;
                        case Tool.CIRCLE: case Tool.ARC:
                            const circleCenter = {x: (mirroredShape as CircleShape | ArcShape).cx, y: (mirroredShape as CircleShape | ArcShape).cy};
                            const newCircleCenter = reflectPoint(circleCenter, mirrorLineStart, pos);
                            (mirroredShape as CircleShape | ArcShape).cx = newCircleCenter.x;
                            (mirroredShape as CircleShape | ArcShape).cy = newCircleCenter.y;
                            break;
                        case Tool.POLYLINE:
                            (mirroredShape as PolylineShape).points = (mirroredShape as PolylineShape).points.map(p => reflectPoint(p, mirrorLineStart, pos));
                            break;
                    }
                    newShapes.push(mirroredShape);
                });
                if(newShapes.length > 0) updateShapes([...shapes, ...newShapes]);
                setMirrorLineStart(null);
                setMirrorLineEnd(null);
            }
        }
        return;
    }
    
    if (activeTool === Tool.SELECT) {
        const targetId = (e.target as SVGElement).id;
        if (targetId && targetId.startsWith('shape_')) {
            if (e.metaKey || e.ctrlKey) {
                setSelectedShapeIds(prev => 
                    prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId]
                );
            } else {
                setSelectedShapeIds([targetId]);
            }
        } else {
            // Start marquee selection
            setMarquee({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
            if (!(e.metaKey || e.ctrlKey)) {
                setSelectedShapeIds([]);
            }
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
    let pos = getMousePos(e);
    setCoords({ x: parseFloat(pos.x.toFixed(2)), y: parseFloat(pos.y.toFixed(2)) });
    
    const { snappedPoint, indicator } = getSnapPoint(pos);
    pos = snappedPoint;
    setSnapIndicator(indicator);

    if (activeTool === Tool.PAN && isDrawing && panStart) {
        const currentPanPos = getInitialMousePos(svgRef.current, e);
        const dx = currentPanPos.x - panStart.x;
        const dy = currentPanPos.y - panStart.y;
        setViewBox({ ...viewBox, x: viewBox.x - dx, y: viewBox.y - dy });
        return;
    }

    if (marquee) {
        setMarquee({ ...marquee, x2: pos.x, y2: pos.y });
        return;
    }

    if (isExtruding && extrusionStartPoint && shapeToExtrude) {
        const height = extrusionStartPoint.y - pos.y;
        const previewShapes = createExtrusionShapes(shapeToExtrude, height);
        setExtrusionPreviewShapes(previewShapes);
        return;
    }

    if (isPressPulling && pressPullObject && pressPullStartPoint) {
        const { faceA, connectors } = pressPullObject;
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
            if (dx > dy) pos.y = referencePoint.y; else pos.x = referencePoint.x;
        }
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

    if (isScaling && startPoint && originalShapesForScaling.length > 0) {
        const center = getShapeCenter(originalShapesForScaling[0]); // Simple center for now
        const initialDx = startPoint.x - center.x;
        const initialDy = startPoint.y - center.y;
        const initialDist = Math.sqrt(initialDx * initialDx + initialDy * initialDy);
        if (initialDist === 0) return;
        const currentDx = pos.x - center.x;
        const currentDy = pos.y - center.y;
        const currentDist = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
        const scaleFactor = currentDist / initialDist;

        const scaledShapes = originalShapesForScaling.map(originalShape => {
            let scaledShape = { ...originalShape } as Shape;
            const shapeCenter = getShapeCenter(originalShape);
            switch (scaledShape.type) {
                case Tool.RECTANGLE: case Tool.IMAGE:
                    (scaledShape as RectangleShape | ImageShape).width = (originalShape as RectangleShape | ImageShape).width * scaleFactor;
                    (scaledShape as RectangleShape | ImageShape).height = (originalShape as RectangleShape | ImageShape).height * scaleFactor;
                    (scaledShape as RectangleShape | ImageShape).x = shapeCenter.x - (scaledShape as RectangleShape | ImageShape).width / 2;
                    (scaledShape as RectangleShape | ImageShape).y = shapeCenter.y - (scaledShape as RectangleShape | ImageShape).height / 2;
                    break;
                case Tool.CIRCLE: case Tool.ARC:
                    (scaledShape as CircleShape | ArcShape).r = (originalShape as CircleShape | ArcShape).r * scaleFactor;
                    break;
                case Tool.LINE:
                    const p1Vec = { x: (originalShape as LineShape).p1.x - shapeCenter.x, y: (originalShape as LineShape).p1.y - shapeCenter.y };
                    const p2Vec = { x: (originalShape as LineShape).p2.x - shapeCenter.x, y: (originalShape as LineShape).p2.y - shapeCenter.y };
                    scaledShape.p1 = { x: shapeCenter.x + p1Vec.x * scaleFactor, y: shapeCenter.y + p1Vec.y * scaleFactor };
                    scaledShape.p2 = { x: shapeCenter.x + p2Vec.x * scaleFactor, y: shapeCenter.y + p2Vec.y * scaleFactor };
                    break;
                case Tool.POLYLINE:
                    scaledShape.points = (originalShape as PolylineShape).points.map(p => {
                        const vec = { x: p.x - shapeCenter.x, y: p.y - shapeCenter.y };
                        return { x: shapeCenter.x + vec.x * scaleFactor, y: shapeCenter.y + vec.y * scaleFactor };
                    });
                    break;
                case Tool.TEXT:
                    (scaledShape as TextShape).fontSize = (originalShape as TextShape).fontSize * scaleFactor;
                    break;
            }
            return scaledShape;
        });
        updateShapes(scaledShapes);
        return;
    }
    
    if (isRotating && startPoint && originalShapesForRotation.length > 0 && rotationCenter) {
        const startAngleRad = Math.atan2(startPoint.y - rotationCenter.y, startPoint.x - rotationCenter.x);
        const currentAngleRad = Math.atan2(pos.y - rotationCenter.y, pos.x - rotationCenter.x);
        const angleDiffDeg = (currentAngleRad - startAngleRad) * (180 / Math.PI);
        const rotatedShapes = originalShapesForRotation.map(originalShape => {
            return { ...originalShape, rotation: originalShape.rotation + angleDiffDeg };
        });
        updateShapes(rotatedShapes);
        return;
    }
    
    if (isCopying && currentShape && startPoint) {
        const dx = pos.x - startPoint.x;
        const dy = pos.y - startPoint.y;
        const originalShape = shapes.find(s => s.id === selectedShapeIds[0]);
        if (!originalShape) return;
        
        const movedShape = JSON.parse(JSON.stringify(originalShape));
        movedShape.id = currentShape.id;

        switch (movedShape.type) {
            case Tool.LINE:
                (movedShape as LineShape).p1 = { x: (movedShape as LineShape).p1.x + dx, y: (movedShape as LineShape).p1.y + dy };
                (movedShape as LineShape).p2 = { x: (movedShape as LineShape).p2.x + dx, y: (movedShape as LineShape).p2.y + dy };
                break;
            case Tool.RECTANGLE: case Tool.IMAGE: case Tool.TEXT:
                if (movedShape.type === Tool.TEXT) {
                    (movedShape as TextShape).x += dx;
                    (movedShape as TextShape).y += dy;
                } else {
                    (movedShape as RectangleShape | ImageShape).x += dx;
                    (movedShape as RectangleShape | ImageShape).y += dy;
                }
                break;
            case Tool.CIRCLE: case Tool.ARC:
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

    if (isMoving && moveStartPoint && originalShapesForMove.length > 0) {
      const dx = pos.x - moveStartPoint.x;
      const dy = pos.y - moveStartPoint.y;
      
      const movedShapes = originalShapesForMove.map(originalShape => {
        let movedShape = { ...originalShape } as Shape;
        switch (movedShape.type) {
            case Tool.LINE:
              (movedShape as LineShape).p1 = { x: (movedShape as LineShape).p1.x + dx, y: (movedShape as LineShape).p1.y + dy };
              (movedShape as LineShape).p2 = { x: (movedShape as LineShape).p2.x + dx, y: (movedShape as LineShape).p2.y + dy };
              break;
            case Tool.RECTANGLE: case Tool.IMAGE: case Tool.TEXT:
              (movedShape as RectangleShape | ImageShape | TextShape).x += dx;
              (movedShape as RectangleShape | ImageShape | TextShape).y += dy;
              break;
            case Tool.CIRCLE: case Tool.ARC:
              (movedShape as CircleShape | ArcShape).cx += dx;
              (movedShape as CircleShape | ArcShape).cy += dy;
              break;
            case Tool.POLYLINE:
              (movedShape as PolylineShape).points = (movedShape as PolylineShape).points.map(p => ({ x: p.x + dx, y: p.y + dy }));
              break;
        }
        return movedShape;
      });

      updateShapes(movedShapes);
      setOriginalShapesForMove(movedShapes);
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
    if (marquee) {
        const marqueeBounds = {
            minX: Math.min(marquee.x1, marquee.x2),
            minY: Math.min(marquee.y1, marquee.y2),
            maxX: Math.max(marquee.x1, marquee.x2),
            maxY: Math.max(marquee.y1, marquee.y2),
        };
        
        const isCrossing = marquee.x2 < marquee.x1;

        const isShapeInWindow = (shape: Shape): boolean => {
            const bbox = getShapeBoundingBox(shape);
            return (
                bbox.minX >= marqueeBounds.minX &&
                bbox.maxX <= marqueeBounds.maxX &&
                bbox.minY >= marqueeBounds.minY &&
                bbox.maxY <= marqueeBounds.maxY
            );
        };
    
        const isShapeCrossingWindow = (shape: Shape): boolean => {
            const shapeBBox = getShapeBoundingBox(shape);
            return doBBoxesIntersect(shapeBBox, marqueeBounds);
        };
    
        const idsInMarquee = shapes
            .filter(shape => {
                const layer = layers.find(l => l.id === shape.layerId);
                if (!layer || !layer.visible) return false;
                return isCrossing ? isShapeCrossingWindow(shape) : isShapeInWindow(shape);
            })
            .map(s => s.id);
        
        setSelectedShapeIds(prev => {
            const newIds = new Set([...prev, ...idsInMarquee]);
            return Array.from(newIds);
        });

        setMarquee(null);
    }
    if (activeTool === Tool.PAN) {
        setIsDrawing(false);
        setPanStart(null);
    }
    if (isMoving) { setIsMoving(false); setMoveStartPoint(null); setOriginalShapesForMove([]); }
    if (isScaling) { setIsScaling(false); setStartPoint(null); setOriginalShapesForScaling([]); }
    if (isRotating) { setIsRotating(false); setOriginalShapesForRotation([]); setStartPoint(null); setRotationCenter(null); }

    if (isCopying && currentShape) {
        const newShape = {...currentShape, id: `shape_${Date.now()}`};
        addShape(newShape);
        setIsCopying(false);
        setCurrentShape(null);
        setStartPoint(null);
    }
    if (isPressPulling) { updateShapes(previewShapes); setIsPressPulling(false); setPressPullObject(null); setPressPullStartPoint(null); setPreviewShapes([]); setHiddenShapeIds(new Set()); }
    if (activeTool === Tool.EXTRUDE && isExtruding) { return; }
    if (activeTool === Tool.MIRROR) { } 
    else if (activeTool === Tool.POLYLINE) { } 
    else if (currentShape) {
      if (
        (currentShape.type === Tool.RECTANGLE && ((currentShape as RectangleShape).width === 0 || (currentShape as RectangleShape).height === 0)) ||
        (currentShape.type === Tool.LINE && (currentShape as LineShape).p1.x === (currentShape as LineShape).p2.x && (currentShape as LineShape).p1.y === (currentShape as LineShape).p2.y) ||
        ((currentShape.type === Tool.CIRCLE || currentShape.type === Tool.ARC) && (currentShape as CircleShape | ArcShape).r === 0)
      ) {} 
      else { addShape(currentShape); }
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
      
      const pos = getInitialMousePos(svgRef.current, e as any);
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
      if (CTM) { return { x: (touch.clientX - CTM.e) / CTM.a, y: (touch.clientY - CTM.f) / CTM.d }; }
      return { x: 0, y: 0 };
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      if (e.touches.length === 2) {
          e.preventDefault();
          touchState.isTwoFinger = true;
          const t1 = e.touches[0]; const t2 = e.touches[1];
          const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY;
          touchState.lastDist = Math.sqrt(dx * dx + dy * dy);
          const p1 = getTouchPos(svgRef.current, t1); const p2 = getTouchPos(svgRef.current, t2);
          touchState.lastMidpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      } else if (e.touches.length === 1) {
          touchState.isTwoFinger = false;
          const touch = e.touches[0];
          handleMouseDown({ ...e, clientX: touch.clientX, clientY: touch.clientY } as any);
      }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      if (e.touches.length === 2 && touchState.isTwoFinger) {
            e.preventDefault();
          const t1 = e.touches[0]; const t2 = e.touches[1];
          const dx = t1.clientX - t2.clientX; const dy = t1.clientY - t2.clientY;
          const currentDist = Math.sqrt(dx*dx + dy*dy);
          const p1 = getTouchPos(svgRef.current, t1); const p2 = getTouchPos(svgRef.current, t2);
          const midpoint = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };

          if (touchState.lastDist && touchState.lastMidpoint) {
              const scale = touchState.lastDist / currentDist;
              const newViewBox = {...viewBox};
              newViewBox.w = viewBox.w * scale;
              newViewBox.h = viewBox.h * scale;
              newViewBox.x = midpoint.x - (midpoint.x - viewBox.x) * scale;
              newViewBox.y = midpoint.y - (midpoint.y - viewBox.y) * scale;
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
          handleMouseMove({ ...e, clientX: touch.clientX, clientY: touch.clientY } as any);
      }
  };

  const handleTouchEnd = (e: React.TouchEvent<SVGSVGElement>) => {
      if (e.touches.length < 2) { touchState.isTwoFinger = false; touchState.lastDist = null; touchState.lastMidpoint = null; }
      if (e.touches.length === 0) { handleMouseUp(); }
  };

  const renderShape = (shape: Shape) => {
    if (hiddenShapeIds.has(shape.id)) return null;
    const isSelected = selectedShapeIds.includes(shape.id);
    const layer = layers.find(l => l.id === shape.layerId);
    if (layer && !layer.visible) return null;
    const color = layer ? layer.color : '#FFFFFF';
    const center = getShapeCenter(shape);
    const props: any = {
      key: shape.id, id: shape.id, stroke: isSelected ? '#3b82f6' : color,
      strokeWidth: shape.strokeWidth + (isSelected ? 1.5 : 0), fill: 'none',
      transform: `rotate(${shape.rotation || 0} ${center.x} ${center.y})`,
    };
    switch (shape.type) {
      case Tool.LINE: return <line x1={shape.p1.x} y1={shape.p1.y} x2={shape.p2.x} y2={shape.p2.y} {...props} />;
      case Tool.RECTANGLE: return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={shape.rx} ry={shape.ry} {...props} />;
      case Tool.CIRCLE: return <circle cx={shape.cx} cy={shape.cy} r={shape.r} {...props} />;
      case Tool.ARC: return <path d={describeArc(shape.cx, shape.cy, shape.r, shape.startAngle, shape.endAngle)} {...props} />;
      case Tool.POLYLINE: return <polyline points={shape.points.map(p => `${p.x},${p.y}`).join(' ')} {...props} />;
      case Tool.IMAGE: return (
            <g key={shape.id}>
                <image href={shape.href} x={shape.x} y={shape.y} width={shape.width} height={shape.height} transform={props.transform} style={{pointerEvents: 'none'}} />
                <rect id={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} transform={props.transform} fill="transparent" stroke={isSelected ? '#3b82f6' : 'none'} strokeWidth="2" />
            </g>
        );
      case Tool.TEXT: return <text x={shape.x} y={shape.y} {...{...props, stroke: 'none', fill: isSelected ? '#3b82f6' : color, fontSize: shape.fontSize, dominantBaseline: "middle", textAnchor: "start"}}>{shape.content}</text>;
      default: return null;
    }
  };

  const clientWidth = svgRef.current?.clientWidth || 1;
  const zoomFactor = viewBox.w / clientWidth;

  const gridPatternId = zoomFactor > 5 ? 'grid-coarse' : zoomFactor > 0.5 ? 'grid-medium' : 'grid-fine';

  const renderMarquee = () => {
      if (!marquee) return null;
      const isCrossing = marquee.x2 < marquee.x1;
      const fill = isCrossing ? "rgba(44, 153, 56, 0.2)" : "rgba(59, 130, 246, 0.2)";
      const stroke = isCrossing ? "#2c9938" : "#3b82f6";
      const strokeDasharray = isCrossing ? "4" : undefined;
      
      const p1 = { x: marquee.x1, y: marquee.y1 };
      const p2 = { x: marquee.x2, y: marquee.y1 };
      const p3 = { x: marquee.x2, y: marquee.y2 };
      const p4 = { x: marquee.x1, y: marquee.y2 };
      const points = [p1, p2, p3, p4].map(p => projectPoint(p, projectionCenter));
      
      return (
          <polygon
              points={points.map(p => `${p.x},${p.y}`).join(' ')}
              fill={fill} 
              stroke={stroke} 
              strokeWidth={1 * zoomFactor} 
              strokeDasharray={strokeDasharray}
          />
      );
  };
  
  let viewTransform = '';
  if (viewMode === 'ISOMETRIC' && projectionCenter) {
    const { x, y } = projectionCenter;
    const t1 = `translate(${-x}, ${-y})`;
    const s = 'scale(1 0.5)';
    const r = 'rotate(-45)';
    const t2 = `translate(${x}, ${y})`;
    viewTransform = `${t2} ${r} ${s} ${t1}`;
  }

  return (
    <div className="h-full w-full bg-black cursor-crosshair" style={{ cursor: getCursor() }}>
      <svg
        ref={svgRef} className="h-full w-full" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}
        onWheel={handleWheel} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
      >
        <defs>
            {/* Standalone minor grids */}
            <pattern id="grid-fine-minor" width="2" height="2" patternUnits="userSpaceOnUse">
                <path d="M 2 0 L 0 0 0 2" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.25 * zoomFactor} />
            </pattern>
            <pattern id="grid-medium-minor" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={0.5 * zoomFactor} />
            </pattern>
            <pattern id="grid-coarse-minor" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={1 * zoomFactor} />
            </pattern>
            
            {/* Combined grids */}
            <pattern id="grid-fine" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="url(#grid-fine-minor)" />
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={0.5 * zoomFactor} />
            </pattern>
            <pattern id="grid-medium" width="50" height="50" patternUnits="userSpaceOnUse">
                <rect width="50" height="50" fill="url(#grid-medium-minor)" />
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1 * zoomFactor} />
            </pattern>
            <pattern id="grid-coarse" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="url(#grid-coarse-minor)" />
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={1.5 * zoomFactor} />
            </pattern>
        </defs>
        <g id="grid-group" transform={viewTransform}>
            {gridVisible && <rect width="100000" height="100000" x="-50000" y="-50000" fill={`url(#${gridPatternId})`} />}
        </g>
        
        <g id="shapes-group" transform={viewTransform}>
            {shapes.map(shape => renderShape(shape))}
            {currentShape && renderShape(currentShape)}
            {isCopying && currentShape && renderShape(currentShape)}
            {previewShapes.map(renderShape)}
            {extrusionPreviewShapes.map(renderShape)}
        </g>
        
        {/* Render temporary visuals that are already projected */}
        {mirrorLineStart && mirrorLineEnd && 
            (() => {
                const p1 = projectPoint(mirrorLineStart, projectionCenter);
                const p2 = projectPoint(mirrorLineEnd, projectionCenter);
                return <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#0ea5e9" strokeDasharray="5,5" strokeWidth={1 * zoomFactor} />;
            })()
        }
        {snapIndicator && 
            (() => {
                const p = projectPoint(snapIndicator, projectionCenter);
                return <rect x={p.x - 4 * zoomFactor} y={p.y - 4 * zoomFactor} width={8 * zoomFactor} height={8 * zoomFactor} fill="none" stroke="#3b82f6" strokeWidth={1 * zoomFactor} />
            })()
        }
        {renderMarquee()}
      </svg>
      {drawingInfo && (
        (() => {
            const projectedCoords = projectPoint(coords, projectionCenter);
            return (
                <div className="absolute p-1 bg-gray-800 text-xs rounded-md pointer-events-none" style={{ left: (projectedCoords.x - viewBox.x) / viewBox.w * clientWidth + 20, top: (projectedCoords.y - viewBox.y) / viewBox.h * (svgRef.current?.clientHeight || 1) + 20 }}>
                <div>Length: {drawingInfo.length.toFixed(2)}</div>
                <div>Angle: {drawingInfo.angle.toFixed(2)}°</div>
                </div>
            )
        })()
      )}
    </div>
  );
};

export default Canvas;
const arePointsEqual = (p1: Point, p2: Point) => p1.x === p2.x && p1.y === p2.y;
const findExtrudedObject = (face: PolylineShape, allShapes: Shape[]) => { return null; }; // Simplified
const getShapePoints = (shape: Shape): Point[] => {
    switch (shape.type) {
        case Tool.LINE: return [shape.p1, shape.p2];
        case Tool.RECTANGLE: case Tool.IMAGE: return [{x: shape.x, y: shape.y}, {x: shape.x+shape.width, y: shape.y}, {x: shape.x, y: shape.y+shape.height}, {x: shape.x+shape.width, y: shape.y+shape.height}];
        case Tool.CIRCLE: return [{x: shape.cx - shape.r, y: shape.cy - shape.r}, {x: shape.cx + shape.r, y: shape.cy + shape.r}];
        case Tool.ARC: return [polarToCartesian(shape.cx, shape.cy, shape.r, shape.startAngle), polarToCartesian(shape.cx, shape.cy, shape.r, shape.endAngle)];
        case Tool.POLYLINE: return shape.points;
        case Tool.TEXT: return [{x: shape.x, y: shape.y}, {x: shape.x + shape.content.length * shape.fontSize * 0.6, y: shape.y + shape.fontSize}];
        default: return [];
    }
}
