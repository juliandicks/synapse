import {
  CENTRAL_RADIUS,
  CHILD_RADIUS,
  HORIZONTAL_OFFSET,
  VERTICAL_OFFSET,
  RIGHT_ZONE_DISTANCE,
  NODE_VERTICAL_SPACING,
  BEZIER_CONFIG,
  POSITION_THRESHOLD,
  RADIUS_THRESHOLD,
  OPACITY_THRESHOLD,
  ANIMATION_SPEED,
  zoneToVerticalSide,
  zoneToHorizontalSide,
} from './constants';
import type {
  GraphNode,
  GraphEdge,
  Zone,
  AnchorPair,
  BezierCurve,
  NodeCurve,
  Point,
  EdgeType,
  CortexConfig,
  FindNodesOptions,
  NavigateOptions,
} from './types';

function computeZoneBasePosition(zone: Zone, centerX: number, centerY: number): Point {
  switch (zone) {
    case 'topLeft':
      return { x: centerX - HORIZONTAL_OFFSET, y: centerY - VERTICAL_OFFSET };
    case 'topRight':
      return { x: centerX + HORIZONTAL_OFFSET, y: centerY - VERTICAL_OFFSET };
    case 'bottomLeft':
      return { x: centerX - HORIZONTAL_OFFSET, y: centerY + VERTICAL_OFFSET };
    case 'bottomRight':
      return { x: centerX + HORIZONTAL_OFFSET, y: centerY + VERTICAL_OFFSET };
    case 'right':
      return { x: centerX + RIGHT_ZONE_DISTANCE, y: centerY };
  }
}

function layoutNodes(nodes: GraphNode[], centerX: number, centerY: number): void {
  for (const node of nodes) {
    if (node.isCentral) {
      node.targetX = centerX;
      node.targetY = centerY;
      node.targetRadius = CENTRAL_RADIUS;
      continue;
    }
    if (node.targetOpacity < OPACITY_THRESHOLD) continue;
    const base = computeZoneBasePosition(node.zone, centerX, centerY);
    node.targetX = base.x;
    node.targetY = base.y;
    node.targetRadius = CHILD_RADIUS;
  }

  for (const zone of [
    'topLeft',
    'topRight',
    'bottomLeft',
    'bottomRight',
    'right',
  ] as Zone[]) {
    const visible = nodes.filter(
      (n) =>
        !n.isCentral &&
        n.targetOpacity >= OPACITY_THRESHOLD &&
        n.zone === zone
    );
    if (visible.length < 2) continue;
    const base = computeZoneBasePosition(zone, centerX, centerY);
    const totalHeight = (visible.length - 1) * NODE_VERTICAL_SPACING;
    const startY = base.y - totalHeight / 2;
    visible.sort((a, b) => a.label.localeCompare(b.label));
    for (let i = 0; i < visible.length; i++) {
      visible[i].targetX = base.x;
      visible[i].targetY = startY + i * NODE_VERTICAL_SPACING;
    }
  }
}

function computeCurveAnchors(node: GraphNode, central: GraphNode): AnchorPair {
  const horizontal = zoneToHorizontalSide(node.zone);
  const vertical = zoneToVerticalSide(node.zone);

  let startX = node.x;
  let startY = node.y;
  if (horizontal === 'right') {
    startX += node.radius;
  } else {
    startX -= node.radius;
  }

  let endX = central.x;
  let endY = central.y;
  switch (vertical) {
    case 'top':
      endY -= central.radius;
      break;
    case 'bottom':
      endY += central.radius;
      break;
    case 'right':
      endX += central.radius;
      break;
    case 'left':
      endX -= central.radius;
      break;
  }

  return {
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
  };
}

