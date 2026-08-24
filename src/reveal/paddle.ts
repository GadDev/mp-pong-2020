import * as THREE from "three";
import { GRAPHITE, NEUTRAL_GRAY, VOID_BLACK } from "./palette";

/**
 * Paddle visual construction, split out of scene.ts because it grew from "one
 * box" into layered construction (core / emissive accents / surface detail /
 * impact reaction / idle instrumentation). Purely decorative — gameplay only
 * ever reads/writes `GameState.playerPaddleX` / `operatorPaddleX` and moves
 * `PaddleVisual.group`'s `.position.x`; nothing here changes the paddle's
 * collision width (`PADDLE_HALF_WIDTH` in gameState.ts) or its footprint.
 * `group` is never touched by the impact system — recoil animates a *child*
 * group instead (see `visualGroup` below), so a collision can never move the
 * gameplay-tracked paddle position.
 *
 * Scene stays unlit (scene.ts's `MeshBasicMaterial`-only rule holds — see its
 * module comment). The core's bevel is faked with a 6-face material array of
 * fixed flat shades instead of a real light + `MeshStandardMaterial`, so nothing
 * here needs the scene to grow a light source.
 */

export type PaddleKind = "player" | "operator";

export interface PaddleGeometrySet {
  core: THREE.BoxGeometry;
  edge: THREE.BoxGeometry;
  seam: THREE.BoxGeometry;
  /** OPERATOR-only, and only once escalation has progressed — see `PaddleTuning.operatorDistinction`. */
  secondarySeam: THREE.BoxGeometry;
  groove: THREE.BoxGeometry;
  node: THREE.BoxGeometry;
  flash: THREE.BoxGeometry;
  sensor: THREE.BoxGeometry;
  indicatorBar: THREE.BoxGeometry;
}

/** What gameState.ts's collision reports; everything below is display, not physics. */
export interface PaddleImpact {
  /** Where across the paddle it struck, normalized to [-1, 1] from centre. */
  offset: number;
  /** 0..1, already clamped by the caller (renderer.ts) from ball speed. */
  intensity: number;
  /** GameState.rallyLength at the moment of this hit — drives the sensor-node tell, player only. */
  rallyLength: number;
}

export interface PaddleVisual {
  /** Gameplay-positioned — renderer.ts writes `.position.x` here every frame. */
  group: THREE.Group;
  /** The one material every emissive accent (edges, seam, end-caps) shares,
   * so an act-driven colour reveal (renderer.ts) mutates a single instance
   * in place rather than touching several meshes. */
  accentMaterial: THREE.MeshBasicMaterial;
  /** Report a legitimate paddle hit. Purely visual — never touches gameplay state. */
  onImpact(impact: PaddleImpact): void;
  /**
   * Advance idle breathing + any in-flight impact reaction. Call once per
   * rendered frame. `operatorDistinction` is a 0..1 escalation scalar
   * (renderer.ts, keyed off `PresentationFrame.act`): at 0 the OPERATOR
   * paddle reads as symmetrical with the player's, per the brief's "Act I
   * should appear approximately symmetrical"; the player paddle ignores the
   * argument entirely. Not applicable to the player, so it's optional.
   */
  update(dt: number, operatorDistinction?: number): void;
}

/** Centralised tuning: every magic number that shapes how a paddle looks or reacts lives here. */
export const PADDLE_TUNING = {
  coreSideLerp: 0.22,
  coreDarkLerp: 0.6,
  recoilPeakSeconds: 0.12,
  recoilAmplitude: 0.03,
  flashAttackSeconds: 0.012,
  flashDecaySeconds: 0.09,
  energyDelaySeconds: 0.045,
  pulseAttackSeconds: 0.05,
  pulseDecaySeconds: 0.13,
  sensorBlinkAttackSeconds: 0.05,
  sensorBlinkDecaySeconds: 0.55,
  /** OPERATOR-only, scaled by `operatorDistinction`. */
  operatorSeamNarrowRatio: 0.64,
  operatorAccentOpacityAtFull: 0.85,
  operatorSecondGrooveOpacityAtFull: 0,
  operatorBreathAmplitudeAtFull: 0.012,
  operatorBreathAmplitudeAtZero: 0.03,
  operatorSecondarySeamOpacityAtFull: 0.4,
} as const;

