import { dialog, ipcMain } from "electron";
// @ts-ignore Until there's a @types/node-gtk
import * as gi from "node-gtk";
import * as fs from "fs";
import * as os from "os";
import { nody_greeter, web_greeter_config } from "../config";

const LightDM = gi.require("LightDM", "1");

const LightDMGreeter = new LightDM.Greeter();
const LightDMUsers = new LightDM.UserList();

import {
  user_to_obj,
  language_to_obj,
  layout_to_obj,
  session_to_obj,
  battery_to_obj,
} from "./bridge_objects";
import { browser, general_error_prompt } from "../globals";

import { Brightness } from "../utils/brightness.js";
import { Battery } from "../utils/battery";
import { force_screensaver, reset_screensaver } from "../utils/screensaver.js";
import * as path from "path";
import {
  LightDMBattery,
  LightDMLanguage,
  LightDMLayout,
  LightDMSession,
  LightDMUser,
} from "../ldm_interfaces";
import { logger } from "../logger";
import { CONSTS } from "../consts";

export class Greeter {
  public _config: web_greeter_config;
  public _battery: Battery;
  public _shared_data_directory: string;
  public static _instance: Greeter;

  private constructor(config: web_greeter_config) {
    this._config = config;

    this._battery = new Battery();

    try {
      //LightDMGreeter.setResettable(true);
      LightDMGreeter.connectToDaemonSync();
    } catch (err) {
      logger.error(err);
      browser.whenReady().then(() => {
        dialog.showMessageBoxSync(browser.primary_window, {
          message:
            "Detected a problem that could interfere with the system login process", // Yeah, that problematic message
          detail: `LightDM: ${err}\nYou can continue without major problems, but you won't be able to log in`,
          type: "error",
          title: "An error ocurred",
          buttons: ["Okay"],
        });
      });
    }

    this._connect_signals();

    const user = LightDMUsers.getUsers()[0];
    const user_data_dir = LightDMGreeter.ensureSharedDataDirSync(user.name);
    this._shared_data_directory = user_data_dir.slice(
      0,
      user_data_dir.lastIndexOf("/")
    );

    if (LightDMGreeter.getLockHint()) force_screensaver(true);

    logger.debug("LightDM API connected");
  }

  _connect_signals = (): void => {
    LightDMGreeter.connect("authentication-complete", () => {
      this._emit_signal("authentication-complete");
    });
    LightDMGreeter.connect("autologin-timer-expired", () => {
      this._emit_signal("autologin-timer-expired");
    });
    LightDMGreeter.connect("show-message", (text: string, type: number) => {
      this._emit_signal("show-message", text, type);
    });
    LightDMGreeter.connect("show-prompt", (text: string, type: number) => {
      this._emit_signal("show-prompt", text, type);
    });
    LightDMGreeter.connect("idle", () => {
      this._emit_signal("idle");
    });
    LightDMGreeter.connect("reset", () => {
      this._emit_signal("reset");
    });
  };

  _emit_signal = (signal: string, ...args: unknown[]): void => {
    //console.log("SIGNAL EMITTED", signal, args)
    for (const win of browser.windows) {
      win.window.webContents.send(
        CONSTS.channel.lightdm_signal,
        signal,
        ...args
      );
    }
  };

  public static getInstance(config: web_greeter_config): Greeter {
    return this._instance || (this._instance = new this(config));
  }

  /**
   * The username of the user being authenticated or "null"
   * if no authentication is in progress
   * @readonly
   */
  get authentication_user(): string | null {
    return LightDMGreeter.getAuthenticationUser() || null;
  }

  /**
   * Whether or not the guest account should be automatically logged
   * into when the timer expires.
   * @readonly
   */
  get autologin_guest(): boolean {
    return LightDMGreeter.getAutologinGuestHint();
  }

  /**
   * The number of seconds to wait before automatically logging in.
   * @readonly
   */
  get autologin_timeout(): number {
    return LightDMGreeter.getAutologinTimeoutHint();
  }

  /**
   * The username with which to automattically log in when the timer expires.
   * @readonly
   */
  get autologin_user(): string {
    return LightDMGreeter.getAutologinUserHint();
  }

