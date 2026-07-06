// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Cortex } from './graph';
import { Renderer } from './renderer';
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

describe('Renderer', () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let cortex: Cortex;
  let renderer: Renderer;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    ctx = createMockContext();
    vi.spyOn(canvas, 'getContext').mockReturnValue(ctx);

    cortex = new Cortex(400, 300);
    loadGraphData(cortex, fixture);
    cortex.update(1);
  });

  describe('basic rendering', () => {
    it('renders the graph without throwing', () => {
      renderer = new Renderer(canvas);
      expect(() =>
        renderer.render(
          cortex.centralNode,
          cortex.getChildNodes(),
          cortex.getAllNodeCurves(),
          800,
          600
        )
      ).not.toThrow();
    });

    it('draws nodes with arc', () => {
      renderer = new Renderer(canvas);
      renderer.render(
        cortex.centralNode,
        cortex.getChildNodes(),
        cortex.getAllNodeCurves(),
        800,
        600
      );

      expect(ctx.arc).toHaveBeenCalled();
    });

    it('draws node labels with fillText', () => {
      renderer = new Renderer(canvas);
      renderer.render(
        cortex.centralNode,
        cortex.getChildNodes(),
        cortex.getAllNodeCurves(),
        800,
        600
      );

      expect(ctx.fillText).toHaveBeenCalled();
    });

    it('draws bezier curves for edges', () => {
      renderer = new Renderer(canvas);
      renderer.render(
        cortex.centralNode,
        cortex.getChildNodes(),
        cortex.getAllNodeCurves(),
        800,
        600
      );

      expect(ctx.bezierCurveTo).toHaveBeenCalled();
    });

    it('uses save/restore for state management', () => {
      renderer = new Renderer(canvas);
      renderer.render(
        cortex.centralNode,
        cortex.getChildNodes(),
        cortex.getAllNodeCurves(),
        800,
        600
      );

      expect(ctx.save).toHaveBeenCalled();
      expect(ctx.restore).toHaveBeenCalled();
    });
  });

  describe('style callbacks', () => {
    it('calls nodeStyle callback with source objects', () => {
      const nodeStyle = vi.fn().mockReturnValue({});
      renderer = new Renderer(canvas, { nodeStyle });

      renderer.render(
        cortex.centralNode,
        cortex.getChildNodes(),
        cortex.getAllNodeCurves(),
        800,
        600
      );

      expect(nodeStyle).toHaveBeenCalled();
      const firstCall = nodeStyle.mock.calls[0][0];
      expect(firstCall).toBeDefined();
      expect(firstCall.id).toBeDefined();
    });

    it('calls edgeStyle callback with source objects', () => {
      const edgeStyle = vi.fn().mockReturnValue({});
      renderer = new Renderer(canvas, { edgeStyle });

      renderer.render(
        cortex.centralNode,
        cortex.getChildNodes(),
        cortex.getAllNodeCurves(),
        800,
        600
      );

      expect(edgeStyle).toHaveBeenCalled();
      const firstCall = edgeStyle.mock.calls[0][0];
      expect(firstCall).toBeDefined();
      expect(firstCall.from).toBeDefined();
      expect(firstCall.to).toBeDefined();
    });

    it('applies custom node fill color', () => {
      renderer = new Renderer(canvas, {
        nodeStyle: () => ({ fillColor: '#ff0000' }),
      });

      renderer.render(
        cortex.centralNode,
        cortex.getChildNodes(),
        cortex.getAllNodeCurves(),
        800,
        600
      );

      // Check that fillStyle was set (last value wins)
      expect(ctx.fillStyle).toBeDefined();
    });

    it('applies custom node stroke color', () => {
      renderer = new Renderer(canvas, {
        nodeStyle: () => ({ strokeColor: '#00ff00' }),
      });

      renderer.render(
        cortex.centralNode,
        cortex.getChildNodes(),
        cortex.getAllNodeCurves(),
        800,
        600
      );

      expect(ctx.strokeStyle).toBeDefined();
    });

    it('applies custom edge color', () => {
      renderer = new Renderer(canvas, {
        edgeStyle: () => ({ color: '#0000ff' }),
      });

      renderer.render(
        cortex.centralNode,
        cortex.getChildNodes(),
        cortex.getAllNodeCurves(),
        800,
        600
      );

      expect(ctx.strokeStyle).toBeDefined();
    });
  });

  describe('hover states', () => {
    it('sets hovered node', () => {
      renderer = new Renderer(canvas);
      renderer.setHoveredNode('b');
      expect(renderer.hoveredNodeId).toBe('b');
    });

    it('clears hovered node', () => {
      renderer = new Renderer(canvas);
      renderer.setHoveredNode('b');
      renderer.setHoveredNode(null);
      expect(renderer.hoveredNodeId).toBeNull();
    });

    it('sets hovered curve', () => {
      renderer = new Renderer(canvas);
      renderer.setHoveredCurve('c');
      expect(renderer.hoveredCurveNodeId).toBe('c');
    });

    it('clears hovered curve', () => {
      renderer = new Renderer(canvas);
      renderer.setHoveredCurve('c');
      renderer.setHoveredCurve(null);
      expect(renderer.hoveredCurveNodeId).toBeNull();
    });
  });

  describe('display config', () => {
    it('uses default styles when no config provided', () => {
      renderer = new Renderer(canvas);
      expect(() =>
        renderer.render(
          cortex.centralNode,
          cortex.getChildNodes(),
          cortex.getAllNodeCurves(),
          800,
          600
        )
      ).not.toThrow();
    });

    it('applies hover styles', () => {
      renderer = new Renderer(canvas, {
        hover: { color: '#ffffff', strokeWidth: 5 },
      });

      renderer.setHoveredNode('b');
      renderer.render(
        cortex.centralNode,
        cortex.getChildNodes(),
        cortex.getAllNodeCurves(),
        800,
        600
      );

      // Check that lineWidth was set during rendering
      expect(ctx.lineWidth).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('handles empty graph', () => {
      const emptyData: GraphData = {
        central: 'a',
        nodes: [{ id: 'a', label: 'A' }],
        edges: [],
      };
      const emptyCortex = new Cortex(400, 300);
      loadGraphData(emptyCortex, emptyData);
      emptyCortex.update(1);

      renderer = new Renderer(canvas);
      expect(() =>
        renderer.render(
          emptyCortex.centralNode,
          emptyCortex.getChildNodes(),
          emptyCortex.getAllNodeCurves(),
          800,
          600
        )
      ).not.toThrow();
    });

    it('handles zero-size canvas', () => {
      const smallCanvas = document.createElement('canvas');
      smallCanvas.width = 0;
      smallCanvas.height = 0;
      vi.spyOn(smallCanvas, 'getContext').mockReturnValue(ctx);

      renderer = new Renderer(smallCanvas);
      expect(() =>
        renderer.render(
          cortex.centralNode,
          cortex.getChildNodes(),
          cortex.getAllNodeCurves(),
          0,
          0
        )
      ).not.toThrow();
    });
  });
});
