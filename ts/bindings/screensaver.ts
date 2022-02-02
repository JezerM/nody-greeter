// eslint-disable-next-line
const addon = require("./build/Release/screensaver");

export interface Screensaver {
  timeout: number;
  interval: number;
  prefer_blank: number;
  allow_exp: number;
}

/**
 * Gets the XScreenSaver properties
 */
export function getScreenSaver(): Screensaver {
  return addon.getScreenSaver();
}

/**
 * Sets the XScreenSaver properties
 */
export function setScreenSaver(
  timeout: number,
  interval?: number,
  prefer_blank?: number,
  allow_exp?: number
): void {
  addon.setScreenSaver(timeout, interval, prefer_blank, allow_exp);
}

/**
 * Force XScreenSaver to be either on or off
 * @param {boolean} value Whether to activate screensaver
 */
export function forceScreenSaver(value: boolean): void {
  addon.forceScreenSaver(value);
}
