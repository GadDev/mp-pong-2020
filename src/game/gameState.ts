/**
 * TECHSTACK.md module 1 of 3: ball physics, paddle positions, score, rally
 * count, win condition, a `paused` flag. Knows nothing about rendering or
 * acts — no `three` import belongs in this file, ever. Everything here is
 * pure functions over a plain object so it's testable without a canvas.
 *
 * Court orientation: the play plane is the floor (XZ), matching
 * MOODBOARD.md's Act 1 camera, which looks *down the length* of the court
 * rather than at it from above. The ball travels along Z; paddles slide
 * along X. The player is at +Z (nearest the camera), OPERATOR at -Z.
 */

/** Half-width of the playable court on X — paddles slide within ±this. */
export const COURT_HALF_WIDTH = 6;
/** Half-length on Z. Paddles sit on the goal lines at ±this. */
export const COURT_HALF_LENGTH = 7;
/** Height above the floor plane that gameplay happens at (render-only concern, but shared). */
export const PLAY_HEIGHT = 0.6;

export const PADDLE_HALF_WIDTH = 0.8;
export const BALL_RADIUS = 0.15;

/**
 * Base axial speed, in world units/second, derived from the 2020 original so
 * responsiveness is matched rather than guessed at (ROADMAP.md M3). Legacy
 * ran `ballSpeedX = 10` at `1000/30` ms — 300 px/s across an 800 px canvas,
 * i.e. 0.375 court-lengths per second. Our court is 14 long: 14 × 0.375.
 */
export const BALL_BASE_SPEED = 5.25;

/**
 * Lateral speed imparted at the very edge of the paddle, as a multiple of
 * the axial speed. Legacy's `deltaY * 0.35` over a 100 px paddle produced at
 * most 17.5 px/frame lateral against 10 px/frame axial — a ratio of 1.75.
 * Preserving the ratio preserves the deflection *feel* independently of the
 * unit change.
 */
export const MAX_DEFLECTION_RATIO = 1.75;

/**
 * Each successful return speeds the ball up. The cap is load-bearing, not
 * cosmetic: without enough headroom a competent player and a tier-2 OPERATOR
 * both reach every ball and the rally never ends, so the match never ends and
 * the climax never fires. The ball has to eventually outrun a paddle.
 */
const RALLY_SPEEDUP_PER_HIT = 0.06;
/** Exported so the render layer can scale impact-reaction intensity against the real speed ceiling. */
export const MAX_RALLY_SPEEDUP = 1.4;

export const WINNING_SCORE = 7;

/** Seconds the ball is held at centre after a point, so a score reads as a beat. */
const SERVE_DELAY = 0.9;

/**
 * OPERATOR's behaviour tiers. LORE.md is explicit that these must be real
 * mechanical changes, not cosmetic ones — the climax only lands if the
 * opponent genuinely was adapting. Not exposed as a difficulty setting:
 * BACKLOG.md rejects a player-facing slider for exactly this reason.
 */
export interface OperatorTier {
  /** Max paddle speed in units/second. */
  readonly speed: number;
  /** Distance from paddle centre to ball within which it stops correcting — its error margin. */
  readonly deadzone: number;
  /** 0 = chases the ball's current X, 1 = aims at the ball's predicted arrival X. */
  readonly prediction: number;
  /**
   * Peak aim offset, in world units, applied to whatever it's aiming at. Every
   * tier keeps a non-zero value: the catchable extent is
   * `PADDLE_HALF_WIDTH + BALL_RADIUS`, so an error that can exceed that is the
   * only thing standing between a predicting OPERATOR and an unmissable one —
   * and LORE.md is explicit that tier 2 must stay beatable. Shrinks as the
   * tiers rise, which is what makes the escalation read as "it's getting
   * better at reading me" rather than just faster.
   */
  readonly aimError: number;
}

export const OPERATOR_TIERS: readonly OperatorTier[] = [
  // Tier 0 — reads as plain ball-tracking logic. Deliberately beatable.
  { speed: 4.2, deadzone: 0.9, prediction: 0, aimError: 2.2 },
  // Tier 1 — starts leading the ball. First point at which "it's reading me" is defensible.
  { speed: 5.8, deadzone: 0.45, prediction: 0.55, aimError: 1.5 },
  // Tier 2 — near-full prediction, still fallible. Not unbeatable, by design.
  { speed: 7.6, deadzone: 0.18, prediction: 0.95, aimError: 1.0 },
];

export interface GameState {
  ball: { x: number; z: number; vx: number; vz: number };
  /** Paddle centre X. Both paddles are constrained to the court width. */
  playerPaddleX: number;
  operatorPaddleX: number;
  playerScore: number;
  operatorScore: number;
  /** Exchanges in the current rally — reset on every point. */
  rallyLength: number;
  /**
   * Exchanges across the whole match. This is the reveal trigger input:
   * unlike score, it measures engagement rather than skill, so the escalation
   * fires at a comparable point for a strong and a weak player.
   */
  totalRallies: number;
  paused: boolean;
  matchOver: boolean;
  /** Null once the match is over is impossible — set on the deciding point. */
  winner: "player" | "operator" | null;
  /** Counts down while the ball waits at centre after a point. */
  serveDelay: number;
  operatorTier: number;
}

