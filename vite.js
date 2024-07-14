import { fileURLToPath, URL } from "url";
import { build, loadConfigFromFile } from "vite";

const mainVite = fileURLToPath(
  new URL("./src/main/vite.config.ts", import.meta.url)
);
const preloadVite = fileURLToPath(
  new URL("./src/preload/vite.config.ts", import.meta.url)
);

const mainConfig = await loadConfigFromFile({ command: "build" }, mainVite);
const preloadConfig = await loadConfigFromFile(
  { command: "build" },
  preloadVite
);

await build(mainConfig.config);
await build(preloadConfig.config);
