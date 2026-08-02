import './style.css';
import { Cortex, Renderer, InputHandler, loadGraphData } from '../../src';
import type { EdgeType, GraphData, GraphNode, RawEdge, RawNode } from '../../src';
import philosophersData from '../data/philosophers.graph.json';

type PhilosophyEdge = Omit<RawEdge, 'type'> & {
  type: 'influence' | 'peer';
  relation?: string;
  confidence?: string;
};

type PhilosophyGraphEdge = RawEdge & {
  domainType: PhilosophyEdge['type'];
  relation?: string;
  confidence?: string;
};

function getElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Element not found: ${id}`);
  }
  return element as T;
}

const canvas = getElement<HTMLCanvasElement>('canvas');
const searchInput = getElement<HTMLInputElement>('search');
const resultsEl = getElement<HTMLDivElement>('results');
const backButton = getElement<HTMLButtonElement>('back');
const forwardButton = getElement<HTMLButtonElement>('forward');
const statusEl = getElement<HTMLParagraphElement>('status');
const detailsEl = getElement<HTMLParagraphElement>('details');

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Could not get 2D context');
}

const canvasEl = canvas;
const ctx2d = ctx;

const backStack: string[] = [];
const forwardStack: string[] = [];
let focusedNodeId: string | null = null;

const cortex = new Cortex(0, 0, {
  onNavigate: ({ previousNode, currentNode, source }) => {
    if (source === 'history-back') {
      forwardStack.push(previousNode.id);
    } else if (source === 'history-forward') {
      backStack.push(previousNode.id);
    } else {
      backStack.push(previousNode.id);
      forwardStack.length = 0;
    }
    updateNavigationControls();
    clearKeyboardFocus();
    updateDetails(currentNode, `Centered via ${source ?? 'API'}.`);
    renderSearchResults();
  },
});

const PERIODS = [
  'ancient',
  'hellenistic',
  'roman',
  'late-antique',
  'early-medieval',
  'medieval',
  'renaissance',
  'early-modern',
  'enlightenment',
  'modern',
] as const;

function periodColor(period: string): string | undefined {
  const index = PERIODS.indexOf(period as (typeof PERIODS)[number]);
  if (index === -1) return undefined;
  return `hsl(270, 55%, ${20 + (index / (PERIODS.length - 1)) * 55}%)`;
}

const rawNodes = philosophersData.nodes as RawNode[];
const rawEdges = philosophersData.edges as PhilosophyEdge[];

function mapPhilosophyEdgeType(edge: PhilosophyEdge): EdgeType {
  return edge.type === 'influence' ? 'child' : 'peer';
}

function toSynapseGraphData(
  nodes: RawNode[],
  edges: PhilosophyEdge[],
  central: string
): GraphData {
  return {
    central,
    nodes,
    edges: edges.map((edge): PhilosophyGraphEdge => ({
      ...edge,
      type: mapPhilosophyEdgeType(edge),
      domainType: edge.type,
    })),
  };
}

const graphData = toSynapseGraphData(
  rawNodes,
  rawEdges,
  philosophersData.central
);

const traditions = [
  ...new Set(
    rawNodes
      .map((n) => n.tradition)
      .filter((t): t is string => typeof t === 'string')
  ),
].sort();
const traditionColors = new Map<string, string>();
traditions.forEach((tradition, i) => {
  const hue = (i * 137.5) % 360;
  traditionColors.set(tradition, `hsl(${hue.toFixed(1)}, 55%, 28%)`);
});

const renderer = new Renderer(canvas, {
  nodeStyle: (source) => {
    const node = source as RawNode;
    const tradition = node.tradition as string | undefined;
    const fillColor = tradition ? traditionColors.get(tradition) : undefined;
    const strokeColor = periodColor(node.period as string);
    return { fillColor, strokeColor };
  },
  edgeStyle: (source) => {
    const edge = source as PhilosophyGraphEdge;
    const relation = edge.relation;
    const confidence = edge.confidence;
    let color: string | undefined;
    let strokeWidth = 1;
    if (relation === 'critique-response') {
      color = '#e94560';
    }
    if (confidence === 'strong') {
      strokeWidth = 3;
    } else if (confidence === 'medium') {
      strokeWidth = 2;
    }
    return { color, strokeWidth };
  },
});

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function describeNode(node: GraphNode): string {
  const source = node.source as RawNode;
  const incomingNodes = cortex.getIncomingNodes(node.id);
  const outgoingNodes = cortex.getOutgoingNodes(node.id);
  const peerNodes = cortex.getPeerNodes(node.id);
  const fields = [
    stringField(source.birthYear) ? `Born: ${source.birthYear}` : null,
    stringField(source.period) ? `Period: ${source.period}` : null,
    stringField(source.tradition) ? `Tradition: ${source.tradition}` : null,
    `Incoming: ${incomingNodes.length}`,
    `Outgoing: ${outgoingNodes.length}`,
    `Peers: ${peerNodes.length}`,
    outgoingNodes.length > 0
      ? `Influences: ${outgoingNodes.map((connected) => connected.label).join(', ')}`
      : null,
  ].filter((field): field is string => field !== null);

  return fields.length > 0 ? `${node.label}\n${fields.join('\n')}` : node.label;
}

function updateDetails(node: GraphNode, status: string): void {
  statusEl.textContent = status;
  detailsEl.textContent = describeNode(node);
}

function updateNavigationControls(): void {
  backButton.disabled = backStack.length === 0;
  forwardButton.disabled = forwardStack.length === 0;
}

function matchesSearch(node: GraphNode, query: string): boolean {
  const source = node.source as RawNode;
  return [node.label, source.birthYear, source.period, source.tradition].some(
    (value) =>
      typeof value === 'string' && value.toLocaleLowerCase().includes(query)
  );
}

function renderSearchResults(): void {
  const query = searchInput.value;
  const matches = cortex.findNodes(query, {
    limit: 8,
    match: matchesSearch,
  });
  resultsEl.replaceChildren();

  if (query.trim().length === 0) {
    resultsEl.textContent = 'Search labels, periods, traditions, or years.';
    return;
  }

  if (matches.length === 0) {
    resultsEl.textContent = 'No matching nodes.';
    return;
  }

  for (const node of matches) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'result-button';
    button.textContent = node.label;
    button.setAttribute(
      'aria-current',
      node.id === cortex.centralNode.id ? 'true' : 'false'
    );
    button.addEventListener('click', () => {
      cortex.navigateTo(node.id, { source: 'search' });
    });
    resultsEl.append(button);
  }
}

function canUseGraphShortcut(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return true;
  return target === document.body || target === canvasEl;
}

function getKeyboardCandidates(): GraphNode[] {
  return cortex
    .getVisibleNodes()
    .sort((a, b) => {
      if (a.isCentral !== b.isCentral) {
        return a.isCentral ? -1 : 1;
      }
      const zoneCompare = a.zone.localeCompare(b.zone);
      return zoneCompare === 0 ? a.label.localeCompare(b.label) : zoneCompare;
    });
}

function clearKeyboardFocus(): void {
  focusedNodeId = null;
  renderer.setHoveredNode(null);
  renderer.setHoveredCurve(null);
}

function focusKeyboardCandidate(direction: 1 | -1): void {
  const candidates = getKeyboardCandidates();
  if (candidates.length === 0) return;
  const currentIndex = focusedNodeId
    ? candidates.findIndex((node) => node.id === focusedNodeId)
    : -1;
  const fallbackIndex = direction === 1 ? 0 : candidates.length - 1;
  const nextIndex =
    currentIndex === -1
      ? fallbackIndex
      : (currentIndex + direction + candidates.length) % candidates.length;
  const nextNode = candidates[nextIndex];
  focusedNodeId = nextNode.id;
  renderer.setHoveredNode(nextNode.id);
  renderer.setHoveredCurve(null);
  updateDetails(
    nextNode,
    nextNode.isCentral
      ? 'Keyboard focus on center node.'
      : 'Keyboard focus. Press Enter to navigate.'
  );
}

function navigateToFocusedNode(): void {
  if (!focusedNodeId) return;
  if (!cortex.navigateTo(focusedNodeId, { source: 'keyboard' })) {
    updateDetails(cortex.centralNode, 'Already centered.');
  }
}

function navigateToHistoryBack(): void {
  const nodeId = backStack.pop();
  if (!nodeId) return;
  cortex.navigateTo(nodeId, { source: 'history-back' });
}

function navigateToHistoryForward(): void {
  const nodeId = forwardStack.pop();
  if (!nodeId) return;
  cortex.navigateTo(nodeId, { source: 'history-forward' });
}

searchInput.addEventListener('input', renderSearchResults);

backButton.addEventListener('click', () => {
  navigateToHistoryBack();
});

forwardButton.addEventListener('click', () => {
  navigateToHistoryForward();
});

document.addEventListener('keydown', (event) => {
  if (event.key === '/' && canUseGraphShortcut(event)) {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
    return;
  }

  if (event.key === 'Escape' && document.activeElement === searchInput) {
    searchInput.value = '';
    renderSearchResults();
    searchInput.blur();
    return;
  }

  if (!canUseGraphShortcut(event)) return;

  if (event.key === '[') {
    event.preventDefault();
    clearKeyboardFocus();
    navigateToHistoryBack();
    return;
  }

  if (event.key === ']') {
    event.preventDefault();
    clearKeyboardFocus();
    navigateToHistoryForward();
    return;
  }

  if (event.key === 'Tab') {
    event.preventDefault();
    focusKeyboardCandidate(event.shiftKey ? -1 : 1);
    return;
  }

  if (event.key === 'Enter') {
    event.preventDefault();
    navigateToFocusedNode();
  }
});

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvasEl.width = width * dpr;
  canvasEl.height = height * dpr;
  canvasEl.style.width = `${width}px`;
  canvasEl.style.height = `${height}px`;
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  cortex.resize(width / 2, height / 2);
}

resize();
window.addEventListener('resize', resize);

new InputHandler(cortex, renderer, canvasEl, {
  onNodeHover: ({ node }) => {
    updateDetails(node, 'Hovering node.');
  },
  onNodeLeave: () => {
    updateDetails(cortex.centralNode, 'Activate a node or curve to navigate.');
  },
  onCurveHover: ({ nodeId, edges }) => {
    const node = cortex.getNode(nodeId);
    const firstEdge = edges[0]?.source as PhilosophyGraphEdge | undefined;
    const relation = stringField(firstEdge?.relation);
    statusEl.textContent = relation
      ? `Hovering ${relation} relationship.`
      : 'Hovering relationship.';
    detailsEl.textContent = node ? describeNode(node) : '';
  },
  onCurveLeave: () => {
    updateDetails(cortex.centralNode, 'Activate a node or curve to navigate.');
  },
  onNodeClick: ({ node }) => {
    updateDetails(node, 'Node activation received by parent.');
  },
  onCurveClick: ({ nodeId }) => {
    const node = cortex.getNode(nodeId);
    if (node) {
      updateDetails(node, 'Curve activation received by parent.');
    }
  },
});
loadGraphData(cortex, graphData);
updateDetails(cortex.centralNode, 'Activate a node or curve to navigate.');
updateNavigationControls();
renderSearchResults();

let lastTime = performance.now();
function loop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;
  cortex.update(dt);
  renderer.render(
    cortex.centralNode,
    cortex.getChildNodes(),
    cortex.getAllNodeCurves(),
    window.innerWidth,
    window.innerHeight
  );
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
