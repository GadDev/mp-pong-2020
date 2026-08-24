/**
 * TECHSTACK.md module 2 of 3: the Act state machine. Reads game-state
 * triggers, owns no physics, and imports nothing from the renderer. This
 * replaces Milestone 1's `reveal/timeline.ts`, which was a scripted
 * wall-clock timer standing in until real triggers existed.
 */
import { OPERATOR_TIERS, WINNING_SCORE, type GameState } from "./gameState";

export enum Act {
  ONE = 0,
  TWO = 1,
  THREE = 2,
}

/**
 * ROADMAP.md M4 leaves the trigger as "rally count or score threshold,
 * whichever tests better". Resolved: **rally count is primary, score is a
 * backstop.** Rally count measures engagement rather than skill, so a strong
 * and a weak player hit the escalation at a comparable point in their
 * experience — a pure score threshold fires almost immediately for someone
 * being beaten 3-0 and never for someone stonewalling every serve. The score
 * backstops exist so a lopsided, low-rally match can't finish without the
 * reveal ever firing, which would leave the game with no climax at all.
 */
export const ACT_TWO_RALLY_TRIGGER = 10;
export const ACT_TWO_SCORE_BACKSTOP = 3;
/**
 * Act 3 is the reverse: score-primary, because Act 3 needs room to breathe
 * before the match ends, and only the score tells us how close that is.
 * At 5 combined points there are at least two more to play.
 */
export const ACT_THREE_SCORE_TRIGGER = 5;
export const ACT_THREE_RALLY_BACKSTOP = 26;

/**
 * Minimum time an act holds before it can be superseded, whatever the game
 * state says. MOODBOARD.md rests the whole reveal on Act 1's stillness being
 * established first — and without a floor, a player losing 3-0 off three short
 * serves reaches Act 2 about nine seconds in, before there's any stillness to
 * violate. Act 2 gets a floor for the same reason: its pull-back is meant to
 * be noticed only in hindsight, which needs time to work.
 */
export const ACT_ONE_MIN_SECONDS = 20;
export const ACT_TWO_MIN_SECONDS = 18;

/**
 * The floors above cut the other way at the end of a match: a player racing to
 * 7 can reach match point while Act 2 is still holding its minimum, which
 * leaves Act 3 a couple of seconds before the dossier — the payoff arriving
 * with no room to land. Once either side is two points from winning, the
 * floors are overridden so Act 2 still registers (briefly) and Act 3 still
 * gets runway.
 */
const ENDGAME_MARGIN = 2;
const ACT_TWO_ENDGAME_MIN_SECONDS = 6;

/** Mean seconds between Act 2's single-frame HUD flickers. */
const FLICKER_INTERVAL = 2.4;
/** Mean seconds between Act 2's audio stutters. */
const STUTTER_INTERVAL = 3.1;

/**
 * EXCHANGE: rally-driven environmental response. A long rally should make the
 * environment feel more awake — grid brightness, fog thinning, an ambient
 * audio layer, a hint of camera drift — with no explicit reward or combo UI.
 * `exchangeIntensity` is the single 0..1 dial every one of those reads;
 * everything downstream interpolates it rather than switching at a threshold.
 *
 * Control points from `state.rallyLength` (hits since the ball was last
 * served) to target intensity. The suggested progression: 5 hits barely
 * perceptible, 10 subtle, 15 is where atmospheric audio should start being
 * audible, 20 noticeably deeper, 25+ the ceiling.
 */
const EXCHANGE_CURVE: ReadonlyArray<{ rally: number; intensity: number }> = [
  { rally: 0, intensity: 0 },
  { rally: 5, intensity: 0.06 },
  { rally: 10, intensity: 0.28 },
  { rally: 15, intensity: 0.55 },
  { rally: 20, intensity: 0.8 },
  { rally: 25, intensity: 1 },
];

/** Eased toward a rising target quickly — a long rally should register as it happens. */
const EXCHANGE_ATTACK_RATE = 0.9;
/** Eased toward a falling target slowly — "some effects should slowly decay". */
const EXCHANGE_DECAY_RATE = 0.22;
/**
 * How much of the intensity ever reached this match persists as a floor once
 * a rally ends, so "narrative progression should not fully reset" even though
 * `rallyLength` itself snaps to 0 on every point. The floor itself decays,
 * but far slower than the per-rally intensity above it.
 */
