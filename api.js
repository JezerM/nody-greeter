const {
    contextBridge,
    ipcRenderer,
} = require("electron");


let allSignals = [];

class Signal {
	constructor(name) {
		this._name = name;
		this._callbacks = [];
		allSignals.push(this);
	}

	/**
	 * Connects a callback to the signal.
	 * @param {Function} callback The callback to attach.
	 */
	connect(callback) {
		if (typeof callback !== 'function') return;
		this._callbacks.push(callback);
	}
	/**
	 * Disconnects a callback to the signal.
	 * @param {Function} callback The callback to disattach.
	 */
	disconnect(callback) {
		var ind = this._callbacks.findIndex( (cb) => {return cb === callback});
		if (ind == -1) return;
		this._callbacks.splice(ind, 1);
	}

	_emit() {
		this._callbacks.forEach( (cb) => {
			if (typeof cb !== 'function') return;
			cb()
		})
	}
}

ipcRenderer.on("LightDMSignal", (ev, ...args) => {
	allSignals.forEach((v) => {
		if (v._name == args[0]) {
			v._emit()
		}
	})
})


class Greeter {
	constructor() {
		if ('lightdm' in window) {
			return window.lightdm;
		}

		window.lightdm = this;

		return window.lightdm;
	}

	authentication_complete = new Signal("authentication-complete");

	autologin_timer_expired = new Signal("autologin_timer-expired");

	idle = new Signal("idle");

	reset = new Signal("reset");

	show_message = new Signal("show-message");

	show_prompt = new Signal("show-prompt");

	/**
	 * The username of the user being authenticated or {@link null}
	 * if no authentication is in progress
	 * @type {String|Null}
	 * @readonly
	 */
	get authentication_user() {
		return ipcRenderer.sendSync("LightDMGreeter", "getAuthenticationUser")
	}

	/**
	 * Whether or not the guest account should be automatically logged
	 * into when the timer expires.
	 * @type {Boolean}
	 * @readonly
	 */
	get autologin_guest() {
		return ipcRenderer.sendSync("LightDMGreeter", "getAutologinGuestHint")
	}

	/**
	 * The number of seconds to wait before automatically logging in.
	 * @type {Number}
	 * @readonly
	 */
	get autologin_timeout() {
		return ipcRenderer.sendSync("LightDMGreeter", "getAutologinTimeoutHint")
	}

	/**
	 * The username with which to automattically log in when the timer expires.
	 * @type {String}
	 * @readonly
	 */
	get autologin_user() {
		return ipcRenderer.sendSync("LightDMGreeter", "getAutologinUserHint")
	}

	/**
	 * Gets the battery data.
	 * @type {LightDMBattery}
	 * @readonly
	 */
	get batteryData() {
		return {}
	}

	/**
	 * Gets the brightness
	 * @type {Number}
	 */
	get brightness() {
		return -1
	}
	/**
	 * Sets the brightness
	 * @param {Number} quantity The quantity to set
	 */
	set brightness( quantity ) {
		if (quantity > 100) quantity = 100;
		if (quantity < 0) quantity = 0;
		this._brightness = quantity;
	}

	/**
	 * Whether or not the greeter can access to battery data.
	 * @type {boolean}
	 * @readonly
	 */
	get can_access_battery() {
		return false;
	}

	/**
	 * Whether or not the greeter can control display brightness.
	 * @type {boolean}
	 * @readonly
	 */
	get can_access_brightness() {
		return false;
	}

	/**
	 * Whether or not the greeter can make the system hibernate.
	 * @type {Boolean}
	 * @readonly
	 */
	get can_hibernate() {
		return ipcRenderer.sendSync("LightDM", "getCanHibernate")
	}

	/**
	 * Whether or not the greeter can make the system restart.
	 * @type {Boolean}
	 * @readonly
	 */
	get can_restart() {
		return ipcRenderer.sendSync("LightDM", "getCanRestart")
	}

	/**
	 * Whether or not the greeter can make the system shutdown.
	 * @type {Boolean}
	 * @readonly
	 */
	get can_shutdown() {
		return ipcRenderer.sendSync("LightDM", "getCanShutdown")
	}

	/**
	 * Whether or not the greeter can make the system suspend/sleep.
	 * @type {Boolean}
	 * @readonly
	 */
	get can_suspend() {
		return ipcRenderer.sendSync("LightDM", "getCanSuspend")
	}

