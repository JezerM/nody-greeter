const {
    ipcMain,
		webContents
} = require("electron");

const gi = require("node-gtk")
const LightDM = gi.require("LightDM", "1")
const fs = require("fs")
const os = require("os")

const { nody_greeter } = require("../config.js")

const LightDMGreeter = new LightDM.Greeter()
const LightDMUsers = new LightDM.UserList()

const { user_to_obj, language_to_obj, layout_to_obj, session_to_obj, battery_to_obj } = require("./bridge_objects.js")

const { browser } = require("../globals.js");
const { brightness_get, brightness_change } = require("../utils/brightness.js");
const { Battery } = require("../utils/battery");
const { reset_screensaver } = require("../utils/screensaver.js");
const path = require("path");


class Greeter {
	constructor(config) {
		if ('lightdm' in globalThis) {
			return globalThis.lightdm;
		}

		this._config = config

		if (this._config.features.battery) {
			this._battery = new Battery()
		}

		LightDMGreeter.connectToDaemonSync()

		this._connect_signals()

		let user = LightDMUsers.getUsers()[0]
		let user_data_dir = LightDMGreeter.ensureSharedDataDirSync(user.name)
		this._shared_data_directory = user_data_dir.slice(0, user_data_dir.lastIndexOf("/"))

		globalThis.lightdm = this;

		return globalThis.lightdm;
	}

	_connect_signals() {
		LightDMGreeter.connect("authentication-complete",
			() => {this._emit_signal("authentication-complete")}
		);
		LightDMGreeter.connect("autologin-timer-expired",
			() => {this._emit_signal("autologin-timer-expired")}
		);
		LightDMGreeter.connect("show-message",
			(text, type) => {this._emit_signal("show-message", text, type)}
		);
		LightDMGreeter.connect("show-prompt",
			(text, type) => {this._emit_signal("show-prompt", text, type)}
		);
		LightDMGreeter.connect("idle",
			() => {this._emit_signal("idle")}
		);
		LightDMGreeter.connect("reset",
			() => {this._emit_signal("reset")}
		);
	}

	_emit_signal(signal, ...args) {
		//console.log("SIGNAL EMITTED", signal, args)
		browser.win.webContents.send("LightDMSignal", signal, ...args)
	}

	/**
	 * The username of the user being authenticated or {@link null}
	 * if no authentication is in progress
	 * @type {String|Null}
	 * @readonly
	 */
	get authentication_user() {
		return LightDMGreeter.getAuthenticationUser() || ""
	}

	/**
	 * Whether or not the guest account should be automatically logged
	 * into when the timer expires.
	 * @type {Boolean}
	 * @readonly
	 */
	get autologin_guest() {
		return LightDMGreeter.getAutologinGuestHint()
	}

	/**
	 * The number of seconds to wait before automatically logging in.
	 * @type {Number}
	 * @readonly
	 */
	get autologin_timeout() {
		return LightDMGreeter.getAutologinTimeoutHint()
	}

	/**
	 * The username with which to automattically log in when the timer expires.
	 * @type {String}
	 * @readonly
	 */
	get autologin_user() {
		return LightDMGreeter.getAutologinUserHint()
	}

	/**
	 * Gets the battery data.
	 * @type {LightDMBattery}
	 * @readonly
	 */
	get batteryData() {
		return battery_to_obj(this._battery)
	}

	/**
	 * Gets the brightness
	 * @type {Number}
	 */
	get brightness() {
		return brightness_get();
	}
	/**
	 * Sets the brightness
	 * @param {Number} quantity The quantity to set
	 */
	set brightness( quantity ) {
		let steps = nody_greeter.config.features.backlight.steps;
		return brightness_change(quantity, steps, "set");
	}

	/**
	 * Whether or not the greeter can access to battery data.
	 * @type {boolean}
	 * @readonly
	 */
	get can_access_battery() {
		return this._config.features.battery;
	}

	/**
	 * Whether or not the greeter can control display brightness.
	 * @type {boolean}
	 * @readonly
	 */
	get can_access_brightness() {
		return this._config.features.backlight.enabled;
	}

