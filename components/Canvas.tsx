
import React, { useState, useRef, MouseEvent, useEffect } from 'react';
import { Tool, Shape, Point, LineShape, RectangleShape, CircleShape, PolylineShape, Layer, ImageShape, ArcShape, TextShape, ViewMode, EllipseShape, PolygonShape, TableShape } from '../types';
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
    return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
};

const Canvas: React.FC<CanvasProps> = ({
  activeTool, shapes, addShape, updateShape, updateShapes, deleteShapes, selectedShapeIds, setSelectedShapeIds,
  activeLayer, layers, setCoords, snapEnabled, orthoEnabled, extrudeShape, coords, viewBox, setViewBox, gridVisible, viewMode, setActiveTool, theme, setStatusMessage
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
  const [projectionCenter, setProjectionCenter] = useState<Point>({ x: 0, y: 0 });
  
  // Measurement state
  const [measurePoints, setMeasurePoints] = useState<Point[]>([]);
  
  // Helper for projection
  const projectPoint = (p: Point) => p; // Simplified for this view mode iteration

  useEffect(() => {
      if(shapes.length > 0) {
          const bbox = getShapeBoundingBox(shapes[0]); // Very basic center init
          setProjectionCenter({x: (bbox.minX+bbox.maxX)/2, y: (bbox.minY+bbox.maxY)/2});
      }
  }, [shapes]);

  const getMousePos = (e: MouseEvent<SVGSVGElement>): Point => {
      if (!svgRef.current) return { x: 0, y: 0 };
      return getInitialMousePos(svgRef.current, e);
  };

  const getSnapPoint = (mousePos: Point): { snappedPoint: Point; indicator: Point | null } => {
    if (!snapEnabled || !svgRef.current) return { snappedPoint: mousePos, indicator: null };
    const clientWidth = svgRef.current.clientWidth || 1;
    const zoomFactor = viewBox.w / clientWidth;
    const snapRadius = 10 * zoomFactor;
    let bestSnapPoint: Point | null = null;
    let minDistanceSq = snapRadius * snapRadius;

    const checkPoint = (p: Point) => {
      const dx = mousePos.x - p.x;
      const dy = mousePos.y - p.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistanceSq) { minDistanceSq = distSq; bestSnapPoint = p; }
    };

    const gridSize = 10;
    checkPoint({ x: Math.round(mousePos.x / gridSize) * gridSize, y: Math.round(mousePos.y / gridSize) * gridSize });
    
    shapes.forEach(shape => {
        if(shape.type === Tool.LINE) { checkPoint(shape.p1); checkPoint(shape.p2); }
        if(shape.type === Tool.RECTANGLE) { checkPoint({x:shape.x, y:shape.y}); }
    });

    return { snappedPoint: bestSnapPoint || mousePos, indicator: bestSnapPoint };
  };

  const handleMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    let pos = getMousePos(e);
    const { snappedPoint } = getSnapPoint(pos);
    pos = snappedPoint;
    
    if (activeTool === Tool.MEASURE_DISTANCE || activeTool === Tool.MEASURE_ANGLE) {
        setMeasurePoints(prev => [...prev, pos]);
        if (activeTool === Tool.MEASURE_DISTANCE && measurePoints.length === 1) {
             const dist = getDistance(measurePoints[0], pos);
             setStatusMessage(`Distance: ${dist.toFixed(2)}`);
             setMeasurePoints([]);
             setActiveTool(Tool.SELECT);
        }
        return;
    }
    
    if (activeTool === Tool.MEASURE_AREA) {
        setMeasurePoints(prev => [...prev, pos]);
        return; // Finish on double click handled elsewhere or specific key
    }

    if (activeTool === Tool.HATCH) {
        if (e.target instanceof SVGElement && (e.target as SVGElement).id.startsWith('shape_')) {
            const shape = shapes.find(s => s.id === (e.target as SVGElement).id);
            if (shape) updateShape({ ...shape, fill: shape.fill ? undefined : 'url(#hatch-pattern)' });
        }
        return;
    }

    if (activeTool === Tool.SELECT) {
        const targetId = (e.target as SVGElement).id;
        if (targetId && targetId.startsWith('shape_')) {
            if (e.metaKey || e.ctrlKey) setSelectedShapeIds(prev => prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId]);
            else setSelectedShapeIds([targetId]);
        } else {
            setMarquee({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
            if (!(e.metaKey || e.ctrlKey)) setSelectedShapeIds([]);
        }
        return;
    }
    
    if (activeTool === Tool.MOVE && selectedShapeIds.length > 0) {
        // Check locks
        const locked = shapes.filter(s => selectedShapeIds.includes(s.id) && s.locked);
        if (locked.length > 0) {
            setStatusMessage(`${locked.length} objects are locked and cannot be moved.`);
            return;
        }
        setIsMoving(true);
        setMoveStartPoint(pos);
        setOriginalShapesForMove(shapes.filter(s => selectedShapeIds.includes(s.id)));
        return;
    }
    
    if (activeTool === Tool.PAN) {
        setIsDrawing(true);
        setPanStart(getInitialMousePos(svgRef.current!, e));
        return;
    }
    
    if (activeTool === Tool.TEXT) {
        const content = prompt("Enter text:");
        if (content) {
            addShape({ id: `shape_${Date.now()}`, type: Tool.TEXT, x: pos.x, y: pos.y, content, fontSize: 20, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 1, rotation: 0 });
        }
        return;
    }

    setIsDrawing(true);
    setStartPoint(pos);
    
    let newShape: any = {
        id: `shape_${Date.now()}`, type: activeTool, layerId: activeLayer.id, color: activeLayer.color, strokeWidth: 2, rotation: 0
    };
    
    if (activeTool === Tool.LINE) newShape = { ...newShape, p1: pos, p2: pos };
    if (activeTool === Tool.RECTANGLE) newShape = { ...newShape, x: pos.x, y: pos.y, width: 0, height: 0 };
    if (activeTool === Tool.CIRCLE) newShape = { ...newShape, cx: pos.x, cy: pos.y, r: 0 };
    if (activeTool === Tool.ELLIPSE) newShape = { ...newShape, cx: pos.x, cy: pos.y, rx: 0, ry: 0 };
    if (activeTool === Tool.POLYLINE || activeTool === Tool.FREEHAND || activeTool === Tool.POLYGON) newShape = { ...newShape, points: [pos, pos] };

    setCurrentShape(newShape);
  };

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    let pos = getMousePos(e);
    setCoords(pos);
    const { snappedPoint } = getSnapPoint(pos);
    pos = snappedPoint;
    
    if (activeTool === Tool.PAN && isDrawing && panStart) {
        const currentPanPos = getInitialMousePos(svgRef.current, e);
        setViewBox({ ...viewBox, x: viewBox.x - (currentPanPos.x - panStart.x), y: viewBox.y - (currentPanPos.y - panStart.y) });
        return;
    }

    if (marquee) { setMarquee({ ...marquee, x2: pos.x, y2: pos.y }); return; }

    if (isMoving && moveStartPoint && originalShapesForMove.length > 0) {
        const dx = pos.x - moveStartPoint.x;
        const dy = pos.y - moveStartPoint.y;
        updateShapes(originalShapesForMove.map(s => {
            const copy = JSON.parse(JSON.stringify(s));
            if (copy.type === Tool.LINE) { copy.p1.x += dx; copy.p1.y += dy; copy.p2.x += dx; copy.p2.y += dy; }
            else if ('x' in copy) { copy.x += dx; copy.y += dy; }
            else if ('cx' in copy) { copy.cx += dx; copy.cy += dy; }
            else if ('points' in copy) { copy.points = copy.points.map((p: Point) => ({x: p.x+dx, y: p.y+dy})); }
            return copy;
        }));
        return;
    }

    if (!isDrawing || !currentShape || !startPoint) return;

    let updated = { ...currentShape } as any;
    if (activeTool === Tool.LINE) updated.p2 = pos;
    if (activeTool === Tool.RECTANGLE) { updated.width = Math.abs(pos.x - startPoint.x); updated.height = Math.abs(pos.y - startPoint.y); updated.x = Math.min(pos.x, startPoint.x); updated.y = Math.min(pos.y, startPoint.y); }
    if (activeTool === Tool.CIRCLE) updated.r = getDistance(startPoint, pos);
    if (activeTool === Tool.ELLIPSE) { updated.rx = Math.abs(pos.x - startPoint.x); updated.ry = Math.abs(pos.y - startPoint.y); }
    if (activeTool === Tool.POLYGON) {
        const r = getDistance(startPoint, pos);
        updated.points = generatePolygonPoints(startPoint.x, startPoint.y, r, 5); // Default 5 sides
    }
    if (activeTool === Tool.FREEHAND) {
        updated.points = [...(currentShape as PolylineShape).points, pos];
    }
    
    setCurrentShape(updated);
  };

  const handleMouseUp = () => {
    if (activeTool === Tool.MEASURE_AREA && measurePoints.length > 2) {
        // Simplified finish for area
         const area = calculatePolygonArea(measurePoints);
         setStatusMessage(`Area: ${area.toFixed(2)} sq units`);
         setMeasurePoints([]);
         setActiveTool(Tool.SELECT);
    }
    if (marquee) {
        // Selection logic simplified
        setSelectedShapeIds(shapes.map(s => s.id)); // Dummy select all for now to show it works
        setMarquee(null);
    }
    if (isMoving) { setIsMoving(false); setMoveStartPoint(null); setOriginalShapesForMove([]); }
    if (isDrawing) {
        if (currentShape) addShape(currentShape);
        setIsDrawing(false);
        setCurrentShape(null);
        setStartPoint(null);
    }
    setPanStart(null);
  };
  
  const handleWheel = (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const zoom = e.deltaY < 0 ? 0.9 : 1.1;
      setViewBox({...viewBox, w: viewBox.w * zoom, h: viewBox.h * zoom});
  };

  const renderShape = (shape: Shape) => {
      const isSel = selectedShapeIds.includes(shape.id);
      const props = { 
          stroke: isSel ? '#3b82f6' : shape.color, 
          strokeWidth: shape.strokeWidth + (isSel ? 1 : 0), 
          fill: shape.fill || 'none',
          vectorEffect: 'non-scaling-stroke'
      };
      if (shape.type === Tool.LINE) return <line key={shape.id} id={shape.id} x1={shape.p1.x} y1={shape.p1.y} x2={shape.p2.x} y2={shape.p2.y} {...props} />;
      if (shape.type === Tool.RECTANGLE) return <rect key={shape.id} id={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} {...props} />;
      if (shape.type === Tool.CIRCLE) return <circle key={shape.id} id={shape.id} cx={shape.cx} cy={shape.cy} r={shape.r} {...props} />;
      if (shape.type === Tool.ELLIPSE) return <ellipse key={shape.id} id={shape.id} cx={shape.cx} cy={shape.cy} rx={shape.rx} ry={shape.ry} {...props} />;
      if (shape.type === Tool.POLYLINE || shape.type === Tool.POLYGON || shape.type === Tool.FREEHAND) return <polyline key={shape.id} id={shape.id} points={shape.points.map(p => `${p.x},${p.y}`).join(' ')} {...props} />;
      if (shape.type === Tool.TEXT) return <text key={shape.id} id={shape.id} x={shape.x} y={shape.y} fontSize={shape.fontSize} fill={shape.color} stroke="none">{shape.content}</text>;
      if (shape.type === Tool.TABLE) {
          const cellW = shape.width / shape.cols;
          const cellH = shape.height / shape.rows;
          const gridLines = [];
          for(let i=0; i<=shape.rows; i++) gridLines.push(<line key={`r${i}`} x1={shape.x} y1={shape.y + i*cellH} x2={shape.x + shape.width} y2={shape.y + i*cellH} stroke={shape.color} strokeWidth={1} />);
          for(let i=0; i<=shape.cols; i++) gridLines.push(<line key={`c${i}`} x1={shape.x + i*cellW} y1={shape.y} x2={shape.x + i*cellW} y2={shape.y + shape.height} stroke={shape.color} strokeWidth={1} />);
          return <g key={shape.id} id={shape.id}>{gridLines}</g>;
      }
      if (shape.type === Tool.IMAGE) return <image key={shape.id} id={shape.id} href={shape.href} x={shape.x} y={shape.y} width={shape.width} height={shape.height} />;
      return null;
  }

  return (
    <div className={`h-full w-full ${theme === 'DARK' ? 'bg-black' : 'bg-white'}`}>
      <svg 
        ref={svgRef} 
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`} 
        className="w-full h-full"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <defs>
            <pattern id="hatch-pattern" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="10" stroke={theme === 'DARK' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'} strokeWidth="1" />
            </pattern>
        </defs>
        {gridVisible && <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke={theme === 'DARK' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} strokeWidth="1"/>
        </pattern>}
        {gridVisible && <rect width="100%" height="100%" fill="url(#grid)" />}
        
        {shapes.map(renderShape)}
        {currentShape && renderShape(currentShape)}
        
        {marquee && <rect x={Math.min(marquee.x1, marquee.x2)} y={Math.min(marquee.y1, marquee.y2)} width={Math.abs(marquee.x2 - marquee.x1)} height={Math.abs(marquee.y2 - marquee.y1)} fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" />}
        
        {measurePoints.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3} fill="red" />)}
        {measurePoints.length > 1 && <line x1={measurePoints[0].x} y1={measurePoints[0].y} x2={measurePoints[measurePoints.length-1].x} y2={measurePoints[measurePoints.length-1].y} stroke="red" strokeDasharray="4" />}
      </svg>
    </div>
  );
};

export default Canvas;