  /**
   * Gets the battery data.
   * @readonly
   * @deprecated Use `battery_data`
   */
  get batteryData(): LightDMBattery | object {
    return battery_to_obj(this._battery);
  }

  /**
   * Gets the battery data.
   * @readonly
   */
  get battery_data(): LightDMBattery | object {
    return battery_to_obj(this._battery);
  }

  /**
   * Gets the brightness
   */
  get brightness(): number {
    return Brightness.get_brightness();
  }
  /**
   * Sets the brightness
   * @param {number} quantity The quantity to set
   */
  set brightness(quantity: number) {
    Brightness.set_brightness(quantity);
  }

  /**
   * Whether or not the greeter can access to battery data.
   * @readonly
   */
  get can_access_battery(): boolean {
    return this._config.features.battery;
  }

  /**
   * Whether or not the greeter can control display brightness.
   * @readonly
   */
  get can_access_brightness(): boolean {
    return this._config.features.backlight.enabled;
  }

  /**
   * Whether or not the greeter can make the system hibernate.
   * @readonly
   */
  get can_hibernate(): boolean {
    return LightDM.getCanHibernate();
  }

  /**
   * Whether or not the greeter can make the system restart.
   * @readonly
   */
  get can_restart(): boolean {
    return LightDM.getCanRestart();
  }

  /**
   * Whether or not the greeter can make the system shutdown.
   * @readonly
   */
  get can_shutdown(): boolean {
    return LightDM.getCanShutdown();
  }

  /**
   * Whether or not the greeter can make the system suspend/sleep.
   * @readonly
   */
  get can_suspend(): boolean {
    return LightDM.getCanSuspend();
  }

  /**
   * The name of the default session.
   * @readonly
   */
  get default_session(): string {
    return LightDMGreeter.getDefaultSessionHint();
  }

  /**
   * Whether or not guest sessions are supported.
   * @readonly
   */
  get has_guest_account(): boolean {
    return LightDMGreeter.getHasGuestAccountHint();
  }

  /**
   * Whether or not user accounts should be hidden.
   * @readonly
   */
  get hide_users_hint(): boolean {
    return LightDMGreeter.getHideUsersHint();
  }

  /**
   * The system's hostname.
   * @readonly
   */
  get hostname(): string {
    return LightDM.getHostname();
  }

  /**
   * Whether or not the greeter is in the process of authenticating.
   * @readonly
   */
  get in_authentication(): boolean {
    return LightDMGreeter.getInAuthentication();
  }

  /**
   * Whether or not the greeter has successfully authenticated.
   * @readonly
   */
  get is_authenticated(): boolean {
    return LightDMGreeter.getIsAuthenticated();
  }

  /**
   * The current language or "null" if no language.
   * @readonly
   */
  get language(): LightDMLanguage | object {
    return language_to_obj(LightDM.getLanguage());
  }

  /**
   * A list of languages to present to the user.
   * @readonly
   */
  get languages(): LightDMLanguage[] {
    return reduceArray(
      LightDM.getLanguages(),
      language_to_obj
    ) as LightDMLanguage[];
  }

  /**
   * The currently active layout for the selected user.
   */
  get layout(): LightDMLayout | object {
    return layout_to_obj(LightDM.getLayout());
  }

  set layout(layout: LightDMLayout | object) {
    LightDM.getLayout();
    LightDM.setLayout(new LightDM.Layout(layout));
  }

  /**
   * A list of keyboard layouts to present to the user.
   * @readonly
   */
  get layouts(): LightDMLayout[] {
    return reduceArray(LightDM.getLayouts(), layout_to_obj) as LightDMLayout[];
  }

  /**
   * Whether or not the greeter was started as a lock screen.
   * @readonly
   */
  get lock_hint(): boolean {
    return LightDMGreeter.getLockHint();
  }

  /**
   * A list of remote sessions.
   * @readonly
   */
  get remote_sessions(): LightDMSession[] {
    return reduceArray(
      LightDM.getRemoteSessions(),
      session_to_obj
    ) as LightDMSession[];
  }

