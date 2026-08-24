import * as THREE from "three";
import { Act } from "../game/presentationState";
import { CYAN, DEEP_BLUE, SMOG_PURPLE_BLACK, VOID_BLACK } from "./palette";

/**
 * Procedural megastructure horizon (EXCHANGE): the court sits inside a much
 * larger synthetic environment. Deliberately ambiguous — the same box
 * primitives read as towers, server racks, or machinery depending on how
 * close you let yourself look, which is the point (no recognizable skyline).
 *
 * Reveal is done with fog distance + material opacity/color, not by adding
 * geometry over time: everything below is built once, seeded, and eased
 * in/out per act. That keeps it cheap (one InstancedMesh draw call per
 * variant) and keeps the court visually dominant — the horizon only resolves
 * once fog lets it.
 */

export interface HorizonOptions {
  /** Deterministic layout: same seed → same skyline every load. */
  seed: number;
  /** Structures per ring band. Lower = cheaper, sparser horizon. */
  density: number;
  /** Inner radius: how far beyond the court the nearest structures start. */
  innerRadius: number;
  /** Outer radius: where the far edge of the skyline sits, before fog eats it. */
  outerRadius: number;
}

export const DEFAULT_HORIZON_OPTIONS: HorizonOptions = {
  seed: 0x9e3779b1,
  density: 90,
  innerRadius: 26,
  outerRadius: 90,
};

export interface Horizon {
  group: THREE.Group;
  /** Eases opacity/fog toward the target act's reveal level. Call once per frame. */
  update(act: Act, dt: number): void;
  dispose(): void;
}

/** mulberry32 — tiny seeded PRNG, deterministic across runs. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per-act target: how far fog reaches, and how visible the structures are. */
const ACT_REVEAL: Record<Act, { fogFar: number; opacity: number; strip: number }> = {
  [Act.ONE]: { fogFar: 34, opacity: 0.05, strip: 0.06 },
  [Act.TWO]: { fogFar: 65, opacity: 0.28, strip: 0.4 },
  [Act.THREE]: { fogFar: 140, opacity: 0.6, strip: 0.85 },
};

const FOG_NEAR = 10;

/**
 * Builds the horizon once as two InstancedMesh draw calls (bodies +
 * light strips) plus a wireframe pass for the Tron edge language. Variation
 * between "monolith / tower / antenna / bridge deck / stacked volume" comes
 * entirely from per-instance scale, not distinct geometry, which is what
 * keeps this to a handful of draw calls regardless of density.
 */
export function buildHorizon(
  scene: THREE.Scene,
  options: Partial<HorizonOptions> = {},
): Horizon {
  const opts = { ...DEFAULT_HORIZON_OPTIONS, ...options };
  const rng = mulberry32(opts.seed);

  const group = new THREE.Group();
  group.name = "horizon";

  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  const bodyMaterial = new THREE.MeshBasicMaterial({
    color: DEEP_BLUE,
    transparent: true,
    opacity: 0,
  });
  const wireMaterial = new THREE.MeshBasicMaterial({
    color: CYAN,
    wireframe: true,
    transparent: true,
    opacity: 0,
  });
  const stripMaterial = new THREE.MeshBasicMaterial({
    color: CYAN,
    transparent: true,
    opacity: 0,
  });

  const bodies = new THREE.InstancedMesh(boxGeometry, bodyMaterial, opts.density);
  const wireframes = new THREE.InstancedMesh(boxGeometry, wireMaterial, opts.density);
  // Roughly a fifth of the field is thin vertical light strips (antenna /
  // signal masts) rather than volumetric structures — the pinpricks that
  // resolve first as fog lifts, before the bulkier silhouettes do.
  const stripCount = Math.max(1, Math.round(opts.density * 0.2));
  const strips = new THREE.InstancedMesh(boxGeometry, stripMaterial, stripCount);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();

  for (let i = 0; i < opts.density; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = opts.innerRadius + rng() * (opts.outerRadius - opts.innerRadius);
    position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);

    // Shape family purely via aspect ratio: tall+thin reads as antenna/tower,
    // wide+flat reads as a bridge deck or stacked platform, cubic reads as a
    // monolith. All ambiguous — none of them resolve into a recognizable
    // building.
    const family = rng();
    let width: number;
    let height: number;
    let depth: number;
    if (family < 0.4) {
      // monolith / tower
      width = 1.5 + rng() * 3;
      height = 6 + rng() * 34;
      depth = 1.5 + rng() * 3;
    } else if (family < 0.7) {
      // antenna-like
      width = 0.3 + rng() * 0.6;
      height = 14 + rng() * 40;
      depth = 0.3 + rng() * 0.6;
    } else {
      // bridge deck / stacked volume
      width = 6 + rng() * 14;
      height = 0.6 + rng() * 1.6;
      depth = 1 + rng() * 2.5;
    }
    scale.set(width, height, depth);
    position.y = height / 2 - rng() * height * 0.15; // some structures sink partly below grade

    matrix.compose(position, quaternion, scale);
    bodies.setMatrixAt(i, matrix);
    wireframes.setMatrixAt(i, matrix);
  }

  for (let i = 0; i < stripCount; i++) {
    const angle = rng() * Math.PI * 2;
    const radius = opts.innerRadius + rng() * (opts.outerRadius - opts.innerRadius);
    const height = 20 + rng() * 60;
    position.set(Math.sin(angle) * radius, height / 2, Math.cos(angle) * radius);
    scale.set(0.12, height, 0.12);
    matrix.compose(position, quaternion, scale);
    strips.setMatrixAt(i, matrix);
  }

  bodies.instanceMatrix.needsUpdate = true;
  wireframes.instanceMatrix.needsUpdate = true;
  strips.instanceMatrix.needsUpdate = true;

  group.add(bodies, wireframes, strips);
  scene.add(group);

  const fog = new THREE.Fog(VOID_BLACK, FOG_NEAR, ACT_REVEAL[Act.ONE].fogFar);
  scene.fog = fog;

  const fogColor = new THREE.Color(VOID_BLACK);
  const targetFogColor = new THREE.Color();
  let fogFar = ACT_REVEAL[Act.ONE].fogFar;
  let bodyOpacity = 0;
  let stripOpacity = 0;

  return {
    group,
    update(act: Act, dt: number): void {
      const target = ACT_REVEAL[act];
      const k = 1 - Math.exp(-dt * 0.5);

      fogFar += (target.fogFar - fogFar) * k;
      bodyOpacity += (target.opacity - bodyOpacity) * k;
      stripOpacity += (target.strip - stripOpacity) * k;

      targetFogColor.setHex(act === Act.ONE ? VOID_BLACK : SMOG_PURPLE_BLACK);
      fogColor.lerp(targetFogColor, k);

      fog.far = fogFar;
      fog.color.copy(fogColor);
      bodyMaterial.opacity = bodyOpacity;
      wireMaterial.opacity = bodyOpacity * 1.1;
      stripMaterial.opacity = stripOpacity;
    },
    dispose(): void {
      boxGeometry.dispose();
      bodyMaterial.dispose();
      wireMaterial.dispose();
      stripMaterial.dispose();
      scene.fog = null;
      group.removeFromParent();
    },
  };
}
