import { CURVE_HIT_THRESHOLD } from './constants';
import type { Cortex } from './graph';
import type { Renderer } from './renderer';
import type { BezierCurve } from './types';

export class InputHandler {
  cortex: Cortex;
  renderer: Renderer;
  canvas: HTMLCanvasElement;

  constructor(cortex: Cortex, renderer: Renderer, canvas: HTMLCanvasElement) {
    this.cortex = cortex;
    this.renderer = renderer;
    this.canvas = canvas;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
  }

  private coords(event: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  private onClick(event: MouseEvent): void {
    const { x, y } = this.coords(event);
    const hit = this.cortex.hitTest(x, y);
    if (hit && hit !== 'central') {
      this.cortex.navigateTo(hit);
      return;
    }

    for (const { nodeId, curve } of this.cortex.getAllNodeCurves()) {
      if (this.distanceToCurveSync(x, y, curve) < CURVE_HIT_THRESHOLD) {
        this.cortex.navigateTo(nodeId);
        return;
      }
    }
  }

  private onMouseMove(event: MouseEvent): void {
    const { x, y } = this.coords(event);
    const hit = this.cortex.hitTest(x, y);
    this.renderer.setHoveredNode(hit);

    let hovering = hit !== null;
    if (hit) {
      this.renderer.setHoveredCurve(null);
    } else {
      let curveHit: string | null = null;
      for (const { nodeId, curve } of this.cortex.getAllNodeCurves()) {
        if (this.distanceToCurveSync(x, y, curve) < CURVE_HIT_THRESHOLD) {
          curveHit = nodeId;
          hovering = true;
          break;
        }
      }
      this.renderer.setHoveredCurve(curveHit);
    }

    this.canvas.style.cursor = hovering ? 'pointer' : 'default';
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
