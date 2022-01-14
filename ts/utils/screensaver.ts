import { nody_greeter } from "../config";
import { logger } from "../logger";

import { getScreenSaver, setScreenSaver } from "../bindings/screensaver";

let initial_timeout = -1;
let taken = false;

function get_screensaver(): number {
  let timeout = 0;
  try {
    timeout = getScreenSaver().timeout;
  } catch (err) {
    logger.error(err);
    return -1;
  }
  if (initial_timeout == -1) initial_timeout = timeout;
  taken = true;
  return timeout;
}

function set_screensaver(timeout?: number): void {
  if (!taken) get_screensaver();
  if (initial_timeout == -1) return;
  timeout =
    timeout != undefined
      ? timeout
      : nody_greeter.config.greeter.screensaver_timeout;
  try {
    setScreenSaver(timeout);
  } catch (err) {
    logger.error(err);
    return;
  }
  logger.debug("Screensaver set");
}

function reset_screensaver(): void {
  if (!taken) get_screensaver();
  if (initial_timeout == -1) return;
  try {
    setScreenSaver(initial_timeout);
  } catch (err) {
    logger.error(err);
    return;
  }
  logger.debug("Screensaver reset");
}

export { get_screensaver, set_screensaver, reset_screensaver };
