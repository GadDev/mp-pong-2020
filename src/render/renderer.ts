import * as THREE from "three";
import {
  BALL_BASE_SPEED,
  COURT_HALF_WIDTH,
  MAX_RALLY_SPEEDUP,
  PADDLE_HALF_WIDTH,
  PLAY_HEIGHT,
  type GameState,
  type StepEvents,
} from "../game/gameState";
import { Act, type PresentationFrame } from "../game/presentationState";
import type { ActivePrompt } from "../game/observation/ObservationDirector";
import { updateRevealCamera } from "../reveal/camera";
import { RevealHud } from "../reveal/hud";
import {
  buildArena,
  BALL_TRAIL_MAX_POINTS,
  OPERATOR_REVEALED_COLOR,
  type Arena,
} from "../reveal/scene";
import { DEEP_BLUE, NEAR_WHITE, SMOG_PURPLE_BLACK, VOID_BLACK } from "../reveal/palette";
import { createRevealComposer, type RevealComposer } from "../reveal/postprocessing";
import { FrameRateProbe } from "../reveal/framerate";
import { buildHorizon, type Horizon } from "../reveal/horizon";
import { motionScale } from "../motion";

/**
 * EXCHANGE tuning: centralized here because `renderer.ts` is what owns the
 * fog, the grid colour and the ball trail. `postprocessing.ts` and
 * `audio.ts` hold their own EXCHANGE constants next to the pass/layer each
 * drives, per this codebase's convention of keeping tuning beside its logic
 * rather than in one shared constants file.
 */
const EXCHANGE_FOG_BASE_DENSITY = 0.012;
const EXCHANGE_FOG_MIN_DENSITY = 0.004;
/** Grid "wakes up" toward this brighter blue as rally intensity rises. */
const EXCHANGE_GRID_GLOW_COLOR = 0x3fd0ff;
const EXCHANGE_TRAIL_MAX_OPACITY = 0.5;
/** Additive on top of Act 2/3's own drift amplitude; Act 1 never gets this. */
const EXCHANGE_CAMERA_DRIFT_MAX = 0.05;

/**
 * TECHSTACK.md module 3 of 3. Reads `GameState` and `PresentationFrame` and
 * draws. It never writes to either — if it starts to, the reason a framework
 * was judged unnecessary evaporates.
 */