	/**
	 * Whether or not the greeter can make the system hibernate.
	 * @type {Boolean}
	 * @readonly
	 */
	get can_hibernate() {
		return LightDM.getCanHibernate();
	}

	/**
	 * Whether or not the greeter can make the system restart.
	 * @type {Boolean}
	 * @readonly
	 */
	get can_restart() {
		return LightDM.getCanRestart();
	}

	/**
	 * Whether or not the greeter can make the system shutdown.
	 * @type {Boolean}
	 * @readonly
	 */
	get can_shutdown() {
		return LightDM.getCanShutdown();
	}

	/**
	 * Whether or not the greeter can make the system suspend/sleep.
	 * @type {Boolean}
	 * @readonly
	 */
	get can_suspend() {
		return LightDM.getCanSuspend();
	}

	/**
	 * The name of the default session.
	 * @type {String}
	 * @readonly
	 */
	get default_session() {
		return LightDMGreeter.getDefaultSessionHint();
	}

	/**
	 * Whether or not guest sessions are supported.
	 * @type {Boolean}
	 * @readonly
	 */
	get has_guest_account() {
		return LightDMGreeter.getHasGuestAccountHint();
	}

	/**
	 * Whether or not user accounts should be hidden.
	 * @type {Boolean}
	 * @readonly
	 */
	get hide_users_hint() {
		return LightDMGreeter.getHideUsersHint();
	}

	/**
	 * The system's hostname.
	 * @type {String}
	 * @readonly
	 */
	get hostname() {
		return LightDM.getHostname();
	}

	/**
	 * Whether or not the greeter is in the process of authenticating.
	 * @type {Boolean}
	 * @readonly
	 */
	get in_authentication() {
		return LightDMGreeter.getInAuthentication();
	}

	/**
	 * Whether or not the greeter has successfully authenticated.
	 * @type {Boolean}
	 * @readonly
	 */
	get is_authenticated() {
		return LightDMGreeter.getIsAuthenticated();
	}

	/**
	 * The current language or {@link null} if no language.
	 * @type {LightDMLanguage|null}
	 * @readonly
	 */
	get language() {
		return language_to_obj(LightDM.getLanguage());
	}

	/**
	 * A list of languages to present to the user.
	 * @type {LightDMLanguage[]}
	 * @readonly
	 */
	get languages() {
		return reduceArray(LightDM.getLanguages(), language_to_obj);
	}

	/**
	 * The currently active layout for the selected user.
	 * @type {LightDMLayout}
	 */
	get layout() {
		return layout_to_obj(LightDM.getLayout());
	}

	set layout(layout) {
		LightDM.getLayout()
		return LightDM.setLayout(new LightDM.Layout(layout));
	}

	/**
	 * A list of keyboard layouts to present to the user.
	 * @type {LightDMLayout[]}
	 * @readonly
	 */
	get layouts() {
		return reduceArray(LightDM.getLayouts(), layout_to_obj);
	}

	/**
	 * Whether or not the greeter was started as a lock screen.
	 * @type {Boolean}
	 * @readonly
	 */
	get lock_hint() {
		return LightDMGreeter.getLockHint();
	}

	/**
	 * A list of remote sessions.
	 * @type {LightDMSession[]}
	 * @readonly
	 */
	get remote_sessions() {
		return reduceArray(LightDM.getRemoteSessions(), session_to_obj);
	}

	/**
	 * Whether or not the guest account should be selected by default.
	 * @type {Boolean}
	 * @readonly
	 */
	get select_guest_hint() {
		return LightDMGreeter.getSelectGuestHint();
	}

	/**
	 * The username to select by default.
	 * @type {String}
	 * @readonly
	 */
	get select_user_hint() {
		return LightDMGreeter.getSelectUserHint();
	}

	/**
	 * List of available sessions.
	 * @type {LightDMSession[]}
	 * @readonly
	 */
	get sessions() {
		return reduceArray(LightDM.getSessions(), session_to_obj);
	}

