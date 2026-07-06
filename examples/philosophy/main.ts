import './style.css';
import { Cortex, Renderer, InputHandler, loadGraphData } from '../../src';
import type { GraphData, RawNode, RawEdge } from '../../src';
import philosophersData from '../data/philosophers.graph.json';

const canvas = document.getElementById('canvas') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('Canvas not found');
}

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Could not get 2D context');
}

const canvasEl = canvas;
const ctx2d = ctx;

const cortex = new Cortex(0, 0);

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

// Map philosophy data to library format
const rawNodes = philosophersData.nodes as RawNode[];
const rawEdges = philosophersData.edges as RawEdge[];

// Map 'influence' to 'child' for the library
const mappedEdges = rawEdges.map((e) => ({
  ...e,
  type: e.type === 'influence' ? 'child' : e.type,
}));

const graphData: GraphData = {
  central: philosophersData.central,
  nodes: rawNodes,
  edges: mappedEdges,
};

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
    const edge = source as RawEdge;
    const relation = edge.relation as string | undefined;
    const confidence = edge.confidence as string | undefined;
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

new InputHandler(cortex, renderer, canvasEl);
loadGraphData(cortex, graphData);

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
