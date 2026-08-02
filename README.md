# Synapse — Interactive Graph Visualization

[![npm version](https://img.shields.io/npm/v/synapse-graph?color=blue)](https://www.npmjs.com/package/synapse-graph)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/synapse-graph)](https://bundlephobia.com/package/synapse-graph)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org)

![Synapse Demo](https://raw.githubusercontent.com/juliandicks/synapse/master/docs/demo.gif)

> Canvas-based graph navigation tool for exploring relationships between entities. Click a node and it animates to center with the graph re-laying out around it.

## Features

- **Animated navigation** — click any node to bring it to center with smooth transitions
- **Automatic layout** — nodes arrange themselves intelligently in five zones around the active node
- **Relationship curves** — Bezier curves connect nodes with configurable styles
- **Hover interactions** — nodes and curves highlight on hover
- **Parent-controlled UI** — callbacks expose hover, click, and navigation events without owning your app chrome
- **Search helpers** — find nodes by label or a custom matcher over your source objects
- **HiDPI / Retina ready** — crisp rendering on high-density displays
- **Zero dependencies** — lightweight, tree-shakeable, works in any modern browser
- **TypeScript** — full type declarations included

## Quick Start

### Using the library

```bash
npm install synapse-graph
```

```ts
import { Cortex, Renderer, InputHandler, loadGraphData } from 'synapse-graph';
import type { GraphData } from 'synapse-graph';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const cortex = new Cortex(window.innerWidth / 2, window.innerHeight / 2, {
  onNavigate: ({ previousNode, currentNode, source }) => {
    console.log(`Moved from ${previousNode.label} to ${currentNode.label}`, source);
  },
});
const renderer = new Renderer(canvas);
new InputHandler(cortex, renderer, canvas, {
  onNodeHover: ({ node }) => console.log('Hovered node:', node.source),
  onCurveClick: ({ edges }) => console.log('Clicked relationship:', edges[0]?.source),
});

const data: GraphData = { /* your graph data */ };
loadGraphData(cortex, data);

function loop(time: number) {
  cortex.update(0.016);
  renderer.render(
    cortex.centralNode,
    cortex.getChildNodes(),
    cortex.getAllNodeCurves(),
    window.innerWidth,
    window.innerHeight,
  );
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### Running the demo app

```bash
git clone https://github.com/juliandicks/synapse.git
cd synapse
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Data Format

Nodes and edges are provided as plain objects with any domain-specific data:

```ts
interface RawNode {
  id: string;
  label: string;
  // Your domain data here
}

interface RawEdge {
  from: string;        // source node id
  to: string;          // target node id
  type: 'child' | 'peer';  // only two edge types supported
  // Your domain data here
}
```

The graph configuration is wrapped in a `GraphData` object:

```ts
interface GraphData {
  central: string;           // initial central node id
  nodes: RawNode[];
  edges: RawEdge[];
}
```

**Mapping edge types**: the library only accepts `'child'` and `'peer'` edge types. Normalize your domain-specific data before loading so Synapse stays focused on graph display and interaction:

```ts
const graphData: GraphData = {
  central: domainData.central,
  nodes: domainData.nodes,
  edges: domainData.edges.map((edge) => ({
    ...edge,
    domainType: edge.type,
    type: edge.type === 'influence' ? 'child' : 'peer',
  })),
};

loadGraphData(cortex, graphData);
```

## API Reference

### `Cortex`

The core graph engine — manages nodes, edges, layout, and animation.

| Method | Description |
|--------|-------------|
| `constructor(centerX, centerY, config?)` | Create a new graph centered at given coordinates with optional navigation callbacks |
| `addGraphNode(id, label, source?)` | Add a node with optional source object reference |
| `addEdge(sourceId, targetId, type, source?)` | Add a directed edge with optional source object reference |
| `navigateTo(id)` | Animate to make the given node the new center |
| `findNodes(query, options?)` | Return nodes matching a label search or parent-provided matcher |
| `loadGraphData(cortex, data)` | Bulk-load nodes and edges from a `GraphData` object |
| `update(dt)` | Step the animation by `dt` seconds |
| `getAllNodes()` | Return all nodes |
| `getChildNodes()` | Return all non-central nodes |
| `getAllNodeCurves()` | Return bezier curves for all visible connections |
| `hitTest(x, y)` | Return the node id at the given canvas coordinates |
| `removeNode(id)` | Remove a node and its edges |

`navigateTo` accepts an optional source label so parent code can distinguish UI actions:

```ts
cortex.navigateTo('kant', { source: 'search' });
```

`findNodes` performs a case-insensitive label search by default. Use `match` when your app wants to search source data that Synapse does not model:

```ts
const matches = cortex.findNodes('stoic', {
  limit: 8,
  match: (node, query) => {
    const source = node.source as { tradition?: string };
    return (
      node.label.toLocaleLowerCase().includes(query) ||
      source.tradition?.toLocaleLowerCase().includes(query) === true
    );
  },
});
```

### `Renderer`

Canvas drawing engine with configurable styles. Style callbacks receive the source objects you provided when adding nodes/edges:

```ts
const renderer = new Renderer(canvas, {
  nodeStyle: (source) => ({
    fillColor: (source as MyNode).color,
    strokeColor: '#533483',
    strokeWidth: 2,
  }),
  edgeStyle: (source) => ({
    color: (source as MyEdge).color,
    strokeWidth: 1,
  }),
  hover: {
    color: '#fff',
    strokeWidth: 3,
  },
});
```

### `InputHandler`

Handles mouse click and hover events.

```ts
const input = new InputHandler(cortex, renderer, canvas, {
  navigateOnClick: true,
  onNodeClick: ({ node }) => {
    console.log(node.source);
  },
  onNodeHover: ({ node }) => {
    console.log(node.label);
  },
});

input.destroy();
```

## Customization

### Node Styling

Supply your own `nodeStyle` callback to style nodes based on your domain data. The callback receives the source object you provided when adding the node.

### Layout

Adjust layout constants by importing them:

```ts
import { HORIZONTAL_OFFSET, VERTICAL_OFFSET, NODE_VERTICAL_SPACING } from 'synapse-graph';
```

## Examples

See the [`examples/`](examples/) directory for example applications:
- [`examples/philosophy/`](examples/philosophy/) — Interactive graph of philosophical influences

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

MIT
