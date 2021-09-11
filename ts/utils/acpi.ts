import * as child_process from "child_process";
import { logger } from "../logger";

type callback = (data: string) => any;

class ACPI_controller {
  constructor() {
    this.listen();
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

  private listen() {
    const acpi = child_process.spawn("acpi_listen");
    acpi.on("error", (err) => {
      logger.error("Battery: " + err.message);
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
        cb(data);
      });
    });
  }
}

const ACPI = new ACPI_controller();

export { ACPI };
