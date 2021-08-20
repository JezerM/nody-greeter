import * as child_process from "child_process";
import * as path from "path";
import * as fs from "fs";

import { nody_greeter } from "../config";
import { logger } from "../logger";

interface battery {
  name: string;
  status: string;
  perc: number;
  capacity: number;
}

let running_update = false;
let acpi_tries = 0;

class Battery {
  _batteries: battery[] = [];
  _ac = "AC0";
  ps_path = "/sys/class/power_supply/";
  _perc = -1;
  _status = "N/A";
  _ac_status: number | string = 0;
  _capacity = 0;
  _time = "";
  _watt = 0;

  constructor() {
    this._init();
  }

  _init() {
    if (this._batteries.length == 0) {
      scandir_line(this.ps_path, this._update_batteries.bind(this));
    }
    this.acpi_listen();
    this.full_update();
  }

  _update_batteries(line: string) {
    let match = line.match(/BAT\w+/);
    if (match) {
      this._batteries.push({
        name: match[0],
        status: "N/A",
        perc: 0,
        capacity: 0,
      });
    } else {
      let ac = line.match(/A\w+/);
      this._ac = ac ? ac[0] : this._ac;
    }
  }

  get name() {
    return this._batteries[0].name;
  }

  get level() {
    return this._perc;
  }

  get status() {
    return this._status;
  }

  get ac_status() {
    return this._ac_status;
  }

  get capacity() {
    return this._capacity;
  }

  get time() {
    return this._time;
  }
  get watt() {
    return this._watt;
  }

  acpi_listen() {
    const acpi = child_process.spawn("acpi_listen");
    const grep = child_process.spawn("grep", [
      "--line-buffered",
      "-E",
      "battery|ac_adapter",
    ]);
    acpi.on("close", () => grep.stdin.end());
    acpi.stdout.on("data", (data) => grep.stdin.write(data.toString()));
    acpi.on("error", (err) => {
      logger.log({
        level: "error",
        message: "Battery: " + err.message,
        sourceID: path.basename(__dirname),
        line: __line,
      });
    });
    acpi.on("close", () => {
      grep.stdin.end();
      if (acpi_tries < 5) {
        acpi_tries++;
        logger.log({
          level: "debug",
          message: "Restarting acpi_listen",
        });
        return this.acpi_listen();
      }
    });
    grep.stdout.on("data", (data) => {
      data = data.toString().replace("\n", "");
      this.full_update();
    });
  }

  /**
   * Based on "bat" widget from "lain" awesome-wm library
   * * (c) 2013,      Luca CPZ
   * * (c) 2010-2012, Peter Hofmann
   * @see https://github.com/lcpz/lain/blob/master/widget/bat.lua
   */
  async full_update() {
    if (running_update) return;
    running_update = true;

    let sum_rate_current = 0;
    let sum_rate_power = 0;
    let sum_rate_energy = 0;
    let sum_energy_now = 0;
    let sum_energy_full = 0;
    let sum_charge_full = 0;
    let sum_charge_design = 0;

    async function read_data(...p: string[]) {
      return read_first_line(path.join(...p));
    }

    for (let i = 0; i < this._batteries.length; i++) {
      let battery = this._batteries[i];
      let bat_path = this.ps_path + battery.name;
      let present = await read_first_line(path.join(bat_path, "present"));

      if (parseInt(present) == 1) {
        let rate_current = parseInt(await read_data(bat_path, "current_now"));
        let rate_voltage = parseInt(await read_data(bat_path, "voltage_now"));
        let rate_power = parseInt(await read_data(bat_path, "power_now"));
        let charge_full = parseInt(await read_data(bat_path, "charge_full"));
        let charge_desing = parseInt(
          await read_data(bat_path, "charge_full_design")
        );

        let energy_now = parseInt(
          (await read_data(bat_path, "energy_now")) ||
            (await read_data(bat_path, "charge_now"))
        );
        let energy_full =
          parseInt(await read_data(bat_path, "energy_full")) || charge_full;
        let energy_percentage =
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
      let battery = this._batteries[i];
      if (battery.status == "Discharging" || battery.status == "Charging") {
        this._status = battery.status;
      }
    }
    this._ac_status =
      parseInt(await read_data(this.ps_path, this._ac, "online")) ?? "N/A";

    let rate_time: number;
    let rate_time_magnitude: number;

    if (this._status != "N/A") {
      if (
        this._status != "Full" &&
        sum_rate_power == 0 &&
        this._ac_status == 1
      ) {
        this._perc = Math.floor(
          Math.min(100, (sum_energy_now / sum_energy_full) * 100 + 0.5)
        );
        this._time = "00:00";
        this._watt = 0;
      } else if (this._status != "Full") {
        rate_time = 0;
      }

      if (sum_rate_power > 0 || sum_rate_current > 0) {
        let div = (sum_rate_power > 0 && sum_rate_power) || sum_rate_current;
        if (this._status == "Charging")
          rate_time = (sum_energy_full - sum_energy_now) / div;
        else rate_time = sum_energy_now / div;
        if (0 < rate_time && rate_time < 0.01) {
          rate_time_magnitude = Math.abs(Math.floor(Math.log10(rate_time)));
          rate_time = (rate_time * 10) ^ (rate_time_magnitude - 2);
        }
        let hours = Math.floor(rate_time);
        let minutes = Math.floor((rate_time - hours) * 60);
        this._perc = Math.floor(
          Math.min(100, (sum_energy_now / sum_energy_full) * 100 + 0.5)
        );
        this._time = `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}`;
        this._watt = sum_rate_energy / 1e6;
      }
    }
    this._perc = this._perc == null ? 0 : this._perc;

    globalThis.lightdm._emit_signal("battery_update");

    running_update = false;
  }
}

function scandir_line(dir: string, callback: Function) {
  let lines = fs.readdirSync(dir, { encoding: "utf8" });
  lines.forEach((l) => callback(l));
}

function read_first_line(file_path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let rs = fs.createReadStream(file_path, { encoding: "utf8" });
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
      .on("error", (err) => resolve(undefined));
  });
}

export { Battery };