	/**
	 * LightDM shared data directory
	 * @type {String}
	 * @readonly
	 */
	get shared_data_directory() {
		return this._shared_data_directory;
	}

	/**
	 * Check if a manual login option should be shown. If {@link true}, the theme should
	 * provide a way for a username to be entered manually. Otherwise, themes that show
	 * a user list may limit logins to only those users.
	 * @type {Boolean}
	 * @readonly
	 */
	get show_manual_login_hint() {
		return LightDMGreeter.getShowManualLoginHint();
	}

	/**
	 * Check if a remote login option should be shown. If {@link true}, the theme should provide
	 * a way for a user to log into a remote desktop server.
	 * @type {Boolean}
	 * @readonly
	 * @internal
	 */
	get show_remote_login_hint() {
		return LightDMGreeter.getShowRemoteLoginHint();
	}

	/**
	 * List of available users.
	 * @type {LightDMUser[]}
	 * @readonly
	 */
	get users() {
		return reduceArray(LightDMUsers.getUsers(), user_to_obj);
	}

	/**
	 * Starts the authentication procedure for a user.
	 *
	 * @param {String|null} username A username or {@link null} to prompt for a username.
	 */
	authenticate( username ) {
		LightDMGreeter.authenticate(username);
	}

	/**
	 * Starts the authentication procedure for the guest user.
	 */
	authenticate_as_guest() {
		LightDMGreeter.authenticateAsGuest();
	}

	/**
	 * Set the brightness to quantity
	 * @param {Number} quantity The quantity to set
	 */
	brightnessSet( quantity ) {
		let steps = this._config.features.backlight.steps;
		brightness_change(quantity, steps, "set");
	}

	/**
	 * Increase the brightness by quantity
	 * @param {Number} quantity The quantity to increase
	 */
	brightnessIncrease( quantity ) {
		let steps = this._config.features.backlight.steps;
		brightness_change(quantity, steps, "inc");
	}

	/**
	 * Decrease the brightness by quantity
	 * @param {Number} quantity The quantity to decrease
	 */
	brightnessDecrease( quantity ) {
		let steps = this._config.features.backlight.steps;
		brightness_change(quantity, steps, "dec");
	}

	/**
	 * Cancel user authentication that is currently in progress.
	 */
	cancel_authentication() {
		LightDMGreeter.cancelAuthentication();
	}

	/**
	 * Cancel the automatic login.
	 */
	cancel_autologin() {
		LightDMGreeter.cancelAutologin();
	}

	/**
	 * Triggers the system to hibernate.
	 * @returns {Boolean} "true" if hibernation initiated, otherwise "false"
	 */
	hibernate() {
		return LightDM.hibernate();
	}

	/**
	 * Provide a response to a prompt.
	 * @param {String} response
	 */
	respond( response ) {
		LightDMGreeter.respond(response);
	}

	/**
	 * Triggers the system to restart.
	 * @returns {Boolean} {@link true} if restart initiated, otherwise {@link false}
	 */
	restart() {
		return LightDM.restart();
	}

	/**
	 * Set the language for the currently authenticated user.
	 * @param {String} language The language in the form of a locale specification (e.g.
	 *     'de_DE.UTF-8')
	 * @returns {Boolean} {@link true} if successful, otherwise {@link false}
	 */
	set_language( language ) {
		if (this.is_authenticated) {
			LightDMGreeter.setLanguage(language);
		}
	}

	/**
	 * Triggers the system to shutdown.
	 * @returns {Boolean} {@link true} if shutdown initiated, otherwise {@link false}
	 */
	shutdown() {
		return LightDM.shutdown()
	}

	/**
	 * Start a session for the authenticated user.
	 * @param {String|null} session The session to log into or {@link null} to use the default.
	 * @returns {Boolean} {@link true} if successful, otherwise {@link false}
	 */
	start_session( session ) {
		let started = LightDMGreeter.startSessionSync(session);
		if (started) reset_screensaver();
		return started;
	}

	/**
	 * Triggers the system to suspend/sleep.
	 * @returns {Boolean} {@link true} if suspend/sleep initiated, otherwise {@link false}
	 */
	suspend() {
		return LightDM.suspend()
	}
}

