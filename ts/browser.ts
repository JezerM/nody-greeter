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

import {
  load_primary_theme_path,
  load_secondary_theme_path,
  nody_greeter,
} from "./config";
import { URL } from "url";
import * as url from "url";
import { Brightness } from "./utils/brightness";
import { logger } from "./logger";
import { set_screensaver, reset_screensaver } from "./utils/screensaver";
import { WindowMetadata } from "./preload";

interface NodyWindow {
  is_primary: boolean;
  display: Electron.Display;
  window: BrowserWindow;
  meta: WindowMetadata;
}
class Browser {
  ready = false;

  constructor() {
    this.set_priviliged();
    app.whenReady().then(() => {
      this.init();
    });
  }

  windows: NodyWindow[] = [];

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
    this.windows = this.create_windows();
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
      //console.error("Protocol:", { url, res });
      callback(res);
    });
  }

  load_theme(): void {
    const primary_html = load_primary_theme_path();
    const secondary_html = load_secondary_theme_path();

    const primary_url = url.format({
      pathname: primary_html,
      host: "app",
      hostname: "app",
      protocol: "web-greeter:",
    });
    const secondary_url = url.format({
      pathname: secondary_html,
      host: "app",
      hostname: "app",
      protocol: "web-greeter:",
    });
    //console.log({ primary_url, secondary_url });
    for (const w of this.windows) {
      if (w.is_primary) w.window.loadURL(`${primary_url}`);
      else w.window.loadURL(`${secondary_url}`);
      w.window.setBackgroundColor("#000000");

      w.window.webContents.on("before-input-event", (_event, input) => {
        const value = nody_greeter.config.features.backlight.value;
        if (input.type == "keyUp") return;
        if (input.code == "BrightnessDown") {
          Brightness.dec_brightness(value);
        } else if (input.code == "BrightnessUp") {
          Brightness.inc_brightness(value);
        }
      });
    }

    logger.debug("Theme loaded");
  }

  create_windows(): NodyWindow[] {
    logger.debug("Initializing Browser Window");

    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    // Calculate the total display area
    const overallBoundary: WindowMetadata["overallBoundary"] = {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
    };

    for (const display of displays) {
      overallBoundary.minX = Math.min(overallBoundary.minX, display.bounds.x);
      overallBoundary.minY = Math.min(overallBoundary.minY, display.bounds.y);
      overallBoundary.maxX = Math.max(
        overallBoundary.maxX,
        display.bounds.x + display.bounds.width
      );
      overallBoundary.maxY = Math.max(
        overallBoundary.maxY,
        display.bounds.y + display.bounds.height
      );
    }

    const windows: NodyWindow[] = displays.map((display) => {
      const is_primary = display.id === primaryDisplay.id;
      return {
        is_primary,
        display,
        window: new BrowserWindow({
          height: display.workAreaSize.height,
          width: display.workAreaSize.width,
          x: display.bounds.x,
          y: display.bounds.y,
          backgroundColor: "#000000",
          frame: nody_greeter.app.frame,
          show: false,
          webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            nodeIntegration: false,
            contextIsolation: false,
            allowRunningInsecureContent:
              !nody_greeter.config.greeter.secure_mode, // Should set option
            devTools: nody_greeter.app.debug_mode, // Should set option
          },
        }),
        meta: {
          id: display.id,
          is_primary,
          size: {
            width: display.workAreaSize.width,
            height: display.workAreaSize.height,
          },
          position: {
            x: display.bounds.x,
            y: display.bounds.y,
          },
          overallBoundary,
        },
      };
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

    return windows;
  }

  init_listeners(): void {
    for (const w of this.windows) {
      w.window.once("ready-to-show", () => {
        w.window.setFullScreen(nody_greeter.app.fullscreen);
        w.window.show();
        if (w.is_primary) {
          w.window.focus();
        }
        logger.debug("Nody Greeter started win: " + w.meta.id);
      });
      w.window.webContents.on("devtools-opened", () => {
        w.window.webContents.devToolsWebContents?.focus();
      });

      w.window.on("closed", () => {
        this.windows = this.windows.filter((value) => {
          return value.window !== w.window;
        });
      });

      w.window.webContents.on("context-menu", (_ev, params) => {
        if (!nody_greeter.app.debug_mode) return;
        const position = { x: params.x, y: params.y };
        const menu_template: MenuItemConstructorOptions[] = [
          { role: "undo", enabled: params.editFlags.canUndo, accelerator: "U" },
          { role: "redo", enabled: params.editFlags.canRedo, accelerator: "R" },
          { type: "separator" },
          { role: "cut", enabled: params.editFlags.canCut, accelerator: "C" },
          { role: "copy", enabled: params.editFlags.canCopy, accelerator: "C" },
          {
            role: "paste",
            enabled: params.editFlags.canPaste,
            accelerator: "P",
          },
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
              w.window.webContents.inspectElement(position.x, position.y);
            },
            accelerator: "I",
          },
        ];
        const menu = Menu.buildFromTemplate(menu_template);
        menu.popup();
      });
    }

    app.on("quit", () => {
      reset_screensaver();
    });

    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = new URL(details.url);
      const block =
        !(
          url.protocol.includes("web-greeter") ||
          url.protocol.includes("file") ||
          url.protocol.includes("devtools")
        ) && nody_greeter.config.greeter.secure_mode;
      //console.error("BeforeRequest:", {
      //origin: details.url,
      //url,
      //blocked: block,
      //});
      callback({ cancel: block });
    });
  }

  public get primary_window(): BrowserWindow {
    for (const w of this.windows) {
      if (w.is_primary) {
        return w.window;
      }
    }
    throw new Error("No primary window initialized");
  }
}

export { Browser };