const coreFront = new THREE.Color(GRAPHITE);
const coreSide = new THREE.Color(GRAPHITE).lerp(
  new THREE.Color(NEUTRAL_GRAY),
  PADDLE_TUNING.coreSideLerp,
);
const coreDark = new THREE.Color(GRAPHITE).lerp(
  new THREE.Color(VOID_BLACK),
  PADDLE_TUNING.coreDarkLerp,
);

/**
 * Builds the shared geometry both paddles reuse. Called once; the resulting
 * geometries are instanced per-paddle the same way the old single
 * `paddleGeometry` was shared between the two boxes.
 */
export function createPaddleGeometry(
  width: number,
  height: number,
  depth: number,
): PaddleGeometrySet {
  const edgeWidth = width * 0.06;
  const grooveThickness = height * 0.035;
  const nodeSize = width * 0.05;
  return {
    core: new THREE.BoxGeometry(width, height, depth),
    edge: new THREE.BoxGeometry(edgeWidth, height * 0.9, depth * 1.05),
    seam: new THREE.BoxGeometry(width * 0.05, height * 0.55, depth * 1.05),
    secondarySeam: new THREE.BoxGeometry(width * 0.022, height * 0.42, depth * 1.05),
    groove: new THREE.BoxGeometry(width * 0.82, grooveThickness, depth * 1.05),
    node: new THREE.BoxGeometry(nodeSize, nodeSize, depth * 1.1),
    // Impact flash: small, reused every hit, just repositioned/re-opacity'd.
    flash: new THREE.BoxGeometry(width * 0.12, height * 0.5, depth * 1.15),
    // A single "instrumentation" sensor — a near-invisible lens/LED, not a UI element.
    sensor: new THREE.BoxGeometry(width * 0.028, width * 0.028, depth * 1.1),
    // The segmented indicator strip: three tiny static bars.
    indicatorBar: new THREE.BoxGeometry(width * 0.05, height * 0.02, depth * 1.05),
  };
}

/**
 * Six flat, fixed-shade faces standing in for a beveled edge under real
 * light: sides a touch brighter (as if catching a rim light), top/bottom a
 * touch darker (as if recessed). Cheap, and consistent with the scene's
 * unlit convention — no new material type, no light.
 */
