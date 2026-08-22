// TECHSTACK.md: localStorage, two kinds of keys, nothing heavier. This file
// owns the user-preferences half (volume, skip-intro). `hasSeenReveal`
// arrives with Milestone 4, once there's a real reveal trigger to disarm.
const VOLUME_KEY = "mp-pong:volume";
const SKIP_INTRO_KEY = "mp-pong:skipIntro";

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
