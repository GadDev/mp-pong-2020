import "./hud.css";
import type { GameState, StepEvents } from "../game/gameState";
import { Act, type PresentationFrame } from "../game/presentationState";
import type { ActivePrompt } from "../game/observation/ObservationDirector";
import { prefersReducedMotion } from "../motion";

/**
 * Under reduced motion the one-frame flicker is held this long instead —
 * same information, delivered as a state change rather than a flash.
 */
const REDUCED_FLICKER_HOLD_SECONDS = 0.5;

/**
 * MOODBOARD.md's Act 2 score flicker: "unfamiliar symbols… implying a
 * different, older, or non-human counting system underneath". This is the
 * *score digit* channel and stays symbolic — the readable text fragments
 * belong to the designation readout below, which is where LORE.md puts them.
 */
const CORRUPTED_LEFT = "§¤";
const CORRUPTED_RIGHT = "¤§";

/**
 * LORE.md's Act 2 designation fragments, verbatim. Deliberately bureaucratic
 * and boring: "the horror of THE DIVISION is that it's paperwork, not menace."
 * Cycled one per flicker so a first playthrough catches maybe one of them.
 */
const ACT_TWO_FRAGMENTS = [
  "SUBJECT / 47-KAPPA",
  "PATTERN VARIANCE: NOMINAL",
  "RECALIBRATING...",
];

/** LORE.md's Act 3 ambient corner tag — small, easy to miss, Act 3 only. */
const ACT_THREE_TAG = "EVAL-ID: 8841-C — ACTIVE";

/** Seconds a score flash holds. Green/red only, per MOODBOARD.md. */
const SCORE_FLASH_SECONDS = 0.5;

/** How long the control scheme hint stays up the first time a match starts. */
const CONTROLS_HINT_SECONDS = 5;

export class RevealHud {
  private readonly root: HTMLDivElement;
  private readonly scoreLabel: HTMLDivElement;
  private readonly score: HTMLDivElement;
  private readonly playerScore: HTMLSpanElement;
  private readonly operatorScore: HTMLSpanElement;
  private readonly designation: HTMLDivElement;
  private readonly panel: HTMLDivElement;
  private readonly feedTag: HTMLDivElement;
  private readonly interview: HTMLDivElement;
  private readonly interviewPrompt: HTMLDivElement;
  private readonly interviewLeft: HTMLSpanElement;
  private readonly interviewRight: HTMLSpanElement;
  private activePromptId: string | null = null;

  private playerFlash = 0;
  private operatorFlash = 0;
  private fragmentIndex = 0;
  /** Seconds left on the reduced-motion held flicker; unused otherwise. */
  private corruptHold = 0;
  /** Counts down once, from this HUD's construction — a match restart doesn't re-show it. */
  private controlsHintRemaining = CONTROLS_HINT_SECONDS;
  private readonly controlsHint: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "reveal-hud";

    // Act 3 relabels the score rather than replacing it — LORE.md: "the climax
    // replaces the *content* under that language, not the language itself."
    this.scoreLabel = document.createElement("div");
    this.scoreLabel.className = "reveal-hud__score-label";

    this.score = document.createElement("div");
    this.score.className = "reveal-hud__score";
    this.playerScore = document.createElement("span");
    this.operatorScore = document.createElement("span");
    const separator = document.createElement("span");
    separator.className = "reveal-hud__separator";
    separator.textContent = " : ";
    this.score.append(this.playerScore, separator, this.operatorScore);

    this.designation = document.createElement("div");
    this.designation.className = "reveal-hud__designation";

    this.panel = document.createElement("div");
    this.panel.className = "reveal-hud__panel";

    this.feedTag = document.createElement("div");
    this.feedTag.className = "reveal-hud__feed";
    this.feedTag.textContent = "FEED 3 — ARCHIVED";

    // Dev-only. BACKLOG.md requires a reveal re-trigger that is never surfaced
    // in a player-facing menu; this line is the discoverability for it.
    const debugHint = document.createElement("div");
    debugHint.className = "reveal-hud__debug";
    debugHint.textContent =
      "[dev] Esc: pause · 1/2/3: jump act · P: restart acts · ?debug=reveal: re-arm";

