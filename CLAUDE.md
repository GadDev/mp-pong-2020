# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

A ground-up rebuild of a 2020 vanilla-JS Pong clone into a **3D single-player Pong with a narrative twist**, using Vite + TypeScript + Three.js.

Two things to understand before touching anything:

1. **The design is complete and was argued through explicitly.** Six markdown docs encode the decisions, including rejected options and why they lost. Don't re-derive them.
2. **The build order is deliberately twist-first.** The riskiest, least-provable part (the three-act reveal) is being prototyped *before* real Pong exists. So the codebase currently contains an elaborate reveal spike and no game. That's intentional, not backwards.

| Doc | What it owns |
|---|---|
| `MISSION.md` | Creative pitch, one-sentence hook (spoiler-light, written for repo visitors) |
| `LORE.md` | Internal story bible — the twist, OPERATOR, HUD copy fragments. **Not player-facing; contains spoilers.** |
| `MOODBOARD.md` | Palette (exact hex), three-act camera language, HUD/menu visual spec, typography |
| `ROADMAP.md` | Milestones 0-6, concrete done-conditions, S/M/L sizing |
| `TECHSTACK.md` | Every resolved technical decision with its justification |
| `BACKLOG.md` | Post-ship ideas, **plus "rejected with reasoning"** — read before proposing anything that sounds like an obvious win |
| `NOTES.md` | Historical reasoning trail with a status header marking superseded entries. **Not current spec.** |
| `EXPLORATION.md` | Open, undecided questions — game title, intro beat, pre-game presence. **Not spec, nothing here is committed scope.** |

## Commands

```bash
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b && vite build → dist/
npm run preview  # serve the production build locally
npm run lint     # eslint over src, eslint.config.js, vite.config.ts
npm test         # vitest run — game-state + act-trigger unit tests
```

`npm test` covers `src/game/` only — see the testing policy below. CI still runs `lint` and `build` and deliberately **not** `test`: the suite is a narrow correctness net for the physics and trigger math, not a deploy gate.

The build emits a >500 kB chunk warning. That's Three.js. Don't code-split a single-scene game to silence it.

## Current state: Milestones 0-4 landed

Milestone 1's reveal spike ran on dummy geometry; Milestone 3 replaced it with
real Pong and Milestone 4 wired the reveal to game-state triggers. The
three-module boundary `TECHSTACK.md` specifies is now real code, not a plan.

**Parts of Milestone 5 have also landed early, out of roadmap order** — the
parts that don't depend on gameplay existing: the `EffectComposer` stack, the
`prefers-reduced-motion` path, and the menu-chrome visual finish. The rest of
M5 (final audio assets, the act-by-act texture match "end to end", Act 3
dossier styling) is genuinely blocked on Milestones 3/4. The reduced-motion
flag was pulled forward deliberately, on `BACKLOG.md`'s reasoning that it is
cheap to design in during M5 and expensive to retrofit once every effect is
hand-tuned.

```
src/main.ts                    # rAF loop, input, screen routing, debug keys
src/motion.ts                  # prefers-reduced-motion flag (live, not read-once)
src/persistence.ts             # localStorage: volume, skip-intro, hasSeenReveal
src/game/
  gameState.ts                 # ball/paddle physics, score, rally count, win
                               #   condition, OPERATOR tiers. No `three` import.
  presentationState.ts         # Act state machine + reveal triggers
  gameState.test.ts            # collision/deflection/score/prediction
  presentationState.test.ts    # trigger, dwell, disarming, pulse tests
src/render/renderer.ts         # owns scene graph, camera, HUD, composer,
                               #   material swaps
src/reveal/
  camera.ts                    # per-act camera on one shared PerspectiveCamera
  hud.ts / hud.css             # DOM-overlay HUD that degrades across acts
  audio.ts                     # procedural Web Audio placeholder (M5 replaces)
  postprocessing.ts            # M5 composer: bloom + grain + gated aberration
  framerate.ts                 # per-act frame-time probe; inert unless DEV
  scene.ts                     # the real arena: court, net, two paddles, ball
  palette.ts                   # MOODBOARD.md hex tokens
src/presence/                  # pre-game presence: its own scene + voice
src/ui/                        # DOM-overlay chrome: intro, mainMenu, options,
                               #   pause, dossier, theme.css
```

