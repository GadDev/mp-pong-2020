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
const MAX_RALLY_SPEEDUP = 1.4;

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

/**
 * Paddle mirroring: an extremely subtle tell, from Act II on, that OPERATOR
 * is watching the player's paddle and not just the ball. Only ever sampled
 * and fired while the ball is heading away from OPERATOR's side (`!incoming`
 * in `stepOperator`), so it can never come at the cost of an intercept — the
 * normal chase target is used unconditionally whenever OPERATOR needs the
 * ball. Rare, delayed and imprecise by construction: the point is a player
 * wondering "was that copying me?", never noticing a mechanic.
 */
const MIRROR_MIN_TIER = 1; // Act II's tier index (see operatorTierFor in presentationState.ts).
const MIRROR_MIN_PLAYER_DELTA = 0.35; // Ignore paddle jitter/noise below this magnitude.
const MIRROR_TRIGGER_PROBABILITY = 0.05; // Chance per qualifying player movement.
const MIRROR_DELAY_MIN = 0.5; // Seconds before OPERATOR reproduces the movement.
const MIRROR_DELAY_MAX = 1.4;
const MIRROR_SCALE_MIN = 0.4; // Reproduced movement is a fraction of the player's, never exact.
const MIRROR_SCALE_MAX = 0.7;
const MIRROR_COOLDOWN = 14; // Minimum seconds between mirrored movements.
const MIRROR_FIRE_TIMEOUT = 1.2; // Force-clear a fire in progress rather than let it linger.

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
  /** Previous frame's player paddle X, so `stepOperator` can detect a movement to mirror. */
  lastPlayerPaddleX: number;
  /** Non-zero while a mirrored movement is scheduled or firing. */
  mirrorOffset: number;
  /** OPERATOR's paddle X when the current mirror was scheduled; the mirror targets this plus `mirrorOffset`. */
  mirrorBaseX: number;
  /** Seconds left before a scheduled mirror starts firing. */
  mirrorDelay: number;
  /** Seconds left to finish firing before it's force-cleared. */
  mirrorFireTimer: number;
  /** Seconds left before another mirror can be scheduled. */
  mirrorCooldown: number;
  /** Increments once per candidate movement; seeds the deterministic trigger/scale/delay rolls. */
  mirrorSeed: number;
}

/** Discrete things that happened during one `stepGame` call, for the render/audio layer to react to. */
export interface StepEvents {
  paddleHit: boolean;
  wallHit: boolean;
  playerScored: boolean;
  operatorScored: boolean;
  matchEnded: boolean;
}