const EXCHANGE_MEMORY_RETENTION = 0.3;
const EXCHANGE_MEMORY_DECAY_RATE = 0.015;

/** Piecewise-linear lookup, clamped at the curve's ends. */
function exchangeTargetFor(rallyLength: number): number {
  if (rallyLength <= EXCHANGE_CURVE[0].rally) return EXCHANGE_CURVE[0].intensity;
  for (let i = 1; i < EXCHANGE_CURVE.length; i++) {
    const prev = EXCHANGE_CURVE[i - 1];
    const next = EXCHANGE_CURVE[i];
    if (rallyLength <= next.rally) {
      const t = (rallyLength - prev.rally) / (next.rally - prev.rally);
      return prev.intensity + (next.intensity - prev.intensity) * t;
    }
  }
  return EXCHANGE_CURVE[EXCHANGE_CURVE.length - 1].intensity;
}

export interface PresentationFrame {
  act: Act;
  /** Seconds spent in the current act. Advanced by dt, so pausing genuinely freezes it. */
  elapsedInAct: number;
  /**
   * True for exactly one update, not for a ~50 ms window sampled once per
   * frame — MOODBOARD.md specifies a *single-frame* flicker, and the old
   * window-based test made the duration a function of refresh rate.
   */
  flickerPulse: boolean;
  /** Same one-shot semantics, for the Act 2 audio stutter. */
  stutterPulse: boolean;
  /** True once the match has ended after the escalation fired: show the dossier. */
  climax: boolean;
  /** EXCHANGE dial, 0..1, smoothed from rally length. See `exchangeTargetFor`. */
  exchangeIntensity: number;
}

export interface PresentationOptions {
  /**
   * False when `hasSeenReveal` is set. The escalation trigger then simply
   * never fires (ROADMAP.md M4) — but direct `setAct` still works, so the
   * dev-only re-trigger BACKLOG.md requires is unaffected.
   */
  escalationArmed: boolean;
  /** Called the first time the escalation fires, to persist `hasSeenReveal`. */
  onEscalation?: () => void;
}

export class PresentationState {
  private act: Act = Act.ONE;
  private elapsedInAct = 0;
  private nextFlickerAt = FLICKER_INTERVAL;
  private nextStutterAt = STUTTER_INTERVAL;
  private climaxReached = false;
  private escalationArmed: boolean;
  private readonly onEscalation?: () => void;
  private exchangeIntensity = 0;
  private exchangeMemory = 0;

  constructor(options: PresentationOptions) {
    this.escalationArmed = options.escalationArmed;
    this.onEscalation = options.onEscalation;
  }

  getAct(): Act {
    return this.act;
  }

  /** New match: back to Act 1, but the armed/disarmed decision is not re-litigated here. */
  reset(): void {
    this.act = Act.ONE;
    this.elapsedInAct = 0;
    this.nextFlickerAt = FLICKER_INTERVAL;
    this.nextStutterAt = STUTTER_INTERVAL;
    this.climaxReached = false;
    this.exchangeIntensity = 0;
    this.exchangeMemory = 0;
  }

  /**
   * Debug-only jump (the `1`/`2`/`3` keys). Deliberately bypasses
   * `escalationArmed` — CLAUDE.md requires the dev re-trigger to keep
   * working after the reveal has been seen once.
   */
  setAct(act: Act): void {
    if (act === this.act) return;
    this.act = act;
    this.elapsedInAct = 0;
    this.nextFlickerAt = FLICKER_INTERVAL;
    this.nextStutterAt = STUTTER_INTERVAL;
  }

  /**
   * Called by `startNewGame` for every match, with
   * `debugReveal || !getHasSeenReveal()`. It has to be re-evaluated per match
   * rather than fixed in the constructor: otherwise a second match in the
   * same page session re-escalates even though the first one just set
   * `hasSeenReveal`. Reconstructing the whole object per match would instead
   * discard a `?debug=reveal` override at exactly the moment it's wanted.
   */
  setEscalationArmed(armed: boolean): void {
    this.escalationArmed = armed;
  }

