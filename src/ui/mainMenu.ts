import "./theme.css";

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
  title.textContent = "PONG";

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

  return root;
}
