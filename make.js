import fs from "fs-extra";
import yaargs from "yargs";
import { hideBin } from "yargs/helpers";

const yargs = yaargs(hideBin(process.argv));

let DEST_DIR = "/";
let PREFIX = "/usr";
let INSTALL_ZSH_COMPLETION = true;
let INSTALL_BASH_COMPLETION = true;
let ARCH = process.arch;

yargs.parserConfiguration({
  "short-option-groups": true,
  "camel-case-expansion": false,
  "dot-notation": true,
  "parse-numbers": true,
  "parse-positional-numbers": true,
  "boolean-negation": true,
  "deep-merge-config": false,
});

let argv = yargs
  .scriptName("make")
  .usage("$0 [args]")
  .command("install", "Install nody-greeter")
  .command("build", "Build nody-greeter")
  .command("uninstall", "Uninstall nody-greeter")
  .option("DEST_DIR", {
    type: "string",
    describe: "Where to install nody-greeter",
    default: DEST_DIR,
  })
  .option("PREFIX", {
    type: "string",
    describe: "Prefix to install at",
    default: PREFIX,
  })
  .option("ARCH", {
    type: "string",
    describe: "Architecture to build for",
    default: ARCH,
  })
  .option("INSTALL_ZSH_COMPLETION", {
    type: "boolean",
    describe: "Wheter to install zsh completion",
    default: INSTALL_ZSH_COMPLETION,
  })
  .option("INSTALL_BASH_COMPLETION", {
    type: "boolean",
    describe: "Wheter to install bash completion",
    default: INSTALL_BASH_COMPLETION,
  })
  .help("h")
  .alias("h", "help")
  .version(false).argv;

PREFIX = argv.PREFIX;
DEST_DIR = argv.DEST_DIR;
ARCH = argv.ARCH;

async function do_install() {
  const { build } = await import("./build.js");
  const { install } = await import("./install.js");

  if (!fs.pathExistsSync("./build/unpacked")) {
    console.log("nody-greeter is not built");
    await build();
  }
  await install();
}

async function do_build() {
  const { build } = await import("./build.js");

  build();
}

async function do_uninstall() {
  const { uninstall } = await import("./uninstall.js");

  uninstall();
}

if (argv._[0] == "install") {
  do_install();
} else if (argv._[0] == "build") {
  do_build();
} else if (argv._[0] == "uninstall") {
  do_uninstall();
} else {
  yargs.showHelp();
  process.exit(1);
}
