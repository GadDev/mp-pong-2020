import "./hud.css";
import { Act } from "./timeline";

const CORRUPTED_DIGITS = ["§", "¤", "0", ":", "0", "¤"];

export class RevealHud {
  private readonly root: HTMLDivElement;
  private readonly score: HTMLDivElement;
  private readonly designation: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly actLabel: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "reveal-hud";

    this.score = document.createElement("div");
    this.score.className = "reveal-hud__score";
    this.score.textContent = "0 : 0";

    this.designation = document.createElement("div");
    this.designation.className = "reveal-hud__designation";
    this.designation.textContent = "SUBJECT ID: ??????";

    this.panel = document.createElement("div");
    this.panel.className = "reveal-hud__panel";
    this.panel.textContent =
      "THREAT ASSESSMENT ACTIVE\nSTATUS: OBSERVED\nCLEARANCE: PENDING";

    this.actLabel = document.createElement("div");
    this.actLabel.className = "reveal-hud__act-label";

    const debugHint = document.createElement("div");
    debugHint.className = "reveal-hud__debug";
    debugHint.textContent =
      "[spike] Esc: pause · P: replay reveal · 1/2/3: jump act · H: hit blip";

    this.root.append(
      this.score,
      this.designation,
      this.panel,
      this.actLabel,
      debugHint,
    );
    container.appendChild(this.root);
  }

  update(act: Act, elapsedInAct: number): void {
    this.actLabel.textContent = `ACT ${["I", "II", "III"][act]}`;

    if (act === Act.ONE) {
      this.score.className = "reveal-hud__score";
      this.score.textContent = "0 : 0";
      this.designation.className = "reveal-hud__designation";
      this.panel.className = "reveal-hud__panel";
      return;
    }

    if (act === Act.TWO) {
      // Single-frame flicker to unfamiliar symbols, roughly once every couple seconds.
      const flickerWindow = elapsedInAct % 2.4;
      const isFlickering = flickerWindow > 2.3 && flickerWindow < 2.35;
      this.score.className = isFlickering
        ? "reveal-hud__score reveal-hud__score--corrupted"
        : "reveal-hud__score";
      this.score.textContent = isFlickering
        ? CORRUPTED_DIGITS.join("")
        : "0 : 0";

      this.designation.className =
        elapsedInAct > 2
          ? "reveal-hud__designation reveal-hud__designation--visible"
          : "reveal-hud__designation";
      this.panel.className = "reveal-hud__panel";
      return;
    }

    // Act III — denser amber/magenta interface, score language shifted.
    this.score.className = "reveal-hud__score reveal-hud__score--act3";
    this.score.textContent = "THREATS : 0";
    this.designation.className =
      "reveal-hud__designation reveal-hud__designation--visible";
    this.panel.className =
      elapsedInAct > 1.5
        ? "reveal-hud__panel reveal-hud__panel--visible"
        : "reveal-hud__panel";
  }
}
