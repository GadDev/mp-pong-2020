/**
 * Types for the local player-behavior telemetry layer. This is a fourth,
 * optional module alongside TECHSTACK.md's three: it reads `GameState` and
 * `StepEvents` the same way `presentationState.ts` reads `GameState`, but
 * writes nothing back — no `state.operatorTier`-style command exists here,
 * so it cannot affect physics even by accident. Consumers (future adaptive
 * AI, HUD anomalies, narrative triggers) read `PlayerBehaviorProfile`; none
 * of it is rendered today.
 *
 * Court orientation note (see gameState.ts): the paddle's only axis of
 * freedom is X, not Y — there is no literal "upper/lower" strike zone the
 * way a vertical 2D-Pong paddle has one. `upperHits`/`lowerHits` are kept as
 * named because that's the requested shape; they bucket the ball's contact
 * offset from paddle-centre along X, with "upper" arbitrarily mapped to the
 * +X edge and "lower" to the -X edge.
 */

export type HitZone = "upper" | "center" | "lower";

/** Queryable snapshot. Nothing here is PII; it's all derived from ball/paddle motion. */
export interface PlayerBehaviorProfile {
  rallies: number;
  longestRally: number;

  /** Milliseconds. 0 until the first sample exists. */
  averageReactionTime: number;
  /** Mean of the ball's contact offset from paddle-centre, normalized to [-1, 1]. 0 until the first hit. */
  averageHitPosition: number;

  upperHits: number;
  centerHits: number;
  lowerHits: number;

  aggressiveReturns: number;
  defensiveReturns: number;

  /** Keyed by a quantized contact-angle bucket (see `angleBucketKey`), for spotting a favored shot. */
  repeatedAngles: Record<string, number>;

  misses: number;
  consecutiveMisses: number;

  /** Count of distinct stillness periods started, not their total duration. */
  idleEvents: number;

  /** Mean absolute paddle speed, court units/second. 0 until the first sample exists. */
  averagePaddleVelocity: number;
  directionChanges: number;
}

/**
 * Running totals the profile is derived from. Internal to the observation
 * module — `BehaviorTracker` is the only thing that mutates one of these;
 * everything else should see only `PlayerBehaviorProfile` via `getProfile()`.
 */
export interface BehaviorAccumulator {
  rallies: number;
  longestRally: number;

  reactionTimeSumMs: number;
  reactionSampleCount: number;

  hitPositionSum: number;
  hitSampleCount: number;

  upperHits: number;
  centerHits: number;
  lowerHits: number;

  aggressiveReturns: number;
  defensiveReturns: number;

  repeatedAngles: Record<string, number>;

  misses: number;
  consecutiveMisses: number;

  idleEvents: number;
  /** Whether the paddle is currently inside an idle streak — edge-detects `idleEvents`. */
  isIdle: boolean;

  paddleVelocitySum: number;
  paddleVelocitySampleCount: number;
  /** Sign of the last sample that cleared the direction-change threshold. 0 = none yet. */
  paddleVelocitySign: -1 | 0 | 1;
  directionChanges: number;
}
