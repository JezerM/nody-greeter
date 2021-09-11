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
  let ctrls: string[] = [];
  for (let i = 0; i < sys_path.length; i++) {
    let dev = sys_path[i];
    if (fs.existsSync(dev) && fs.statSync(dev).isDirectory()) {
      let drs = fs.readdirSync(dev);
      for (let o = 0; o < drs.length; o++) {
        let name = drs[o];
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
  _brightness_path: string;
  _controllers: string[];
  steps: number;
  delay: number;

  constructor() {
    this._controllers = get_controllers();
    let b_path = this._controllers[0];
    this._brightness_path = path.join(b_path, "brightness");
    this._max_brightness = parseInt(
      fs.readFileSync(path.join(b_path, "max_brightness"), {
        encoding: "utf-8",
      })
    );

    let steps = nody_greeter.config.features.backlight.steps;
    this.steps = steps <= 1 ? 1 : steps;
    this.delay = 200;
    this.watch_brightness();
  }

  private watch_brightness() {
    fs.watch(this._brightness_path, () => {
      if (globalThis.lightdm)
        globalThis.lightdm._emit_signal("brightness_update");
    });
  }

  _max_brightness: number;
  public get max_brightness() {
    return this._max_brightness;
  }

  private get real_brightness(): number {
    return parseInt(
      fs.readFileSync(this._brightness_path, { encoding: "utf-8" })
    );
  }
  private set real_brightness(v: number) {
    if (v > this.max_brightness) v = this.max_brightness;
    else if (v <= 0) v = 0;

    if (!fs.existsSync(this._brightness_path)) return;
    fs.writeFileSync(this._brightness_path, String(Math.round(v)));
  }

  public get brightness() {
    return Math.round((this.real_brightness * 100) / this._max_brightness);
  }
  public set brightness(v: number) {
    this.real_brightness = (v * this.max_brightness) / 100;
  }

  public set_brightness(value: number) {
    let steps = this.steps;
    let sleep = this.delay / steps;
    let current = this.brightness;

    if (steps <= 1) {
      this.brightness = value;
      return;
    }

    let i = 0;
    let interval = setInterval(async () => {
      if (i > steps) return clearInterval(interval);
      let brigh = current + ((value - current) * i) / steps;
      this.brightness = brigh;
      i++;
    }, sleep);
  }

  public inc_brightness(value: number) {
    this.set_brightness(this.brightness + value);
  }
  public dec_brightness(value: number) {
    this.set_brightness(this.brightness - value);
  }

  public get_brightness() {
    return this.brightness;
  }
}

const Brightness = new BrightnessController();

export { Brightness };
