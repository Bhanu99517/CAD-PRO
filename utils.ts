
import { Shape, Tool, RectangleShape, ImageShape, CircleShape, ArcShape, Point, LineShape, PolylineShape, TextShape, EllipseShape, TableShape, PolygonShape } from './types';

export const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number): Point => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

export const cartesianToPolar = (centerX: number, centerY: number, x: number, y: number): { r: number, angle: number } => {
    const dx = x - centerX;
    const dy = y - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    if (angle < 0) angle += 360;
    return {
        r: Math.sqrt(dx * dx + dy * dy),
        angle: (angle + 90) % 360
    };
};

export const getDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const getAngle = (p1: Point, p2: Point, p3: Point): number => {
    const a = getDistance(p2, p3);
    const b = getDistance(p1, p3);
    const c = getDistance(p1, p2);
    return Math.acos((b * b + c * c - a * a) / (2 * b * c)) * (180 / Math.PI);
};

export const calculatePolygonArea = (points: Point[]): number => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        let j = (i + 1) % points.length;
        area += points[i].x * points[j].y;
        area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
};

export const generatePolygonPoints = (cx: number, cy: number, r: number, sides: number): Point[] => {
    const points: Point[] = [];
    // Start from top (angle -90 effectively)
    for (let i = 0; i < sides; i++) {
        const angle = (i * 360) / sides - 90;
        const rad = angle * Math.PI / 180;
        points.push({
            x: cx + r * Math.cos(rad),
            y: cy + r * Math.sin(rad)
        });
    }
    return points;
};

// Returns intersection of two infinite lines defined by (p1, p2) and (p3, p4)
export const getLineIntersection = (p1: Point, p2: Point, p3: Point, p4: Point): Point | null => {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (d === 0) return null; // Parallel
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
    return {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y)
    };
};

// Returns intersection of two segments
export const getSegmentIntersection = (p1: Point, p2: Point, p3: Point, p4: Point): Point | null => {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (d === 0) return null;
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
    const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
         return {
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y)
        };
    }
    return null;
};

// Project point p onto segment v-w
export const projectPointToSegment = (p: Point, v: Point, w: Point): Point => {
  const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
  if (l2 === 0) return v;
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
};

export const getShapeCenter = (shape: Shape): Point => {
    switch (shape.type) {
        case Tool.RECTANGLE:
        case Tool.IMAGE:
        case Tool.TABLE:
            return { x: (shape as RectangleShape | ImageShape | TableShape).x + (shape as RectangleShape | ImageShape | TableShape).width / 2, y: (shape as RectangleShape | ImageShape | TableShape).y + (shape as RectangleShape | ImageShape | TableShape).height / 2 };
        case Tool.CIRCLE:
        case Tool.ARC:
        case Tool.ELLIPSE:
            return { x: (shape as CircleShape).cx, y: (shape as CircleShape).cy };
        case Tool.LINE:
            const line = shape as LineShape;
            return { x: (line.p1.x + line.p2.x) / 2, y: (line.p1.y + line.p2.y) / 2 };
        case Tool.POLYLINE:
        case Tool.POLYGON:
        case Tool.FREEHAND:
            const poly = shape as PolylineShape;
            if (!poly.points || poly.points.length === 0) return { x: 0, y: 0 };
            const xs = poly.points.map(p => p.x);
            const ys = poly.points.map(p => p.y);
            return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
        case Tool.TEXT:
            const text = shape as TextShape;
            return { x: text.x, y: text.y };
        default:
            return { x: 0, y: 0 };
    }
}

export const rotatePoint = (p: Point, center: Point, angle: number): Point => {
    if (!angle) return p;
    const rad = angle * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return {
        x: dx * cos - dy * sin + center.x,
        y: dx * sin + dy * cos + center.y
    };
};

export const mirrorPoint = (p: Point, l1: Point, l2: Point): Point => {
    const dx = l2.x - l1.x;
    const dy = l2.y - l1.y;
    const val = (dx * dx + dy * dy);
    if (val === 0) return p;
    const a = (dx * dx - dy * dy) / val;
    const b = 2 * dx * dy / val;
    const x2 = a * (p.x - l1.x) + b * (p.y - l1.y) + l1.x;
    const y2 = b * (p.x - l1.x) - a * (p.y - l1.y) + l1.y;
    return { x: x2, y: y2 };
};

export const scalePoint = (p: Point, center: Point, factor: number): Point => {
    return {
        x: center.x + (p.x - center.x) * factor,
        y: center.y + (p.y - center.y) * factor
    };
};

