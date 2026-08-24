import * as THREE from "three";
import { CYAN, VOID_BLACK } from "../reveal/palette";
import { INDICES, POSITIONS } from "./faceMesh.data";

/**
 * The pre-game presence's face: a cyan wireframe mask on void black.
 *
 * `EXPLORATION.md` §3 records this as the "Tier 3 full talking face" the
 * design later adopted; §4 records why it is *this* face. Two things carry the
 * register that override was conditional on:
 *
 * 1. **It is a line drawing, not an object.** A void-black fill sits behind the
 *    lines purely to occlude the far side of the net — there are no lights in
 *    the presence scene at all. A wireframe reads as a model *of* a face rather
 *    than a face, which is the cheapest way to keep spending less of the Act 3
 *    payoff than a lit, shaded head would.
 * 2. **The jaw is driven by audio, not by a clock.** A metronomic sine reads as
 *    an animation; per-syllable impulses (or a real amplitude envelope) read as
 *    speech. See `SpeechDrive`.
 */
export interface Face {
  group: THREE.Group;
  update(dt: number, drive: SpeechDrive): void;
  dispose(): void;
}

/**
 * What the voice tells the face. Three levels of fidelity, best first, because
 * what's available depends on how the line is being produced:
 *
 * - `level` — a real amplitude envelope, available for the pre-rendered
 *   monologue (`presence/bed.ts` decodes it, so it can measure it). Null when
 *   there's nothing to measure.
 * - `impulse` — a monotonic count of speech impulses, one per word boundary
 *   from `speechSynthesis`. The face triggers an envelope when it *increases*,
 *   so a dropped frame can't lose a syllable.
 * - `active` alone — the last resort, when a voice fires no boundary events at
 *   all (Safari, some voices) or when the player is muted. Falls back to the
 *   phase-clock flap this file used to do unconditionally.
 */
export interface SpeechDrive {
  active: boolean;
  impulse: number;
  level: number | null;
}

// Where the jaw is hinged, in the mask's own normalised space (origin-centred,
// two units tall). Roughly ear height and well behind the face plane, so the
// chin swings on an arc instead of sliding down the screen.
const HINGE_Y = -0.15;
const HINGE_Z = -0.45;
// The jaw's influence ramps in over this band rather than starting at a hard
// edge — a step here shows up as a visible crease across the cheeks.
const WEIGHT_FROM_Y = -0.3;
const WEIGHT_TO_Y = -0.62;
// 0.28 rad swings the chin about a sixth of the mask's height, which is close
// to a real jaw at full open. Set against the measured travel rather than by
// feel: much less and the movement is lost at the size the menu renders at.
const MAX_JAW_RADIANS = 0.28;

/** Per-vertex jaw influence, 0 above the ramp and 1 below it. */
function jawWeights(positions: Float32Array): Float32Array {
  const weights = new Float32Array(positions.length / 3);
  for (let i = 0; i < weights.length; i += 1) {
    const y = positions[i * 3 + 1];
    const t = (y - WEIGHT_FROM_Y) / (WEIGHT_TO_Y - WEIGHT_FROM_Y);
    const clamped = Math.min(1, Math.max(0, t));
    // Smoothstep, so the blend has no visible seam at either end of the ramp.
    weights[i] = clamped * clamped * (3 - 2 * clamped);
  }
  return weights;
}

/**
 * The unique edges of a triangle list.
 *
 * `WireframeGeometry` would do this in one line, but it snapshots positions —
 * so an animated jaw would need it rebuilt every frame. Building the index
 * ourselves lets the `LineSegments` share the fill mesh's position attribute
 * instance, and then one `needsUpdate` animates both.
 */
