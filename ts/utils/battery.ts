import * as path from "path";
import * as fs from "fs";

import { globalNodyConfig } from "../config";
import { ACPI } from "./acpi";

interface Battery {
  name: string;
  status: string;
  perc: number;
  capacity: number;
}

let runningUpdate = false;

class BatteryController {
  public _batteries: Battery[] = [];
  public PS_PATH = "/sys/class/power_supply/";
  private _ac = "AC0";
  private _perc = -1;
  private _status = "N/A";
  private _acStatus = false;
  private _capacity = 0;
  private _time = "";
  private _watt = 0;

  public constructor() {
    if (globalNodyConfig.config.features.battery == true) this._init();
  }

  private _init(): void {
    if (this._batteries.length == 0) {
      scandirLine(this.PS_PATH, (lines) => this._updateBatteries(lines));
    }
    this.acpiListen();
    this.fullUpdate();
  }

  /**
   * Update available batteries and AC
   */
  private _updateBatteries(line: string): void {
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
  public get acStatus(): boolean {
    return this._acStatus;
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

  public acpiListen(): void {
    ACPI.connect((data) => {
      if (data.match(/battery|ac_adapter/)) {
        this.fullUpdate();
      }
    });
  }

  /**
   * Based on "bat" widget from "lain" awesome-wm library
   * * (c) 2013,      Luca CPZ
   * * (c) 2010-2012, Peter Hofmann
   * @see https://github.com/lcpz/lain/blob/master/widget/bat.lua
   */
  public async fullUpdate(): Promise<void> {
    if (runningUpdate) return;
    runningUpdate = true;

    let sumRateCurrent = 0;
    let sumRatePower = 0;
    let sumRateEnergy = 0;
    let sumEnergyNow = 0;
    let sumEnergyFull = 0;
    let sumChargeFull = 0;
    let sumChargeDesign = 0;

    async function readData(...p: string[]): Promise<string> {
      return readFirstLine(path.join(...p));
    }

    for (let i = 0; i < this._batteries.length; i++) {
      const battery = this._batteries[i];
      const batPath = this.PS_PATH + battery.name;
      const present = await readFirstLine(path.join(batPath, "present"));

      if (parseInt(present) == 1) {
        const rateCurrent = parseInt(await readData(batPath, "current_now"));
        const rateVoltage = parseInt(await readData(batPath, "voltage_now"));
        const ratePower = parseInt(await readData(batPath, "power_now"));
        const chargeFull = parseInt(await readData(batPath, "charge_full"));
        const chargeDesign = parseInt(
          await readData(batPath, "charge_full_design")
        );

        const energyNow = parseInt(
          (await readData(batPath, "energy_now")) ||
            (await readData(batPath, "charge_now"))
        );
        const energyFull =
          parseInt(await readData(batPath, "energy_full")) || chargeFull;
        const energyPercentage =
          parseInt(await readData(batPath, "capacity")) ||
          Math.floor((energyNow / energyFull) * 100);
        this._batteries[i].status =
          (await readData(batPath, "status")) || "N/A";
        this._batteries[i].perc = energyPercentage || this._batteries[i].perc;

        if (!chargeDesign || chargeDesign == 0) {
          this._batteries[i].capacity = 0;
        } else {
          this._batteries[i].capacity = Math.floor(
            (chargeFull / chargeDesign) * 100
          );
        }
        sumRateCurrent += rateCurrent || 0;
        sumRatePower += ratePower || 0;
        sumRateEnergy +=
          ratePower || ((rateVoltage || 0) * (rateCurrent || 0)) / 1e6;
        sumEnergyNow += energyNow || 0;
        sumEnergyFull += energyFull || 0;
        sumChargeFull += chargeFull || 0;
        sumChargeDesign += chargeDesign || 0;
      }
    }
    this._capacity = Math.floor(
      Math.min(100, (sumChargeFull / sumChargeDesign) * 100)
    );
    this._status =
      this._batteries.length > 0 ? this._batteries[0].status : "N/A";

    for (let i = 0; i < this._batteries.length; i++) {
      const battery = this._batteries[i];
      if (battery.status == "Discharging" || battery.status == "Charging") {
        this._status = battery.status;
      }
    }
    this._acStatus =
      Boolean(parseInt(await readData(this.PS_PATH, this._ac, "online"))) ??
      false;

    let rateTime: number;
    let rateTimeMagnitude: number;

    if (this._status != "N/A") {
      if (
        this._status != "Full" &&
        sumRatePower == 0 &&
        this._acStatus == true
      ) {
        this._perc = Math.floor(
          Math.min(100, (sumEnergyNow / sumEnergyFull) * 100 + 0.5)
        );
        this._time = "00:00";
        this._watt = 0;
      } else if (this._status != "Full") {
        rateTime = 0;
        if (sumRatePower > 0 || sumRateCurrent > 0) {
          const div = (sumRatePower > 0 && sumRatePower) || sumRateCurrent;
          if (this._status == "Charging")
            rateTime = (sumEnergyFull - sumEnergyNow) / div;
          else rateTime = sumEnergyNow / div;
          if (0 < rateTime && rateTime < 0.01) {
            rateTimeMagnitude = Math.abs(Math.floor(Math.log10(rateTime)));
            rateTime = (rateTime * 10) ^ (rateTimeMagnitude - 2);
          }
          const hours = Math.floor(rateTime);
          const minutes = Math.floor((rateTime - hours) * 60);
          this._perc = Math.floor(
            Math.min(100, (sumEnergyNow / sumEnergyFull) * 100 + 0.5)
          );
          this._time = `${hours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")}`;
          this._watt = sumRateEnergy / 1e6;
        }
      } else if (this._status == "Full") {
        this._perc = 100;
        this._time = "00:00";
        this._watt = 0;
      }
    }
    this._perc = this._perc == null ? 0 : this._perc;

    if (global.lightdmGreeter)
      global.lightdmGreeter._emitSignal("battery_update");

    runningUpdate = false;
  }
}

/**
 * List a directory and run callback for each element
 */
function scandirLine(dir: string, callback: (lines: string) => void): void {
  const lines = fs.readdirSync(dir, { encoding: "utf8" });
  lines.forEach((l) => callback(l));
}

/**
 * Read first line of a file asynchronously
 */
function readFirstLine(filePath: string): Promise<string> {
  return new Promise((resolve) => {
    const rs = fs.createReadStream(filePath, { encoding: "utf8" });
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

export { BatteryController };
