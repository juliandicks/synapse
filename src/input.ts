import { CURVE_HIT_THRESHOLD } from './constants';
import type { Cortex } from './graph';
import type { Renderer } from './renderer';
import type { BezierCurve, CurveInteractionEvent, InputHandlerConfig } from './types';

export class InputHandler {
  cortex: Cortex;
  renderer: Renderer;
  canvas: HTMLCanvasElement;
  config: InputHandlerConfig;
  private hoveredNodeId: string | null = null;
  private hoveredCurveNodeId: string | null = null;
  private readonly pointerUpHandler: (event: PointerEvent) => void;
  private readonly pointerMoveHandler: (event: PointerEvent) => void;

  constructor(
    cortex: Cortex,
    renderer: Renderer,
    canvas: HTMLCanvasElement,
    config: InputHandlerConfig = {}
  ) {
    this.cortex = cortex;
    this.renderer = renderer;
    this.canvas = canvas;
    this.config = config;
    this.pointerUpHandler = (event) => this.onPointerUp(event);
    this.pointerMoveHandler = (event) => this.onPointerMove(event);
    this.setupListeners();
  }

  private setupListeners(): void {
    this.canvas.addEventListener('pointerup', this.pointerUpHandler);
    this.canvas.addEventListener('pointermove', this.pointerMoveHandler);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerup', this.pointerUpHandler);
    this.canvas.removeEventListener('pointermove', this.pointerMoveHandler);
    if (this.config.updateCursor !== false) {
      this.canvas.style.cursor = 'default';
    }
  }

  private coords(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private onPointerUp(event: PointerEvent): void {
    const { x, y } = this.coords(event);
    const hit = this.cortex.hitTest(x, y);
    if (hit) {
      const node = this.cortex.getNode(hit);
      if (node) {
        this.config.onNodeClick?.({ x, y, originalEvent: event, node });
      }
      if (hit !== 'central' && this.config.navigateOnClick !== false) {
        this.cortex.navigateTo(hit, { source: 'input' });
      }
      return;
    }

    const curveHit = this.findCurveHit(x, y, event);
    if (curveHit) {
      this.config.onCurveClick?.(curveHit);
      if (this.config.navigateOnClick !== false) {
        this.cortex.navigateTo(curveHit.nodeId, { source: 'input' });
      }
    }
  }

  private findCurveHit(
    x: number,
    y: number,
    originalEvent: PointerEvent
  ): CurveInteractionEvent | null {
    for (const { nodeId, curve, edges } of this.cortex.getAllNodeCurves()) {
      if (this.distanceToCurveSync(x, y, curve) < CURVE_HIT_THRESHOLD) {
        return { x, y, originalEvent, nodeId, edges, curve };
      }
    }
    return null;
  }

  private updateHoverCallbacks(
    nextNodeId: string | null,
    nextCurve: CurveInteractionEvent | null,
    event: PointerEvent,
    x: number,
    y: number
  ): void {
    if (this.hoveredNodeId && this.hoveredNodeId !== nextNodeId) {
      const previousNode = this.cortex.getNode(this.hoveredNodeId);
      if (previousNode) {
        this.config.onNodeLeave?.({ x, y, originalEvent: event, node: previousNode });
      }
    }

    if (this.hoveredCurveNodeId && this.hoveredCurveNodeId !== nextCurve?.nodeId) {
      const previousCurve = this.cortex
        .getAllNodeCurves()
        .find((nodeCurve) => nodeCurve.nodeId === this.hoveredCurveNodeId);
      if (previousCurve) {
        this.config.onCurveLeave?.({
          x,
          y,
          originalEvent: event,
          nodeId: previousCurve.nodeId,
          edges: previousCurve.edges,
          curve: previousCurve.curve,
        });
      }
    }

    if (nextNodeId && this.hoveredNodeId !== nextNodeId) {
      const nextNode = this.cortex.getNode(nextNodeId);
      if (nextNode) {
        this.config.onNodeHover?.({ x, y, originalEvent: event, node: nextNode });
      }
    }

    if (nextCurve && this.hoveredCurveNodeId !== nextCurve.nodeId) {
      this.config.onCurveHover?.(nextCurve);
    }

    this.hoveredNodeId = nextNodeId;
    this.hoveredCurveNodeId = nextCurve?.nodeId ?? null;
  }

  private updateCursor(hovering: boolean): void {
    if (this.config.updateCursor !== false) {
      this.canvas.style.cursor = hovering ? 'pointer' : 'default';
    }
  }

  private onPointerMove(event: PointerEvent): void {
    const { x, y } = this.coords(event);
    const hit = this.cortex.hitTest(x, y);
    this.renderer.setHoveredNode(hit);

    let hovering = hit !== null;
    let curveHit: CurveInteractionEvent | null = null;
    if (hit) {
      this.renderer.setHoveredCurve(null);
    } else {
      curveHit = this.findCurveHit(x, y, event);
      if (curveHit) {
        hovering = true;
      }
      this.renderer.setHoveredCurve(curveHit?.nodeId ?? null);
    }

    this.updateHoverCallbacks(hit, curveHit, event, x, y);
    this.updateCursor(hovering);
  }

  private distanceToCurveSync(
    x: number,
    y: number,
    curve: BezierCurve
  ): number {
    // Inline the bezier sampling to avoid dynamic import in hot path.
    const steps = 20;
    let min = Infinity;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const px =
        u * u * u * curve.start.x +
        3 * u * u * t * curve.cp1.x +
        3 * u * t * t * curve.cp2.x +
        t * t * t * curve.end.x;
      const py =
        u * u * u * curve.start.y +
        3 * u * u * t * curve.cp1.y +
        3 * u * t * t * curve.cp2.y +
        t * t * t * curve.end.y;
      const dist = Math.hypot(x - px, y - py);
      if (dist < min) min = dist;
    }
    return min;
  }
}
