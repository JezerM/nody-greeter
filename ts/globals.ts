import { dialog } from "electron";
import { Browser } from "./browser";
import { logger } from "./logger";
import { nody_greeter } from "./config";

const browser = new Browser();

browser.whenReady().then(() => {
  initLogger();
  logger.debug("Window is ready");
});

function initLogger() {
  logger.debug("Javascript logger is ready");
  browser.win.webContents.addListener(
    "console-message",
    (ev, code, message, line, sourceID) => {
      sourceID = sourceID == "" ? "console" : sourceID;
      if (code == 3) {
        logger.log({
          level: "error",
          message: message,
          line: line,
          source: sourceID,
        });
        error_prompt(message, sourceID, line);
      } else if (code == 2) {
        logger.log({
          level: "warn",
          message: message,
          line: line,
          source: sourceID,
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
