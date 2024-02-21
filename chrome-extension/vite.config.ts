import * as fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import open, { openApp, apps } from 'open';
import { viteStaticCopy } from 'vite-plugin-static-copy';

const reloadChromeExtension = () => {
  return {
    name: 'reloadChromeExtension',
    writeBundle() {
      open('http://reload.extensions/', {
        app: { name: 'google chrome dev' },
        background: true,
      });
    },
  };
};

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: 'farsight',
      fileName: 'content',
      formats: ['es'],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
      },
    },
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: './node_modules/farsight/dist-extension/text-emb-worker.js',
          dest: '',
        },
      ],
    }),
  ],
});
