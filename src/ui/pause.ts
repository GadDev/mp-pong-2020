import "./theme.css";

export interface PauseOverlayOptions {
  onResume: () => void;
  onRestart: () => void;
  onQuitToMenu: () => void;
}

/**
 * MOODBOARD.md: the game scene stays visible but dimmed (a semi-transparent
 * void-black scrim, not a full cut to a separate screen) — "the world
 * paused," not "you left the game."
 */
export function createPauseOverlay({
  onResume,
  onRestart,
  onQuitToMenu,
}: PauseOverlayOptions): HTMLElement {
  const root = document.createElement("div");
  root.className = "screen screen--scrim";

  const title = document.createElement("div");
  title.className = "screen__title";
  title.style.fontSize = "28px";
  title.textContent = "PAUSED";

  const list = document.createElement("div");
  list.className = "menu-list";

  const resume = document.createElement("button");
  resume.className = "menu-item";
  resume.textContent = "Resume";
  resume.addEventListener("click", onResume);

  const restart = document.createElement("button");
  restart.className = "menu-item";
  restart.textContent = "Restart";
  restart.addEventListener("click", onRestart);

  const quit = document.createElement("button");
  quit.className = "menu-item";
  quit.textContent = "Quit to Menu";
  quit.addEventListener("click", onQuitToMenu);

  list.append(resume, restart, quit);
  root.append(title, list);

  return root;
}
