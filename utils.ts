import { Shape, Tool, RectangleShape, ImageShape, CircleShape, ArcShape, Point, LineShape, PolylineShape, TextShape } from './types';

export const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number): Point => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
    };
};

export const getShapeCenter = (shape: Shape): Point => {
    switch (shape.type) {
        case Tool.RECTANGLE:
        case Tool.IMAGE:
            return { x: (shape as RectangleShape | ImageShape).x + (shape as RectangleShape | ImageShape).width / 2, y: (shape as RectangleShape | ImageShape).y + (shape as RectangleShape | ImageShape).height / 2 };
        case Tool.CIRCLE:
        case Tool.ARC:
            return { x: (shape as CircleShape | ArcShape).cx, y: (shape as CircleShape | ArcShape).cy };
        case Tool.LINE:
            const line = shape as LineShape;
            return { x: (line.p1.x + line.p2.x) / 2, y: (line.p1.y + line.p2.y) / 2 };
        case Tool.POLYLINE:
            const poly = shape as PolylineShape;
            if (!poly.points || poly.points.length === 0) return { x: 0, y: 0 };
            const xs = poly.points.map(p => p.x);
            const ys = poly.points.map(p => p.y);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        case Tool.TEXT:
            const text = shape as TextShape;
            // Use the insertion point as the center for rotation/scaling transforms
            return { x: text.x, y: text.y };
        default:
            return { x: 0, y: 0 };
    }
}

const rotatePoint = (p: Point, center: Point, angle: number): Point => {
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

export const getShapeBoundingBox = (shape: Shape): { minX: number, minY: number, maxX: number, maxY: number } => {
    let unrotatedPoints: Point[] = [];

    switch (shape.type) {
        case Tool.LINE:
            unrotatedPoints = [shape.p1, shape.p2];
            break;
        case Tool.POLYLINE:
            unrotatedPoints = shape.points;
            break;
        case Tool.RECTANGLE:
        case Tool.IMAGE:
            unrotatedPoints = [
                { x: shape.x, y: shape.y },
                { x: shape.x + shape.width, y: shape.y },
                { x: shape.x + shape.width, y: shape.y + shape.height },
                { x: shape.x, y: shape.y + shape.height }
            ];
            break;
        case Tool.TEXT:
            const width = shape.content.length * shape.fontSize * 0.6; // Approximation
            const height = shape.fontSize;
            unrotatedPoints = [
                { x: shape.x, y: shape.y - height / 2 }, // top left
                { x: shape.x + width, y: shape.y - height / 2 }, // top right
                { x: shape.x + width, y: shape.y + height / 2 }, // bottom right
                { x: shape.x, y: shape.y + height / 2 }, // bottom left
            ];
            break;
        case Tool.CIRCLE:
            return {
                minX: shape.cx - shape.r,
                minY: shape.cy - shape.r,
                maxX: shape.cx + shape.r,
                maxY: shape.cy + shape.r,
            };
        case Tool.ARC:
            const { cx, cy, r, startAngle, endAngle } = shape;
            unrotatedPoints.push(polarToCartesian(cx, cy, r, startAngle));
            unrotatedPoints.push(polarToCartesian(cx, cy, r, endAngle));
            
            const crossesAngle = (angle: number) => {
                let s = startAngle;
                let e = endAngle;
                while (s < 0) s += 360;
                while (e < s) e += 360;
                while (angle < s) angle += 360;
                return angle < e;
            };
            
            if (crossesAngle(0)) unrotatedPoints.push(polarToCartesian(cx, cy, r, 0)); // Top
            if (crossesAngle(90)) unrotatedPoints.push(polarToCartesian(cx, cy, r, 90)); // Right
            if (crossesAngle(180)) unrotatedPoints.push(polarToCartesian(cx, cy, r, 180)); // Bottom
            if (crossesAngle(270)) unrotatedPoints.push(polarToCartesian(cx, cy, r, 270)); // Left

            break;
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