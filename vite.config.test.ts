import { defineConfig } from 'vite';

export default defineConfig({
  root: 'examples/test',
  build: {
    outDir: '../../dist-test',
    sourcemap: true,
  },
});