Data flows one direction: input → `gameState` → render. `presentationState`
also *writes* `state.operatorTier` each frame — that is the one deliberate
exception, and it is a command from presentation to game, not a read-back from
the renderer. If `renderer.ts` ever starts mutating `gameState`, the whole
reason a framework was judged unnecessary evaporates.

**Debug controls:** `1`/`2`/`3` jump directly to an act, `P` restarts the act
sequence and re-arms escalation, `?debug=reveal` re-arms escalation for a
device that has already set `hasSeenReveal`. These bypass `escalationArmed` on
purpose — they are the dev-only reveal re-trigger `BACKLOG.md` requires as M4
scope. A hint line in the HUD documents them. Keep them, and keep them out of
any player-facing menu.

### Resolved during Milestone 4

- **Reveal trigger** (ROADMAP.md left it as "whichever tests better"):
  rally-count primary with a score backstop. Act 1→2 at 10 cumulative rallies
  or 3 combined points; Act 2→3 at 5 combined points or 26 rallies. Rally
  count measures engagement rather than skill; the score backstops stop a
  lopsided, low-rally match from finishing with no climax.
- **Minimum act dwell** (`ACT_ONE_MIN_SECONDS`, `ACT_TWO_MIN_SECONDS`) with an
  endgame override. Both are load-bearing: without the floors a player losing
  3-0 reaches Act 2 nine seconds in, before Act 1's stillness exists to be
  violated; without the override a fast winner reaches the dossier with Act 3
  barely started.
- **OPERATOR's `aimError`.** Each tier keeps a non-zero aim offset, and the top
  tier's exceeds the catchable extent. Without it a predicting paddle literally
  cannot miss, and a competent player stalemates forever — the match never
  ends, so the climax never fires. `LORE.md` requires tier 2 to stay beatable;
  this is what makes that true rather than aspirational.
- **`GadDev/GadDev` verified.** `gh` is still unauthenticated, but the profile
  README was fetched over its public raw URL and carries the dossier bio. The
  strings live in `src/ui/dossier.ts` (client-only build, so the payoff screen
  must not depend on a fetch) and nowhere in `docs/` — one place to change.

### Still placeholder

- **`audio.ts` is not the audio implementation.** `TECHSTACK.md` commits to
  Howler.js (not yet installed) for sample playback in Milestone 5. This is
  raw Web Audio oscillators proving the *crossfade pacing*, because no produced
  audio assets exist yet.
- **No post-processing.** No `EffectComposer` yet; bloom plus one stylistic
  pass arrives in Milestone 5, and Act 3's fog and rain-slicked floor with it.

## The architecture this is heading toward

Decided in `TECHSTACK.md`. **No ECS, no game framework** — both explicitly rejected. Three modules with hard boundaries:

- **`gameState.ts`** — ball physics, paddle positions, score, win condition, a `paused` flag. Knows nothing about rendering or acts.
- **`presentationState.ts`** — the `Act` state machine and transitions. Reads game-state triggers; owns no physics.
- **`renderer.ts`** — reads both, draws. Owns the scene graph, camera, HUD, material swaps.

Data flows one direction: input → game state → render. If `renderer.ts` starts mutating `gameState.ts`, the whole reason a framework was judged unnecessary evaporates. The current spike hasn't established this split yet (`main.ts` wires everything directly), which is fine for a spike but is the first thing to fix when gameplay arrives.

## Constraints that are easy to violate accidentally

- **`three` is pinned exactly** (`0.185.1`, no caret), because Three.js breaks across minors and there's no regression suite. Don't loosen it.
- **Green `#00FFA0` / red `#FF2D2D` are reserved exclusively for score feedback**, nowhere else, so they stay readable however much the HUD mutates. (Neither is in `palette.ts` yet — they arrive with real scoring.)
- **Act 1's camera is dead still.** The stillness is what makes later movement land. Don't add juice to Act 1.
- **Menus and HUD are DOM overlays, not in-canvas Three.js UI.** The one sanctioned exception is `src/presence/` — it's a rendered object *behind* the chrome, not chrome itself; all text, buttons and fragments are still DOM. Also: the menu must never acknowledge a twist exists, before or after the player has seen it.
- **The reveal is discoverable once per device.** `hasSeenReveal` in `localStorage` permanently disarms escalation; there is deliberately no player-facing route back.
- **Post-processing is budgeted:** bloom plus *one* stylistic pass. Chromatic aberration is Act-3-watcher-cut only — its value is being rare. (No `EffectComposer` yet; Milestone 5.)
- **Audio is Howler.js when it's real.** Tone.js was rejected: the need is playback/mixing, not synthesis.
- **Dossier bio content's source of truth is the `GadDev/GadDev` profile README**, cited by four docs. Don't inline it into `docs/` — the citation exists to prevent drift. The runtime strings live in `src/ui/dossier.ts` because the build is client-only and the payoff screen must not depend on a fetch; that file is the one place to update if the profile changes.

