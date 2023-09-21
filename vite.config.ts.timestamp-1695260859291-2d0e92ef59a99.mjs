// vite.config.ts
import { resolve } from "path";
import { defineConfig } from "file:///Users/jaywang/Documents/Programs/google/farsight/node_modules/.pnpm/vite@4.3.9_sass@1.62.1/node_modules/vite/dist/node/index.js";
import dts from "file:///Users/jaywang/Documents/Programs/google/farsight/node_modules/.pnpm/vite-plugin-dts@3.0.2_sass@1.62.1_typescript@5.1.3/node_modules/vite-plugin-dts/dist/index.mjs";
import { hmrPlugin, presets } from "file:///Users/jaywang/Documents/Programs/google/farsight/node_modules/.pnpm/vite-plugin-web-components-hmr@0.1.3_vite@4.3.9/node_modules/vite-plugin-web-components-hmr/index.mjs";
var __vite_injected_original_dirname = "/Users/jaywang/Documents/Programs/google/farsight";
var vite_config_default = defineConfig(({ command, mode }) => {
  if (command === "serve") {
    return {
      plugins: [
        hmrPlugin({
          include: ["./src/**/*.ts"],
          presets: [presets.lit]
        })
      ]
    };
  } else if (command === "build") {
    switch (mode) {
      case "production": {
        return {
          build: {
            outDir: "dist",
            rollupOptions: {
              input: {
                main: resolve(__vite_injected_original_dirname, "index.html"),
                lite: resolve(__vite_injected_original_dirname, "lite/index.html"),
                signal: resolve(__vite_injected_original_dirname, "signal/index.html")
              }
            }
          },
          plugins: []
        };
      }
      case "x20": {
        return {
          base: "/www/farsight/",
          build: {
            outDir: "dist"
          },
          plugins: []
        };
      }
      case "library": {
        return {
          build: {
            lib: {
              // Could also be a dictionary or array of multiple entry points
              entry: resolve(__vite_injected_original_dirname, "src/farsight.ts"),
              name: "FarsightLibrary",
              format: ["es"],
              // the proper extensions will be added
              fileName: (format) => `farsight-inline-worker.${format}.js`
            },
            outDir: "dist",
            rollupOptions: {
              external: [],
              output: {
                globals: {}
              }
            }
          },
          worker: {
            format: "es",
            rollupOptions: {
              output: {
                entryFileNames: "[name].js"
              }
            }
          },
          plugins: [dts()]
        };
      }
      case "extension": {
        return {
          build: {
            emptyOutDir: false,
            lib: {
              // Could also be a dictionary or array of multiple entry points
              entry: resolve(__vite_injected_original_dirname, "src/farsight.ts"),
              name: "FarsightExtension",
              format: ["es"],
              // the proper extensions will be added
              fileName: (format) => `farsight-external-worker.${format}.js`
            },
            outDir: "dist-extension",
            rollupOptions: {
              external: []
            }
          },
          worker: {
            format: "es",
            rollupOptions: {
              output: {
                entryFileNames: "[name].js"
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
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvamF5d2FuZy9Eb2N1bWVudHMvUHJvZ3JhbXMvZ29vZ2xlL2ZhcnNpZ2h0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvamF5d2FuZy9Eb2N1bWVudHMvUHJvZ3JhbXMvZ29vZ2xlL2ZhcnNpZ2h0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9qYXl3YW5nL0RvY3VtZW50cy9Qcm9ncmFtcy9nb29nbGUvZmFyc2lnaHQvdml0ZS5jb25maWcudHNcIjsvKipcbiAqIENvcHlyaWdodCAyMDIzIEdvb2dsZSBMTENcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKlxuICogICAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKi9cblxuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgZHRzIGZyb20gJ3ZpdGUtcGx1Z2luLWR0cyc7XG5pbXBvcnQgeyBobXJQbHVnaW4sIHByZXNldHMgfSBmcm9tICd2aXRlLXBsdWdpbi13ZWItY29tcG9uZW50cy1obXInO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgY29tbWFuZCwgbW9kZSB9KSA9PiB7XG4gIGlmIChjb21tYW5kID09PSAnc2VydmUnKSB7XG4gICAgLy8gRGV2ZWxvcG1lbnRcbiAgICByZXR1cm4ge1xuICAgICAgcGx1Z2luczogW1xuICAgICAgICBobXJQbHVnaW4oe1xuICAgICAgICAgIGluY2x1ZGU6IFsnLi9zcmMvKiovKi50cyddLFxuICAgICAgICAgIHByZXNldHM6IFtwcmVzZXRzLmxpdF1cbiAgICAgICAgfSlcbiAgICAgIF1cbiAgICB9O1xuICB9IGVsc2UgaWYgKGNvbW1hbmQgPT09ICdidWlsZCcpIHtcbiAgICBzd2l0Y2ggKG1vZGUpIHtcbiAgICAgIGNhc2UgJ3Byb2R1Y3Rpb24nOiB7XG4gICAgICAgIC8vIFByb2R1Y3Rpb246IHN0YW5kYXJkIHdlYiBwYWdlIChkZWZhdWx0IG1vZGUpXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIG91dERpcjogJ2Rpc3QnLFxuICAgICAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgICAgICBpbnB1dDoge1xuICAgICAgICAgICAgICAgIG1haW46IHJlc29sdmUoX19kaXJuYW1lLCAnaW5kZXguaHRtbCcpLFxuICAgICAgICAgICAgICAgIGxpdGU6IHJlc29sdmUoX19kaXJuYW1lLCAnbGl0ZS9pbmRleC5odG1sJyksXG4gICAgICAgICAgICAgICAgc2lnbmFsOiByZXNvbHZlKF9fZGlybmFtZSwgJ3NpZ25hbC9pbmRleC5odG1sJylcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgcGx1Z2luczogW11cbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAneDIwJzoge1xuICAgICAgICAvLyBQcm9kdWN0aW9uOiBsaW5rIHdpdGggYSBiYXNlbmFtZSBpbiB0aGUgcGF0aFxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGJhc2U6ICcvd3d3L2ZhcnNpZ2h0LycsXG4gICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIG91dERpcjogJ2Rpc3QnXG4gICAgICAgICAgfSxcbiAgICAgICAgICBwbHVnaW5zOiBbXVxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICBjYXNlICdsaWJyYXJ5Jzoge1xuICAgICAgICAvLyBQcm9kdWN0aW9uOiBsaWJyYXJ5IHRoYXQgY2FuIGJlIGltcG9ydGVkIGluIG90aGVyIGFwcHNcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBidWlsZDoge1xuICAgICAgICAgICAgbGliOiB7XG4gICAgICAgICAgICAgIC8vIENvdWxkIGFsc28gYmUgYSBkaWN0aW9uYXJ5IG9yIGFycmF5IG9mIG11bHRpcGxlIGVudHJ5IHBvaW50c1xuICAgICAgICAgICAgICBlbnRyeTogcmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvZmFyc2lnaHQudHMnKSxcbiAgICAgICAgICAgICAgbmFtZTogJ0ZhcnNpZ2h0TGlicmFyeScsXG4gICAgICAgICAgICAgIGZvcm1hdDogWydlcyddLFxuICAgICAgICAgICAgICAvLyB0aGUgcHJvcGVyIGV4dGVuc2lvbnMgd2lsbCBiZSBhZGRlZFxuICAgICAgICAgICAgICBmaWxlTmFtZTogZm9ybWF0ID0+IGBmYXJzaWdodC1pbmxpbmUtd29ya2VyLiR7Zm9ybWF0fS5qc2BcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0JyxcbiAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgZXh0ZXJuYWw6IFtdLFxuICAgICAgICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICAgICAgICBnbG9iYWxzOiB7fVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICB3b3JrZXI6IHtcbiAgICAgICAgICAgIGZvcm1hdDogJ2VzJyxcbiAgICAgICAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgZW50cnlGaWxlTmFtZXM6ICdbbmFtZV0uanMnXG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9LFxuICAgICAgICAgIHBsdWdpbnM6IFtkdHMoKV1cbiAgICAgICAgfTtcbiAgICAgIH1cblxuICAgICAgY2FzZSAnZXh0ZW5zaW9uJzoge1xuICAgICAgICAvLyBQcm9kdWN0aW9uOiBleHRlbnNpb24gbW9kZSB3aXRoIHdvcmtlciBmaWxlc1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIGJ1aWxkOiB7XG4gICAgICAgICAgICBlbXB0eU91dERpcjogZmFsc2UsXG4gICAgICAgICAgICBsaWI6IHtcbiAgICAgICAgICAgICAgLy8gQ291bGQgYWxzbyBiZSBhIGRpY3Rpb25hcnkgb3IgYXJyYXkgb2YgbXVsdGlwbGUgZW50cnkgcG9pbnRzXG4gICAgICAgICAgICAgIGVudHJ5OiByZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9mYXJzaWdodC50cycpLFxuICAgICAgICAgICAgICBuYW1lOiAnRmFyc2lnaHRFeHRlbnNpb24nLFxuICAgICAgICAgICAgICBmb3JtYXQ6IFsnZXMnXSxcbiAgICAgICAgICAgICAgLy8gdGhlIHByb3BlciBleHRlbnNpb25zIHdpbGwgYmUgYWRkZWRcbiAgICAgICAgICAgICAgZmlsZU5hbWU6IGZvcm1hdCA9PiBgZmFyc2lnaHQtZXh0ZXJuYWwtd29ya2VyLiR7Zm9ybWF0fS5qc2BcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvdXREaXI6ICdkaXN0LWV4dGVuc2lvbicsXG4gICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgIGV4dGVybmFsOiBbXVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0sXG4gICAgICAgICAgd29ya2VyOiB7XG4gICAgICAgICAgICBmb3JtYXQ6ICdlcycsXG4gICAgICAgICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgICAgICAgIG91dHB1dDoge1xuICAgICAgICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnW25hbWVdLmpzJ1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSxcbiAgICAgICAgICBwbHVnaW5zOiBbZHRzKCldXG4gICAgICAgIH07XG4gICAgICB9XG5cbiAgICAgIGRlZmF1bHQ6IHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3I6IHVua25vd24gcHJvZHVjdGlvbiBtb2RlICR7bW9kZX1gKTtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9XG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFnQkEsU0FBUyxlQUFlO0FBQ3hCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sU0FBUztBQUNoQixTQUFTLFdBQVcsZUFBZTtBQW5CbkMsSUFBTSxtQ0FBbUM7QUFxQnpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsU0FBUyxLQUFLLE1BQU07QUFDakQsTUFBSSxZQUFZLFNBQVM7QUFFdkIsV0FBTztBQUFBLE1BQ0wsU0FBUztBQUFBLFFBQ1AsVUFBVTtBQUFBLFVBQ1IsU0FBUyxDQUFDLGVBQWU7QUFBQSxVQUN6QixTQUFTLENBQUMsUUFBUSxHQUFHO0FBQUEsUUFDdkIsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBQUEsRUFDRixXQUFXLFlBQVksU0FBUztBQUM5QixZQUFRLE1BQU07QUFBQSxNQUNaLEtBQUssY0FBYztBQUVqQixlQUFPO0FBQUEsVUFDTCxPQUFPO0FBQUEsWUFDTCxRQUFRO0FBQUEsWUFDUixlQUFlO0FBQUEsY0FDYixPQUFPO0FBQUEsZ0JBQ0wsTUFBTSxRQUFRLGtDQUFXLFlBQVk7QUFBQSxnQkFDckMsTUFBTSxRQUFRLGtDQUFXLGlCQUFpQjtBQUFBLGdCQUMxQyxRQUFRLFFBQVEsa0NBQVcsbUJBQW1CO0FBQUEsY0FDaEQ7QUFBQSxZQUNGO0FBQUEsVUFDRjtBQUFBLFVBQ0EsU0FBUyxDQUFDO0FBQUEsUUFDWjtBQUFBLE1BQ0Y7QUFBQSxNQUVBLEtBQUssT0FBTztBQUVWLGVBQU87QUFBQSxVQUNMLE1BQU07QUFBQSxVQUNOLE9BQU87QUFBQSxZQUNMLFFBQVE7QUFBQSxVQUNWO0FBQUEsVUFDQSxTQUFTLENBQUM7QUFBQSxRQUNaO0FBQUEsTUFDRjtBQUFBLE1BRUEsS0FBSyxXQUFXO0FBRWQsZUFBTztBQUFBLFVBQ0wsT0FBTztBQUFBLFlBQ0wsS0FBSztBQUFBO0FBQUEsY0FFSCxPQUFPLFFBQVEsa0NBQVcsaUJBQWlCO0FBQUEsY0FDM0MsTUFBTTtBQUFBLGNBQ04sUUFBUSxDQUFDLElBQUk7QUFBQTtBQUFBLGNBRWIsVUFBVSxZQUFVLDBCQUEwQjtBQUFBLFlBQ2hEO0FBQUEsWUFDQSxRQUFRO0FBQUEsWUFDUixlQUFlO0FBQUEsY0FDYixVQUFVLENBQUM7QUFBQSxjQUNYLFFBQVE7QUFBQSxnQkFDTixTQUFTLENBQUM7QUFBQSxjQUNaO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxVQUNBLFFBQVE7QUFBQSxZQUNOLFFBQVE7QUFBQSxZQUNSLGVBQWU7QUFBQSxjQUNiLFFBQVE7QUFBQSxnQkFDTixnQkFBZ0I7QUFBQSxjQUNsQjtBQUFBLFlBQ0Y7QUFBQSxVQUNGO0FBQUEsVUFDQSxTQUFTLENBQUMsSUFBSSxDQUFDO0FBQUEsUUFDakI7QUFBQSxNQUNGO0FBQUEsTUFFQSxLQUFLLGFBQWE7QUFFaEIsZUFBTztBQUFBLFVBQ0wsT0FBTztBQUFBLFlBQ0wsYUFBYTtBQUFBLFlBQ2IsS0FBSztBQUFBO0FBQUEsY0FFSCxPQUFPLFFBQVEsa0NBQVcsaUJBQWlCO0FBQUEsY0FDM0MsTUFBTTtBQUFBLGNBQ04sUUFBUSxDQUFDLElBQUk7QUFBQTtBQUFBLGNBRWIsVUFBVSxZQUFVLDRCQUE0QjtBQUFBLFlBQ2xEO0FBQUEsWUFDQSxRQUFRO0FBQUEsWUFDUixlQUFlO0FBQUEsY0FDYixVQUFVLENBQUM7QUFBQSxZQUNiO0FBQUEsVUFDRjtBQUFBLFVBQ0EsUUFBUTtBQUFBLFlBQ04sUUFBUTtBQUFBLFlBQ1IsZUFBZTtBQUFBLGNBQ2IsUUFBUTtBQUFBLGdCQUNOLGdCQUFnQjtBQUFBLGNBQ2xCO0FBQUEsWUFDRjtBQUFBLFVBQ0Y7QUFBQSxVQUNBLFNBQVMsQ0FBQyxJQUFJLENBQUM7QUFBQSxRQUNqQjtBQUFBLE1BQ0Y7QUFBQSxNQUVBLFNBQVM7QUFDUCxnQkFBUSxNQUFNLGtDQUFrQyxNQUFNO0FBQ3RELGVBQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
