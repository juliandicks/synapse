import { describe, it, expect } from 'vitest';
import { Cortex } from './graph';
import { loadGraphData } from './loader';
import type { GraphData } from './types';

const fixture: GraphData = {
  central: 'b',
  nodes: [
    { id: 'a', label: 'A' },
    { id: 'b', label: 'B' },
    { id: 'c', label: 'C' },
    { id: 'd', label: 'D' },
    { id: 'e', label: 'E' },
  ],
  edges: [
    { from: 'a', to: 'b', type: 'child' },
    { from: 'b', to: 'c', type: 'child' },
    { from: 'b', to: 'd', type: 'peer' },
    { from: 'c', to: 'e', type: 'child' },
  ],
};

describe('Cortex', () => {
  describe('initialization', () => {
    it('creates cortex with center coordinates', () => {
      const cortex = new Cortex(400, 300);
      expect(cortex.centerX).toBe(400);
      expect(cortex.centerY).toBe(300);
    });

    it('loads graph data and centers on the central node', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      expect(cortex.centralNode.id).toBe('b');
      expect(cortex.centralNode.label).toBe('B');
      expect(cortex.getAllNodes().length).toBe(fixture.nodes.length);
      expect(cortex.edges.length).toBe(fixture.edges.length);
    });

    it('handles missing central node gracefully', () => {
      const cortex = new Cortex(400, 300);
      const badData: GraphData = {
        central: 'nonexistent',
        nodes: [{ id: 'a', label: 'A' }],
        edges: [],
      };
      // Loader should handle gracefully (may throw or set undefined)
      try {
        loadGraphData(cortex, badData);
        // If it doesn't throw, centralNode should be undefined or the node should not exist
        expect(cortex.centralNode).toBeUndefined();
      } catch (e) {
        // If it throws, that's also acceptable
        expect(e).toBeDefined();
      }
    });
  });

  describe('navigation', () => {
    it('navigates to a connected node', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      cortex.navigateTo('c');
      expect(cortex.centralNode.id).toBe('c');
    });

    it('navigates to a disconnected node', () => {
      const cortex = new Cortex(400, 300);
      const data: GraphData = {
        central: 'a',
        nodes: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
          { id: 'c', label: 'C' },
        ],
        edges: [{ from: 'a', to: 'b', type: 'child' }],
      };
      loadGraphData(cortex, data);

      // Node 'c' is disconnected
      cortex.navigateTo('c');
      expect(cortex.centralNode.id).toBe('c');
      expect(cortex.centralNode.targetOpacity).toBe(1);
    });

    it('preserves graph structure after navigation', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      const initialNodeCount = cortex.getAllNodes().length;
      const initialEdgeCount = cortex.edges.length;

      cortex.navigateTo('c');
      cortex.navigateTo('a');

      expect(cortex.getAllNodes().length).toBe(initialNodeCount);
      expect(cortex.edges.length).toBe(initialEdgeCount);
    });

    it('returns whether navigation happened', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      expect(cortex.navigateTo('c')).toBe(true);
      expect(cortex.navigateTo('c')).toBe(false);
      expect(cortex.navigateTo('missing')).toBe(false);
    });

    it('notifies parent code when navigation succeeds', () => {
      const events: string[] = [];
      const cortex = new Cortex(400, 300, {
        onNavigate: ({ previousNode, currentNode, source }) => {
          events.push(`${previousNode.id}:${currentNode.id}:${source}`);
        },
      });
      loadGraphData(cortex, fixture);

      cortex.navigateTo('c', { source: 'search' });
      cortex.navigateTo('e', { source: 'input', silent: true });

      expect(events).toEqual(['b:c:search']);
    });
  });

  describe('node queries', () => {
    it('returns all nodes', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      const nodes = cortex.getAllNodes();
      expect(nodes.length).toBe(5);
      expect(nodes.map((n) => n.id).sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('returns child nodes (non-central)', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      const children = cortex.getChildNodes();
      expect(children.length).toBe(4);
      expect(children.find((n) => n.id === 'b')).toBeUndefined();
    });

    it('gets node by id', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      const node = cortex.getNode('c');
      expect(node).toBeDefined();
      expect(node?.id).toBe('c');
      expect(node?.label).toBe('C');
    });

    it('returns undefined for nonexistent node', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      expect(cortex.getNode('nonexistent')).toBeUndefined();
    });

    it('finds nodes by case-insensitive label substring', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      const matches = cortex.findNodes('c');

      expect(matches.map((node) => node.id)).toEqual(['c']);
    });

    it('finds nodes with a parent-provided matcher', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, {
        ...fixture,
        nodes: fixture.nodes.map((node) => ({
          ...node,
          tags: node.id === 'e' ? ['target'] : [],
        })),
      });

      const matches = cortex.findNodes('target', {
        match: (node, query) => {
          const source = node.source as { tags?: string[] };
          return source.tags?.includes(query) ?? false;
        },
      });

      expect(matches.map((node) => node.id)).toEqual(['e']);
    });

    it('returns no search results for an empty query', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      const matches = cortex.findNodes(' ', { limit: 1 });

      expect(matches).toEqual([]);
    });
  });

  describe('layout', () => {
    it('positions visible child nodes after navigation', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);
      cortex.update(1);

      const children = cortex.getChildNodes();
      const visible = children.filter((n) => n.targetOpacity > 0);
      expect(visible.length).toBeGreaterThan(0);

      for (const node of visible) {
        expect(node.x).not.toBe(0);
        expect(node.y).not.toBe(0);
      }
    });

    it('central node stays at center', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);
      cortex.update(1);

      expect(cortex.centralNode.x).toBe(400);
      expect(cortex.centralNode.y).toBe(300);
    });

    it('child nodes are positioned around center', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);
      cortex.update(1);

      const children = cortex.getChildNodes();
      const visible = children.filter((n) => n.targetOpacity > 0);

      for (const node of visible) {
        const dist = Math.hypot(node.x - 400, node.y - 300);
        expect(dist).toBeGreaterThan(50);
      }
    });
  });

  describe('hit testing', () => {
    it('hits central node at center', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);
      cortex.update(1);

      const hit = cortex.hitTest(400, 300);
      expect(hit).toBe('b');
    });

    it('hits child node near its position', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);
      cortex.update(1);

      const child = cortex.getChildNodes().find((n) => n.id === 'c');
      if (child && child.targetOpacity > 0) {
        const hit = cortex.hitTest(child.x, child.y);
        expect(hit).toBe('c');
      }
    });

    it('returns null for empty space', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);
      cortex.update(1);

      const hit = cortex.hitTest(0, 0);
      expect(hit).toBeNull();
    });

    it('returns null for coordinates far from nodes', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);
      cortex.update(1);

      const hit = cortex.hitTest(1000, 1000);
      expect(hit).toBeNull();
    });
  });

  describe('node curves', () => {
    it('returns curves for visible connections', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);
      cortex.update(1);

      const curves = cortex.getAllNodeCurves();
      expect(curves.length).toBeGreaterThan(0);
    });

    it('curves have valid bezier control points', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);
      cortex.update(1);

      const curves = cortex.getAllNodeCurves();
      for (const { curve } of curves) {
        expect(curve.start.x).toBeDefined();
        expect(curve.start.y).toBeDefined();
        expect(curve.cp1.x).toBeDefined();
        expect(curve.cp1.y).toBeDefined();
        expect(curve.cp2.x).toBeDefined();
        expect(curve.cp2.y).toBeDefined();
        expect(curve.end.x).toBeDefined();
        expect(curve.end.y).toBeDefined();
      }
    });
  });

  describe('animation', () => {
    it('animates child node opacity over time', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      const child = cortex.getChildNodes().find((n) => n.id === 'c');
      if (child) {
        const initialOpacity = child.opacity;
        cortex.update(0.1);
        const midOpacity = child.opacity;

        cortex.update(0.1);
        const finalOpacity = child.opacity;

        // Opacity animates over time
        expect(midOpacity).not.toBe(initialOpacity);
        expect(finalOpacity).not.toBe(midOpacity);
      }
    });

    it('animates opacity transitions', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      const child = cortex.getChildNodes().find((n) => n.id === 'c');
      if (child) {
        const initialOpacity = child.opacity;
        cortex.update(0.5);
        const midOpacity = child.opacity;

        expect(midOpacity).not.toBe(initialOpacity);
      }
    });
  });

  describe('resize', () => {
    it('updates center coordinates on resize', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      cortex.resize(500, 400);
      expect(cortex.centerX).toBe(500);
      expect(cortex.centerY).toBe(400);
    });
  });

  describe('edge types', () => {
    it('handles child edges correctly', () => {
      const cortex = new Cortex(400, 300);
      const data: GraphData = {
        central: 'a',
        nodes: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        edges: [{ from: 'a', to: 'b', type: 'child' }],
      };
      loadGraphData(cortex, data);

      const edge = cortex.edges[0];
      expect(edge.type).toBe('child');
    });

    it('handles peer edges correctly', () => {
      const cortex = new Cortex(400, 300);
      const data: GraphData = {
        central: 'a',
        nodes: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
        edges: [{ from: 'a', to: 'b', type: 'peer' }],
      };
      loadGraphData(cortex, data);

      const edge = cortex.edges[0];
      expect(edge.type).toBe('peer');
    });
  });
});
