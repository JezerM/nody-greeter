/**
 * Constant values shared across the application
 *
 * (used by both backend (node) Node frontend (browser-window) code)
 */
export const CONSTS = {
  channel: {
    lightdm_signal: "LightDMSignal",
    window_metadata: "WindowMetadata",
    window_broadcast: "WindowBroadcast",
  },
} as const;
