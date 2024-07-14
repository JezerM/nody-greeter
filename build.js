/*
 * This works like "electron-builder", but only builds the base
 * Then, you can package the "unpacked" folder to whatever you want~
 */

import packageJson from "./package.json" assert { type: "json" };
import fs from "fs-extra";
import path from "path";
import childProcess from "child_process";

import {
  makeCopy,
  makeCopyFromTo,
  patchFile,
  getLinuxDistro,
} from "./build/utils.js";
import yaargs from "yargs";
import ora from "ora";
import { hideBin } from "yargs/helpers";
import { fileURLToPath } from "url";

const yargs = yaargs(hideBin(process.argv));

let DEST_DIR = "/";
let PREFIX = "/usr";
let INSTALL_ZSH_COMPLETION = true;
let INSTALL_BASH_COMPLETION = true;
let ARCH = process.arch;
let INSTALL_ROOT = fileURLToPath(new URL("./build/unpacked/", import.meta.url));
let ASAR_ROOT = fileURLToPath(new URL("./build/nody-asar/", import.meta.url));

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
  .scriptName("build")
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

DEST_DIR = argv.DEST_DIR;
PREFIX = argv.PREFIX;
ARCH = argv.ARCH;
INSTALL_ZSH_COMPLETION = argv.INSTALL_ZSH_COMPLETION;
INSTALL_BASH_COMPLETION = argv.INSTALL_BASH_COMPLETION;

// Some global variables

let nody_path = path.join(INSTALL_ROOT, "opt/nody-greeter");
let bin_path = path.join(INSTALL_ROOT, PREFIX, "bin");
let lightdm_path = path.join(INSTALL_ROOT, "etc/lightdm");
let webg_path = path.join(INSTALL_ROOT, PREFIX, "share/web-greeter");
let xgreeters_path = path.join(INSTALL_ROOT, PREFIX, "share/xgreeters");
let applications_path = path.join(INSTALL_ROOT, PREFIX, "share/applications");
let icons_path = path.join(INSTALL_ROOT, PREFIX, "share/icons/hicolor");
let xdg_ldm_path = path.join(INSTALL_ROOT, "etc/xdg/lightdm/lightdm.conf.d/");
let bash_c_path = path.join(
  INSTALL_ROOT,
  PREFIX,
  "share/bash-completion/completions"
);
let zsh_c_path = path.join(
  INSTALL_ROOT,
  PREFIX,
  "share/zsh/vendor-completions/"
);

// Functions

let copies_binding = [
  {
    from: "./src/main/bindings/screensaver.cc",
    to: "./out/main/bindings/screensaver.cc",
  },
  {
    from: "./src/main/bindings/binding.gyp",
    to: "./out/main/bindings/binding.gyp",
  },
  {
    from: "./src/main/bindings/package.json",
    to: "./out/main/bindings/package.json",
  },
];

async function compile_bindings() {
  fs.ensureDirSync("./out/main/bindings/");
  await makeCopyFromTo(copies_binding);
  console.log("Bindings copied");

  let spinner = ora({
    text: `Compiling bindings with electron-rebuild for ${ARCH}...`,
    spinner: "dots",
  });
  spinner.start();

  await new Promise((resolve) => {
    childProcess.exec(
      `npx electron-rebuild -m . --arch ${ARCH}`,
      {
        cwd: "./out/main/bindings",
        encoding: "utf-8",
        stdio: "ignore",
      },
      (error) => {
        if (error) {
          console.error(error);
          spinner.fail("electron-rebuild failed");
          process.exit(1);
        }
        resolve();
      }
    );
  });
  spinner.succeed("Bindings compiled succesfully");
}

let copies = [
  { from: "./out", to: path.join(ASAR_ROOT, "out") },
  { from: "./package.json", to: path.join(ASAR_ROOT, "package.json") },
  {
    from: "./package-lock.json",
    to: path.join(ASAR_ROOT, "package-lock.json"),
  },
];

function check_program(program) {
  let res = childProcess.spawnSync("which", [program], {
    encoding: "utf-8",
  });
  if (res.status == 0) return true;
  else return false;
}

async function create_build() {
  fs.mkdirSync(ASAR_ROOT, { recursive: true });
  fs.mkdirSync(INSTALL_ROOT, { recursive: true });

  await makeCopyFromTo(copies);

  console.log("Resources copied");

  try {
    console.log("Installing packages with 'npm ci --production -s'");
    childProcess.execSync("npm ci --production -s", {
      cwd: "./build/nody-asar",
      encoding: "utf-8",
      stdio: "inherit",
    });
    console.log("Packages installed");
  } catch (err) {
    console.error(err);
  }
}

function find_electron_binding() {
  const electronMatch = packageJson.devDependencies.electron.match(
    /^\^*(?<major>\d+)(?:\.(?<minor>\d+))?/
  );
  let electronVersion = ".*";
  if (electronMatch && electronMatch.groups) {
    const major = electronMatch.groups.major;
    const minor = electronMatch.groups.minor ? electronMatch.groups.minor : "0";
    electronVersion = `${major}.${minor}`;
  }
  let binding_exists = fs.pathExistsSync(
    "./node_modules/node-gtk/lib/binding/"
  );
  if (!binding_exists) {
    console.error(
      "Node-gtk bindings not found, be sure to install npm dependencies"
    );
    process.exit(1);
  }
  fs.removeSync("./build/nody-asar/node_modules/node-gtk/lib/binding/");
  let bindings = fs.readdirSync("./node_modules/node-gtk/lib/binding/");
  let re = new RegExp(`electron-v${electronVersion}-linux-${ARCH}`);
  let electron_binding = bindings.find((v) => v.match(re));
  return electron_binding;
}