	/**
	 * The name of the default session.
	 * @type {String}
	 * @readonly
	 */
	get default_session() {
		return ipcRenderer.sendSync("LightDMGreeter", "getDefaultSessionHint")
	}

	/**
	 * Whether or not guest sessions are supported.
	 * @type {Boolean}
	 * @readonly
	 */
	get has_guest_account() {
		return ipcRenderer.sendSync("LightDMGreeter", "getHasGuestAccountHint")
	}

	/**
	 * Whether or not user accounts should be hidden.
	 * @type {Boolean}
	 * @readonly
	 */
	get hide_users_hint() {
		return ipcRenderer.sendSync("LightDMGreeter", "getHideUsersHint")
	}

	/**
	 * The system's hostname.
	 * @type {String}
	 * @readonly
	 */
	get hostname() {
		return ipcRenderer.sendSync("LightDM", "getHostname")
	}

	/**
	 * Whether or not the greeter is in the process of authenticating.
	 * @type {Boolean}
	 * @readonly
	 */
	get in_authentication() {
		return ipcRenderer.sendSync("LightDMGreeter", "getInAuthentication")
	}

	/**
	 * Whether or not the greeter has successfully authenticated.
	 * @type {Boolean}
	 * @readonly
	 */
	get is_authenticated() {
		return ipcRenderer.sendSync("LightDMGreeter", "getIsAuthenticated")
	}

	/**
	 * The current language or {@link null} if no language.
	 * @type {LightDMLanguage|null}
	 * @readonly
	 */
	get language() {
		return ipcRenderer.sendSync("LightDM", "getLanguage")
	}

	/**
	 * A list of languages to present to the user.
	 * @type {LightDMLanguage[]}
	 * @readonly
	 */
	get languages() {
		return ipcRenderer.sendSync("LightDM", "getLanguages")
	}

	/**
	 * The currently active layout for the selected user.
	 * @type {LightDMLayout}
	 */
	get layout() {
		return ipcRenderer.sendSync("LightDM", "getLayout")
	}

	set layout(layout) {
		return ipcRenderer.sendSync("LightDM", "setLayout", layout)
	}

	/**
	 * A list of keyboard layouts to present to the user.
	 * @type {LightDMLayout[]}
	 * @readonly
	 */
	get layouts() {
		return ipcRenderer.sendSync("LightDM", "getLayouts")
	}

	/**
	 * Whether or not the greeter was started as a lock screen.
	 * @type {Boolean}
	 * @readonly
	 */
	get lock_hint() {
		return ipcRenderer.sendSync("LightDMGreeter", "getLockHint")
	}

	/**
	 * A list of remote sessions.
	 * @type {LightDMSession[]}
	 * @readonly
	 */
	get remote_sessions() {
		return ipcRenderer.sendSync("LightDM", "getRemoteSessions")
	}

	/**
	 * Whether or not the guest account should be selected by default.
	 * @type {Boolean}
	 * @readonly
	 */
	get select_guest_hint() {
		return ipcRenderer.sendSync("LightDMGreeter", "getSelectGuestHint")
	}

	/**
	 * The username to select by default.
	 * @type {String}
	 * @readonly
	 */
	get select_user_hint() {
		return ipcRenderer.sendSync("LightDMGreeter", "getSelectUserHint")
	}

	/**
	 * List of available sessions.
	 * @type {LightDMSession[]}
	 * @readonly
	 */
	get sessions() {
		return ipcRenderer.sendSync("LightDM", "getSessions")
	}

	/**
	 * Check if a manual login option should be shown. If {@link true}, the theme should
	 * provide a way for a username to be entered manually. Otherwise, themes that show
	 * a user list may limit logins to only those users.
	 * @type {Boolean}
	 * @readonly
	 */
	get show_manual_login_hint() {
		return ipcRenderer.sendSync("LightDMGreeter", "getShowManualLoginHint")
	}

	/**
	 * Check if a remote login option should be shown. If {@link true}, the theme should provide
	 * a way for a user to log into a remote desktop server.
	 * @type {Boolean}
	 * @readonly
	 * @internal
	 */
	get show_remote_login_hint() {
		return ipcRenderer.sendSync("LightDMGreeter", "getShowRemoteLoginHint")
	}

	/**
	 * List of available users.
	 * @type {LightDMUser[]}
	 * @readonly
	 */
	get users() {
		return ipcRenderer.sendSync("LightDMUsers", "getUsers")
	}