  /**
   * Whether or not the guest account should be selected by default.
   * @readonly
   */
  get select_guest_hint(): boolean {
    return LightDMGreeter.getSelectGuestHint();
  }

  /**
   * The username to select by default.
   * @readonly
   */
  get select_user_hint(): string {
    return LightDMGreeter.getSelectUserHint();
  }

  /**
   * List of available sessions.
   * @readonly
   */
  get sessions(): LightDMSession[] {
    return reduceArray(
      LightDM.getSessions(),
      session_to_obj
    ) as LightDMSession[];
  }

  /**
   * LightDM shared data directory
   * @readonly
   */
  get shared_data_directory(): string {
    return this._shared_data_directory;
  }

  /**
   * Check if a manual login option should be shown. If "true", the theme should
   * provide a way for a username to be entered manually. Otherwise, themes that show
   * a user list may limit logins to only those users.
   * @readonly
   */
  get show_manual_login_hint(): boolean {
    return LightDMGreeter.getShowManualLoginHint();
  }

  /**
   * Check if a remote login option should be shown. If "true", the theme should provide
   * a way for a user to log into a remote desktop server.
   * @readonly
   * @internal
   */
  get show_remote_login_hint(): boolean {
    return LightDMGreeter.getShowRemoteLoginHint();
  }

  /**
   * List of available users.
   * @readonly
   */
  get users(): LightDMUser[] {
    return reduceArray(LightDMUsers.getUsers(), user_to_obj) as LightDMUser[];
  }

  /**
   * Starts the authentication procedure for a user.
   * @param {string|null} username A username or "null" to prompt for a username.
   */
  authenticate = (username: string | null): boolean => {
    return LightDMGreeter.authenticate(username);
  };

  /**
   * Starts the authentication procedure for the guest user.
   */
  authenticate_as_guest = (): boolean => {
    return LightDMGreeter.authenticateAsGuest();
  };

  /**
   * Set the brightness to quantity
   * @param {number} quantity The quantity to set
   * @deprecated Use `brightness_set`
   */
  brightnessSet = (quantity: number): void => {
    return Brightness.set_brightness(quantity);
  };
  /**
   * Set the brightness to quantity
   * @param {number} quantity The quantity to set
   */
  brightness_set = (quantity: number): void => {
    return Brightness.set_brightness(quantity);
  };

  /**
   * Increase the brightness by quantity
   * @param {number} quantity The quantity to increase
   * @deprecated Use `brightness_increase`
   */
  brightnessIncrease = (quantity: number): void => {
    return Brightness.inc_brightness(quantity);
  };
  /**
   * Increase the brightness by quantity
   * @param {number} quantity The quantity to increase
   */
  brightness_increase = (quantity: number): void => {
    return Brightness.inc_brightness(quantity);
  };

  /**
   * Decrease the brightness by quantity
   * @param {number} quantity The quantity to decrease
   * @deprecated Use `brightness_decrease`
   */
  brightnessDecrease = (quantity: number): void => {
    return Brightness.dec_brightness(quantity);
  };
  /**
   * Decrease the brightness by quantity
   * @param {number} quantity The quantity to decrease
   */
  brightness_decrease = (quantity: number): void => {
    return Brightness.dec_brightness(quantity);
  };

  /**
   * Cancel user authentication that is currently in progress.
   */
  cancel_authentication = (): boolean => {
    return LightDMGreeter.cancelAuthentication();
  };

  /**
   * Cancel the automatic login.
   */
  cancel_autologin = (): boolean => {
    return LightDMGreeter.cancelAutologin();
  };

  /**
   * Triggers the system to hibernate.
   * @returns {boolean} "true" if hibernation initiated, otherwise "false"
   */
  hibernate = (): boolean => {
    return LightDM.hibernate();
  };

  /**
   * Provide a response to a prompt.
   * @param {string} response
   */
  respond = (response: string): boolean => {
    return LightDMGreeter.respond(response);
  };