/** Discrete things that happened during one `stepGame` call, for the render/audio layer to react to. */
export interface StepEvents {
  paddleHit: boolean;
  /** Which paddle registered the hit this step, or `null` on no hit. Read-only classification, not a physics input. */
  paddleHitSide: "player" | "operator" | null;
  /** Where across the paddle it struck, normalized to [-1, 1] from centre. 0 when `paddleHitSide` is null. */
  paddleHitOffset: number;
  /** Outgoing ball speed (world units/second) right after deflection. 0 when `paddleHitSide` is null. */
  paddleHitSpeed: number;
  wallHit: boolean;
  playerScored: boolean;
  operatorScored: boolean;
  matchEnded: boolean;
}

const NO_EVENTS: StepEvents = {
  paddleHit: false,
  paddleHitSide: null,
  paddleHitOffset: 0,
  paddleHitSpeed: 0,
  wallHit: false,
  playerScored: false,
  operatorScored: false,
  matchEnded: false,
};

/**
 * Serve direction alternates deterministically off the total point count
 * rather than randomly, so the same match start is reproducible in tests and
 * when tuning reveal pacing.
 */
function serveToward(pointsPlayed: number): number {
  return pointsPlayed % 2 === 0 ? -1 : 1;
}

export function createGameState(): GameState {
  return {
    ball: { x: 0, z: 0, vx: 0, vz: BALL_BASE_SPEED * serveToward(0) },
    playerPaddleX: 0,
    operatorPaddleX: 0,
    playerScore: 0,
    operatorScore: 0,
    rallyLength: 0,
    totalRallies: 0,
    paused: false,
    matchOver: false,
    winner: null,
    serveDelay: SERVE_DELAY,
    operatorTier: 0,
  };
}

function clampPaddle(x: number): number {
  const limit = COURT_HALF_WIDTH - PADDLE_HALF_WIDTH;
  return Math.min(limit, Math.max(-limit, x));
}

/** Player input. Takes a court-space X; clamping lives here so callers can pass raw values. */
export function setPlayerPaddleX(state: GameState, x: number): void {
  state.playerPaddleX = clampPaddle(x);
}

function resetBall(state: GameState): void {
  const pointsPlayed = state.playerScore + state.operatorScore;
  state.ball.x = 0;
  state.ball.z = 0;
  state.ball.vx = 0;
  state.ball.vz = BALL_BASE_SPEED * serveToward(pointsPlayed);
  state.rallyLength = 0;
  state.serveDelay = SERVE_DELAY;
}

/** Current axial speed magnitude, grown by the rally so far. */
function rallySpeed(state: GameState): number {
  const growth = Math.min(state.rallyLength * RALLY_SPEEDUP_PER_HIT, MAX_RALLY_SPEEDUP);
  return BALL_BASE_SPEED * (1 + growth);
}

/**
 * Deflection off a paddle, preserving the legacy feel: lateral speed is
 * proportional to how far from the paddle's centre the ball struck, and the
 * axial direction simply inverts.
 */
function deflect(
  state: GameState,
  paddleX: number,
  outgoingZSign: number,
): { normalizedOffset: number; speed: number } {
  const offset = state.ball.x - paddleX;
  const normalized = Math.min(1, Math.max(-1, offset / PADDLE_HALF_WIDTH));
  const speed = rallySpeed(state);
  state.ball.vz = speed * outgoingZSign;
  state.ball.vx = normalized * speed * MAX_DEFLECTION_RATIO;
  return { normalizedOffset: normalized, speed };
}

function awardPoint(state: GameState, to: "player" | "operator"): void {
  if (to === "player") state.playerScore += 1;
  else state.operatorScore += 1;

  if (state.playerScore >= WINNING_SCORE || state.operatorScore >= WINNING_SCORE) {
    state.matchOver = true;
    state.winner = state.playerScore > state.operatorScore ? "player" : "operator";
  }
  resetBall(state);
}

/** Where the ball will cross a given Z line, accounting for side-wall bounces. */
export function predictBallXAt(state: GameState, targetZ: number): number {
  const { x, z, vx, vz } = state.ball;
  if (vz === 0) return x;
  const timeToLine = (targetZ - z) / vz;
  if (timeToLine <= 0) return x;

  const limit = COURT_HALF_WIDTH - BALL_RADIUS;
  // Unfold the reflections: mirror the straight-line landing point back into
  // the court by reflecting about ±limit repeatedly, done in closed form.
  const span = limit * 2;
  const raw = x + vx * timeToLine;
  const shifted = ((((raw + limit) % (span * 2)) + span * 2) % (span * 2));
  return shifted <= span ? shifted - limit : span * 2 - shifted - limit;
}

