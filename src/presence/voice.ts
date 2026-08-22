import "./presence.css";

/**
 * What the presence "says" at boot. Two fragments, then silence.
 *
 * Register is fixed by `LORE.md`: clinical, bureaucratic, giving away
 * nothing. It states machine status — it never greets the player, names
 * them, or acknowledges them as a person. `EXPLORATION.md` §2 flags
 * "WELCOME BACK, SUBJECT" as a direct violation, because the interface
 * must have no memory the player can go looking for.
 */
const SCRIPT: ReadonlyArray<{ at: number; text: string; hold: number }> = [
  { at: 0.8, text: "SYSTEM READY.", hold: 1.5 },
  { at: 2.6, text: "AWAITING INPUT.", hold: 1.6 },
];

export interface PresenceVoice {
  element: HTMLElement;
  /** Runs the boot fragments once; silent for the rest of the session. */
  start(): void;
  update(dt: number): void;
  /** True while a fragment is on screen — drives the edge brightening. */
  isSpeaking(): boolean;
  dispose(): void;
}

export function createPresenceVoice(): PresenceVoice {
  const element = document.createElement("div");
  element.className = "presence-voice";

  const line = document.createElement("span");
  line.className = "presence-voice__line";
  element.append(line);

  let elapsed = 0;
  let running = false;
  let speaking = false;

  return {
    element,
    start(): void {
      elapsed = 0;
      running = true;
    },
    update(dt: number): void {
      if (!running) return;
      elapsed += dt;

      const active = SCRIPT.find(
        (fragment) =>
          elapsed >= fragment.at && elapsed < fragment.at + fragment.hold,
      );

      speaking = active !== undefined;
      if (active) {
        if (line.textContent !== active.text) line.textContent = active.text;
        line.classList.add("presence-voice__line--visible");
      } else {
        line.classList.remove("presence-voice__line--visible");
      }

      const last = SCRIPT[SCRIPT.length - 1];
      if (elapsed > last.at + last.hold) running = false;
    },
    isSpeaking(): boolean {
      return speaking;
    },
    dispose(): void {
      element.remove();
    },
  };
}
