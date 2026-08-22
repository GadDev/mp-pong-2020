import * as THREE from "three";
import { Act } from "../game/presentationState";

// Act 1: fixed low, near-horizontal Tron shot from behind the player's paddle,
// looking down the *length* of the court (MOODBOARD.md is explicit that this is
// the light-cycle-arena angle, not a top-down retro-Pong view).
//
// The Z distance is load-bearing, not taste: the near goal line has to stay
// inside the horizontal frustum at a 16:9 aspect, or the player's own paddle
// walks off-screen at the extremes of its travel. Anything closer than ~14
// clips it.
const ACT_ONE_POSITION = new THREE.Vector3(0, 4.6, 14.5);
const ACT_ONE_LOOKAT = new THREE.Vector3(0, 0.6, -3.5);

// Act 2 ends pulled back and risen — the court reveals it's inside something larger.
const ACT_TWO_END_POSITION = new THREE.Vector3(0, 8, 20);
const ACT_TWO_END_LOOKAT = new THREE.Vector3(0, 1, -2);

/**
 * How long Act 2's pull-back takes. Previously derived from
 * `AUTOPLAY_ACT_DURATION[Act.TWO]` — a debug constant on a deleted scripted
 * timeline. Now that acts are triggered by game state, the pull-back's own
 * pacing is a camera concern and lives here.
 *
 * MOODBOARD.md wants it "almost imperceptibly at first", so this is
 * deliberately longer than an act is likely to last: the player should still
 * be mid-pull-back when Act 3 takes over, rather than the camera arriving and
 * sitting still again.
 */
const ACT_TWO_PULLBACK_SECONDS = 22;

// Act 3 orbital parameters. Kept close enough that the ball stays readable —
// gameplay continues through Act 3, so this is a playability constraint, not
// just a compositional one.
const ACT_THREE_RADIUS = 18;
const ACT_THREE_HEIGHT = 9;
const ACT_THREE_ANGULAR_SPEED = 0.08; // radians/sec — slow orbital drift

// The jarring "watcher" cut: a fixed shot from outside the court looking in.
const WATCHER_POSITION = new THREE.Vector3(14, 3.2, 5);
const WATCHER_LOOKAT = new THREE.Vector3(0, 1, 0);
const WATCHER_PERIOD_SECONDS = 7;
const WATCHER_HOLD_SECONDS = 0.5;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Mutates `camera` in place for the given act/elapsed time. One shared
 * PerspectiveCamera throughout, per MOODBOARD.md's technical note — no
 * camera-swapping except the deliberate Act 3 watcher cut.
 *
 * Returns whether the watcher cut is currently held, so the HUD can surface
 * its `FEED 3 — ARCHIVED` fragment on exactly those frames.
 */
export function updateRevealCamera(
  camera: THREE.PerspectiveCamera,
  act: Act,
  elapsedInAct: number,
  driftSeconds: number,
): boolean {
  if (act === Act.ONE) {
    // Dead still. The stillness is what makes Act 2's movement register as a
    // violation, so real gameplay does not get camera juice here either.
    camera.position.copy(ACT_ONE_POSITION);
    camera.lookAt(ACT_ONE_LOOKAT);
    return false;
  }

  if (act === Act.TWO) {
    const progress = Math.min(elapsedInAct / ACT_TWO_PULLBACK_SECONDS, 1);
    const eased = easeInOutCubic(progress);

    const position = ACT_ONE_POSITION.clone().lerp(ACT_TWO_END_POSITION, eased);
    const lookAt = ACT_ONE_LOOKAT.clone().lerp(ACT_TWO_END_LOOKAT, eased);

    // Handheld-style micro-drift: a few pixels of sway, introduced gradually
    // as the operator/observer presence becomes felt, never full shake.
    const driftAmount = 0.04 * eased;
    position.x += Math.sin(driftSeconds * 0.7) * driftAmount;
    position.y += Math.sin(driftSeconds * 0.9 + 1.3) * driftAmount * 0.6;

    camera.position.copy(position);
    camera.lookAt(lookAt);
    return false;
  }

  // Act 3: check for the watcher cut first — a hard, deliberate jump-cut.
  const cyclePosition = elapsedInAct % WATCHER_PERIOD_SECONDS;
  if (elapsedInAct > 1.5 && cyclePosition < WATCHER_HOLD_SECONDS) {
    camera.position.copy(WATCHER_POSITION);
    camera.lookAt(WATCHER_LOOKAT);
    return true;
  }

  // Orbit starts from the Act 2 end position's bearing so the transition into
  // Act 3 doesn't jump-cut on its first frame.
  const angle = elapsedInAct * ACT_THREE_ANGULAR_SPEED;
  camera.position.set(
    Math.sin(angle) * ACT_THREE_RADIUS,
    ACT_THREE_HEIGHT,
    Math.cos(angle) * ACT_THREE_RADIUS,
  );
  camera.lookAt(0, 1, 0);
  return false;
}
