import { describe, expect, it } from "vitest";
import {
  BALL_BASE_SPEED,
  COURT_HALF_LENGTH,
  COURT_HALF_WIDTH,
  BALL_RADIUS,
  MAX_DEFLECTION_RATIO,
  OPERATOR_TIERS,
  PADDLE_HALF_WIDTH,
  WINNING_SCORE,
  createGameState,
  predictBallXAt,
  setPlayerPaddleX,
  stepGame,
  type GameState,
} from "./gameState";

/**
 * CLAUDE.md's testing policy: a narrow surface of pure functions with
 * unambiguous answers — collision and deflection math, score and win
 * conditions, act-transition triggers. Nothing here asserts on rendering.
 */

/** Enough time to carry the ball the whole court length at base speed, and then some. */
const MAX_FRAME_THAT_OVERSHOOTS = (COURT_HALF_LENGTH * 2) / BALL_BASE_SPEED;

/** Puts the ball just short of the player's goal line, heading into it. */
function aimAtPlayerPaddle(state: GameState, ballX: number, paddleX: number): void {
  state.serveDelay = 0;
  state.ball.x = ballX;
  state.ball.z = COURT_HALF_LENGTH - 0.3;
  state.ball.vx = 0;
  state.ball.vz = BALL_BASE_SPEED;
  setPlayerPaddleX(state, paddleX);
}

describe("deflection", () => {
  it("imparts no lateral velocity on a dead-centre hit", () => {
    const state = createGameState();
    aimAtPlayerPaddle(state, 0, 0);
    const events = stepGame(state, 0.1);

    expect(events.paddleHit).toBe(true);
    expect(state.ball.vx).toBe(0);
    expect(state.ball.vz).toBeLessThan(0);
  });

  it("imparts lateral velocity at the deflection ratio on an edge hit", () => {
    const state = createGameState();
    // Struck at the very edge of the paddle: full deflection.
    aimAtPlayerPaddle(state, PADDLE_HALF_WIDTH, 0);
    stepGame(state, 0.1);

    const axial = Math.abs(state.ball.vz);
    expect(state.ball.vx / axial).toBeCloseTo(MAX_DEFLECTION_RATIO, 5);
  });

  it("deflects toward whichever side of centre was struck", () => {
    const left = createGameState();
    aimAtPlayerPaddle(left, -PADDLE_HALF_WIDTH / 2, 0);
    stepGame(left, 0.1);
    expect(left.ball.vx).toBeLessThan(0);

    const right = createGameState();
    aimAtPlayerPaddle(right, PADDLE_HALF_WIDTH / 2, 0);
    stepGame(right, 0.1);
    expect(right.ball.vx).toBeGreaterThan(0);
  });

  it("counts a return as a rally exchange", () => {
    const state = createGameState();
    aimAtPlayerPaddle(state, 0, 0);
    stepGame(state, 0.1);

    expect(state.rallyLength).toBe(1);
    expect(state.totalRallies).toBe(1);
  });
});

describe("collision", () => {
  it("concedes a point when the ball passes wide of the paddle", () => {
    const state = createGameState();
    aimAtPlayerPaddle(state, 4, 0);
    const events = stepGame(state, 0.2);

    expect(events.operatorScored).toBe(true);
    expect(state.operatorScore).toBe(1);
    expect(state.totalRallies).toBe(0);
  });

  it("returns a ball caught at the extreme edge of the paddle", () => {
    const state = createGameState();
    aimAtPlayerPaddle(state, 0, -(PADDLE_HALF_WIDTH + BALL_RADIUS) + 0.01);
    const events = stepGame(state, 0.1);

    expect(events.paddleHit).toBe(true);
    expect(state.operatorScore).toBe(0);
  });

  it("does not let one large dt tunnel the ball through a paddle", () => {
    const state = createGameState();
    state.serveDelay = 0;
    state.ball.x = 0;
    state.ball.z = 0;
    state.ball.vx = 0;
    state.ball.vz = BALL_BASE_SPEED;
    setPlayerPaddleX(state, 0);

    // A single frame long enough to carry the ball clean past the goal line.
    const events = stepGame(state, MAX_FRAME_THAT_OVERSHOOTS);

    expect(events.paddleHit).toBe(true);
    expect(state.operatorScore).toBe(0);
  });

  it("bounces off the side walls", () => {
    const state = createGameState();
    state.serveDelay = 0;
    state.ball.x = COURT_HALF_WIDTH - 0.2;
    state.ball.z = 0;
    state.ball.vx = BALL_BASE_SPEED;
    state.ball.vz = 0;

    const events = stepGame(state, 0.1);

    expect(events.wallHit).toBe(true);
    expect(state.ball.vx).toBeLessThan(0);
    expect(Math.abs(state.ball.x)).toBeLessThanOrEqual(COURT_HALF_WIDTH);
  });
});

