import React, { useState, useRef, MouseEvent, useEffect } from 'react';
import { Tool, Shape, Point, LineShape, RectangleShape, CircleShape, PolylineShape, Layer, ImageShape, ArcShape } from '../types';

interface CanvasProps {
  activeTool: Tool;
  shapes: Shape[];
  addShape: (shape: Shape) => void;
  updateShape: (shape: Shape) => void;
  deleteShape: (id: string) => void;
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;
  activeLayer: Layer;
  layers: Layer[];
  setCoords: (point: Point) => void;
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

const getShapeCenter = (shape: Shape): Point => {
    switch (shape.type) {
        case Tool.RECTANGLE:
        case Tool.IMAGE:
            return { x: (shape as RectangleShape | ImageShape).x + (shape as RectangleShape | ImageShape).width / 2, y: (shape as RectangleShape | ImageShape).y + (shape as RectangleShape | ImageShape).height / 2 };
        case Tool.CIRCLE:
        case Tool.ARC:
            return { x: (shape as CircleShape | ArcShape).cx, y: (shape as CircleShape | ArcShape).cy };
        case Tool.LINE:
            return { x: (shape.p1.x + shape.p2.x) / 2, y: (shape.p1.y + shape.p2.y) / 2 };
        case Tool.POLYLINE:
            const xs = shape.points.map(p => p.x);
            const ys = shape.points.map(p => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        default:
            return { x: 0, y: 0 };
    }
}

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
  deleteShape,
  selectedShapeId,
  setSelectedShapeId,
  activeLayer,
  layers,
  setCoords,
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
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selectedShapeId) {
                deleteShape(selectedShapeId);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, currentShape, addShape, selectedShapeId, deleteShape]);
  
  const getCursor = () => {
    if (isMoving || isCopying) return 'grabbing';
    if (isScaling || isRotating) return 'move';
    switch (activeTool) {
      case Tool.SELECT: return 'default';
      case Tool.MOVE: return 'move';
      case Tool.ERASE: return 'crosshair';
      case Tool.PAN: return isDrawing ? 'grabbing' : 'grab';
      case Tool.SCALE: 
      case Tool.ROTATE:
      case Tool.COPY:
      case Tool.MIRROR:
        return 'pointer';
      default: return 'crosshair';
    }
  }

  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const pos = getMousePos(svgRef.current, e);
    
    if (activeTool === Tool.ERASE) {
        // FIX: Property 'id' does not exist on type 'EventTarget'. Using a more specific 'SVGElement' type guard resolves this.
        if (e.target instanceof SVGElement && e.target.id.startsWith('shape_')) {
            deleteShape(e.target.id);
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
        // FIX: Property 'id' does not exist on type 'EventTarget'. Using a more specific 'SVGElement' type guard resolves this.
        if (e.target instanceof SVGElement && e.target.id.startsWith('shape_')) {
            setSelectedShapeId(e.target.id);
            const shapeToScale = shapes.find(s => s.id === e.target.id);
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
        // FIX: Property 'id' does not exist on type 'EventTarget'. Using a more specific 'SVGElement' type guard resolves this.
        if (e.target instanceof SVGElement && e.target.id.startsWith('shape_')) {
            setSelectedShapeId(e.target.id);
            const shapeToRotate = shapes.find(s => s.id === e.target.id);
            if (shapeToRotate) {
                setIsRotating(true);
                setOriginalShapeForRotation(shapeToRotate);
                setStartPoint(pos);
            }
        }
        return;
    }
    
    if (activeTool === Tool.COPY) {
        // FIX: Property 'id' does not exist on type 'EventTarget'. Using a more specific 'SVGElement' type guard resolves this.
        if (e.target instanceof SVGElement && e.target.id.startsWith('shape_')) {
            const shapeToCopy = shapes.find(s => s.id === e.target.id);
            if (shapeToCopy) {
                setSelectedShapeId(e.target.id);
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
                            mirroredShape.p1 = reflectPoint(mirroredShape.p1, mirrorLineStart, pos);
                            mirroredShape.p2 = reflectPoint(mirroredShape.p2, mirrorLineStart, pos);
                            break;
                        case Tool.RECTANGLE:
                        case Tool.IMAGE:
                            const center = getShapeCenter(shapeToMirror);
                            const newCenter = reflectPoint(center, mirrorLineStart, pos);
                            (mirroredShape as RectangleShape | ImageShape).x = newCenter.x - (mirroredShape as RectangleShape | ImageShape).width / 2;
                            (mirroredShape as RectangleShape | ImageShape).y = newCenter.y - (mirroredShape as RectangleShape | ImageShape).height / 2;
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
                            mirroredShape.points = mirroredShape.points.map(p => reflectPoint(p, mirrorLineStart, pos));
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
      // FIX: Property 'id' does not exist on type 'EventTarget'. Using a more specific 'SVGElement' type guard resolves this.
      if (e.target instanceof SVGElement && e.target.id.startsWith('shape_')) {
        setSelectedShapeId(e.target.id);
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
            return { x: pos.x, y: pos.y, width: 0, height: 0 };
        case Tool.CIRCLE:
            return { cx: pos.x, cy: pos.y, r: 0 };
        default:
            return {};
    }
  };


  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const pos = getMousePos(svgRef.current, e);
    setCoords({ x: parseFloat(pos.x.toFixed(2)), y: parseFloat(pos.y.toFixed(2)) });

    if (activeTool === Tool.PAN && isDrawing && panStart) {
        const dx = pos.x - panStart.x;
        const dy = pos.y - panStart.y;
        setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
        return;
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
        let scaledShape = { ...originalShapeForScaling };
        
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
                movedShape.p1 = { x: movedShape.p1.x + dx, y: movedShape.p1.y + dy };
                movedShape.p2 = { x: movedShape.p2.x + dx, y: movedShape.p2.y + dy };
                break;
            case Tool.RECTANGLE:
            case Tool.IMAGE:
                (movedShape as RectangleShape | ImageShape).x += dx;
                (movedShape as RectangleShape | ImageShape).y += dy;
                break;
            case Tool.CIRCLE:
            case Tool.ARC:
                (movedShape as CircleShape | ArcShape).cx += dx;
                (movedShape as CircleShape | ArcShape).cy += dy;
                break;
            case Tool.POLYLINE:
                movedShape.points = movedShape.points.map((p: Point) => ({ x: p.x + dx, y: p.y + dy }));
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

      let movedShape = { ...selectedShape };
      switch (movedShape.type) {
        case Tool.LINE:
          movedShape.p1 = { x: movedShape.p1.x + dx, y: movedShape.p1.y + dy };
          movedShape.p2 = { x: movedShape.p2.x + dx, y: movedShape.p2.y + dy };
          break;
        case Tool.RECTANGLE:
        case Tool.IMAGE:
          (movedShape as RectangleShape | ImageShape).x += dx;
          (movedShape as RectangleShape | ImageShape).y += dy;
          break;
        case Tool.CIRCLE:
        case Tool.ARC:
          (movedShape as CircleShape | ArcShape).cx += dx;
          (movedShape as CircleShape | ArcShape).cy += dy;
          break;
        case Tool.POLYLINE:
          movedShape.points = movedShape.points.map(p => ({ x: p.x + dx, y: p.y + dy }));
          break;
      }
      updateShape(movedShape);
      setMoveStartPoint(pos);
      return;
    }

    if (!isDrawing) return;
    
    if (currentShape?.type === Tool.POLYLINE) {
        const updatedPoints = [...currentShape.points];
        updatedPoints[updatedPoints.length - 1] = pos;
        setCurrentShape({ ...currentShape, points: updatedPoints });
        return;
    }

    if (!currentShape || !startPoint) return;
    
    let updatedShape = { ...currentShape };
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
        const circle = updatedShape as CircleShape;
        const dx = pos.x - startPoint.x;
        const dy = pos.y - startPoint.y;
        circle.r = Math.sqrt(dx * dx + dy * dy);
        break;
    }
    setCurrentShape(updatedShape);
  };

  const handleMouseUp = () => {
    if (activeTool === Tool.PAN) {
        setIsDrawing(false);
        setPanStart(null);
        return;
    }
    
    if (isMoving) {
        setIsMoving(false);
        setMoveStartPoint(null);
        return;
    }
    
    if (isScaling) {
        setIsScaling(false);
        setStartPoint(null);
        setOriginalShapeForScaling(null);
        return;
    }
    
    if (isRotating) {
        setIsRotating(false);
        setOriginalShapeForRotation(null);
        setStartPoint(null);
        return;
    }

    if (isCopying && currentShape) {
        const newShape = {...currentShape, id: `shape_${Date.now()}`};
        addShape(newShape);
        setIsCopying(false);
        setCurrentShape(null);
        setStartPoint(null);
        return;
    }

    if (activeTool === Tool.MIRROR) {
        return;
    }

    if (activeTool === Tool.POLYLINE) {
        return;
    }

    if (currentShape) {
      if (
        (currentShape.type === Tool.RECTANGLE && (currentShape.width === 0 || currentShape.height === 0)) ||
        (currentShape.type === Tool.CIRCLE && currentShape.r === 0) ||
        (currentShape.type === Tool.LINE && currentShape.p1.x === currentShape.p2.x && currentShape.p1.y === currentShape.p2.y)
      ) {
         // It's just a click, don't add shape
      } else {
        addShape(currentShape);
      }
    }
    setIsDrawing(false);
    setStartPoint(null);
    setCurrentShape(null);
  };
  
  const renderShape = (shape: Shape) => {
    const isSelected = shape.id === selectedShapeId;
    const layer = layers.find(l => l.id === shape.layerId);
    if (layer && !layer.visible) return null;
    const color = layer ? layer.color : '#FFFFFF';
    const center = getShapeCenter(shape);

    const props = {
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
        return <rect x={rect.x} y={rect.y} width={rect.width} height={rect.height} {...props} />;
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
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 bg-gray-900 overflow-hidden">
      <svg
        ref={svgRef}
        className="w-full h-full bg-[#1e293b]"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: getCursor() }}
      >
        <defs>
          <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(203, 213, 225, 0.05)" strokeWidth="0.5"/>
          </pattern>
          <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallGrid)"/>
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(203, 213, 225, 0.1)" strokeWidth="1"/>
          </pattern>
        </defs>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w / 0.1} height={viewBox.h / 0.1} fill="url(#grid)" />
        {shapes.map(renderShape)}
        {currentShape && renderShape(currentShape)}
        {mirrorLineStart && mirrorLineEnd && (
            <line x1={mirrorLineStart.x} y1={mirrorLineStart.y} x2={mirrorLineEnd.x} y2={mirrorLineEnd.y} strokeDasharray="5,5" stroke="#3b82f6" strokeWidth="1" />
        )}
      </svg>
    </div>
  );
};

export default Canvas;