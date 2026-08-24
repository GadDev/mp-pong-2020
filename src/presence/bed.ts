/**
 * The presence's machine-audio bed.
 *
 * This exists because of one hard limitation: `speechSynthesis` exposes no
 * MediaStream, so its output cannot be routed through Web Audio and cannot be
 * filtered, crushed or reverbed (`tts.ts` explains it at length). The voice
 * itself is therefore uncolourable — so the colour comes from underneath it
 * instead. The ear attributes the bed's texture to the voice speaking over it,
 * which is how a stock system voice ends up reading as a machine.
 *
 * Follows `reveal/audio.ts`'s procedural Web Audio approach, so it introduces
 * no new pattern. Unlike that file, this one is not a placeholder awaiting
 * produced assets: an authored hum *is* the intended sound.
 *
 * Its `AudioContext` is separate from the game's on purpose — the presence and
 * the board are never on screen at once, and `render/renderer.ts` owns the
 * game's audio. It's also the context `clips.ts` plays the pre-rendered
 * monologue through, so the monologue shares this master gain and is itself
 * processable if it ever needs to be.
 */

const HUM_GAIN = 0.035;
const HUM_GAIN_SPEAKING = 0.075;
const CLICK_GAIN = 0.09;
const SWELL_GAIN = 0.05;
// How fast the hum follows the speaking state. Slow enough to read as a
// machine loading up rather than a gate opening on each syllable.
const HUM_RAMP_SECONDS = 0.25;

export interface PresenceBed {
  /** The shared context, so `clips.ts` can decode and play into it. */
  readonly context: AudioContext;
  /** Everything audible routes through here, so one volume governs all of it. */
  readonly output: GainNode;
  setVolume(volume: number): void;
  /** Lifts the hum while a line is being spoken. */
  setVocalizing(vocalizing: boolean): void;
  /** A relay click, on each new fragment. */
  tick(): void;
  /** Filtered-noise swell / fade, at the start and end of a script. */
  open(): void;
  close(): void;
  resume(): void;
  setActive(active: boolean): void;
  dispose(): void;
}

export function createPresenceBed(): PresenceBed {
  const context = new AudioContext();

  const output = context.createGain();
  output.gain.value = 0;
  output.connect(context.destination);

  // One second of white noise, reused by every click and swell rather than
  // allocated per event — these fire on every fragment.
  const noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
  const channel = noise.getChannelData(0);
  for (let i = 0; i < channel.length; i += 1) channel[i] = Math.random() * 2 - 1;

  // --- carrier hum: two detuned low triangles under a lowpass. Never stops;
  // the presence should sound powered-on even in silence.
  const humFilter = context.createBiquadFilter();
  humFilter.type = "lowpass";
  humFilter.frequency.value = 220;

  const humGain = context.createGain();
  humGain.gain.value = HUM_GAIN;
  humFilter.connect(humGain);
  humGain.connect(output);

  const hums = [55, 82.4].map((frequency) => {
    const osc = context.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = frequency;
    // A few cents off, so the two beat against each other slowly instead of
    // fusing into one clean tone.
    osc.detune.value = frequency === 55 ? -6 : 7;
    osc.connect(humFilter);
    osc.start();
    return osc;
  });

  // There is deliberately no high tone here. An earlier version had a quiet
  // 3.1 kHz sine drifting under everything, meant to read as equipment left
  // running. A constant tone sitting in the most sensitive band of human
  // hearing with no gate and no end is indistinguishable from tinnitus, and
  // that is what it sounded like. The low hum carries "powered on" on its own.

  let volume = 0;
  let active = true;

  function applyVolume(): void {
    const target = active ? volume : 0;
    output.gain.setTargetAtTime(target, context.currentTime, 0.08);
  }

  /** One-shot noise through a filter — the shape of both the click and swell. */
  function burst(
    type: BiquadFilterType,
    frequency: number,
    q: number,
    peak: number,
    attack: number,
    decay: number,
  ): void {
    const now = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = noise;
    // Start from a random offset so repeated bursts aren't literally identical.
    const offset = Math.random() * (noise.duration - attack - decay);

    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + decay);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(output);
    source.start(now, offset, attack + decay);
    source.stop(now + attack + decay);
    // Buffer sources are single-use; release the little graph behind it too.
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
    };
  }

  return {
    context,
    output,
    setVolume(next: number): void {
      volume = Math.max(0, Math.min(1, next));
      applyVolume();
    },
    setVocalizing(vocalizing: boolean): void {
      humGain.gain.setTargetAtTime(
        vocalizing ? HUM_GAIN_SPEAKING : HUM_GAIN,
        context.currentTime,
        HUM_RAMP_SECONDS,
      );
    },
    tick(): void {
      burst("bandpass", 1800, 9, CLICK_GAIN, 0.001, 0.014);
    },
    open(): void {
      burst("lowpass", 900, 0.7, SWELL_GAIN, 0.35, 0.5);
    },
    close(): void {
      burst("lowpass", 500, 0.7, SWELL_GAIN * 0.6, 0.08, 0.6);
    },
    resume(): void {
      void context.resume();
    },
    /** Silenced rather than suspended while hidden, so nothing clicks on return. */
    setActive(next: boolean): void {
      active = next;
      applyVolume();
    },
    dispose(): void {
      for (const osc of hums) {
        osc.stop();
        osc.disconnect();
      }
      humFilter.disconnect();
      humGain.disconnect();
      output.disconnect();
      void context.close();
    },
  };
}
