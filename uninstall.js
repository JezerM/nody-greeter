const fs = require("fs-extra");
const path = require("path");
const yargs = require("yargs");
const { wait } = require("./build/utils.js");
const ora = require("ora");

let DEST_DIR = "/";
let PREFIX = "/usr";

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

// Some global variables

let nody_path = path.join(DEST_DIR, "opt/nody-greeter");
let bin_path = path.join(DEST_DIR, PREFIX, "bin");
let lightdm_path = path.join(DEST_DIR, "etc/lightdm");
let webg_path = path.join(DEST_DIR, PREFIX, "share/web-greeter");
let xgreeters_path = path.join(DEST_DIR, PREFIX, "share/xgreeters");
let applications_path = path.join(DEST_DIR, PREFIX, "share/applications");
let xdg_ldm_path = path.join(DEST_DIR, "etc/xdg/lightdm/lightdm.conf.d/");

let uninstall_paths = [
  //path.join(lightdm_path, "web-greeter.yml"),
  //path.join(webg_path, "themes/"),
  path.join(xgreeters_path, "nody-greeter.desktop"),
  path.join(applications_path, "nody-greeter.desktop"),
  path.join(xdg_ldm_path, "90-greeter-wrapper.conf"),
  path.join(lightdm_path, "Xgreeter"),
  nody_path,
  path.join(bin_path, "nody-greeter"),
];

async function uninstall() {
  console.log(`Uninstalling nody-greeter inside "${DEST_DIR}"...`);
  let spinner = ora({ text: "Uninstalling...", spinner: "dots" });
  spinner.start();

  for (let i = 0; i < uninstall_paths.length; i++) {
    let file = uninstall_paths[i];
    spinner.text = "Uninstalling: " + file;
    fs.rmSync(file, { force: true, recursive: true });
    //await wait(500);
  }

  spinner.succeed("nody-greeter was uninstalled");
  console.log("\x1b[92mSUCCESS!\x1b[0m");

  console.log(
    "Themes are not uninstalled. Remove them manually:",
    `\n\t${webg_path}`
  );
  console.log(
    "nody-greeter config was not uninstalled. Remove it manually:",
    `\n\t${path.join(lightdm_path, "web-greeter.yml")}`
  );
}

if (require.main == module) {
  uninstall();
}

module.exports = { uninstall };