const NO_EVENTS: StepEvents = {
  paddleHit: false,
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
    lastPlayerPaddleX: 0,
    mirrorOffset: 0,
    mirrorBaseX: 0,
    mirrorDelay: 0,
    mirrorFireTimer: 0,
    mirrorCooldown: 0,
    mirrorSeed: 0,
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
function deflect(state: GameState, paddleX: number, outgoingZSign: number): void {
  const offset = state.ball.x - paddleX;
  const normalized = Math.min(1, Math.max(-1, offset / PADDLE_HALF_WIDTH));
  const speed = rallySpeed(state);
  state.ball.vz = speed * outgoingZSign;
  state.ball.vx = normalized * speed * MAX_DEFLECTION_RATIO;
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
 * Samples the player's paddle for a movement worth mirroring later. Only ever
 * schedules or fires while `!mustIntercept`, so it can never compete with an
 * actual save; a mirror in flight is dropped outright the instant the ball
 * turns incoming. Returns the X to move toward this substep, or `null` if
 * `stepOperator` should fall back to its normal ball-chasing target.
 */
function stepMirror(state: GameState, dt: number, mustIntercept: boolean): number | null {
  state.mirrorCooldown = Math.max(0, state.mirrorCooldown - dt);

  const playerDelta = state.playerPaddleX - state.lastPlayerPaddleX;
  state.lastPlayerPaddleX = state.playerPaddleX;

  if (state.mirrorOffset !== 0) {
    if (mustIntercept) {
      state.mirrorOffset = 0;
      state.mirrorDelay = 0;
      return null;
    }
    if (state.mirrorDelay > 0) {
      state.mirrorDelay -= dt;
      return null;
    }

    state.mirrorFireTimer -= dt;
    const target = clampPaddle(state.mirrorBaseX + state.mirrorOffset);
    if (state.mirrorFireTimer <= 0 || Math.abs(target - state.operatorPaddleX) < 0.05) {
      state.mirrorOffset = 0;
    }
    return target;
  }

  if (
    !mustIntercept &&
    state.operatorTier >= MIRROR_MIN_TIER &&
    state.mirrorCooldown <= 0 &&
    Math.abs(playerDelta) >= MIRROR_MIN_PLAYER_DELTA
  ) {
    state.mirrorSeed += 1;
    const roll = (signedNoise(state.mirrorSeed * 7 + 1) + 1) / 2;
    if (roll < MIRROR_TRIGGER_PROBABILITY) {
      const scaleRoll = (signedNoise(state.mirrorSeed * 7 + 2) + 1) / 2;
      const delayRoll = (signedNoise(state.mirrorSeed * 7 + 3) + 1) / 2;
      state.mirrorOffset = playerDelta * (MIRROR_SCALE_MIN + scaleRoll * (MIRROR_SCALE_MAX - MIRROR_SCALE_MIN));
      state.mirrorBaseX = state.operatorPaddleX;
      state.mirrorDelay = MIRROR_DELAY_MIN + delayRoll * (MIRROR_DELAY_MAX - MIRROR_DELAY_MIN);
      state.mirrorFireTimer = MIRROR_FIRE_TIMEOUT;
      state.mirrorCooldown = MIRROR_COOLDOWN;
    }
  }
  return null;
}

/** OPERATOR's paddle movement for one frame. Its tier is set by the presentation layer. */
function stepOperator(state: GameState, dt: number): void {
  const tier = OPERATOR_TIERS[Math.min(state.operatorTier, OPERATOR_TIERS.length - 1)];

  // Only bother predicting while the ball is incoming; otherwise drift to centre,
  // which is what makes the low tier read as dumb tracking logic.
  const incoming = state.ball.vz < 0;
  const aimed = incoming
    ? state.ball.x * (1 - tier.prediction) +
      predictBallXAt(state, -COURT_HALF_LENGTH) * tier.prediction
    : state.ball.x;

  const mirrorTarget = stepMirror(state, dt, incoming);

  // Keyed on the exchange count, so the error stays fixed for the duration of
  // one incoming ball rather than jittering the paddle every frame.
  const chased =
    mirrorTarget !== null ? mirrorTarget : aimed + tier.aimError * signedNoise(state.totalRallies + 1);

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
export function stepGame(state: GameState, dt: number): StepEvents {
  if (state.paused || state.matchOver || dt <= 0) return { ...NO_EVENTS };

  if (state.serveDelay > 0) {
    state.serveDelay = Math.max(0, state.serveDelay - dt);
    stepOperator(state, dt);
    return { ...NO_EVENTS };
  }

  const events: StepEvents = { ...NO_EVENTS };

  // Cap the per-substep travel well below the ball's diameter plus the
  // paddle's thinness, so collision is never resolved after the fact.
  const speed = Math.hypot(state.ball.vx, state.ball.vz) || BALL_BASE_SPEED;
  const substeps = Math.max(1, Math.ceil((speed * dt) / (BALL_RADIUS * 2)));
  const h = dt / substeps;

  for (let i = 0; i < substeps; i += 1) {
    stepOperator(state, h);

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
        deflect(state, state.playerPaddleX, -1);
        events.paddleHit = true;
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
        deflect(state, state.operatorPaddleX, 1);
        events.paddleHit = true;
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
