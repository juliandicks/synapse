# Examples

## Custom Dataset

```ts
import { Cortex, Renderer, InputHandler, loadGraphData } from 'synapse-graph';
import type { GraphData } from 'synapse-graph';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const cortex = new Cortex(400, 300);
const renderer = new Renderer(canvas, {
  nodeStyle: (node) => {
    const kind = node.attributes.kind as string;
    const colors: Record<string, string> = {
      person: '#0f3460',
      place: '#2d6a4f',
      event: '#7b2d8e',
    };
    return { fillColor: colors[kind] ?? '#333' };
  },
  edgeStyle: (edge) => {
    const confidence = edge.attributes.confidence as string;
    return { strokeWidth: confidence === 'high' ? 3 : 1 };
  },
});
new InputHandler(cortex, renderer, canvas);

const data: GraphData = {
  central: 'node1',
  graphPolicy: {
    edgeDirection: 'Direction is from earlier to later.',
    criticalInfluenceRule: 'N/A',
    noIslandRule: 'Graph is connected.',
    scope: 'Custom dataset',
  },
  edgeLegend: {
    type: { influence: 'Inheritance or reaction', peer: 'Contemporary context' },
    confidence: { high: 'Well-documented', low: 'Speculative' },
    relation: {},
    category: {},
    polarity: {},
  },
  nodes: [
    { id: 'node1', label: 'Person A', kind: 'person', birthYear: '1900' },
    { id: 'node2', label: 'Person B', kind: 'person', birthYear: '1930' },
    { id: 'node3', label: 'Event X', kind: 'event', year: '1960' },
  ],
  edges: [
    { from: 'node1', to: 'node2', type: 'influence', relation: 'teacher-student', confidence: 'high' },
    { from: 'node2', to: 'node3', type: 'influence', relation: 'political-influence', confidence: 'low' },
  ],
};

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


