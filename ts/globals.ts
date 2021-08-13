import * as path from "path";
import { dialog } from "electron";
import { Browser } from "./browser";
import { logger } from "./logger";
import { nody_greeter } from "./config";

const browser = new Browser();

browser.whenReady().then(() => {
  initLogger();
  logger.log({
    level: "debug",
    message: "Window is ready",
    sourceID: path.basename(__filename),
    line: __line,
  });
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

declare global {
  var __line: number;
  var __stack: string;
}

function initLogger() {
  logger.log({
    level: "debug",
    message: "Logger is ready",
    sourceID: path.basename(__filename),
    line: __line,
  });
  browser.win.webContents.addListener(
    "console-message",
    (ev, code, message, line, sourceID) => {
      sourceID = sourceID == "" ? "console" : sourceID;
      if (code == 3) {
        logger.log({
          level: "error",
          message: message,
          line: line,
          sourceID: sourceID,
        });
        error_prompt(message, sourceID, line);
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

function error_prompt(message: string, source: string, line: number) {
  if (!nody_greeter.config.greeter.detect_theme_errors) return;
  let ind = dialog.showMessageBoxSync(browser.win, {
    message:
      "An error ocurred. Do you want to change to default theme? (gruvbox)",
    detail: `${source} ${line}: ${message}`,
    type: "error",
    title: "An error ocurred",
    buttons: ["Cancel", "Use default theme", "Reload theme"],
  });
  switch (ind) {
    case 0: // Cancel
      break;
    case 1: // Default theme
      nody_greeter.config.greeter.theme = "gruvbox";
      browser.load_theme();
      break;
    case 2: // Reload theme
      browser.win.reload();
      break;
    default:
      break;
  }
}

export { browser, logger };
