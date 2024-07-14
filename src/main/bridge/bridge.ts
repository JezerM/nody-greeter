import { dialog, ipcMain } from "electron";
import * as gi from "node-gtk";
import * as fs from "fs";
import * as os from "os";
import { globalNodyConfig, WebGreeterConfig } from "../config";

const LightDM = gi.require("LightDM", "1");

const LightDMGreeter = new LightDM.Greeter();
const LightDMUsers = new LightDM.UserList();

import {
  userToObject,
  languageToObject,
  layoutToObject,
  sessionToObject,
  batteryToObject,
} from "./bridge_objects";
import { browser, generalErrorPrompt } from "../globals";

import { brightnessController } from "../utils/brightness.js";
import { BatteryController } from "../utils/battery";
import { forceScreensaver, resetScreensaver } from "../utils/screensaver.js";
import * as path from "path";
import {
  LightDMBattery,
  LightDMLanguage,
  LightDMLayout,
  LightDMSession,
  LightDMUser,
} from "../ldm_interfaces";
import { logger } from "../logger";
import { CONSTS } from "common/consts";

export class Greeter {
  // TODO: Remove this eslint-disable comment
  /* eslint-disable @typescript-eslint/naming-convention */

  public _config: WebGreeterConfig;
  public _batteryController: BatteryController;
  public _sharedDataDirectory: string;
  public static _instance: Greeter;

  private constructor(config: WebGreeterConfig) {
    this._config = config;

    this._batteryController = new BatteryController();

    try {
      //LightDMGreeter.setResettable(true);
      LightDMGreeter.connectToDaemonSync();
    } catch (exception) {
      const err = exception as NodeJS.ErrnoException;
      logger.error(err.stack ?? "");
      browser.whenReady().then(() => {
        dialog.showMessageBoxSync(browser.primaryWindow, {
          message:
            "Detected a problem that could interfere with the system login process", // Yeah, that problematic message
          detail: `LightDM: ${err}\nYou can continue without major problems, but you won't be able to log in`,
          type: "error",
          title: "An error ocurred",
          buttons: ["Okay"],
        });
      });
    }

    this._connectSignals();

    const user = LightDMUsers.getUsers()[0];
    const userDataDir = LightDMGreeter.ensureSharedDataDirSync(user.name);
    this._sharedDataDirectory = userDataDir.slice(
      0,
      userDataDir.lastIndexOf("/")
    );

    if (LightDMGreeter.getLockHint()) forceScreensaver(true);

    logger.debug("LightDM API connected");
  }

  private _connectSignals(): void {
    LightDMGreeter.connect("authentication-complete", () => {
      this._emitSignal("authentication-complete");
    });
    LightDMGreeter.connect("autologin-timer-expired", () => {
      this._emitSignal("autologin-timer-expired");
    });
    LightDMGreeter.connect("show-message", (text: string, type: number) => {
      this._emitSignal("show-message", text, type);
    });
    LightDMGreeter.connect("show-prompt", (text: string, type: number) => {
      this._emitSignal("show-prompt", text, type);
    });
    LightDMGreeter.connect("idle", () => {
      this._emitSignal("idle");
    });
    LightDMGreeter.connect("reset", () => {
      this._emitSignal("reset");
    });
  }

  public _emitSignal(signal: string, ...args: unknown[]): void {
    //console.log("SIGNAL EMITTED", signal, args)
    for (const win of browser.windows) {
      win.window.webContents.send(
        CONSTS.channel.lightdm_signal,
        signal,
        ...args
      );
    }
  }

  public static getInstance(config: WebGreeterConfig): Greeter {
    return this._instance || (this._instance = new this(config));
  }

  /**
   * The username of the user being authenticated or "null"
   * if no authentication is in progress
   * @readonly
   */
  public get authentication_user(): string | null {
    return LightDMGreeter.getAuthenticationUser() || null;
  }

  /**
   * Whether or not the guest account should be automatically logged
   * into when the timer expires.
   * @readonly
   */
  public get autologin_guest(): boolean {
    return LightDMGreeter.getAutologinGuestHint();
  }

  /**
   * The number of seconds to wait before automatically logging in.
   * @readonly
   */
  public get autologin_timeout(): number {
    return LightDMGreeter.getAutologinTimeoutHint();
  }

  /**
   * The username with which to automattically log in when the timer expires.
   * @readonly
   */
  public get autologin_user(): string {
    return LightDMGreeter.getAutologinUserHint();
  }

  /**
   * Gets the battery data.
   * @readonly
   * @deprecated Use `battery_data`
   */
  public get batteryData(): LightDMBattery | null {
    return batteryToObject(this._batteryController);
  }

