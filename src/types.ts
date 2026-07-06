export type Zone = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'right';
export type VerticalSide = 'top' | 'bottom' | 'left' | 'right';
export type HorizontalSide = 'left' | 'right';
export type LabelAlign = 'left' | 'right';
export type EdgeType = 'child' | 'peer';

export interface GraphNode {
  id: string;
  label: string;
  source: unknown;
  zone: Zone;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  targetRadius: number;
  opacity: number;
  targetOpacity: number;
  isCentral: boolean;
}

export interface GraphEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: EdgeType;
  source: unknown;
}

export interface Point {
  x: number;
  y: number;
}

export interface BezierCurve {
  start: Point;
  cp1: Point;
  cp2: Point;
  end: Point;
}

export interface AnchorPair {
  start: Point;
  end: Point;
}

export interface NodeCurve {
  nodeId: string;
  edges: GraphEdge[];
  curve: BezierCurve;
}

export interface BezierConfig {
  startExtend: number;
  startOffset: number;
  endExtend: number;
  endOffset: number;
}

export interface NodeStyle {
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
}

export interface EdgeStyle {
  color?: string;
  strokeWidth?: number;
}

export interface HoverStyle {
  color?: string;
  strokeWidth?: number;
}

export interface DisplayConfig {
  nodeStyle?: (source: unknown) => NodeStyle;
  edgeStyle?: (source: unknown) => EdgeStyle;
  hover?: HoverStyle;
}

export interface RawNode {
  id: string;
  label: string;
  [key: string]: unknown;
}

export interface RawEdge {
  from: string;
  to: string;
  type: EdgeType;
  [key: string]: unknown;
}

export interface GraphData {
  central: string;
  nodes: RawNode[];
  edges: RawEdge[];
}
