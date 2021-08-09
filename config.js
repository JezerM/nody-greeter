const yaml = require("js-yaml")
const fs = require("fs")

const nody_greeter = {
	config: {
		branding: {
		},
		greeter: {
		},
		layouts: [],
		features: {
		},
	},
	app: {
		fullscreen: true,
		frame: false,
		debug_mode: false,
		theme_dir: "/usr/share/web-greeter/themes/"
	}
}

try {
	let file = fs.readFileSync("/etc/lightdm/web-greeter.yml")
	nody_greeter.config = yaml.load(file)
} catch (err) {
	console.error(err)
}

module.exports = {
	nody_greeter: nody_greeter
}
