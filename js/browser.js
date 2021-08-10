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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Browser = void 0;
const electron_1 = require("electron");
const winston_1 = __importDefault(require("winston"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const config_1 = require("./config");
const url_1 = require("url");
const myFormat = winston_1.default.format.printf(({ level, message, sourceID, line, timestamp }) => {
    return `${timestamp} [ ${level.toLocaleUpperCase()} ] ${sourceID} ${line}: ${message}`;
});
const logger = winston_1.default.createLogger({
    level: "debug",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), myFormat),
    defaultMeta: { service: "user-service" },
    transports: [
        new winston_1.default.transports.Console({
            stderrLevels: ["debug", "warn", "error"],
        }),
    ],
    exitOnError: false,
});
class Browser {
    constructor() {
        this.ready = false;
        electron_1.app.whenReady().then(() => {
            this.init();
        });
    }
    whenReady() {
        return new Promise((resolve) => {
            let interval = setInterval(() => {
                if (this.ready) {
                    resolve();
                    clearInterval(interval);
                }
            }, 100);
        });
    }
    init() {
        this.win = this.create_window();
        this.load_theme();
        this.init_listeners();
    }
    load_theme() {
        let theme = config_1.nody_greeter.config.greeter.theme;
        let dir = config_1.nody_greeter.app.theme_dir;
        let path_to_theme = path.join(dir, theme, "index.html");
        let def_theme = "gruvbox";
        if (!fs.existsSync(path_to_theme)) {
            logger.log({
                level: "warn",
                message: `"${theme}" theme does not exists. Using "${def_theme}" theme`,
                sourceID: path.basename(__filename),
                line: __line,
            });
            path_to_theme = path.join(dir, def_theme, "index.html");
        }
        this.win.loadFile(path_to_theme);
        this.win.setBackgroundColor("#000000");
        logger.log({
            level: "debug",
            message: "Theme loaded",
            sourceID: path.basename(__filename),
            line: __line,
        });
    }
    create_window() {
        logger.log({
            level: "debug",
            message: "Initializing Browser Window",
            sourceID: path.basename(__filename),
            line: __line,
        });
        let screen_size = electron_1.screen.getPrimaryDisplay().workAreaSize;
        let win = new electron_1.BrowserWindow({
            //fullscreen: nody_greeter.app.fullscreen,
            height: screen_size.height,
            width: screen_size.width,
            backgroundColor: "#000000",
            frame: config_1.nody_greeter.app.frame,
            show: false,
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                nodeIntegration: false,
                contextIsolation: false,
                //nodeIntegrationInWorker: true,
                allowRunningInsecureContent: !config_1.nody_greeter.config.greeter.secure_mode,
                devTools: config_1.nody_greeter.app.debug_mode, // Should set option
            },
        });
        logger.log({
            level: "debug",
            message: "Browser Window created",
            sourceID: path.basename(__filename),
            line: global.__line,
        });
        this.ready = true;
        return win;
    }
    init_listeners() {
        this.win.once("ready-to-show", () => {
            this.win.setFullScreen(config_1.nody_greeter.app.fullscreen);
            this.win.show();
            this.win.focus();
            logger.log({
                level: "debug",
                message: "Nody Greeter started",
                sourceID: path.basename(__filename),
                line: __line,
            });
        });
        electron_1.session.defaultSession.webRequest.onBeforeSendHeaders((details, callback) => {
            let url = new url_1.URL(details.url);
            let block = !(url.protocol.includes("file") || url.protocol.includes("devtools")) && config_1.nody_greeter.config.greeter.secure_mode;
            callback({ cancel: block });
        });
    }
}
exports.Browser = Browser;
