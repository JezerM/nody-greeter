import * as child_process from "child_process";
import * as path from "path";

import { nody_greeter } from "../config";
import { logger } from "../logger";

function brightness_change(
  value: number,
  steps: number,
  method: "inc" | "dec" | "set" = "set"
) {
  if (!nody_greeter.config.features.backlight.enabled) return;
  child_process.exec(
    `xbacklight -${method} ${value} -steps ${steps}`,
    (err) => {
      if (err) {
        logger.log({
          level: "error",
          message: "Brightness: " + err.message,
          sourceID: path.basename(__dirname),
          line: __line,
        });
        return;
      }
      globalThis.lightdm._emit_signal("brightness_update");
    }
  );
}

function brightness_get(): number {
  if (!nody_greeter.config.features.backlight.enabled) return -1;
  let res = -1;

  try {
    let str = child_process.execSync("xbacklight -get", { encoding: "utf8" });
    res = parseInt(str);
  } catch (err) {
    logger.log({
      level: "error",
      message: "Brightness: " + err,
      sourceID: path.basename(__dirname),
      line: __line,
    });
  }
  return res;
}

export { brightness_change, brightness_get };