export const calculateArcFrom3Points = (p1: Point, p2: Point, p3: Point): { cx: number, cy: number, r: number, startAngle: number, endAngle: number } | null => {
    const x1 = p1.x, y1 = p1.y;
    const x2 = p2.x, y2 = p2.y;
    const x3 = p3.x, y3 = p3.y;

    const D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2));
    if (Math.abs(D) < 0.001) return null;

    const Ux = ((x1*x1 + y1*y1)*(y2-y3) + (x2*x2 + y2*y2)*(y3-y1) + (x3*x3 + y3*y3)*(y1-y2)) / D;
    const Uy = ((x1*x1 + y1*y1)*(x3-x2) + (x2*x2 + y2*y2)*(x1-x3) + (x3*x3 + y3*y3)*(x2-x1)) / D;

    const r = Math.sqrt((x1 - Ux)**2 + (y1 - Uy)**2);
    const cx = Ux;
    const cy = Uy;

    let startAngle = Math.atan2(y1 - cy, x1 - cx) * 180 / Math.PI;
    let midAngle = Math.atan2(y2 - cy, x2 - cx) * 180 / Math.PI;
    let endAngle = Math.atan2(y3 - cy, x3 - cx) * 180 / Math.PI;
    
    // Normalize angles to be positive for easier comparison, though SVG uses -180 to 180 usually.
    // We need to ensure direction p1->p2->p3.
    // SVG Arc Sweep flag depends on direction.
    // We will store angles as 0-360 where 0 is 3 o'clock (East), 90 is 6 o'clock (South) in SVG coords?
    // No, SVG coord system: 0 is East, 90 is South (positive Y).
    // So atan2 returns correct standard angle.
    
    return { cx, cy, r, startAngle: startAngle + 90, endAngle: endAngle + 90 }; 
    // +90 because our PolarToCartesian assumes 0 is North (-90 in standard math).
    // Actually, let's align everything to standard Math (0=East) eventually, but for now consistent with existing code.
};

export const getShapeBoundingBox = (shape: Shape): { minX: number, minY: number, maxX: number, maxY: number } => {
    let unrotatedPoints: Point[] = [];

    switch (shape.type) {
        case Tool.LINE:
            unrotatedPoints = [(shape as LineShape).p1, (shape as LineShape).p2];
            break;
        case Tool.POLYLINE:
        case Tool.POLYGON:
        case Tool.FREEHAND:
            unrotatedPoints = (shape as PolylineShape).points;
            break;
        case Tool.RECTANGLE:
        case Tool.IMAGE:
        case Tool.TABLE:
            const rect = shape as RectangleShape;
            unrotatedPoints = [
                { x: rect.x, y: rect.y },
                { x: rect.x + rect.width, y: rect.y },
                { x: rect.x + rect.width, y: rect.y + rect.height },
                { x: rect.x, y: rect.y + rect.height }
            ];
            break;
        case Tool.TEXT:
             const txt = shape as TextShape;
             unrotatedPoints = [{x: txt.x, y: txt.y}, {x: txt.x + 50, y: txt.y + 10}];
             break;
        case Tool.CIRCLE:
            const c = shape as CircleShape;
            return { minX: c.cx - c.r, minY: c.cy - c.r, maxX: c.cx + c.r, maxY: c.cy + c.r };
        case Tool.ELLIPSE:
            const el = shape as EllipseShape;
            return { minX: el.cx - el.rx, minY: el.cy - el.ry, maxX: el.cx + el.rx, maxY: el.cy + el.ry };
        default:
            return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    if (!unrotatedPoints || unrotatedPoints.length === 0) {
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }

    const center = getShapeCenter(shape);
    const rotatedPoints = shape.rotation ? unrotatedPoints.map(p => rotatePoint(p, center, shape.rotation)) : unrotatedPoints;

    const xs = rotatedPoints.map(p => p.x);
    const ys = rotatedPoints.map(p => p.y);
    return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys)
    };
};

export const doBBoxesIntersect = (
    boxA: { minX: number, minY: number, maxX: number, maxY: number },
    boxB: { minX: number, minY: number, maxX: number, maxY: number }
): boolean => {
    return (
        boxA.minX <= boxB.maxX &&
        boxA.maxX >= boxB.minX &&
        boxA.minY <= boxB.maxY &&
        boxA.maxY >= boxB.minY
    );
};
