// eslint-disable-next-line
const addon = require("./build/Release/screensaver");

export interface Screensaver {
  timeout: number;
  interval: number;
  prefer_blank: number;
  allow_exp: number;
}

export function getScreenSaver(): Screensaver {
  return addon.getScreenSaver();
}

export function setScreenSaver(
  timeout: number,
  interval?: number,
  prefer_blank?: number,
  allow_exp?: number
): void {
  addon.setScreenSaver(timeout, interval, prefer_blank, allow_exp);
}
