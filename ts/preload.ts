import { ipcRenderer } from "electron";
import { CONSTS } from "./consts";
import {
  LightDMBattery,
  LightDMLanguage,
  LightDMLayout,
  LightDMSession,
  LightDMUser,
} from "./ldm_interfaces";

const allSignals = [];

export class Signal {
  private _name: string;
  private _callbacks: ((...args: unknown[]) => void)[];

  constructor(name: string) {
    this._name = name;
    this._callbacks = [];
    allSignals.push(this);
  }

  /**
   * Connects a callback to the signal.
   * @param {() => void} callback The callback to attach.
   */
  public connect(callback: (...args: unknown[]) => void): void {
    if (typeof callback !== "function") return;
    this._callbacks.push(callback);
  }
  /**
   * Disconnects a callback to the signal.
   * @param {() => void} callback The callback to disattach.
   */
  public disconnect(callback: () => void): void {
    const ind = this._callbacks.findIndex((cb) => {
      return cb === callback;
    });
    if (ind == -1) return;
    this._callbacks.splice(ind, 1);
  }

  _emit(...args: unknown[]): void {
    this._callbacks.forEach((cb) => {
      if (typeof cb !== "function") return;
      cb(...args);
    });
  }
}

export class MessageSignal extends Signal {
  public connect(callback: (message: string, type: number) => void): void {
    super.connect(callback);
  }
}
export class PromptSignal extends Signal {
  public connect(callback: (message: string, type: number) => void): void {
    super.connect(callback);
  }
}

ipcRenderer.on(CONSTS.channel.lightdm_signal, (_ev, signal, ...args) => {
  allSignals.forEach((v) => {
    if (v._name == signal) {
      //console.log(args)
      v._emit(...args);
    }
  });
});

export class Greeter {
  constructor() {
    if ("lightdm" in globalThis) {
      return globalThis.lightdm;
    }

    globalThis.lightdm = this;

    return globalThis.lightdm;
  }

  authentication_complete = new Signal("authentication-complete");

  autologin_timer_expired = new Signal("autologin_timer-expired");

  idle = new Signal("idle");

  reset = new Signal("reset");

  show_message = new MessageSignal("show-message");

  show_prompt = new PromptSignal("show-prompt");

  brightness_update = new Signal("brightness_update");

  battery_update = new Signal("battery_update");

  /**
   * The username of the user being authenticated or "null"
   * if no authentication is in progress
   * @type {string|Null}
   * @readonly
   */
  get authentication_user(): string | null {
    return ipcRenderer.sendSync("lightdm", "authentication_user");
  }

  /**
   * Whether or not the guest account should be automatically logged
   * into when the timer expires.
   * @type {boolean}
   * @readonly
   */
  get autologin_guest(): boolean {
    return ipcRenderer.sendSync("lightdm", "autologin_guest");
  }

  /**
   * The number of seconds to wait before automatically logging in.
   * @type {number}
   * @readonly
   */
  get autologin_timeout(): number {
    return ipcRenderer.sendSync("lightdm", "autologin_timeout");
  }

  /**
   * The username with which to automattically log in when the timer expires.
   * @type {string}
   * @readonly
   */
  get autologin_user(): string {
    return ipcRenderer.sendSync("lightdm", "autologin_user");
  }

  /**
   * Gets the battery data.
   * @type {LightDMBattery}
   * @readonly
   */
  get batteryData(): LightDMBattery {
    return ipcRenderer.sendSync("lightdm", "batteryData");
  }

  /**
   * Gets the brightness
   */
  get brightness(): number {
    return ipcRenderer.sendSync("lightdm", "brightness");
  }
  /**
   * Sets the brightness
   * @param {number} quantity The quantity to set
   */
  set brightness(quantity: number) {
    ipcRenderer.sendSync("lightdm", "brightness", quantity);
  }

  /**
   * Whether or not the greeter can access to battery data.
   * @type {boolean}
   * @readonly
   */
  get can_access_battery(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_access_battery");
  }

  /**
   * Whether or not the greeter can control display brightness.
   * @type {boolean}
   * @readonly
   */
  get can_access_brightness(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_access_brightness");
  }

  /**
   * Whether or not the greeter can make the system hibernate.
   * @type {boolean}
   * @readonly
   */
  get can_hibernate(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_hibernate");
  }

