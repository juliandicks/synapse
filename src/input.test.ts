// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cortex } from './graph';
import { Renderer } from './renderer';
import { InputHandler } from './input';
import { loadGraphData } from './loader';
import type { GraphData } from './types';

function createMockContext() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    bezierCurveTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    setTransform: vi.fn(),
    measureText: vi.fn().mockReturnValue({ width: 50 }),
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    textAlign: '',
    textBaseline: '',
  } as unknown as CanvasRenderingContext2D;
}

const fixture: GraphData = {
  central: 'b',
  nodes: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
    { id: 'd', label: 'D' },
  ],
  edges: [
    { from: 'a', to: 'b', type: 'child' },
    { from: 'b', to: 'c', type: 'child' },
    { from: 'b', to: 'd', type: 'peer' },
  ],
};

describe('InputHandler', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let cortex: Cortex;
  let renderer: Renderer;
  let inputHandler: InputHandler;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    ctx = createMockContext();
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);

    canvas.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
    });

    cortex = new Cortex(400, 300);
    loadGraphData(cortex, fixture);
    cortex.update(1);

    renderer = new Renderer(canvas);
    inputHandler = new InputHandler(cortex, renderer, canvas);
  });

  describe('initialization', () => {
    it('creates input handler with cortex, renderer, and canvas', () => {
      expect(inputHandler.cortex).toBe(cortex);
      expect(inputHandler.renderer).toBe(renderer);
      expect(inputHandler.canvas).toBe(canvas);
    });

    it('sets up event listeners', () => {
      const addEventListenerSpy = vi.spyOn(canvas, 'addEventListener');
      new InputHandler(cortex, renderer, canvas);

      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    });
  });

  describe('click handling', () => {
    it('navigates to clicked node', () => {
      const child = cortex.getChildNodes().find((n) => n.id === 'c');
      if (child && child.targetOpacity > 0) {
        const event = new MouseEvent('click', {
          clientX: child.x,
          clientY: child.y,
        });
        canvas.dispatchEvent(event);

        expect(cortex.centralNode.id).toBe('c');
      }
    });

    it('does not navigate when clicking empty space', () => {
      const initialCentral = cortex.centralNode.id;
      const event = new MouseEvent('click', {
        clientX: 0,
        clientY: 0,
      });
      canvas.dispatchEvent(event);

      expect(cortex.centralNode.id).toBe(initialCentral);
    });

    it('navigates via curve click', () => {
      const curves = cortex.getAllNodeCurves();
      if (curves.length > 0) {
        const curve = curves[0].curve;
        // Calculate a point on the bezier curve (at t=0.5)
        const t = 0.5;
        const u = 1 - t;
        const pointX =
          u * u * u * curve.start.x +
          3 * u * u * t * curve.cp1.x +
          3 * u * t * t * curve.cp2.x +
          t * t * t * curve.end.x;
        const pointY =
          u * u * u * curve.start.y +
          3 * u * u * t * curve.cp1.y +
          3 * u * t * t * curve.cp2.y +
          t * t * t * curve.end.y;

        const event = new MouseEvent('click', {
          clientX: pointX,
          clientY: pointY,
        });
        canvas.dispatchEvent(event);

        // Curve click navigates to the target node (curve.nodeId)
        expect(cortex.centralNode.id).toBe(curves[0].nodeId);
      }
    });
  });

  describe('hover handling', () => {
    it('sets hovered node on mousemove', () => {
      const child = cortex.getChildNodes().find((n) => n.id === 'c');
      if (child && child.targetOpacity > 0) {
        const event = new MouseEvent('mousemove', {
          clientX: child.x,
          clientY: child.y,
        });
        canvas.dispatchEvent(event);

        expect(renderer.hoveredNodeId).toBe('c');
      }
    });

    it('clears hovered node when moving away', () => {
      const event = new MouseEvent('mousemove', {
        clientX: 0,
        clientY: 0,
      });
      canvas.dispatchEvent(event);

      expect(renderer.hoveredNodeId).toBeNull();
    });

    it('sets cursor to pointer when hovering', () => {
      const child = cortex.getChildNodes().find((n) => n.id === 'c');
      if (child && child.targetOpacity > 0) {
        const event = new MouseEvent('mousemove', {
          clientX: child.x,
          clientY: child.y,
        });
        canvas.dispatchEvent(event);

        expect(canvas.style.cursor).toBe('pointer');
      }
    });

    it('sets cursor to default when not hovering', () => {
      const event = new MouseEvent('mousemove', {
        clientX: 0,
        clientY: 0,
      });
      canvas.dispatchEvent(event);

      expect(canvas.style.cursor).toBe('default');
    });

    it('sets hovered curve when hovering over curve', () => {
      const curves = cortex.getAllNodeCurves();
      if (curves.length > 0) {
        const curve = curves[0].curve;
        // Calculate a point on the bezier curve (at t=0.5)
        const t = 0.5;
        const u = 1 - t;
        const testX =
          u * u * u * curve.start.x +
          3 * u * u * t * curve.cp1.x +
          3 * u * t * t * curve.cp2.x +
          t * t * t * curve.end.x;
        const testY =
          u * u * u * curve.start.y +
          3 * u * u * t * curve.cp1.y +
          3 * u * t * t * curve.cp2.y +
          t * t * t * curve.end.y;

        const event = new MouseEvent('mousemove', {
          clientX: testX,
          clientY: testY,
        });
        canvas.dispatchEvent(event);

        expect(renderer.hoveredCurveNodeId).toBe(curves[0].nodeId);
      }
    });

    it('clears hovered curve when moving away', () => {
      const event = new MouseEvent('mousemove', {
        clientX: 0,
        clientY: 0,
      });
      canvas.dispatchEvent(event);

      expect(renderer.hoveredCurveNodeId).toBeNull();
    });
  });

  describe('coordinate transformation', () => {
    it('handles canvas offset correctly', () => {
      canvas.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 100,
        top: 50,
        width: 800,
        height: 600,
      });

      const child = cortex.getChildNodes().find((n) => n.id === 'c');
      if (child && child.targetOpacity > 0) {
        const event = new MouseEvent('click', {
          clientX: child.x + 100,
          clientY: child.y + 50,
        });
        canvas.dispatchEvent(event);

        expect(cortex.centralNode.id).toBe('c');
      }
    });
  });
});
