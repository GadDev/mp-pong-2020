import { describe, expect, it } from "vitest";
import {
  AGGRESSIVE_RETURN_VELOCITY,
  DIRECTION_CHANGE_VELOCITY_THRESHOLD,
  INACTIVITY_VELOCITY_THRESHOLD,
  angleBucketKey,
  applyHit,
  applyMiss,
  applyPaddleSample,
  applyRallySample,
  applyReactionSample,
  classifyHitZone,
  createBehaviorAccumulator,
  deriveProfile,
} from "./BehaviorProfile";

describe("classifyHitZone", () => {
  it("treats a near-centre offset as centre", () => {
    expect(classifyHitZone(0)).toBe("center");
    expect(classifyHitZone(0.1)).toBe("center");
    expect(classifyHitZone(-0.1)).toBe("center");
  });

  it("splits beyond the centre band by sign", () => {
    expect(classifyHitZone(0.9)).toBe("upper");
    expect(classifyHitZone(-0.9)).toBe("lower");
  });
});

describe("applyHit", () => {
  it("buckets by zone and clears any miss streak", () => {
    const acc = createBehaviorAccumulator();
    acc.consecutiveMisses = 3;

    applyHit(acc, 0.9, 0);

    expect(acc.upperHits).toBe(1);
    expect(acc.centerHits).toBe(0);
    expect(acc.lowerHits).toBe(0);
    expect(acc.consecutiveMisses).toBe(0);
  });

  it("classes a fast swing as aggressive and a near-still block as defensive", () => {
    const acc = createBehaviorAccumulator();

    applyHit(acc, 0.5, AGGRESSIVE_RETURN_VELOCITY + 0.5);
    applyHit(acc, -0.5, 0.01);

    expect(acc.aggressiveReturns).toBe(1);
    expect(acc.defensiveReturns).toBe(1);
  });

  it("accumulates the same angle bucket across repeated hits", () => {
    const acc = createBehaviorAccumulator();

    applyHit(acc, 0.5, 0);
    applyHit(acc, 0.51, 0);
    applyHit(acc, -0.5, 0);

    expect(acc.repeatedAngles[angleBucketKey(0.5)]).toBe(2);
    expect(acc.repeatedAngles[angleBucketKey(-0.5)]).toBe(1);
  });
});

describe("applyMiss", () => {
  it("counts total and consecutive misses, reset by the next hit", () => {
    const acc = createBehaviorAccumulator();

    applyMiss(acc);
    applyMiss(acc);
    expect(acc.misses).toBe(2);
    expect(acc.consecutiveMisses).toBe(2);

    applyHit(acc, 0, 0);
    expect(acc.consecutiveMisses).toBe(0);
    expect(acc.misses).toBe(2);
  });
});

describe("applyReactionSample", () => {
  it("feeds the profile's running average", () => {
    const acc = createBehaviorAccumulator();

    applyReactionSample(acc, 100);
    applyReactionSample(acc, 300);

    expect(deriveProfile(acc).averageReactionTime).toBe(200);
  });
});

describe("applyPaddleSample", () => {
  it("counts one idle event per stillness streak, not per still frame", () => {
    const acc = createBehaviorAccumulator();
    const stillVelocity = INACTIVITY_VELOCITY_THRESHOLD / 2;
    const movingVelocity = DIRECTION_CHANGE_VELOCITY_THRESHOLD * 2;

    applyPaddleSample(acc, stillVelocity);
    applyPaddleSample(acc, stillVelocity);
    applyPaddleSample(acc, movingVelocity);
    applyPaddleSample(acc, stillVelocity);

    expect(acc.idleEvents).toBe(2);
  });

  it("ignores sub-threshold jitter for direction changes but counts a real reversal", () => {
    const acc = createBehaviorAccumulator();
    const jitter = DIRECTION_CHANGE_VELOCITY_THRESHOLD / 2;
    const real = DIRECTION_CHANGE_VELOCITY_THRESHOLD * 2;

    applyPaddleSample(acc, real);
    applyPaddleSample(acc, -jitter);
    applyPaddleSample(acc, -real);

    expect(acc.directionChanges).toBe(1);
  });
});

describe("applyRallySample", () => {
  it("mirrors totalRallies and tracks the longest rally length seen", () => {
    const acc = createBehaviorAccumulator();

    applyRallySample(acc, 3, 5);
    applyRallySample(acc, 1, 6);

    expect(acc.rallies).toBe(6);
    expect(acc.longestRally).toBe(3);
  });
});

describe("deriveProfile", () => {
  it("reports zeroed averages before any sample exists", () => {
    const profile = deriveProfile(createBehaviorAccumulator());

    expect(profile.averageReactionTime).toBe(0);
    expect(profile.averageHitPosition).toBe(0);
    expect(profile.averagePaddleVelocity).toBe(0);
  });

  it("does not expose a mutable reference to the accumulator's angle map", () => {
    const acc = createBehaviorAccumulator();
    applyHit(acc, 0.5, 0);

    const profile = deriveProfile(acc);
    profile.repeatedAngles[angleBucketKey(0.5)] = 999;

    expect(acc.repeatedAngles[angleBucketKey(0.5)]).toBe(1);
  });
});
