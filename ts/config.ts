import { isRight } from "fp-ts/Either";
import * as util from "util";
import * as fs from "fs";
import * as io_ts from "io-ts";
import * as yaml from "js-yaml";
import * as path from "path";
import { logger } from "./logger";

export const WEB_GREETER_CONFIG = io_ts.type({
  branding: io_ts.type({
    background_images_dir: io_ts.string,
    logo_image: io_ts.string,
    user_image: io_ts.string,
  }),
  greeter: io_ts.type({
    debug_mode: io_ts.boolean,
    detect_theme_errors: io_ts.boolean,
    screensaver_timeout: io_ts.number,
    secure_mode: io_ts.boolean,
    theme: io_ts.string,
    icon_theme: io_ts.union([io_ts.string, io_ts.null, io_ts.undefined]),
    time_language: io_ts.union([io_ts.string, io_ts.null, io_ts.undefined]),
  }),
  layouts: io_ts.array(io_ts.string),
  features: io_ts.type({
    battery: io_ts.boolean,
    backlight: io_ts.type({
      enabled: io_ts.boolean,
      value: io_ts.number,
      steps: io_ts.number,
    }),
  }),
});

export const THEME_CONFIG = io_ts.intersection([
  io_ts.type({
    /**
     * HTML file to use in main monitor
     * @example primary_html: "index.html"
     */
    primary_html: io_ts.string,
  }),
  io_ts.partial({
    /**
     * HTML file to use in non-main (secondary) monitors
     * If the file does not exists or it's not set, `primary_html` will be used
     * @example secondary_html: "secondary.html"
     * @example secondary_html: ""
     */
    secondary_html: io_ts.string,
  }),
]);

/**
 * web-greeter's config inside `/etc/lightdm/web-greeter.yml`
 */
export type web_greeter_config = io_ts.TypeOf<typeof WEB_GREETER_CONFIG>;
/**
 * Theme's config inside `$THEME/index.yml`
 */
export type theme_config = io_ts.TypeOf<typeof THEME_CONFIG>;

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

function validate_config<T>(decoder: io_ts.Type<T>, obj: unknown): T {
  const decoded = decoder.decode(obj);
  if (isRight(decoded)) {
    return decoded.right;
  } else {
    const errors = decoded.left;
    let message = "";
    const fm_errors: { key: string; value: string; type: string }[] = [];
    for (let i = 0; i < errors.length; i++) {
      const context = errors[i].context;
      const type = context[context.length - 1].type.name;
      const key = context[context.length - 2].key;
      const value = errors[i].value;
      const can_color = process.stdout.isTTY && process.stdout.hasColors();
      const fm_value = util.inspect(value, { colors: can_color });

      const ind = fm_errors.findIndex((e) => e.key === key);
      if (ind == -1) {
        fm_errors.push({ key, value: fm_value, type });
      } else {
        fm_errors[ind].type += "|" + type;
      }
    }
    for (const err of fm_errors) {
      message += `{ ${err.key}: ${err.value} } couldn't be validated as (${err.type})\n`;
    }
    throw new Error(`Invalid config: ${message}`);
  }
}

export function load_theme_config(): void {
  if (!theme_dir) load_theme_dir();
  const path_to_theme_config = path.join(theme_dir, "index.yml");
  try {
    const file = fs.readFileSync(path_to_theme_config, "utf-8");
    const theme_config = yaml.load(file);

    nody_greeter.theme = validate_config(THEME_CONFIG, theme_config);
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
    load_theme_config();
  }
}

export function load_config(): void {
  try {
    const file = fs.readFileSync(path_to_config, "utf-8");
    const webg_config = yaml.load(file);

    nody_greeter.config = validate_config(WEB_GREETER_CONFIG, webg_config);
  } catch (err) {
    logger.error(`Config was not loaded:\n\t${err}`);
    logger.warn("Using default config");
  }
}

load_config();

export {};
