import { Act } from "../presentationState";
import type { PlayerBehaviorProfile } from "./behaviorTypes";

/**
 * Qualitative statements derived from `PlayerBehaviorProfile` — the numeric
 * telemetry never surfaces itself (no raw counts, no percentages, no
 * "personality type" label; see CLAUDE.md's testing-policy neighbour rule
 * of never explaining the reveal). Each one only fires once its specific
 * confidence check passes, so the intended reaction is "how did it know
 * that", not "the game is showing me my stats" — a two- or three-sample
 * fluke should never be enough to trigger one of these.
 */
export interface BehaviorObservation {
  id: string;
  /** Earliest act this is allowed to surface — none of these read as plausible in Act I. */
  act: Act;
  prompt: string;
}

const MIN_RALLIES_FOR_ANY_OBSERVATION = 8;
const MIN_ANGLE_SAMPLES = 8;
const DOMINANT_ANGLE_SHARE = 0.5;
const VARIED_ANGLE_SHARE = 0.25;
const ANTICIPATORY_REACTION_MS = 120;

function totalAngleSamples(profile: PlayerBehaviorProfile): number {
  return Object.values(profile.repeatedAngles).reduce((sum, n) => sum + n, 0);
}

function dominantAngleShare(profile: PlayerBehaviorProfile): { count: number; share: number } {
  const total = totalAngleSamples(profile);
  if (total === 0) return { count: 0, share: 0 };
  const max = Math.max(0, ...Object.values(profile.repeatedAngles));
  return { count: max, share: max / total };
}

/**
 * Each check is independent and deliberately conservative — it's fine for
 * none, or only one, to be true on a given frame. `ObservationDirector`
 * picks at most one per call and never repeats an id within a run.
 */
export const BEHAVIOR_OBSERVATIONS: ReadonlyArray<{
  id: string;
  act: Act;
  prompt: string;
  qualifies: (profile: PlayerBehaviorProfile) => boolean;
}> = [
  {
    id: "repeated-angles",
    act: Act.TWO,
    prompt: "YOU RETURN\nTO FAMILIAR ANGLES.",
    qualifies: (profile) => {
      if (profile.rallies < MIN_RALLIES_FOR_ANY_OBSERVATION) return false;
      const { count, share } = dominantAngleShare(profile);
      return totalAngleSamples(profile) >= MIN_ANGLE_SAMPLES && count >= 5 && share >= DOMINANT_ANGLE_SHARE;
    },
  },
  {
    id: "varied-angles",
    act: Act.TWO,
    prompt: "YOU AVOID\nREPETITION.",
    qualifies: (profile) => {
      if (profile.rallies < MIN_RALLIES_FOR_ANY_OBSERVATION) return false;
      const { share } = dominantAngleShare(profile);
      return totalAngleSamples(profile) >= MIN_ANGLE_SAMPLES && share <= VARIED_ANGLE_SHARE;
    },
  },
  {
    id: "persistent-after-miss",
    act: Act.TWO,
    prompt: "FAILURE HAS NOT\nALTERED YOUR RESPONSE.",
    qualifies: (profile) =>
      profile.rallies >= MIN_RALLIES_FOR_ANY_OBSERVATION &&
      profile.consecutiveMisses >= 2 &&
      profile.aggressiveReturns >= profile.defensiveReturns,
  },
  {
    id: "anticipatory-movement",
    act: Act.THREE,
    prompt: "YOU MOVE\nBEFORE THE EVENT.",
    qualifies: (profile) =>
      profile.rallies >= MIN_RALLIES_FOR_ANY_OBSERVATION &&
      profile.averageReactionTime > 0 &&
      profile.averageReactionTime <= ANTICIPATORY_REACTION_MS,
  },
];
