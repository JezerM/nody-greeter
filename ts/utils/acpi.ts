import * as child_process from "child_process";
import { logger } from "../logger";

type callback = (data: string) => void;

class ACPIController {
  public constructor() {
    if (this.checkAcpi()) this.listen();
    else logger.error("ACPI: acpi_listen does not exists");
  }

  protected tries = 0;
  protected callbacks: callback[] = [];

  public connect(cb: callback): void {
    this.callbacks.push(cb);
  }
  public disconnect(cb: callback): void {
    const ind = this.callbacks.findIndex((c) => {
      return c === cb;
    });
    if (ind == -1) return;
    this.callbacks.splice(ind, 1);
  }

  private checkAcpi(): boolean {
    const res = child_process.spawnSync("which", ["acpi_listen"], {
      encoding: "utf-8",
    });
    if (res.status == 0) return true;
    else return false;
  }

  private listen(): void {
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
      const data = d.toString().trim();
      this.callbacks.forEach((cb) => {
        if (cb !== undefined) cb(data);
      });
    });
  }
}

const ACPI = new ACPIController();

export { ACPI };
