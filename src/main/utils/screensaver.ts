import { globalNodyConfig } from "../config";
import { logger } from "../logger";

import {
  forceScreenSaver,
  getScreenSaver,
  setScreenSaver,
} from "../bindings/screensaver";

let initialTimeout = -1;
let taken = false;

function getScreensaver(): number {
  let timeout = 0;
  try {
    timeout = getScreenSaver().timeout;
  } catch (exception) {
    const err = exception as NodeJS.ErrnoException;
    logger.error(String(err));
    return -1;
  }
  if (initialTimeout == -1) initialTimeout = timeout;
  taken = true;
  return timeout;
}

function setScreensaver(timeout?: number): void {
  if (!taken) getScreensaver();
  if (initialTimeout == -1) return;
  timeout =
    timeout != undefined
      ? timeout
      : globalNodyConfig.config.greeter.screensaver_timeout;
  try {
    setScreenSaver(timeout);
  } catch (exception) {
    const err = exception as NodeJS.ErrnoException;
    logger.error(String(err));
    return;
  }
  logger.debug("Screensaver set");
}

function resetScreensaver(): void {
  if (!taken) getScreensaver();
  if (initialTimeout == -1) return;
  try {
    setScreenSaver(initialTimeout);
  } catch (exception) {
    const err = exception as NodeJS.ErrnoException;
    logger.error(String(err));
    return;
  }
  logger.debug("Screensaver reset");
}

function forceScreensaver(value: boolean): void {
  forceScreenSaver(value);
}

export { getScreensaver, setScreensaver, resetScreensaver, forceScreensaver };
