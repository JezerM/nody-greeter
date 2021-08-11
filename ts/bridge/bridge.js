const {
    ipcMain,
		webContents
} = require("electron");

const gi = require("node-gtk")
const LightDM = gi.require("LightDM", "1")

const { nody_greeter } = require("../config.js")

const LightDMGreeter = new LightDM.Greeter()
const LightDMUsers = new LightDM.UserList()

const { user_to_obj, language_to_obj, layout_to_obj, session_to_obj, battery_to_obj } = require("./bridge_objects.js")

const { window } = require("../globals.js");
const { brightness_get, brightness_change } = require("../utils/brightness.js");
const { Battery } = require("../utils/battery")


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
			() => {this._emit_signal("show-message")}
		);
		LightDMGreeter.connect("show-prompt",
			() => {this._emit_signal("show-prompt")}
		);
		LightDMGreeter.connect("idle",
			() => {this._emit_signal("idle")}
		);
		LightDMGreeter.connect("reset",
			() => {this._emit_signal("reset")}
		);
	}

	_emit_signal(signal) {
		//console.log("SIGNAL EMITTED", signal)
		window.win.webContents.send("LightDMSignal", signal)
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
		return LightDMGreeter.startSessionSync(session)
	}

	/**
	 * Triggers the system to suspend/sleep.
	 * @returns {Boolean} {@link true} if suspend/sleep initiated, otherwise {@link false}
	 */
	suspend() {
		return LightDM.suspend()
	}

	//authentication_complete = new Signal("authentication_complete");

	//autologin_timer_expired = new Signal("autologin_timer_expired");

	//brightness_update = new Signal("brightness_update");

	//idle = new Signal("idle");

	//reset = new Signal("reset");

	//show_message = new Signal("show_message");

	//show_prompt = new Signal("show_prompt");

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
		//return this._config.layouts;
	}

}

let time_language = null

class ThemeUtils {
	constructor(config) {
		if ("theme_utils" in globalThis) {
			return globalThis.theme_utils;
		}

		this._config = config

		globalThis.theme_utils = this
	}

