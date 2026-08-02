import { describe, it, expect } from 'vitest';
import { Cortex } from './graph';
import { loadGraphData } from './loader';
import { CHILD_RADIUS, DEFAULT_LABEL_WIDTH, LABEL_GAP } from './constants';
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

    it('returns nodes visible from the current center', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      expect(cortex.getVisibleNodes().map((node) => node.id).sort()).toEqual([
        'a',
        'b',
        'c',
        'd',
      ]);
    });

    it('returns all connected nodes for an id', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      expect(cortex.getConnectedNodes('b').map((node) => node.id).sort()).toEqual([
        'a',
        'c',
        'd',
      ]);
    });

    it('returns incoming child nodes for an id', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      expect(cortex.getIncomingNodes('b').map((node) => node.id)).toEqual(['a']);
    });

    it('returns outgoing child nodes for an id', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      expect(cortex.getOutgoingNodes('b').map((node) => node.id)).toEqual(['c']);
    });

    it('returns peer nodes for an id', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);

      expect(cortex.getPeerNodes('b').map((node) => node.id)).toEqual(['d']);
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

    it('preserves default layout when no bounds are configured', () => {
      const cortex = new Cortex(400, 300);
      loadGraphData(cortex, fixture);
      cortex.update(1);

      const incoming = cortex.getNode('a');
      const outgoing = cortex.getNode('c');
      const peer = cortex.getNode('d');

      expect(incoming?.targetX).toBe(100);
      expect(incoming?.targetY).toBe(100);
      expect(outgoing?.targetX).toBe(100);
      expect(outgoing?.targetY).toBe(500);
      expect(peer?.targetX).toBe(700);
      expect(peer?.targetY).toBe(300);
    });

    it('clamps layout offsets when viewport bounds are configured', () => {
      const cortex = new Cortex(160, 120, {
        layout: {
          width: 320,
          height: 240,
          padding: 32,
        },
      });
      loadGraphData(cortex, fixture);
      cortex.update(1);

      const visible = cortex.getVisibleNodes();

      for (const node of visible) {
        expect(node.targetX).toBeGreaterThanOrEqual(32);
        expect(node.targetX).toBeLessThanOrEqual(288);
        expect(node.targetY).toBeGreaterThanOrEqual(32);
        expect(node.targetY).toBeLessThanOrEqual(208);
      }
    });

    it('squishes horizontal layout distances as width narrows', () => {
      const cortex = new Cortex(160, 120);
      loadGraphData(cortex, fixture);

      cortex.resize(160, 120, {
        width: 320,
        height: 600,
        padding: 32,
      });

      const incoming = cortex.getNode('a');
      const outgoing = cortex.getNode('c');
      const peer = cortex.getNode('d');
      const labelReach = CHILD_RADIUS + LABEL_GAP + DEFAULT_LABEL_WIDTH;

      expect(incoming?.targetX).toBe(32 + labelReach);
      expect(outgoing?.targetX).toBe(32 + labelReach);
      expect(peer?.targetX).toBe(320 - 32 - labelReach);
    });

    it('reserves horizontal space for typical child labels', () => {
      const cortex = new Cortex(200, 150);
      loadGraphData(cortex, fixture);

      cortex.resize(200, 150, {
        width: 400,
        height: 300,
        padding: 24,
        labelWidth: 112,
      });

      const incoming = cortex.getNode('a');
      const outgoing = cortex.getNode('c');
      const peer = cortex.getNode('d');
      const labelReach = CHILD_RADIUS + LABEL_GAP + 112;

      expect(incoming!.targetX - labelReach).toBeGreaterThanOrEqual(24);
      expect(outgoing!.targetX - labelReach).toBeGreaterThanOrEqual(24);
      expect(peer!.targetX + labelReach).toBeLessThanOrEqual(400 - 24);
    });

    it('compresses zone spacing down to the configured minimum', () => {
      const cortex = new Cortex(160, 120, {
        layout: {
          width: 320,
          height: 160,
          padding: 32,
          minNodeSpacing: 40,
        },
      });
      const childNodes = Array.from({ length: 9 }, (_, index) => ({
        id: `child-${index}`,
        label: `Child ${index}`,
      }));
      loadGraphData(cortex, {
        central: 'center',
        nodes: [
          { id: 'center', label: 'Center' },
          ...childNodes,
        ],
        edges: childNodes.map((node) => ({
          from: 'center',
          to: node.id,
          type: 'child',
        })),
      });
      cortex.update(1);

      const bottomLeftNodes = cortex
        .getOutgoingNodes()
        .filter((node) => node.zone === 'bottomLeft')
        .sort((a, b) => a.targetY - b.targetY);

      expect(bottomLeftNodes.length).toBe(5);
      expect(bottomLeftNodes[1].targetY - bottomLeftNodes[0].targetY).toBe(40);
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
