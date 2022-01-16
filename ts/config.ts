import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import { logger } from "./logger";

export interface web_greeter_config {
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

export interface app_config {
  fullscreen: boolean;
  frame: boolean;
  debug_mode: boolean;
  theme_dir: string;
}

export interface nody_config {
  config: web_greeter_config;
  app: app_config;
  theme: theme_config;
}

/**
 * Theme's config inside `$THEME/index.theme`
 */
export interface theme_config {
  /**
   * HTML file to use in main monitor
   * @example primary_html: "index.html"
   */
  primary_html: string;
  /**
   * HTML file to use in non-main (secondary) monitors
   * If the file does not exists or it's not set, `primary_html` will be used
   * @example secondary_html: "secondary.html"
   * @example secondary_html: ""
   */
  secondary_html: string;
}

export const nody_greeter: nody_config = {
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
    theme_dir:
      process.env.NODY_GREETER_THEME_DIR || "/usr/share/web-greeter/themes/",
  },
  theme: {
    primary_html: "index.html",
    secondary_html: "",
  },
};

const path_to_config =
  process.env.NODY_GREETER_CONFIG || "/etc/lightdm/web-greeter.yml";

let theme_dir: string | undefined;

export function load_theme_dir(): string {
  const theme = nody_greeter.config.greeter.theme;
  const dir = nody_greeter.app.theme_dir;
  const def_theme = "gruvbox";
  theme_dir = path.join(dir, theme);

  if (theme.startsWith("/")) theme_dir = theme;
  else if (theme.includes(".") || theme.includes("/"))
    theme_dir = path.join(process.cwd(), theme);

  if (theme_dir.endsWith(".html")) theme_dir = path.dirname(theme_dir);

  if (!fs.existsSync(theme_dir)) {
    logger.warn(`"${theme}" theme does not exists. Using "${def_theme}" theme`);
    theme_dir = path.join(dir, def_theme);
  }

  return theme_dir;
}

export function load_primary_theme_path(): string {
  if (!theme_dir) load_theme_dir();
  const dir = nody_greeter.app.theme_dir;
  const def_theme = "gruvbox";
  const primary = nody_greeter.theme.primary_html;
  let path_to_theme = path.join(theme_dir, primary);

  if (!path_to_theme.endsWith(".html"))
    path_to_theme = path.join(path_to_theme, "index.html");

  if (!fs.existsSync(path_to_theme)) {
    logger.warn(
      `"${path_to_theme}" theme does not exists. Using "${def_theme}" theme`
    );
    path_to_theme = path.join(dir, def_theme, "index.html");
  }

  nody_greeter.config.greeter.theme = path_to_theme;
  return path_to_theme;
}
export function load_secondary_theme_path(): string {
  if (!theme_dir) load_theme_dir();
  const primary = nody_greeter.theme.primary_html;
  const secondary = nody_greeter.theme.secondary_html;
  let path_to_theme = path.join(theme_dir, secondary);

  if (!path_to_theme.endsWith(".html"))
    path_to_theme = path.join(path_to_theme, "index.html");

  if (!fs.existsSync(path_to_theme)) {
    logger.warn(
      `"${secondary}" does not exists. Using "${primary}" for secondary monitors`
    );
    path_to_theme = load_primary_theme_path();
  }

  return path_to_theme;
}

export function load_theme_config(): void {
  if (!theme_dir) load_theme_dir();
  const path_to_theme_config = path.join(theme_dir, "index.theme");
  try {
    if (!fs.existsSync(path_to_theme_config))
      throw new Error("Theme config not found");

    const file = fs.readFileSync(path_to_theme_config, "utf-8");
    const theme_config = yaml.load(file) as theme_config;

    if (!theme_config.primary_html.match(/.*.html/))
      theme_config.primary_html = "index.html";
    if (!theme_config.secondary_html.match(/.*.html/))
      theme_config.secondary_html = "";

    nody_greeter.theme = theme_config;
  } catch (err) {
    logger.warn(`Theme config was not loaded:\n\t${err}`);
    logger.debug("Using default theme config");
  }
}

export function ensure_theme(): void {
  if (!theme_dir) load_theme_dir();

  const primary = nody_greeter.theme.primary_html;
  const dir = nody_greeter.app.theme_dir;
  const def_theme = "gruvbox";

  const primary_exists = fs.existsSync(path.join(theme_dir, primary));

  if (!primary_exists) {
    theme_dir = path.join(dir, def_theme);

    if (fs.existsSync(path.join(theme_dir, "index.theme"))) {
      load_theme_config();
    }
  }
}

export function load_config(): void {
  try {
    if (!fs.existsSync(path_to_config))
      throw new Error("Config file not found");
    const file = fs.readFileSync(path_to_config, "utf-8");
    nody_greeter.config = yaml.load(file) as web_greeter_config;
  } catch (err) {
    logger.error(`Config was not loaded:\n\t${err}`);
  }
}

load_config();

export {};
