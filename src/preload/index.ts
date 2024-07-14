import { ipcRenderer } from "electron";
import { CONSTS } from "common/consts";
import {
  LightDMBattery,
  LightDMLanguage,
  LightDMLayout,
  LightDMSession,
  LightDMUser,
} from "common/ldm_interfaces";

/**
 * Metadata that is sent to each window to handle more interesting multi-monitor
 * functionality / themes.
 */
export interface WindowMetadata {
  // TODO: Remove this eslint-disable comment
  /* eslint-disable @typescript-eslint/naming-convention */
  id: number;
  is_primary: boolean;
  position: {
    x: number;
    y: number;
  };
  size: {
    width: number;
    height: number;
  };
  /**
   * The total real-estate across all screens,
   * this can be used to assist in, for example,
   * correctly positioning multi-monitor backgrounds.
   */
  overallBoundary: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

/**
 * An event that is fired and dispatched when one browser window of a theme
 * sends a broadcast to all windows (which happens for multi-monitor setups)
 */
export class GreeterBroadcastEvent extends Event {
  public constructor(
    /** Metadata for the window that originated the request */
    public readonly window: WindowMetadata,
    /** Data sent in the broadcast */
    public readonly data: unknown
  ) {
    super("GreeterBroadcastEvent");
  }
}

/**
 * Provides a cross-window communication system, useful for multi-monitor setups
 */
export class Comm {
  // TODO: Remove this eslint-disable comment
  /* eslint-disable @typescript-eslint/naming-convention */
  private _windowMetadata: WindowMetadata | null = null;
  /**
   * callback that should be called when the metadata is received
   */
  private _ready: (() => void) | null = null;
  private readonly _readyPromise: Promise<void>;

  public constructor() {
    window.greeter_comm = this;

    ipcRenderer.on(CONSTS.channel.window_metadata, (_ev, metadata) => {
      this._windowMetadata = metadata;
      if (this._ready) this._ready();
    });

    // Send initial request for metadata
    ipcRenderer.send(CONSTS.channel.window_metadata);

    ipcRenderer.on(CONSTS.channel.window_broadcast, (_ev, metadata, data) => {
      const event = new GreeterBroadcastEvent(metadata, data);
      window.dispatchEvent(event);
    });

    this._readyPromise = new Promise((resolve) => (this._ready = resolve));

    return window.greeter_comm;
  }

  public get window_metadata(): WindowMetadata {
    if (this._windowMetadata) {
      return this._windowMetadata;
    }
    throw new Error(
      `window_metadata not available, did you wait for the GreeterReady event?`
    );
  }

  /** Resolves when we have received WindowMetadata */
  public whenReady = (): Promise<void> => this._readyPromise;

  /**
   * Send a message to all windows currently open for the greeter.
   *
   * This is primarily for themes that are runing in multi-monitor environments
   */
  public broadcast(data: unknown): void {
    ipcRenderer.send(CONSTS.channel.window_broadcast, data);
  }
}

const allSignals: Signal[] = [];

export class Signal {
  public _name: string;
  public _callbacks: ((...args: unknown[]) => void)[];

  public constructor(name: string) {
    this._name = name;
    this._callbacks = [];
    allSignals.push(this);
  }