function createCoreMaterials(): THREE.MeshBasicMaterial[] {
  const front = new THREE.MeshBasicMaterial({ color: coreFront });
  const side = new THREE.MeshBasicMaterial({ color: coreSide });
  const dark = new THREE.MeshBasicMaterial({ color: coreDark });
  // BoxGeometry face group order: +x, -x, +y, -y, +z, -z.
  return [side, side, dark, dark, front, front];
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Rises over `attack` seconds, holds a beat, then falls over `decay` seconds. 0 outside that window. */
function pulseEnvelope(t: number, delay: number, attack: number, decay: number): number {
  const u = t - delay;
  if (u < 0) return 0;
  if (u < attack) return clamp01(u / attack);
  const d = u - attack;
  if (d > decay) return 0;
  return 1 - clamp01(d / decay);
}

function easeOutCubic(u: number): number {
  const v = clamp01(u);
  return 1 - Math.pow(1 - v, 3);
}

function easeInOutCubic(u: number): number {
  const v = clamp01(u);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
}

// Impact timing (seconds) — guides from the design brief, tuned by feel.
// Sourced from `PADDLE_TUNING` so every tunable number lives in one place.
const RECOIL_PEAK = PADDLE_TUNING.recoilPeakSeconds;
const FLASH_ATTACK = PADDLE_TUNING.flashAttackSeconds;
const FLASH_DECAY = PADDLE_TUNING.flashDecaySeconds;
const ENERGY_DELAY = PADDLE_TUNING.energyDelaySeconds;
const PULSE_ATTACK = PADDLE_TUNING.pulseAttackSeconds;
const PULSE_DECAY = PADDLE_TUNING.pulseDecaySeconds;
const RECOIL_AMPLITUDE = PADDLE_TUNING.recoilAmplitude;
const SENSOR_BLINK_ATTACK = PADDLE_TUNING.sensorBlinkAttackSeconds;
const SENSOR_BLINK_DECAY = PADDLE_TUNING.sensorBlinkDecaySeconds;

/**
 * One paddle: a dark core, a thin emissive accent system, restrained surface
 * detail, a tiny instrumentation cluster, and a self-contained impact
 * reaction + idle-breathing controller. `kind` only controls the subtle
 * player/operator asymmetry described in the design briefs — never meant to
 * be readable as "good vs evil" at a glance, and never randomized: every
 * asymmetry below is a fixed function of `kind` and, for the player, of the
 * hit's own offset/rally length, so replays stay deterministic.
 */
export function createPaddleVisual(
  kind: PaddleKind,
  geometry: PaddleGeometrySet,
  accentColorHex: number,
  track: <T extends { dispose(): void }>(resource: T) => T,
): PaddleVisual {
  const group = new THREE.Group();
  // Recoil lives here, not on `group` — `group.position.x` is gameplay-owned
  // (renderer.ts writes it every frame from GameState), so a collision can
  // never leak into paddle collider position. Recoil only ever touches
  // `visualGroup.position.z`, a purely cosmetic local offset.
  const visualGroup = new THREE.Group();
  group.add(visualGroup);

  const coreMaterials = createCoreMaterials().map((m) => track(m));
  const core = new THREE.Mesh(geometry.core, coreMaterials);
  visualGroup.add(core);

  // Act I: PLAYER and OPERATOR read as symmetrical, per the brief — same
  // geometry, same accent opacity, same groove count. OPERATOR's departures
  // (narrower seam, a second seam, one fewer groove, a steadier glow) are
  // *emergent*: `update()`'s `operatorDistinction` scalar (driven by
  // `PresentationFrame.act` in renderer.ts) fades them in gradually across
  // Acts II-III, rather than baking them in at construction. `transparent`
  // stays on for both so idle breathing can modulate opacity without a
  // material swap.
  const baseAccentOpacity = 1;
  const accentMaterial = track(
    new THREE.MeshBasicMaterial({
      color: accentColorHex,
      transparent: true,
      opacity: baseAccentOpacity,
    }),
  );

  const halfWidth = geometry.core.parameters.width / 2;
  const edgeInset = halfWidth - geometry.edge.parameters.width / 2;
  const edgeLeft = new THREE.Mesh(geometry.edge, accentMaterial);
  edgeLeft.position.x = -edgeInset;
  visualGroup.add(edgeLeft);
  const edgeRight = new THREE.Mesh(geometry.edge, accentMaterial);
  edgeRight.position.x = edgeInset;
  visualGroup.add(edgeRight);

  const seam = new THREE.Mesh(geometry.seam, accentMaterial);
  visualGroup.add(seam);

  // OPERATOR-only, and invisible until distinction has emerged: a second,
  // thinner seam offset to one side — "additional seam" from the brief.
  const secondarySeamMaterial = track(
    new THREE.MeshBasicMaterial({ color: accentColorHex, transparent: true, opacity: 0 }),
  );
  const secondarySeam = new THREE.Mesh(geometry.secondarySeam, secondarySeamMaterial);
  secondarySeam.position.x = halfWidth * 0.22;
  if (kind === "operator") visualGroup.add(secondarySeam);

  const nodeTop = new THREE.Mesh(geometry.node, accentMaterial);
  nodeTop.position.y = geometry.core.parameters.height / 2 - geometry.node.parameters.height / 2;
  visualGroup.add(nodeTop);
  const nodeBottom = new THREE.Mesh(geometry.node, accentMaterial);
  nodeBottom.position.y = -nodeTop.position.y;
  visualGroup.add(nodeBottom);

  // Shallow dark separators — both paddles carry two at Act I (symmetry).
  // OPERATOR's second one fades out as distinction emerges, so it gets its
  // own material; the player's pair stays on one shared, static material.
  const grooveMaterial = track(
    new THREE.MeshBasicMaterial({ color: VOID_BLACK, transparent: true, opacity: 0.5 }),
  );
  const grooveFirst = new THREE.Mesh(geometry.groove, grooveMaterial);
  grooveFirst.position.y = geometry.core.parameters.height * -0.14;
  visualGroup.add(grooveFirst);

  const secondGrooveMaterial = track(
    new THREE.MeshBasicMaterial({ color: VOID_BLACK, transparent: true, opacity: 0.5 }),
  );
  const grooveSecond = new THREE.Mesh(geometry.groove, secondGrooveMaterial);
  grooveSecond.position.y = geometry.core.parameters.height * 0.14;
  visualGroup.add(grooveSecond);

  // --- Tiny instrumentation (at most 3 details, none legible as UI) -------

  // 1. A single sensor-like node, off-centre so it doesn't read as
  // symmetric decoration. Idle it's a near-invisible dim point, identical on
  // both paddles at Act I. The player's brightens briefly every 4th
  // consecutive return, always. OPERATOR's only starts doing the same once
  // distinction has emerged (a "pre-impact light response" reading as
  // increasingly less inert, never explained) — see `updateSensor`.
  const sensorBaseOpacity = 0.16;
  const sensorMaterial = track(
    new THREE.MeshBasicMaterial({
      color: NEUTRAL_GRAY,
      transparent: true,
      opacity: sensorBaseOpacity,
    }),
  );
  const sensor = new THREE.Mesh(geometry.sensor, sensorMaterial);
  sensor.position.set(halfWidth * 0.55, geometry.core.parameters.height * 0.28, halfWidth * 0.001);
  visualGroup.add(sensor);

  // 2. A narrow segmented indicator — three static bars near the bottom
  // edge, evenly lit on both paddles at Act I. Nothing here ever animates.
  const indicatorMaterials = [0.18, 0.26, 0.15].map((opacity) =>
    track(new THREE.MeshBasicMaterial({ color: NEUTRAL_GRAY, transparent: true, opacity })),
  );
  const indicatorY = -geometry.core.parameters.height * 0.32;
  indicatorMaterials.forEach((material, i) => {
    const bar = new THREE.Mesh(geometry.indicatorBar, material);
    bar.position.set(-halfWidth * 0.35 + i * halfWidth * 0.35, indicatorY, halfWidth * 0.001);
    visualGroup.add(bar);
  });

  // --- Impact flash (Phase 1) ---------------------------------------------

  const flashMaterial = track(
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
  );
  const flash = new THREE.Mesh(geometry.flash, flashMaterial);
  visualGroup.add(flash);

  // --- Energy propagation overlays (Phase 2 + 4) --------------------------
  // Coincident with the real edges/seam, offset a hair in Z to avoid
  // z-fighting, and otherwise idle at opacity 0 — an impact briefly lights
  // them up brighter than the steady accent glow, then they fade back out.
  const pulseColor = new THREE.Color(accentColorHex).lerp(new THREE.Color(0xffffff), 0.55);
  const makePulseOverlay = (geom: THREE.BoxGeometry, x: number): { mesh: THREE.Mesh; material: THREE.MeshBasicMaterial } => {
    const material = track(
      new THREE.MeshBasicMaterial({ color: pulseColor, transparent: true, opacity: 0 }),
    );
    const mesh = new THREE.Mesh(geom, material);
    mesh.position.x = x;
    mesh.position.z = geom.parameters.depth * 0.02;
    visualGroup.add(mesh);
    return { mesh, material };
  };
  const pulseLeft = makePulseOverlay(geometry.edge, -edgeInset);
  const pulseRight = makePulseOverlay(geometry.edge, edgeInset);
  const pulseSeam = makePulseOverlay(geometry.seam, 0);

  // --- Recoil direction (Phase 3) -----------------------------------------
  // Player sits at +Z facing the court centre, OPERATOR at -Z; each recoils
  // outward, away from its own goal line, never sideways.
  const recoilSign = kind === "player" ? 1 : -1;

  // --- Player/operator determinism (no randomness, just fixed functions) --
  const isOperator = kind === "operator";

  // --- Runtime state -------------------------------------------------------
  let impactActive = false;
  let impactElapsed = 0;
  let impactOffset = 0;
  let impactIntensity = 0;
  let impactRecoilTotal = 0.24;
  let impactFarDelay = ENERGY_DELAY + 0.05;

  let sensorActive = false;
  let sensorElapsed = 0;

  let breatheClock = 0;
  /** Latest `operatorDistinction` seen by `update()`, so `onImpact` (called
   * separately, from `renderer.registerEvents`) can read the same escalation
   * state without renderer.ts having to pass it twice. Always 0 for the player. */
  let distinction = 0;

  function onImpact(impact: PaddleImpact): void {
    impactActive = true;
    impactElapsed = 0;
    impactOffset = Math.min(1, Math.max(-1, impact.offset));
    impactIntensity = clamp01(impact.intensity);

    // OPERATOR eases toward identical, precise timing as distinction
    // emerges; at Act I (`distinction` 0) it varies exactly like the
    // player's tiny, deterministic (offset-derived, never random) wobble.
    const organicRecoilTotal = 0.24 + 0.02 * Math.abs(impactOffset);
    const organicFarDelay = ENERGY_DELAY + 0.045 + 0.02 * Math.abs(impactOffset);
    impactRecoilTotal = isOperator
      ? THREE.MathUtils.lerp(organicRecoilTotal, 0.23, distinction)
      : organicRecoilTotal;
    impactFarDelay = isOperator
      ? THREE.MathUtils.lerp(organicFarDelay, ENERGY_DELAY + 0.05, distinction)
      : organicFarDelay;

    // Player: every 4th consecutive return ticks the sensor node, always.
    // OPERATOR: the same tell, but only once distinction has emerged past
    // its midpoint — Act I's OPERATOR sensor stays inert, matching the
    // brief's "approximately symmetrical" (an inert node reads as identical
    // to the player's between blinks, which is most of the time either way).
    if (!isOperator && impact.rallyLength > 0 && impact.rallyLength % 4 === 0) {
      sensorActive = true;
      sensorElapsed = 0;
    } else if (isOperator && distinction > 0.5) {
      sensorActive = true;
      sensorElapsed = 0;
    }
  }

  function updateImpact(dt: number): void {
    if (!impactActive) {
      flashMaterial.opacity = 0;
      pulseLeft.material.opacity = 0;
      pulseRight.material.opacity = 0;
      pulseSeam.material.opacity = 0;
      visualGroup.position.z = 0;
      return;
    }
    impactElapsed += dt;

    // Phase 1 — flash, positioned at the struck offset.
    const flashEnv = pulseEnvelope(impactElapsed, 0, FLASH_ATTACK, FLASH_DECAY);
    flash.position.x = impactOffset * halfWidth;
    flashMaterial.opacity = flashEnv * impactIntensity;

    // Phase 2/4 — energy propagates seam-first, then out to whichever edge
    // is nearest the strike, then the far edge — restrained, not a sweep.
    const nearIsRight = impactOffset >= 0;
    const nearPulse = nearIsRight ? pulseRight : pulseLeft;
    const farPulse = nearIsRight ? pulseLeft : pulseRight;
    pulseSeam.material.opacity =
      pulseEnvelope(impactElapsed, ENERGY_DELAY, PULSE_ATTACK, PULSE_DECAY) * impactIntensity * 0.8;
    nearPulse.material.opacity =
      pulseEnvelope(impactElapsed, ENERGY_DELAY, PULSE_ATTACK, PULSE_DECAY) * impactIntensity;
    farPulse.material.opacity =
      pulseEnvelope(impactElapsed, impactFarDelay, PULSE_ATTACK, PULSE_DECAY) * impactIntensity * 0.85;

    // Phase 3 — recoil: fast rise to a peak, smooth settle back to zero.
    // Purely local to `visualGroup`; `group.position.x` (gameplay) is never touched.
    let recoil: number;
    if (impactElapsed <= RECOIL_PEAK) {
      recoil = easeOutCubic(impactElapsed / RECOIL_PEAK);
    } else if (impactElapsed <= impactRecoilTotal) {
      recoil = 1 - easeInOutCubic((impactElapsed - RECOIL_PEAK) / (impactRecoilTotal - RECOIL_PEAK));
    } else {
      recoil = 0;
    }
    visualGroup.position.z = recoilSign * RECOIL_AMPLITUDE * impactIntensity * recoil;

    const settledEverything =
      impactElapsed > impactRecoilTotal && impactElapsed > ENERGY_DELAY + impactFarDelay + PULSE_ATTACK + PULSE_DECAY;
    if (settledEverything) {
      impactActive = false;
      flashMaterial.opacity = 0;
      pulseLeft.material.opacity = 0;
      pulseRight.material.opacity = 0;
      pulseSeam.material.opacity = 0;
      visualGroup.position.z = 0;
    }
  }

  function updateSensor(dt: number): void {
    if (!sensorActive) return;
    sensorElapsed += dt;
    const env = pulseEnvelope(sensorElapsed, 0, SENSOR_BLINK_ATTACK, SENSOR_BLINK_DECAY);
    sensorMaterial.opacity = sensorBaseOpacity + env * 0.45;
    if (sensorElapsed > SENSOR_BLINK_ATTACK + SENSOR_BLINK_DECAY) {
      sensorActive = false;
      sensorMaterial.opacity = sensorBaseOpacity;
    }
  }

  /**
   * Idle "breathing": near-imperceptible slow drift in the accent material's
   * opacity, almost mistakable for ambient lighting rather than an
   * animation. Modulates opacity, never colour — colour is renderer.ts's
   * (the Act-3 reveal lerp writes `accentMaterial.color` directly), so the
   * two systems can't fight. The player always blends two slightly
   * different periods so it never quite repeats. OPERATOR starts on the
   * *same* organic blend at `distinction` 0 (Act I symmetry) and eases
   * toward a smaller, single steady wave as `distinction` rises — both
   * fixed functions of elapsed time and the escalation scalar, no
   * randomness.
   */
  function updateBreathing(dt: number, factor: number): void {
    breatheClock += dt;
    const a = Math.sin((breatheClock * 2 * Math.PI) / 5.3);
    const b = Math.sin((breatheClock * 2 * Math.PI) / 3.7 + 1.7);
    const organicCombined = (a + b) / 2;
    const organicAmplitude = PADDLE_TUNING.operatorBreathAmplitudeAtZero;

    let amplitude: number;
    let combined: number;
    if (isOperator) {
      const steadyWave = Math.sin((breatheClock * 2 * Math.PI) / 6.2);
      amplitude = THREE.MathUtils.lerp(
        organicAmplitude,
        PADDLE_TUNING.operatorBreathAmplitudeAtFull,
        factor,
      );
      combined = THREE.MathUtils.lerp(organicCombined, steadyWave, factor);
    } else {
      amplitude = organicAmplitude;
      combined = organicCombined;
    }
    const breath = 1 - amplitude * (0.5 - 0.5 * combined);

    const accentOpacity = isOperator
      ? THREE.MathUtils.lerp(baseAccentOpacity, PADDLE_TUNING.operatorAccentOpacityAtFull, factor)
      : baseAccentOpacity;
    accentMaterial.opacity = accentOpacity * breath;
    sensorMaterial.opacity = sensorActive ? sensorMaterial.opacity : sensorBaseOpacity * (0.9 + 0.1 * breath);
  }

  /** OPERATOR-only geometry/material departures that fade in with `distinction`; a no-op for the player. */
  function updateDistinction(factor: number): void {
    if (!isOperator) return;
    distinction = factor;

    seam.scale.x = THREE.MathUtils.lerp(1, PADDLE_TUNING.operatorSeamNarrowRatio, factor);

    secondarySeamMaterial.opacity = factor * PADDLE_TUNING.operatorSecondarySeamOpacityAtFull;

    secondGrooveMaterial.opacity =
      0.5 * (1 - factor) + PADDLE_TUNING.operatorSecondGrooveOpacityAtFull * factor;
  }

  function update(dt: number, operatorDistinction = 1): void {
    const factor = isOperator ? clamp01(operatorDistinction) : 0;
    updateDistinction(factor);
    updateBreathing(dt, factor);
    updateImpact(dt);
    updateSensor(dt);
  }

  return { group, accentMaterial, onImpact, update };
}