describe("score and win condition", () => {
  it("ends the match at the winning score and names the winner", () => {
    const state = createGameState();
    state.playerScore = WINNING_SCORE - 1;
    // Ball wide of OPERATOR's paddle: the player takes the deciding point.
    state.serveDelay = 0;
    state.ball.x = 4;
    state.ball.z = -COURT_HALF_LENGTH + 0.3;
    state.ball.vx = 0;
    state.ball.vz = -BALL_BASE_SPEED;
    state.operatorPaddleX = 0;

    const events = stepGame(state, 0.2);

    expect(events.playerScored).toBe(true);
    expect(events.matchEnded).toBe(true);
    expect(state.matchOver).toBe(true);
    expect(state.winner).toBe("player");
  });

  it("does not advance once the match is over", () => {
    const state = createGameState();
    state.matchOver = true;
    const before = { ...state.ball };

    const events = stepGame(state, 0.5);

    expect(events).toEqual({
      paddleHit: false,
      wallHit: false,
      playerScored: false,
      operatorScored: false,
      matchEnded: false,
    });
    expect(state.ball).toEqual(before);
  });

  it("does not advance while paused", () => {
    const state = createGameState();
    state.paused = true;
    const before = { ...state.ball };

    stepGame(state, 0.5);

    expect(state.ball).toEqual(before);
  });

  it("holds the ball at centre through the serve delay", () => {
    const state = createGameState();
    stepGame(state, 0.1);

    expect(state.ball.x).toBe(0);
    expect(state.ball.z).toBe(0);
  });
});

describe("predictBallXAt", () => {
  it("returns the straight-line crossing with no bounce", () => {
    const state = createGameState();
    state.ball.x = 0;
    state.ball.z = 0;
    state.ball.vx = 1;
    state.ball.vz = -1;

    // Travelling one unit of -Z per unit of +X.
    expect(predictBallXAt(state, -3)).toBeCloseTo(3, 5);
  });

  it("folds a single wall bounce back into the court", () => {
    const state = createGameState();
    const limit = COURT_HALF_WIDTH - BALL_RADIUS;
    state.ball.x = 0;
    state.ball.z = 0;
    state.ball.vx = 1;
    state.ball.vz = -1;

    // Unreflected it would land at limit + 1; reflected, one unit back inside.
    expect(predictBallXAt(state, -(limit + 1))).toBeCloseTo(limit - 1, 4);
  });

  it("folds two wall bounces back into the court", () => {
    const state = createGameState();
    const limit = COURT_HALF_WIDTH - BALL_RADIUS;
    state.ball.x = 0;
    state.ball.z = 0;
    state.ball.vx = 1;
    state.ball.vz = -1;

    // Unreflected: limit + 2 * limit + 1. Two reflections land it back at -limit + 1.
    const distance = limit + 2 * limit + 1;
    expect(predictBallXAt(state, -distance)).toBeCloseTo(-limit + 1, 4);
  });

  it("stays inside the court for a long arbitrary flight", () => {
    const state = createGameState();
    state.ball.x = 1.3;
    state.ball.z = 0;
    state.ball.vx = 7.4;
    state.ball.vz = -3.1;

    const predicted = predictBallXAt(state, -200);
    expect(Math.abs(predicted)).toBeLessThanOrEqual(COURT_HALF_WIDTH);
  });
});

describe("OPERATOR tiers", () => {
  it("gets monotonically better across the tiers", () => {
    for (let i = 1; i < OPERATOR_TIERS.length; i += 1) {
      const previous = OPERATOR_TIERS[i - 1];
      const tier = OPERATOR_TIERS[i];
      expect(tier.speed).toBeGreaterThan(previous.speed);
      expect(tier.deadzone).toBeLessThan(previous.deadzone);
      expect(tier.prediction).toBeGreaterThan(previous.prediction);
      expect(tier.aimError).toBeLessThan(previous.aimError);
    }
  });

  it("leaves even the top tier beatable", () => {
    // LORE.md requires tier 2 to stay beatable, and a predicting paddle whose
    // aim error can never exceed the catchable extent literally cannot miss —
    // which produced an unbreakable stalemate before this was tuned.
    const top = OPERATOR_TIERS[OPERATOR_TIERS.length - 1];
    expect(top.aimError).toBeGreaterThan(PADDLE_HALF_WIDTH + BALL_RADIUS);
  });

  it("behaves differently at tier 0 and the top tier from the same position", () => {
    const positions: number[] = [];
    for (const tierIndex of [0, OPERATOR_TIERS.length - 1]) {
      const state = createGameState();
      state.serveDelay = 0;
      state.operatorTier = tierIndex;
      // Incoming at a steep angle: only a predicting paddle gets there in time.
      state.ball.x = -3;
      state.ball.z = 3;
      state.ball.vx = 6;
      state.ball.vz = -BALL_BASE_SPEED;

      for (let i = 0; i < 30; i += 1) stepGame(state, 1 / 60);
      positions.push(state.operatorPaddleX);
    }

    expect(positions[0]).not.toBeCloseTo(positions[1], 2);
  });
});

describe("paddle clamping", () => {
  it("keeps the player's paddle fully inside the court", () => {
    const state = createGameState();
    setPlayerPaddleX(state, 999);
    expect(state.playerPaddleX).toBe(COURT_HALF_WIDTH - PADDLE_HALF_WIDTH);

    setPlayerPaddleX(state, -999);
    expect(state.playerPaddleX).toBe(-(COURT_HALF_WIDTH - PADDLE_HALF_WIDTH));
  });
});