function edgeIndex(indices: Uint16Array): Uint16Array {
  const seen = new Set<number>();
  const edges: number[] = [];
  const add = (a: number, b: number): void => {
    // 512 must stay strictly greater than the vertex count or distinct edges
    // collide and silently vanish. 468 today; raise this with the mesh if it
    // ever grows (`face_model_with_iris.obj`, at 478, would still fit).
    const key = a < b ? a * 512 + b : b * 512 + a;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(a, b);
  };
  for (let i = 0; i < indices.length; i += 3) {
    add(indices[i], indices[i + 1]);
    add(indices[i + 1], indices[i + 2]);
    add(indices[i + 2], indices[i]);
  }
  return new Uint16Array(edges);
}

export function createFace(): Face {
  const group = new THREE.Group();

  // Never mutated, so the rest pose stays exact however long the jaw animates.
  const base = POSITIONS;
  const live = new Float32Array(base);
  const weights = jawWeights(base);
  const position = new THREE.BufferAttribute(live, 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", position);
  geometry.setIndex(new THREE.BufferAttribute(INDICES, 1));

  // Flat void-black, and there for one reason: to hide the far side of the net.
  // The reference look depends on not being able to see through the head.
  // `DoubleSide` because nothing here relies on the upstream winding being
  // consistent, and with no lighting there are no normals to get wrong.
  // `polygonOffset` pushes it a hair back so the wireframe doesn't z-fight with
  // its own fill and shimmer.
  const fillMaterial = new THREE.MeshBasicMaterial({
    color: VOID_BLACK,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const fill = new THREE.Mesh(geometry, fillMaterial);

  // Shares `position` with the fill above — that sharing is the whole reason
  // the edge index is built by hand. `linewidth` is deliberately not set: it
  // is ignored on every WebGL platform, and one device pixel is what the
  // reference images look like anyway.
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute("position", position);
  lineGeometry.setIndex(new THREE.BufferAttribute(edgeIndex(INDICES), 1));
  const lineMaterial = new THREE.LineBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0.55,
  });
  const lines = new THREE.LineSegments(lineGeometry, lineMaterial);

  group.add(fill, lines);

  let jaw = 0;
  let lastImpulse = 0;
  let sawImpulse = false;
  let talkPhase = 0;

  /** Rotates the jaw vertices about the hinge, weighted, into `live`. */
  function applyJaw(angle: number): void {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    for (let i = 0; i < weights.length; i += 1) {
      const w = weights[i];
      const o = i * 3;
      if (w === 0) {
        live[o + 1] = base[o + 1];
        live[o + 2] = base[o + 2];
        continue;
      }
      const y = base[o + 1] - HINGE_Y;
      const z = base[o + 2] - HINGE_Z;
      const ry = y * cos - z * sin;
      const rz = y * sin + z * cos;
      live[o + 1] = HINGE_Y + y + (ry - y) * w;
      live[o + 2] = HINGE_Z + z + (rz - z) * w;
    }
    position.needsUpdate = true;
  }

  function update(dt: number, drive: SpeechDrive): void {
    if (drive.impulse > lastImpulse) {
      lastImpulse = drive.impulse;
      sawImpulse = true;
      jaw = 1;
    }

    let target: number | null = null;
    if (drive.level !== null) {
      // A measured envelope beats anything inferred, so it wins outright.
      target = drive.level;
    } else if (drive.active && !sawImpulse) {
      // No impulses have ever arrived — this voice doesn't report boundaries,
      // or nothing is audible. Irregular flap rather than a clean sine: a
      // metronomic mouth reads as an animation, not speech.
      talkPhase += dt * 11;
      target =
        Math.abs(Math.sin(talkPhase)) * 0.6 +
        Math.abs(Math.sin(talkPhase * 1.7 + 1.1)) * 0.4;
    } else if (!drive.active) {
      target = 0;
    }

    if (target !== null) {
      jaw += (target - jaw) * (1 - Math.exp(-dt * 18));
    } else {
      // Between impulses: decay, so each syllable is a distinct movement.
      jaw *= Math.exp(-dt * 9);
    }

    applyJaw(jaw * MAX_JAW_RADIANS);
  }

  return {
    group,
    update,
    dispose(): void {
      geometry.dispose();
      lineGeometry.dispose();
      fillMaterial.dispose();
      lineMaterial.dispose();
    },
  };
}
