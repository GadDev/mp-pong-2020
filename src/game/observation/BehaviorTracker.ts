/**
 * Stateful wrapper around `BehaviorProfile.ts`'s pure functions — the frame
 * driver, in the same shape as `PresentationState`: constructed once, fed
 * `GameState`/`dt`/`StepEvents` every playing frame, queried by whatever
 * needs the profile. It reads `GameState`; it never writes to it, unlike
 * `presentationState.ts`'s one deliberate `operatorTier` command — this
 * layer has no equivalent, by design, so it cannot influence physics.
 */
import { PADDLE_HALF_WIDTH, type GameState, type StepEvents } from "../gameState";
import {
  applyHit,
  applyMiss,
  applyPaddleSample,
  applyRallySample,
  applyReactionSample,
  createBehaviorAccumulator,
  deriveProfile,
} from "./BehaviorProfile";
import type { BehaviorAccumulator, PlayerBehaviorProfile } from "./behaviorTypes";

/**
 * Paddle speed, court units/second, that counts as "the player reacted"
 * rather than the mouse drifting. Below `AGGRESSIVE_RETURN_VELOCITY` on
 * purpose: reacting and swinging aggressively are different questions.
 */
const REACTION_VELOCITY_THRESHOLD = 0.4;

export class BehaviorTracker {
  private accumulator: BehaviorAccumulator = createBehaviorAccumulator();
  private lastPlayerPaddleX: number | null = null;
  private previousBallVz = 0;
  private awaitingReaction = false;
  private reactionElapsedSeconds = 0;

  getProfile(): PlayerBehaviorProfile {
    return deriveProfile(this.accumulator);
  }

  /** `offsetRatio` is contact offset from paddle-centre normalized to [-1, 1]. */
  recordHit(offsetRatio: number, paddleVelocity: number): void {
    applyHit(this.accumulator, offsetRatio, paddleVelocity);
  }

  recordMiss(): void {
    applyMiss(this.accumulator);
  }

  /** New match: a behavioral profile doesn't carry across matches any more than the score does. */
  reset(): void {
    this.accumulator = createBehaviorAccumulator();
    this.lastPlayerPaddleX = null;
    this.previousBallVz = 0;
    this.awaitingReaction = false;
    this.reactionElapsedSeconds = 0;
  }

  /** Call once per playing frame, after `stepGame`, with that call's own `state`/`dt`/events. */
  update(state: GameState, dt: number, events: StepEvents): void {
    if (dt <= 0) return;

    const paddleVelocity =
      this.lastPlayerPaddleX === null ? 0 : (state.playerPaddleX - this.lastPlayerPaddleX) / dt;
    this.lastPlayerPaddleX = state.playerPaddleX;
    applyPaddleSample(this.accumulator, paddleVelocity);

    // Reaction time: armed the instant the ball turns to head toward the
    // player (vz flips positive — see gameState.ts's court-orientation
    // comment, +Z is the player's end), resolved the instant the paddle
    // moves meaningfully in response.
    const headingTowardPlayer = state.ball.vz > 0;
    if (headingTowardPlayer && this.previousBallVz <= 0) {
      this.awaitingReaction = true;
      this.reactionElapsedSeconds = 0;
    }
    if (this.awaitingReaction) {
      this.reactionElapsedSeconds += dt;
      if (Math.abs(paddleVelocity) >= REACTION_VELOCITY_THRESHOLD) {
        applyReactionSample(this.accumulator, this.reactionElapsedSeconds * 1000);
        this.awaitingReaction = false;
      }
    }
    this.previousBallVz = state.ball.vz;

    applyRallySample(this.accumulator, state.rallyLength, state.totalRallies);

    // `paddleHit` fires for either paddle. The player's return sends the
    // ball back toward -Z (gameState.ts's `deflect` call for the player's
    // goal line passes `outgoingZSign: -1`), so vz < 0 right after the step
    // means it was the player who just connected, not OPERATOR.
    if (events.paddleHit && state.ball.vz < 0) {
      this.awaitingReaction = false;
      const offsetRatio = (state.ball.x - state.playerPaddleX) / PADDLE_HALF_WIDTH;
      this.recordHit(offsetRatio, paddleVelocity);
    }

    // The player misses when OPERATOR is awarded the point. `playerScored`
    // is the reverse case — OPERATOR missed — and isn't a player miss.
    if (events.operatorScored) {
      this.recordMiss();
    }
  }
}
