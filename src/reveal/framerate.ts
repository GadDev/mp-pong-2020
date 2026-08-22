import { Act } from "./timeline";

/**
 * Per-act frame-time sampler, dev-only.
 *
 * `ROADMAP.md` Milestone 5 asks for the frame rate to be *verified
 * explicitly*, on the grounds that post-processing is where this project
 * silently regresses. "It felt fine while I was clicking around" is not a
 * verification, and a single global average hides the case that actually
 * matters — Act 3 costs strictly more than Act 1 (higher bloom strength,
 * larger radius, aberration on during the watcher cut), so the number worth
 * knowing is per-act.
 *
 * Reports the 95th-percentile frame time alongside the mean, because a
 * composer stack that averages 60 fps while spiking to 40 reads as stutter,
 * not as 60 fps.
 */

const REPORT_INTERVAL_SECONDS = 5;

interface ActSamples {
  frameTimes: number[];
}

export class FrameRateProbe {
  private readonly enabled: boolean;
  private readout: HTMLElement | null = null;
  private readonly samples: Record<Act, ActSamples> = {
    [Act.ONE]: { frameTimes: [] },
    [Act.TWO]: { frameTimes: [] },
    [Act.THREE]: { frameTimes: [] },
  };
  private lastTimestamp: number | null = null;
  private lastReportAt = 0;

  constructor(enabled: boolean = import.meta.env.DEV) {
    this.enabled = enabled;
  }

  /**
   * Dev-only on-screen readout. Console output alone makes this
   * done-condition awkward to re-check (and invisible to anything driving the
   * page from outside), so the same numbers are mirrored into the DOM. Gated
   * on `import.meta.env.DEV`, so it is stripped from the deployed build along
   * with the rest of the probe — this is the same rule the reveal debug keys
   * follow: never visible to a player.
   */
  attachReadout(container: HTMLElement): void {
    if (!this.enabled) return;
    this.readout = document.createElement("pre");
    this.readout.id = "perf-readout";
    this.readout.style.cssText =
      "position:fixed;top:8px;left:8px;margin:0;z-index:30;" +
      "font:11px/1.4 ui-monospace,monospace;color:#c8c8c8;opacity:0.65;" +
      "pointer-events:none;white-space:pre;";
    container.appendChild(this.readout);
  }

  /** Call once per rendered frame while a match is on screen. */
  sample(act: Act): void {
    if (!this.enabled) return;
    const nowMs = performance.now();

    if (this.lastTimestamp !== null) {
      const deltaMs = nowMs - this.lastTimestamp;
      // Discard implausibly long frames: a backgrounded tab throttles rAF to
      // ~1 Hz, and letting that into the sample makes the percentile
      // meaningless.
      if (deltaMs < 250) this.samples[act].frameTimes.push(deltaMs);
    }
    this.lastTimestamp = nowMs;

    if (nowMs - this.lastReportAt > REPORT_INTERVAL_SECONDS * 1000) {
      this.lastReportAt = nowMs;
      this.report();
    }
  }

  /** Console-only; there is deliberately no on-screen counter in player view. */
  report(): void {
    if (!this.enabled) return;
    const rows: Record<string, { fps: number; p95ms: number; frames: number }> = {};

    for (const act of [Act.ONE, Act.TWO, Act.THREE]) {
      const times = this.samples[act].frameTimes;
      if (times.length === 0) continue;
      const mean = times.reduce((sum, value) => sum + value, 0) / times.length;
      const sorted = [...times].sort((a, b) => a - b);
      const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
      rows[`ACT ${["I", "II", "III"][act]}`] = {
        fps: Math.round(1000 / mean),
        p95ms: Number(p95.toFixed(1)),
        frames: times.length,
      };
    }

    if (Object.keys(rows).length === 0) return;
    console.table(rows);

    if (this.readout) {
      this.readout.textContent = Object.entries(rows)
        .map(
          ([label, row]) =>
            `${label.padEnd(7)} ${String(row.fps).padStart(3)} fps  ` +
            `p95 ${row.p95ms.toFixed(1).padStart(5)} ms  n=${row.frames}`,
        )
        .join("\n");
    }
  }

  reset(): void {
    for (const act of [Act.ONE, Act.TWO, Act.THREE]) {
      this.samples[act].frameTimes = [];
    }
    this.lastTimestamp = null;
  }
}