    // Player-facing, unlike `debugHint` — shown once, briefly, then gone for
    // the rest of the session rather than sitting permanently in the HUD.
    this.controlsHint = document.createElement("div");
    this.controlsHint.className = "reveal-hud__controls-hint reveal-hud__controls-hint--visible";
    this.controlsHint.textContent = "MOUSE  ·  W/S  ·  ↑/↓";

    // The interview — deliberately styled like the rest of the HUD's short,
    // stacked, monospace copy (the designation readout, the Act-2
    // fragments), not a dialog box or a questionnaire. `leftAnswer`/
    // `rightAnswer` (when a question has them) sit either side of the
    // prompt; whichever way the paddle is currently leaning brightens, so
    // the answer is something the player *does*, not a button they click.
    this.interview = document.createElement("div");
    this.interview.className = "reveal-hud__interview";
    this.interviewPrompt = document.createElement("div");
    this.interviewPrompt.className = "reveal-hud__interview-prompt";
    const interviewAnswers = document.createElement("div");
    interviewAnswers.className = "reveal-hud__interview-answers";
    this.interviewLeft = document.createElement("span");
    this.interviewRight = document.createElement("span");
    interviewAnswers.append(this.interviewLeft, this.interviewRight);
    this.interview.append(this.interviewPrompt, interviewAnswers);