  /** Debug-only mid-match re-arm, for the `?debug=reveal` route. */
  arm(): void {
    this.escalationArmed = true;
  }

  /** Which OPERATOR behaviour tier the current act calls for. */
  operatorTierFor(act: Act = this.act): number {
    return Math.min(act as number, OPERATOR_TIERS.length - 1);
  }

  /**
   * Call once per frame with the same dt the simulation got. Returns
   * everything the render/audio layer needs; nothing else reads this class's
   * internals.
   */
  update(state: GameState, dt: number): PresentationFrame {
    this.elapsedInAct += dt;

    const combinedScore = state.playerScore + state.operatorScore;
    const endgame =
      Math.max(state.playerScore, state.operatorScore) >=
      WINNING_SCORE - ENDGAME_MARGIN;

    if (this.escalationArmed && !state.matchOver) {
      if (
        this.act === Act.ONE &&
        (endgame || this.elapsedInAct >= ACT_ONE_MIN_SECONDS) &&
        (state.totalRallies >= ACT_TWO_RALLY_TRIGGER ||
          combinedScore >= ACT_TWO_SCORE_BACKSTOP)
      ) {
        this.setAct(Act.TWO);
        // Fired at Act 2 entry, not at the dossier: ROADMAP.md's wording is
        // that "the escalation trigger simply never fires again on that
        // device", so the flag tracks the trigger, not completion. A player
        // who closes the tab mid-Act-2 is permanently disarmed. Deliberate —
        // discoverable once, no route back.
        this.onEscalation?.();
      } else if (
        this.act === Act.TWO &&
        this.elapsedInAct >=
          (endgame ? ACT_TWO_ENDGAME_MIN_SECONDS : ACT_TWO_MIN_SECONDS) &&
        (combinedScore >= ACT_THREE_SCORE_TRIGGER ||
          state.totalRallies >= ACT_THREE_RALLY_BACKSTOP)
      ) {
        this.setAct(Act.THREE);
      }
    }

    // The dossier resolves whenever a match that *did* escalate finishes.
    // Undifferentiated by winner, per BACKLOG.md: making the reveal a reward
    // for winning turns it into an unlock, and punishes a losing player with
    // the absence of the only thing the game was building toward.
    if (state.matchOver && this.act !== Act.ONE) {
      this.climaxReached = true;
    }

    let flickerPulse = false;
    let stutterPulse = false;
    if (this.act === Act.TWO) {
      if (this.elapsedInAct >= this.nextFlickerAt) {
        flickerPulse = true;
        this.nextFlickerAt = this.elapsedInAct + FLICKER_INTERVAL;
      }
      if (this.elapsedInAct >= this.nextStutterAt) {
        stutterPulse = true;
        this.nextStutterAt = this.elapsedInAct + STUTTER_INTERVAL;
      }
    }

    // EXCHANGE: rally length drives a target intensity; a decaying memory of
    // the peak keeps some of it alive across the point that just ended
    // instead of snapping back to 0 with `rallyLength`.
    const rallyTarget = exchangeTargetFor(state.rallyLength);
    this.exchangeMemory = Math.max(
      this.exchangeMemory * Math.exp(-EXCHANGE_MEMORY_DECAY_RATE * dt),
      rallyTarget,
    );
    const floor = this.exchangeMemory * EXCHANGE_MEMORY_RETENTION;
    const exchangeTarget = Math.max(rallyTarget, floor);
    const exchangeRate =
      exchangeTarget >= this.exchangeIntensity
        ? EXCHANGE_ATTACK_RATE
        : EXCHANGE_DECAY_RATE;
    const exchangeK = 1 - Math.exp(-dt * exchangeRate);
    this.exchangeIntensity += (exchangeTarget - this.exchangeIntensity) * exchangeK;

    return {
      act: this.act,
      elapsedInAct: this.elapsedInAct,
      flickerPulse,
      stutterPulse,
      climax: this.climaxReached,
      exchangeIntensity: this.exchangeIntensity,
    };
  }
}
