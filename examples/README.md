# Examples

## Custom Dataset

Synapse expects normalized graph semantics: `child` and `peer` edges. Keep your domain schema in parent code and convert it before calling `loadGraphData`.

```ts
import { Cortex, Renderer, InputHandler, loadGraphData } from 'synapse-graph';
import type { EdgeType, GraphData, RawEdge, RawNode } from 'synapse-graph';

type DomainNode = RawNode & {
  kind: 'person' | 'place' | 'event';
  birthYear?: string;
  year?: string;
};

type DomainEdge = Omit<RawEdge, 'type'> & {
  type: 'influence' | 'context';
  relation?: string;
  confidence?: 'high' | 'low';
};

type SynapseDomainEdge = RawEdge & {
  domainType: DomainEdge['type'];
  relation?: string;
  confidence?: DomainEdge['confidence'];
};

function mapDomainEdgeType(edge: DomainEdge): EdgeType {
  return edge.type === 'influence' ? 'child' : 'peer';
}

function toSynapseGraphData(
  central: string,
  nodes: DomainNode[],
  edges: DomainEdge[]
): GraphData {
  return {
    central,
    nodes,
    edges: edges.map((edge): SynapseDomainEdge => ({
      ...edge,
      type: mapDomainEdgeType(edge),
      domainType: edge.type,
    })),
  };
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const cortex = new Cortex(400, 300);
const renderer = new Renderer(canvas, {
  nodeStyle: (source) => {
    const node = source as DomainNode;
    const colors: Record<DomainNode['kind'], string> = {
      person: '#0f3460',
      place: '#2d6a4f',
      event: '#7b2d8e',
    };
    return { fillColor: colors[node.kind] };
  },
  edgeStyle: (source) => {
    const edge = source as SynapseDomainEdge;
    return { strokeWidth: edge.confidence === 'high' ? 3 : 1 };
  },
});
new InputHandler(cortex, renderer, canvas);

const nodes: DomainNode[] = [
  { id: 'node1', label: 'Person A', kind: 'person', birthYear: '1900' },
  { id: 'node2', label: 'Person B', kind: 'person', birthYear: '1930' },
  { id: 'node3', label: 'Event X', kind: 'event', year: '1960' },
];

const edges: DomainEdge[] = [
  { from: 'node1', to: 'node2', type: 'influence', relation: 'teacher-student', confidence: 'high' },
  { from: 'node2', to: 'node3', type: 'influence', relation: 'political-influence', confidence: 'low' },
];

loadGraphData(cortex, toSynapseGraphData('node1', nodes, edges));

function loop() {
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
