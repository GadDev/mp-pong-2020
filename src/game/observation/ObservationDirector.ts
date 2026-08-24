import { COURT_HALF_WIDTH, PADDLE_HALF_WIDTH, type GameState } from "../gameState";
import { Act, type PresentationFrame } from "../presentationState";
import { INTERVIEW_QUESTIONS, type AnswerDirection, type InterviewQuestion } from "./interviewQuestions";
import { BEHAVIOR_OBSERVATIONS } from "./behaviorObservations";
import type { PlayerBehaviorProfile } from "./behaviorTypes";

/** What the HUD actually renders — never more than this, and never the raw telemetry behind it. */
export interface ActivePrompt {
  id: string;
  kind: "question" | "observation";
  prompt: string;
  leftAnswer?: string;
  rightAnswer?: string;
}

const GLOBAL_MIN_GAP_SECONDS = 24;
const OBSERVATION_MIN_GAP_SECONDS = 30;
const MAX_BEHAVIOR_OBSERVATIONS_PER_RUN = 3;
const QUESTION_DISPLAY_MAX_SECONDS = 6;
const OBSERVATION_DISPLAY_SECONDS = 3.5;
const RESPOND_WINDOW_SECONDS = 3;
const COMMIT_HOLD_SECONDS = 0.5;
const LEAN_THRESHOLD = 0.35 * (COURT_HALF_WIDTH - PADDLE_HALF_WIDTH);

type PendingKind =
  | { type: "question"; question: InterviewQuestion }
  | { type: "observation"; id: string; prompt: string };

/**
 * The fourth, optional module (alongside `BehaviorTracker`): reads
 * `GameState`, `PresentationFrame` and `PlayerBehaviorProfile`, decides
 * whether — and which — interview beat to surface, and holds the run's
 * answers. It never mutates any of its inputs; the one place gameplay
 * actually bends around an answer is the explicit multiplier getters below,
 * which callers (`main.ts`) read and thread into `stepGame`/the composer
 * themselves — this module still never writes back into `GameState`.
 *
 * Surfacing rules, deliberately conservative — "never spam questions" from
 * the brief: at most one prompt of any kind is active at a time, a global
 * cooldown separates any two prompts, scripted questions never repeat
 * within a run (there are only six, so that's also the run's hard cap), and
 * behavior observations get their own smaller budget and larger spacing so
 * they read as occasional, not constant commentary.
 */
export class ObservationDirector {
  private clock = 0;
  private lastPromptEndedAt = -Infinity;
  private askedQuestionIds = new Set<string>();
  private shownObservationIds = new Set<string>();
  private observationsShown = 0;

  private pending: PendingKind | null = null;
  private activeSince = 0;
  private leanHeldSince: number | null = null;
  private heldLeanDirection: AnswerDirection | null = null;
  /** Net paddle displacement while a `"respond"` question is up, for the behavioral read. */
  private respondStartX = 0;

  private readonly answers = new Map<string, AnswerDirection>();

  /** CONTROL nudges this down (a steadier OPERATOR); read by `main.ts`, applied via `stepGame`. */
  private aimErrorMultiplier = 1;
  /** POSSIBILITY nudges this up (a touch more film grain); read by `renderer.ts`. */
  private environmentVarianceMultiplier = 1;

  /** Every answer recorded this run, exposed for future systems — never displayed, never scored. */
  getAnswers(): ReadonlyMap<string, AnswerDirection> {
    return this.answers;
  }

  /** New match, new "run" — mirrors `BehaviorTracker.reset()`, called from the same `startNewGame`. */
  reset(): void {
    this.clock = 0;
    this.lastPromptEndedAt = -Infinity;
    this.askedQuestionIds.clear();
    this.shownObservationIds.clear();
    this.observationsShown = 0;
    this.pending = null;
    this.activeSince = 0;
    this.leanHeldSince = null;
    this.heldLeanDirection = null;
    this.respondStartX = 0;
    this.answers.clear();
    this.aimErrorMultiplier = 1;
    this.environmentVarianceMultiplier = 1;
  }

  getOperatorAimErrorMultiplier(): number {
    return this.aimErrorMultiplier;
  }

  getEnvironmentVarianceMultiplier(): number {
    return this.environmentVarianceMultiplier;
  }

  /** For the HUD to brighten whichever answer the paddle is currently leaning toward — same threshold `update` commits on. */
  leanDirection(state: GameState): "left" | "right" | null {
    if (state.playerPaddleX <= -LEAN_THRESHOLD) return "left";
    if (state.playerPaddleX >= LEAN_THRESHOLD) return "right";
    return null;
  }

  /** 0 in Act I, ramping to 1 by Act III — the same shape as the paddle's OPERATOR-distinction scalar. */
  private intensityFor(act: Act): number {
    return act === Act.ONE ? 0 : act === Act.TWO ? 0.5 : 1;
  }

  private isServeWindow(state: GameState): boolean {
    return state.serveDelay > 0;
  }

  /** Early in a rally, not mid-exchange — as close to "intentionally calm" as `GameState` exposes. */
  private isCalmWindow(state: GameState): boolean {
    return state.serveDelay === 0 && state.rallyLength <= 1;
  }

