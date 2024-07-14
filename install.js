import fs from "fs-extra";
import path from "path";
import { makeCopy } from "./build/utils.js";
import { fileURLToPath } from "url";
import yaargs from "yargs";
import { hideBin } from "yargs/helpers";

const yargs = yaargs(hideBin(process.argv));

let DEST_DIR = "/";
let PREFIX = "/usr";
let INSTALL_ROOT = fileURLToPath(new URL("./build/unpacked/", import.meta.url));

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

export async function install() {
  console.log(`Copying nody-greeter to "${DEST_DIR}"...`);
  await makeCopy(INSTALL_ROOT, DEST_DIR);
  fs.createSymlinkSync(
    path.join(DEST_DIR, "opt/nody-greeter/nody-greeter"),
    path.join(DEST_DIR, PREFIX, "bin/nody-greeter")
  );
  console.log("\x1b[92mSUCCESS!!\x1b[0m");
}
