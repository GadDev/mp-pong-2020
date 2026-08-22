import { Act } from "./timeline";

/**
 * Procedural placeholder only. TECHSTACK.md commits to Howler.js for real
 * sample playback/crossfading in Milestone 5 — there are no produced audio
 * assets yet, so this spike proves the *pacing* of the audio crossfade with
 * raw Web Audio oscillators, not the final sound.
 */
export class RevealAudio {
  private readonly context: AudioContext;
  private readonly masterGain: GainNode;
  private readonly padGain: GainNode;
  private readonly padFilter: BiquadFilterNode;
  private readonly pad: OscillatorNode;
  private readonly padSub: OscillatorNode;
  private active = true;

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

    if (act === Act.ONE) {
      this.padGain.gain.setTargetAtTime(0.02, t, 0.5);
      this.padFilter.frequency.setTargetAtTime(400, t, 0.5);
      return;
    }

    if (act === Act.TWO) {
      // Subtle degradation: a faint stutter, mirroring the HUD glitches.
      const stutterWindow = elapsedInAct % 3.1;
      const isStuttering = stutterWindow > 3.0 && stutterWindow < 3.05;
      this.padGain.gain.setTargetAtTime(isStuttering ? 0.01 : 0.06, t, 0.8);
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