  private tryPickQuestion(state: GameState, act: Act): InterviewQuestion | null {
    if (!this.isServeWindow(state)) return null;
    const intensity = this.intensityFor(act);
    for (const question of INTERVIEW_QUESTIONS) {
      if (this.askedQuestionIds.has(question.id)) continue;
      if (question.act > act) continue;
      if ((question.minimumObservationIntensity ?? 0) > intensity) continue;
      if (this.clock - this.lastPromptEndedAt < GLOBAL_MIN_GAP_SECONDS + (question.cooldown ?? 0)) {
        return null; // Ordered by progression — if the next-due one isn't ready, none later are either.
      }
      return question;
    }
    return null;
  }

  private tryPickObservation(
    state: GameState,
    act: Act,
    profile: PlayerBehaviorProfile,
  ): { id: string; prompt: string } | null {
    if (this.observationsShown >= MAX_BEHAVIOR_OBSERVATIONS_PER_RUN) return null;
    if (!this.isCalmWindow(state)) return null;
    if (this.clock - this.lastPromptEndedAt < OBSERVATION_MIN_GAP_SECONDS) return null;
    for (const observation of BEHAVIOR_OBSERVATIONS) {
      if (this.shownObservationIds.has(observation.id)) continue;
      if (observation.act > act) continue;
      if (!observation.qualifies(profile)) continue;
      return { id: observation.id, prompt: observation.prompt };
    }
    return null;
  }

  private clearActive(): void {
    this.pending = null;
    this.leanHeldSince = null;
    this.heldLeanDirection = null;
    this.lastPromptEndedAt = this.clock;
  }

  private commitQuestion(question: InterviewQuestion, direction: AnswerDirection): void {
    this.answers.set(question.id, direction);
    this.askedQuestionIds.add(question.id);

    // The one place an answer is allowed to bend gameplay — invisibly, and
    // only ever through the multipliers callers already read every frame,
    // never by this module reaching into `GameState`/`state.operatorTier`
    // itself.
    if (question.id === "control-or-possibility") {
      if (direction === "left") this.aimErrorMultiplier *= 0.85; // CONTROL: OPERATOR reads steadier.
      else if (direction === "right") this.environmentVarianceMultiplier *= 1.35; // POSSIBILITY: a touch less settled.
    }
  }

  /**
   * Call once per playing frame. Returns the prompt to render this frame,
   * or `null`. `playerPaddleX` is read only to detect the player's answer
   * (a lean past `LEAN_THRESHOLD`, held for `COMMIT_HOLD_SECONDS`, or — for
   * the wordless `"respond"` question — net movement over its whole
   * window); nothing here ever writes to `state`.
   */
  update(
    state: GameState,
    frame: PresentationFrame,
    profile: PlayerBehaviorProfile,
    dt: number,
  ): ActivePrompt | null {
    this.clock += dt;

    if (!this.pending) {
      const question = this.tryPickQuestion(state, frame.act);
      if (question) {
        this.pending = { type: "question", question };
        this.activeSince = this.clock;
        this.respondStartX = state.playerPaddleX;
      } else {
        const observation = this.tryPickObservation(state, frame.act, profile);
        if (observation) {
          this.pending = { type: "observation", id: observation.id, prompt: observation.prompt };
          this.activeSince = this.clock;
        }
      }
    }

    if (!this.pending) return null;

    const elapsed = this.clock - this.activeSince;

    if (this.pending.type === "observation") {
      if (elapsed >= OBSERVATION_DISPLAY_SECONDS) {
        this.shownObservationIds.add(this.pending.id);
        this.observationsShown += 1;
        this.clearActive();
        return null;
      }
      return { id: this.pending.id, kind: "observation", prompt: this.pending.prompt };
    }

    const question = this.pending.question;

    if (!question.leftAnswer && !question.rightAnswer) {
      // "respond": read net paddle displacement over the window, no visible answer ever shown.
      if (elapsed >= RESPOND_WINDOW_SECONDS) {
        const displacement = state.playerPaddleX - this.respondStartX;
        const direction: AnswerDirection =
          Math.abs(displacement) < LEAN_THRESHOLD * 0.5
            ? "still"
            : displacement < 0
              ? "left"
              : "right";
        this.commitQuestion(question, direction);
        this.clearActive();
        return null;
      }
      return { id: question.id, kind: "question", prompt: question.prompt };
    }

    // Left/right questions commit on a held lean, or expire unanswered
    // ("skip") past the display cap so a distracted player is never stuck.
    const leaning: AnswerDirection | null =
      state.playerPaddleX <= -LEAN_THRESHOLD ? "left" : state.playerPaddleX >= LEAN_THRESHOLD ? "right" : null;
    if (leaning && leaning === this.heldLeanDirection) {
      if (this.leanHeldSince !== null && this.clock - this.leanHeldSince >= COMMIT_HOLD_SECONDS) {
        this.commitQuestion(question, leaning);
        this.clearActive();
        return null;
      }
    } else {
      this.heldLeanDirection = leaning;
      this.leanHeldSince = leaning ? this.clock : null;
    }

    if (elapsed >= QUESTION_DISPLAY_MAX_SECONDS) {
      this.askedQuestionIds.add(question.id); // Skipped, not re-asked — still counts against the run's cap.
      this.clearActive();
      return null;
    }

    return {
      id: question.id,
      kind: "question",
      prompt: question.prompt,
      leftAnswer: question.leftAnswer,
      rightAnswer: question.rightAnswer,
    };
  }
}