## Testing policy

Deliberately no broad suite. Most risk here is whether the reveal *feels*
right, which tests can't assess. The suite that exists covers exactly the
sanctioned surface — pure functions with unambiguous answers, all under
`src/game/`: ball/paddle collision and deflection math, wall-bounce
prediction, score and win-condition logic, act-transition triggers, dwell
floors, and escalation disarming. Don't test rendering output, don't chase
coverage, and don't add `test` to CI.

Two tests are load-bearing regression guards rather than routine coverage, and
should not be deleted as redundant: "fires the same number of times regardless
of frame size" (the frame-rate-dependent pulse bug) and "leaves even the top
tier beatable" (the OPERATOR stalemate).

## Deployment

Two independent workflows on push to `main`:

- **`release.yml`** — changesets: version-bump PRs, `CHANGELOG.md`, git tags, GitHub Releases. Configured for a private package (`privatePackages: version + tag`), so it never publishes to npm. Versioning only.
- **`deploy.yml`** — `npm ci` → lint → build → publish `dist/` to GitHub Pages. This is what actually gets the game online.

`vite.config.ts` sets `base: "/mp-pong-2020/"` because Pages serves project pages from a subpath. It's hardcoded rather than env-derived so local and CI builds are identical — the tradeoff is that `npm run dev` also serves under that subpath.

**Manual step still required:** repo Settings → Pages → Source must be set to "GitHub Actions" before the first deploy will publish.

## Known issues

Real, small, worth fixing when touched — not blockers:

- **Disposal is only wired for teardown, not for act transitions.**
  `buildArena()` tracks what it allocates, `Renderer.dispose()` releases it
  along with the composer's render targets, and the act palette shifts mutate
  existing materials in place rather than allocating. But nothing calls
  `Renderer.dispose()` in practice, and the moment an act starts *rebuilding*
  scene contents that becomes a leak.
- **Act 3 orbital control is screen-linear, not world-aligned.** The paddle
  follows pointer X mapped across the viewport rather than raycast into the
  floor plane, deliberately: a raycast would send the paddle flying on every
  watcher cut. The cost is that during the orbit, "left" on screen is no
  longer "left" on the court. Predictability was judged the better trade, but
  it is a trade.
- **The reveal's pacing numbers have had one tuning pass, in simulation.**
  The trigger values, dwell floors and `aimError` figures were fitted against
  a scripted player at three skill levels, not against humans.
  `BACKLOG.md` already flags trigger-point tuning as a first-class post-ship
  task; this is that task.
- **Frame rate is unverified on the real arena.** The M5 done-condition names
  a *mid-range laptop GPU*. The composer was measured at 120 fps / ~10 ms p95
  across all three acts, but that was on an Apple Silicon Mac *and* against
  the old M1 dummy scene, before Milestone 3's real arena existed — so the
  numbers do not transfer on either axis. Re-measure;
  `reveal/framerate.ts` prints them per act in dev.
- **Reduced motion is wired but only smoke-tested against the dummy scene.**
  `src/motion.ts` is the single source — consumed by `camera.ts`, `hud.ts`,
  `postprocessing.ts`, `presence/presence.ts` and `ui/theme.css`. Don't call
  `matchMedia` directly anywhere else; the flag is live precisely so a player
  who toggles the OS setting mid-session is honoured. It has not been
  re-checked against real gameplay — in particular whether holding the Act 3
  orbit still leaves the ball readable, which was not a question when nothing
  was playable.

## Legacy reference

The original 2020 implementation is deleted from the working tree but lives in git history at commit `66d1862` (`main.js`). Worth consulting for the original ball deflection feel (`deltaY * 0.35` off paddle centre) — matching or beating its responsiveness is an explicit Milestone 3 done-condition.