/**
 * Deterministic pseudo-random in [-1, 1] from an integer. Not `Math.random`:
 * the aim error has to be reproducible so a match can be replayed identically
 * when tuning reveal pacing, and so it can be asserted on in tests.
 */
function signedNoise(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

/**
 * OPERATOR's paddle movement for one frame. Its tier is set by the
 * presentation layer. `aimErrorMultiplier` is the interview's one sanctioned
 * gameplay-facing knob (`ObservationDirector.getOperatorAimErrorMultiplier`,
 * nudged by the CONTROL/POSSIBILITY answer) — `main.ts` reads it and passes
 * it in here every step; this module still never reaches out for it itself.
 */
function stepOperator(state: GameState, dt: number, aimErrorMultiplier: number): void {
  const tier = OPERATOR_TIERS[Math.min(state.operatorTier, OPERATOR_TIERS.length - 1)];

  // Only bother predicting while the ball is incoming; otherwise drift to centre,
  // which is what makes the low tier read as dumb tracking logic.
  const incoming = state.ball.vz < 0;
  const aimed = incoming
    ? state.ball.x * (1 - tier.prediction) +
      predictBallXAt(state, -COURT_HALF_LENGTH) * tier.prediction
    : state.ball.x;

  // Keyed on the exchange count, so the error stays fixed for the duration of
  // one incoming ball rather than jittering the paddle every frame.
  const chased = aimed + tier.aimError * aimErrorMultiplier * signedNoise(state.totalRallies + 1);

  const delta = chased - state.operatorPaddleX;
  if (Math.abs(delta) <= tier.deadzone) return;
  const step = Math.min(Math.abs(delta), tier.speed * dt);
  state.operatorPaddleX = clampPaddle(state.operatorPaddleX + Math.sign(delta) * step);
}

/**
 * Advances the simulation by `dt` seconds. Delta-time driven rather than
 * per-frame (BACKLOG.md flags the legacy fixed-interval loop as a
 * correctness bug), and substepped so a long frame can't tunnel the ball
 * through a paddle.
 */
export function stepGame(state: GameState, dt: number, aimErrorMultiplier = 1): StepEvents {
  if (state.paused || state.matchOver || dt <= 0) return { ...NO_EVENTS };

  if (state.serveDelay > 0) {
    state.serveDelay = Math.max(0, state.serveDelay - dt);
    stepOperator(state, dt, aimErrorMultiplier);
    return { ...NO_EVENTS };
  }

  const events: StepEvents = { ...NO_EVENTS };

  // Cap the per-substep travel well below the ball's diameter plus the
  // paddle's thinness, so collision is never resolved after the fact.
  const speed = Math.hypot(state.ball.vx, state.ball.vz) || BALL_BASE_SPEED;
  const substeps = Math.max(1, Math.ceil((speed * dt) / (BALL_RADIUS * 2)));
  const h = dt / substeps;

  for (let i = 0; i < substeps; i += 1) {
    stepOperator(state, h, aimErrorMultiplier);

    state.ball.x += state.ball.vx * h;
    state.ball.z += state.ball.vz * h;

    // Side walls.
    const wallLimit = COURT_HALF_WIDTH - BALL_RADIUS;
    if (state.ball.x < -wallLimit || state.ball.x > wallLimit) {
      state.ball.x = Math.min(wallLimit, Math.max(-wallLimit, state.ball.x));
      state.ball.vx = -state.ball.vx;
      events.wallHit = true;
    }

    // Player goal line (+Z).
    if (state.ball.z > COURT_HALF_LENGTH - BALL_RADIUS && state.ball.vz > 0) {
      if (Math.abs(state.ball.x - state.playerPaddleX) <= PADDLE_HALF_WIDTH + BALL_RADIUS) {
        state.ball.z = COURT_HALF_LENGTH - BALL_RADIUS;
        state.rallyLength += 1;
        state.totalRallies += 1;
        const hit = deflect(state, state.playerPaddleX, -1);
        events.paddleHit = true;
        events.paddleHitSide = "player";
        events.paddleHitOffset = hit.normalizedOffset;
        events.paddleHitSpeed = hit.speed;
      } else {
        awardPoint(state, "operator");
        events.operatorScored = true;
        events.matchEnded = state.matchOver;
        break;
      }
    }

    // OPERATOR goal line (-Z).
    if (state.ball.z < -COURT_HALF_LENGTH + BALL_RADIUS && state.ball.vz < 0) {
      if (Math.abs(state.ball.x - state.operatorPaddleX) <= PADDLE_HALF_WIDTH + BALL_RADIUS) {
        state.ball.z = -COURT_HALF_LENGTH + BALL_RADIUS;
        state.rallyLength += 1;
        state.totalRallies += 1;
        const hit = deflect(state, state.operatorPaddleX, 1);
        events.paddleHit = true;
        events.paddleHitSide = "operator";
        events.paddleHitOffset = hit.normalizedOffset;
        events.paddleHitSpeed = hit.speed;
      } else {
        awardPoint(state, "player");
        events.playerScored = true;
        events.matchEnded = state.matchOver;
        break;
      }
    }
  }

  return events;
}