  /**
   * Gets the battery data.
   * @readonly
   */
  public get battery_data(): LightDMBattery | null {
    return batteryToObject(this._batteryController);
  }

  /**
   * Gets the brightness
   */
  public get brightness(): number {
    return brightnessController.getBrightness();
  }
  /**
   * Sets the brightness
   * @param {number} quantity The quantity to set
   */
  public set brightness(quantity: number) {
    brightnessController.setBrightness(quantity);
  }

  /**
   * Whether or not the greeter can access to battery data.
   * @readonly
   */
  public get can_access_battery(): boolean {
    return this._config.features.battery;
  }

  /**
   * Whether or not the greeter can control display brightness.
   * @readonly
   */
  public get can_access_brightness(): boolean {
    return this._config.features.backlight.enabled;
  }

  /**
   * Whether or not the greeter can make the system hibernate.
   * @readonly
   */
  public get can_hibernate(): boolean {
    return LightDM.getCanHibernate();
  }

  /**
   * Whether or not the greeter can make the system restart.
   * @readonly
   */
  public get can_restart(): boolean {
    return LightDM.getCanRestart();
  }

  /**
   * Whether or not the greeter can make the system shutdown.
   * @readonly
   */
  public get can_shutdown(): boolean {
    return LightDM.getCanShutdown();
  }

  /**
   * Whether or not the greeter can make the system suspend/sleep.
   * @readonly
   */
  public get can_suspend(): boolean {
    return LightDM.getCanSuspend();
  }

  /**
   * The name of the default session.
   * @readonly
   */
  public get default_session(): string {
    return LightDMGreeter.getDefaultSessionHint();
  }

  /**
   * Whether or not guest sessions are supported.
   * @readonly
   */
  public get has_guest_account(): boolean {
    return LightDMGreeter.getHasGuestAccountHint();
  }

  /**
   * Whether or not user accounts should be hidden.
   * @readonly
   */
  public get hide_users_hint(): boolean {
    return LightDMGreeter.getHideUsersHint();
  }

  /**
   * The system's hostname.
   * @readonly
   */
  public get hostname(): string {
    return LightDM.getHostname();
  }

  /**
   * Whether or not the greeter is in the process of authenticating.
   * @readonly
   */
  public get in_authentication(): boolean {
    return LightDMGreeter.getInAuthentication();
  }

  /**
   * Whether or not the greeter has successfully authenticated.
   * @readonly
   */
  public get is_authenticated(): boolean {
    return LightDMGreeter.getIsAuthenticated();
  }

  /**
   * The current language or "null" if no language.
   * @readonly
   */
  public get language(): LightDMLanguage | null {
    return languageToObject(LightDM.getLanguage());
  }

  /**
   * A list of languages to present to the user.
   * @readonly
   */
  public get languages(): LightDMLanguage[] {
    return reduceArray(LightDM.getLanguages(), languageToObject).filter(
      isDefined
    );
  }

  /**
   * The currently active layout for the selected user.
   */
  public get layout(): LightDMLayout | null {
    return layoutToObject(LightDM.getLayout());
  }

  public set layout(layout: LightDMLayout | null) {
    if (layout) {
      LightDM.getLayout();
      LightDM.setLayout(
        new LightDM.Layout({
          name: layout.name,
          description: layout.description,
          shortDescription: layout.short_description,
        })
      );
    }
  }

  /**
   * A list of keyboard layouts to present to the user.
   * @readonly
   */
  public get layouts(): LightDMLayout[] {
    return reduceArray(LightDM.getLayouts(), layoutToObject).filter(isDefined);
  }

  /**
   * Whether or not the greeter was started as a lock screen.
   * @readonly
   */
  public get lock_hint(): boolean {
    return LightDMGreeter.getLockHint();
  }

  /**
   * A list of remote sessions.
   * @readonly
   */
  public get remote_sessions(): LightDMSession[] {
    return reduceArray(LightDM.getRemoteSessions(), sessionToObject).filter(
      isDefined
    );
  }

  /**
   * Whether or not the guest account should be selected by default.
   * @readonly
   */
  public get select_guest_hint(): boolean {
    return LightDMGreeter.getSelectGuestHint();
  }

  /**
   * The username to select by default.
   * @readonly
   */
  public get select_user_hint(): string {
    return LightDMGreeter.getSelectUserHint();
  }

  /**
   * List of available sessions.
   * @readonly
   */
  public get sessions(): LightDMSession[] {
    return reduceArray(LightDM.getSessions(), sessionToObject).filter(
      isDefined
    );
  }

