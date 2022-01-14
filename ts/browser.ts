import {
  app,
  BrowserWindow,
  screen,
  session,
  protocol,
  Menu,
  MenuItemConstructorOptions,
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
      const interval = setInterval(() => {
        if (this.ready) {
          resolve();
          clearInterval(interval);
        }
      }, 100);
    });
  }

  init(): void {
    this.set_protocol();
    this.win = this.create_window();
    this.load_theme();
    this.init_listeners();
  }

  private set_priviliged(): void {
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

  private set_protocol(): void {
    protocol.registerFileProtocol("web-greeter", (request, callback) => {
      const req_url = request.url;
      const url = new URL(req_url);
      const res = decodeURI(url.pathname);
      //console.log({ url, res });
      callback(res);
    });
  }

  load_theme(): void {
    const theme = nody_greeter.config.greeter.theme;
    const dir = nody_greeter.app.theme_dir;
    let path_to_theme = path.join(dir, theme, "index.html");
    const def_theme = "gruvbox";

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
    const theme_url = url.format({
      pathname: path_to_theme,
      host: "app",
      hostname: "app",
      protocol: "web-greeter:",
    });
    //console.log({ theme_url, url: new URL(theme_url) });
    this.win.loadURL(`${theme_url}`);
    this.win.setBackgroundColor("#000000");

    this.win.webContents.on("before-input-event", (_event, input) => {
      const value = nody_greeter.config.features.backlight.value;
      if (input.type == "keyUp") return;
      if (input.code == "BrightnessDown") {
        Brightness.dec_brightness(value);
      } else if (input.code == "BrightnessUp") {
        Brightness.inc_brightness(value);
      }
    });

    logger.debug("Theme loaded");
  }

  create_window(): BrowserWindow {
    logger.debug("Initializing Browser Window");

    const screen_size = screen.getPrimaryDisplay().workAreaSize;

    const win = new BrowserWindow({
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

    const cursor_theme = nody_greeter.config.greeter.icon_theme;
    process.env.XCURSOR_THEME = cursor_theme ? cursor_theme : "";

    set_screensaver();

    this.ready = true;

    return win;
  }

  init_listeners(): void {
    this.win.once("ready-to-show", () => {
      this.win.setFullScreen(nody_greeter.app.fullscreen);
      this.win.show();
      this.win.focus();
      logger.debug("Nody Greeter started");
    });
    this.win.webContents.on("devtools-opened", () => {
      this.win.webContents.devToolsWebContents.focus();
    });

    app.on("quit", () => {
      reset_screensaver();
    });

    this.win.webContents.on("context-menu", (_ev, params) => {
      if (!nody_greeter.app.debug_mode) return;
      const position = { x: params.x, y: params.y };
      const menu_template: MenuItemConstructorOptions[] = [
        { role: "undo", enabled: params.editFlags.canUndo, accelerator: "U" },
        { role: "redo", enabled: params.editFlags.canRedo, accelerator: "R" },
        { type: "separator" },
        { role: "cut", enabled: params.editFlags.canCut, accelerator: "C" },
        { role: "copy", enabled: params.editFlags.canCopy, accelerator: "C" },
        { role: "paste", enabled: params.editFlags.canPaste, accelerator: "P" },
        {
          role: "delete",
          enabled: params.editFlags.canDelete,
          accelerator: "D",
        },
        {
          role: "selectAll",
          enabled: params.editFlags.canSelectAll,
          accelerator: "S",
          registerAccelerator: true,
        },
        { type: "separator" },
        { role: "reload", accelerator: "R", registerAccelerator: false },
        { role: "forceReload", accelerator: "F", registerAccelerator: false },
        { role: "toggleDevTools", accelerator: "T" },
        {
          label: "Inspect Element",
          click: (): void => {
            this.win.webContents.inspectElement(position.x, position.y);
          },
          accelerator: "I",
        },
      ];
      const menu = Menu.buildFromTemplate(menu_template);
      menu.popup();
    });

    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = new URL(details.url);
      //console.log({ origin: details.url, url });
      const block =
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
