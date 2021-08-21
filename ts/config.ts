import * as yaml from "js-yaml";
import * as fs from "fs";

interface web_greeter_config {
  branding: {
    background_images_dir: string;
    logo_image: string;
    user_image: string;
  };
  greeter: {
    debug_mode: boolean;
    detect_theme_errors: boolean;
    screensaver_timeout: number;
    secure_mode: boolean;
    theme: string;
    icon_theme: string | undefined;
    time_language: string | undefined;
  };
  layouts: string[];
  features: {
    battery: boolean;
    backlight: {
      enabled: boolean;
      value: number;
      steps: number;
    };
  };
}

interface app_config {
  fullscreen: boolean;
  frame: boolean;
  debug_mode: boolean;
  theme_dir: string;
}

interface nody_config {
  config: web_greeter_config;
  app: app_config;
}

const nody_greeter: nody_config = {
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

try {
  let file = fs.readFileSync("/etc/lightdm/web-greeter.yml", "utf-8");
  nody_greeter.config = yaml.load(file) as web_greeter_config;
} catch (err) {
  console.error(err);
}

export { nody_greeter, web_greeter_config };