function computeBezierControlPoints(
  start: Point,
  end: Point,
  config: (typeof BEZIER_CONFIG)[Zone],
  zone: Zone
): BezierCurve {
  const distance = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2) || 1;

  let nx: number;
  let ny: number;
  switch (zoneToHorizontalSide(zone)) {
    case 'right':
      nx = 1;
      ny = 0;
      break;
    case 'left':
    default:
      nx = -1;
      ny = 0;
      break;
  }

  let sx: number;
  let sy: number;
  switch (zoneToVerticalSide(zone)) {
    case 'top':
      sx = 0;
      sy = 1;
      break;
    case 'bottom':
      sx = 0;
      sy = -1;
      break;
    case 'right':
      sx = -1;
      sy = 0;
      break;
    case 'left':
      sx = 1;
      sy = 0;
      break;
  }

  const lx = ny;
  const ly = -nx;
  const tx = sx;
  const ty = -sy;

  const cp1 = {
    x:
      start.x +
      nx * distance * config.startExtend +
      lx * distance * config.startOffset,
    y:
      start.y +
      ny * distance * config.startExtend +
      ly * distance * config.startOffset,
  };

  const cp2 = {
    x: end.x - sx * distance * config.endExtend + tx * distance * config.endOffset,
    y: end.y - sy * distance * config.endExtend + ty * distance * config.endOffset,
  };

  return { start, cp1, cp2, end };
}

function animateNode(node: GraphNode, dt: number): boolean {
  const t = 1 - Math.exp(-ANIMATION_SPEED * dt);
  let settled = true;

  const dx = node.targetX - node.x;
  const dy = node.targetY - node.y;
  if (Math.sqrt(dx * dx + dy * dy) > POSITION_THRESHOLD) {
    settled = false;
    node.x += dx * t;
    node.y += dy * t;
  } else {
    node.x = node.targetX;
    node.y = node.targetY;
  }

  const dr = node.targetRadius - node.radius;
  if (Math.abs(dr) > RADIUS_THRESHOLD) {
    settled = false;
    node.radius += dr * t;
  } else {
    node.radius = node.targetRadius;
  }

  const da = node.targetOpacity - node.opacity;
  if (Math.abs(da) > OPACITY_THRESHOLD) {
    settled = false;
    node.opacity += da * t;
  } else {
    node.opacity = node.targetOpacity;
  }

  return settled;
}

export class Cortex {
  centralNode: GraphNode;
  centerX = 0;
  centerY = 0;
  nodes = new Map<string, GraphNode>();
  edges: GraphEdge[] = [];
  nextNodeId = 0;
  nextEdgeId = 0;
  config: CortexConfig;

