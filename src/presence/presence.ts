import * as THREE from "three";
import { VOID_BLACK } from "../reveal/palette";
import { prefersReducedMotion } from "../motion";
import { createFace, type Face, type SpeechDrive } from "./face";
import { MAX_FORWARD_Z } from "./faceMesh.data";

/**
 * The pre-game presence — `EXPLORATION.md` §3. Originally Tier 1 (a
 * non-anthropomorphic object reacting to the player); now Tier 3, a
 * faceted humanoid face that talks. See `EXPLORATION.md` for the amendment
 * and the open question it leaves against `LORE.md`'s pre-reveal "no face"
 * rule.
 *
 * It still may not telegraph the arena (`MOODBOARD.md`: the intro has "no
 * grid yet"), which is why this owns its own bare scene rather than
 * borrowing the court from `reveal/scene.ts`.
 */
export type PresenceLayout = "intro" | "menu";

export interface Presence {
  /**
   * `speaking` brightens the mark while a fragment is on screen; `drive` is
   * what the mouth moves to. They are deliberately separate — a voice going
   * quiet mid-line shouldn't darken the mark.
   */
  update(dt: number, speaking: boolean, drive: SpeechDrive): void;
  render(): void;
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
// Per-layout, unlike the floor below it: the mask's whole information content
// is the density of its net, and at the menu's size that net is too fine to
// read as anatomy. The intro can afford the room — the title is the only other
// thing on screen.
const MAX_RADIUS_PX = { intro: 190, menu: 95 } as const;
const MIN_RADIUS_PX = 26;
const BASE_SPIN = 0.06; // rad/s — never fully stops, so it's alive on load
const ATTENTIVE_SPIN = 0.26; // rad/s while the player is moving
const SETTLE_AFTER = 0.45; // s of pointer stillness before it eases back down
const SPIN_DAMPING = 2.2; // how fast spin approaches its target
const TILT_DAMPING = 2.6; // how fast the lean follows the cursor
// The mask has no back of head (`faceMesh.data.ts` — no ears, no skull, no
// neck), so both rotations are bounded well below the old shared 0.32 rad:
// past roughly a fifth of a radian its open edge comes into view and it stops
// reading as a head at all. Two constants because they were one constant doing
// two unrelated jobs.
const MAX_SWAY = 0.14; // rad — idle side-to-side
const MAX_LEAN = 0.16; // rad — cursor follow; a lean, not a stare

export function createPresence(container: HTMLElement): Presence {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID_BLACK);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    100,
  );
  camera.position.set(0, 0, 4.6);

  // No lights, deliberately. `presence/face.ts` is a line drawing — cyan
  // wireframe over a void-black fill that exists only to occlude the far side
  // of the net. The three lights this scene used to carry were for the lit,
  // flat-shaded head that preceded it, and shading is exactly what made that
  // version read as an object rather than a construct.

  // Its own context rather than the game's: `render/renderer.ts` owns the
  // arena's WebGLRenderer privately, and the presence is pre-game chrome, not
  // part of the scene graph that module is responsible for. The two canvases
  // are never visible at the same time.
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);

  // Parent leans toward the cursor, child spins — separated so the two
  // motions can't fight each other on the same Euler.
  const tilt = new THREE.Group();
  const spinner = new THREE.Group();
  tilt.add(spinner);
  scene.add(tilt);

  const face: Face = createFace();
  face.group.scale.setScalar(RADIUS);
  spinner.add(face.group);

  // Photosensitivity: no drift, no pulse, no spin. The object still exists
  // and still brightens when it speaks — it just never moves.
  //
  // Read per frame via the shared flag rather than latched here at
  // construction: the presence is built once on the intro screen and lives
  // for the whole pre-game session, so a boot-time read would ignore a player
  // who turns the OS setting on while looking at it.

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
      Math.min(MAX_RADIUS_PX[layoutKind], available),
    );
    const offsetPx = chromeHalfPx + GAP_PX + radiusPx;

    // `worldPerPx` is derived at z=0, but the mask's nose reaches
    // `MAX_FORWARD_Z` toward the camera and a perspective camera magnifies
    // whatever is nearest it. Solving for the scale that lands the *nearest*
    // part of the mask at `radiusPx` — rather than padding `GAP_PX` to
    // absorb it — keeps the margin correct at every viewport size instead of
    // just the one it was eyeballed at.
    const flat = radiusPx * worldPerPx;
    const perDataUnit = flat / (1 + (MAX_FORWARD_Z * flat) / camera.position.z);

    tilt.scale.setScalar(perDataUnit / RADIUS);
    tilt.position.y = offsetPx * worldPerPx;
  }

  function setViewport(width: number, height: number): void {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    viewportHeight = height;
    applyLayout();
  }

  const handleResize = (): void =>
    setViewport(window.innerWidth, window.innerHeight);
  window.addEventListener("resize", handleResize);

  function setLayout(kind: PresenceLayout): void {
    layoutKind = kind;
    applyLayout();
  }

  setViewport(window.innerWidth, window.innerHeight);

  let facePhase = 0;

  function update(dt: number, speaking: boolean, drive: SpeechDrive): void {
    // Speech brightening is the one thing reduced motion keeps — it's a
    // fade, not movement, and it's what makes a fragment feel spoken.
    speakingMix = approach(speakingMix, speaking ? 1 : 0, dt * 4);
    face.update(dt, drive);

    if (prefersReducedMotion()) return;

    sincePointerMove += dt;
    const attentive = sincePointerMove < SETTLE_AFTER;

    // A face is bounded, not a spinning object — it never turns far enough
    // to show its back. Idle motion is a slow side-to-side sway instead of
    // the icosahedron's continuous rotation.
    spin = approach(
      spin,
      attentive ? ATTENTIVE_SPIN : BASE_SPIN,
      dt * SPIN_DAMPING,
    );
    facePhase += spin * dt;
    spinner.rotation.y = Math.sin(facePhase) * MAX_SWAY;

    tilt.rotation.x = approach(
      tilt.rotation.x,
      pointer.y * MAX_LEAN,
      dt * TILT_DAMPING,
    );
    tilt.rotation.y = approach(
      tilt.rotation.y,
      pointer.x * MAX_LEAN,
      dt * TILT_DAMPING,
    );

    // Small, and smaller than it was: 3.5% was tuned against a mark a third
    // of this one's size, where it was a subtle breath. On the mask it's an
    // eight-pixel lurch that also eats the top margin `applyLayout` reserves.
    const pulse = 1 + speakingMix * 0.015;
    spinner.scale.setScalar(pulse);
  }

  return {
    update,
    render(): void {
      renderer.render(scene, camera);
    },
    setLayout,
    dispose(): void {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      renderer.domElement.remove();
      face.dispose();
      scene.clear();
    },
  };
}

/** Frame-rate independent approach toward a target (no delta-time bug). */
function approach(current: number, target: number, rate: number): number {
  const t = 1 - Math.exp(-Math.max(rate, 0));
  return current + (target - current) * t;
}
