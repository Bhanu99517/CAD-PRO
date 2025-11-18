
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
  EXTRUDE = 'EXTRUDE',
  PRESS_PULL = 'PRESS_PULL',
  OFFSET = 'OFFSET',
  HATCH = 'HATCH',
  // New Tools
  ELLIPSE = 'ELLIPSE',
  POLYGON = 'POLYGON',
  FREEHAND = 'FREEHAND',
  DIMENSION_LINEAR = 'DIMENSION_LINEAR',
  DIMENSION_ALIGNED = 'DIMENSION_ALIGNED',
  DIMENSION_ANGULAR = 'DIMENSION_ANGULAR',
  DIMENSION_RADIUS = 'DIMENSION_RADIUS',
  DIMENSION_DIAMETER = 'DIMENSION_DIAMETER',
  MEASURE_DISTANCE = 'MEASURE_DISTANCE',
  MEASURE_ANGLE = 'MEASURE_ANGLE',
  MEASURE_AREA = 'MEASURE_AREA',
  CHAMFER = 'CHAMFER',
  EXTEND = 'EXTEND',
  EXPLODE = 'EXPLODE',
  INSERT_BLOCK = 'INSERT_BLOCK',
}

export type ViewMode = 'TOP' | 'BOTTOM' | 'FRONT' | 'BACK' | 'LEFT' | 'RIGHT' | 'ISOMETRIC' | 'PERSPECTIVE';

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
  fill?: string;
  locked?: boolean; // For Parametric constraints
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
  rx?: number;
  ry?: number;
}

export interface CircleShape extends ShapeBase {
  type: Tool.CIRCLE;
  cx: number;
  cy: number;
  r: number;
}

export interface EllipseShape extends ShapeBase {
    type: Tool.ELLIPSE;
    cx: number;
    cy: number;
    rx: number;
    ry: number;
}

export interface PolygonShape extends ShapeBase {
    type: Tool.POLYGON;
    points: Point[];
    sides: number; // Metadata
}

export interface PolylineShape extends ShapeBase {
  type: Tool.POLYLINE | Tool.FREEHAND;
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

export interface TextShape extends ShapeBase {
  type: Tool.TEXT;
  x: number;
  y: number;
  content: string;
  fontSize: number;
}

export interface TableShape extends ShapeBase {
    type: Tool.TABLE;
    x: number;
    y: number;
    width: number;
    height: number;
    rows: number;
    cols: number;
}

export interface DimensionShape extends ShapeBase {
    type: Tool.DIMENSION | Tool.DIMENSION_LINEAR | Tool.DIMENSION_ALIGNED | Tool.DIMENSION_RADIUS | Tool.DIMENSION_DIAMETER;
    p1: Point;
    p2: Point;
    textPosition: Point;
    offset: number;
    dimType: 'linear' | 'aligned' | 'radius' | 'diameter';
    textOverride?: string;
}

export interface AngularDimensionShape extends ShapeBase {
    type: Tool.DIMENSION_ANGULAR;
    center: Point;
    p1: Point;
    p2: Point;
    textPosition: Point;
}

export interface LeaderShape extends ShapeBase {
    type: Tool.LEADER;
    points: Point[];
    text: string;
    textPosition: Point;
}

export type Shape = LineShape | RectangleShape | CircleShape | PolylineShape | ImageShape | ArcShape | TextShape | DimensionShape | AngularDimensionShape | LeaderShape | EllipseShape | PolygonShape | TableShape;
