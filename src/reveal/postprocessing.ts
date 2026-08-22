import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { FilmPass } from "three/examples/jsm/postprocessing/FilmPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RGBShiftShader } from "three/examples/jsm/shaders/RGBShiftShader.js";
import { Act } from "./timeline";
import { prefersReducedMotion } from "../motion";

/**
 * Milestone 5's post-processing stack, budgeted exactly as TECHSTACK.md
 * specifies:
 *
 * - **Bloom**, on in all three acts — the neon glow the palette depends on.
 * - **One** stylistic pass. Film grain, not scanlines: TECHSTACK.md forbids
 *   stacking both on the grounds that they read near-identically, and grain
 *   was chosen because a scanline pass fights the arena's own grid lines for
 *   the same high-frequency horizontal detail, which reads as moiré on the
 *   floor plane rather than as texture.
 * - **Chromatic aberration**, `enabled = false` by default and switched on
 *   only for the Act 3 watcher cut. Its whole value is being rare; a
 *   permanently-on RGB shift is just a blurry game.
 *
 * `OutputPass` terminates the chain because the composer's intermediate
 * targets are linear — without it, tone mapping and sRGB conversion never
 * happen and every color lands visibly darker than `palette.ts` says it is.
 */

/** Per-act bloom tuning. Act 1 is restrained; Act 3 is where the neon arrives. */
const BLOOM_BY_ACT: Record<Act, { strength: number; radius: number; threshold: number }> = {
  // Act 1 "clean, minimal, unremarkable" — glow on the grid, nothing blown out.
  [Act.ONE]: { strength: 0.55, radius: 0.5, threshold: 0.55 },
  // Act 2 creeps up. Deliberately below the threshold of conscious notice,
  // the same way the camera pull-back is.
  [Act.TWO]: { strength: 0.85, radius: 0.6, threshold: 0.42 },
  // Act 3 full Blade Runner bloom — wet neon, halation around the light.
  [Act.THREE]: { strength: 1.35, radius: 0.8, threshold: 0.28 },
};

/** Grain follows the same curve: barely there in Act 1, textured by Act 3. */
const GRAIN_BY_ACT: Record<Act, number> = {
  [Act.ONE]: 0.12,
  [Act.TWO]: 0.24,
  [Act.THREE]: 0.38,
};

const ABERRATION_AMOUNT = 0.0045;

/**
 * Under reduced motion the animated grain is the problem, not the grain — a
 * static-looking film pass at low intensity keeps the texture without the
 * per-frame luminance churn. Bloom is left alone; it's bright, but it doesn't
 * flash.
 */
const REDUCED_GRAIN = 0.05;

export interface RevealComposer {
  readonly composer: EffectComposer;
  /** Call every frame before rendering; applies per-act tuning. */
  update(act: Act, watcherCutActive: boolean): void;
  setSize(width: number, height: number): void;
  render(): void;
  dispose(): void;
}

export function createRevealComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
): RevealComposer {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM_BY_ACT[Act.ONE].strength,
    BLOOM_BY_ACT[Act.ONE].radius,
    BLOOM_BY_ACT[Act.ONE].threshold,
  );
  composer.addPass(bloom);

  const film = new FilmPass(GRAIN_BY_ACT[Act.ONE], false);
  composer.addPass(film);

  const aberration = new ShaderPass(RGBShiftShader);
  aberration.uniforms.amount.value = ABERRATION_AMOUNT;
  aberration.enabled = false;
  composer.addPass(aberration);

  composer.addPass(new OutputPass());

  // `FilmPass.uniforms` is typed as a bare `object` by @types/three, so the
  // shape has to be asserted once here rather than at each assignment.
  const filmUniforms = film.uniforms as { intensity: { value: number } };

  function update(act: Act, watcherCutActive: boolean): void {
    const reduced = prefersReducedMotion();

    const tuning = BLOOM_BY_ACT[act];
    bloom.strength = tuning.strength;
    bloom.radius = tuning.radius;
    bloom.threshold = tuning.threshold;

    filmUniforms.intensity.value = reduced ? REDUCED_GRAIN : GRAIN_BY_ACT[act];

    // The aberration cut is the single most aggressive visual beat in the
    // game — a hard jump-cut with the color channels torn apart. It is the
    // first thing reduced motion turns off; the watcher cut itself survives,
    // so the "you are being observed" beat still lands.
    aberration.enabled = watcherCutActive && !reduced;
  }

  function setSize(width: number, height: number): void {
    // `EffectComposer.setSize` forwards to every pass, and
    // `UnrealBloomPass.setSize` reallocates its whole mip chain — so the
    // bloom targets follow the window without touching `bloom.resolution`
    // (which is only read at construction and would be a no-op here).
    composer.setSize(width, height);
  }

  function dispose(): void {
    // No act currently rebuilds scene contents, but the composer owns
    // full-resolution render targets — the one thing here that is genuinely
    // expensive to leak once acts start tearing things down.
    composer.dispose();
  }

  return { composer, update, setSize, render: () => composer.render(), dispose };
}
