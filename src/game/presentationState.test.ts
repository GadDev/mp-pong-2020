import { describe, expect, it, vi } from "vitest";
import { WINNING_SCORE, createGameState, type GameState } from "./gameState";
import {
  ACT_ONE_MIN_SECONDS,
  ACT_THREE_RALLY_BACKSTOP,
  ACT_THREE_SCORE_TRIGGER,
  ACT_TWO_MIN_SECONDS,
  ACT_TWO_RALLY_TRIGGER,
  ACT_TWO_SCORE_BACKSTOP,
  Act,
  PresentationState,
} from "./presentationState";

function armed(onEscalation?: () => void): PresentationState {
  return new PresentationState({ escalationArmed: true, onEscalation });
}

function tick(presentation: PresentationState, state: GameState, seconds = 0.016) {
  return presentation.update(state, seconds);
}

/** Clears Act 1's minimum dwell in one step, so a trigger test isn't testing the floor. */
const PAST_ACT_ONE_FLOOR = ACT_ONE_MIN_SECONDS;
const PAST_ACT_TWO_FLOOR = ACT_TWO_MIN_SECONDS;

describe("escalation triggers", () => {
  it("stays in Act 1 below every threshold", () => {
    const presentation = armed();
    const state = createGameState();
    state.totalRallies = ACT_TWO_RALLY_TRIGGER - 1;
    state.playerScore = ACT_TWO_SCORE_BACKSTOP - 1;

    expect(tick(presentation, state, PAST_ACT_ONE_FLOOR).act).toBe(Act.ONE);
  });

  it("enters Act 2 on the rally trigger", () => {
    const presentation = armed();
    const state = createGameState();
    state.totalRallies = ACT_TWO_RALLY_TRIGGER;

    expect(tick(presentation, state, PAST_ACT_ONE_FLOOR).act).toBe(Act.TWO);
  });

  it("enters Act 2 on the score backstop even with few rallies", () => {
    const presentation = armed();
    const state = createGameState();
    state.totalRallies = 1;
    state.playerScore = 1;
    state.operatorScore = ACT_TWO_SCORE_BACKSTOP - 1;

    expect(tick(presentation, state, PAST_ACT_ONE_FLOOR).act).toBe(Act.TWO);
  });

  it("enters Act 3 on the score trigger", () => {
    const presentation = armed();
    const state = createGameState();
    state.totalRallies = ACT_TWO_RALLY_TRIGGER;
    tick(presentation, state, PAST_ACT_ONE_FLOOR);

    state.playerScore = ACT_THREE_SCORE_TRIGGER;
    expect(tick(presentation, state, PAST_ACT_TWO_FLOOR).act).toBe(Act.THREE);
  });

  it("enters Act 3 on the rally backstop with the score still low", () => {
    const presentation = armed();
    const state = createGameState();
    state.totalRallies = ACT_TWO_RALLY_TRIGGER;
    tick(presentation, state, PAST_ACT_ONE_FLOOR);

    state.totalRallies = ACT_THREE_RALLY_BACKSTOP;
    expect(tick(presentation, state, PAST_ACT_TWO_FLOOR).act).toBe(Act.THREE);
  });

  it("advances one act per update, never skipping Act 2", () => {
    const presentation = armed();
    const state = createGameState();
    // Well past both Act 3 thresholds on the very first update.
    state.totalRallies = ACT_THREE_RALLY_BACKSTOP;
    state.playerScore = ACT_THREE_SCORE_TRIGGER;

    expect(tick(presentation, state, PAST_ACT_ONE_FLOOR).act).toBe(Act.TWO);
    expect(tick(presentation, state, PAST_ACT_TWO_FLOOR).act).toBe(Act.THREE);
  });

  it("fires onEscalation exactly once, at Act 2 entry", () => {
    const onEscalation = vi.fn();
    const presentation = armed(onEscalation);
    const state = createGameState();
    state.totalRallies = ACT_TWO_RALLY_TRIGGER;

    tick(presentation, state, PAST_ACT_ONE_FLOOR);
    tick(presentation, state);
    state.playerScore = ACT_THREE_SCORE_TRIGGER;
    tick(presentation, state, PAST_ACT_TWO_FLOOR);

    expect(onEscalation).toHaveBeenCalledTimes(1);
  });
});

