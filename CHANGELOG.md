# mp-pong-2020

## 1.5.0

### Minor Changes

- [#5](https://github.com/GadDev/mp-pong-2020/pull/5) [`1e6e928`](https://github.com/GadDev/mp-pong-2020/commit/1e6e928636a87316b341c2016fe3b1587583320f) Thanks [@GadDev](https://github.com/GadDev)! - Milestone 5, the part that isn't audio: the post-processing stack, the
  reduced-motion path, and the menu-chrome visual finish. Final audio assets and
  the act-by-act texture match "end to end" are still outstanding.

  - **`EffectComposer` stack** (`src/reveal/postprocessing.ts`), budgeted per
    `TECHSTACK.md`: `UnrealBloomPass` on in all three acts with per-act
    strength/radius/threshold, **one** stylistic pass (film grain — scanlines
    would fight the arena's own grid lines for the same high-frequency detail
    and read as moiré on the floor), and an `RGBShiftShader` pass that stays
    disabled except during the Act 3 watcher cut, whose value is being rare.
    `OutputPass` terminates the chain so tone mapping and sRGB conversion still
    happen. Owned by `Renderer`, which already had the camera and HUD; its
    resize handler now also drives `composer.setSize`, and `dispose()` releases
    the composer's render targets alongside the arena's.
  - **`prefers-reduced-motion` path** (`src/motion.ts`), promoted into M5 on
    `BACKLOG.md`'s reasoning that it is cheap to design in and expensive to
    retrofit once every effect is hand-tuned. A live `matchMedia` flag — not a
    boot-time read — consumed by the camera (no micro-drift, orbit held at its
    opening bearing), the HUD (the Act 2 flicker held as a legible swap instead
    of a one-frame strobe), the composer (no chromatic aberration, damped
    grain), and the DOM chrome. Damps rather than deletes: the acts, the
    pull-back and the watcher cut all still happen. The damping lives in the
    display layer — `presentationState` owns the pulses and deliberately knows
    nothing about display preferences.
  - **Per-act frame-rate probe** (`src/reveal/framerate.ts`), mean fps and p95
    frame time, gated on `import.meta.env.DEV`. `ROADMAP.md` asks for frame rate
    to be verified _explicitly_, and a single global average would hide the case
    that matters — Act 3 costs strictly more than Act 1.
  - **Menu chrome finish** per `MOODBOARD.md`'s "Menu & intro screens": the
    barely-perceptible grid line-scroll, a real monospace stack instead of
    `Courier New`, focus on the first enabled menu item (`:focus` as well as
    `:focus-visible`, since programmatic focus doesn't match the latter and the
    underline is the menu's only affordance), and intro fades moved off inline
    styles onto classes so reduced motion can switch them off.
  - **Dropped `antialias: true`** from the `WebGLRenderer`. With the composer in
    front, the renderer's MSAA never reaches the screen, so the flag was a
    misleading no-op. Edge aliasing is left to the grain and bloom rather than
    spending the second budgeted pass on SMAA.

  **Not verified yet.** The composer measured 120 fps at a ~10 ms p95 across all
  three acts, but that was against the Milestone 1 dummy scene on an Apple
  Silicon Mac — both the hardware and the geometry have since changed, so those
  numbers do not carry over to the real arena and the "mid-range laptop GPU"
  done-condition remains open. The reduced-motion path is likewise wired but
  only smoke-tested pre-merge. Both are recorded in `CLAUDE.md`.

  Howler.js is deliberately **not** installed: its value is sample loading and
  crossfading, and there are no produced audio assets yet, so it would add a
  dependency that plays silence and can't be verified. `RevealAudio`'s public
  surface stays Howler-shaped so the swap is a file replacement.

### Patch Changes

- [#5](https://github.com/GadDev/mp-pong-2020/pull/5) [`1e6e928`](https://github.com/GadDev/mp-pong-2020/commit/1e6e928636a87316b341c2016fe3b1587583320f) Thanks [@GadDev](https://github.com/GadDev)! - Trial `EXCHANGE` as the on-screen game title. The intro and main-menu title
  marks and the document/`og:title` now read `EXCHANGE` instead of `PONG`/`MP
Pong`, sourced from a single `GAME_TITLE` constant in `src/ui/title.ts`. The
  shared title mark also gets a clamped font size so a longer word no longer
  overflows a narrow viewport. The repo name, README, and package description
  are unchanged — the title is still an open question in `docs/EXPLORATION.md`.

## 1.4.0

### Minor Changes

- [#7](https://github.com/GadDev/mp-pong-2020/pull/7) [`1ee2256`](https://github.com/GadDev/mp-pong-2020/commit/1ee225616deb7a107bb4f02c43f471e3bcae0148) Thanks [@GadDev](https://github.com/GadDev)! - Add a pre-game presence to the intro and menu (`src/presence/`): a cyan wireframe icosahedron above the title that turns slowly on its own, quickens and leans toward the pointer while you move, and eases back to the slow drift when you stop, plus two boot fragments (`SYSTEM READY.` / `AWAITING INPUT.`) that brighten its edges as they appear and then go silent for the session. This is `EXPLORATION.md` §3's Tier 1 — deliberately faceless, so `LORE.md`'s no-face rule holds and the Act 3 dossier keeps the reveal. It renders in-canvas on its own bare scene (no grid, nothing that telegraphs the arena) in its own layer and WebGL context, since `render/renderer.ts` owns the arena's renderer privately and the two canvases are never visible at the same time; all chrome remains DOM overlays. The mark is sized and positioned in pixel terms rather than world units, with separate offsets for the intro (bare title) and menu (title plus list), so it stays clear of the text at any viewport height, and `prefers-reduced-motion` disables all of its movement while keeping the speech brightening.

## 1.3.0

### Minor Changes

- [#6](https://github.com/GadDev/mp-pong-2020/pull/6) [`9049b62`](https://github.com/GadDev/mp-pong-2020/commit/9049b6200e5443218b10f073bbaac9a9fba86083) Thanks [@GadDev](https://github.com/GadDev)! - Milestone 3 + 4: real Pong, and the reveal wired to game state.

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

## 1.2.0

### Minor Changes

- [`341cea0`](https://github.com/GadDev/mp-pong-2020/commit/341cea0bca13649313993cdc77877fa453331595) Thanks [@GadDev](https://github.com/GadDev)! - Milestone 2: intro/menu/pause shell. Adds a DOM-overlay chrome layer (`src/ui/`) independent of the reveal spike underneath: a skippable intro beat (any key/click, or a few seconds of auto-advance), a main menu with New Game / Continue / Options, and a pause overlay (Resume / Restart / Quit to Menu) reachable via Esc. Continue is in-memory only — enabled once a match has started, never persisted to `localStorage`, and absent on a fresh load. Options exposes volume and a skip-intro toggle, both persisted via the new `src/persistence.ts`; there is no skip-to-Act-3 toggle, per the "discoverable once" reveal rule. Pausing now freezes the reveal timeline correctly: the act clock is driven by accumulated played-time rather than wall-clock time, so time spent paused or sitting in the menu no longer causes the reveal to jump ahead on resume.

## 1.1.0

### Minor Changes

- [`a7e859f`](https://github.com/GadDev/mp-pong-2020/commit/a7e859fbffc5698be073aaa88b28aa0d7907f4a4) Thanks [@GadDev](https://github.com/GadDev)! - Replace the vanilla-JS game with a Vite + TypeScript + Three.js project skeleton (Milestone 0): `npm run dev` renders a rotating placeholder cube, `npm run build` produces a static bundle. Adds ESLint/Prettier and Vitest tooling per TECHSTACK.md.

- [`d1fcf1d`](https://github.com/GadDev/mp-pong-2020/commit/d1fcf1def193d9f7be5edc4df68aa673b14c2eb9) Thanks [@GadDev](https://github.com/GadDev)! - Milestone 1: reveal spike. Dummy court geometry (grid, two blocks, a dot) runs through a debug-key or scripted (`P`) Act I -> II -> III sequence: fixed Tron-style camera -> slow imperceptible pull-back with micro-drift -> orbital Blade Runner camera with a jarring watcher cut, with HUD text/color and a procedural ambient-audio bed shifting in lockstep. Camera/HUD/audio pacing is not final — this proves the reveal can land, not the production polish (Milestone 5).

## 1.0.2

### Patch Changes

- [`4c9817b`](https://github.com/GadDev/mp-pong-2020/commit/4c9817b6299aa3770ac2496f0ad0cb9df3042ca4) Thanks [@GadDev](https://github.com/GadDev)! - Fix GitHub Releases not being created: bump changesets/action to v2, which reads the CLI's structured CHANGESETS_OUTPUT instead of parsing stdout in a format the installed @changesets/cli no longer produces.

## 1.0.1

### Patch Changes

- [`d877b00`](https://github.com/GadDev/mp-pong-2020/commit/d877b0059651997f214d4021924f51b9ff80f2f0) Thanks [@GadDev](https://github.com/GadDev)! - Add npm project setup, Changesets versioning, and a GitHub Actions release workflow.
