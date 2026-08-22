import "./hud.css";
import { Act } from "./timeline";
import { prefersReducedMotion } from "../motion";

const CORRUPTED_DIGITS = ["§", "¤", "0", ":", "0", "¤"];

/** How often the Act 2 score digits glitch, in seconds. */
const FLICKER_PERIOD_SECONDS = 2.4;

/**
 * Reduced motion replaces the one-frame strobe with a slow, held swap. Same
 * information — the digits are briefly wrong — delivered as a legible state
 * change instead of a flash.
 */
const REDUCED_FLICKER_HOLD_SECONDS = 0.5;

export class RevealHud {
  private readonly root: HTMLDivElement;
  private readonly score: HTMLDivElement;
  private readonly designation: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly actLabel: HTMLDivElement;

  // Flicker scheduling state. The previous implementation tested whether
  // `elapsedInAct % 2.4` fell inside a fixed ~50 ms window, which meant the
  // glitch lasted one frame at 20 fps, three at 60, and six at 120 — and
  // could be skipped entirely on a dropped frame. MOODBOARD.md specifies a
  // *single-frame* flicker, so the trigger is now an edge-detected period
  // crossing and the duration is counted in frames, not wall-clock.
  private lastFlickerPhase = 0;
  private flickerFramesRemaining = 0;
  private reducedFlickerUntil = 0;
  private lastAct: Act | null = null;

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

  /**
   * Edge-detects a flicker beat and returns whether the corrupted digits
   * should show on this frame. Split out from `update` so the (testable)
   * scheduling decision isn't tangled with DOM mutation.
   */
  private shouldFlicker(elapsedInAct: number): boolean {
    const phase = elapsedInAct % FLICKER_PERIOD_SECONDS;
    // A wrap means the period boundary was crossed since the last frame,
    // whatever the frame duration was.
    const crossed = phase < this.lastFlickerPhase;
    this.lastFlickerPhase = phase;

    if (prefersReducedMotion()) {
      if (crossed) {
        this.reducedFlickerUntil = elapsedInAct + REDUCED_FLICKER_HOLD_SECONDS;
      }
      return elapsedInAct < this.reducedFlickerUntil;
    }

    if (crossed) this.flickerFramesRemaining = 1;
    if (this.flickerFramesRemaining > 0) {
      this.flickerFramesRemaining -= 1;
      return true;
    }
    return false;
  }

  update(act: Act, elapsedInAct: number): void {
    this.actLabel.textContent = `ACT ${["I", "II", "III"][act]}`;

    // Jumping acts (debug keys, or a restart) rewinds `elapsedInAct` to zero,
    // which would otherwise read as a period crossing and fire a spurious
    // glitch on the first frame of the new act.
    if (act !== this.lastAct) {
      this.lastAct = act;
      this.lastFlickerPhase = 0;
      this.flickerFramesRemaining = 0;
      this.reducedFlickerUntil = 0;
    }

    if (act === Act.ONE) {
      this.score.className = "reveal-hud__score";
      this.score.textContent = "0 : 0";
      this.designation.className = "reveal-hud__designation";
      this.panel.className = "reveal-hud__panel";
      return;
    }

    if (act === Act.TWO) {
      // Single-frame flicker to unfamiliar symbols, once per period.
      const isFlickering = this.shouldFlicker(elapsedInAct);
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
