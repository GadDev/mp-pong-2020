import { describe, expect, it } from "vitest";
import {
  BALL_BASE_SPEED,
  COURT_HALF_LENGTH,
  createGameState,
  setPlayerPaddleX,
  stepGame,
  type GameState,
} from "../gameState";
import { BehaviorTracker } from "./BehaviorTracker";

/** Puts the ball just short of the player's goal line, heading into it — mirrors gameState.test.ts. */
function aimAtPlayerPaddle(state: GameState, ballX: number, paddleX: number): void {
  state.serveDelay = 0;
  state.ball.x = ballX;
  state.ball.z = COURT_HALF_LENGTH - 0.3;
  state.ball.vx = 0;
  state.ball.vz = BALL_BASE_SPEED;
  setPlayerPaddleX(state, paddleX);
}

const FRAME = 0.1;

describe("BehaviorTracker", () => {
  it("records a hit's zone from the player's return, not OPERATOR's", () => {
    const state = createGameState();
    aimAtPlayerPaddle(state, 2, 2);
    const tracker = new BehaviorTracker();

    const events = stepGame(state, FRAME);
    tracker.update(state, FRAME, events);

    expect(events.paddleHit).toBe(true);
    const profile = tracker.getProfile();
    expect(profile.upperHits + profile.centerHits + profile.lowerHits).toBe(1);
    expect(profile.misses).toBe(0);
  });

  it("records a miss when OPERATOR is awarded the point", () => {
    const state = createGameState();
    aimAtPlayerPaddle(state, 5, -5);
    const tracker = new BehaviorTracker();

    const events = stepGame(state, FRAME);
    tracker.update(state, FRAME, events);

    expect(events.operatorScored).toBe(true);
    const profile = tracker.getProfile();
    expect(profile.misses).toBe(1);
    expect(profile.consecutiveMisses).toBe(1);
  });

  it("mirrors GameState's rally counters", () => {
    const state = createGameState();
    aimAtPlayerPaddle(state, 0, 0);
    const tracker = new BehaviorTracker();

    tracker.update(state, FRAME, stepGame(state, FRAME));

    expect(tracker.getProfile().rallies).toBe(state.totalRallies);
    expect(tracker.getProfile().longestRally).toBe(state.rallyLength);
  });

  it("reset() clears prior-match totals", () => {
    const state = createGameState();
    aimAtPlayerPaddle(state, 5, -5);
    const tracker = new BehaviorTracker();
    tracker.update(state, FRAME, stepGame(state, FRAME));
    expect(tracker.getProfile().misses).toBeGreaterThan(0);

    tracker.reset();

    expect(tracker.getProfile().misses).toBe(0);
    expect(tracker.getProfile().rallies).toBe(0);
  });

  it("ignores a non-positive dt without throwing", () => {
    const state = createGameState();
    const tracker = new BehaviorTracker();

    expect(() => tracker.update(state, 0, stepGame(state, 0))).not.toThrow();
    expect(tracker.getProfile().rallies).toBe(0);
  });
});
