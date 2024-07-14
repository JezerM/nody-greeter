import {
  app,
  BrowserWindow,
  screen,
  session,
  protocol,
  Menu,
  MenuItemConstructorOptions,
} from "electron";

import {
  loadPrimaryThemePath,
  loadSecondaryThemePath,
  loadThemeDir,
  globalNodyConfig,
} from "./config";
import { fileURLToPath, URL } from "url";
import * as url from "url";
import { brightnessController } from "./utils/brightness";
import { logger } from "./logger";
import { setScreensaver, resetScreensaver } from "./utils/screensaver";
import { WindowMetadata } from "common/ldm_interfaces";

interface NodyWindow {
  isPrimary: boolean;
  display: Electron.Display;
  window: BrowserWindow;
  meta: WindowMetadata;
}
class Browser {
  public ready = false;
  public windows: NodyWindow[] = [];

  public constructor() {
    this.setPriviliged();
    app.whenReady().then(() => {
      this.init();
    });
  }

  public whenReady(): Promise<void> {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.ready) {
          resolve();
          clearInterval(interval);
        }
      }, 100);
    });
  }

  private init(): void {
    this.setProtocol();
    this.windows = this.createWindows();
    this.loadTheme();
    this.initListeners();
  }

  private setPriviliged(): void {
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

  private setProtocol(): void {
    protocol.registerFileProtocol("web-greeter", (request, callback) => {
      const reqUrl = request.url;
      const url = new URL(reqUrl);
      const res = decodeURI(url.pathname);
      //console.error("Protocol:", { url, res });
      callback(res);
    });
  }

  public loadTheme(): void {
    // This enforces the reload of theme_dir
    // in case of "Load default theme" or "Reload theme"
    loadThemeDir();
    const primaryHtml = loadPrimaryThemePath();
    const secondaryHtml = loadSecondaryThemePath();

    const primaryUrl = url.format({
      pathname: primaryHtml,
      host: "app",
      hostname: "app",
      protocol: "web-greeter:",
    });
    const secondaryUrl = url.format({
      pathname: secondaryHtml,
      host: "app",
      hostname: "app",
      protocol: "web-greeter:",
    });
    //console.log({ primary_url, secondary_url });
    for (const w of this.windows) {
      if (w.isPrimary) w.window.loadURL(`${primaryUrl}`);
      else w.window.loadURL(`${secondaryUrl}`);
      w.window.setBackgroundColor("#000000");

      w.window.webContents.on("before-input-event", (_event, input) => {
        const value = globalNodyConfig.config.features.backlight.value;
        if (input.type == "keyUp") return;
        if (input.code == "BrightnessDown") {
          brightnessController.decBrightness(value);
        } else if (input.code == "BrightnessUp") {
          brightnessController.incBrightness(value);
        }
      });
    }

    logger.debug("Theme loaded");
  }

  public createWindows(): NodyWindow[] {
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
      const isPrimary = display.id === primaryDisplay.id;
      return {
        isPrimary,
        display,
        window: new BrowserWindow({
          height: display.workAreaSize.height,
          width: display.workAreaSize.width,
          x: display.bounds.x,
          y: display.bounds.y,
          backgroundColor: "#000000",
          frame: globalNodyConfig.app.frame,
          show: false,
          webPreferences: {
            preload: fileURLToPath(
              new URL("../preload/index.cjs", import.meta.url)
            ),
            contextIsolation: false,
            allowRunningInsecureContent:
              !globalNodyConfig.config.greeter.secure_mode, // Should set option
            devTools: globalNodyConfig.app.debugMode, // Should set option
          },
        }),
        meta: {
          id: display.id,
          is_primary: isPrimary,
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

    const cursorTheme = globalNodyConfig.config.greeter.icon_theme;
    process.env.XCURSOR_THEME = cursorTheme ? cursorTheme : "";

    setScreensaver();

    this.ready = true;

    return windows;
  }

  private initListeners(): void {
    for (const w of this.windows) {
      w.window.once("ready-to-show", () => {
        w.window.setFullScreen(globalNodyConfig.app.fullscreen);
        w.window.show();
        if (w.isPrimary) {
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
        if (!globalNodyConfig.app.debugMode) return;
        const position = { x: params.x, y: params.y };
        const menuTemplate: MenuItemConstructorOptions[] = [
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
        const menu = Menu.buildFromTemplate(menuTemplate);
        menu.popup();
      });
    }

    app.on("quit", () => {
      resetScreensaver();
    });

    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      const url = new URL(details.url);
      const block =
        !(
          url.protocol.includes("web-greeter") ||
          url.protocol.includes("file") ||
          url.protocol.includes("devtools")
        ) && globalNodyConfig.config.greeter.secure_mode;
      //console.error("BeforeRequest:", {
      //origin: details.url,
      //url,
      //blocked: block,
      //});
      callback({ cancel: block });
    });
  }

  public get primaryWindow(): BrowserWindow {
    for (const w of this.windows) {
      if (w.isPrimary) {
        return w.window;
      }
    }
    throw new Error("No primary window initialized");
  }
}

export { Browser };
