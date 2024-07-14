import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      common: fileURLToPath(new URL("../common", import.meta.url)),
    },
  },
  build: {
    target: "modules",
    outDir: "out/preload",
    assetsDir: "",
    sourcemap: true,
    rollupOptions: {
      input: fileURLToPath(new URL("./index.ts", import.meta.url)),
      output: { entryFileNames: "[name].cjs", format: "cjs" },
      external: ["electron"],
    },
  },
});
