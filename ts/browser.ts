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
import { Brightness } from "./utils/brightness";
import { logger } from "./logger";
import { set_screensaver, reset_screensaver } from "./utils/screensaver";

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
        let req_url = request.url;
        let url = new URL(req_url);
        let res = decodeURI(url.pathname);
        //console.log({ url, res });
        callback(res);
      }
    );
  }

  load_theme(): void {
    let theme = nody_greeter.config.greeter.theme;
    let dir = nody_greeter.app.theme_dir;
    let path_to_theme = path.join(dir, theme, "index.html");
    let def_theme = "gruvbox";

    if (theme.startsWith("/")) path_to_theme = theme;
    else if (theme.includes(".") || theme.includes("/"))
      path_to_theme = path.join(process.cwd(), theme);

    if (!path_to_theme.endsWith(".html"))
      path_to_theme = path.join(path_to_theme, "index.html");

    if (!fs.existsSync(path_to_theme)) {
      logger.warn(
        `"${theme}" theme does not exists. Using "${def_theme}" theme`
      );
      path_to_theme = path.join(dir, def_theme, "index.html");
    }

    nody_greeter.config.greeter.theme = path_to_theme;

    //this.win.loadFile(path_to_theme);
    let theme_url = url.format({
      pathname: path_to_theme,
      host: "app",
      hostname: "app",
      protocol: "web-greeter:",
    });
    //console.log({ theme_url, url: new URL(theme_url) });
    this.win.loadURL(`${theme_url}`);
    this.win.setBackgroundColor("#000000");

    this.win.webContents.on("before-input-event", (event, input) => {
      let value = nody_greeter.config.features.backlight.value;
      let steps = nody_greeter.config.features.backlight.steps;
      if (input.type == "keyUp") return;
      if (input.code == "BrightnessDown") {
        Brightness.dec_brightness(value);
      } else if (input.code == "BrightnessUp") {
        Brightness.inc_brightness(value);
      }
    });

    logger.debug("Theme loaded");
  }

  create_window() {
    logger.debug("Initializing Browser Window");

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

    logger.debug("Browser Window created");

    /*
     * This seems to not work.
     * As electron uses GTK chromium, "XCURSOR_THEME" env variable is useless,
     * and there is no way to change it unless modifying:
     * - ~/.config/gtk-3.0/settings.ini
     */

    let cursor_theme = nody_greeter.config.greeter.icon_theme;
    process.env.XCURSOR_THEME = cursor_theme ? cursor_theme : "";

    set_screensaver();

    this.ready = true;

    return win;
  }

  init_listeners() {
    this.win.once("ready-to-show", () => {
      this.win.setFullScreen(nody_greeter.app.fullscreen);
      this.win.show();
      this.win.focus();
      logger.debug("Nody Greeter started");
    });

    app.on("quit", () => {
      reset_screensaver();
    });

    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      let url = new URL(details.url);
      //console.log({ origin: details.url, url });
      let block =
        !(
          url.protocol.includes("web-greeter") ||
          url.protocol.includes("file") ||
          url.protocol.includes("devtools")
        ) && nody_greeter.config.greeter.secure_mode;
      callback({ cancel: block });
    });
  }
}

export { Browser };
