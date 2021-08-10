import winston from "winston";
import * as path from "path";
import * as browser from "./browser";

const window = new browser.Browser();

window.whenReady().then(() => {
  initLogger();
  logger.log({
    level: "debug",
    message: "Window is ready",
    sourceID: path.basename(__filename),
    line: __line,
  });
});

const myFormat = winston.format.printf(
  ({ level, message, sourceID, line, timestamp }) => {
    return `${timestamp} [ ${level.toLocaleUpperCase()} ] ${sourceID} ${line}: ${message}`;
  }
);

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

declare global {
  var __line: number;
  var __stack: string;
}

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    myFormat
  ),
  defaultMeta: { service: "user-service" },
  transports: [
    new winston.transports.Console({
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
  window.win.webContents.addListener(
    "console-message",
    (ev, code, message, line, sourceID) => {
      if (code == 3) {
        logger.log({
          level: "error",
          message: message,
          line: line,
          sourceID: sourceID,
        });
      } else if (code == 2) {
        logger.log({
          level: "warn",
          message: message,
          line: line,
          sourceID: sourceID,
        });
      }
    }
  );
}

export { window };
