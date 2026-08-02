import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function logStep(message) {
  console.log(`[test:packaged] ${message}`);
}

function run(command, args, options = {}) {
  const { env: extraEnv, label, ...restOptions } = options;
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      ...extraEnv,
    },
    ...restOptions,
  });

  if (result.status !== 0) {
    const message = [
      label ? `[test:packaged] failed at ${label}` : null,
      `Command failed: ${command} ${args.join(' ')}`,
      result.stdout?.trim(),
      result.stderr?.trim(),
    ]
      .filter(Boolean)
      .join('\n');
    throw new Error(message);
  }

  return result.stdout.trim();
}

function createContext() {
  return {
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    bezierCurveTo() {},
    arc() {},
    fill() {},
    stroke() {},
    fillRect() {},
    fillText() {},
    setTransform() {},
    measureText() {
      return { width: 0 };
    },
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    textAlign: '',
    textBaseline: '',
  };
}

class MockCanvas {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.style = { cursor: 'default' };
    this.listeners = new Map();
    this.context = createContext();
  }

  getContext(type) {
    return type === '2d' ? this.context : null;
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: this.width,
      height: this.height,
    };
  }

  dispatch(type, event) {
    const handler = this.listeners.get(type);
    if (!handler) {
      throw new Error(`No listener registered for ${type}`);
    }
    handler(event);
  }
}

async function main() {
  const workDir = await mkdtemp(path.join(tmpdir(), 'synapse-pack-'));
  const appDir = path.join(workDir, 'app');
  const npmCacheDir = path.join(workDir, 'npm-cache');
  await mkdir(appDir);

  try {
    logStep('building the library');
    run('npm', ['run', 'build'], {
      env: {
        npm_config_cache: npmCacheDir,
      },
    });
    logStep('build complete');

    logStep('packing the publishable tarball');
    const packedOutput = run('npm', [
      'pack',
      '--json',
      '--ignore-scripts',
      '--pack-destination',
      workDir,
    ], {
      env: {
        npm_config_cache: npmCacheDir,
      },
    });
    logStep('tarball packed');
    const packedFiles = JSON.parse(packedOutput);
    const tarballName = packedFiles.at(-1)?.filename;

    assert.ok(tarballName, 'npm pack did not return a tarball filename');

    const tarballPath = path.join(workDir, tarballName);
    logStep('preparing the smoke-test app');
    await writeFile(
      path.join(appDir, 'package.json'),
      JSON.stringify(
        {
          name: 'synapse-pack-smoke',
          private: true,
          type: 'module',
        },
        null,
        2
      )
    );

    logStep('installing the tarball into the smoke-test app');
    run('npm', ['install', '--ignore-scripts', '--no-save', tarballPath], {
      cwd: appDir,
      env: {
        npm_config_cache: npmCacheDir,
      },
    });
    logStep('running the packaged smoke test');

    const smokeSource = `
import assert from 'node:assert/strict';
import { Cortex, Renderer, InputHandler, loadGraphData } from 'synapse-graph';

function createContext() {
  return {
    save() {},
    restore() {},
    beginPath() {},
    moveTo() {},
    bezierCurveTo() {},
    arc() {},
    fill() {},
    stroke() {},
    fillRect() {},
    fillText() {},
    setTransform() {},
    measureText() {
      return { width: 0 };
    },
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    textAlign: '',
    textBaseline: '',
  };
}

class MockCanvas {
  constructor() {
    this.width = 800;
    this.height = 600;
    this.style = { cursor: 'default' };
    this.listeners = new Map();
    this.context = createContext();
  }

  getContext(type) {
    return type === '2d' ? this.context : null;
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: this.width,
      height: this.height,
    };
  }

  dispatch(type, event) {
    const handler = this.listeners.get(type);
    if (!handler) {
      throw new Error(\`No listener registered for \${type}\`);
    }
    handler(event);
  }
}

function settle(cortex) {
  for (let i = 0; i < 200; i += 1) {
    if (cortex.update(0.1)) {
      return;
    }
  }
  throw new Error('Cortex did not settle');
}

const data = {
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

const canvas = new MockCanvas();
const cortex = new Cortex(400, 300);
const renderer = new Renderer(canvas);
new InputHandler(cortex, renderer, canvas);

loadGraphData(cortex, data);
settle(cortex);

assert.equal(cortex.centralNode.id, 'b');
assert.equal(cortex.getAllNodes().length, 4);

renderer.render(
  cortex.centralNode,
  cortex.getChildNodes(),
  cortex.getAllNodeCurves(),
  800,
  600
);

const child = cortex.getChildNodes().find((node) => node.id === 'c');
assert.ok(child, 'Expected node c to exist');
assert.ok(child.targetOpacity > 0, 'Expected node c to be visible');

canvas.dispatch('click', { clientX: child.x, clientY: child.y });
assert.equal(cortex.centralNode.id, 'c');

settle(cortex);
renderer.render(
  cortex.centralNode,
  cortex.getChildNodes(),
  cortex.getAllNodeCurves(),
  800,
  600
);

console.log('Packaged smoke test passed');
`;

    const smokePath = path.join(appDir, 'smoke.mjs');
    await writeFile(smokePath, smokeSource);
    run('node', [smokePath], { cwd: appDir, label: 'smoke test' });
    logStep('packaged smoke test passed');
  } finally {
    logStep('cleaning up temporary files');
    await rm(workDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
