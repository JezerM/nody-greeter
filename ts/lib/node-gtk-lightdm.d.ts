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
      connectToDaemonSync(): void;
      ensureSharedDataDirSync(name: string): string;
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
      startSessionSync(session: string | null): boolean;
    }

    export type { LightDMGreeter };

    export interface LightDMUser {
      name: string;
      getBackground(): string;
      getDisplayName(): string;
      getHomeDirectory(): string;
      getImage(): string;
      getLanguage(): string;
      getLayout(): string;
      getLayouts(): string[];
      getLoggedIn(): boolean;
      getSession(): string;
      getName(): string;
    }

    class LightDMUserList {
      getUsers(): LightDMUser[];
    }

    export type { LightDMUserList };

    export interface LightDMLanguage {
      getCode(): string;
      getName(): string;
      getTerritory(): string;
    }

    export interface LightDMSession {
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
      getRemoteSessions(): LightDMSession[];
      getSessions(): LightDMSession[];
      hibernate(): boolean;
      restart(): boolean;
      shutdown(): boolean;
      suspend(): boolean;
    }
  }

  export function require(name: "LightDM", version: "1"): LightDM.LightDM;
  export function require(name: "LightDM2", version: "1"): LightDM.LightDM;
}
