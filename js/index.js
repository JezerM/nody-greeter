var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = __importStar(require("yargs"));
const fs = __importStar(require("fs"));
const config_1 = require("./config");
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
    let dir = config_1.nody_greeter.app.theme_dir;
    dir = fs.existsSync(dir) ? dir : "/usr/share/web-greeter/themes";
    let filenames = fs.readdirSync(dir, { withFileTypes: true });
    let dirlist = [];
    filenames.forEach((file) => {
        if (file.isDirectory())
            dirlist.push(file.name);
    });
    if (print) {
        console.log(`Themes are located in ${dir}\n`);
        dirlist.forEach((v) => console.log("-", v));
    }
}
function set_debug() {
    config_1.nody_greeter.config.greeter.debug_mode = true;
    config_1.nody_greeter.app.fullscreen = false;
    config_1.nody_greeter.app.frame = true;
    config_1.nody_greeter.app.debug_mode = true;
}
if (res.debug) {
    set_debug();
}
else if (res.normal) {
    config_1.nody_greeter.config.greeter.debug_mode = false;
    config_1.nody_greeter.app.fullscreen = true;
    config_1.nody_greeter.app.frame = false;
    config_1.nody_greeter.app.debug_mode = false;
}
if (res.theme && typeof res.theme === "string") {
    config_1.nody_greeter.config.greeter.theme = res.theme;
}
if (res.list) {
    list_themes();
    process.exit();
}
if (config_1.nody_greeter.config.greeter.debug_mode == true) {
    set_debug();
}
require("./browser");
require("./bridge/bridge");
