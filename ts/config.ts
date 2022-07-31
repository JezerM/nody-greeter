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
export type webGreterConfig = io_ts.TypeOf<typeof WEB_GREETER_CONFIG>;
/**
 * Theme's config inside `$THEME/index.yml`
 */
export type themeConfig = io_ts.TypeOf<typeof THEME_CONFIG>;

export interface AppConfig {
  fullscreen: boolean;
  frame: boolean;
  debug_mode: boolean;
  theme_dir: string;
}

export interface NodyConfig {
  config: webGreterConfig;
  app: AppConfig;
  theme: themeConfig;
}

export const globalNodyConfig: NodyConfig = {
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

const pathToConfig =
  process.env.NODY_GREETER_CONFIG || "/etc/lightdm/web-greeter.yml";

let themeDir: string | undefined;

/**
 * Loads the theme directory
 */
export function loadThemeDir(): string {
  const theme = globalNodyConfig.config.greeter.theme;
  const dir = globalNodyConfig.app.theme_dir;
  const defTheme = "gruvbox";
  themeDir = path.join(dir, theme);

  if (theme.startsWith("/")) themeDir = theme;
  else if (theme.includes(".") || theme.includes("/"))
    themeDir = path.join(process.cwd(), theme);

  if (themeDir.endsWith(".html")) themeDir = path.dirname(themeDir);

  if (!fs.existsSync(themeDir)) {
    logger.warn(`"${theme}" theme does not exists. Using "${defTheme}" theme`);
    themeDir = path.join(dir, defTheme);
  }

  return themeDir;
}

/**
 * Loads the primary theme path
 * The provided theme with `--theme` flag is preferred over index.yml
 */
export function loadPrimaryThemePath(): string {
  if (!themeDir) themeDir = loadThemeDir();
  const absTheme = globalNodyConfig.config.greeter.theme;
  const absThemeName = absTheme.split("/").pop();
  const dir = globalNodyConfig.app.theme_dir;
  const defTheme = "gruvbox";

  if (absThemeName?.endsWith(".html"))
    globalNodyConfig.theme.primary_html = absThemeName;

  const primary = globalNodyConfig.theme.primary_html;
  let pathToTheme = path.join(themeDir, primary);

  if (!pathToTheme.endsWith(".html"))
    pathToTheme = path.join(pathToTheme, "index.html");

  if (!fs.existsSync(pathToTheme)) {
    logger.warn(
      `"${pathToTheme}" theme does not exists. Using "${defTheme}" theme`
    );
    pathToTheme = path.join(dir, defTheme, "index.html");
  }

  globalNodyConfig.config.greeter.theme = pathToTheme;
  return pathToTheme;
}
/**
 * Loads the secondary theme path
 * This can only be set with index.yml, either it defaults to primary html
 */
export function loadSecondaryThemePath(): string {
  if (!themeDir) themeDir = loadThemeDir();
  const primary = globalNodyConfig.theme.primary_html;
  const secondary = globalNodyConfig.theme.secondary_html;
  let pathToTheme = path.join(themeDir, secondary || primary);

  if (!pathToTheme.endsWith(".html"))
    pathToTheme = path.join(pathToTheme, "index.html");

  if (!fs.existsSync(pathToTheme)) {
    logger.warn(
      `"${secondary}" does not exists. Using "${primary}" for secondary monitors`
    );
    pathToTheme = loadPrimaryThemePath();
  }

  return pathToTheme;
}

function validateConfig<T>(decoder: io_ts.Type<T>, obj: unknown): T {
  const decoded = decoder.decode(obj);
  if (isRight(decoded)) {
    return decoded.right;
  } else {
    const errors = decoded.left;
    let message = "";
    const fmErrors: { key: string; value: string; type: string }[] = [];
    for (let i = 0; i < errors.length; i++) {
      const context = errors[i].context;
      const type = context[context.length - 1].type.name;
      const key = context[context.length - 2].key;
      const value = errors[i].value;
      const canColor = process.stdout.isTTY && process.stdout.hasColors();
      const fmValue = util.inspect(value, { colors: canColor });

      const ind = fmErrors.findIndex((e) => e.key === key);
      if (ind == -1) {
        fmErrors.push({ key, value: fmValue, type });
      } else {
        fmErrors[ind].type += "|" + type;
      }
    }
    for (const err of fmErrors) {
      message += `{ ${err.key}: ${err.value} } couldn't be validated as (${err.type})\n`;
    }
    throw new Error(`Invalid config: ${message}`);
  }
}

/**
 * Loads the theme config inside "index.yml"
 */
export function loadThemeConfig(): void {
  if (!themeDir) themeDir = loadThemeDir();
  const pathToThemeConfig = path.join(themeDir, "index.yml");
  try {
    const file = fs.readFileSync(pathToThemeConfig, "utf-8");
    const themeConfig = yaml.load(file);

    globalNodyConfig.theme = validateConfig(THEME_CONFIG, themeConfig);
  } catch (err) {
    logger.warn(`Theme config was not loaded:\n\t${err}`);
    logger.debug("Using default theme config");
  }
}

/**
 * Ensures that the theme does exists
 * If it doesn't, default theme (gruvbox) is used
 */
export function ensureTheme(): void {
  if (!themeDir) themeDir = loadThemeDir();

  const primary = globalNodyConfig.theme.primary_html;
  const dir = globalNodyConfig.app.theme_dir;
  const defTheme = "gruvbox";

  const primaryExists = fs.existsSync(path.join(themeDir, primary));

  if (!primaryExists) {
    themeDir = path.join(dir, defTheme);
    loadThemeConfig();
  }
}

/**
 * Load web-greeter.yml config
 */
export function loadConfig(): void {
  try {
    const file = fs.readFileSync(pathToConfig, "utf-8");
    const webgConfig = yaml.load(file);

    globalNodyConfig.config = validateConfig(WEB_GREETER_CONFIG, webgConfig);
  } catch (err) {
    logger.error(`Config was not loaded:\n\t${err}`);
    logger.warn("Using default config");
  }
}

loadConfig();

export {};
