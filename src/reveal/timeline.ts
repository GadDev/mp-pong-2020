// Milestone 1 spike only: a throwaway act clock, not the real
// presentationState.ts (TECHSTACK.md) which will read actual game-state
// triggers (rally count / score threshold) once Milestone 3/4 land.
export enum Act {
  ONE = 0,
  TWO = 1,
  THREE = 2,
}

export interface RevealTimelineOptions {
  onActChange?: (act: Act) => void;
}

/** Scripted duration, in seconds, spent inside each act during autoplay. */
export const AUTOPLAY_ACT_DURATION: Record<Act, number> = {
  [Act.ONE]: 5,
  [Act.TWO]: 9,
  [Act.THREE]: 14,
};

export class RevealTimeline {
  private act: Act = Act.ONE;
  private actEnteredAt = 0;
  private autoplayUntil: number | null = null;
  private readonly onActChange?: (act: Act) => void;

  constructor(options: RevealTimelineOptions = {}) {
    this.onActChange = options.onActChange;
  }

  getAct(): Act {
    return this.act;
  }

  /** Seconds elapsed since the current act started, given a clock reading in seconds. */
  elapsed(nowSeconds: number): number {
    return nowSeconds - this.actEnteredAt;
  }

  /** Debug/scripted jump — no interpolation guard, callers animate the transition themselves. */
  setAct(act: Act, nowSeconds: number): void {
    if (act === this.act) return;
    this.act = act;
    this.actEnteredAt = nowSeconds;
    this.onActChange?.(act);
  }

  /** Starts the scripted Act I -> II -> III sequence from wherever we are. */
  startAutoplay(nowSeconds: number): void {
    this.setAct(Act.ONE, nowSeconds);
    this.autoplayUntil = nowSeconds + AUTOPLAY_ACT_DURATION[Act.ONE];
  }

  /** Call once per frame; advances autoplay to the next act on schedule. */
  tickAutoplay(nowSeconds: number): void {
    if (this.autoplayUntil === null || nowSeconds < this.autoplayUntil) return;
    if (this.act === Act.ONE) {
      this.setAct(Act.TWO, nowSeconds);
      this.autoplayUntil = nowSeconds + AUTOPLAY_ACT_DURATION[Act.TWO];
    } else if (this.act === Act.TWO) {
      this.setAct(Act.THREE, nowSeconds);
      this.autoplayUntil = nowSeconds + AUTOPLAY_ACT_DURATION[Act.THREE];
    } else {
      this.autoplayUntil = null;
    }
  }
}