function get_layouts(config_layouts) {
	let layouts = LightDM.getLayouts()
	let final = []
	for (ldm_lay of layouts) {
		for (conf_lay of config_layouts) {
			conf_lay = conf_lay.replaceAll(" ", "\t")
			if (ldm_lay.getName() == conf_lay) {
				final.push(layout_to_obj(ldm_lay))
			}
		}
	}
	return final
}

class GreeterConfig {
	constructor(config) {
		if ('greeter_config' in globalThis) {
			return globalThis.greeter_config;
		}

		this._config = config

		globalThis.greeter_config = this;
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
	get branding() {
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
	get greeter() {
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
	get features() {
		return this._config.features;
	}

	/*
	 * Holds a list of preferred layouts from the `layouts` section of the config file.
	 * @type {Array}			layouts
	 * @readonly
	 */
	get layouts() {
		return get_layouts(this._config.layouts)
	}

}

class ThemeUtils {
	constructor(config) {
		if ("theme_utils" in globalThis) {
			return globalThis.theme_utils;
		}

		this._config = config

		this._allowed_dirs = [
			nody_greeter.app.theme_dir,
			nody_greeter.config.branding.background_images_dir,
			globalThis.lightdm.shared_data_directory,
			os.tmpdir(),
		]

		globalThis.theme_utils = this
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
	dirlist( dir_path, only_images = true) {
		if (!dir_path || typeof dir_path !== "string" || dir_path === "/") {
			return []
		}

		dir_path = fs.realpathSync(path.normalize(dir_path))

		if (!path.isAbsolute(dir_path) || !fs.lstatSync(dir_path).isDirectory()) {
			return []
		}

		let allowed = false;

		for (let i = 0; i < this._allowed_dirs.length; i++) {
			if (dir_path.startsWith(this._allowed_dirs[i])) {
				allowed = true; break;
			}
		}

		if (!allowed) return []

		let files = fs.readdirSync(dir_path, {withFileTypes: true});
		let result = [];

		if (only_images) {
			result = files.reduce((cb, v) => { // This only returns files inside path, not recursively
				if (v.isFile() && (
					v.name.match(/.+\.(jpe?g|png|gif|bmp|webp)/)
				)) {
					cb.push(path.join(dir_path, v.name))
				}
				return cb;
			}, [])
		} else {
			result = files.reduce((cb, v) => {
				cb.push(path.join(dir_path, v.name)); return cb;
			}, [])
		}
		//console.log(dir_path, result);
		return result;
	}
}

function reduceArray(arr, func) {
	if (!Array.isArray(arr)) return
	return arr.reduce((acc, val) => {
		let v = func(val)
		acc.push(v)
		return acc
	}, [])
}

function handler(accesor, ev, ...args) {
	if (args.length == 0) return ev.returnValue = undefined
	let descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(accesor))
	let param = args[0]
	args.shift()
	let pr = accesor[param]
	let ac = descriptors[param]

	let value = undefined

	if (typeof pr === "function") {
		value = accesor[param](...args)
	} else {
		if (args.length > 0 && ac && ac.set) {
			ac.set(...args)
		} else {
			value = pr || undefined
		}
	}
	return ev.returnValue = value
}

ipcMain.on("greeter_config", (ev, ...args) => {
	if (args.length == 0) return ev.returnValue = undefined;
	let pr = globalThis.greeter_config[args[0]]
	ev.returnValue = pr || undefined
})

ipcMain.on("theme_utils", (ev, ...args) => {
	handler(globalThis.theme_utils, ev, ...args)
})

ipcMain.handle("theme_utils", (ev, ...args) => {
	return handler(globalThis.theme_utils, ev, ...args)
})

ipcMain.on("lightdm", (ev, ...args) => {
	handler(globalThis.lightdm, ev, ...args)
})

new Greeter(nody_greeter.config)
new GreeterConfig(nody_greeter.config)
new ThemeUtils(nody_greeter.config)
