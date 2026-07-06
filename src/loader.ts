import type { Cortex } from './graph';
import type { GraphData } from './types';

export function loadGraphData(cortex: Cortex, data: GraphData): void {
  for (const node of data.nodes) {
    cortex.addGraphNode(node.id, node.label, node);
  }

  for (const edge of data.edges) {
    cortex.addEdge(edge.from, edge.to, edge.type, edge);
  }

  cortex.setInitialView(data.central);
}
