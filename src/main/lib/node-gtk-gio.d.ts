declare module "node-gtk" {
  export namespace Gio {
    abstract class AsyncResult {}
    class Task implements AsyncResult {}
    class SimpleAsyncResult implements AsyncResult {}
    class Cancellable {}

    export interface Gio {
      Cancellable: typeof Cancellable;
      Task: typeof Task;
      SimpleAsyncResult: typeof SimpleAsyncResult;
      AsyncResult: typeof AsyncResult;
    }
  }
  export function require(name: "Gio", version: "2.0"): Gio.Gio;
}
