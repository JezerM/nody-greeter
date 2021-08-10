import * as yargs from "yargs";
import * as fs from "fs";

import { nody_greeter } from "./config";

let res = yargs
  .scriptName("nody-greeter")
  .usage("$0 [args]")
  .command("--debug", "Runs the greeter in debug mode")
  .command("--normal", "Runs in non-debug mode")
  .command("--list", "Lists available themes")
  .command("--theme [name]", "Set the theme to use")
  .help("h")
  .alias("h", "help")
  .alias("v", "version").argv;

function list_themes(print = true) {
  let dir = nody_greeter.app.theme_dir;
  dir = fs.existsSync(dir) ? dir : "/usr/share/web-greeter/themes";
  let filenames = fs.readdirSync(dir, { withFileTypes: true });
  let dirlist: string[] = [];

  filenames.forEach((file) => {
    if (file.isDirectory()) dirlist.push(file.name);
  });

  if (print) {
    console.log(`Themes are located in ${dir}\n`);
    dirlist.forEach((v) => console.log("-", v));
  }
}

function set_debug() {
  nody_greeter.config.greeter.debug_mode = true;
  nody_greeter.app.fullscreen = false;
  nody_greeter.app.frame = true;
  nody_greeter.app.debug_mode = true;
}

if (res.debug) {
  set_debug();
} else if (res.normal) {
  nody_greeter.config.greeter.debug_mode = false;
  nody_greeter.app.fullscreen = true;
  nody_greeter.app.frame = false;
  nody_greeter.app.debug_mode = false;
}
if (res.theme && typeof res.theme === "string") {
  nody_greeter.config.greeter.theme = res.theme;
}
if (res.list) {
  list_themes();
  process.exit();
}

if (nody_greeter.config.greeter.debug_mode == true) {
  set_debug();
}

import "./browser";

import "./bridge/bridge";
