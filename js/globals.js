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
exports.window = void 0;
const winston_1 = __importDefault(require("winston"));
const path = __importStar(require("path"));
const browser = __importStar(require("./browser"));
const window = new browser.Browser();
exports.window = window;
window.whenReady().then(() => {
    initLogger();
    logger.log({
        level: "debug",
        message: "Window is ready",
        sourceID: path.basename(__filename),
        line: __line,
    });
});
const myFormat = winston_1.default.format.printf(({ level, message, sourceID, line, timestamp }) => {
    return `${timestamp} [ ${level.toLocaleUpperCase()} ] ${sourceID} ${line}: ${message}`;
});
Object.defineProperty(global, "__stack", {
    get: function () {
        var orig = Error.prepareStackTrace;
        Error.prepareStackTrace = function (_, stack) {
            return stack;
        };
        var err = new Error();
        Error.captureStackTrace(err, arguments.callee);
        var stack = err.stack;
        Error.prepareStackTrace = orig;
        return stack;
    },
});
Object.defineProperty(global, "__line", {
    get: function () {
        // @ts-ignore
        return __stack[1].getLineNumber();
    },
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
function initLogger() {
    logger.log({
        level: "debug",
        message: "Logger is ready",
        sourceID: path.basename(__filename),
        line: __line,
    });
    window.win.webContents.addListener("console-message", (ev, code, message, line, sourceID) => {
        if (code == 3) {
            logger.log({
                level: "error",
                message: message,
                line: line,
                sourceID: sourceID,
            });
        }
        else if (code == 2) {
            logger.log({
                level: "warn",
                message: message,
                line: line,
                sourceID: sourceID,
            });
        }
    });
}
