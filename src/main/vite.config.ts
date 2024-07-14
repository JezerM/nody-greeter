import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { builtinModules as builtin } from "node:module";
import packageJson from "../../package.json";

const dependencies = Object.keys({
  ...packageJson.dependencies,
  ...packageJson.devDependencies,
});
dependencies.push(...builtin);

export default defineConfig({
  resolve: {
    alias: {
      common: fileURLToPath(new URL("../common", import.meta.url)),
    },
    conditions: ["node"],
    mainFields: ["module", "jsnext:main", "jsnext"],
  },
  build: {
    target: "node18",
    outDir: "out/main",
    emptyOutDir: false,
    rollupOptions: {
      input: fileURLToPath(new URL("./index.ts", import.meta.url)),
      output: { entryFileNames: "[name].cjs", format: "cjs" },
      external: dependencies,
    },
  },
});
