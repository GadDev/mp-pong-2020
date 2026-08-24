import type { FragmentSpeaker, SpeechHandlers } from "./speaker";

/**
 * Speaks the presence's fragments aloud via the browser's built-in
 * `speechSynthesis` — the every-device path, used for the boot and return
 * scripts and as the fallback for the first-boot monologue when its
 * pre-rendered audio can't load (`clips.ts`).
 *
 * A flat, artifact-y system voice is the right register here: it keeps the
 * presence reading as a function reporting status rather than a character
 * talking to the player, which is what the eventual reveal (`LORE.md`:
 * "OPERATOR was a stand-in for the developer") needs to still land.
 *
 * `rate`/`pitch` are pushed well off 1.0 for that register, and that is nearly
 * the whole toolkit: `speechSynthesis` exposes no MediaStream, so its output
 * cannot be routed through Web Audio for filtering. That single limitation is
 * why `bed.ts` exists — the character has to come from a layer we authored,
 * because this one can't be coloured. It's also why the monologue is
 * pre-rendered: this path's register is whatever voice the device happens to
 * ship, and the monologue plays once ever.
 */

const RATE = 0.8;
const PITCH = 0.65;

let voices: SpeechSynthesisVoice[] = [];
let voicesReady = false;

const supported = typeof window !== "undefined" && "speechSynthesis" in window;

function refreshVoices(): void {
  voices = window.speechSynthesis?.getVoices() ?? [];
  voicesReady = voices.length > 0;
}

if (supported) {
  refreshVoices();
  window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (!voicesReady) refreshVoices();
  if (voices.length === 0) return null;
  // Prefer a plain local system voice over a "premium"/neural one — more
  // synthetic-sounding is more mysterious here, not a compromise.
  const local = voices.find(
    (v) =>
      v.localService &&
      /en/i.test(v.lang) &&
      !/natural|premium|neural/i.test(v.name),
  );
  return local ?? voices.find((v) => /en/i.test(v.lang)) ?? voices[0];
}

/**
 * Speaks a line aloud. `speak()` is always called immediately, regardless of
 * whether a user gesture has happened yet — Chrome/Safari's autoplay policy
 * does not stop the utterance from being *queued*, it just leaves it paused
 * until a gesture calls `resume()`. Withholding the `speak()` call itself
 * (an earlier version of this file did) is the wrong fix: the browser's own
 * queue is what preserves line order across several calls made before that
 * first gesture. A single JS-side "pending" slot only ever remembers the
 * last one and silently drops the rest.
 *
 * Note that `volume` is read when the utterance is created and cannot be
 * changed once it is speaking — a mid-line volume change lands on the next
 * fragment. `bed.ts` applies volume live, so the two don't behave identically
 * and that is inherent to this API rather than an oversight.
 */
export function speak(
  text: string,
  volume: number,
  handlers: SpeechHandlers = {},
): boolean {
  if (!supported) return false;
  if (volume <= 0) return false;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = RATE;
  utterance.pitch = PITCH;
  utterance.volume = volume;
  const voice = pickVoice();
  if (voice) utterance.voice = voice;

  // `onstart` is the only reliable signal that sound is actually being made:
  // before the first gesture the utterance sits queued-but-paused, so the
  // fragment being on screen says nothing about whether anything is audible.
  utterance.onstart = () => handlers.onStart?.();
  utterance.onend = () => handlers.onEnd?.();
  utterance.onerror = () => handlers.onEnd?.();
  // Support is uneven — Safari and some voices never fire this — which is why
  // `voice.ts` keeps a fallback rather than assuming impulses will arrive.
  utterance.onboundary = () => handlers.onImpulse?.();

  window.speechSynthesis.speak(utterance);
  // No-op once already resumed; before the first real gesture this is what
  // lets a queued utterance actually start as soon as one occurs.
  window.speechSynthesis.resume();
  return true;
}

function onGesture(): void {
  window.speechSynthesis?.resume();
}
if (typeof window !== "undefined") {
  window.addEventListener("pointerdown", onGesture);
  window.addEventListener("keydown", onGesture);
}

// Chrome has a long-standing bug where `speechSynthesis` silently pauses
// itself after ~15s of continuous speech (https://crbug.com/679437-adjacent
// reports). A cheap periodic resume while anything is queued/speaking works
// around it without needing to know which utterance is "current."
let keepAlive: ReturnType<typeof setInterval> | null = null;
if (supported) {
  keepAlive = setInterval(() => {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.resume();
    }
  }, 4000);
}

export function cancelSpeech(): void {
  window.speechSynthesis?.cancel();
}

/** Releases the keep-alive timer and the gesture listeners. */
export function disposeSpeech(): void {
  cancelSpeech();
  if (keepAlive !== null) {
    clearInterval(keepAlive);
    keepAlive = null;
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("pointerdown", onGesture);
    window.removeEventListener("keydown", onGesture);
  }
}

/** `speechSynthesis` produces no analysable signal, so `level` is always null. */
export const systemSpeaker: FragmentSpeaker = {
  speak,
  level: () => null,
  cancel: cancelSpeech,
};
