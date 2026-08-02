import { Cortex, Renderer, InputHandler, loadGraphData } from '../../src';
import type { GraphData } from '../../src';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found');

const ctx = canvas.getContext('2d');
if (!ctx) throw new Error('Could not get 2D context');

const cortex = new Cortex(0, 0);

const testData: GraphData = {
  central: 'b',
  nodes: [
    { id: 'a', label: 'A', color: '#e94560' },
    { id: 'b', label: 'B', color: '#533483' },
    { id: 'c', label: 'C', color: '#0f3460' },
    { id: 'd', label: 'D', color: '#16213e' },
    { id: 'e', label: 'E', color: '#1a1a2e' },
    { id: 'f', label: 'F', color: '#e94560' },
  ],
  edges: [
    { from: 'a', to: 'b', type: 'child' },
    { from: 'b', to: 'c', type: 'child' },
    { from: 'b', to: 'd', type: 'peer' },
    { from: 'c', to: 'e', type: 'child' },
    { from: 'd', to: 'f', type: 'peer' },
  ],
};

const renderer = new Renderer(canvas, {
  nodeStyle: (source: any) => ({
    fillColor: source.color || '#0f3460',
    strokeColor: '#e94560',
    strokeWidth: 2,
  }),
  edgeStyle: () => ({
    color: '#533483',
    strokeWidth: 2,
  }),
  hover: {
    color: '#ffffff',
    strokeWidth: 4,
  },
});

function resize(): void {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cortex.resize(width / 2, height / 2, {
    width,
    height,
    padding: 32,
  });
}

resize();
window.addEventListener('resize', resize);

const inputHandler = new InputHandler(cortex, renderer, canvas);
loadGraphData(cortex, testData);

// Debug panel elements
const debugElements = {
  centralNode: document.getElementById('central-node')!,
  pointerPos: document.getElementById('pointer-pos')!,
  hitTest: document.getElementById('hit-test')!,
  hoveredNode: document.getElementById('hovered-node')!,
  hoveredCurve: document.getElementById('hovered-curve')!,
  totalNodes: document.getElementById('total-nodes')!,
  visibleNodes: document.getElementById('visible-nodes')!,
  totalEdges: document.getElementById('total-edges')!,
  fps: document.getElementById('fps')!,
};

const hitIndicator = document.getElementById('hit-indicator')!;

let pointerX = 0;
let pointerY = 0;
canvas.addEventListener('pointermove', (e) => {
  const rect = canvas.getBoundingClientRect();
  pointerX = e.clientX - rect.left;
  pointerY = e.clientY - rect.top;

  hitIndicator.style.left = `${e.clientX}px`;
  hitIndicator.style.top = `${e.clientY}px`;
});

// Test controls
document.getElementById('btn-navigate-a')?.addEventListener('click', () => cortex.navigateTo('a'));
document.getElementById('btn-navigate-b')?.addEventListener('click', () => cortex.navigateTo('b'));
document.getElementById('btn-navigate-c')?.addEventListener('click', () => cortex.navigateTo('c'));
document.getElementById('btn-navigate-d')?.addEventListener('click', () => cortex.navigateTo('d'));
document.getElementById('btn-reset')?.addEventListener('click', () => cortex.navigateTo('b'));

// FPS tracking
let frameCount = 0;
let lastFpsUpdate = performance.now();
let currentFps = 0;

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

  // Update debug panel
  debugElements.centralNode.textContent = cortex.centralNode.id;
  debugElements.pointerPos.textContent = `${Math.round(pointerX)}, ${Math.round(pointerY)}`;

  const hit = cortex.hitTest(pointerX, pointerY);
  debugElements.hitTest.textContent = hit || 'none';
  debugElements.hitTest.className = `debug-value ${hit ? 'hit' : 'miss'}`;

  hitIndicator.classList.toggle('active', hit !== null);

  const hoveredNode = renderer.hoveredNodeId;
  debugElements.hoveredNode.textContent = hoveredNode || 'none';
  debugElements.hoveredNode.className = `debug-value ${hoveredNode ? 'hit' : 'miss'}`;

  const hoveredCurve = renderer.hoveredCurveNodeId;
  debugElements.hoveredCurve.textContent = hoveredCurve || 'none';
  debugElements.hoveredCurve.className = `debug-value ${hoveredCurve ? 'hit' : 'miss'}`;

  debugElements.totalNodes.textContent = cortex.getAllNodes().length.toString();
  debugElements.visibleNodes.textContent = cortex.getChildNodes().filter(n => n.targetOpacity > 0).length.toString();
  debugElements.totalEdges.textContent = cortex.edges.length.toString();

  // FPS calculation
  frameCount++;
  if (timestamp - lastFpsUpdate >= 1000) {
    currentFps = frameCount;
    frameCount = 0;
    lastFpsUpdate = timestamp;
  }
  debugElements.fps.textContent = currentFps.toString();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

console.log('Visual test suite loaded');
console.log('Click nodes to navigate, hover to see hit tests');
console.log('Use test controls in bottom-left corner');
