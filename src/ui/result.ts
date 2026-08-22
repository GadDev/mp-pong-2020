import "./theme.css";
import "./result.css";

export interface ResultOptions {
  playerScore: number;
  operatorScore: number;
  won: boolean;
  onDismiss: () => void;
}

/**
 * The outcome of a match that did *not* escalate — which, after the reveal has
 * been seen once, is every match on that device forever. Without this the
 * canvas simply vanishes and the menu returns, and the player is never told
 * whether they won: a regression against the 2020 original's win screen and
 * against ROADMAP.md M3's "plays a full game to the winning score".
 *
 * Deliberately as sparse as `pause.ts`. Green/red carry the outcome because
 * MOODBOARD.md reserves them for score feedback and this is the terminal score
 * feedback. Says nothing about a twist, in either direction — per BACKLOG.md,
 * the interface has no memory a player can go looking for.
 *
 * Not used for the escalated path: that resolves to the dossier instead, and
 * stays undifferentiated by winner on purpose.
 */
export function createResultScreen({
  playerScore,
  operatorScore,
  won,
  onDismiss,
}: ResultOptions): HTMLElement {
  const root = document.createElement("div");
  root.className = "screen screen--scrim";

  const verdict = document.createElement("div");
  verdict.className = `screen__title result__verdict result__verdict--${won ? "won" : "lost"}`;
  verdict.textContent = won ? "YOU WIN" : "OPERATOR WINS";

  const score = document.createElement("div");
  score.className = "result__score";
  score.textContent = `${playerScore} : ${operatorScore}`;

  const dismiss = document.createElement("button");
  dismiss.className = "menu-item";
  dismiss.textContent = "Continue";
  dismiss.addEventListener("click", onDismiss);

  root.append(verdict, score, dismiss);
  return root;
}
