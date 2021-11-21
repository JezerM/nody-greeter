const fs = require("fs-extra");
const path = require("path");
const yargs = require("yargs");
const { makeCopy } = require("./build/utils.js");
const { build } = require("./build.js");

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
  .scriptName("install")
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

async function install() {
  console.log(`Copying nody-greeter to "${DEST_DIR}"...`);
  await makeCopy(INSTALL_ROOT, DEST_DIR);
  fs.createSymlinkSync(
    path.join(DEST_DIR, "opt/nody-greeter/nody-greeter"),
    path.join(DEST_DIR, PREFIX, "bin/nody-greeter")
  );
  console.log("\x1b[92mSUCCESS!!\x1b[0m");
}

if (require.main == module) {
  install();
}

module.exports = { install };