    this.root.append(
      this.scoreLabel,
      this.score,
      this.designation,
      this.panel,
      this.feedTag,
      this.controlsHint,
      this.interview,
      debugHint,
    );
    container.appendChild(this.root);
  }

  /** Score events arrive from the simulation, so the flash can't drift out of sync with it. */
  registerEvents(events: StepEvents): void {
    if (events.playerScored) this.playerFlash = SCORE_FLASH_SECONDS;
    if (events.operatorScored) this.operatorFlash = SCORE_FLASH_SECONDS;
  }

  update(
    state: GameState,
    frame: PresentationFrame,
    watcherCut: boolean,
    dt: number,
  ): void {
    this.playerFlash = Math.max(0, this.playerFlash - dt);
    this.operatorFlash = Math.max(0, this.operatorFlash - dt);
    this.corruptHold = Math.max(0, this.corruptHold - dt);

    if (this.controlsHintRemaining > 0) {
      this.controlsHintRemaining = Math.max(0, this.controlsHintRemaining - dt);
      this.controlsHint.classList.toggle(
        "reveal-hud__controls-hint--visible",
        this.controlsHintRemaining > 0,
      );
    }

    // The Act 2 flicker is the one moment the digits aren't the score.
    //
    // `flickerPulse` is true for exactly one update, which is the correct
    // default and the whole point of moving it into the act machine. Under
    // reduced motion a one-frame swap *is* the strobe, so the same pulse is
    // stretched into a held, legible state change instead. The damping lives
    // here rather than in `presentationState`: that module is game logic and
    // must not know what the display prefers.
    const reduced = prefersReducedMotion();
    if (frame.act === Act.TWO && frame.flickerPulse && reduced) {
      this.corruptHold = REDUCED_FLICKER_HOLD_SECONDS;
    }
    const corrupted =
      frame.act === Act.TWO &&
      (reduced ? this.corruptHold > 0 : frame.flickerPulse);
    if (corrupted) {
      // Each side gets its own glyphs; the " : " separator between the two
      // spans stays put, so the corrupted state reads as the same layout with
      // unfamiliar numerals rather than as a different widget.
      this.playerScore.textContent = CORRUPTED_LEFT;
      this.operatorScore.textContent = CORRUPTED_RIGHT;
    } else {
      this.playerScore.textContent = String(state.playerScore);
      this.operatorScore.textContent = String(state.operatorScore);
    }

    // Green/red are reserved exclusively for this, in every act, so score
    // feedback stays legible however corrupted the surrounding HUD gets.
    this.playerScore.className = this.playerFlash > 0 ? "reveal-hud__gain" : "";
    this.operatorScore.className = this.operatorFlash > 0 ? "reveal-hud__loss" : "";

    this.score.classList.toggle("reveal-hud__score--corrupted", corrupted);
    this.score.classList.toggle("reveal-hud__score--act3", frame.act === Act.THREE);

    if (frame.act === Act.THREE) {
      this.scoreLabel.textContent = "ADAPTATION INDEX";
      this.scoreLabel.classList.add("reveal-hud__score-label--visible");
    } else {
      this.scoreLabel.textContent = "";
      this.scoreLabel.classList.remove("reveal-hud__score-label--visible");
    }

    this.updateDesignation(frame);
    this.updatePanel(state, frame);

    this.feedTag.classList.toggle(
      "reveal-hud__feed--visible",
      frame.act === Act.THREE && watcherCut,
    );
  }

  /**
   * `leanDirection` is null (no lean), "left", or "right" — `main.ts` derives
   * it from the same paddle position `ObservationDirector` reads, so the
   * brightened side always matches whichever way the commit is actually
   * about to land. `prompt` is null when there's nothing to show; this never
   * renders a raw telemetry number, an answer history, or a score of any kind.
   */
  updateInterview(prompt: ActivePrompt | null, leanDirection: "left" | "right" | null): void {
    if (!prompt) {
      this.activePromptId = null;
      this.interview.classList.remove("reveal-hud__interview--visible");
      return;
    }

    // Re-set text only when the prompt actually changes, so the fade-in
    // transition doesn't restart every frame a question just sits on screen.
    if (this.activePromptId !== prompt.id) {
      this.activePromptId = prompt.id;
      this.interviewPrompt.textContent = prompt.prompt;
      this.interviewLeft.textContent = prompt.leftAnswer ?? "";
      this.interviewRight.textContent = prompt.rightAnswer ?? "";
    }

    this.interviewLeft.classList.toggle("reveal-hud__interview-answer--active", leanDirection === "left");
    this.interviewRight.classList.toggle("reveal-hud__interview-answer--active", leanDirection === "right");
    this.interview.classList.add("reveal-hud__interview--visible");
  }

  private updateDesignation(frame: PresentationFrame): void {
    if (frame.act === Act.ONE) {
      // Deliberately sparse — no player name, no chrome — so its later
      // corruption reads as a real change rather than "more UI appearing".
      this.designation.textContent = "";
      this.designation.classList.remove("reveal-hud__designation--visible");
      return;
    }

    if (frame.act === Act.TWO) {
      if (frame.flickerPulse) {
        this.designation.textContent = ACT_TWO_FRAGMENTS[this.fragmentIndex];
        this.fragmentIndex = (this.fragmentIndex + 1) % ACT_TWO_FRAGMENTS.length;
      } else if (!this.designation.textContent) {
        this.designation.textContent = ACT_TWO_FRAGMENTS[0];
      }
      // Fades in a beat after the act starts, not on its first frame.
      this.designation.classList.toggle(
        "reveal-hud__designation--visible",
        frame.elapsedInAct > 2,
      );
      return;
    }

    this.designation.textContent = ACT_THREE_TAG;
    this.designation.classList.add("reveal-hud__designation--visible");
  }

  private updatePanel(state: GameState, frame: PresentationFrame): void {
    if (frame.act !== Act.THREE) {
      this.panel.classList.remove("reveal-hud__panel--visible");
      return;
    }

    // `totalRallies`, not `rallyLength`: LORE.md's `RESPONSE CYCLE 14` example
    // is a cumulative count, and a per-point counter would never leave 0-5.
    this.panel.textContent = [
      `RESPONSE CYCLE ${state.totalRallies}`,
      "THREAT ASSESSMENT: ACTIVE",
      "CLEARANCE: PENDING",
    ].join("\n");
    this.panel.classList.toggle(
      "reveal-hud__panel--visible",
      frame.elapsedInAct > 1.5,
    );
  }
}