  /**
   * Triggers the system to restart.
   * @returns {boolean} "true" if restart initiated, otherwise "false"
   */
  restart = (): boolean => {
    return LightDM.restart();
  };

  /**
   * Set the language for the currently authenticated user.
   * @param {string} language The language in the form of a locale specification (e.g.
   *     'de_DE.UTF-8')
   * @returns {boolean} "true" if successful, otherwise "false"
   */
  set_language = (language: string): boolean => {
    if (this.is_authenticated) {
      return LightDMGreeter.setLanguage(language);
    }
    return false;
  };

  /**
   * Triggers the system to shutdown.
   * @returns {boolean} "true" if shutdown initiated, otherwise "false"
   */
  shutdown = (): boolean => {
    return LightDM.shutdown();
  };

  /**
   * Start a session for the authenticated user.
   * @param {string|null} session The session to log into or "null" to use the default.
   * @returns {boolean} "true" if successful, otherwise "false"
   */
  start_session = (session: string | null): boolean => {
    try {
      const started = LightDMGreeter.startSessionSync(session);
      if (started || this.is_authenticated) reset_screensaver();
      return started;
    } catch (err) {
      logger.error(err);
      general_error_prompt(
        browser.primary_window,
        "LightDM couldn't start session",
        `The provided session: "${session}" couldn't be started\n${err.message}`,
        "An error ocurred"
      );
      return false;
    }
  };

  /**
   * Triggers the system to suspend/sleep.
   * @returns {boolean} "true" if suspend/sleep initiated, otherwise "false"
   */
  suspend = (): boolean => {
    return LightDM.suspend();
  };
}

function get_layouts(config_layouts: string[]): LightDMLayout[] {
  const layouts = LightDM.getLayouts();
  const final: LightDMLayout[] = [];
  for (const ldm_lay of layouts) {
    for (let conf_lay of config_layouts) {
      conf_lay = conf_lay.replace(/\s/g, "\t");
      if (ldm_lay.getName() == conf_lay) {
        const lays_chips = layout_to_obj(ldm_lay) as LightDMLayout;
        if (Object.keys(lays_chips).length == 0) continue;
        final.push(lays_chips);
      }
    }
  }
  return final;
}

export class GreeterConfig {
  public _config: web_greeter_config;
  public static _instance: GreeterConfig;

  private constructor(config: web_greeter_config) {
    this._config = config;
  }

  public static getInstance(config: web_greeter_config): GreeterConfig {
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
  get branding(): web_greeter_config["branding"] {
    return this._config.branding;
  }

  /**
   * Holds keys/values from the `greeter` section of the config file.
   *
   * @type {object}  greeter
   * @property {boolean} debug_mode          Greeter theme debug mode.
   * @property {boolean} detect_theme_errors Provide an option to load a fallback theme when theme
   *                                     errors are detected.
   * @property {number}  screensaver_timeout Blank the screen after this many seconds of inactivity.
   * @property {boolean} secure_mode         Don't allow themes to make remote http requests.
   *                                     generate localized time for display.
   * @property {string}  time_language       Language to use when displaying the time or ""
   *                                     to use the system's language.
   * @property {string}  theme               The name of the theme to be used by the greeter.
   * @readonly
   */
  get greeter(): web_greeter_config["greeter"] {
    return this._config.greeter;
  }

  /**
   * Holds keys/values from the `features` section of the config file.
   *
   * @type {Object}      features
   * @property {Boolean} battery				 Enable greeter and themes to ger battery status.
   * @property {Object}  backlight
   * @property {Boolean} enabled				 Enable greeter and themes to control display backlight.
   * @property {Number}  value					 The amount to increase/decrease brightness by greeter.
   * @property {Number}  steps					 How many steps are needed to do the change.
   */
  get features(): web_greeter_config["features"] {
    return this._config.features;
  }

  /*
   * Holds a list of preferred layouts from the `layouts` section of the config file.
   * @type {Array}			layouts
   * @readonly
   */
  get layouts(): LightDMLayout[] {
    return get_layouts(this._config.layouts);
  }
}

export class ThemeUtils {
  public _config: web_greeter_config;
  public _allowed_dirs: string[];
  public static _instance: ThemeUtils;

