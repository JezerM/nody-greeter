import * as path from "path";
import * as fs from "fs";

import { nody_greeter } from "../config";
import { logger } from "../logger";

const sys_path = ["/sys/class/backlight"];

/*
 * Behavior based on "acpilight"
 * Copyright(c) 2016-2019 by wave++ "Yuri D'Elia" <wavexx@thregr.org>
 * @see https://gitlab.com/wavexx/acpilight
 */

/**
 * Gets the controllers inside "sys_path"
 */
function get_controllers(): string[] {
  const ctrls: string[] = [];
  for (let i = 0; i < sys_path.length; i++) {
    const dev = sys_path[i];
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
  private _brightness_path = "";
  private _max_brightness_path = "";
  private _controllers: string[] = [];
  private steps = 0;
  private delay = 200;
  private _available = false;

  public constructor() {
    this._controllers = get_controllers();
    if (
      this._controllers.length == 0 ||
      this._controllers[0] == undefined ||
      nody_greeter.config.features.backlight.enabled == false
    ) {
      this._available = false;
      return;
    }
    const b_path = this._controllers[0];
    this._brightness_path = path.join(b_path, "brightness");
    this._max_brightness_path = path.join(b_path, "max_brightness");
    if (
      !this.can_write(this._brightness_path) ||
      !this.can_read(this._brightness_path) ||
      !this.can_read(this._max_brightness_path)
    ) {
      this._available = false;
      return;
    }
    this._available = true;

    this._max_brightness = parseInt(
      fs.readFileSync(this._max_brightness_path, {
        encoding: "utf-8",
      })
    );

    const steps = nody_greeter.config.features.backlight.steps;
    this.steps = steps <= 1 ? 1 : steps;
    this.delay = 200;
    this.watch_brightness();
  }

  private can_read(path: string): boolean {
    try {
      fs.accessSync(path, fs.constants.R_OK);
    } catch (err) {
      logger.error(`${err.code}: Cannot read "${path}"`);
      return false;
    }
    return true;
  }
  private can_write(path: string): boolean {
    try {
      fs.accessSync(path, fs.constants.W_OK);
    } catch (err) {
      logger.error(`${err.code}: Cannot write on "${path}"`);
      console.log(err);
      return false;
    }
    return true;
  }

  private watch_brightness(): void {
    if (!this._available) return;
    fs.watch(this._brightness_path, () => {
      if (global.lightdm) global.lightdm._emit_signal("brightness_update");
    });
  }

  private _max_brightness = 0;
  public get max_brightness(): number {
    return this._max_brightness;
  }

  private get real_brightness(): number {
    if (!this._available) return -1;
    return parseInt(
      fs.readFileSync(this._brightness_path, { encoding: "utf-8" })
    );
  }
  private set real_brightness(v: number) {
    if (!this._available) return;
    if (v > this.max_brightness) v = this.max_brightness;
    else if (v <= 0) v = 0;

    if (!fs.existsSync(this._brightness_path)) return;

    fs.writeFileSync(this._brightness_path, String(Math.round(v)));
  }

  public get brightness(): number {
    return Math.round((this.real_brightness * 100) / this._max_brightness);
  }
  public set brightness(v: number) {
    this.real_brightness = (v * this.max_brightness) / 100;
  }

  public set_brightness(value: number): void {
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

  public inc_brightness(value: number): void {
    this.set_brightness(this.brightness + value);
  }
  public dec_brightness(value: number): void {
    this.set_brightness(this.brightness - value);
  }

  public get_brightness(): number {
    return this.brightness;
  }
}

const Brightness = new BrightnessController();

export { Brightness };
