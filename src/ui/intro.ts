import "./theme.css";

export interface IntroScreenOptions {
  onSkip: () => void;
}

/**
 * MOODBOARD.md: a few seconds of void black with a static logo fading in —
 * no grid yet, nothing that telegraphs Act 1's arena. Skip prompt appears
 * after a beat, not instantly, and any key/click skips.
 */
export function createIntroScreen({ onSkip }: IntroScreenOptions): HTMLElement {
  const root = document.createElement("div");
  // Transparent so the pre-game presence (src/presence/) shows through; no
  // grid lines here, per MOODBOARD.md's "nothing that telegraphs the arena."
  root.className = "screen screen--transparent";
  root.style.backgroundImage = "none";

  const title = document.createElement("div");
  title.className = "screen__title";
  title.textContent = "PONG";
  title.style.opacity = "0";
  title.style.transition = "opacity 1.2s ease";

  const hint = document.createElement("div");
  hint.className = "screen__hint";
  hint.textContent = "PRESS ANY KEY TO SKIP";

  root.append(title, hint);

  requestAnimationFrame(() => {
    title.style.opacity = "1";
  });

  const skipDelayTimer = setTimeout(() => {
    hint.classList.add("screen__hint--visible");
  }, 1500);

  // "A few seconds," not an indefinite wait — an idle player still reaches
  // the menu rather than being stuck on the logo forever.
  const autoAdvanceTimer = setTimeout(skip, 4500);

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
