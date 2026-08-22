import { Act } from "../game/presentationState";

/** How long the Act 2 pad dip holds. Explicit, so it isn't a refresh-rate artefact. */
const STUTTER_DIP_SECONDS = 0.05;

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

  /**
   * `stutterPulse` is a one-shot flag from `presentationState`, replacing the
   * `elapsedInAct % 3.1 > 3.0` window this class used to sample itself. That
   * window's duration was a function of refresh rate; scheduling the dip
   * explicitly makes it the same length everywhere.
   */
  update(act: Act, elapsedSeconds: number, stutterPulse: boolean): void {
    if (!this.active) return;
    const t = this.context.currentTime;

    if (act === Act.ONE) {
      this.padGain.gain.setTargetAtTime(0.02, t, 0.5);
      this.padFilter.frequency.setTargetAtTime(400, t, 0.5);
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
      this.padFilter.frequency.setTargetAtTime(600, t, 1.5);
      return;
    }

    // Act III: full ambient pad swell, slow filter LFO for warmth.
    this.padGain.gain.setTargetAtTime(0.16, t, 2);
    const lfo = 900 + Math.sin(elapsedSeconds * 0.25) * 300;
    this.padFilter.frequency.setTargetAtTime(lfo, t, 0.5);
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
