import { Shape, Tool, RectangleShape, ImageShape, CircleShape, ArcShape, Point, LineShape, PolylineShape } from './types';

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
        default:
            return { x: 0, y: 0 };
    }
}
