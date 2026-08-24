import { Act } from "../presentationState";

export type AnswerDirection = "left" | "right" | "still";

/**
 * The scripted half of the interview. Data-driven on purpose: adding,
 * reordering or retiming a question never touches `ObservationDirector`'s
 * logic, only this list.
 *
 * `act` gates *earliest* eligibility, not exact timing — `ObservationDirector`
 * still only surfaces one at a time, spaced out, primarily on serve/reset.
 * Order here is the intended progression from plausible calibration to
 * something closer to an interview, per the design brief; there is no
 * mechanism anywhere that displays these labels or scores back at the
 * player — answers are consumed silently (see `ObservationDirector`).
 */
export interface InterviewQuestion {
  id: string;
  act: Act;
  /** `\n`-joined lines, matching the rest of the HUD's short, stacked copy. */
  prompt: string;
  /** Omit both for a `"respond"` question: no labels shown, no explicit commit —
   * `ObservationDirector` reads which way (if any) the paddle moved instead. */
  leftAnswer?: string;
  rightAnswer?: string;
  /** 0..1 floor on `ObservationDirector`'s escalation scalar (Act-derived) before this can appear. */
  minimumObservationIntensity?: number;
  /** Seconds of *additional* global spacing this specific question asks for beyond the base minimum. */
  cooldown?: number;
}

export const INTERVIEW_QUESTIONS: readonly InterviewQuestion[] = [
  {
    id: "ready",
    act: Act.ONE,
    prompt: "ARE YOU READY?",
    leftAnswer: "NO",
    rightAnswer: "YES",
  },
  {
    id: "anticipate-or-react",
    act: Act.ONE,
    prompt: "DO YOU ANTICIPATE\nOR REACT?",
    leftAnswer: "ANTICIPATE",
    rightAnswer: "REACT",
    minimumObservationIntensity: 0.2,
  },
  {
    id: "control-or-possibility",
    act: Act.TWO,
    prompt: "DO YOU PREFER\nCONTROL\nOR POSSIBILITY?",
    leftAnswer: "CONTROL",
    rightAnswer: "POSSIBILITY",
    minimumObservationIntensity: 0.4,
  },
  {
    id: "pattern-break",
    act: Act.TWO,
    prompt: "WHEN YOU RECOGNIZE\nA PATTERN,\nDO YOU BREAK IT?",
    leftAnswer: "NO",
    rightAnswer: "YES",
    minimumObservationIntensity: 0.5,
    cooldown: 6,
  },
  {
    id: "prediction-knowing",
    act: Act.THREE,
    prompt: "IS PREDICTION\nTHE SAME AS KNOWING?",
    leftAnswer: "NO",
    rightAnswer: "YES",
    minimumObservationIntensity: 0.7,
  },
  {
    id: "respond",
    act: Act.THREE,
    // No leftAnswer/rightAnswer: ObservationDirector reads paddle motion in
    // the response window instead of asking in words at all — deliberately
    // the one point in the run where "would you play differently if
    // observed" is asked by *being* observed rather than by being asked.
    prompt: "RESPOND",
    minimumObservationIntensity: 0.85,
    cooldown: 8,
  },
] as const;
