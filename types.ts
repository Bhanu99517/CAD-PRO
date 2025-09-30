export enum Tool {
  SELECT = 'SELECT',
  LINE = 'LINE',
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  PAN = 'PAN',
  POLYLINE = 'POLYLINE',
  ROTATE = 'ROTATE',
  SCALE = 'SCALE',
  IMAGE = 'IMAGE',
  ARC = 'ARC',
  MOVE = 'MOVE',
  COPY = 'COPY',
  STRETCH = 'STRETCH',
  MIRROR = 'MIRROR',
  TRIM = 'TRIM',
  FILLET = 'FILLET',
  ARRAY = 'ARRAY',
  TEXT = 'TEXT',
  DIMENSION = 'DIMENSION',
  LEADER = 'LEADER',
  TABLE = 'TABLE',
  LAYER_PROPERTIES = 'LAYER_PROPERTIES',
  ERASE = 'ERASE',
}

export interface Point {
  x: number;
  y: number;
}

export interface Layer {
  id: string;
  name: string;
  color: string;
  visible: boolean;
}

interface ShapeBase {
  id: string;
  type: Tool;
  layerId: string;
  color: string; // Overridden by layer color
  strokeWidth: number;
  rotation: number;
}

export interface LineShape extends ShapeBase {
  type: Tool.LINE;
  p1: Point;
  p2: Point;
}

export interface RectangleShape extends ShapeBase {
  type: Tool.RECTANGLE;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends ShapeBase {
  type: Tool.CIRCLE;
  cx: number;
  cy: number;
  r: number;
}

export interface PolylineShape extends ShapeBase {
  type: Tool.POLYLINE;
  points: Point[];
}

export interface ImageShape extends ShapeBase {
  type: Tool.IMAGE;
  x: number;
  y: number;
  width: number;
  height: number;
  href: string;
}

export interface ArcShape extends ShapeBase {
  type: Tool.ARC;
  cx: number;
  cy: number;
  r: number;
  startAngle: number;
  endAngle: number;
}

export type Shape = LineShape | RectangleShape | CircleShape | PolylineShape | ImageShape | ArcShape;