/**
 * Tracks the player's return tendencies so OPERATOR can bias its aim toward
 * them once a habit has repeated enough to be a habit rather than noise.
 * Pure functions over a plain object, same as `gameState.ts` — no rendering,
 * no `three` import. Deliberately not omniscient: this only ever sees where
 * the player's paddle *already* struck the ball, never the ball's true
 * future position, so the bias it produces is a guess informed by history,
 * not a lookup.
 */

/** Exchanges observed before OPERATOR trusts a read enough to act on it at all. */
export const MIN_OBSERVATIONS_FOR_ADAPTATION = 6;
/**
 * Exchanges over which confidence keeps climbing past the minimum. A player
 * who has only just cleared `MIN_OBSERVATIONS_FOR_ADAPTATION` gets a faint
 * nudge; one who has kept the same habit for this many more gets close to
 * the full read. This is what makes the adaptation feel gradual rather than
 * a switch flipping at the threshold.
 */
export const ADAPTATION_RAMP_OBSERVATIONS = 14;
/** How much of a fully-confirmed tendency OPERATOR is willing to lean on. */
export const ADAPTATION_STRENGTH = 0.6;
/**
 * EMA smoothing factor for the running profile. Doubles as decay: a player
 * who breaks a habit erodes OPERATOR's read of it at this same rate, so an
 * old pattern doesn't linger forever once it stops recurring.
 */
export const ADAPTATION_DECAY = 0.12;
/**
 * Hard cap on the learned bias, in the same world units as `aimError`.
 * Kept below tier 2's `aimError` (1.0) on purpose — even a perfectly read
 * player leaves OPERATOR fallible, per LORE.md's beatability requirement.
 */
export const MAX_ADAPTATION_BIAS = 0.85;
/** Extra randomness layered on top of an applied bias, so the read is never surgical. */
export const ADAPTATION_NOISE = 0.55;
/** Chance OPERATOR acts on a just-barely-confirmed tendency at all, per exchange. */
export const ADAPTATION_BASE_PROBABILITY = 0.35;
/** Ceiling on that chance once the tendency has been confirmed for a long stretch — never certain. */
export const ADAPTATION_MAX_PROBABILITY = 0.8;
/** Interval variance (seconds²) at or above which timing reads as unpredictable. */
const TIMING_VARIANCE_CEILING = 0.35;
/** How much an edge-hitting (aggressive) habit amplifies the directional bias. */
const AGGRESSION_AMPLIFIER = 0.4;

export interface BehaviorProfile {
  observations: number;
  /** EMA of the player's hit offset, normalized to [-1, 1] — upper/lower and angle preference. */
  offsetEMA: number;
  /** EMA of |offset| — how often the player plays the edges vs. the paddle centre. */
  offsetAbsEMA: number;
  /** EMA of seconds between the player's returns. */
  intervalEMA: number;
  /** EMA of squared deviation from `intervalEMA` — low means metronomic timing. */
  intervalVarianceEMA: number;
  lastHitClock: number | null;
}

export function createBehaviorProfile(): BehaviorProfile {
  return {
    observations: 0,
    offsetEMA: 0,
    offsetAbsEMA: 0,
    intervalEMA: 0,
    intervalVarianceEMA: TIMING_VARIANCE_CEILING,
    lastHitClock: null,
  };
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Record one player return. `normalizedOffset` is where on the paddle the
 * ball struck, in [-1, 1]; `clockSeconds` is the match clock, used only to
 * measure the gap since the previous return.
 */
export function observePlayerHit(
  profile: BehaviorProfile,
  normalizedOffset: number,
  clockSeconds: number,
): void {
  const alpha = ADAPTATION_DECAY;
  profile.offsetEMA += (normalizedOffset - profile.offsetEMA) * alpha;
  profile.offsetAbsEMA += (Math.abs(normalizedOffset) - profile.offsetAbsEMA) * alpha;

  if (profile.lastHitClock !== null) {
    const interval = clockSeconds - profile.lastHitClock;
    const deviation = interval - profile.intervalEMA;
    profile.intervalEMA += deviation * alpha;
    profile.intervalVarianceEMA += (deviation * deviation - profile.intervalVarianceEMA) * alpha;
  }
  profile.lastHitClock = clockSeconds;
  profile.observations += 1;
}

/**
 * The confirmed-tendency signal itself: deterministic, no randomness. Zero
 * until `MIN_OBSERVATIONS_FOR_ADAPTATION` is cleared, then ramps in over
 * `ADAPTATION_RAMP_OBSERVATIONS` more, scaled down further when the
 * player's timing hasn't been consistent enough to corroborate the read.
 * An aggressive, edge-favouring player amplifies whatever directional
 * habit is found, since that habit is more exploitable when confirmed.
 */
export function learnedBehaviorBias(profile: BehaviorProfile): number {
  if (profile.observations < MIN_OBSERVATIONS_FOR_ADAPTATION) return 0;

  const ramp = clamp01(
    (profile.observations - MIN_OBSERVATIONS_FOR_ADAPTATION) / ADAPTATION_RAMP_OBSERVATIONS,
  );
  const timingPredictability = clamp01(1 - profile.intervalVarianceEMA / TIMING_VARIANCE_CEILING);
  const confidence = ramp * (0.6 + 0.4 * timingPredictability);
  const aggressionScale = 1 + profile.offsetAbsEMA * AGGRESSION_AMPLIFIER;

  const bias = profile.offsetEMA * confidence * ADAPTATION_STRENGTH * aggressionScale;
  return Math.min(MAX_ADAPTATION_BIAS, Math.max(-MAX_ADAPTATION_BIAS, bias));
}

/**
 * Chance OPERATOR acts on the current read this exchange, rather than
 * playing it straight. Ramps with the same observation count as the bias
 * itself, so a freshly-qualified read is acted on rarely — read as
 * coincidence — and a long-confirmed one is acted on often, but never for
 * certain.
 */
export function adaptationProbability(profile: BehaviorProfile): number {
  if (profile.observations < MIN_OBSERVATIONS_FOR_ADAPTATION) return 0;
  const ramp = clamp01(
    (profile.observations - MIN_OBSERVATIONS_FOR_ADAPTATION) / ADAPTATION_RAMP_OBSERVATIONS,
  );
  return ADAPTATION_BASE_PROBABILITY + ramp * (ADAPTATION_MAX_PROBABILITY - ADAPTATION_BASE_PROBABILITY);
}
