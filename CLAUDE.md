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
npm test         # vitest run — CURRENTLY FAILS (no test files exist yet)
```

`npm test` exits 1 with "No test files found." Expected at this stage — see the testing policy below. This is why CI runs `lint` and `build` but deliberately **not** `test`; adding it would make every deploy red.

The build emits a >500 kB chunk warning. That's Three.js. Don't code-split a single-scene game to silence it.

## Current state: Milestone 1 (reveal spike) in progress

Milestone 0 is done. `src/reveal/` is the Milestone 1 spike — the Act I → II → III camera/HUD/audio transition, running on dummy geometry with no gameplay, exactly as the roadmap prescribes.

Milestone 2 (intro / menu / pause shell) is in progress on top of it —
`src/ui/` and `src/persistence.ts`.

**Parts of Milestone 5 have also landed early, out of roadmap order** — the
parts that don't depend on gameplay existing: the `EffectComposer` stack, the
`prefers-reduced-motion` path, and the menu-chrome visual finish. The rest of
M5 (final audio assets, the act-by-act texture match "end to end", Act 3
dossier styling) is genuinely blocked on Milestones 3/4. The reduced-motion
flag was pulled forward deliberately, on `BACKLOG.md`'s reasoning that it is
cheap to design in during M5 and expensive to retrofit once every effect is
hand-tuned.

```
src/main.ts           # wiring + debug keys + rAF loop
src/motion.ts         # prefers-reduced-motion flag (live, not read-once)
src/persistence.ts    # localStorage prefs (volume, skip-intro); hasSeenReveal lands in M4
src/ui/               # M2 DOM-overlay chrome: intro, mainMenu, options, pause, theme.css
src/reveal/
  timeline.ts         # Act enum + scripted act clock (throwaway, see below)
  camera.ts           # per-act camera behaviour on one shared PerspectiveCamera
  hud.ts / hud.css    # DOM-overlay HUD that degrades across acts
  audio.ts            # procedural Web Audio placeholder
  postprocessing.ts   # M5 composer: bloom + film grain + gated chromatic aberration
  framerate.ts        # per-act frame-time probe; inert unless import.meta.env.DEV
  scene.ts            # dummy court: grid, two blocks, a sphere
  palette.ts          # MOODBOARD.md hex tokens
