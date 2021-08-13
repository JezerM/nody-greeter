const asar = require("asar");
const fs = require("fs-extra")
const path = require("path")
const child_process = require('child_process');

let build_path = "./build/nody-asar/";
let root_path = "./build/unpacked/";

let copies = [
  {from: "./js", to: build_path + "js"},
  {from: "./package.json", to: build_path + "package.json"},
  {from: "./package-lock.json", to: build_path + "package-lock.json"},
];

function create_build() {
  fs.mkdirSync(build_path, {recursive: true});
  fs.mkdirSync(root_path, {recursive: true});

  copies.forEach((v) => {
    fs.copySync(v.from, v.to, {recursive: true});
  })
  console.log("Resources copied");

  try {
    console.log("Installing packages with 'npm ci --production'");
    child_process.execSync('npm ci --production', {cwd: "./build/nody-asar", encoding: "utf-8", stdio: "ignore"});
    console.log("Packages installed");
  } catch (err) {
    console.log(err);
  }
}

create_build()

let binding_exists = fs.pathExistsSync("./node_modules/node-gtk/lib/binding");
if (!binding_exists) {
  console.error("Node-gtk bindings not found, be sure to install npm dependencies");
  process.exit(1);
}

fs.removeSync("./build/nody-asar/node_modules/node-gtk/lib/binding/");

function find_electron_binding() {
  let bindings = fs.readdirSync("./node_modules/node-gtk/lib/binding/", {encoding: "utf-8"});
  let electron_binding = bindings.find((v) => v.includes("electron"));
  return electron_binding;
}

let electron_binding = find_electron_binding();

if (electron_binding) {
  console.log("Node-gtk binding for electron found!");
} else {
  try {
    console.log("Node-gtk binding for electron not found. Compiling...");
    child_process.execSync("./node_modules/.bin/electron-rebuild -w node-gtk --build-from-source", {encoding: "utf-8"});
    electron_binding = find_electron_binding();
    console.log("Done")
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

fs.copySync("./node_modules/node-gtk/lib/binding/" + electron_binding, build_path + "node_modules/node-gtk/lib/binding/" + electron_binding);
console.log("Binding copied");

// Unpacked section

let app_path = root_path + "opt/nody-greeter/"
let lightdm_path = root_path + "etc/lightdm/"
let webg_path = root_path + "usr/share/web-greeter/"

let run_file = `#!/usr/bin/env bash
parent_path=$( cd "$(dirname "\${BASH_SOURCE[0]}")" ; pwd -P )
electron $parent_path/resources/app.asar $@`

fs.mkdirSync(app_path, {recursive: true})
fs.mkdirSync(lightdm_path, {recursive: true})
fs.mkdirSync(webg_path, {recursive: true})

fs.writeFileSync(app_path + "nody-greeter", run_file, {encoding: "utf-8"});
fs.chmodSync(app_path + "nody-greeter", 0o775);
fs.copySync("./dist/web-greeter.yml", lightdm_path + "web-greeter.yml");

let src = "./build/nody-asar";
let dest = app_path + "resources/app.asar";

(async () => {
  console.log(`Creating 'asar' package in '${dest}'`)
  await asar.createPackage(src, dest);
  console.log("'asar' package created")
})()
