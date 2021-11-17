const fs = require("fs-extra");
const path = require("path");
const yargs = require("yargs");

let DEST_DIR = "/";
let PREFIX = "/usr";
let INSTALL_ROOT = path.resolve(__dirname, "./build/unpacked/");

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
  .help("h")
  .alias("h", "help")
  .version(false).argv;

PREFIX = argv.PREFIX;
DEST_DIR = argv.DEST_DIR;

async function do_install() {
  const { build } = require("./build.js");
  const { install } = require("./install.js");

  if (!fs.pathExistsSync("./build/unpacked")) {
    console.log("nody-greeter is not built");
    await build();
  }
  await install();
}

async function do_build() {
  const { build } = require("./build.js");

  build();
}

if (argv._[0] == "install") {
  do_install();
} else if (argv._[0] == "build") {
  do_build();
} else {
  yargs.showHelp();
  process.exit(1);
}
