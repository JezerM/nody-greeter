import * as child_process from "child_process";
import * as path from "path";

import { nody_greeter } from "../config";
import { logger } from "../logger";

let initial_timeout = 0;
let taken = false;

async function get_screensaver(): Promise<number> {
  return new Promise((resolve) => {
    if (taken) return resolve(initial_timeout);
    child_process.exec(
      "xset -q | awk '/^  timeout: / {print $2}'",
      { encoding: "utf-8" },
      (err, stdout, stderr) => {
        initial_timeout = parseInt(stdout.replace(/\n/g, ""));
        resolve(initial_timeout);
        taken = true;
      }
    );
  });
}

async function set_screensaver(timeout?: number) {
  if (!taken) await get_screensaver();
  timeout = timeout ? timeout : nody_greeter.config.greeter.screensaver_timeout;
  child_process.exec(`xset s ${timeout}`);
  logger.log({
    level: "debug",
    message: "Screensaver set",
    sourceID: path.basename(__filename),
    line: __line,
  });
}

async function reset_screensaver() {
  if (!taken) await get_screensaver();
  child_process.exec(`xset s ${initial_timeout}`);
  logger.log({
    level: "debug",
    message: "Screensaver reset",
    sourceID: path.basename(__filename),
    line: __line,
  });
}

export { get_screensaver, set_screensaver, reset_screensaver };
