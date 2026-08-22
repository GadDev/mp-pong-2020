import * as THREE from "three";
import { Act, AUTOPLAY_ACT_DURATION } from "./timeline";

// Act 1: fixed low Tron-style shot, looking down the length of the court.
const ACT_ONE_POSITION = new THREE.Vector3(0, 1.1, 6.5);
const ACT_ONE_LOOKAT = new THREE.Vector3(0, 0.6, -8);

// Act 2 ends pulled back and risen — the court reveals it's inside something larger.
const ACT_TWO_END_POSITION = new THREE.Vector3(0, 5, 13);
const ACT_TWO_END_LOOKAT = new THREE.Vector3(0, 1, -6);

// Act 3 orbital parameters, continuing from where Act 2 left off.
const ACT_THREE_RADIUS = 13;
const ACT_THREE_HEIGHT = 6.5;
const ACT_THREE_ANGULAR_SPEED = 0.12; // radians/sec — slow orbital drift

// The jarring "watcher" cut: a fixed shot from outside the court looking in.
const WATCHER_POSITION = new THREE.Vector3(9, 2.2, 2);
const WATCHER_LOOKAT = new THREE.Vector3(0, 1, 0);
const WATCHER_PERIOD_SECONDS = 6;
const WATCHER_HOLD_SECONDS = 0.4;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
}

/**
 * Mutates `camera` in place for the given act/elapsed time. One shared
 * PerspectiveCamera throughout, per MOODBOARD.md's technical note — no
 * camera-swapping except the deliberate Act 3 watcher cut.
 */
export function updateRevealCamera(
  camera: THREE.PerspectiveCamera,
  act: Act,
  elapsedInAct: number,
  nowSeconds: number,
): void {
  if (act === Act.ONE) {
    camera.position.copy(ACT_ONE_POSITION);
    camera.lookAt(ACT_ONE_LOOKAT);
    return;
  }

  if (act === Act.TWO) {
    const progress = Math.min(
      elapsedInAct / AUTOPLAY_ACT_DURATION[Act.TWO],
      1,
    );
    const eased = easeInOutCubic(progress);

    const position = ACT_ONE_POSITION.clone().lerp(
      ACT_TWO_END_POSITION,
      eased,
    );
    const lookAt = ACT_ONE_LOOKAT.clone().lerp(ACT_TWO_END_LOOKAT, eased);

    // Handheld-style micro-drift: a few pixels of sway, introduced gradually
    // as the operator/observer presence becomes felt, never full shake.
    const driftAmount = 0.03 * eased;
    position.x += Math.sin(nowSeconds * 0.7) * driftAmount;
    position.y += Math.sin(nowSeconds * 0.9 + 1.3) * driftAmount * 0.6;

    camera.position.copy(position);
    camera.lookAt(lookAt);
    return;
  }

  // Act 3: check for the watcher cut first — a hard, deliberate jump-cut.
  const cyclePosition = elapsedInAct % WATCHER_PERIOD_SECONDS;
  if (elapsedInAct > 1 && cyclePosition < WATCHER_HOLD_SECONDS) {
    camera.position.copy(WATCHER_POSITION);
    camera.lookAt(WATCHER_LOOKAT);
    return;
  }

  const angle = elapsedInAct * ACT_THREE_ANGULAR_SPEED;
  camera.position.set(
    Math.sin(angle) * ACT_THREE_RADIUS,
    ACT_THREE_HEIGHT,
    Math.cos(angle) * ACT_THREE_RADIUS,
  );
  camera.lookAt(0, 1, 0);
}
