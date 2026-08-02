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

export interface FindNodesOptions {
  limit?: number;
  visibleOnly?: boolean;
  match?: (node: GraphNode, query: string) => boolean;
}

export interface NavigateOptions {
  source?: string;
  silent?: boolean;
}

export interface NavigationEvent {
  previousNode: GraphNode;
  currentNode: GraphNode;
  source?: string;
}

export interface LayoutConfig {
  width?: number;
  height?: number;
  padding?: number;
  minNodeSpacing?: number;
  minHorizontalOffset?: number;
  minRightZoneDistance?: number;
  labelWidth?: number;
  horizontalOffset?: number;
  verticalOffset?: number;
  rightZoneDistance?: number;
  nodeVerticalSpacing?: number;
}

export interface CortexConfig {
  layout?: LayoutConfig;
  onNavigate?: (event: NavigationEvent) => void;
}

export interface PointerGraphEvent {
  x: number;
  y: number;
  originalEvent: PointerEvent;
}

export interface NodeInteractionEvent extends PointerGraphEvent {
  node: GraphNode;
}

export interface CurveInteractionEvent extends PointerGraphEvent {
  nodeId: string;
  edges: GraphEdge[];
  curve: BezierCurve;
}

export interface InputHandlerConfig {
  navigateOnClick?: boolean;
  updateCursor?: boolean;
  onNodeClick?: (event: NodeInteractionEvent) => void;
  onCurveClick?: (event: CurveInteractionEvent) => void;
  onNodeHover?: (event: NodeInteractionEvent) => void;
  onNodeLeave?: (event: NodeInteractionEvent) => void;
  onCurveHover?: (event: CurveInteractionEvent) => void;
  onCurveLeave?: (event: CurveInteractionEvent) => void;
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
