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
      public connectToDaemon(
        cancellable?: Gio.Cancellable | null,
        callback?:
          | ((
              object: GObject.Object,
              res: Gio.AsyncResult,
              user_data: unknown
            ) => void)
          | null,
        userData?: unknown
      ): void;
      public connectToDaemonFinish(result: Gio.AsyncResult): boolean;
      public connectToDaemonSync(): boolean;
      public ensureSharedDataDir(
        name: string,
        cancellable?: Gio.Cancellable | null,
        callback?:
          | ((
              object: GObject.Object,
              res: Gio.AsyncResult,
              user_data: unknown
            ) => void)
          | null,
        userData?: unknown
      ): void;
      public ensureSharedDataDirSync(name: string): string;
      public ensureSharedDataDirFinish(result: Gio.AsyncResult): boolean;
      public getLockHint(): boolean;
      public getAuthenticationUser(): string | undefined;
      public getAutologinGuestHint(): boolean;
      public getAutologinTimeoutHint(): number;
      public getAutologinUserHint(): string;
      public getDefaultSessionHint(): string;
      public getHasGuestAccountHint(): boolean;
      public getHideUsersHint(): boolean;
      public getInAuthentication(): boolean;
      public getIsAuthenticated(): boolean;
      public getSelectGuestHint(): boolean;
      public getSelectUserHint(): string;
      public getShowManualLoginHint(): boolean;
      public getShowRemoteLoginHint(): boolean;

      public connect(ev: "authentication-complete", handler: () => void);
      public connect(ev: "autologin-timer-expired", handler: () => void);
      public connect(
        ev: "show-message",
        handler: (text: string, type: number) => void
      );
      public connect(
        ev: "show-prompt",
        handler: (text: string, type: number) => void
      );
      public connect(ev: "idle", handler: () => void);
      public connect(ev: "reset", handler: () => void);

      public authenticate(username: string | null): boolean;
      public authenticateAsGuest(): boolean;
      public cancelAuthentication(): boolean;
      public cancelAutologin(): boolean;
      public respond(prompt: string);
      public setLanguage(language: string);
      public setResettable(resettable: boolean): void;
      public startSession(
        session: string | null,
        cancellable?: Gio.Cancellable | null,
        callback?:
          | ((
              object: GObject.Object,
              res: Gio.AsyncResult,
              user_data: unknown
            ) => void)
          | null,
        userData?: unknown
      ): boolean;
      public startSessionSync(session: string | null): boolean;
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
      public length: number;

      public getUsers(): LightDMUser[];
      public getLength(): number;
      public getUserByName(username: string): LightDMUser | null;
      public connect(ev: "user-added", handler: (user: LightDMUser) => void);
      public connect(ev: "user-changed", handler: (user: LightDMUser) => void);
      public connect(ev: "user-removed", handler: (user: LightDMUser) => void);
    }

    export type { LightDMUserList };

    class LightDMLanguage {
      public constructor(language: { code: string });
      public code: string;
      public name: string;
      public territory: string;

      public getCode(): string;
      public getName(): string;
      public getTerritory(): string;
      public matches(code: string): boolean;
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
      public constructor(layout: {
        name: string;
        description: string;
        short_description: string;
      });
      public name: string;
      public description: string;
      public shortDescription: string;

      public getDescription(): string;
      public getName(): string;
      public getShortDescription(): string;
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
