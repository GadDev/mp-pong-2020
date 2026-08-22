// TECHSTACK.md: localStorage, two kinds of keys, nothing heavier — the
// user-preferences half (volume, skip-intro) plus the one piece of
// progression state the design admits, `hasSeenReveal`. Mid-match state is
// deliberately never persisted (ROADMAP.md M2: Continue is page-session only).
const VOLUME_KEY = "mp-pong:volume";
const SKIP_INTRO_KEY = "mp-pong:skipIntro";
const HAS_SEEN_REVEAL_KEY = "mp-pong:hasSeenReveal";

const DEFAULT_VOLUME = 0.7;

export function getVolume(): number {
  const stored = localStorage.getItem(VOLUME_KEY);
  if (stored === null) return DEFAULT_VOLUME;
  const parsed = Number(stored);
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : DEFAULT_VOLUME;
}

export function setVolume(volume: number): void {
  localStorage.setItem(VOLUME_KEY, String(Math.min(1, Math.max(0, volume))));
}

export function getSkipIntro(): boolean {
  return localStorage.getItem(SKIP_INTRO_KEY) === "true";
}

export function setSkipIntro(skip: boolean): void {
  localStorage.setItem(SKIP_INTRO_KEY, String(skip));
}

/**
 * ROADMAP.md M4: set the first time the escalation trigger fires, and checked
 * by every subsequent New Game to decide whether escalation is armed at all.
 * The reveal is discoverable exactly once per device and there is deliberately
 * no player-facing route back — the dev-only `?debug=reveal` flag is the only
 * override, and it is never surfaced in a menu.
 */
export function getHasSeenReveal(): boolean {
  return localStorage.getItem(HAS_SEEN_REVEAL_KEY) === "true";
}

export function setHasSeenReveal(seen: boolean): void {
  localStorage.setItem(HAS_SEEN_REVEAL_KEY, String(seen));
}
