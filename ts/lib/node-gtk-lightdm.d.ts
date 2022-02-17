/*
 * TODO: remove once @types/node-gtk exists
 * (or an equivalent that provides the lightdm specific types).
 *
 * It is unlikely that a library such as @types/node-gtk will be sufficient to
 * provide safe types, as the types exposed by `node-gtk` depend on the gobject
 * library that is being used. However if separate `.d.ts` libraries are made
 * available for different gobject libraries, then that would work.
 */

declare module "node-gtk" {
  /**
   * Namespace for all LightDM related types.
   */
  export namespace LightDM {
    class LightDMGreeter {
      connectToDaemon(
        cancellable?: Gio.Cancellable | null,
        callback?:
          | ((
              object: GObject.Object,
              res: Gio.AsyncResult,
              user_data: unknown
            ) => void)
          | null,
        user_data?: unknown
      ): void;
      connectToDaemonFinish(result: Gio.AsyncResult): boolean;
      connectToDaemonSync(): boolean;
      ensureSharedDataDir(
        name: string,
        cancellable?: Gio.Cancellable | null,
        callback?:
          | ((
              object: GObject.Object,
              res: Gio.AsyncResult,
              user_data: unknown
            ) => void)
          | null,
        user_data?: unknown
      ): void;
      ensureSharedDataDirSync(name: string): string;
      ensureSharedDataDirFinish(result: Gio.AsyncResult): boolean;
      getLockHint(): boolean;
      getAuthenticationUser(): string | undefined;
      getAutologinGuestHint(): boolean;
      getAutologinTimeoutHint(): number;
      getAutologinUserHint(): string;
      getDefaultSessionHint(): string;
      getHasGuestAccountHint(): boolean;
      getHideUsersHint(): boolean;
      getInAuthentication(): boolean;
      getIsAuthenticated(): boolean;
      getSelectGuestHint(): boolean;
      getSelectUserHint(): string;
      getShowManualLoginHint(): boolean;
      getShowRemoteLoginHint(): boolean;

      connect(ev: "authentication-complete", handler: () => void);
      connect(ev: "autologin-timer-expired", handler: () => void);
      connect(
        ev: "show-message",
        handler: (text: string, type: number) => void
      );
      connect(ev: "show-prompt", handler: (text: string, type: number) => void);
      connect(ev: "idle", handler: () => void);
      connect(ev: "reset", handler: () => void);

      authenticate(username: string | null): boolean;
      authenticateAsGuest(): boolean;
      cancelAuthentication(): boolean;
      cancelAutologin(): boolean;
      respond(prompt: string);
      setLanguage(language: string);
      setResettable(resettable: boolean): void;
      startSession(
        session: string | null,
        cancellable?: Gio.Cancellable | null,
        callback?:
          | ((
              object: GObject.Object,
              res: Gio.AsyncResult,
              user_data: unknown
            ) => void)
          | null,
        user_data?: unknown
      ): boolean;
      startSessionSync(session: string | null): boolean;
    }

    export type { LightDMGreeter };

    export interface LightDMUser {
      background: string;
      displayName: string;
      hasMessages: boolean;
      homeDirectory: string;
      image: string;
      language: string;
      layout: string;
      layouts: string[];
      loggedIn: boolean;
      name: string;
      realName: string;
      session: string;
      uid: number;

      getBackground(): string;
      getDisplayName(): string;
      getHasMessages(): boolean;
      getHomeDirectory(): string;
      getImage(): string;
      getLanguage(): string;
      getLayout(): string;
      getLayouts(): string[];
      getLoggedIn(): boolean;
      getName(): string;
      getRealName(): string;
      getSession(): string;
      getUid(): number;
    }

    class LightDMUserList {
      length: number;

      getUsers(): LightDMUser[];
      getLength(): number;
      getUserByName(username: string): LightDMUser | null;
      connect(ev: "user-added", handler: (user: LightDMUser) => void);
      connect(ev: "user-changed", handler: (user: LightDMUser) => void);
      connect(ev: "user-removed", handler: (user: LightDMUser) => void);
    }

    export type { LightDMUserList };

    class LightDMLanguage {
      constructor(language: { code: string });
      code: string;
      name: string;
      territory: string;

      getCode(): string;
      getName(): string;
      getTerritory(): string;
      matches(code: string): boolean;
    }

    export type { LightDMLanguage };

    export interface LightDMSession {
      comment: string;
      key: string;
      name: string;

      getComment(): string;
      getKey(): string;
      getName(): string;
      getSessionType(): string;
    }

    class LightDMLayout {
      constructor(layout: {
        name: string;
        description: string;
        short_description: string;
      });
      name: string;
      description: string;
      short_description: string;

      getDescription(): string;
      getName(): string;
      getShortDescription(): string;
    }

    export type { LightDMLayout };

    export interface LightDM {
      Greeter: typeof LightDMGreeter;
      UserList: typeof LightDMUserList;
      Layout: typeof LightDMLayout;
      getCanHibernate(): boolean;
      getCanRestart(): boolean;
      getCanShutdown(): boolean;
      getCanSuspend(): boolean;
      getHostname(): string;
      getLanguage(): LightDMLanguage;
      getLanguages(): LightDMLanguage[];
      getLayout(): LightDMLayout;
      getLayouts(): LightDMLayout[];
      setLayout(layout: LightDMLayout): void;
      getMotd(): string | null;
      getOsName(): string | null;
      getOsId(): string | null;
      getOsPrettyName(): string | null;
      getOsVersion(): string | null;
      getOsVersionId(): string | null;
      getRemoteSessions(): LightDMSession[];
      getSessions(): LightDMSession[];
      hibernate(): boolean;
      restart(): boolean;
      shutdown(): boolean;
      suspend(): boolean;
    }
  }

  export function require(name: "LightDM", version: "1"): LightDM.LightDM;
}