  /**
   * LightDM shared data directory
   * @readonly
   */
  public get shared_data_directory(): string {
    return this._sharedDataDirectory;
  }

  /**
   * Check if a manual login option should be shown. If "true", the theme should
   * provide a way for a username to be entered manually. Otherwise, themes that show
   * a user list may limit logins to only those users.
   * @readonly
   */
  public get show_manual_login_hint(): boolean {
    return LightDMGreeter.getShowManualLoginHint();
  }

  /**
   * Check if a remote login option should be shown. If "true", the theme should provide
   * a way for a user to log into a remote desktop server.
   * @readonly
   * @internal
   */
  public get show_remote_login_hint(): boolean {
    return LightDMGreeter.getShowRemoteLoginHint();
  }

  /**
   * List of available users.
   * @readonly
   */
  public get users(): LightDMUser[] {
    return reduceArray(LightDMUsers.getUsers(), userToObject).filter(isDefined);
  }

  /**
   * Starts the authentication procedure for a user.
   * @param {string|null} username A username or "null" to prompt for a username.
   */
  public authenticate(username: string | null): boolean {
    return LightDMGreeter.authenticate(username);
  }

  /**
   * Starts the authentication procedure for the guest user.
   */
  public authenticate_as_guest(): boolean {
    return LightDMGreeter.authenticateAsGuest();
  }

  /**
   * Set the brightness to quantity
   * @param {number} quantity The quantity to set
   * @deprecated Use `brightness_set`
   */
  public brightnessSet(quantity: number): void {
    return brightnessController.setBrightness(quantity);
  }
  /**
   * Set the brightness to quantity
   * @param {number} quantity The quantity to set
   */
  public brightness_set(quantity: number): void {
    return brightnessController.setBrightness(quantity);
  }

  /**
   * Increase the brightness by quantity
   * @param {number} quantity The quantity to increase
   * @deprecated Use `brightness_increase`
   */
  public brightnessIncrease(quantity: number): void {
    return brightnessController.incBrightness(quantity);
  }
  /**
   * Increase the brightness by quantity
   * @param {number} quantity The quantity to increase
   */
  public brightness_increase(quantity: number): void {
    return brightnessController.incBrightness(quantity);
  }

  /**
   * Decrease the brightness by quantity
   * @param {number} quantity The quantity to decrease
   * @deprecated Use `brightness_decrease`
   */
  public brightnessDecrease(quantity: number): void {
    return brightnessController.decBrightness(quantity);
  }
  /**
   * Decrease the brightness by quantity
   * @param {number} quantity The quantity to decrease
   */
  public brightness_decrease(quantity: number): void {
    return brightnessController.decBrightness(quantity);
  }

  /**
   * Cancel user authentication that is currently in progress.
   */
  public cancel_authentication(): boolean {
    return LightDMGreeter.cancelAuthentication();
  }

  /**
   * Cancel the automatic login.
   */
  public cancel_autologin(): boolean {
    return LightDMGreeter.cancelAutologin();
  }

  /**
   * Triggers the system to hibernate.
   * @returns {boolean} "true" if hibernation initiated, otherwise "false"
   */
  public hibernate(): boolean {
    return LightDM.hibernate();
  }

  /**
   * Provide a response to a prompt.
   * @param {string} response
   */
  public respond(response: string): boolean {
    return LightDMGreeter.respond(response);
  }

  /**
   * Triggers the system to restart.
   * @returns {boolean} "true" if restart initiated, otherwise "false"
   */
  public restart(): boolean {
    return LightDM.restart();
  }

  /**
   * Set the language for the currently authenticated user.
   * @param {string} language The language in the form of a locale specification (e.g.
   *     'de_DE.UTF-8')
   * @returns {boolean} "true" if successful, otherwise "false"
   */
  public set_language(language: string): boolean {
    if (this.is_authenticated) {
      return LightDMGreeter.setLanguage(language);
    }
    return false;
  }

  /**
   * Triggers the system to shutdown.
   * @returns {boolean} "true" if shutdown initiated, otherwise "false"
   */
  public shutdown(): boolean {
    return LightDM.shutdown();
  }

  /**
   * Start a session for the authenticated user.
   * @param {string|null} session The session to log into or "null" to use the default.
   * @returns {boolean} "true" if successful, otherwise "false"
   */
  public start_session(session: string | null): boolean {
    try {
      const started = LightDMGreeter.startSessionSync(session);
      if (started || this.is_authenticated) resetScreensaver();
      return started;
    } catch (exception) {
      const err = exception as NodeJS.ErrnoException;
      logger.error(err.stack ?? "");
      generalErrorPrompt(
        browser.primaryWindow,
        "LightDM couldn't start session",
        `The provided session: "${session}" couldn't be started\n${err.message}`,
        "An error ocurred"
      );
      return false;
    }
  }

