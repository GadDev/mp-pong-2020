import * as THREE from "three";
import { CYAN, NEAR_WHITE, VOID_BLACK } from "../reveal/palette";

/**
 * The pre-game presence — `EXPLORATION.md` §3, Tier 1 ("the Bit, not the
 * MCP"). A non-anthropomorphic object with obvious internal state that
 * reacts to the player: it turns slowly on its own, quickens and leans
 * toward the cursor while you move, and eases back down when you stop.
 *
 * Deliberately not a face. `LORE.md` keeps OPERATOR a *function* until the
 * Act 3 dossier, so nothing here may read as a character on a first pass.
 * It also may not telegraph the arena (`MOODBOARD.md`: the intro has "no
 * grid yet"), which is why this owns its own bare scene rather than
 * borrowing the court from `reveal/scene.ts`.
 */
export type PresenceLayout = "intro" | "menu";

export interface Presence {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** `speaking` brightens the edges while a voice fragment is on screen. */
  update(dt: number, speaking: boolean): void;
  setViewport(width: number, height: number): void;
  /** Which overlay is on screen — decides how much room the text needs. */
  setLayout(kind: PresenceLayout): void;
  dispose(): void;
}

const RADIUS = 0.58; // world units; the on-screen size is set by setViewport
// The overlay chrome is laid out in fixed pixels (ui/theme.css), but a
// perspective object scales with viewport *height* — so the mark is sized and
// placed in pixels and converted to world units. Without this it collides with
// the title on short windows and drifts away from it on tall ones.
// How far the centred overlay text reaches above the middle of the screen:
// the intro is a 48px title alone, the menu adds the options list under it.
const CHROME_HALF_HEIGHT_PX = { intro: 24, menu: 96 } as const;
const GAP_PX = 14;
const MAX_RADIUS_PX = 95;
const MIN_RADIUS_PX = 26;
const BASE_SPIN = 0.06; // rad/s — never fully stops, so it's alive on load
const ATTENTIVE_SPIN = 0.26; // rad/s while the player is moving
const SETTLE_AFTER = 0.45; // s of pointer stillness before it eases back down
const SPIN_DAMPING = 2.2; // how fast spin approaches its target
const TILT_DAMPING = 2.6; // how fast the lean follows the cursor
const MAX_TILT = 0.32; // rad — a lean, not a stare
const QUIET_OPACITY = 0.42;
const SPEAKING_OPACITY = 0.95;

export function createPresence(): Presence {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID_BLACK);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 4.6);

  // Parent leans toward the cursor, child spins — separated so the two
  // motions can't fight each other on the same Euler.
  const tilt = new THREE.Group();
  const spinner = new THREE.Group();
  tilt.add(spinner);
  scene.add(tilt);

  const solid = new THREE.IcosahedronGeometry(RADIUS, 1);
  const geometry = new THREE.WireframeGeometry(solid);
  solid.dispose();

  const material = new THREE.LineBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: QUIET_OPACITY,
  });
  const wireframe = new THREE.LineSegments(geometry, material);
  spinner.add(wireframe);

  // Photosensitivity: no drift, no pulse, no spin. The object still exists
  // and still brightens when it speaks — it just never moves.
  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const pointer = new THREE.Vector2(0, 0);
  // Starts settled but not stopped: a player who never touches the mouse —
  // or is on a touch device, which has no passive pointer movement to wake it
  // — still sees a presence that's turning, just slowly.
  let sincePointerMove = SETTLE_AFTER;
  let spin = BASE_SPIN;
  let speakingMix = 0;

  function onPointerMove(event: PointerEvent): void {
    pointer.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      (event.clientY / window.innerHeight) * 2 - 1,
    );
    sincePointerMove = 0;
  }
  window.addEventListener("pointermove", onPointerMove);

  let layoutKind: PresenceLayout = "menu";
  let viewportHeight = window.innerHeight;

  /**
   * Sizes and places the mark in pixel terms: as large as fits, capped, and
   * always clear of both the text below it and the top of the frame.
   */
  function applyLayout(): void {
    const worldPerPx =
      (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) *
        camera.position.z) /
      viewportHeight;

    const chromeHalfPx = CHROME_HALF_HEIGHT_PX[layoutKind];
    // Half the space left between the text block and the top of the frame.
    const available = (viewportHeight / 2 - chromeHalfPx - GAP_PX * 2) / 2;
    const radiusPx = Math.max(
      MIN_RADIUS_PX,
      Math.min(MAX_RADIUS_PX, available),
    );
    const offsetPx = chromeHalfPx + GAP_PX + radiusPx;

    tilt.scale.setScalar((radiusPx * worldPerPx) / RADIUS);
    tilt.position.y = offsetPx * worldPerPx;
  }

  function setViewport(width: number, height: number): void {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    viewportHeight = height;
    applyLayout();
  }

  function setLayout(kind: PresenceLayout): void {
    layoutKind = kind;
    applyLayout();
  }

  setViewport(window.innerWidth, window.innerHeight);

  const quietColor = new THREE.Color(CYAN);
  const speakingColor = new THREE.Color(NEAR_WHITE);

  function update(dt: number, speaking: boolean): void {
    // Speech brightening is the one thing reduced motion keeps — it's a
    // fade, not movement, and it's what makes a fragment feel spoken.
    speakingMix = approach(speakingMix, speaking ? 1 : 0, dt * 4);
    material.opacity =
      QUIET_OPACITY + (SPEAKING_OPACITY - QUIET_OPACITY) * speakingMix;
    material.color.copy(quietColor).lerp(speakingColor, speakingMix * 0.8);

    if (reducedMotion) return;

    sincePointerMove += dt;
    const attentive = sincePointerMove < SETTLE_AFTER;

    spin = approach(
      spin,
      attentive ? ATTENTIVE_SPIN : BASE_SPIN,
      dt * SPIN_DAMPING,
    );
    spinner.rotation.y += spin * dt;

    tilt.rotation.x = approach(
      tilt.rotation.x,
      pointer.y * MAX_TILT,
      dt * TILT_DAMPING,
    );
    tilt.rotation.y = approach(
      tilt.rotation.y,
      pointer.x * MAX_TILT,
      dt * TILT_DAMPING,
    );

    const pulse = 1 + speakingMix * 0.035;
    spinner.scale.setScalar(pulse);
  }

  return {
    scene,
    camera,
    update,
    setViewport,
    setLayout,
    dispose(): void {
      window.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      scene.clear();
    },
  };
}

/** Frame-rate independent approach toward a target (no delta-time bug). */
function approach(current: number, target: number, rate: number): number {
  const t = 1 - Math.exp(-Math.max(rate, 0));
  return current + (target - current) * t;
}
