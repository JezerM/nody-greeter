import * as yargs from "yargs";
import * as fs from "fs";
import * as path from "path";

import { ensure_theme, load_theme_config, nody_greeter } from "./config";

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
  .showHelpOnFail(false, "Use --help for available options")
  .help("h")
  .alias("h", "help")
  .alias("v", "version").argv;

function list_themes(print = true): void {
  let dir = nody_greeter.app.theme_dir;
  dir = fs.existsSync(dir) ? dir : "/usr/share/web-greeter/themes";
  const filenames = fs.readdirSync(dir, { withFileTypes: true });
  const dirlist: string[] = [];

  filenames.forEach((file) => {
    if (file.isDirectory()) dirlist.push(file.name);
    else if (file.isSymbolicLink()) {
      const real_path = fs.realpathSync(path.join(dir, file.name));
      if (fs.statSync(real_path).isDirectory()) dirlist.push(file.name);
    }
  });

  if (print) {
    console.log(`Themes are located in ${dir}\n`);
    dirlist.forEach((v) => console.log("-", v));
  }
}

function set_debug(mode: boolean): void {
  nody_greeter.config.greeter.debug_mode = mode;
  nody_greeter.app.fullscreen = !mode;
  nody_greeter.app.frame = mode;
  nody_greeter.app.debug_mode = mode;
}

if (res.d || res.mode == "debug") {
  set_debug(true);
} else if (res.n || res.mode == "normal") {
  set_debug(false);
}
if (res.theme && typeof res.theme === "string") {
  nody_greeter.config.greeter.theme = res.theme;
}
if (res.list) {
  list_themes();
  process.exit();
}

if (nody_greeter.config.greeter.debug_mode == true) {
  set_debug(true);
}

// Import browser and bridge to initialize nody-greeter

load_theme_config();
ensure_theme();

import "./browser";

import "./bridge/bridge";
