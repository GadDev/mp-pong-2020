import { Act } from "../game/presentationState";

/** How long the Act 2 pad dip holds. Explicit, so it isn't a refresh-rate artefact. */
const STUTTER_DIP_SECONDS = 0.05;

/**
 * Centralized mix levels. Nothing in this file should hard-code a gain value
 * outside this table — the narrative ask is "subliminal in Act 2, rare and
 * still-secondary in Act 3", and that's only checkable if every level lives
 * in one place.
 *
 * Gameplay cues (blip/score) are the loudest thing at any given moment by
 * design: `environment` levels sit well under `blip.normal`, and the ducking
 * pass in `duckEnvironment()` pulls them down further for the instant a
 * gameplay sound fires, so the environmental layer can never mask a hit or a
 * score.
 */
const LEVELS = {
  master: 0.7,
  pad: {
    [Act.ONE]: 0.02,
    [Act.TWO]: 0.06,
    [Act.THREE]: 0.16,
  },
  blip: {
    normal: 0.12,
    act3: 0.06,
  },
  score: 0.1,
  /** Act 2/3 environmental bed. Act 1 is exactly 0 — "only clean, synthetic Pong sounds". */
  environment: {
    [Act.ONE]: 0,
    [Act.TWO]: 0.03,
    [Act.THREE]: 0.065,
  },
  environmentLayers: {
    hum: 0.4,
    ventilation: 0.3,
    machinery: 0.22,
    subBass: 0.55,
  },
  /** How far (0-1) the environment bus ducks under a gameplay hit, and for how long. */
  duck: {
    depth: 0.3,
    seconds: 0.18,
  },
  /** Act 3 rare one-shots implying a larger space beyond the arena. */
  spatial: {
    gain: 0.11,
    minIntervalSeconds: 22,
    maxIntervalSeconds: 50,
    pan: 0.85,
  },
} as const;

type SpatialKind = "metallicImpact" | "servoMotion" | "structuralResonance";

/**
 * Procedural placeholder only. TECHSTACK.md commits to Howler.js for real
 * sample playback/crossfading in Milestone 5 — there are no produced audio
 * assets yet, so this spike proves the *pacing* of the audio crossfade with
 * raw Web Audio oscillators, not the final sound.
 *
 * Act-based soundscape: Act 1 is the arcade pad alone. From Act 2 an
 * environmental bed (`environmentBus`) fades in under it — hum, ventilation,
 * distant machinery, sub-bass — meant to read as barely-there. Act 3 adds
 * rare spatial one-shots panned hard to imply sound sources outside the
 * visible arena. All of it ducks under `playBlip`/`playScore` so gameplay
 * stays foreground.
 */
export class RevealAudio {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly padGain: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly pad: OscillatorNode;
  private readonly padSub: OscillatorNode;

  private readonly environmentBus: GainNode;
  private readonly noiseBuffer: AudioBuffer;

  private active = true;
  private currentAct: Act = Act.ONE;
  private nextSpatialEventAt: number | null = null;

  constructor() {
    this.context = new AudioContext();

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = LEVELS.master;
    this.masterGain.connect(this.context.destination);

    this.padFilter = this.context.createBiquadFilter();
    this.padFilter.type = "lowpass";
    this.padFilter.frequency.value = 400;

    this.padGain = this.context.createGain();
    this.padGain.gain.value = LEVELS.pad[Act.ONE];

    this.pad = this.context.createOscillator();
    this.pad.type = "sine";
    this.pad.frequency.value = 110;

    this.padSub = this.context.createOscillator();
    this.padSub.type = "sine";
    this.padSub.frequency.value = 55;

    this.pad.connect(this.padFilter);
    this.padSub.connect(this.padFilter);
    this.padFilter.connect(this.padGain);
    this.padGain.connect(this.masterGain);

    this.pad.start();
    this.padSub.start();

    this.noiseBuffer = this.createNoiseBuffer();

    this.environmentBus = this.context.createGain();
    this.environmentBus.gain.value = LEVELS.environment[Act.ONE];
    this.environmentBus.connect(this.masterGain);

    this.buildHumLayer();
    this.buildVentilationLayer();
    this.buildMachineryLayer();
    this.buildSubBassLayer();
  }