	/**
	 * Binds `this` to class, `context`, for all of the class's methods.
	 *
	 * @arg {object} context An ES6 class instance with at least one method.
	 *
	 * @return {object} `context` with `this` bound to it for all of its methods.
	 */
	bind_this( context ) {
		let excluded_methods = ['constructor'];

		function not_excluded( _method, _context ) {
			let is_excluded = excluded_methods.findIndex( excluded_method => _method === excluded_method ) > -1,
				is_method = 'function' === typeof _context[_method];

			return is_method && !is_excluded;
		}

		for ( let obj = context; obj; obj = Object.getPrototypeOf( obj ) ) {
			// Stop once we have traveled all the way up the inheritance chain
			if ( 'Object' === obj.constructor.name ) {
				break;
			}

			for ( let method of Object.getOwnPropertyNames( obj ) ) {
				if ( not_excluded( method, context ) ) {
					context[method] = context[method].bind( context );
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
	 * @param {String}              path        The abs path to desired directory.
	 * @param {Boolean}             only_images Include only images in the results. Default `true`.
	 * @param {function(String[])}  callback    Callback function to be called with the result.
	 */
	dirlist( path, only_images = true, callback ) {
		if ( '' === path || 'string' !== typeof path ) {
			console.error(`theme_utils.dirlist(): path must be a non-empty string!`);
			return callback([]);

		} else if ( null !== path.match(/^[^/].+/) ) {
			console.error(`theme_utils.dirlist(): path must be absolute!`);
			return callback([]);
		}

		if ( null !== path.match(/\/\.+(?=\/)/) ) {
			// No special directory names allowed (eg ../../)
			path = path.replace(/\/\.+(?=\/)/g, '' );
		}

		try {
			return callback([])
		} catch( err ) {
			console.error(`theme_utils.dirlist(): ${err}`);
			return callback([]);
		}
	}

	/**
	 * Binds `this` to class, `context`, for all of the class's methods.
	 *
	 * @param {Object} context An ES6 class instance with at least one method.
	 *
	 * @return {Object} `context` with `this` bound to it for all of its methods.
	 */
	bind_this( context ) {
		let excluded_methods = ['constructor'];

		function not_excluded( _method, _context ) {
			let is_excluded = excluded_methods.findIndex( excluded_method => _method === excluded_method ) > -1,
				is_method = 'function' === typeof _context[_method];

			return is_method && !is_excluded;
		}

		for ( let obj = context; obj; obj = Object.getPrototypeOf( obj ) ) {
			// Stop once we have traveled all the way up the inheritance chain
			if ( 'Object' === obj.constructor.name ) {
				break;
			}

			for ( let method of Object.getOwnPropertyNames( obj ) ) {
				if ( not_excluded( method, context ) ) {
					context[method] = context[method].bind( context );
				}
			}
		}

		return context;
	}

	/**
	 * Get the current date in a localized format. Local language is autodetected by default, but can be set manually in the greeter config file.
	 * 	 * `language` defaults to the system's language, but can be set manually in the config file.
	 * 
	 * @returns {Object} The current date.
	 */
	get_current_localized_date() {
		let config = greeter_config.greeter

		var locale = []

		if (time_language === null) {
			time_language = config.time_language || ""
		}

		if (time_language != "") {
			locale.push(time_language)
		}

		let optionsDate = { day: "2-digit", month: "2-digit", year: "2-digit" }

		let fmtDate = Intl.DateTimeFormat(locale, optionsDate)

		let now = new Date()
		var date = fmtDate.format(now)

		return date
	}

	/**
	 * Get the current time in a localized format. Local language is autodetected by default, but can be set manually in the greeter config file.
	 * 	 * `language` defaults to the system's language, but can be set manually in the config file.
	 * 
	 * @returns {Object} The current time.
	 */
	get_current_localized_time() {
		let config = greeter_config.greeter

		var locale = []

		if (time_language === null) {
			time_language = config.time_language || ""
		}

		if (time_language != "") {
			locale.push(time_language)
		}

		let optionsTime = { hour: "2-digit", minute: "2-digit" }

		let fmtTime = Intl.DateTimeFormat(locale, optionsTime)

		let now = new Date()
		var time = fmtTime.format(now)

		return time
	}

}

function handler(ldm, ev, ...args) {
	if (args.length == 0) return ev.returnValue = undefined
	let param = args[0]
	//console.log(args)
	args.shift()

	if (typeof param !== "string"){
		return ev.returnValue = undefined
	}
	let pr = ldm[param]

	let value = undefined

	if (typeof pr === "function") {
		if (param == "setLayout") {
			let layout = new LightDM.Layout(args[0])
			LightDM.getLayout()
			value = LightDM.setLayout(layout)
		} else
		value = ldm[param](...args)
	}
	if (!value) {
		return ev.returnValue = undefined
	}

	if (args.length > 0) {
		return ev.returnValue = value
	}

	let str = value.toString()

	if (str.includes("LightDMLanguage")) {
		if (Array.isArray(value)) {
			value = reduceArray(value, language_to_obj)
		} else
		value = language_to_obj(value)
	} else
	if (str.includes("LightDMLayout")) {
		if (Array.isArray(value)) {
			value = reduceArray(value, layout_to_obj)
		} else
		value = layout_to_obj(value)
	} else
	if (str.includes("LightDMSession")) {
		if (Array.isArray(value)) {
			value = reduceArray(value, session_to_obj)
		} else
		value = session_to_obj(value)
	} else
	if (str.includes("LightDMUser")) {
		if (Array.isArray(value)) {
			value = reduceArray(value, user_to_obj)
		} else
		value = user_to_obj(value)
	}
	return ev.returnValue = value
}

function reduceArray(arr, func) {
	if (!Array.isArray(arr)) return
	return arr.reduce((acc, val) => {
		let v = func(val)
		acc.push(v)
		return acc
	}, [])
}

ipcMain.on("LightDM", (ev, ...args) => {
	return handler(LightDM, ev, ...args)
})

ipcMain.on("LightDMGreeter", (ev, ...args) => {
	return handler(LightDMGreeter, ev, ...args)
})

ipcMain.on("LightDMUsers", (ev, ...args) => {
	return handler(LightDMUsers, ev, ...args)
})

ipcMain.on("GreeterConfig", (ev, ...args) => {
	if (args.length == 0) return ev.returnValue = undefined
	let pr = globalThis.greeter_config[args[0]]
	ev.returnValue = pr || undefined
})

ipcMain.on("lightdm", (ev, ...args) => {
	if (args.length == 0) return ev.returnValue = undefined
	let descriptors = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(globalThis.lightdm))
	let param = args[0]
	args.shift()
	let pr = globalThis.lightdm[param]
	let ac = descriptors[param]

	let value = undefined

	if (typeof pr === "function") {
		value = globalThis.lightdm[param](...args)
	} else {
		if (args.length > 0 && ac && ac.set) {
			ac.set(...args)
		} else {
			value = pr || undefined
		}
	}

	ev.returnValue = value
})

new ThemeUtils(nody_greeter.config)
new GreeterConfig(nody_greeter.config)
new Greeter(nody_greeter.config)
