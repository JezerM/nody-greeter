var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nody_greeter = void 0;
const yaml = __importStar(require("js-yaml"));
const fs = __importStar(require("fs"));
const nody_greeter = {
    config: {
        branding: {
            background_images_dir: "/usr/share/backgrounds",
            logo_image: "",
            user_image: "",
        },
        greeter: {
            debug_mode: false,
            detect_theme_errors: true,
            screensaver_timeout: 300,
            secure_mode: true,
            theme: "gruvbox",
            icon_theme: undefined,
            time_language: undefined,
        },
        layouts: ["us", "latam"],
        features: {
            battery: false,
            backlight: {
                enabled: false,
                value: 10,
                steps: 0,
            },
        },
    },
    app: {
        fullscreen: true,
        frame: false,
        debug_mode: false,
        theme_dir: "/usr/share/web-greeter/themes/",
    },
};
exports.nody_greeter = nody_greeter;
try {
    let file = fs.readFileSync("/etc/lightdm/web-greeter.yml", "utf-8");
    nody_greeter.config = yaml.load(file);
}
catch (err) {
    console.error(err);
}