```

**Debug controls** (logged to console on load): `P` runs the scripted Act I→II→III sequence, `1`/`2`/`3` jump directly to an act, `H` fires a hit blip. This doubles as the dev-only reveal re-trigger that `BACKLOG.md` flags as required scope — keep it, and keep it out of any player-facing menu.

### What here is throwaway vs. keepable

The code says this itself in comments, and it's worth respecting:

- **`timeline.ts` is not `presentationState.ts`.** It's a scripted clock with fixed per-act durations for reviewing pacing. The real thing reads game-state triggers (rally count / score threshold) and arrives with Milestone 3/4.
- **`audio.ts` is not the audio implementation.** `TECHSTACK.md` commits to Howler.js (not yet installed) for sample playback in Milestone 5. This is raw Web Audio oscillators proving the *crossfade pacing*, because no produced audio assets exist yet.
- **`scene.ts` is not the arena.** A plane, two blocks, a dot. Real Pong geometry arrives in Milestone 3.
- **`camera.ts`, `hud.ts`, `palette.ts` are largely keepable** — the per-act camera targets, the HUD degradation structure, and the palette tokens are the actual deliverable of this milestone.

Note that `camera.ts` currently derives its Act 2 pull-back progress from `AUTOPLAY_ACT_DURATION[Act.TWO]`, i.e. a debug constant. That coupling needs breaking when the real trigger system lands.

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
- **Menus and HUD are DOM overlays, not in-canvas Three.js UI.** Also: the menu must never acknowledge a twist exists, before or after the player has seen it.
- **The reveal is discoverable once per device.** `hasSeenReveal` in `localStorage` permanently disarms escalation; there is deliberately no player-facing route back.
- **Post-processing is budgeted:** bloom plus *one* stylistic pass. Chromatic aberration is Act-3-watcher-cut only — its value is being rare. (No `EffectComposer` yet; Milestone 5.)
- **Audio is Howler.js when it's real.** Tone.js was rejected: the need is playback/mixing, not synthesis.
- **Dossier bio content lives in the `GadDev/GadDev` profile README**, cited as single source of truth by four docs. Don't inline it here — the citation exists to prevent drift. Still unverified (`gh` unauthenticated when last checked).

## Testing policy

Deliberately no broad suite. Most risk here is whether the reveal *feels* right, which tests can't assess. When tests arrive (Vitest is installed), they cover a narrow surface of pure functions with unambiguous answers: ball/paddle collision and deflection math, score and win-condition logic, act-transition trigger conditions. Don't test rendering output, don't chase coverage.

## Deployment

Two independent workflows on push to `main`:

- **`release.yml`** — changesets: version-bump PRs, `CHANGELOG.md`, git tags, GitHub Releases. Configured for a private package (`privatePackages: version + tag`), so it never publishes to npm. Versioning only.
- **`deploy.yml`** — `npm ci` → lint → build → publish `dist/` to GitHub Pages. This is what actually gets the game online.

`vite.config.ts` sets `base: "/mp-pong-2020/"` because Pages serves project pages from a subpath. It's hardcoded rather than env-derived so local and CI builds are identical — the tradeoff is that `npm run dev` also serves under that subpath.

**Manual step still required:** repo Settings → Pages → Source must be set to "GitHub Actions" before the first deploy will publish.

## Known issues in the current spike code

Real, small, worth fixing when touched — not blockers:

- **No scene-graph disposal.** The composer disposes its own render targets
  (`postprocessing.ts`), but no geometry or material is ever disposed.
  Harmless while nothing is torn down; becomes a leak the moment acts start
  rebuilding scene contents.
- **Delta-time-based physics is still open** (`BACKLOG.md` → Milestone 3).
  Note that the Act 2 HUD flicker and audio stutter were the *other half* of
  this same bug class — a fixed ~50 ms window tested once per frame — and
  they've now been fixed by edge-detecting the period crossing and counting
  duration in frames (`hud.ts`) or on the audio clock (`audio.ts`). Follow
  that precedent when the ball physics land; don't reintroduce
  once-per-frame time windows.
- **Audio is still procedural Web Audio, not Howler.js.** Blocked on there
  being no produced audio assets to load; `RevealAudio`'s public surface is
  deliberately Howler-shaped so the swap stays a file replacement. See the
  header comment in `reveal/audio.ts`.
- **Frame rate is unverified on the target hardware.** The M5 done-condition
  names a *mid-range laptop GPU*. What's actually been measured is 120 fps
  with a ~10 ms p95 in all three acts at 1280×713 CSS px, DPR capped at 2, on
  an Apple Silicon Mac — i.e. a machine with a lot of headroom. Re-measure
  before calling the done-condition met; `reveal/framerate.ts` prints the
  numbers in dev.

**Resolved, for anyone diffing against an older copy of this list:** the
wall-clock pause bug and `ui/intro.ts`'s missing auto-advance were both fixed
by the in-flight Milestone 2 work (`playedSeconds` in `main.ts`, the 4.5 s
`autoAdvanceTimer` in `intro.ts`), not by the Milestone 5 pass. The Act 2
flicker/stutter timing, `scene.ts`'s no-op `AmbientLight`, and the missing
`prefers-reduced-motion` path (now `src/motion.ts`) were fixed by Milestone 5.

## Legacy reference

The original 2020 implementation is deleted from the working tree but lives in git history at commit `66d1862` (`main.js`). Worth consulting for the original ball deflection feel (`deltaY * 0.35` off paddle centre) — matching or beating its responsiveness is an explicit Milestone 3 done-condition.
