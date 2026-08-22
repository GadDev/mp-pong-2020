---
"mp-pong-2020": minor
---

Milestone 3 + 4: real Pong, and the reveal wired to game state.

The reveal spike's dummy geometry is replaced by a playable 3D Pong match, and
the three-act escalation now fires off actual gameplay instead of a scripted
wall clock.

**Gameplay**

- **`src/game/gameState.ts`** — ball physics, paddles, score, rally count, win
  condition and OPERATOR's behaviour tiers. Delta-time driven and substepped,
  so speed no longer depends on refresh rate and a long frame can't tunnel the
  ball through a paddle. Deflection and base speed are derived from the 2020
  original rather than guessed, to preserve its feel.
- Mouse-controlled near paddle on a court that runs away from the camera, so
  the Act 1 shot looks down its length rather than at it from above.
- **OPERATOR's three tiers are real mechanical changes** — speed, error margin,
  how far ahead it predicts, and how accurately it aims. It escalates from
  plain ball-tracking to leading the ball to waiting at the arrival point.

**The reveal**

- **`src/game/presentationState.ts`** — the Act state machine, replacing the
  throwaway `reveal/timeline.ts`. Escalation triggers on cumulative rally count
  with a score backstop, plus minimum act-dwell floors and an endgame override
  so Act 1's stillness gets established and Act 3 always gets runway.
- **`src/render/renderer.ts`** — the third module of the architecture, reading
  game and presentation state and owning the scene graph, camera and HUD.
- Environmental lore fragments land on the channels already specified: Act 2's
  designation readout and single-frame score corruption, Act 3's relabelled
  score, response-cycle counter and ambient eval tag.
- The dossier climax resolves out of the Act 3 panel, undifferentiated by
  winner, with one diegetically framed channel link.
- `hasSeenReveal` disarms the escalation permanently per device, with a
  dev-only `?debug=reveal` route back that is never surfaced in a menu.

**Fixes**

- **Matches can no longer stalemate forever.** A competent player and a
  top-tier OPERATOR both reached every ball, so rallies never ended, the match
  never ended, and the climax never fired. OPERATOR now keeps a real aim error
  at every tier and the ball has enough speed headroom to eventually beat a
  paddle.
- **A finished match now reports its result.** Previously the board simply
  vanished and the menu returned, so on any match that didn't escalate — i.e.
  every match after the reveal has been seen once — the player was never told
  whether they won.
- **Pausing no longer advances the reveal.** The act clock is driven by frame
  delta and is not ticked at all on a paused frame, so a 30-second pause no
  longer skips 30 seconds of the escalation.
- **Act 2's HUD flicker and audio stutter are frame-rate independent.** Both
  were a fixed ~50 ms window sampled once per frame, making their duration a
  function of refresh rate; they are now explicit single-frame pulses.
- Act 1's camera sits far enough back that the player's own paddle stays in
  frame across its full travel.
- The court's centre line now reads as a net across the court instead of a
  bright divider down its length.
- Dropped a dead `AmbientLight` that no material in the unlit scene could
  respond to, and released Web Audio nodes after each hit instead of
  accumulating one per blip for the life of the page.

**Tests**

First suite in the repo, over the pure game and presentation modules:
collision, deflection, wall-bounce prediction, score and win conditions, act
triggers, dwell floors, and escalation disarming.