export class Renderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly arena: Arena;
  private readonly horizon: Horizon;
  private readonly hud: RevealHud;
  private readonly composer: RevealComposer;
  private readonly frameRate = new FrameRateProbe();
  private readonly background = new THREE.Color(VOID_BLACK);
  private readonly targetBackground = new THREE.Color();
  private readonly operatorColor = new THREE.Color(NEAR_WHITE);
  private readonly targetOperatorColor = new THREE.Color();
  /**
   * 0..1: how far OPERATOR's paddle has diverged from the player's, purely
   * cosmetic. 0 in Act I ("approximately symmetrical" per the design brief),
   * easing toward 1 by Act III — the same exponential-approach pattern as
   * `operatorColor`/`background` below, so all three escalate at a
   * consistent, refresh-rate-independent rate.
   */
  private operatorDistinction = 0;
  private readonly gridColor = new THREE.Color(DEEP_BLUE);
  private readonly targetGridColor = new THREE.Color();
  private readonly gridGlowColor = new THREE.Color(EXCHANGE_GRID_GLOW_COLOR);
  private driftSeconds = 0;

  constructor(container: HTMLElement) {
    this.arena = buildArena();
    this.horizon = buildHorizon(this.arena.scene);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );

    // No `antialias`: with the composer in front, the renderer's MSAA never
    // reaches the screen, so the flag would be a misleading no-op. Edge
    // aliasing on this wireframe-heavy scene is left to the grain and bloom
    // rather than spending the second budgeted pass on SMAA.
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.composer = createRevealComposer(
      this.renderer,
      this.arena.scene,
      this.camera,
    );

    this.hud = new RevealHud(container);
    this.frameRate.attachReadout(container);
    window.addEventListener("resize", this.handleResize);
  }

  private readonly handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    // The composer owns its own render targets, and `setSize` forwards to
    // every pass. Without this they keep their old dimensions and the canvas
    // renders blurry after a resize, with no error to point at.
    this.composer.setSize(window.innerWidth, window.innerHeight);
  };

  /**
   * Pointer X → court X, mapped linearly across the viewport rather than
   * raycast into the floor plane. Deliberate: a raycast would keep the paddle
   * world-aligned, but Act 3's orbital camera and watcher cuts would then send
   * the paddle flying whenever the view moved. Control has to stay predictable
   * *through* the reveal, and this also matches the 2020 original's direct
   * pointer-position-to-paddle-position mapping.
   */
  courtXFromPointer(clientX: number): number {
    const normalized = (clientX / window.innerWidth) * 2 - 1;
    return normalized * (COURT_HALF_WIDTH - PADDLE_HALF_WIDTH);
  }

  /**
   * Forwarded from the game loop so the HUD's score flash matches the
   * simulation, and so a legitimate paddle hit reaches the struck paddle's
   * own impact reaction. `state.rallyLength` (not the event) is the source
   * for the sensor-node tell — it's the match's running consecutive-return
   * count, exactly what "several consecutive successful returns" means.
   */
  registerEvents(state: GameState, events: StepEvents): void {
    this.hud.registerEvents(events);

    if (events.paddleHit && events.paddleHitSide) {
      const speedRange = BALL_BASE_SPEED * MAX_RALLY_SPEEDUP;
      const intensity = Math.min(
        1,
        Math.max(0.7, 0.7 + (0.3 * (events.paddleHitSpeed - BALL_BASE_SPEED)) / speedRange),
      );
      const impact = { offset: events.paddleHitOffset, intensity, rallyLength: state.rallyLength };
      const paddle =
        events.paddleHitSide === "player" ? this.arena.playerPaddle : this.arena.operatorPaddle;
      paddle.onImpact(impact);
    }
  }

  /** Forwarded from `ObservationDirector`'s per-frame result; purely a HUD concern, so it's a thin pass-through. */
  updateInterview(prompt: ActivePrompt | null, leanDirection: "left" | "right" | null): void {
    this.hud.updateInterview(prompt, leanDirection);
  }

  render(
    state: GameState,
    frame: PresentationFrame,
    dt: number,
    grainVarianceMultiplier = 1,
  ): void {
    // Only advances while playing, so the camera's micro-drift freezes on pause
    // instead of jumping forward when play resumes.
    this.driftSeconds += dt;

    this.arena.ball.position.set(state.ball.x, PLAY_HEIGHT, state.ball.z);
    this.arena.playerPaddle.group.position.x = state.playerPaddleX;
    this.arena.operatorPaddle.group.position.x = state.operatorPaddleX;

    // Act I: 0 (symmetrical). Act II: halfway. Act III: fully diverged.
    const targetDistinction = frame.act === Act.ONE ? 0 : frame.act === Act.TWO ? 0.5 : 1;
    this.operatorDistinction += (targetDistinction - this.operatorDistinction) * (1 - Math.exp(-dt * 0.6));

    this.arena.playerPaddle.update(dt);
    this.arena.operatorPaddle.update(dt, this.operatorDistinction);

    const watcherCut = updateRevealCamera(
      this.camera,
      frame.act,
      frame.elapsedInAct,
      this.driftSeconds,
    );

    // EXCHANGE camera drift: a few more pixels of sway on top of whatever Act
    // 2/3 are already doing, never in Act 1 — CLAUDE.md is explicit that Act
    // 1's stillness is load-bearing and gets no juice from anywhere.
    if (frame.act !== Act.ONE) {
      const drift = motionScale(EXCHANGE_CAMERA_DRIFT_MAX * frame.exchangeIntensity);
      this.camera.position.x += Math.sin(this.driftSeconds * 1.3) * drift;
      this.camera.position.y += Math.cos(this.driftSeconds * 1.1) * drift * 0.5;
    }

    this.applyActPalette(frame.act, frame.exchangeIntensity, dt);
    this.horizon.update(frame.act, dt);
    this.updateBallTrail(state, frame.exchangeIntensity);
    this.hud.update(state, frame, watcherCut, dt);

    // Chromatic aberration is scoped to exactly the watcher cut — the same
    // boolean the camera just returned, so the two can't disagree about which
    // frames are "watcher" frames.
    this.composer.update(frame.act, watcherCut, frame.exchangeIntensity, grainVarianceMultiplier);
    this.composer.render();
    this.frameRate.sample(frame.act);
  }

  /**
   * Ring-buffer ball trail: always shifted so the geometry is ready the
   * instant intensity rises, but only opaque and only drawn back `activePoints`
   * vertices — a short rally keeps a near-invisible, near-zero-length tail.
   */
  private updateBallTrail(state: GameState, intensity: number): void {
    const positions = this.arena.ballTrailPositions;
    positions.copyWithin(0, 3);
    const lastIndex = BALL_TRAIL_MAX_POINTS - 1;
    positions[lastIndex * 3] = state.ball.x;
    positions[lastIndex * 3 + 1] = PLAY_HEIGHT;
    positions[lastIndex * 3 + 2] = state.ball.z;

    const positionAttribute = this.arena.ballTrail.geometry.getAttribute(
      "position",
    ) as THREE.BufferAttribute;
    positionAttribute.needsUpdate = true;

    const activePoints = Math.max(2, Math.round(intensity * BALL_TRAIL_MAX_POINTS));
    this.arena.ballTrail.geometry.setDrawRange(
      BALL_TRAIL_MAX_POINTS - activePoints,
      activePoints,
    );
    (this.arena.ballTrail.material as THREE.LineBasicMaterial).opacity =
      intensity * EXCHANGE_TRAIL_MAX_OPACITY;
  }

  /**
   * MOODBOARD.md: smog-purple black "replaces void black once the twist starts
   * intruding", and magenta becomes "the opponent's signature color once it's
   * revealed as a character, not a wall". Both are eased rather than switched,
   * and both mutate existing material/scene colours in place — no per-frame
   * allocation, nothing to dispose.
   */
  private applyActPalette(act: Act, exchangeIntensity: number, dt: number): void {
    this.targetBackground.setHex(act === Act.ONE ? VOID_BLACK : SMOG_PURPLE_BLACK);
    this.targetOperatorColor.setHex(
      act === Act.THREE ? OPERATOR_REVEALED_COLOR : NEAR_WHITE,
    );
    // EXCHANGE "grid emissive strength": the grid brightens toward a livelier
    // blue as the rally goes on, independent of the act's own palette shift.
    this.targetGridColor
      .setHex(DEEP_BLUE)
      .lerp(this.gridGlowColor, exchangeIntensity);

    // Exponential approach, framed in dt so the ramp is refresh-rate independent.
    const k = 1 - Math.exp(-dt * 0.6);
    this.background.lerp(this.targetBackground, k);
    this.operatorColor.lerp(this.targetOperatorColor, k);
    this.gridColor.lerp(this.targetGridColor, k);

    (this.arena.scene.background as THREE.Color).copy(this.background);
    this.arena.operatorPaddle.accentMaterial.color.copy(this.operatorColor);
    this.arena.gridMaterial.color.copy(this.gridColor);

    // EXCHANGE "fog visibility" / "distant geometry visibility": the same
    // fog density read two ways. Thinning it (rather than thickening) is what
    // makes the environment read as *opening up* — "noticeably deeper" — as
    // the rally builds, not as murkier.
    this.arena.fog.density =
      EXCHANGE_FOG_BASE_DENSITY -
      (EXCHANGE_FOG_BASE_DENSITY - EXCHANGE_FOG_MIN_DENSITY) * exchangeIntensity;
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.horizon.dispose();
    this.arena.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}
