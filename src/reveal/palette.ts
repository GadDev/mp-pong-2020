// Color tokens from MOODBOARD.md — shared by the scene, camera fog, and HUD.
export const VOID_BLACK = 0x0a0e14;
export const CYAN = 0x00f0ff;
export const DEEP_BLUE = 0x0057ff;
export const NEAR_WHITE = 0xe8fbff;
export const SMOG_PURPLE_BLACK = 0x1a1220;
export const MAGENTA = 0xff3d7a;
export const AMBER = 0xffb020;
export const VIOLET = 0x7a4fe0;
export const NEUTRAL_GRAY = 0xc8c8c8;

// MOODBOARD.md's "shared — void and signal" pair. Reserved *exclusively* for
// score feedback, in every act, so they stay instantly readable however much
// the surrounding HUD mutates. Do not reuse them for anything else.
export const SIGNAL_GREEN = "#00ffa0";
export const ALERT_RED = "#ff2d2d";
