/**
 * The seam between "what the presence says" and "how it is produced."
 *
 * `voice.ts` schedules fragments and doesn't care whether a line comes out of
 * `speechSynthesis` or a pre-rendered file; the face needs to move either way.
 * Two implementations exist: `tts.ts` (every device, unpredictable voice) and
 * `clips.ts` (the first-boot monologue, processed offline so its register is
 * guaranteed). The monologue prefers `clips.ts` and falls back to `tts.ts`.
 */
export interface SpeechHandlers {
  /** Fires when audio actually starts — not when the line was queued. */
  onStart?: () => void;
  onEnd?: () => void;
  /** One per speech impulse (a word boundary, or a syllable). */
  onImpulse?: () => void;
}

export interface FragmentSpeaker {
  /** Returns false if it can't speak this line, so the caller can fall back. */
  speak(text: string, volume: number, handlers: SpeechHandlers): boolean;
  /**
   * Measured output amplitude, 0..1, or null when there is nothing to measure.
   * A real envelope makes for a far better mouth than word-boundary ticks, so
   * `face.ts` prefers it whenever it's available.
   */
  level(): number | null;
  cancel(): void;
}
