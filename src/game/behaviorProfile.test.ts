import { describe, expect, it } from "vitest";
import {
  ADAPTATION_MAX_PROBABILITY,
  MAX_ADAPTATION_BIAS,
  MIN_OBSERVATIONS_FOR_ADAPTATION,
  adaptationProbability,
  createBehaviorProfile,
  learnedBehaviorBias,
  observePlayerHit,
} from "./behaviorProfile";

/** Feeds the same offset in at a steady cadence, simulating a repeated habit. */
function repeat(offset: number, times: number, intervalSeconds = 1) {
  const profile = createBehaviorProfile();
  for (let i = 0; i < times; i += 1) {
    observePlayerHit(profile, offset, i * intervalSeconds);
  }
  return profile;
}

describe("learnedBehaviorBias", () => {
  it("stays zero below the minimum observation floor", () => {
    const profile = repeat(0.9, MIN_OBSERVATIONS_FOR_ADAPTATION - 1);
    expect(learnedBehaviorBias(profile)).toBe(0);
  });

  it("grows toward a confirmed one-sided habit once the floor is cleared", () => {
    const early = repeat(0.9, MIN_OBSERVATIONS_FOR_ADAPTATION + 1);
    const confirmed = repeat(0.9, MIN_OBSERVATIONS_FOR_ADAPTATION + 40);
    expect(learnedBehaviorBias(early)).toBeGreaterThan(0);
    expect(learnedBehaviorBias(confirmed)).toBeGreaterThan(learnedBehaviorBias(early));
  });

  it("never exceeds the configured cap, however long the habit repeats", () => {
    const profile = repeat(1, 500);
    expect(Math.abs(learnedBehaviorBias(profile))).toBeLessThanOrEqual(MAX_ADAPTATION_BIAS);
  });

  it("mirrors sign for the opposite habit", () => {
    const upper = repeat(0.9, MIN_OBSERVATIONS_FOR_ADAPTATION + 20);
    const lower = repeat(-0.9, MIN_OBSERVATIONS_FOR_ADAPTATION + 20);
    expect(learnedBehaviorBias(upper)).toBeGreaterThan(0);
    expect(learnedBehaviorBias(lower)).toBeLessThan(0);
  });

  it("stays near zero when the player's offsets don't favour a side", () => {
    const profile = createBehaviorProfile();
    const alternating = [0.9, -0.9];
    for (let i = 0; i < MIN_OBSERVATIONS_FOR_ADAPTATION + 40; i += 1) {
      observePlayerHit(profile, alternating[i % alternating.length], i);
    }
    expect(Math.abs(learnedBehaviorBias(profile))).toBeLessThan(0.1);
  });
});

describe("adaptationProbability", () => {
  it("is zero below the observation floor", () => {
    const profile = repeat(0.5, MIN_OBSERVATIONS_FOR_ADAPTATION - 1);
    expect(adaptationProbability(profile)).toBe(0);
  });

  it("never reaches certainty, even for a long-confirmed habit", () => {
    const profile = repeat(0.5, MIN_OBSERVATIONS_FOR_ADAPTATION + 1000);
    expect(adaptationProbability(profile)).toBeLessThanOrEqual(ADAPTATION_MAX_PROBABILITY);
    expect(adaptationProbability(profile)).toBeLessThan(1);
  });

  it("rises as more confirming observations accumulate", () => {
    const early = repeat(0.5, MIN_OBSERVATIONS_FOR_ADAPTATION + 1);
    const confirmed = repeat(0.5, MIN_OBSERVATIONS_FOR_ADAPTATION + 40);
    expect(adaptationProbability(confirmed)).toBeGreaterThan(adaptationProbability(early));
  });
});
