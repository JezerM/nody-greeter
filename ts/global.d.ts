import { Greeter, GreeterConfig, ThemeUtils } from "./bridge/bridge";

declare global {
  namespace NodeJS {
    interface Global {
      lightdm: Greeter;
      greeter_config: GreeterConfig;
      theme_utils: ThemeUtils;
    }
  }
}
export {};
