import "./presence.css";
import type { SpeechDrive } from "./face";
import type { PresenceBed } from "./bed";
import type { FragmentSpeaker } from "./speaker";
import { disposeSpeech, systemSpeaker } from "./tts";

type Fragment = { at: number; text: string; hold: number };

/**
 * What the presence "says." Three scripts, each run once and then silent:
 * `INTRO_MONOLOGUE` on the very first boot a device ever sees (see
 * `persistence.ts`'s `hasHeardIntroMonologue`), `BOOT_SCRIPT` on every load
 * after that, `RETURN_SCRIPT` — shorter, deliberately flatter — whenever the
 * player comes back to the menu from a match.
 *
 * `INTRO_MONOLOGUE` is the one deliberate exception to `LORE.md`'s "no
 * second-person copy, ever" — see `docs/EXPLORATION.md` §3 for the amendment
 * and the open question it leaves. It still stops short of the specific
 * violation named there: it never claims to recognise the player, never
 * says "welcome back," never implies memory across sessions — it addresses
 * "you" as whoever showed up *this* time, once, and then reverts to the
 * impersonal `BOOT_SCRIPT` register for good.
 */
const INTRO_MONOLOGUE: ReadonlyArray<Fragment> = [
  { at: 0.6, text: "You have arrived.", hold: 2.0 },
  { at: 3.0, text: "A connection has been made.", hold: 2.6 },
  { at: 6.0, text: "Every match here is measured.", hold: 2.6 },
  { at: 9.0, text: "You will not be told why.", hold: 2.6 },
  { at: 12.0, text: "You are welcome here.", hold: 2.2 },
  // 3.3, not 3.0: the pre-rendered reading of this line (`clips.ts`) runs
  // 2.99s, which left the text vanishing on the final syllable. Every other
  // hold already clears its audio comfortably.
  { at: 14.6, text: "That is not the same as being wanted.", hold: 3.3 },
  { at: 18.0, text: "Awaiting input.", hold: 1.8 },
];

/**
 * Register is otherwise fixed by `LORE.md`: clinical, bureaucratic, giving
 * away nothing. It states machine status — it never greets the player,
 * names them, or acknowledges them as a person. `EXPLORATION.md` §2 flags
 * "WELCOME BACK, SUBJECT" as a direct violation, because the interface
 * must have no memory the player can go looking for — `RETURN_SCRIPT`
 * reports on *itself*, never on the player or the match just played.
 */
const BOOT_SCRIPT: ReadonlyArray<Fragment> = [
  { at: 0.8, text: "SYSTEM READY.", hold: 1.5 },
  { at: 2.6, text: "CALIBRATING.", hold: 1.4 },
  { at: 4.3, text: "NO ANOMALIES DETECTED.", hold: 1.8 },
  { at: 6.4, text: "AWAITING INPUT.", hold: 1.6 },
];

const RETURN_SCRIPT: ReadonlyArray<Fragment> = [
  { at: 0.4, text: "STATE RESTORED.", hold: 1.4 },
  { at: 2.0, text: "AWAITING INPUT.", hold: 1.6 },
];

export type PresenceVoiceKind = "monologue" | "boot" | "return";

const SCRIPTS: Record<PresenceVoiceKind, ReadonlyArray<Fragment>> = {
  monologue: INTRO_MONOLOGUE,
  boot: BOOT_SCRIPT,
  return: RETURN_SCRIPT,
};

/** How long a script takes to finish — lets callers size a wait around it. */
export function scriptDurationSeconds(kind: PresenceVoiceKind): number {
  const script = SCRIPTS[kind];
  const last = script[script.length - 1];
  return last.at + last.hold;
}

export interface PresenceVoice {
  element: HTMLElement;
  /**
   * Runs the given script once; silent afterward until the next `start`.
   * `onComplete` fires when the script finishes on its own — not when
   * interrupted by a fresh `start` — so callers can persist "heard" state
   * without the early-write bug `hasSeenReveal` has (CLAUDE.md "Known
   * issues").
   *
   * `speaker` chooses how the lines are produced; it defaults to the system
   * `speechSynthesis` voice. The first-boot monologue passes a pre-rendered
   * one instead — see `presence/clips.ts`.
   */
  start(
    kind?: PresenceVoiceKind,
    onComplete?: () => void,
    speaker?: FragmentSpeaker,
  ): void;
  update(dt: number): void;
  /**
   * True while a fragment is on screen. Drives the visual brightening, and is
   * deliberately *not* what moves the mouth: a voice falling quiet partway
   * through a line shouldn't make the mark go dark.
   */
  isSpeaking(): boolean;
  /** What the mouth moves to. See `SpeechDrive` in `presence/face.ts`. */
  speechDrive(): SpeechDrive;
  dispose(): void;
}