  /**
   * Whether or not the greeter can make the system restart.
   * @type {boolean}
   * @readonly
   */
  get can_restart(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_restart");
  }

  /**
   * Whether or not the greeter can make the system shutdown.
   * @type {boolean}
   * @readonly
   */
  get can_shutdown(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_shutdown");
  }

  /**
   * Whether or not the greeter can make the system suspend/sleep.
   * @type {boolean}
   * @readonly
   */
  get can_suspend(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_suspend");
  }

  /**
   * The name of the default session.
   * @type {string}
   * @readonly
   */
  get default_session(): string {
    return ipcRenderer.sendSync("lightdm", "default_session");
  }

  /**
   * Whether or not guest sessions are supported.
   * @type {boolean}
   * @readonly
   */
  get has_guest_account(): boolean {
    return ipcRenderer.sendSync("lightdm", "has_guest_account");
  }

  /**
   * Whether or not user accounts should be hidden.
   * @type {boolean}
   * @readonly
   */
  get hide_users_hint(): boolean {
    return ipcRenderer.sendSync("lightdm", "hide_users_hint");
  }

  /**
   * The system's hostname.
   * @type {string}
   * @readonly
   */
  get hostname(): string {
    return ipcRenderer.sendSync("lightdm", "hostname");
  }

  /**
   * Whether or not the greeter is in the process of authenticating.
   * @type {boolean}
   * @readonly
   */
  get in_authentication(): boolean {
    return ipcRenderer.sendSync("lightdm", "in_authentication");
  }

  /**
   * Whether or not the greeter has successfully authenticated.
   * @type {boolean}
   * @readonly
   */
  get is_authenticated(): boolean {
    return ipcRenderer.sendSync("lightdm", "is_authenticated");
  }

  /**
   * The current language or "null" if no language.
   * @type {LightDMLanguage|null}
   * @readonly
   */
  get language(): LightDMLanguage | null {
    return ipcRenderer.sendSync("lightdm", "language");
  }

  /**
   * A list of languages to present to the user.
   * @type {LightDMLanguage[]}
   * @readonly
   */
  get languages(): LightDMLanguage[] {
    return ipcRenderer.sendSync("lightdm", "languages");
  }

  /**
   * The currently active layout for the selected user.
   * @type {LightDMLayout}
   */
  get layout(): LightDMLayout {
    return ipcRenderer.sendSync("lightdm", "layout");
  }

  set layout(layout: LightDMLayout) {
    ipcRenderer.sendSync("lightdm", "layout", layout);
  }

  /**
   * A list of keyboard layouts to present to the user.
   * @type {LightDMLayout[]}
   * @readonly
   */
  get layouts(): LightDMLayout[] {
    return ipcRenderer.sendSync("lightdm", "layouts");
  }

  /**
   * Whether or not the greeter was started as a lock screen.
   * @type {boolean}
   * @readonly
   */
  get lock_hint(): boolean {
    return ipcRenderer.sendSync("lightdm", "lock_hint");
  }

  /**
   * A list of remote sessions.
   * @type {LightDMSession[]}
   * @readonly
   */
  get remote_sessions(): LightDMSession[] {
    return ipcRenderer.sendSync("lightdm", "remote_sessions");
  }

  /**
   * Whether or not the guest account should be selected by default.
   * @type {boolean}
   * @readonly
   */
  get select_guest_hint(): boolean {
    return ipcRenderer.sendSync("lightdm", "select_guest_hint");
  }

  /**
   * The username to select by default.
   * @type {string|undefined}
   * @readonly
   */
  get select_user_hint(): string | undefined {
    return ipcRenderer.sendSync("lightdm", "select_user_hint");
  }

  /**
   * List of available sessions.
   * @type {LightDMSession[]}
   * @readonly
   */
  get sessions(): LightDMSession[] {
    return ipcRenderer.sendSync("lightdm", "sessions");
  }

  /**
   * Check if a manual login option should be shown. If "true", the theme should
   * provide a way for a username to be entered manually. Otherwise, themes that show
   * a user list may limit logins to only those users.
   * @type {boolean}
   * @readonly
   */
  get show_manual_login_hint(): boolean {
    return ipcRenderer.sendSync("lightdm", "show_manual_login_hint");
  }

