import "./theme.css";
import { GAME_TITLE } from "./title";

export interface IntroScreenOptions {
  onSkip: () => void;
  /** How long to wait before auto-advancing — sized by the caller to match
   * whichever presence voice script (`presence/voice.ts`) is playing, since
   * the first-ever-boot monologue runs much longer than the regular one. */
  autoAdvanceMs: number;
}

/**
 * MOODBOARD.md: a few seconds of void black with a static logo fading in —
 * no grid yet, nothing that telegraphs Act 1's arena. Skip prompt appears
 * after a beat, not instantly, and any key/click skips.
 */
export function createIntroScreen({
  onSkip,
  autoAdvanceMs,
}: IntroScreenOptions): HTMLElement {
  const root = document.createElement("div");
  // Transparent so the pre-game presence (src/presence/) shows through, and
  // `--void` on top of it to drop the grid image, per MOODBOARD.md's "nothing
  // that telegraphs the arena." `--void` also stops the line-scroll animation,
  // which is why this is two classes rather than an inline `backgroundImage`:
  // an inline style can't be switched off by the reduced-motion media query.
  root.className = "screen screen--transparent screen--void";

  const title = document.createElement("div");
  title.className = "screen__title screen__title--intro";
  title.textContent = GAME_TITLE;

  const hint = document.createElement("div");
  hint.className = "screen__hint";
  hint.textContent = "PRESS ANY KEY TO SKIP";

  root.append(title, hint);

  requestAnimationFrame(() => {
    title.classList.add("screen__title--shown");
  });

  const skipDelayTimer = setTimeout(() => {
    hint.classList.add("screen__hint--visible");
  }, 1500);

  // "A few seconds," not an indefinite wait — an idle player still reaches
  // the menu rather than being stuck on the logo forever.
  const autoAdvanceTimer = setTimeout(skip, autoAdvanceMs);

  function skip(): void {
    clearTimeout(skipDelayTimer);
    clearTimeout(autoAdvanceTimer);
    window.removeEventListener("keydown", skip);
    root.removeEventListener("click", skip);
    onSkip();
  }
  window.addEventListener("keydown", skip);
  root.addEventListener("click", skip);

  return root;
}
