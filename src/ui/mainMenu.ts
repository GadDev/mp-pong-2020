import "./theme.css";
import { GAME_TITLE } from "./title";

export interface MainMenuOptions {
  canContinue: boolean;
  onNewGame: () => void;
  onContinue: () => void;
  onOptions: () => void;
}

/**
 * MOODBOARD.md: title screen and main menu are the same screen — void
 * black, faint cyan grid, stylized title, plain cyan monospace options
 * below with a thin underline on the focused item.
 */
export function createMainMenu({
  canContinue,
  onNewGame,
  onContinue,
  onOptions,
}: MainMenuOptions): HTMLElement {
  const root = document.createElement("div");
  root.className = "screen";

  const title = document.createElement("div");
  title.className = "screen__title";
  title.textContent = GAME_TITLE;

  const list = document.createElement("div");
  list.className = "menu-list";

  const newGame = document.createElement("button");
  newGame.className = "menu-item";
  newGame.textContent = "New Game";
  newGame.addEventListener("click", onNewGame);

  const continueGame = document.createElement("button");
  continueGame.className = "menu-item";
  continueGame.textContent = "Continue";
  continueGame.disabled = !canContinue;
  continueGame.addEventListener("click", onContinue);

  const options = document.createElement("button");
  options.className = "menu-item";
  options.textContent = "Options";
  options.addEventListener("click", onOptions);

  list.append(newGame, continueGame, options);
  root.append(title, list);

  // The focus underline is the menu's only affordance (MOODBOARD.md: no
  // boxes, no panels), so something must be focused for the screen to read as
  // interactive at all. Focus lands on the first *enabled* item — Continue is
  // disabled on a fresh load, and focusing a disabled control shows no
  // underline, which would look like a dead screen.
  requestAnimationFrame(() => {
    (canContinue ? continueGame : newGame).focus();
  });

  return root;
}
