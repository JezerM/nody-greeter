import * as path from "path";
import * as fs from "fs";

import { nody_greeter } from "../config";
import { ACPI } from "./acpi";

interface battery {
  name: string;
  status: string;
  perc: number;
  capacity: number;
}

let running_update = false;

class Battery {
  public _batteries: battery[] = [];
  public ps_path = "/sys/class/power_supply/";
  private _ac = "AC0";
  private _perc = -1;
  private _status = "N/A";
  private _ac_status = false;
  private _capacity = 0;
  private _time = "";
  private _watt = 0;

  public constructor() {
    if (nody_greeter.config.features.battery == true) this._init();
  }

  private _init(): void {
    if (this._batteries.length == 0) {
      scandir_line(this.ps_path, (lines) => this._update_batteries(lines));
    }
    this.acpi_listen();
    this.full_update();
  }

  /**
   * Update available batteries and AC
   */
  private _update_batteries(line: string): void {
    const match = line.match(/BAT\w+/);
    if (match) {
      this._batteries.push({
        name: match[0],
        status: "N/A",
        perc: 0,
        capacity: 0,
      });
    } else {
      const ac = line.match(/A\w+/);
      this._ac = ac ? ac[0] : this._ac;
    }
  }
  public get name(): string {
    return this._batteries[0].name;
  }
  public get level(): number {
    return this._perc;
  }
  public get status(): string {
    return this._status;
  }
  public get ac_status(): boolean {
    return this._ac_status;
  }
  public get capacity(): number {
    return this._capacity;
  }
  public get time(): string {
    return this._time;
  }
  public get watt(): number {
    return this._watt;
  }

  public acpi_listen(): void {
    ACPI.connect((data) => {
      if (data.match(/battery|ac_adapter/)) {
        this.full_update();
      }
    });
  }

  /**
   * Based on "bat" widget from "lain" awesome-wm library
   * * (c) 2013,      Luca CPZ
   * * (c) 2010-2012, Peter Hofmann
   * @see https://github.com/lcpz/lain/blob/master/widget/bat.lua
   */
  public async full_update(): Promise<void> {
    if (running_update) return;
    running_update = true;

    let sum_rate_current = 0;
    let sum_rate_power = 0;
    let sum_rate_energy = 0;
    let sum_energy_now = 0;
    let sum_energy_full = 0;
    let sum_charge_full = 0;
    let sum_charge_design = 0;

    async function read_data(...p: string[]): Promise<string> {
      return read_first_line(path.join(...p));
    }

    for (let i = 0; i < this._batteries.length; i++) {
      const battery = this._batteries[i];
      const bat_path = this.ps_path + battery.name;
      const present = await read_first_line(path.join(bat_path, "present"));

      if (parseInt(present) == 1) {
        const rate_current = parseInt(await read_data(bat_path, "current_now"));
        const rate_voltage = parseInt(await read_data(bat_path, "voltage_now"));
        const rate_power = parseInt(await read_data(bat_path, "power_now"));
        const charge_full = parseInt(await read_data(bat_path, "charge_full"));
        const charge_desing = parseInt(
          await read_data(bat_path, "charge_full_design")
        );

        const energy_now = parseInt(
          (await read_data(bat_path, "energy_now")) ||
            (await read_data(bat_path, "charge_now"))
        );
        const energy_full =
          parseInt(await read_data(bat_path, "energy_full")) || charge_full;
        const energy_percentage =
          parseInt(await read_data(bat_path, "capacity")) ||
          Math.floor((energy_now / energy_full) * 100);
        this._batteries[i].status =
          (await read_data(bat_path, "status")) || "N/A";
        this._batteries[i].perc = energy_percentage || this._batteries[i].perc;

        if (!charge_desing || charge_desing == 0) {
          this._batteries[i].capacity = 0;
        } else {
          this._batteries[i].capacity = Math.floor(
            (charge_full / charge_desing) * 100
          );
        }
        sum_rate_current += rate_current || 0;
        sum_rate_power += rate_power || 0;
        sum_rate_energy +=
          rate_power || ((rate_voltage || 0) * (rate_current || 0)) / 1e6;
        sum_energy_now += energy_now || 0;
        sum_energy_full += energy_full || 0;
        sum_charge_full += charge_full || 0;
        sum_charge_design += charge_desing || 0;
      }
    }
    this._capacity = Math.floor(
      Math.min(100, (sum_charge_full / sum_charge_design) * 100)
    );
    this._status =
      this._batteries.length > 0 ? this._batteries[0].status : "N/A";

    for (let i = 0; i < this._batteries.length; i++) {
      const battery = this._batteries[i];
      if (battery.status == "Discharging" || battery.status == "Charging") {
        this._status = battery.status;
      }
    }
    this._ac_status =
      Boolean(parseInt(await read_data(this.ps_path, this._ac, "online"))) ??
      false;

    let rate_time: number;
    let rate_time_magnitude: number;

    if (this._status != "N/A") {
      if (
        this._status != "Full" &&
        sum_rate_power == 0 &&
        this._ac_status == true
      ) {
        this._perc = Math.floor(
          Math.min(100, (sum_energy_now / sum_energy_full) * 100 + 0.5)
        );
        this._time = "00:00";
        this._watt = 0;
      } else if (this._status != "Full") {
        rate_time = 0;
        if (sum_rate_power > 0 || sum_rate_current > 0) {
          const div =
            (sum_rate_power > 0 && sum_rate_power) || sum_rate_current;
          if (this._status == "Charging")
            rate_time = (sum_energy_full - sum_energy_now) / div;
          else rate_time = sum_energy_now / div;
          if (0 < rate_time && rate_time < 0.01) {
            rate_time_magnitude = Math.abs(Math.floor(Math.log10(rate_time)));
            rate_time = (rate_time * 10) ^ (rate_time_magnitude - 2);
          }
          const hours = Math.floor(rate_time);
          const minutes = Math.floor((rate_time - hours) * 60);
          this._perc = Math.floor(
            Math.min(100, (sum_energy_now / sum_energy_full) * 100 + 0.5)
          );
          this._time = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}`;
          this._watt = sum_rate_energy / 1e6;
        }
      } else if (this._status == "Full") {
        this._perc = 100;
        this._time = "00:00";
        this._watt = 0;
      }
    }
    this._perc = this._perc == null ? 0 : this._perc;

    if (global.lightdmGreeter)
      global.lightdmGreeter._emit_signal("battery_update");

    running_update = false;
  }
}

/**
 * List a directory and run callback for each element
 */
function scandir_line(dir: string, callback: (lines: string) => void): void {
  const lines = fs.readdirSync(dir, { encoding: "utf8" });
  lines.forEach((l) => callback(l));
}

/**
 * Read first line of a file asynchronously
 */
function read_first_line(file_path: string): Promise<string> {
  return new Promise((resolve) => {
    const rs = fs.createReadStream(file_path, { encoding: "utf8" });
    let val = "";
    let ind = 0;
    let pos = 0;
    rs.on("data", (data) => {
      ind = data.indexOf("\n");
      val += data;
      if (ind == -1) {
        pos += data.length;
      } else {
        pos += ind;
        rs.close();
      }
    })
      .on("close", () =>
        resolve(val.slice((val.charCodeAt(0) === 0xfeff && 1) || 0, pos))
      )
      .on("error", () => resolve(""));
  });
}

export { Battery };
