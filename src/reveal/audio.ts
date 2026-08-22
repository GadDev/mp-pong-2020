import { Act } from "./timeline";

/** Act 2 stutter shape, in seconds — independent of frame rate. */
const STUTTER_PERIOD_SECONDS = 3.1;
const STUTTER_ATTACK_SECONDS = 0.02;
const STUTTER_DURATION_SECONDS = 0.09;
const ACT_TWO_PAD_GAIN = 0.06;
const ACT_TWO_STUTTER_GAIN = 0.008;

/**
 * Procedural placeholder only. TECHSTACK.md commits to Howler.js for real
 * sample playback/crossfading in Milestone 5 — there are no produced audio
 * assets yet, so this spike proves the *pacing* of the audio crossfade with
 * raw Web Audio oscillators, not the final sound.
 *
 * **Milestone 5 status: the Howler swap is asset-blocked, not forgotten.**
 * Howler's value per TECHSTACK.md is sample loading, sprite SFX, crossfading
 * and mobile autoplay-unlock — all of which need audio files that do not
 * exist yet. Installing the dependency now would add a package that plays
 * silence and cannot be verified. What Milestone 5 *can* do, and has done, is
 * keep this class's public surface (`resume`, `setMasterVolume`, `setActive`,
 * `update`, `playBlip`) exactly the shape a Howler-backed implementation
 * would satisfy, so the swap is a file replacement rather than a refactor of
 * every caller.
 */
export class RevealAudio {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly padGain: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly pad: OscillatorNode;
  private readonly padSub: OscillatorNode;
  private active = true;
  private lastStutterPhase = 0;
  private lastAct: Act | null = null;

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
    }
  }

  update(act: Act, elapsedInAct: number, nowSeconds: number): void {
    if (!this.active) return;
    const t = this.context.currentTime;

    // Entering an act (including a debug jump) clears any stutter ramp still
    // scheduled and rewinds the phase tracker, so a stale phase from a
    // previous pass through Act 2 can't read as an immediate crossing.
    if (act !== this.lastAct) {
      this.lastAct = act;
      this.lastStutterPhase = 0;
      this.padGain.gain.cancelScheduledValues(t);
      this.padGain.gain.setValueAtTime(this.padGain.gain.value, t);
    }

    if (act === Act.ONE) {
      this.padGain.gain.setTargetAtTime(0.02, t, 0.5);
      this.padFilter.frequency.setTargetAtTime(400, t, 0.5);
      return;
    }

    if (act === Act.TWO) {
      // Subtle degradation: a faint stutter, mirroring the HUD glitches.
      //
      // Edge-detected and scheduled on the audio clock, for the same reason
      // the HUD flicker is frame-counted: the previous version tested a fixed
      // ~50 ms window once per frame, so the dip's length tracked the display
      // refresh rate and a dropped frame skipped it outright. Ramps are now
      // written into the AudioParam timeline, which runs at the sample rate
      // and doesn't care how often update() is called.
      const phase = elapsedInAct % STUTTER_PERIOD_SECONDS;
      if (phase < this.lastStutterPhase) {
        this.padGain.gain.cancelScheduledValues(t);
        this.padGain.gain.setValueAtTime(ACT_TWO_PAD_GAIN, t);
        this.padGain.gain.linearRampToValueAtTime(
          ACT_TWO_STUTTER_GAIN,
          t + STUTTER_ATTACK_SECONDS,
        );
        this.padGain.gain.linearRampToValueAtTime(
          ACT_TWO_PAD_GAIN,
          t + STUTTER_DURATION_SECONDS,
        );
      } else if (this.lastStutterPhase === 0) {
        // First frame of the act: establish the level without a ramp fight.
        this.padGain.gain.setTargetAtTime(ACT_TWO_PAD_GAIN, t, 0.8);
      }
      this.lastStutterPhase = phase;

      this.padFilter.frequency.setTargetAtTime(600, t, 1.5);
      return;
    }

    // Act III: full ambient pad swell, slow filter LFO for warmth.
    this.padGain.gain.setTargetAtTime(0.16, t, 2);
    const lfo = 900 + Math.sin(nowSeconds * 0.25) * 300;
    this.padFilter.frequency.setTargetAtTime(lfo, t, 0.5);
  }

  /** Simulated paddle/wall hit — Act 1 clean, Act 2 occasionally pitch-bent/stuttered. */
  playBlip(act: Act): void {
    const t = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.type = "square";
    const baseFrequency = 660;
    const degraded = act === Act.TWO && Math.random() < 0.3;

    osc.frequency.setValueAtTime(baseFrequency, t);
    if (degraded) {
      osc.frequency.exponentialRampToValueAtTime(baseFrequency * 0.6, t + 0.08);
    }

    gain.gain.setValueAtTime(act === Act.THREE ? 0.05 : 0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

    osc.start(t);
    osc.stop(t + 0.16);
  }
}