  /**
   * Check if a remote login option should be shown. If "true", the theme should provide
   * a way for a user to log into a remote desktop server.
   * @type {boolean}
   * @readonly
   * @internal
   */
  get show_remote_login_hint(): boolean {
    return ipcRenderer.sendSync("lightdm", "show_remote_login_hint");
  }

  /**
   * List of available users.
   * @type {LightDMUser[]}
   * @readonly
   */
  get users(): LightDMUser[] {
    return ipcRenderer.sendSync("lightdm", "users");
  }

  /**
   * Starts the authentication procedure for a user.
   *
   * @param {string|null} username A username or "null" to prompt for a username.
   */
  authenticate(username: string | null): boolean {
    return ipcRenderer.sendSync("lightdm", "authenticate", username);
  }

  /**
   * Starts the authentication procedure for the guest user.
   */
  authenticate_as_guest(): boolean {
    return ipcRenderer.sendSync("lightdm", "authenticate_as_guest");
  }

  /**
   * Set the brightness to quantity
   * @param {number} quantity The quantity to set
   */
  brightnessSet(quantity: number): void {
    return ipcRenderer.sendSync("lightdm", "brightnessSet", quantity);
  }

  /**
   * Increase the brightness by quantity
   * @param {number} quantity The quantity to increase
   */
  brightnessIncrease(quantity: number): void {
    return ipcRenderer.sendSync("lightdm", "brightnessIncrease", quantity);
  }

  /**
   * Decrease the brightness by quantity
   * @param {number} quantity The quantity to decrease
   */
  brightnessDecrease(quantity: number): void {
    return ipcRenderer.sendSync("lightdm", "brightnessDecrease", quantity);
  }

  /**
   * Cancel user authentication that is currently in progress.
   */
  cancel_authentication(): boolean {
    return ipcRenderer.sendSync("lightdm", "cancel_authentication");
  }

  /**
   * Cancel the automatic login.
   */
  cancel_autologin(): boolean {
    return ipcRenderer.sendSync("lightdm", "cancel_autologin");
  }

  /**
   * Triggers the system to hibernate.
   * @returns {boolean} "true" if hibernation initiated, otherwise "false"
   */
  hibernate(): boolean {
    return ipcRenderer.sendSync("lightdm", "hibernate");
  }

  /**
   * Provide a response to a prompt.
   * @param {string} response
   */
  respond(response: string): boolean {
    return ipcRenderer.sendSync("lightdm", "respond", response);
  }

  /**
   * Triggers the system to restart.
   * @returns {boolean} "true" if restart initiated, otherwise "false"
   */
  restart(): boolean {
    return ipcRenderer.sendSync("lightdm", "restart");
  }

  /**
   * Set the language for the currently authenticated user.
   * @param {string} language The language in the form of a locale specification (e.g.
   *     'de_DE.UTF-8')
   * @returns {boolean} "true" if successful, otherwise "false"
   */
  set_language(language: string): boolean {
    if (this.is_authenticated) {
      return ipcRenderer.sendSync("lightdm", "set_language", language);
    }
  }

  /**
   * Triggers the system to shutdown.
   * @returns {boolean} "true" if shutdown initiated, otherwise "false"
   */
  shutdown(): boolean {
    return ipcRenderer.sendSync("lightdm", "shutdown");
  }

  /**
   * Start a session for the authenticated user.
   * @param {string|null} session The session to log into or "null" to use the default.
   * @returns {boolean} "true" if successful, otherwise "false"
   */
  start_session(session: string | null): boolean {
    return ipcRenderer.sendSync("lightdm", "start_session", session);
  }

  /**
   * Triggers the system to suspend/sleep.
   * @returns {boolean} "true" if suspend/sleep initiated, otherwise "false"
   */
  suspend(): boolean {
    return ipcRenderer.sendSync("lightdm", "suspend");
  }
}