  constructor(centerX: number, centerY: number, config: CortexConfig = {}) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.config = config;
    this.centralNode = this.makeNode('Central', null, true);
    this.centralNode.x = centerX;
    this.centralNode.y = centerY;
    this.centralNode.targetX = centerX;
    this.centralNode.targetY = centerY;
    this.centralNode.radius = CENTRAL_RADIUS;
    this.centralNode.targetRadius = CENTRAL_RADIUS;
    this.nodes.set(this.centralNode.id, this.centralNode);
  }

  addNode(label: string, source: unknown = null): GraphNode {
    const node = this.makeNode(label, source, false);
    this.nodes.set(node.id, node);
    return node;
  }

  addGraphNode(
    id: string,
    label: string,
    source: unknown = null
  ): GraphNode {
    if (this.nodes.has(id)) {
      return this.nodes.get(id)!;
    }
    const node: GraphNode = {
      id,
      label,
      source,
      zone: 'topLeft',
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      radius: CHILD_RADIUS,
      targetRadius: CHILD_RADIUS,
      opacity: 0,
      targetOpacity: 0,
      isCentral: false,
    };
    this.nodes.set(id, node);
    return node;
  }

  addEdge(
    sourceId: string,
    targetId: string,
    type: EdgeType,
    source: unknown = null
  ): GraphEdge {
    const edge: GraphEdge = {
      id: `edge-${++this.nextEdgeId}`,
      sourceId,
      targetId,
      type,
      source,
    };
    this.edges.push(edge);
    return edge;
  }

  removeNode(id: string): void {
    if (id === 'central') return;
    this.nodes.delete(id);
    this.edges = this.edges.filter(
      (e) => e.sourceId !== id && e.targetId !== id
    );
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  getAllNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  getChildNodes(): GraphNode[] {
    return this.getAllNodes().filter((n) => !n.isCentral);
  }

  setInitialView(id: string): void {
    const node = this.nodes.get(id);
    if (!node) return;

    this.nodes.delete(this.centralNode.id);
    node.isCentral = true;
    this.centralNode = node;
    this.centralNode.x = this.centerX;
    this.centralNode.y = this.centerY;
    this.centralNode.targetX = this.centerX;
    this.centralNode.targetY = this.centerY;
    this.centralNode.radius = CENTRAL_RADIUS;
    this.centralNode.targetRadius = CENTRAL_RADIUS;
    this.centralNode.opacity = 1;
    this.centralNode.targetOpacity = 1;

    this.assignZones(this.centerX, this.centerY);
    this.doLayout();
  }

  navigateTo(id: string, options: NavigateOptions = {}): boolean {
    const node = this.nodes.get(id);
    if (!node || node.isCentral) return false;

    const prevX = node.x;
    const prevY = node.y;
    const previousNode = this.centralNode;

    node.isCentral = true;
    node.targetOpacity = 1;
    this.centralNode.isCentral = false;
    this.centralNode = node;

    this.assignZones(prevX, prevY);
    this.doLayout();
    if (!options.silent) {
      this.config.onNavigate?.({
        previousNode,
        currentNode: this.centralNode,
        source: options.source,
      });
    }
    return true;
  }

  findNodes(query: string, options: FindNodesOptions = {}): GraphNode[] {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return [];
    if (options.limit !== undefined && options.limit <= 0) return [];

    const match =
      options.match ??
      ((node: GraphNode, searchQuery: string) =>
        node.label.toLocaleLowerCase().includes(searchQuery));

    const matches: GraphNode[] = [];
    for (const [, node] of this.nodes) {
      if (options.visibleOnly && node.targetOpacity < OPACITY_THRESHOLD) continue;
      if (match(node, normalizedQuery)) {
        matches.push(node);
      }
      if (options.limit !== undefined && matches.length >= options.limit) break;
    }

    return matches;
  }

  assignZones(originX: number, originY: number): void {
    const previouslyVisible = new Set<string>();
    for (const [, node] of this.nodes) {
      if (node.targetOpacity >= OPACITY_THRESHOLD) {
        previouslyVisible.add(node.id);
      }
    }

    for (const [, node] of this.nodes) {
      if (!node.isCentral) {
        node.targetOpacity = 0;
      }
    }

    for (const edge of this.edges) {
      if (edge.type !== 'peer') continue;
      if (edge.sourceId === this.centralNode.id) {
        const target = this.nodes.get(edge.targetId);
        if (target && !target.isCentral) {
          target.zone = 'right';
          target.targetOpacity = 1;
        }
      }
      if (edge.targetId === this.centralNode.id) {
        const source = this.nodes.get(edge.sourceId);
        if (source && !source.isCentral) {
          source.zone = 'right';
          source.targetOpacity = 1;
        }
      }
    }

    const incoming: GraphNode[] = [];
    for (const edge of this.edges) {
      if (
        edge.type === 'child' &&
        edge.targetId === this.centralNode.id
      ) {
        const source = this.nodes.get(edge.sourceId);
        if (source && !source.isCentral) {
          incoming.push(source);
        }
      }
    }
    incoming.sort((a, b) => a.label.localeCompare(b.label));
    const incomingSplit = Math.ceil(incoming.length / 2);
    incoming.forEach((node, i) => {
      node.zone = i < incomingSplit ? 'topLeft' : 'topRight';
      node.targetOpacity = 1;
    });

    const outgoing: GraphNode[] = [];
    for (const edge of this.edges) {
      if (
        edge.type === 'child' &&
        edge.sourceId === this.centralNode.id
      ) {
        const target = this.nodes.get(edge.targetId);
        if (target && !target.isCentral) {
          outgoing.push(target);
        }
      }
    }
    outgoing.sort((a, b) => a.label.localeCompare(b.label));
    const outgoingSplit = Math.ceil(outgoing.length / 2);
    outgoing.forEach((node, i) => {
      node.zone = i < outgoingSplit ? 'bottomLeft' : 'bottomRight';
      node.targetOpacity = 1;
    });

    for (const [, node] of this.nodes) {
      if (
        !node.isCentral &&
        node.targetOpacity >= OPACITY_THRESHOLD &&
        !previouslyVisible.has(node.id)
      ) {
        node.x = originX;
        node.y = originY;
      }
    }

    for (const [, node] of this.nodes) {
      if (!node.isCentral) {
        node.targetRadius =
          node.targetOpacity >= OPACITY_THRESHOLD ? CHILD_RADIUS : node.radius;
      }
    }
  }

  doLayout(): void {
    const all = this.getAllNodes();
    all.filter((n) => !n.isCentral && n.targetOpacity >= OPACITY_THRESHOLD);
    layoutNodes(all, this.centerX, this.centerY);
  }

  resize(centerX: number, centerY: number): void {
    this.centerX = centerX;
    this.centerY = centerY;
    this.doLayout();
  }

  recenter(x: number, y: number): void {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

    this.centerX = x;
    this.centerY = y;
    for (const [, node] of this.nodes) {
      node.x += dx;
      node.y += dy;
      node.targetX += dx;
      node.targetY += dy;
    }
  }

  update(dt: number): boolean {
    let settled = true;
    for (const [, node] of this.nodes) {
      if (!animateNode(node, dt)) {
        settled = false;
      }
    }
    return settled;
  }

  getCurveForNode(id: string): BezierCurve | null {
    const node = this.nodes.get(id);
    if (!node || node.isCentral) return null;
    const anchors = computeCurveAnchors(node, this.centralNode);
    return computeBezierControlPoints(
      anchors.start,
      anchors.end,
      BEZIER_CONFIG[node.zone],
      node.zone
    );
  }

  getAllNodeCurves(): NodeCurve[] {
    const curves: NodeCurve[] = [];
    for (const [, node] of this.nodes) {
      if (node.isCentral) continue;
      const anchors = computeCurveAnchors(node, this.centralNode);
      const connected = this.edges.filter(
        (e) =>
          (e.sourceId === node.id && e.targetId === this.centralNode.id) ||
          (e.targetId === node.id && e.sourceId === this.centralNode.id)
      );
      curves.push({
        nodeId: node.id,
        edges: connected,
        curve: computeBezierControlPoints(
          anchors.start,
          anchors.end,
          BEZIER_CONFIG[node.zone],
          node.zone
        ),
      });
    }
    return curves;
  }

  hitTest(x: number, y: number): string | null {
    for (const [, node] of this.nodes) {
      if (node.opacity < OPACITY_THRESHOLD) continue;
      if (Math.hypot(x - node.x, y - node.y) <= node.radius + 8) {
        return node.id;
      }
    }
    return null;
  }

  private makeNode(label: string, source: unknown, isCentral: boolean): GraphNode {
    return {
      id: isCentral ? 'central' : `node-${++this.nextNodeId}`,
      label,
      source,
      zone: 'topLeft',
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      radius: isCentral ? CENTRAL_RADIUS : CHILD_RADIUS,
      targetRadius: isCentral ? CENTRAL_RADIUS : CHILD_RADIUS,
      opacity: isCentral ? 1 : 0,
      targetOpacity: isCentral ? 1 : 0,
      isCentral,
    };
  }
}
