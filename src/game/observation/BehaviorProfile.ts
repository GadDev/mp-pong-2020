/**
 * Pure state-transition functions over `BehaviorAccumulator`, in the same
 * style as `gameState.ts`: plain objects, no classes, no `three` import, and
 * every function testable without a canvas. `BehaviorTracker` is the only
 * caller; keeping the math here rather than inline in the tracker is what
 * makes it unit-testable against hand-built inputs instead of a full frame
 * loop.
 */
import type { BehaviorAccumulator, HitZone, PlayerBehaviorProfile } from "./behaviorTypes";

/** Below this, a hit is "center" rather than toward one edge of the paddle. */
const HIT_ZONE_CENTER_RATIO = 0.34;

/** Paddle speed, in court units/second, above which a return is "aggressive". */
export const AGGRESSIVE_RETURN_VELOCITY = 1.0;

/** Paddle speed below which the paddle counts as not moving. */
export const INACTIVITY_VELOCITY_THRESHOLD = 0.05;

/** Paddle speed above which a sign flip counts as a real direction change, not input noise. */
export const DIRECTION_CHANGE_VELOCITY_THRESHOLD = 0.15;

/** Width of one `repeatedAngles` bucket, in normalized offset units. */
const ANGLE_BUCKET_SIZE = 0.25;

export function createBehaviorAccumulator(): BehaviorAccumulator {
  return {
    rallies: 0,
    longestRally: 0,

    reactionTimeSumMs: 0,
    reactionSampleCount: 0,

    hitPositionSum: 0,
    hitSampleCount: 0,

    upperHits: 0,
    centerHits: 0,
    lowerHits: 0,

    aggressiveReturns: 0,
    defensiveReturns: 0,

    repeatedAngles: {},

    misses: 0,
    consecutiveMisses: 0,

    idleEvents: 0,
    isIdle: false,

    paddleVelocitySum: 0,
    paddleVelocitySampleCount: 0,
    paddleVelocitySign: 0,
    directionChanges: 0,
  };
}

/** Classifies a ball-paddle contact offset, normalized to [-1, 1], into a strike zone. */
export function classifyHitZone(offsetRatio: number): HitZone {
  if (Math.abs(offsetRatio) < HIT_ZONE_CENTER_RATIO) return "center";
  return offsetRatio > 0 ? "upper" : "lower";
}

/** Quantizes a contact offset into a bucket key for `repeatedAngles`. */
export function angleBucketKey(offsetRatio: number): string {
  const bucket = Math.round(offsetRatio / ANGLE_BUCKET_SIZE) * ANGLE_BUCKET_SIZE;
  return bucket.toFixed(2);
}

/**
 * A successful return. `offsetRatio` is contact offset from paddle-centre
 * normalized to [-1, 1]; `paddleVelocity` is the paddle's signed speed at
 * the moment of contact, used to tell an aimed swing from a passive block.
 */
export function applyHit(
  acc: BehaviorAccumulator,
  offsetRatio: number,
  paddleVelocity: number,
): void {
  const zone = classifyHitZone(offsetRatio);
  if (zone === "upper") acc.upperHits += 1;
  else if (zone === "lower") acc.lowerHits += 1;
  else acc.centerHits += 1;

  acc.hitPositionSum += offsetRatio;
  acc.hitSampleCount += 1;

  if (Math.abs(paddleVelocity) >= AGGRESSIVE_RETURN_VELOCITY) acc.aggressiveReturns += 1;
  else acc.defensiveReturns += 1;

  const key = angleBucketKey(offsetRatio);
  acc.repeatedAngles[key] = (acc.repeatedAngles[key] ?? 0) + 1;

  acc.consecutiveMisses = 0;
}

export function applyMiss(acc: BehaviorAccumulator): void {
  acc.misses += 1;
  acc.consecutiveMisses += 1;
}

/** A reaction-time sample, in milliseconds — see `BehaviorTracker` for how it's measured. */
export function applyReactionSample(acc: BehaviorAccumulator, ms: number): void {
  acc.reactionTimeSumMs += ms;
  acc.reactionSampleCount += 1;
}

/** One frame's paddle sample: feeds the velocity average, idle-event edge, and direction changes. */
export function applyPaddleSample(acc: BehaviorAccumulator, velocity: number): void {
  acc.paddleVelocitySum += Math.abs(velocity);
  acc.paddleVelocitySampleCount += 1;

  const idleNow = Math.abs(velocity) < INACTIVITY_VELOCITY_THRESHOLD;
  if (idleNow && !acc.isIdle) acc.idleEvents += 1;
  acc.isIdle = idleNow;

  if (Math.abs(velocity) >= DIRECTION_CHANGE_VELOCITY_THRESHOLD) {
    const sign = velocity > 0 ? 1 : -1;
    if (acc.paddleVelocitySign !== 0 && sign !== acc.paddleVelocitySign) {
      acc.directionChanges += 1;
    }
    acc.paddleVelocitySign = sign;
  }
}

/** Mirrors `GameState.rallyLength`/`totalRallies` rather than recomputing them. */
export function applyRallySample(
  acc: BehaviorAccumulator,
  rallyLength: number,
  totalRallies: number,
): void {
  acc.rallies = totalRallies;
  acc.longestRally = Math.max(acc.longestRally, rallyLength);
}

/** Projects the running totals into the public, queryable shape. */
export function deriveProfile(acc: BehaviorAccumulator): PlayerBehaviorProfile {
  return {
    rallies: acc.rallies,
    longestRally: acc.longestRally,
    averageReactionTime: acc.reactionSampleCount === 0 ? 0 : acc.reactionTimeSumMs / acc.reactionSampleCount,
    averageHitPosition: acc.hitSampleCount === 0 ? 0 : acc.hitPositionSum / acc.hitSampleCount,
    upperHits: acc.upperHits,
    centerHits: acc.centerHits,
    lowerHits: acc.lowerHits,
    aggressiveReturns: acc.aggressiveReturns,
    defensiveReturns: acc.defensiveReturns,
    repeatedAngles: { ...acc.repeatedAngles },
    misses: acc.misses,
    consecutiveMisses: acc.consecutiveMisses,
    idleEvents: acc.idleEvents,
    averagePaddleVelocity:
      acc.paddleVelocitySampleCount === 0 ? 0 : acc.paddleVelocitySum / acc.paddleVelocitySampleCount,
    directionChanges: acc.directionChanges,
  };
}
