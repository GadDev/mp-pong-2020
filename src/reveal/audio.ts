import { Act } from "../game/presentationState";

/** How long the Act 2 pad dip holds. Explicit, so it isn't a refresh-rate artefact. */
const STUTTER_DIP_SECONDS = 0.05;

/** Cumulative-rally thresholds the layers ramp between. Matches the rally-becomes-music design. */
const PULSE_RAMP_START = 3;
const PULSE_RAMP_END = 9;
const HARMONY_RAMP_START = 7;
const HARMONY_RAMP_END = 14;
const FULL_AMBIENCE_RALLIES = 20;

/** How slowly the current-rally tempo decays after a point — the "exhale" rather than a snap back to silence. */
const RALLY_EXHALE_PER_SECOND = 0.4;

/** Minimum real-world gap between disturbance swells; they read as rare only if they can't stack. */
const DISTURBANCE_MIN_INTERVAL_SECONDS = 18;
const DISTURBANCE_CHANCE_PER_SECOND = 0.02;

function smoothstep(value: number, start: number, end: number): number {
  const t = Math.min(1, Math.max(0, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

/**
 * EXCHANGE ambient layer: a quiet high shimmer that fades in once a rally is
 * running long, on top of whichever act pad is already playing. Gated so it
 * stays inaudible below roughly the "15 hits" point on
 * `presentationState.ts`'s EXCHANGE curve (intensity ~0.5) and reaches its
 * ceiling gain only at the curve's max.
 */
const EXCHANGE_SHIMMER_GATE = 0.5;
const EXCHANGE_SHIMMER_MAX_GAIN = 0.05;
const EXCHANGE_SHIMMER_RAMP_SECONDS = 1.2;

/**
 * Procedural placeholder only. TECHSTACK.md commits to Howler.js for real
 * sample playback/crossfading in Milestone 5 — there are no produced audio
 * assets yet, so this spike proves the *pacing* of the audio crossfade with
 * raw Web Audio oscillators, not the final sound.
 *
 * Layered generative structure rather than a looping track: Layer A (machine
 * drone) is always present; Layer B (pulse) and Layer C (harmony) fade in as
 * the cumulative rally count rises, so a long match is audibly "becoming
 * music" instead of a track starting on Play; Layer D (disturbance) is a rare
 * unscheduled swell. A lost rally doesn't snap the pulse tempo back to
 * silence — it decays over a few seconds, so the music exhales instead of
 * resetting.
 */
export class RevealAudio {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;

  // Layer A — machine: sub-bass drone + hum, always present.
  private readonly padGain: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly pad: OscillatorNode;
  private readonly padSub: OscillatorNode;

  // Layer B — pulse: a soft rhythmic tick, loosely synced to rally pacing.
  private readonly pulseOsc: OscillatorNode;
  private readonly pulseAmpGain: GainNode;

  // Layer C — harmony: a slow three-note chord, gated in past the mid rallies.
  private readonly harmonyGain: GainNode;

  private readonly shimmerGain: GainNode;
  private readonly shimmer: OscillatorNode;
  private readonly shimmerDetune: OscillatorNode;
  private active = true;
  /** Smoothed rally length: tracks `rallyLength` instantly on the way up, decays on the way down. */
  private dampedRallyLength = 0;
  private lastDisturbanceAt = -Infinity;

  constructor() {
    this.context = new AudioContext();

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.7;
    this.masterGain.connect(this.context.destination);

    this.padFilter = this.context.createBiquadFilter();
    this.padFilter.type = "lowpass";
    this.padFilter.frequency.value = 400;

    this.padGain = this.context.createGain();
    this.padGain.gain.value = 0.02;

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

    this.pulseAmpGain = this.context.createGain();
    this.pulseAmpGain.gain.value = 0;
    this.pulseOsc = this.context.createOscillator();
    this.pulseOsc.type = "sine";
    this.pulseOsc.frequency.value = 220;
    this.pulseOsc.connect(this.pulseAmpGain);
    this.pulseAmpGain.connect(this.masterGain);
    this.pulseOsc.start();

    this.harmonyGain = this.context.createGain();
    this.harmonyGain.gain.value = 0;
    this.harmonyGain.connect(this.masterGain);
    // A minor-feeling triad, an octave and a half above the drone so it reads
    // as harmony rather than thickening the sub-bass.
    [220, 261.6, 329.6].forEach((frequency) => {
      const osc = this.context.createOscillator();
      osc.type = "sine";
      osc.frequency.value = frequency;
      osc.connect(this.harmonyGain);
      osc.start();
    });

    // EXCHANGE shimmer: two close, slightly detuned high sines, silent until
    // `updateExchange` raises the gate. Kept as its own bus rather than mixed
    // into `padGain` so it never fights the per-act pad ramps above.
    this.shimmerGain = this.context.createGain();
    this.shimmerGain.gain.value = 0;
    this.shimmerGain.connect(this.masterGain);

    this.shimmer = this.context.createOscillator();
    this.shimmer.type = "sine";
    this.shimmer.frequency.value = 1320;

    this.shimmerDetune = this.context.createOscillator();
    this.shimmerDetune.type = "sine";
    this.shimmerDetune.frequency.value = 1327;

    this.shimmer.connect(this.shimmerGain);
    this.shimmerDetune.connect(this.shimmerGain);
    this.shimmer.start();
    this.shimmerDetune.start();
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
      this.padGain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
      this.pulseAmpGain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
      this.harmonyGain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
      this.shimmerGain.gain.setTargetAtTime(0, this.context.currentTime, 0.1);
    }
  }

  /**
   * EXCHANGE: fades the shimmer bus in above `EXCHANGE_SHIMMER_GATE` and out
   * below it, scaling the remaining headroom by intensity so it still grows
   * smoothly all the way to the curve's ceiling rather than snapping on.
   */
  updateExchange(intensity: number): void {
    if (!this.active) return;
    const headroom = Math.max(0, intensity - EXCHANGE_SHIMMER_GATE) /
      (1 - EXCHANGE_SHIMMER_GATE);
    this.shimmerGain.gain.setTargetAtTime(
      headroom * EXCHANGE_SHIMMER_MAX_GAIN,
      this.context.currentTime,
      EXCHANGE_SHIMMER_RAMP_SECONDS,
    );
  }

  /**
   * `stutterPulse` is a one-shot flag from `presentationState`, replacing the
   * `elapsedInAct % 3.1 > 3.0` window this class used to sample itself. That
   * window's duration was a function of refresh rate; scheduling the dip
   * explicitly makes it the same length everywhere.
   *
   * `totalRallies` drives the structural rally-becomes-music ramp (Layers B
   * and C); `rallyLength` drives the current rally's pulse tempo, smoothed so
   * a lost point exhales rather than cutting the tempo instantly.
   */
  update(
    act: Act,
    elapsedSeconds: number,
    stutterPulse: boolean,
    dt: number,
    totalRallies: number,
    rallyLength: number,
  ): void {
    if (!this.active) return;
    const t = this.context.currentTime;

    // Layer B/C ramps: smoothstep so the transition around each milestone is
    // gradual rather than a jump cut on the exact rally.
    const pulseLevel = smoothstep(totalRallies, PULSE_RAMP_START, PULSE_RAMP_END);
    const harmonyLevel = smoothstep(totalRallies, HARMONY_RAMP_START, HARMONY_RAMP_END);
    const fullAmbience = smoothstep(totalRallies, HARMONY_RAMP_END, FULL_AMBIENCE_RALLIES);

    // Rally 3: "the filter opens" — the drone brightens ahead of the pulse
    // layer actually being audible.
    const filterOpen = smoothstep(totalRallies, PULSE_RAMP_START, PULSE_RAMP_START + 6);

    if (rallyLength > this.dampedRallyLength) {
      this.dampedRallyLength = rallyLength;
    } else {
      this.dampedRallyLength = Math.max(
        0,
        this.dampedRallyLength - RALLY_EXHALE_PER_SECOND * dt,
      );
    }

    // Rally pacing nudges the pulse tempo, deliberately subtle — "loosely
    // synchronized", not a metronome locked to hits.
    const pulseRateHz = 0.8 + Math.min(this.dampedRallyLength, 10) * 0.06;
    const pulsePhase = (elapsedSeconds * pulseRateHz) % 1;
    const pulseEnvelope = pulsePhase < 0.12 ? 1 - pulsePhase / 0.12 : 0;
    this.pulseAmpGain.gain.setTargetAtTime(
      pulseEnvelope * pulseLevel * (0.3 + fullAmbience * 0.4) * 0.05,
      t,
      0.02,
    );

    this.harmonyGain.gain.setTargetAtTime(
      harmonyLevel * (0.4 + fullAmbience * 0.6) * 0.03,
      t,
      1.5,
    );

    // Layer D — disturbance: rare, unscheduled, tied to the reveal actually
    // being underway rather than Act 1's stillness.
    if (
      act !== Act.ONE &&
      elapsedSeconds - this.lastDisturbanceAt > DISTURBANCE_MIN_INTERVAL_SECONDS &&
      Math.random() < DISTURBANCE_CHANCE_PER_SECOND * dt
    ) {
      this.lastDisturbanceAt = elapsedSeconds;
      this.playDisturbance();
    }

    if (act === Act.ONE) {
      this.padGain.gain.setTargetAtTime(0.02, t, 0.5);
      this.padFilter.frequency.setTargetAtTime(400 + filterOpen * 150, t, 0.5);
      return;
    }

    if (act === Act.TWO) {
      // Subtle degradation: a faint stutter, mirroring the HUD glitches.
      if (stutterPulse) {
        this.padGain.gain.cancelScheduledValues(t);
        this.padGain.gain.setValueAtTime(0.01, t);
        this.padGain.gain.setTargetAtTime(0.06, t + STUTTER_DIP_SECONDS, 0.3);
      } else {
        this.padGain.gain.setTargetAtTime(0.06, t, 0.8);
      }
      this.padFilter.frequency.setTargetAtTime(600 + filterOpen * 150, t, 1.5);
      return;
    }

    // Act III: full ambient pad swell, slow filter LFO for warmth.
    this.padGain.gain.setTargetAtTime(0.16, t, 2);
    const lfo = 900 + Math.sin(elapsedSeconds * 0.25) * 300;
    this.padFilter.frequency.setTargetAtTime(lfo + filterOpen * 150, t, 0.5);
  }

  /**
   * One-off detuned swell — a reverse-swell shape (fade in, hard cut) rather
   * than a struck note, so it reads as environmental rather than musical.
   */
  private playDisturbance(): void {
    const t = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = "sawtooth";
    const baseFrequency = 60 + Math.random() * 40;
    osc.frequency.setValueAtTime(baseFrequency, t);
    osc.detune.setValueAtTime((Math.random() - 0.5) * 60, t);
    osc.frequency.exponentialRampToValueAtTime(baseFrequency * 0.7, t + 3);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.05, t + 2);
    gain.gain.setValueAtTime(0.05, t + 2.6);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);

    osc.start(t);
    osc.stop(t + 3.3);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
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

    gain.gain.setValueAtTime(act === Act.THREE ? 0.06 : 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc.start(t);
    osc.stop(t + 0.16);
    // Web Audio nodes are one-shot; release them rather than accumulating a
    // node per hit for the lifetime of the page.
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
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

    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

    osc.start(t);
    osc.stop(t + 0.42);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }
}