  /**
   * Triggers the system to suspend/sleep.
   * @returns {boolean} "true" if suspend/sleep initiated, otherwise "false"
   */
  public suspend(): boolean {
    return LightDM.suspend();
  }
}

function getLayouts(configLayouts: string[]): LightDMLayout[] {
  const layouts = LightDM.getLayouts();
  const final: LightDMLayout[] = [];
  for (const ldmLay of layouts) {
    for (let confLay of configLayouts) {
      confLay = confLay.replace(/\s/g, "\t");
      if (ldmLay.getName() == confLay) {
        const layChips = layoutToObject(ldmLay);
        if (!layChips) continue;
        final.push(layChips);
      }
    }
  }
  return final;
}

export class GreeterConfig {
  public _config: WebGreeterConfig;
  public static _instance: GreeterConfig;

  private constructor(config: WebGreeterConfig) {
    this._config = config;
  }

  public static getInstance(config: WebGreeterConfig): GreeterConfig {
    return this._instance || (this._instance = new this(config));
  }

  /**
   * Holds keys/values from the `branding` section of the config file.
   *
   * @type {object} branding
   * @property {string} background_images_dir Path to directory that contains background images
   *                                      for use in greeter themes.
   * @property {string} logo                  Path to distro logo image for use in greeter themes.
   * @property {string} user_image            Default user image/avatar. This is used by greeter themes
   *                                      for users that have not configured a `.face` image.
   * @readonly
   */
  public get branding(): WebGreeterConfig["branding"] {
    return this._config.branding;
  }

  /**
   * Holds keys/values from the `greeter` section of the config file.
   *
   * @type {object}  greeter
   * @property {boolean} debug_mode          Greeter theme debug mode.
   * @property {boolean} detect_theme_errors Provide an option to load a fallback theme when theme errors are detected.
   * @property {number}  screensaver_timeout Blank the screen after this many seconds of inactivity.
   * @property {boolean} secure_mode         Don't allow themes to make remote http requests.
   * @property {string}  time_language       Language to use when displaying the time or "" to use the system's language.
   * @property {string}  theme               The name of the theme to be used by the greeter.
   * @readonly
   */
  public get greeter(): WebGreeterConfig["greeter"] {
    return this._config.greeter;
  }

  /**
   * Holds keys/values from the `features` section of the config file.
   *
   * @type {object}      features
   * @property {boolean} battery    Enable greeter and themes to ger battery status.
   * @property {object}  backlight
   * @property {boolean} enabled    Enable greeter and themes to control display backlight.
   * @property {number}  value      The amount to increase/decrease brightness by greeter.
   * @property {number}  steps      How many steps are needed to do the change.
   */
  public get features(): WebGreeterConfig["features"] {
    return this._config.features;
  }

  /*
   * Holds a list of preferred layouts from the `layouts` section of the config file.
   * @type {Array}      layouts
   * @readonly
   */
  public get layouts(): LightDMLayout[] {
    return getLayouts(this._config.layouts);
  }
}

export class ThemeUtils {
  public _config: WebGreeterConfig;
  public _allowedDirs: string[];
  public static _instance: ThemeUtils;

  private constructor(config: WebGreeterConfig) {
    this._config = config;

    this._allowedDirs = [
      globalNodyConfig.app.themeDir,
      globalNodyConfig.config.branding.background_images_dir,
      global.lightdmGreeter.shared_data_directory,
      path.dirname(fs.realpathSync(globalNodyConfig.config.greeter.theme)),
      os.tmpdir(),
    ];
  }

  public static getInstance(config: WebGreeterConfig): ThemeUtils {
    return this._instance || (this._instance = new this(config));
  }