interface gc_branding {
  /**
   * Path to directory that contains background images
   */
  background_images_dir: string;
  /**
   * Path to distro logo image for use in greeter themes
   */
  logo: string;
  /**
   * Default user image/avatar.
   */
  user_image: string;
}
interface gc_greeter {
  /**
   * Greeter theme debug mode
   */
  debug_mode: boolean;
  /**
   * Provide an option to load a fallback theme when theme errors are detected
   */
  detect_theme_errors: boolean;
  /**
   * Blank the screen after this many seconds of inactivity
   */
  screensaver_timeout: number;
  /**
   * Don't allow themes to make remote http requests
   */
  secure_mode: boolean;
  /**
   * Language to use when displaying the time or "" to use the system's language
   */
  time_language: string;
  /**
   * The name of the theme to be used by the greeter
   */
  theme: string;
}
interface gc_features {
  /**
   * Enable greeter and themes to get battery status
   */
  battery: boolean;
  /**
   * Backlight options
   */
  backlight: {
    /**
     * Enable greeter and themes to control display backlight
     */
    enabled: boolean;
    /**
     * The amount to increase/decrease brightness by greeter
     */
    value: number;
    /**
     * How many steps are needed to do the change
     */
    steps: number;
  };
}

export class GreeterConfig {
  constructor() {
    if ("greeter_config" in globalThis) {
      return globalThis.greeter_config;
    }
    globalThis.greeter_config = this;
  }

  /**
   * Holds keys/values from the `branding` section of the config file.
   *
   * @type {object} branding
   * @property {string} background_images_dir Path to directory that contains background images for use in greeter themes.
   * @property {string} logo Path to distro logo image for use in greeter themes.
   * @property {string} user_image Default user image/avatar. This is used by greeter themes for users that have not configured a `.face` image.
   * @readonly
   */
  get branding(): gc_branding {
    return ipcRenderer.sendSync("greeter_config", "branding");
  }

  /**
   * Holds keys/values from the `greeter` section of the config file.
   *
   * @type {object}  greeter
   * @property {boolean} debug_mode Greeter theme debug mode.
   * @property {boolean} detect_theme_errors Provide an option to load a fallback theme when theme errors are detected.
   * @property {number}  screensaver_timeout Blank the screen after this many seconds of inactivity.
   * @property {boolean} secure_mode Don't allow themes to make remote http requests.
   * @property {string}  time_language Language to use when displaying the time or "" to use the system's language.
   * @property {string}  theme The name of the theme to be used by the greeter.
   * @readonly
   */
  get greeter(): gc_greeter {
    return ipcRenderer.sendSync("greeter_config", "greeter");
  }

  /**
   * Holds keys/values from the `features` section of the config file.
   *
   * @type {Object}      features
   * @property {boolean} battery Enable greeter and themes to get battery status.
   * @property {Object}  backlight
   * @property {boolean} backlight.enabled Enable greeter and themes to control display backlight.
   * @property {number}  backlight.value The amount to increase/decrease brightness by greeter.
   * @property {number}  backlight.steps How many steps are needed to do the change.
   * @readonly
   */
  get features(): gc_features {
    return ipcRenderer.sendSync("greeter_config", "features");
  }

  /*
   * Holds a list of preferred layouts from the `layouts` section of the config file.
   * @type {LightDMLayout[]} layouts
   * @readonly
   */
  get layouts(): LightDMLayout[] {
    return ipcRenderer.sendSync("greeter_config", "layouts");
  }
}

let time_language = null;

export class ThemeUtils {
  constructor() {
    if ("theme_utils" in globalThis) {
      return globalThis.theme_utils;
    }

    globalThis.theme_utils = this;
  }

  /**
   * Binds `this` to class, `context`, for all of the class's methods.
   *
   * @arg {object} context An ES6 class instance with at least one method.
   *
   * @return {object} `context` with `this` bound to it for all of its methods.
   */
  bind_this(context: object): object {
    const excluded_methods = ["constructor"];

    function not_excluded(_method: string, _context: object): boolean {
      const is_excluded =
          excluded_methods.findIndex(
            (excluded_method) => _method === excluded_method
          ) > -1,
        is_method = "function" === typeof _context[_method];

      return is_method && !is_excluded;
    }

    for (let obj = context; obj; obj = Object.getPrototypeOf(obj)) {
      // Stop once we have traveled all the way up the inheritance chain
      if ("Object" === obj.constructor.name) {
        break;
      }

      for (const method of Object.getOwnPropertyNames(obj)) {
        if (not_excluded(method, context)) {
          context[method] = context[method].bind(context);
        }
      }
    }

    return context;
  }