  private createNoiseBuffer(): AudioBuffer {
    const seconds = 2;
    const buffer = this.context.createBuffer(1, this.context.sampleRate * seconds, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /** 50/60Hz-style electrical hum: two close low harmonics through a narrow band. */
  private buildHumLayer(): void {
    const gain = this.context.createGain();
    gain.gain.value = LEVELS.environmentLayers.hum;

    const fundamental = this.context.createOscillator();
    fundamental.type = "sine";
    fundamental.frequency.value = 60;

    const harmonic = this.context.createOscillator();
    harmonic.type = "sine";
    harmonic.frequency.value = 120;

    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 90;
    filter.Q.value = 1.2;

    fundamental.connect(filter);
    harmonic.connect(filter);
    filter.connect(gain);
    gain.connect(this.environmentBus);

    fundamental.start();
    harmonic.start();
  }

  /** Ventilation: looping filtered noise, gently amplitude-wobbled so it doesn't read as static. */
  private buildVentilationLayer(): void {
    const gain = this.context.createGain();
    gain.gain.value = LEVELS.environmentLayers.ventilation;

    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.loop = true;

    const filter = this.context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 700;
    filter.Q.value = 0.6;

    const wobble = this.context.createOscillator();
    wobble.type = "sine";
    wobble.frequency.value = 0.13;
    const wobbleDepth = this.context.createGain();
    wobbleDepth.gain.value = 150;
    wobble.connect(wobbleDepth);
    wobbleDepth.connect(filter.frequency);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.environmentBus);

    source.start();
    wobble.start();
  }

  /** Distant machinery: a slow low throb, amplitude-modulated rather than pitched, to read as "elsewhere". */
  private buildMachineryLayer(): void {
    const gain = this.context.createGain();
    gain.gain.value = LEVELS.environmentLayers.machinery;

    const osc = this.context.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 38;

    const throbLfo = this.context.createOscillator();
    throbLfo.type = "sine";
    throbLfo.frequency.value = 0.6;
    const throbDepth = this.context.createGain();
    throbDepth.gain.value = 0.5;
    const throbOffset = this.context.createConstantSource();
    throbOffset.offset.value = 0.5;

    const throbGain = this.context.createGain();
    throbLfo.connect(throbDepth);
    throbDepth.connect(throbGain.gain);
    throbOffset.connect(throbGain.gain);

    osc.connect(throbGain);
    throbGain.connect(gain);
    gain.connect(this.environmentBus);

    osc.start();
    throbLfo.start();
    throbOffset.start();
  }

  /** Low sub-frequency ambience — closer to felt than heard, per the brief. */
  private buildSubBassLayer(): void {
    const gain = this.context.createGain();
    gain.gain.value = LEVELS.environmentLayers.subBass;

    const osc = this.context.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 32;

    osc.connect(gain);
    gain.connect(this.environmentBus);

    osc.start();
  }

  /** Browsers require a user gesture before audio can play. */
  resume(): void {
    if (this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  /** Options screen volume slider — scales everything this instance plays. */
  setMasterVolume(volume: number): void {
    this.masterGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.05);
  }

  /** Menu/pause mutes the ambient bed immediately rather than waiting on update()'s slow ramp. */
  setActive(active: boolean): void {
    this.active = active;
    if (!active) {
      const t = this.context.currentTime;
      this.padGain.gain.setTargetAtTime(0, t, 0.1);
      this.environmentBus.gain.setTargetAtTime(0, t, 0.1);
    }
  }

  /**
   * Briefly pulls the environment bed down under a gameplay cue so the hit
   * or score always reads as the foreground sound, then lets it recover.
   * Fade in/out rather than a hard cut, per the transition requirement.
   */
  private duckEnvironment(): void {
    const t = this.context.currentTime;
    const target = LEVELS.environment[this.currentAct] * LEVELS.duck.depth;
    this.environmentBus.gain.cancelScheduledValues(t);
    this.environmentBus.gain.setTargetAtTime(target, t, 0.02);
    this.environmentBus.gain.setTargetAtTime(LEVELS.environment[this.currentAct], t + LEVELS.duck.seconds, 0.4);
  }

  private scheduleNextSpatialEvent(fromSeconds: number): void {
    const span = LEVELS.spatial.maxIntervalSeconds - LEVELS.spatial.minIntervalSeconds;
    this.nextSpatialEventAt = fromSeconds + LEVELS.spatial.minIntervalSeconds + Math.random() * span;
  }

  /**
   * Rare Act 3 one-shot implying a source outside the visible arena: panned
   * hard to one side rather than raycast/3D-positioned, since there is no
   * spatial scene for these to live in yet — just an off-screen implication.
   */
  private playSpatialOneShot(): void {
    const t = this.context.currentTime;
    const kinds: SpatialKind[] = ["metallicImpact", "servoMotion", "structuralResonance"];
    const kind = kinds[Math.floor(Math.random() * kinds.length)];
    const pan = (Math.random() < 0.5 ? -1 : 1) * LEVELS.spatial.pan;

    const panner = new StereoPannerNode(this.context, { pan });
    const gain = this.context.createGain();
    gain.gain.value = 0;
    panner.connect(gain);
    gain.connect(this.masterGain);

    const attack = 0.03;
    const peak = LEVELS.spatial.gain;

    if (kind === "metallicImpact") {
      const source = this.context.createBufferSource();
      source.buffer = this.noiseBuffer;
      const filter = this.context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1800;
      filter.Q.value = 6;
      source.connect(filter);
      filter.connect(panner);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      source.start(t);
      source.stop(t + 0.65);
    } else if (kind === "servoMotion") {
      const osc = this.context.createOscillator();
      osc.type = "sawtooth";
      osc.connect(panner);
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(680, t + 0.35);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak * 0.7, t + attack);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      osc.start(t);
      osc.stop(t + 0.5);
    } else {
      const osc = this.context.createOscillator();
      osc.type = "sine";
      osc.connect(panner);
      osc.frequency.setValueAtTime(60, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(peak * 0.8, t + 0.4);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      osc.start(t);
      osc.stop(t + 2.3);
    }
  }

  /**
   * `stutterPulse` is a one-shot flag from `presentationState`, replacing the
   * `elapsedInAct % 3.1 > 3.0` window this class used to sample itself. That
   * window's duration was a function of refresh rate; scheduling the dip
   * explicitly makes it the same length everywhere.
   */
  update(act: Act, elapsedSeconds: number, stutterPulse: boolean): void {
    this.currentAct = act;
    if (!this.active) return;
    const t = this.context.currentTime;

    this.environmentBus.gain.setTargetAtTime(LEVELS.environment[act], t, 1.5);

    if (act === Act.ONE) {
      this.padGain.gain.setTargetAtTime(LEVELS.pad[Act.ONE], t, 0.5);
      this.padFilter.frequency.setTargetAtTime(400, t, 0.5);
      this.nextSpatialEventAt = null;
      return;
    }

    if (act === Act.TWO) {
      // Subtle degradation: a faint stutter, mirroring the HUD glitches.
      if (stutterPulse) {
        this.padGain.gain.cancelScheduledValues(t);
        this.padGain.gain.setValueAtTime(0.01, t);
        this.padGain.gain.setTargetAtTime(0.06, t + STUTTER_DIP_SECONDS, 0.3);
      } else {
        this.padGain.gain.setTargetAtTime(LEVELS.pad[Act.TWO], t, 0.8);
      }
      this.padFilter.frequency.setTargetAtTime(600, t, 1.5);
      this.nextSpatialEventAt = null;
      return;
    }

    // Act III: full ambient pad swell, slow filter LFO for warmth, plus rare
    // spatial one-shots implying a larger space beyond the arena.
    this.padGain.gain.setTargetAtTime(LEVELS.pad[Act.THREE], t, 2);
    const lfo = 900 + Math.sin(elapsedSeconds * 0.25) * 300;
    this.padFilter.frequency.setTargetAtTime(lfo, t, 0.5);

    if (this.nextSpatialEventAt === null) {
      this.scheduleNextSpatialEvent(elapsedSeconds);
    } else if (elapsedSeconds >= this.nextSpatialEventAt) {
      this.playSpatialOneShot();
      this.scheduleNextSpatialEvent(elapsedSeconds);
    }
  }

  /**
   * Paddle/wall hit. Act 1 clean 80s arcade blip; Act 2 occasionally
   * pitch-bent, per MOODBOARD.md's audio-visual texture notes; Act 3 pulled
   * down in the mix so the ambient pad reads as the dominant layer without
   * masking the gameplay cue.
   */
  playBlip(act: Act, wall = false): void {
    const t = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = "square";
    // Walls read a fifth lower than paddles so the two are distinguishable
    // without looking — the original had no such distinction to preserve.
    const baseFrequency = wall ? 440 : 660;
    const degraded = act === Act.TWO && Math.random() < 0.3;

    osc.frequency.setValueAtTime(baseFrequency, t);
    if (degraded) {
      osc.frequency.exponentialRampToValueAtTime(baseFrequency * 0.6, t + 0.08);
    }

    gain.gain.setValueAtTime(act === Act.THREE ? LEVELS.blip.act3 : LEVELS.blip.normal, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc.start(t);
    osc.stop(t + 0.16);
    // Web Audio nodes are one-shot; release them rather than accumulating a
    // node per hit for the lifetime of the page.
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    this.duckEnvironment();
  }

  /** Score stinger. Not pitched by who scored — green/red already carries that. */
  playScore(act: Act): void {
    const t = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.exponentialRampToValueAtTime(act === Act.ONE ? 330 : 165, t + 0.3);

    gain.gain.setValueAtTime(LEVELS.score, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    osc.start(t);
    osc.stop(t + 0.42);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };

    this.duckEnvironment();
  }
}
