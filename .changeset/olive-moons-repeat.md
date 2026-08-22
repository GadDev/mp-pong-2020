---
"mp-pong-2020": minor
---

Milestone 5, the part that isn't audio: the post-processing stack, the
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
  to be verified *explicitly*, and a single global average would hide the case
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
