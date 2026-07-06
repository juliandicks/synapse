import { defineConfig } from 'vite';

export default defineConfig({
  base: '/synapse/',
  build: {
    outDir: 'dist-demo',
    sourcemap: false,
  },
});
