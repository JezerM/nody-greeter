import * as child_process from "child_process";
import { logger } from "../logger";

type callback = (data: string) => any;

class ACPI_controller {
  constructor() {
    if (this.check_acpi()) this.listen();
    else logger.error("ACPI: acpi_listen does not exists");
  }

  protected tries = 0;
  protected callbacks: callback[] = [];

  public connect(cb: callback) {
    this.callbacks.push(cb);
  }
  public disconnect(cb: callback) {
    let ind = this.callbacks.findIndex((c) => {
      return c === cb;
    });
    if (ind == -1) return;
    this.callbacks.splice(ind, 1);
  }

  private check_acpi(): boolean {
    let res = child_process.spawnSync("which", ["acpi_listen"], {
      encoding: "utf-8",
    });
    if (res.status == 0) return true;
    else return false;
  }

  private listen() {
    const acpi = child_process.spawn("acpi_listen");
    acpi.on("error", (err) => {
      logger.error("ACPI: " + err.message);
    });
    acpi.on("close", () => {
      if (this.tries < 5) {
        this.tries++;
        logger.debug("Restarting acpi_listen");
        return this.listen();
      }
    });

    acpi.stdout.addListener("data", (d: Buffer) => {
      let data = d.toString().trim();
      this.callbacks.forEach((cb) => {
        if (cb !== undefined) cb(data);
      });
    });
  }
}

const ACPI = new ACPI_controller();

export { ACPI };
