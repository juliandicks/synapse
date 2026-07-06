import {
  COLORS,
  CENTRAL_STROKE_WIDTH,
  CHILD_STROKE_WIDTH,
  zoneToLabelAlign,
} from './constants';
import type {
  BezierCurve,
  GraphNode,
  NodeCurve,
  DisplayConfig,
  EdgeStyle,
} from './types';

export class Renderer {
  ctx: CanvasRenderingContext2D;
  hoveredNodeId: string | null = null;
  hoveredCurveNodeId: string | null = null;
  displayConfig: DisplayConfig;

  constructor(canvas: HTMLCanvasElement, displayConfig: DisplayConfig = {}) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = ctx;
    this.displayConfig = displayConfig;
  }

  setHoveredNode(id: string | null): void {
    this.hoveredNodeId = id;
  }

  setHoveredCurve(id: string | null): void {
    this.hoveredCurveNodeId = id;
  }

  clear(width: number, height: number): void {
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, width, height);
  }

  private drawBezierCurve(
    curve: BezierCurve,
    nodeId: string,
    opacity: number,
    style: EdgeStyle
  ): void {
    const hover = this.displayConfig.hover ?? {};
    const hoverColor = hover.color ?? '#fff';
    const hoverWidth = hover.strokeWidth ?? 3;
    const isHovered = this.hoveredCurveNodeId === nodeId;

    this.ctx.save();
    this.ctx.globalAlpha = opacity;
    this.ctx.beginPath();
    this.ctx.moveTo(curve.start.x, curve.start.y);
    this.ctx.bezierCurveTo(
      curve.cp1.x,
      curve.cp1.y,
      curve.cp2.x,
      curve.cp2.y,
      curve.end.x,
      curve.end.y
    );
    this.ctx.strokeStyle = isHovered ? hoverColor : style.color ?? COLORS.bezier;
    this.ctx.lineWidth = isHovered ? hoverWidth : style.strokeWidth ?? 1;
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawCentralNode(node: GraphNode): void {
    const isHovered = this.hoveredNodeId === node.id;
    const style = this.displayConfig.nodeStyle?.(node.source) ?? {};

    this.ctx.save();
    this.ctx.globalAlpha = node.opacity;
    this.ctx.beginPath();
    this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = style.fillColor ?? COLORS.centralFill;
    this.ctx.fill();
    this.ctx.strokeStyle = isHovered
      ? COLORS.nodeStrokeHover
      : style.strokeColor ?? COLORS.centralStroke;
    this.ctx.lineWidth = style.strokeWidth ?? CENTRAL_STROKE_WIDTH;
    this.ctx.stroke();

    this.ctx.fillStyle = COLORS.label;
    this.ctx.font = '13px system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(node.label, node.x, node.y + node.radius + 16);
    this.ctx.restore();
  }

  private drawChildNode(node: GraphNode): void {
    const isHovered = this.hoveredNodeId === node.id;
    const style = this.displayConfig.nodeStyle?.(node.source) ?? {};

    this.ctx.save();
    this.ctx.globalAlpha = node.opacity;
    this.ctx.beginPath();
    this.ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
    this.ctx.fillStyle = style.fillColor ?? COLORS.nodeFill;
    this.ctx.fill();
    this.ctx.strokeStyle = isHovered
      ? COLORS.nodeStrokeHover
      : style.strokeColor ?? COLORS.nodeStroke;
    this.ctx.lineWidth = isHovered
      ? CENTRAL_STROKE_WIDTH
      : style.strokeWidth ?? CHILD_STROKE_WIDTH;
    this.ctx.stroke();

    this.ctx.font = '13px system-ui, sans-serif';
    this.ctx.textBaseline = 'middle';
    if (zoneToLabelAlign(node.zone) === 'left') {
      this.ctx.textAlign = 'right';
      this.ctx.fillStyle = COLORS.label;
      this.ctx.fillText(node.label, node.x - node.radius - 8, node.y);
    } else {
      this.ctx.textAlign = 'left';
      this.ctx.fillStyle = COLORS.label;
      this.ctx.fillText(node.label, node.x + node.radius + 8, node.y);
    }
    this.ctx.restore();
  }

  render(
    centralNode: GraphNode,
    childNodes: GraphNode[],
    nodeCurves: NodeCurve[],
    width: number,
    height: number
  ): void {
    this.clear(width, height);

    const edgeStyleFn = this.displayConfig.edgeStyle;
    for (const { nodeId, curve, edges } of nodeCurves) {
      const node = childNodes.find((n) => n.id === nodeId) ?? centralNode;
      if (node.opacity < 0.01) continue;
      const firstEdge = edges[0];
      const style = (firstEdge && edgeStyleFn?.(firstEdge.source)) ?? {};
      this.drawBezierCurve(curve, nodeId, node.opacity, style);
    }

    this.drawCentralNode(centralNode);

    for (const node of childNodes) {
      if (node.opacity < 0.01) continue;
      this.drawChildNode(node);
    }
  }

}