  /**
   * Connects a callback to the signal.
   * @param {() => void} callback The callback to attach.
   */
  // @ts-ignore
  // eslint-disable-next-line
  public connect(callback: (...args: any[]) => void): void {
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

  public _emit(...args: unknown[]): void {
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
  public constructor() {
    if ("lightdm" in window && window.lightdm) {
      return window.lightdm;
    }

    window.lightdm = this;

    return window.lightdm;
  }

  public authentication_complete = new Signal("authentication-complete");

  public autologin_timer_expired = new Signal("autologin_timer-expired");

  public idle = new Signal("idle");

  public reset = new Signal("reset");

  public show_message = new MessageSignal("show-message");

  public show_prompt = new PromptSignal("show-prompt");

  public brightness_update = new Signal("brightness_update");

  public battery_update = new Signal("battery_update");

  /**
   * The username of the user being authenticated or "null"
   * if no authentication is in progress
   * @type {string|null}
   * @readonly
   */
  public get authentication_user(): string | null {
    return ipcRenderer.sendSync("lightdm", "authentication_user");
  }

  /**
   * Whether or not the guest account should be automatically logged
   * into when the timer expires.
   * @type {boolean}
   * @readonly
   */
  public get autologin_guest(): boolean {
    return ipcRenderer.sendSync("lightdm", "autologin_guest");
  }

  /**
   * The number of seconds to wait before automatically logging in.
   * @type {number}
   * @readonly
   */
  public get autologin_timeout(): number {
    return ipcRenderer.sendSync("lightdm", "autologin_timeout");
  }

  /**
   * The username with which to automattically log in when the timer expires.
   * @type {string}
   * @readonly
   */
  public get autologin_user(): string {
    return ipcRenderer.sendSync("lightdm", "autologin_user");
  }

  /**
   * Gets the battery data.
   * @type {LightDMBattery}
   * @readonly
   * @deprecated Use `battery_data`
   */
  public get batteryData(): LightDMBattery {
    return ipcRenderer.sendSync("lightdm", "batteryData");
  }

  /**
   * Gets the battery data.
   * @type {LightDMBattery}
   * @readonly
   */
  public get battery_data(): LightDMBattery {
    return ipcRenderer.sendSync("lightdm", "battery_data");
  }

  /**
   * Gets the brightness
   */
  public get brightness(): number {
    return ipcRenderer.sendSync("lightdm", "brightness");
  }
  /**
   * Sets the brightness
   * @param {number} quantity The quantity to set
   */
  public set brightness(quantity: number) {
    ipcRenderer.sendSync("lightdm", "brightness", quantity);
  }

  /**
   * Whether or not the greeter can access to battery data.
   * @type {boolean}
   * @readonly
   */
  public get can_access_battery(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_access_battery");
  }

  /**
   * Whether or not the greeter can control display brightness.
   * @type {boolean}
   * @readonly
   */
  public get can_access_brightness(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_access_brightness");
  }

  /**
   * Whether or not the greeter can make the system hibernate.
   * @type {boolean}
   * @readonly
   */
  public get can_hibernate(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_hibernate");
  }

  /**
   * Whether or not the greeter can make the system restart.
   * @type {boolean}
   * @readonly
   */
  public get can_restart(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_restart");
  }

  /**
   * Whether or not the greeter can make the system shutdown.
   * @type {boolean}
   * @readonly
   */
  public get can_shutdown(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_shutdown");
  }

  /**
   * Whether or not the greeter can make the system suspend/sleep.
   * @type {boolean}
   * @readonly
   */
  public get can_suspend(): boolean {
    return ipcRenderer.sendSync("lightdm", "can_suspend");
  }

  /**
   * The name of the default session.
   * @type {string}
   * @readonly
   */
  public get default_session(): string {
    return ipcRenderer.sendSync("lightdm", "default_session");
  }

  /**
   * Whether or not guest sessions are supported.
   * @type {boolean}
   * @readonly
   */
  public get has_guest_account(): boolean {
    return ipcRenderer.sendSync("lightdm", "has_guest_account");
  }

  /**
   * Whether or not user accounts should be hidden.
   * @type {boolean}
   * @readonly
   */
  public get hide_users_hint(): boolean {
    return ipcRenderer.sendSync("lightdm", "hide_users_hint");
  }

  /**
   * The system's hostname.
   * @type {string}
   * @readonly
   */
  public get hostname(): string {
    return ipcRenderer.sendSync("lightdm", "hostname");
  }

  /**
   * Whether or not the greeter is in the process of authenticating.
   * @type {boolean}
   * @readonly
   */
  public get in_authentication(): boolean {
    return ipcRenderer.sendSync("lightdm", "in_authentication");
  }

  /**
   * Whether or not the greeter has successfully authenticated.
   * @type {boolean}
   * @readonly
   */
  public get is_authenticated(): boolean {
    return ipcRenderer.sendSync("lightdm", "is_authenticated");
  }

  /**
   * The current language or "null" if no language.
   * @type {LightDMLanguage|null}
   * @readonly
   */
  public get language(): LightDMLanguage | null {
    return ipcRenderer.sendSync("lightdm", "language");
  }

  /**
   * A list of languages to present to the user.
   * @type {LightDMLanguage[]}
   * @readonly
   */
  public get languages(): LightDMLanguage[] {
    return ipcRenderer.sendSync("lightdm", "languages");
  }

  /**
   * The currently active layout for the selected user.
   * @type {LightDMLayout}
   */
  public get layout(): LightDMLayout {
    return ipcRenderer.sendSync("lightdm", "layout");
  }

  public set layout(layout: LightDMLayout) {
    ipcRenderer.sendSync("lightdm", "layout", layout);
  }

  /**
   * A list of keyboard layouts to present to the user.
   * @type {LightDMLayout[]}
   * @readonly
   */
  public get layouts(): LightDMLayout[] {
    return ipcRenderer.sendSync("lightdm", "layouts");
  }

  /**
   * Whether or not the greeter was started as a lock screen.
   * @type {boolean}
   * @readonly
   */
  public get lock_hint(): boolean {
    return ipcRenderer.sendSync("lightdm", "lock_hint");
  }

  /**
   * A list of remote sessions.
   * @type {LightDMSession[]}
   * @readonly
   */
  public get remote_sessions(): LightDMSession[] {
    return ipcRenderer.sendSync("lightdm", "remote_sessions");
  }

  /**
   * Whether or not the guest account should be selected by default.
   * @type {boolean}
   * @readonly
   */
  public get select_guest_hint(): boolean {
    return ipcRenderer.sendSync("lightdm", "select_guest_hint");
  }

  /**
   * The username to select by default.
   * @type {string|undefined}
   * @readonly
   */
  public get select_user_hint(): string | undefined {
    return ipcRenderer.sendSync("lightdm", "select_user_hint");
  }

  /**
   * List of available sessions.
   * @type {LightDMSession[]}
   * @readonly
   */
  public get sessions(): LightDMSession[] {
    return ipcRenderer.sendSync("lightdm", "sessions");
  }

  /**
   * Check if a manual login option should be shown. If "true", the theme should
   * provide a way for a username to be entered manually. Otherwise, themes that show
   * a user list may limit logins to only those users.
   * @type {boolean}
   * @readonly
   */
  public get show_manual_login_hint(): boolean {
    return ipcRenderer.sendSync("lightdm", "show_manual_login_hint");
  }

  /**
   * Check if a remote login option should be shown. If "true", the theme should provide
   * a way for a user to log into a remote desktop server.
   * @type {boolean}
   * @readonly
   * @internal
   */
  public get show_remote_login_hint(): boolean {
    return ipcRenderer.sendSync("lightdm", "show_remote_login_hint");
  }

  /**
   * List of available users.
   * @type {LightDMUser[]}
   * @readonly
   */
  public get users(): LightDMUser[] {
    return ipcRenderer.sendSync("lightdm", "users");
  }

  /**
   * Starts the authentication procedure for a user.
   *
   * @param {string|null} username A username or "null" to prompt for a username.
   */
  public authenticate(username: string | null): boolean {
    return ipcRenderer.sendSync("lightdm", "authenticate", username);
  }

  /**
   * Starts the authentication procedure for the guest user.
   */
  public authenticate_as_guest(): boolean {
    return ipcRenderer.sendSync("lightdm", "authenticate_as_guest");
  }

  /**
   * Set the brightness to quantity
   * @param {number} quantity The quantity to set
   * @deprecated Use `brightness_set`
   */
  public brightnessSet(quantity: number): void {
    return ipcRenderer.sendSync("lightdm", "brightnessSet", quantity);
  }
  /**
   * Set the brightness to quantity
   * @param {number} quantity The quantity to set
   */
  public brightness_set(quantity: number): void {
    return ipcRenderer.sendSync("lightdm", "brightness_set", quantity);
  }

  /**
   * Increase the brightness by quantity
   * @param {number} quantity The quantity to increase
   * @deprecated Use `brightness_increase`
   */
  public brightnessIncrease(quantity: number): void {
    return ipcRenderer.sendSync("lightdm", "brightnessIncrease", quantity);
  }
  /**
   * Increase the brightness by quantity
   * @param {number} quantity The quantity to increase
   */
  public brightness_increase(quantity: number): void {
    return ipcRenderer.sendSync("lightdm", "brightness_increase", quantity);
  }

  /**
   * Decrease the brightness by quantity
   * @param {number} quantity The quantity to decrease
   * @deprecated Use `brightness_decrease`
   */
  public brightnessDecrease(quantity: number): void {
    return ipcRenderer.sendSync("lightdm", "brightnessDecrease", quantity);
  }
  /**
   * Decrease the brightness by quantity
   * @param {number} quantity The quantity to decrease
   */
  public brightness_decrease(quantity: number): void {
    return ipcRenderer.sendSync("lightdm", "brightness_decrease", quantity);
  }

  /**
   * Cancel user authentication that is currently in progress.
   */
  public cancel_authentication(): boolean {
    return ipcRenderer.sendSync("lightdm", "cancel_authentication");
  }

  /**
   * Cancel the automatic login.
   */
  public cancel_autologin(): boolean {
    return ipcRenderer.sendSync("lightdm", "cancel_autologin");
  }

  /**
   * Triggers the system to hibernate.
   * @returns {boolean} "true" if hibernation initiated, otherwise "false"
   */
  public hibernate(): boolean {
    return ipcRenderer.sendSync("lightdm", "hibernate");
  }

  /**
   * Provide a response to a prompt.
   * @param {string} response
   */
  public respond(response: string): boolean {
    return ipcRenderer.sendSync("lightdm", "respond", response);
  }

  /**
   * Triggers the system to restart.
   * @returns {boolean} "true" if restart initiated, otherwise "false"
   */
  public restart(): boolean {
    return ipcRenderer.sendSync("lightdm", "restart");
  }

  /**
   * Set the language for the currently authenticated user.
   * @param {string} language The language in the form of a locale specification (e.g.
   *     'de_DE.UTF-8')
   * @returns {boolean} "true" if successful, otherwise "false"
   */
  public set_language(language: string): boolean {
    if (this.is_authenticated) {
      return ipcRenderer.sendSync("lightdm", "set_language", language);
    }
    return false;
  }

  /**
   * Triggers the system to shutdown.
   * @returns {boolean} "true" if shutdown initiated, otherwise "false"
   */
  public shutdown(): boolean {
    return ipcRenderer.sendSync("lightdm", "shutdown");
  }

  /**
   * Start a session for the authenticated user.
   * @param {string|null} session The session to log into or "null" to use the default.
   * @returns {boolean} "true" if successful, otherwise "false"
   */
  public start_session(session: string | null): boolean {
    return ipcRenderer.sendSync("lightdm", "start_session", session);
  }

  /**
   * Triggers the system to suspend/sleep.
   * @returns {boolean} "true" if suspend/sleep initiated, otherwise "false"
   */
  public suspend(): boolean {
    return ipcRenderer.sendSync("lightdm", "suspend");
  }
}

interface GCBranding {
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
interface GCGreeter {
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
interface GCFeatures {
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
  public constructor() {
    if ("greeter_config" in window && window.greeter_config) {
      return window.greeter_config;
    }
    window.greeter_config = this;
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
  public get branding(): GCBranding {
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
  public get greeter(): GCGreeter {
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
  public get features(): GCFeatures {
    return ipcRenderer.sendSync("greeter_config", "features");
  }

  /*
   * Holds a list of preferred layouts from the `layouts` section of the config file.
   * @type {LightDMLayout[]} layouts
   * @readonly
   */
  public get layouts(): LightDMLayout[] {
    return ipcRenderer.sendSync("greeter_config", "layouts");
  }
}

let timeLanguage: string | null = null;

export class ThemeUtils {
  /* eslint-disable @typescript-eslint/naming-convention */

  public constructor() {
    if ("theme_utils" in window && window.theme_utils) {
      return window.theme_utils;
    }

    window.theme_utils = this;
  }

  /**
   * Binds `this` to class, `context`, for all of the class's methods.
   *
   * @arg {object} context An ES6 class instance with at least one method.
   *
   * @return {object} `context` with `this` bound to it for all of its methods.
   * @deprecated This method has no usage and will be removed on future versions
   */
  public bind_this(context: object): object {
    const excludedMethods = ["constructor"];

    function notExcluded(_method: string, _context: object): boolean {
      const isExcluded =
          excludedMethods.findIndex(
            (excludedMethod) => _method === excludedMethod
          ) > -1,
        // @ts-ignore Just for now
        isMethod = "function" === typeof _context[_method];

      return isMethod && !isExcluded;
    }

    for (let obj = context; obj; obj = Object.getPrototypeOf(obj)) {
      // Stop once we have traveled all the way up the inheritance chain
      if ("Object" === obj.constructor.name) {
        break;
      }

      for (const method of Object.getOwnPropertyNames(obj)) {
        if (notExcluded(method, context)) {
          // @ts-ignore Just for now
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
   * @param path        The abs path to desired directory.
   * @param onlyImages Include only images in the results. Default `true`.
   * @param callback    Callback function to be called with the result.
   */
  public dirlist(
    path: string,
    onlyImages = true,
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
        .invoke("theme_utils", "dirlist", path, onlyImages)
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
   * @param path        The abs path to desired directory.
   * @param onlyImages Include only images in the results. Default `true`.
   * @param callback    Callback function to be called with the result.
   * @experimental Available only for nody-greeter. DO NOT use it if you want compatibility between web-greeter and nody-greeter
   */
  public dirlist_sync(path: string, onlyImages = true): string[] {
    if ("" === path || "string" !== typeof path) {
      console.error(`theme_utils.dirlist(): path must be a non-empty string!`);
      return [];
    }
    if (null !== path.match(/\/\.+(?=\/)/)) {
      // No special directory names allowed (eg ../../)
      path = path.replace(/\/\.+(?=\/)/g, "");
    }
    try {
      return ipcRenderer.sendSync("theme_utils", "dirlist", path, onlyImages);
    } catch (err) {
      console.error(`theme_utils.dirlist(): ${err}`);
      return [];
    }
  }

  /**
   * Get the current date in a localized format. Local language is autodetected by default, but can be set manually in the greeter config file.
   */
  public get_current_localized_date(): string {
    const config = window.greeter_config?.greeter;

    const locale = [];

    if (timeLanguage === null) {
      timeLanguage = config?.time_language || "";
    }

    if (timeLanguage != "") {
      locale.push(timeLanguage);
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
   */
  public get_current_localized_time(): string {
    const config = window.greeter_config?.greeter;

    const locale = [];

    if (timeLanguage === null) {
      timeLanguage = config?.time_language || "";
    }

    if (timeLanguage != "") {
      locale.push(timeLanguage);
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

new Comm();
new ThemeUtils();
new GreeterConfig();
new Greeter();

window._ready_event = new Event("GreeterReady");

const domLoaded = new Promise<void>((resolve) => {
  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      resolve();
    }, 2);
  });
});

/**
 * Promise that fires when all initialization has completed,
 * and the theme can start (i.e. _ready_event can be sent)
 */
const readyPromise = Promise.all([domLoaded, window.greeter_comm?.whenReady()]);

readyPromise.then(() => {
  if (window._ready_event) window.dispatchEvent(window._ready_event);
});

export declare const greeter_comm: Comm;
export declare const lightdm: Greeter;
export declare const greeter_config: GreeterConfig;
export declare const theme_utils: ThemeUtils;
export declare const _ready_event: Event;

declare global {
  interface Window {
    greeter_comm: Comm | undefined;
    lightdm: Greeter | undefined;
    greeter_config: GreeterConfig | undefined;
    theme_utils: ThemeUtils | undefined;
    _ready_event: Event | undefined;

    addEventListener(
      type: "GreeterBroadcastEvent",
      listener: (ev: GreeterBroadcastEvent) => void,
      options?: boolean | AddEventListenerOptions | undefined
    ): void;

    addEventListener(
      type: "GreeterReady",
      listener: (ev: Event) => void,
      options?: boolean | AddEventListenerOptions | undefined
    ): void;
  }
}
