import * as THREE from "three";
import {
  COURT_HALF_WIDTH,
  PADDLE_HALF_WIDTH,
  PLAY_HEIGHT,
  type GameState,
  type StepEvents,
} from "../game/gameState";
import { Act, type PresentationFrame } from "../game/presentationState";
import { updateRevealCamera } from "../reveal/camera";
import { RevealHud } from "../reveal/hud";
import { buildArena, OPERATOR_REVEALED_COLOR, type Arena } from "../reveal/scene";
import { CYAN, SMOG_PURPLE_BLACK, VOID_BLACK } from "../reveal/palette";

/**
 * TECHSTACK.md module 3 of 3. Reads `GameState` and `PresentationFrame` and
 * draws. It never writes to either — if it starts to, the reason a framework
 * was judged unnecessary evaporates.
 */
export class Renderer {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly arena: Arena;
  private readonly hud: RevealHud;
  private readonly background = new THREE.Color(VOID_BLACK);
  private readonly targetBackground = new THREE.Color();
  private readonly operatorColor = new THREE.Color(CYAN);
  private readonly targetOperatorColor = new THREE.Color();
  private driftSeconds = 0;

  constructor(container: HTMLElement) {
    this.arena = buildArena();

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      200,
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.hud = new RevealHud(container);
    window.addEventListener("resize", this.handleResize);
  }

  private readonly handleResize = (): void => {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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

  /** Forwarded from the game loop so the HUD's score flash matches the simulation. */
  registerEvents(events: StepEvents): void {
    this.hud.registerEvents(events);
  }

  render(state: GameState, frame: PresentationFrame, dt: number): void {
    // Only advances while playing, so the camera's micro-drift freezes on pause
    // instead of jumping forward when play resumes.
    this.driftSeconds += dt;

    this.arena.ball.position.set(state.ball.x, PLAY_HEIGHT, state.ball.z);
    this.arena.playerPaddle.position.x = state.playerPaddleX;
    this.arena.operatorPaddle.position.x = state.operatorPaddleX;

    const watcherCut = updateRevealCamera(
      this.camera,
      frame.act,
      frame.elapsedInAct,
      this.driftSeconds,
    );

    this.applyActPalette(frame.act, dt);
    this.hud.update(state, frame, watcherCut, dt);
    this.renderer.render(this.arena.scene, this.camera);
  }

  /**
   * MOODBOARD.md: smog-purple black "replaces void black once the twist starts
   * intruding", and magenta becomes "the opponent's signature color once it's
   * revealed as a character, not a wall". Both are eased rather than switched,
   * and both mutate existing material/scene colours in place — no per-frame
   * allocation, nothing to dispose.
   */
  private applyActPalette(act: Act, dt: number): void {
    this.targetBackground.setHex(act === Act.ONE ? VOID_BLACK : SMOG_PURPLE_BLACK);
    this.targetOperatorColor.setHex(
      act === Act.THREE ? OPERATOR_REVEALED_COLOR : CYAN,
    );

    // Exponential approach, framed in dt so the ramp is refresh-rate independent.
    const k = 1 - Math.exp(-dt * 0.6);
    this.background.lerp(this.targetBackground, k);
    this.operatorColor.lerp(this.targetOperatorColor, k);

    (this.arena.scene.background as THREE.Color).copy(this.background);
    (this.arena.operatorPaddle.material as THREE.MeshBasicMaterial).color.copy(
      this.operatorColor,
    );
  }

  dispose(): void {
    window.removeEventListener("resize", this.handleResize);
    this.arena.dispose();
    this.renderer.dispose();
  }
}
