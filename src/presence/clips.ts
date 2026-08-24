import type { PresenceBed } from "./bed";
import type { FragmentSpeaker, SpeechHandlers } from "./speaker";

import monologue01 from "./audio/monologue-01.mp3?url";
import monologue02 from "./audio/monologue-02.mp3?url";
import monologue03 from "./audio/monologue-03.mp3?url";
import monologue04 from "./audio/monologue-04.mp3?url";
import monologue05 from "./audio/monologue-05.mp3?url";
import monologue06 from "./audio/monologue-06.mp3?url";
import monologue07 from "./audio/monologue-07.mp3?url";

/**
 * Pre-rendered audio for the first-boot monologue.
 *
 * Why this one script and not the others: `speechSynthesis` cannot be
 * filtered (`tts.ts`), so on that path the presence's register — the entire
 * mitigation for overriding `LORE.md`'s no-face rule — is whatever voice the
 * player's device happens to ship. That is a coin flip, and the monologue
 * plays *once ever*, with no route back. So it's the one script that gets a
 * guaranteed reading. The short boot and return fragments stay on the system
 * voice, where a bad draw costs one throwaway line and recurs anyway.
 *
 * Rendered offline with espeak-ng and ffmpeg, committed as assets:
 *
 *   espeak-ng -v en-us -s 130 -p 30 -w raw.wav "<line>"
 *   ffmpeg -i raw.wav -af "highpass=f=180,lowpass=f=3400,\
 *     acrusher=bits=6:mix=0.35,tremolo=f=7:d=0.12,aecho=0.8:0.6:40:0.25,\
 *     volume=1.6" -ac 1 -b:a 48k monologue-NN.mp3
 *
 * espeak-ng rather than macOS `say`: its formant synthesis is already the flat
 * artifact register this wants, and — the deciding reason — its output is
 * unambiguously redistributable in a public GitHub Pages build, which Apple's
 * system voices are not.
 *
 * One file per line, not one long take, so `voice.ts`'s fragment schedule stays
 * the single timing authority and nothing here has to agree with it about
 * pacing. `?url` imports rather than `public/`: `vite.config.ts` sets a `base`
 * of `/mp-pong-2020/`, so a hand-written absolute path would 404 on Pages.
 *
 * Keyed by the fragment text on purpose. Edit a line in `voice.ts` without
 * re-rendering it and the lookup misses, which falls back to the system voice
 * — the loud, correct failure. A positional array would cheerfully play the
 * wrong sentence.
 */
const CLIPS: ReadonlyArray<readonly [text: string, url: string]> = [
  ["You have arrived.", monologue01],
  ["A connection has been made.", monologue02],
  ["Every match here is measured.", monologue03],
  ["You will not be told why.", monologue04],
  ["You are welcome here.", monologue05],
  ["That is not the same as being wanted.", monologue06],
  ["Awaiting input.", monologue07],
];

/** Envelope resolution. ~60 Hz — a frame, since a frame is what reads it. */
const ENVELOPE_HZ = 60;

interface Clip {
  buffer: AudioBuffer;
  /** Per-window RMS, normalised so the loudest moment of the line reads 1. */
  envelope: Float32Array;
}

/**
 * Pre-measures loudness over the whole line. This is what makes the monologue
 * the best-animated mouth in the game: word-boundary events are ticks, but an
 * envelope is the actual shape of the speech, so the jaw follows syllable
 * weight instead of just syllable timing.
 */
function measure(buffer: AudioBuffer): Float32Array {
  const samples = buffer.getChannelData(0);
  const windowSize = Math.max(1, Math.floor(buffer.sampleRate / ENVELOPE_HZ));
  const count = Math.ceil(samples.length / windowSize);
  const envelope = new Float32Array(count);

  for (let w = 0; w < count; w += 1) {
    const from = w * windowSize;
    const to = Math.min(samples.length, from + windowSize);
    let sum = 0;
    for (let i = from; i < to; i += 1) sum += samples[i] * samples[i];
    envelope[w] = Math.sqrt(sum / Math.max(1, to - from));
  }

  // Normalised against a high percentile of the *non-silent* windows rather
  // than the absolute peak. A line usually has one loud vowel; dividing by it
  // pushes every other syllable down near zero, and the mouth ends up barely
  // moving except on that one word. The percentile is over speech only because
  // roughly half of any line is silence, which would otherwise drag it down.
  const loud = Array.from(envelope)
    .filter((v) => v > 0.005)
    .sort((a, b) => a - b);
  const reference =
    loud.length > 0 ? loud[Math.floor(loud.length * 0.9)] : 0;

  if (reference > 0) {
    for (let w = 0; w < count; w += 1) {
      // Square-rooted on top of that, and clamped since the percentile leaves
      // a few windows above it. Raw RMS spends most of a spoken line low in
      // its range — consonants, and the gaps between words — so driving the
      // jaw off it linearly produces a mouth that twitches instead of speaks.
      // The curve is a compressor: silence stays at zero, ordinary speech
      // lifts into visible travel.
      envelope[w] = Math.min(1, Math.sqrt(envelope[w] / reference));
    }
  }
  return envelope;
}

/**
 * Loads and decodes the monologue. Resolves to a speaker, or to null if
 * anything at all failed — the caller falls back to `systemSpeaker` in that
 * case. It must not be possible for a failed load to spend
 * `hasHeardIntroMonologue`, since there is deliberately no route back to it.
 */
export async function loadMonologueSpeaker(
  bed: PresenceBed,
): Promise<FragmentSpeaker | null> {
  let clips: Map<string, Clip>;
  try {
    const decoded = await Promise.all(
      CLIPS.map(async ([text, url]) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url}: ${response.status}`);
        const buffer = await bed.context.decodeAudioData(
          await response.arrayBuffer(),
        );
        return [text, { buffer, envelope: measure(buffer) }] as const;
      }),
    );
    clips = new Map(decoded);
  } catch {
    return null;
  }

  let playing: { clip: Clip; startedAt: number } | null = null;

  return {
    speak(text: string, _volume: number, handlers: SpeechHandlers): boolean {
      const clip = clips.get(text);
      if (clip === undefined) return false;

      const source = bed.context.createBufferSource();
      source.buffer = clip.buffer;
      // Straight into the bed's output, which already applies the player's
      // volume — so it's honoured live here, unlike on the `speechSynthesis`
      // path where the utterance latches it. `_volume` is therefore unused.
      source.connect(bed.output);

      const startedAt = bed.context.currentTime;
      source.onended = () => {
        source.disconnect();
        if (playing?.clip === clip) playing = null;
        handlers.onEnd?.();
      };
      source.start();
      playing = { clip, startedAt };
      // Unlike an utterance, a buffer source starts when told to, so there is
      // no queued-but-paused window to wait out.
      handlers.onStart?.();
      return true;
    },
    level(): number | null {
      if (playing === null) return null;
      const at = bed.context.currentTime - playing.startedAt;
      const window = Math.floor(at * ENVELOPE_HZ);
      const { envelope } = playing.clip;
      if (window < 0 || window >= envelope.length) return 0;
      return envelope[window];
    },
    cancel(): void {
      playing = null;
    },
  };
}
