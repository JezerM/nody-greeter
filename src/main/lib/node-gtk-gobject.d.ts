declare module "node-gtk" {
  export namespace GObject {
    class Object {}

    export interface GObject {
      Object: typeof Object;
    }
  }
  export function require(name: "GObject", version: "2.0"): GObject.GObject;
}
