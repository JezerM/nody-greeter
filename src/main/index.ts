import packageJson from "../../package.json";
import yargs from "yargs";
import * as fs from "fs";
import * as path from "path";

import { ensureTheme, loadThemeConfig, globalNodyConfig } from "./config";

const res = yargs
  .scriptName("nody-greeter")
  .usage("$0 [args]")
  .option("mode", {
    type: "string",
    choices: ["debug", "normal"],
    describe: "Set browser mode",
  })
  .option("list", {
    type: "boolean",
    describe: "Lists available themes",
  })
  .option("theme", {
    type: "string",
    describe: "Set the theme to use",
    requiresArg: true,
  })
  .option("d", {
    alias: "debug",
    type: "boolean",
    describe: "Set debug mode",
    conflicts: ["n", "mode"],
  })
  .option("n", {
    alias: "normal",
    type: "boolean",
    describe: "Set debug mode",
    conflicts: ["d", "mode"],
  })
  .option("api-version", {
    type: "boolean",
    describe: "Show JavaScript API version number",
  })
  .showHelpOnFail(false, "Use --help for available options")
  .help("h")
  .alias("h", "help")
  .alias("v", "version")
  .parseSync();

function listThemes(print = true): void {
  let dir = globalNodyConfig.app.themeDir;
  dir = fs.existsSync(dir) ? dir : "/usr/share/web-greeter/themes";
  const filenames = fs.readdirSync(dir, { withFileTypes: true });
  const dirlist: string[] = [];

  filenames.forEach((file) => {
    if (file.isDirectory()) dirlist.push(file.name);
    else if (file.isSymbolicLink()) {
      const realPath = fs.realpathSync(path.join(dir, file.name));
      if (fs.statSync(realPath).isDirectory()) dirlist.push(file.name);
    }
  });

  if (print) {
    console.log(`Themes are located in ${dir}\n`);
    dirlist.forEach((v) => console.log("-", v));
  }
}

function setDebug(mode: boolean): void {
  globalNodyConfig.config.greeter.debug_mode = mode;
  globalNodyConfig.app.fullscreen = !mode;
  globalNodyConfig.app.frame = mode;
  globalNodyConfig.app.debugMode = mode;
}

if (res.apiVersion) {
  console.log(packageJson.apiVersion);
  process.exit();
}
if (res.d || res.mode == "debug") {
  setDebug(true);
} else if (res.n || res.mode == "normal") {
  setDebug(false);
}
if (res.theme && typeof res.theme === "string") {
  globalNodyConfig.config.greeter.theme = res.theme;
}
if (res.list) {
  listThemes();
  process.exit();
}

if (globalNodyConfig.config.greeter.debug_mode == true) {
  setDebug(true);
}

// Import browser and bridge to initialize nody-greeter

loadThemeConfig();
ensureTheme();

import "./browser";

import "./bridge/bridge";