/**
 * `readVolume` is a getter, not a number, so a player moving the Options
 * slider is honoured mid-script — it used to be latched at `start()`, which
 * meant the slider did nothing until the next script. It belongs here rather
 * than on `start()` because it's a property of the session: the bed hums
 * between scripts too, and a boot that skips the intro never calls `start()`
 * at all.
 *
 * `bed` is optional so the voice stays testable, and so a browser that refuses
 * an `AudioContext` outright doesn't take the fragments down with it.
 */
export function createPresenceVoice(
  readVolume: () => number,
  bed?: PresenceBed,
): PresenceVoice {
  const element = document.createElement("div");
  element.className = "presence-voice";

  const line = document.createElement("span");
  line.className = "presence-voice__line";
  element.append(line);

  let elapsed = 0;
  let running = false;
  let speaking = false;
  let speaker: FragmentSpeaker = systemSpeaker;
  let script: ReadonlyArray<Fragment> = BOOT_SCRIPT;
  let spoken: Set<string> = new Set();
  let onComplete: (() => void) | undefined;

  // Lip-sync state. `audible` is the truth about whether sound is being made;
  // the rest exists to notice when the speaker can't tell us.
  let audible = 0;
  let impulse = 0;
  let impulsesProven = false;
  let queuedAt: number | null = null;
  let startProven = false;
  /**
   * Bumped on every `start()`. Speaker callbacks are asynchronous and a cancel
   * does not unhook the ones already in flight, so a fragment from the script
   * being replaced can still report back afterwards. Reachable path: quitting
   * to the menu starts the `return` script while a boot or monologue line is
   * mid-utterance. A late `onEnd` is harmless (the count is clamped), but a
   * late `onStart` would increment `audible` for a line that will never make a
   * sound and nothing would ever decrement it — leaving the jaw latched open
   * for the rest of the session. Stamping each callback set with the
   * generation it belongs to closes the whole class, not just that instance.
   */
  let generation = 0;

  /**
   * Whether to give up on the speaker's own events and animate from the
   * fragment schedule instead. Needed because a muted or unsupported speaker
   * makes no sound at all, and because some `speechSynthesis` voices fire
   * neither `onstart` nor `onboundary` — a player on one of those must still
   * see a face that talks.
   */
  function inferring(): boolean {
    if (readVolume() <= 0) return true;
    if (queuedAt === null) return false;
    return !startProven && elapsed - queuedAt > 0.25;
  }

  return {
    element,
    start(
      kind: PresenceVoiceKind = "boot",
      completeCallback?: () => void,
      startSpeaker: FragmentSpeaker = systemSpeaker,
    ): void {
      speaker.cancel();
      generation += 1;
      elapsed = 0;
      running = true;
      speaker = startSpeaker;
      script = SCRIPTS[kind];
      spoken = new Set();
      onComplete = completeCallback;
      bed?.open();
      audible = 0;
      impulse = 0;
      impulsesProven = false;
      queuedAt = null;
      startProven = false;
    },
    update(dt: number): void {
      // Above the `running` guard on purpose: the hum is the presence being
      // powered on, not part of a script, so it has to stay audible — and
      // stay volume-responsive — in the silence between scripts.
      bed?.setVolume(readVolume());
      if (!running) return;
      elapsed += dt;

      const active = script.find(
        (fragment) =>
          elapsed >= fragment.at && elapsed < fragment.at + fragment.hold,
      );

      speaking = active !== undefined;
      if (active) {
        if (line.textContent !== active.text) line.textContent = active.text;
        line.classList.add("presence-voice__line--visible");
        if (!spoken.has(active.text)) {
          spoken.add(active.text);
          queuedAt = elapsed;
          bed?.tick();
          const gen = generation;
          const accepted = speaker.speak(active.text, readVolume(), {
            onStart: () => {
              if (gen !== generation) return;
              startProven = true;
              audible += 1;
            },
            // Clamped at zero as well as generation-guarded: a cancel can land
            // an `onEnd` with no matching `onStart`, and a negative count would
            // latch the mouth open for the rest of the script.
            onEnd: () => {
              if (gen !== generation) return;
              audible = Math.max(0, audible - 1);
            },
            onImpulse: () => {
              if (gen !== generation) return;
              impulsesProven = true;
              impulse += 1;
            },
          });
          // A speaker that declined the line will never report on it, so don't
          // sit waiting 250ms for events that aren't coming.
          if (!accepted) startProven = false;
        }
      } else {
        line.classList.remove("presence-voice__line--visible");
      }

      bed?.setVocalizing(inferring() ? speaking : audible > 0);

      const last = script[script.length - 1];
      if (elapsed > last.at + last.hold) {
        running = false;
        bed?.setVocalizing(false);
        bed?.close();
        onComplete?.();
      }
    },
    isSpeaking(): boolean {
      return speaking;
    },
    speechDrive(): SpeechDrive {
      if (inferring()) {
        return { active: speaking, impulse: 0, level: null };
      }
      return {
        active: audible > 0,
        impulse: impulsesProven ? impulse : 0,
        level: speaker.level(),
      };
    },
    dispose(): void {
      speaker.cancel();
      disposeSpeech();
      bed?.dispose();
      element.remove();
    },
  };
}
