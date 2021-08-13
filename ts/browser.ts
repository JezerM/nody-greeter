import {
  app,
  BrowserWindow,
  screen,
  session,
  dialog,
  protocol,
} from "electron";
import * as path from "path";
import * as fs from "fs";

import { nody_greeter } from "./config";
import { URL } from "url";
import * as url from "url";
import { brightness_change } from "./utils/brightness";
import { logger } from "./logger";

class Browser {
  ready = false;

  constructor() {
    this.set_priviliged();
    app.whenReady().then(() => {
      this.init();
    });
  }

  // @ts-ignore
  win: BrowserWindow;

  whenReady(): Promise<void> {
    return new Promise((resolve) => {
      let interval = setInterval(() => {
        if (this.ready) {
          resolve();
          clearInterval(interval);
        }
      }, 100);
    });
  }

  init() {
    this.set_protocol();
    this.win = this.create_window();
    this.load_theme();
    this.init_listeners();
  }

  private set_priviliged() {
    protocol.registerSchemesAsPrivileged([
      {
        scheme: "web-greeter",
        privileges: {
          bypassCSP: true,
          supportFetchAPI: true,
          standard: true,
          secure: true,
          corsEnabled: true,
          stream: true,
          allowServiceWorkers: true,
        },
      },
    ]);
  }

  private set_protocol() {
    let done = protocol.registerFileProtocol(
      "web-greeter",
      (request, callback) => {
        let url = new URL(request.url);
        let res = url.pathname;
        if (res.startsWith("/share")) res = res.replace("/share", "/usr/share");
        callback(res);
      }
    );
  }

  load_theme(): void {
    let theme = nody_greeter.config.greeter.theme;
    let dir = nody_greeter.app.theme_dir;
    let path_to_theme = path.join(dir, theme, "index.html");
    let def_theme = "gruvbox";

    if (!fs.existsSync(path_to_theme)) {
      logger.log({
        level: "warn",
        message: `"${theme}" theme does not exists. Using "${def_theme}" theme`,
        sourceID: path.basename(__filename),
        line: __line,
      });
      path_to_theme = path.join(dir, def_theme, "index.html");
    }

    //this.win.loadFile(path_to_theme);
    this.win.loadURL(`web-greeter://${path_to_theme}`);
    console.log(path_to_theme);
    this.win.setBackgroundColor("#000000");

    this.win.webContents.on("before-input-event", (event, input) => {
      let value = nody_greeter.config.features.backlight.value;
      let steps = nody_greeter.config.features.backlight.steps;
      if (input.type == "keyUp") return;
      if (input.code == "BrightnessDown") {
        brightness_change(value, steps, "dec");
      } else if (input.code == "BrightnessUp") {
        brightness_change(value, steps, "inc");
      }
    });

    logger.log({
      level: "debug",
      message: "Theme loaded",
      sourceID: path.basename(__filename),
      line: __line,
    });
  }

  create_window() {
    logger.log({
      level: "debug",
      message: "Initializing Browser Window",
      sourceID: path.basename(__filename),
      line: __line,
    });

    let screen_size = screen.getPrimaryDisplay().workAreaSize;

    let win = new BrowserWindow({
      height: screen_size.height,
      width: screen_size.width,
      backgroundColor: "#000000",
      frame: nody_greeter.app.frame,
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
        nodeIntegration: false,
        contextIsolation: false,
        allowRunningInsecureContent: !nody_greeter.config.greeter.secure_mode, // Should set option
        devTools: nody_greeter.app.debug_mode, // Should set option
      },
    });

    logger.log({
      level: "debug",
      message: "Browser Window created",
      sourceID: path.basename(__filename),
      line: global.__line,
    });

    this.ready = true;

    return win;
  }

  init_listeners() {
    this.win.once("ready-to-show", () => {
      this.win.setFullScreen(nody_greeter.app.fullscreen);
      this.win.show();
      this.win.focus();
      logger.log({
        level: "debug",
        message: "Nody Greeter started",
        sourceID: path.basename(__filename),
        line: __line,
      });
    });

    session.defaultSession.webRequest.onBeforeSendHeaders(
      (details, callback) => {
        let url = new URL(details.url);
        let block =
          !(
            url.protocol.includes("web-greeter") ||
            url.protocol.includes("file") ||
            url.protocol.includes("devtools")
          ) && nody_greeter.config.greeter.secure_mode;
        callback({ cancel: block });
      }
    );
  }
}

export { Browser };