  private constructor(config: web_greeter_config) {
    this._config = config;

    this._allowed_dirs = [
      nody_greeter.app.theme_dir,
      nody_greeter.config.branding.background_images_dir,
      global.lightdm.shared_data_directory,
      path.dirname(fs.realpathSync(nody_greeter.config.greeter.theme)),
      os.tmpdir(),
    ];
  }

  public static getInstance(config: web_greeter_config): ThemeUtils {
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
   * @param {String}              dir_path        The abs path to desired directory.
   * @param {Boolean}             only_images Include only images in the results. Default `true`.
   * @param {function(String[])}  callback    Callback function to be called with the result.
   */
  dirlist = (dir_path: string, only_images = true): string[] => {
    if (!dir_path || typeof dir_path !== "string" || dir_path === "/") {
      return [];
    }
    if (dir_path.startsWith("./")) {
      dir_path = path.join(path.dirname(this._config.greeter.theme), dir_path);
    }

    dir_path = fs.realpathSync(path.normalize(dir_path));

    if (!path.isAbsolute(dir_path) || !fs.lstatSync(dir_path).isDirectory()) {
      return [];
    }

    let allowed = false;

    for (let i = 0; i < this._allowed_dirs.length; i++) {
      if (dir_path.startsWith(this._allowed_dirs[i])) {
        allowed = true;
        break;
      }
    }

    if (!allowed) {
      logger.error(`Path "${dir_path}" is not allowed`);
      return [];
    }

    const files = fs.readdirSync(dir_path, { withFileTypes: true });
    let result = [];

    if (only_images) {
      result = files.reduce((cb: string[], v) => {
        // This only returns files inside path, not recursively
        if (v.isFile() && v.name.match(/.+\.(jpe?g|png|gif|bmp|webp)/)) {
          cb.push(path.join(dir_path, v.name));
        }
        return cb;
      }, []);
    } else {
      result = files.reduce((cb: string[], v) => {
        cb.push(path.join(dir_path, v.name));
        return cb;
      }, []);
    }
    //console.log(dir_path, result);
    return result;
  };
}

function reduceArray<T>(arr: unknown[], func: (arg: unknown) => T): T[] {
  if (!Array.isArray(arr)) return [];
  return arr.reduce((acc: T[], val) => {
    const v = func(val);
    acc.push(v);
    return acc;
  }, []);
}

function hasKey<T>(obj: T, key: PropertyKey): key is keyof T {
  return key in obj;
}

function handler(
  accesor: Greeter | GreeterConfig | ThemeUtils,
  ev: Electron.IpcMainInvokeEvent,
  ...args: string[]
): unknown {
  if (args.length == 0) return (ev.returnValue = undefined);
  const descriptors = Object.getOwnPropertyDescriptors(
    Object.getPrototypeOf(accesor)
  );
  const param = args[0];
  args.shift();
  if (!hasKey(accesor, param)) return (ev.returnValue = undefined);
  const pr: unknown = accesor[param];
  const ac = descriptors[param];

  let value = undefined;

  if (typeof pr === "function") {
    value = pr(...args);
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
  return (ev.returnValue = value);
}

ipcMain.on("greeter_config", (ev, ...args) => {
  if (args.length == 0) return (ev.returnValue = undefined);
  if (!hasKey(global.greeter_config, args[0]))
    return (ev.returnValue = undefined);
  const pr = global.greeter_config[args[0]];
  ev.returnValue = pr || undefined;
});

ipcMain.on("theme_utils", (ev, ...args) => {
  handler(global.theme_utils, ev, ...args);
});

ipcMain.handle("theme_utils", (ev, ...args) => {
  return handler(global.theme_utils, ev, ...args);
});

ipcMain.on("lightdm", (ev, ...args) => {
  handler(global.lightdm, ev, ...args);
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
  global.lightdm = Greeter.getInstance(nody_greeter.config);
  global.greeter_config = GreeterConfig.getInstance(nody_greeter.config);
  global.theme_utils = ThemeUtils.getInstance(nody_greeter.config);
});
