import { Greeter, GreeterConfig, ThemeUtils } from "./main/bridge/bridge";

declare global {
  /* eslint-disable no-var */
  var lightdmGreeter: Greeter;
  var greeterConfigGreeter: GreeterConfig;
  var themeUtilsGreeter: ThemeUtils;
}
export {};