  /**
   * Returns the contents of directory found at `path` provided that the (normalized) `path`
   * meets at least one of the following conditions:
   *   * Is located within the greeter themes' root directory.
   *   * Has been explicitly allowed in the greeter's config file.
   *   * Is located within the greeter's shared data directory (`/var/lib/lightdm-data`).
   *   * Is located in `/tmp`.
   *
   * @param {string}              path        The abs path to desired directory.
   * @param {boolean}             only_images Include only images in the results. Default `true`.
   * @param {function(string[])}  callback    Callback function to be called with the result.
   */
  dirlist(
    path: string,
    only_images = true,
    callback: (args: string[]) => void
  ): void {
    if ("" === path || "string" !== typeof path) {
      console.error(`theme_utils.dirlist(): path must be a non-empty string!`);
      return callback([]);
    }

    if (null !== path.match(/\/\.+(?=\/)/)) {
      // No special directory names allowed (eg ../../)
      path = path.replace(/\/\.+(?=\/)/g, "");
    }

    try {
      ipcRenderer
        .invoke("theme_utils", "dirlist", path, only_images)
        .then((files) => {
          callback(files);
        });
      return;
    } catch (err) {
      console.error(`theme_utils.dirlist(): ${err}`);
      return callback([]);
    }
  }

  /**
   * Returns the contents of directory found at `path` provided that the (normalized) `path`
   * meets at least one of the following conditions:
   *   * Is located within the greeter themes' root directory.
   *   * Has been explicitly allowed in the greeter's config file.
   *   * Is located within the greeter's shared data directory (`/var/lib/lightdm-data`).
   *   * Is located in `/tmp`.
   *
   * @param {string}              path        The abs path to desired directory.
   * @param {boolean}             only_images Include only images in the results. Default `true`.
   * @param {function(string[])}  callback    Callback function to be called with the result.
   * @experimental Available only for nody-greeter. DO NOT use it if you want compatibility between web-greeter and nody-greeter
   */
  dirlist_sync(path: string, only_images = true): string[] {
    if ("" === path || "string" !== typeof path) {
      console.error(`theme_utils.dirlist(): path must be a non-empty string!`);
      return [];
    }
    if (null !== path.match(/\/\.+(?=\/)/)) {
      // No special directory names allowed (eg ../../)
      path = path.replace(/\/\.+(?=\/)/g, "");
    }
    try {
      return ipcRenderer.sendSync("theme_utils", "dirlist", path, only_images);
    } catch (err) {
      console.error(`theme_utils.dirlist(): ${err}`);
      return [];
    }
  }

  /**
   * Get the current date in a localized format. Local language is autodetected by default, but can be set manually in the greeter config file.
   * 	 * `language` defaults to the system's language, but can be set manually in the config file.
   */
  get_current_localized_date(): string {
    const config = globalThis.greeter_config.greeter;

    const locale = [];

    if (time_language === null) {
      time_language = config.time_language || "";
    }

    if (time_language != "") {
      locale.push(time_language);
    }

    const optionsDate: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    };

    const fmtDate = Intl.DateTimeFormat(locale, optionsDate);

    const now = new Date();
    const date = fmtDate.format(now);

    return date;
  }

  /**
   * Get the current time in a localized format. Local language is autodetected by default, but can be set manually in the greeter config file.
   * 	 * `language` defaults to the system's language, but can be set manually in the config file.
   */
  get_current_localized_time(): string {
    const config = globalThis.greeter_config.greeter;

    const locale = [];

    if (time_language === null) {
      time_language = config.time_language || "";
    }

    if (time_language != "") {
      locale.push(time_language);
    }

    const optionsTime: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
    };

    const fmtTime = Intl.DateTimeFormat(locale, optionsTime);

    const now = new Date();
    const time = fmtTime.format(now);

    return time;
  }
}

new ThemeUtils();
new GreeterConfig();
new Greeter();

window._ready_event = new Event("GreeterReady");

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    window.dispatchEvent(globalThis._ready_event);
  }, 2);
});

export declare const lightdm: Greeter;
export declare const greeter_config: GreeterConfig;
export declare const theme_utils: ThemeUtils;
export declare const _ready_event: Event;

declare global {
  interface Window {
    lightdm: Greeter | undefined;
    greeter_config: GreeterConfig | undefined;
    theme_utils: ThemeUtils | undefined;
    _ready_event: Event | undefined;
  }
}