	/**
	 * Starts the authentication procedure for a user.
	 *
	 * @param {String|null} username A username or {@link null} to prompt for a username.
	 */
	authenticate( username ) {
		return ipcRenderer.sendSync("LightDMGreeter", "authenticate", username)
	}

	/**
	 * Starts the authentication procedure for the guest user.
	 */
	authenticate_as_guest() {
		return ipcRenderer.sendSync("LightDMGreeter", "authenticateAsGuest")
	}

	/**
	 * Set the brightness to quantity
	 * @param {Number} quantity The quantity to set
	 */
	brightnessSet( quantity ) {
		//this.brightness = quantity;
	}

	/**
	 * Increase the brightness by quantity
	 * @param {Number} quantity The quantity to increase
	 */
	brightnessIncrease( quantity ) {
		//this.brightness += quantity;
	}

	/**
	 * Decrease the brightness by quantity
	 * @param {Number} quantity The quantity to decrease
	 */
	brightnessDecrease( quantity ) {
		//this.brightness -= quantity;
	}

	/**
	 * Cancel user authentication that is currently in progress.
	 */
	cancel_authentication() {
		return ipcRenderer.sendSync("LightDMGreeter", "cancelAuthentication")
	}

	/**
	 * Cancel the automatic login.
	 */
	cancel_autologin() {
		return ipcRenderer.sendSync("LightDMGreeter", "cancelAutologin")
	}

	/**
	 * Triggers the system to hibernate.
	 * @returns {Boolean} "true" if hibernation initiated, otherwise "false"
	 */
	hibernate() {
		return ipcRenderer.sendSync("LightDM", "hibernate")
	}

	/**
	 * Provide a response to a prompt.
	 * @param {String} response
	 */
	respond( response ) {
		return ipcRenderer.sendSync("LightDMGreeter", "respond", response)
	}

	/**
	 * Triggers the system to restart.
	 * @returns {Boolean} {@link true} if restart initiated, otherwise {@link false}
	 */
	restart() {
		return ipcRenderer.sendSync("LightDM", "restart")
	}

	/**
	 * Set the language for the currently authenticated user.
	 * @param {String} language The language in the form of a locale specification (e.g.
	 *     'de_DE.UTF-8')
	 * @returns {Boolean} {@link true} if successful, otherwise {@link false}
	 */
	set_language( language ) {
		if (this.is_authenticated) {
			return ipcRenderer.sendSync("LightDMGreeter", "setLanguage", language)
		}
	}

	/**
	 * Triggers the system to shutdown.
	 * @returns {Boolean} {@link true} if shutdown initiated, otherwise {@link false}
	 */
	shutdown() {
		return ipcRenderer.sendSync("LightDM", "shutdown")
	}

	/**
	 * Start a session for the authenticated user.
	 * @param {String|null} session The session to log into or {@link null} to use the default.
	 * @returns {Boolean} {@link true} if successful, otherwise {@link false}
	 */
	start_session( session ) {
			return ipcRenderer.sendSync("LightDMGreeter", "startSessionSync", session)
	}

	/**
	 * Triggers the system to suspend/sleep.
	 * @returns {Boolean} {@link true} if suspend/sleep initiated, otherwise {@link false}
	 */
	suspend() {
		return ipcRenderer.sendSync("LightDM", "suspend")
	}
}

class GreeterConfig {
	constructor() {
		if ('greeter_config' in window) {
			return window.greeter_config;
		}

		window.greeter_config = this;
	}

	_branding = {
		background_images_dir: "/usr/share/backgrounds",
		logo_image: "/usr/share/web-greeter/themes/default/img/antergos-logo-user.png",
		user_image: "/usr/share/web-greeter/themes/default/img/antergos.png"
	}

	_greeter = {
		debug_mode: true,
		detect_theme_errors: true,
		screensaver_timeout: 300,
		secure_mode: true,
		time_language: "",
		theme: "none"
	}

	_features = {
		battery: true,
		backlight: {
			enabled: true,
			value: 10,
			steps: 0
		}
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
		return this._branding;
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
		return this._greeter;
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
		return this._features;
	}

}

let time_language = null

class ThemeUtils {
	constructor() {
		if ("theme_utils" in window) {
			return window.theme_utils;
		}

		window.theme_utils = this
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

new ThemeUtils();
new GreeterConfig();
new Greeter();

window._ready_event = new Event("GreeterReady")

setTimeout(() => {
	window.dispatchEvent(_ready_event)
}, 2)