  /**
   * Returns the contents of directory found at `path` provided that the (normalized) `path`
   * meets at least one of the following conditions:
   *   * Is located within the greeter themes' root directory.
   *   * Has been explicitly allowed in the greeter's config file.
   *   * Is located within the greeter's shared data directory (`/var/lib/lightdm-data`).
   *   * Is located in `/tmp`.
   *
   * @param dirPath The abs path to the desired directory.
   * @param onlyImages Include only images in the results. Default `true`.
   */
  public dirlist(dirPath: string, onlyImages = true): string[] {
    if (!dirPath || typeof dirPath !== "string" || dirPath === "/") {
      return [];
    }
    if (dirPath.startsWith("./")) {
      dirPath = path.join(path.dirname(this._config.greeter.theme), dirPath);
    }

    try {
      dirPath = fs.realpathSync(path.normalize(dirPath));
    } catch (e) {
      return [];
    }

    if (!path.isAbsolute(dirPath) || !fs.lstatSync(dirPath).isDirectory()) {
      return [];
    }

    let allowed = false;

    for (let i = 0; i < this._allowedDirs.length; i++) {
      if (dirPath.startsWith(this._allowedDirs[i])) {
        allowed = true;
        break;
      }
    }

    if (!allowed) {
      logger.error(`Path "${dirPath}" is not allowed`);
      return [];
    }

    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    let result = [];

    if (onlyImages) {
      result = files.reduce((cb: string[], v) => {
        // This only returns files inside path, not recursively
        if (v.isFile() && v.name.match(/.+\.(jpe?g|png|gif|bmp|webp)/)) {
          cb.push(path.join(dirPath, v.name));
        }
        return cb;
      }, []);
    } else {
      result = files.reduce((cb: string[], v) => {
        cb.push(path.join(dirPath, v.name));
        return cb;
      }, []);
    }
    //console.log(dir_path, result);
    return result;
  }
}

function reduceArray<I, O>(arr: I[], func: (arg: I) => O): O[] {
  if (!Array.isArray(arr)) return [];
  return arr.reduce((acc: O[], val) => {
    const v = func(val);
    acc.push(v);
    return acc;
  }, []);
}

function isDefined<T>(val: T | null | undefined): val is T {
  return val !== null && val !== undefined;
}

function hasKey<T extends object>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

function handler(
  accesor: Greeter | GreeterConfig | ThemeUtils,
  ...args: string[]
): unknown {
  if (args.length == 0) {
    return undefined;
  }
  const descriptors = Object.getOwnPropertyDescriptors(
    Object.getPrototypeOf(accesor)
  );
  const param = args[0];
  args.shift();
  if (!hasKey(accesor, param)) {
    return undefined;
  }
  const pr: unknown = accesor[param];
  const ac = descriptors[param];

  let value = undefined;

  if (typeof pr === "function") {
    const func: (...v: unknown[]) => unknown = pr.bind(accesor);
    value = func(...args);
  } else {
    if (args.length > 0 && ac && ac.set) {
      ac.set(args[0]);
    } else {
      value = pr || undefined;
    }
  }
  //console.log({
  //accesor: accesor.constructor.name,
  //result: value,
  //args,
  //param,
  //});
  return value;
}

ipcMain.on("greeter_config", (ev, ...args) => {
  if (args.length == 0) return (ev.returnValue = undefined);
  if (!hasKey(global.greeterConfigGreeter, args[0]))
    return (ev.returnValue = undefined);
  const pr = global.greeterConfigGreeter[args[0]];
  ev.returnValue = pr || undefined;
});

ipcMain.on("theme_utils", (ev, ...args) => {
  const value = handler(global.themeUtilsGreeter, ...args);
  ev.returnValue = value;
});

ipcMain.handle("theme_utils", (_ev, ...args) => {
  return handler(global.themeUtilsGreeter, ...args);
});

ipcMain.on("lightdm", (ev, ...args) => {
  const value = handler(global.lightdmGreeter, ...args);
  ev.returnValue = value;
});

ipcMain.on(CONSTS.channel.window_metadata, (ev) => {
  /**
   * A request on this channel simply means that a browser window is ready to
   * receive metadata (i.e. on initial load or a refresh)
   */
  for (const window of browser.windows) {
    if (window.window.webContents === ev.sender) {
      window.window.webContents.send(
        CONSTS.channel.window_metadata,
        window.meta
      );
    }
  }
});

ipcMain.on(CONSTS.channel.window_broadcast, (ev, data: unknown) => {
  const sendingWindow = browser.windows.find(
    (w) => w.window.webContents === ev.sender
  );
  if (!sendingWindow) {
    throw new Error(`Unable to find window for event ${ev}`);
  }
  for (const window of browser.windows) {
    window.window.webContents.send(
      CONSTS.channel.window_broadcast,
      sendingWindow.meta,
      data
    );
  }
});

browser.whenReady().then(() => {
  global.lightdmGreeter = Greeter.getInstance(globalNodyConfig.config);
  global.greeterConfigGreeter = GreeterConfig.getInstance(
    globalNodyConfig.config
  );
  global.themeUtilsGreeter = ThemeUtils.getInstance(globalNodyConfig.config);
});