async function ensure_electron_binding() {
  let electron_binding = find_electron_binding();
  if (electron_binding) {
    console.log("Node-gtk binding for electron found!");
  } else {
    try {
      let spinner = ora({
        text: `Node-gtk binding for electron not found. Compiling for ${ARCH}...`,
        spinner: "dots",
      });
      spinner.start();

      await new Promise((resolve) => {
        childProcess.exec(
          `npx electron-rebuild -w node-gtk --build-from-source --arch ${ARCH}`,
          {
            encoding: "utf-8",
            stdio: "ignore",
          },
          (error) => {
            if (error) {
              console.error(error);
              spinner.fail("electron-rebuild failed");
              process.exit(1);
            }
            resolve();
          }
        );
      });
      spinner.succeed("Node-gtk compiled");

      electron_binding = find_electron_binding();
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  }
  if (!electron_binding) {
    console.error("Electron binding couldn't be found");
    process.exit(1);
  }
  // Remove node-gtk build files
  fs.removeSync("./build/nody-asar/node_modules/node-gtk/build/");
  return electron_binding;
}

async function copy_electron_binding() {
  let electron_binding = await ensure_electron_binding();
  let path_to_binding = path.join(
    "node_modules/node-gtk/lib/binding",
    electron_binding
  );
  await makeCopy(
    path.resolve(path_to_binding),
    path.resolve(ASAR_ROOT, path_to_binding)
  );
  console.log("Binding copied");
}

function create_install_root() {
  fs.mkdirsSync(nody_path, { recursive: true });
  fs.mkdirsSync(lightdm_path, { recursive: true });
  fs.mkdirsSync(webg_path, { recursive: true });
  fs.mkdirsSync(xdg_ldm_path, { recursive: true });
  fs.mkdirsSync(xgreeters_path, { recursive: true });
  fs.mkdirsSync(applications_path, { recursive: true });
  fs.mkdirsSync(icons_path, { recursive: true });
  fs.mkdirsSync(path.join(icons_path, "scalable/apps"), { recursive: true });
  if (check_program("bash") && INSTALL_BASH_COMPLETION)
    fs.mkdirsSync(bash_c_path, { recursive: true });
  if (check_program("zsh") && INSTALL_ZSH_COMPLETION)
    fs.mkdirsSync(zsh_c_path, { recursive: true });
}

let copies_prepare = [
  {
    from: "./dist/web-greeter.yml",
    to: path.join(lightdm_path, "web-greeter.yml"),
  },
  {
    from: "./dist/nody-xgreeter.desktop",
    to: path.join(xgreeters_path, "nody-greeter.desktop"),
  },
  {
    from: "./dist/nody-greeter.desktop",
    to: path.join(applications_path, "nody-greeter.desktop"),
  },
  {
    from: "./dist/com.github.jezerm.nody-greeter.svg",
    to: path.join(
      icons_path,
      "scalable/apps/com.github.jezerm.nody-greeter.svg"
    ),
  },
  {
    from: "./dist/90-greeter-wrapper.conf",
    to: path.join(xdg_ldm_path, "90-greeter-wrapper.conf"),
  },
  {
    from: "./dist/Xgreeter",
    to: path.join(lightdm_path, "Xgreeter"),
  },
  {
    from: "./themes/themes/",
    to: path.join(webg_path, "themes/"),
  },
  {
    from: "./node_modules/electron/dist/",
    to: nody_path,
  },
];

async function prepare_install() {
  create_install_root();
  if (check_program("bash") && INSTALL_BASH_COMPLETION)
    copies_prepare.push({
      from: "./dist/nody-greeter-bash",
      to: path.join(bash_c_path, "nody-greeter"),
    });
  if (check_program("zsh") && INSTALL_ZSH_COMPLETION)
    copies_prepare.push({
      from: "./dist/nody-greeter-zsh",
      to: path.join(zsh_c_path, "_nody-greeter"),
    });

  await makeCopyFromTo(copies_prepare);

  const distro = getLinuxDistro();

  switch (distro) {
    case "fedora":
      console.log(
        "The current distro has some issues with sandboxed browsers in the LightDM environment. Patching..."
      );
      patchFile(path.join(lightdm_path, "Xgreeter"), "./build/Xgreeter.patch");
      break;
  }

  fs.removeSync(path.join(nody_path, "resources"));
  fs.renameSync(
    path.join(nody_path, "electron"),
    path.join(nody_path, "nody-greeter")
  );
  fs.moveSync(
    path.join(webg_path, "themes/_vendor"),
    path.join(webg_path, "_vendor/"),
    {
      overwrite: true,
    }
  );
  console.log("INSTALL_ROOT (build/unpacked) prepared");
}

async function build_asar() {
  // The following applies a patch to solve some asar issues that are not resolved in upstream
  // This fixes #29 (https://github.com/JezerM/nody-greeter/issues/29)
  patchFile("./node_modules/asar/lib/filesystem.js", "./build/asar.patch");
  console.log("Asar issue patched");

  let asar_dest = path.join(nody_path, "resources/app.asar");

  console.log(`Creating 'asar' package in '${asar_dest}'`);

  let spinner = ora({
    text: `Creating package...`,
    spinner: "dots",
  });
  spinner.start();

  const asar = await import("@electron/asar");
  await asar.createPackage(ASAR_ROOT, asar_dest);
  spinner.succeed('"asar" package created');
}

export async function build() {
  console.log("Building with prefix:", PREFIX);
  await compile_bindings();
  await create_build();
  await copy_electron_binding();
  await prepare_install();
  await build_asar();
  console.log("\x1b[92mSUCCESS!\x1b[0m");
}
