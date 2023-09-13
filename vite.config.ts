/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { hmrPlugin, presets } from 'vite-plugin-web-components-hmr';

export default defineConfig(({ command, mode }) => {
  if (command === 'serve') {
    // Development
    return {
      plugins: [
        hmrPlugin({
          include: ['./src/**/*.ts'],
          presets: [presets.lit]
        })
      ]
    };
  } else if (command === 'build') {
    switch (mode) {
      case 'production': {
        // Production: standard web page (default mode)
        return {
          build: {
            outDir: 'dist',
            rollupOptions: {
              input: {
                main: resolve(__dirname, 'index.html'),
                lite: resolve(__dirname, 'lite/index.html'),
                signal: resolve(__dirname, 'signal/index.html')
              }
            }
          },
          plugins: []
        };
      }

      case 'x20': {
        // Production: link with a basename in the path
        return {
          base: '/www/farsight/',
          build: {
            outDir: 'dist'
          },
          plugins: []
        };
      }

      case 'library': {
        // Production: library that can be imported in other apps
        return {
          build: {
            lib: {
              // Could also be a dictionary or array of multiple entry points
              entry: resolve(__dirname, 'src/farsight.ts'),
              name: 'FarsightLibrary',
              format: ['es'],
              // the proper extensions will be added
              fileName: format => `farsight-inline-worker.${format}.js`
            },
            outDir: 'dist',
            rollupOptions: {
              external: [],
              output: {
                globals: {}
              }
            }
          },
          worker: {
            format: 'es',
            rollupOptions: {
              output: {
                entryFileNames: '[name].js'
              }
            }
          },
          plugins: [dts()]
        };
      }

      case 'extension': {
        // Production: extension mode with worker files
        return {
          build: {
            emptyOutDir: false,
            lib: {
              // Could also be a dictionary or array of multiple entry points
              entry: resolve(__dirname, 'src/farsight.ts'),
              name: 'FarsightExtension',
              format: ['es'],
              // the proper extensions will be added
              fileName: format => `farsight-external-worker.${format}.js`
            },
            outDir: 'dist-extension',
            rollupOptions: {
              external: []
            }
          },
          worker: {
            format: 'es',
            rollupOptions: {
              output: {
                entryFileNames: '[name].js'
              }
            }
          },
          plugins: [dts()]
        };
      }

      default: {
        console.error(`Error: unknown production mode ${mode}`);
        return null;
      }
    }
  }
});