describe("minimum act dwell", () => {
  it("holds Act 1 until its floor, even with the trigger long since met", () => {
    const presentation = armed();
    const state = createGameState();
    state.totalRallies = ACT_THREE_RALLY_BACKSTOP;

    // Just short of the floor — the trigger is met but must not fire yet, or
    // Act 1 never establishes the stillness the reveal depends on.
    expect(tick(presentation, state, ACT_ONE_MIN_SECONDS - 0.5).act).toBe(Act.ONE);
    expect(tick(presentation, state, 1).act).toBe(Act.TWO);
  });

  it("holds Act 2 until its floor", () => {
    const presentation = armed();
    const state = createGameState();
    state.totalRallies = ACT_THREE_RALLY_BACKSTOP;
    tick(presentation, state, PAST_ACT_ONE_FLOOR);

    expect(tick(presentation, state, ACT_TWO_MIN_SECONDS - 0.5).act).toBe(Act.TWO);
    expect(tick(presentation, state, 1).act).toBe(Act.THREE);
  });

  it("overrides both floors near match point, so Act 3 still gets runway", () => {
    const presentation = armed();
    const state = createGameState();
    state.totalRallies = ACT_THREE_RALLY_BACKSTOP;
    // Two points from winning: a player racing to 7 would otherwise reach the
    // dossier while Act 2 was still holding its minimum.
    state.playerScore = WINNING_SCORE - 2;

    expect(tick(presentation, state, 1).act).toBe(Act.TWO);
    expect(tick(presentation, state, 7).act).toBe(Act.THREE);
  });
});

describe("hasSeenReveal disarming", () => {
  it("never escalates when disarmed, however high the triggers go", () => {
    const onEscalation = vi.fn();
    const presentation = new PresentationState({
      escalationArmed: false,
      onEscalation,
    });
    const state = createGameState();
    state.totalRallies = ACT_THREE_RALLY_BACKSTOP * 4;
    state.playerScore = 6;
    state.operatorScore = 6;

    for (let i = 0; i < 100; i += 1) tick(presentation, state, 1);

    expect(presentation.getAct()).toBe(Act.ONE);
    expect(onEscalation).not.toHaveBeenCalled();
  });

  it("still honours the dev-only setAct jump while disarmed", () => {
    const presentation = new PresentationState({ escalationArmed: false });
    const state = createGameState();

    presentation.setAct(Act.THREE);

    expect(tick(presentation, state).act).toBe(Act.THREE);
  });

  it("can be re-armed per match, so a second match in one session stays in Act 1", () => {
    const presentation = armed();
    const state = createGameState();
    state.totalRallies = ACT_TWO_RALLY_TRIGGER;
    expect(tick(presentation, state, PAST_ACT_ONE_FLOOR).act).toBe(Act.TWO);

    // What `startNewGame` does once `hasSeenReveal` has been written.
    presentation.reset();
    presentation.setEscalationArmed(false);
    const second = createGameState();
    second.totalRallies = ACT_THREE_RALLY_BACKSTOP;

    expect(tick(presentation, second, PAST_ACT_ONE_FLOOR).act).toBe(Act.ONE);
  });
});

describe("climax", () => {
  it("resolves for a losing player, not just a winner", () => {
    const presentation = armed();
    const state = createGameState();
    presentation.setAct(Act.TWO);

    state.matchOver = true;
    state.winner = "operator";

    expect(tick(presentation, state).climax).toBe(true);
  });

  it("does not resolve for a match that never escalated", () => {
    const presentation = new PresentationState({ escalationArmed: false });
    const state = createGameState();
    state.matchOver = true;
    state.winner = "player";

    expect(tick(presentation, state).climax).toBe(false);
  });
});

describe("operator tiers", () => {
  it("maps each act to a distinct behaviour tier", () => {
    const presentation = armed();

    expect(presentation.operatorTierFor(Act.ONE)).toBe(0);
    expect(presentation.operatorTierFor(Act.TWO)).toBe(1);
    expect(presentation.operatorTierFor(Act.THREE)).toBe(2);
  });
});

describe("Act 2 pulses", () => {
  /**
   * The regression this guards: the old implementation tested whether the act
   * clock was inside a fixed ~50 ms window once per frame, so the pulse's
   * duration — and whether it was seen at all — depended on refresh rate.
   */
  it("fires the same number of times regardless of frame size", () => {
    const count = (dt: number): number => {
      const presentation = armed();
      const state = createGameState();
      presentation.setAct(Act.TWO);
      let flickers = 0;
      for (let elapsed = 0; elapsed < 12; elapsed += dt) {
        if (presentation.update(state, dt).flickerPulse) flickers += 1;
      }
      return flickers;
    };

    // 60 Hz, 120 Hz, and a badly janking 15 Hz all agree.
    expect(count(1 / 120)).toBe(count(1 / 60));
    expect(count(1 / 60)).toBe(count(1 / 15));
  });

  it("does not pulse outside Act 2", () => {
    const presentation = armed();
    const state = createGameState();

    for (let i = 0; i < 600; i += 1) {
      const frame = presentation.update(state, 0.016);
      expect(frame.flickerPulse).toBe(false);
      expect(frame.stutterPulse).toBe(false);
    }
  });
});

describe("act clock", () => {
  it("advances only by the dt it is given, so a paused frame freezes it", () => {
    const presentation = armed();
    const state = createGameState();

    presentation.update(state, 0.5);
    const frozen = presentation.update(state, 0);

    expect(frozen.elapsedInAct).toBeCloseTo(0.5, 5);
  });
});
