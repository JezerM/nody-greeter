import * as path from "path";
import * as fs from "fs";

import { globalNodyConfig } from "../config";
import { logger } from "../logger";

const SYS_PATH = ["/sys/class/backlight"];

/*
 * Behavior based on "acpilight"
 * Copyright(c) 2016-2019 by wave++ "Yuri D'Elia" <wavexx@thregr.org>
 * @see https://gitlab.com/wavexx/acpilight
 */

/**
 * Gets the controllers inside "sys_path"
 */
function getControllers(): string[] {
  const ctrls: string[] = [];
  for (let i = 0; i < SYS_PATH.length; i++) {
    const dev = SYS_PATH[i];
    if (fs.existsSync(dev) && fs.statSync(dev).isDirectory()) {
      const drs = fs.readdirSync(dev);
      for (let o = 0; o < drs.length; o++) {
        const name = drs[o];
        ctrls[o] = path.join(dev, name);
      }
    }
  }
  return ctrls;
}

/**
 * The brightnes controller
 * @class
 */
class BrightnessController {
  private _brightnessPath = "";
  private _maxBrightnessPath = "";
  private _controllers: string[] = [];
  private steps = 0;
  private delay = 200;
  private _available = false;

  public constructor() {
    this._controllers = getControllers();
    if (
      this._controllers.length == 0 ||
      this._controllers[0] == undefined ||
      globalNodyConfig.config.features.backlight.enabled == false
    ) {
      this._available = false;
      return;
    }
    const bPath = this._controllers[0];
    this._brightnessPath = path.join(bPath, "brightness");
    this._maxBrightnessPath = path.join(bPath, "max_brightness");
    if (
      !this.canWrite(this._brightnessPath) ||
      !this.canRead(this._brightnessPath) ||
      !this.canRead(this._maxBrightnessPath)
    ) {
      this._available = false;
      return;
    }
    this._available = true;

    this._maxBrightness = parseInt(
      fs.readFileSync(this._maxBrightnessPath, {
        encoding: "utf-8",
      })
    );

    const steps = globalNodyConfig.config.features.backlight.steps;
    this.steps = steps <= 1 ? 1 : steps;
    this.delay = 200;
    this.watchBrightness();
  }

  private canRead(path: string): boolean {
    try {
      fs.accessSync(path, fs.constants.R_OK);
    } catch (exception) {
      const err = exception as NodeJS.ErrnoException;
      logger.error(`${err.code}: Cannot read "${path}"`);
      return false;
    }
    return true;
  }
  private canWrite(path: string): boolean {
    try {
      fs.accessSync(path, fs.constants.W_OK);
    } catch (exception) {
      const err = exception as NodeJS.ErrnoException;
      logger.error(`${err.code}: Cannot write on "${path}"`);
      console.log(err);
      return false;
    }
    return true;
  }

  private watchBrightness(): void {
    if (!this._available) return;
    fs.watch(this._brightnessPath, () => {
      if (global.lightdmGreeter)
        global.lightdmGreeter._emitSignal("brightness_update");
    });
  }

  private _maxBrightness = 0;
  public get maxBrightness(): number {
    return this._maxBrightness;
  }

  private get realBrightness(): number {
    if (!this._available) return -1;
    return parseInt(
      fs.readFileSync(this._brightnessPath, { encoding: "utf-8" })
    );
  }
  private set realBrightness(v: number) {
    if (!this._available) return;
    if (v > this.maxBrightness) v = this.maxBrightness;
    else if (v <= 0) v = 0;

    if (!fs.existsSync(this._brightnessPath)) return;

    fs.writeFileSync(this._brightnessPath, String(Math.round(v)));
  }

  public get brightness(): number {
    return Math.round((this.realBrightness * 100) / this._maxBrightness);
  }
  public set brightness(v: number) {
    this.realBrightness = (v * this.maxBrightness) / 100;
  }

  public setBrightness(value: number): void {
    if (!this._available) return;
    const steps = this.steps;
    const sleep = this.delay / steps;
    const current = this.brightness;

    if (steps <= 1) {
      this.brightness = value;
      return;
    }

    let i = 0;
    const interval: NodeJS.Timeout = setInterval(async () => {
      if (i > steps) return clearInterval(interval);
      const brigh = current + ((value - current) * i) / steps;
      this.brightness = brigh;
      i++;
    }, sleep);
  }

  public incBrightness(value: number): void {
    this.setBrightness(this.brightness + value);
  }
  public decBrightness(value: number): void {
    this.setBrightness(this.brightness - value);
  }

  public getBrightness(): number {
    return this.brightness;
  }
}

const brightnessController = new BrightnessController();

export { brightnessController };
