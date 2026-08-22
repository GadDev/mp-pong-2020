---
"mp-pong-2020": minor
---

Land the gameplay-independent half of Milestone 5: post-processing, the
reduced-motion path, and the menu-chrome visual finish. The rest of M5 (final
audio assets, the act-by-act texture match end to end, Act 3 dossier styling)
is blocked on Milestones 3/4 and is not in this change.

- **`EffectComposer` stack** (`src/reveal/postprocessing.ts`), budgeted per
  `TECHSTACK.md`: `UnrealBloomPass` on in all three acts with per-act
  strength/radius/threshold, **one** stylistic pass (film grain — scanlines
  would fight the arena's own grid lines), and an `RGBShiftShader` pass that
  stays disabled except during the Act 3 watcher cut. `OutputPass` terminates
  the chain so tone mapping and sRGB conversion still happen.
- **`camera.ts` now exports `isWatcherCut(act, elapsed)`**, so the camera and
  the aberration pass read the same predicate instead of each re-deriving the
  window. Two copies of that arithmetic would drift apart silently, and the
  failure mode is aberration bleeding onto the orbital shot — i.e. exactly the
  permanently-on filter `TECHSTACK.md` rules out.
- **Resize path**: the window `resize` handler now also calls
  `composer.setSize`, which forwards to every pass (`UnrealBloomPass.setSize`
  reallocates its full mip chain). Without it the composer's render targets
  keep their old dimensions and the canvas goes blurry after a resize with no
  error to point at. Verified mid-Act-3 at 1400×900 → 700×1000.
- **`prefers-reduced-motion` path** (`src/motion.ts`), pulled forward from
  `BACKLOG.md`. A live `matchMedia` flag — not a boot-time read — consumed by
  the camera (no micro-drift, no Act 3 orbit), the HUD (a held swap instead of
  a one-frame strobe), the composer (no chromatic aberration, damped grain),
  and the DOM chrome. Damps rather than deletes: the acts, the pull-back and
  the watcher cut all still happen. The flag is polled per frame rather than
  pushed through subscriptions, which means toggling the OS setting mid-orbit
  snaps the camera to its held angle; that snap is accepted rather than eased,
  since easing would animate a transition *into* the state the player just
  asked for less animation in.
- **Frame-rate probe** (`src/reveal/framerate.ts`) reporting mean fps and p95
  frame time per act. Gated on `import.meta.env.DEV`, so it neither samples
  nor renders its readout in a production build. Measured 120 fps with a
  ~10 ms p95 in all three acts, and the same under reduced motion, at 1280×713
  CSS px with DPR capped at 2 on an Apple Silicon Mac. The M5 done-condition
  names a *mid-range laptop GPU*, which this is not — that check is still
  outstanding and is recorded as such in `CLAUDE.md`.
- **Dropped `antialias: true`** from the `WebGLRenderer`. With the composer in
  front, the renderer's MSAA never reaches the screen, so the flag was a
  misleading no-op. Edge aliasing on this wireframe-heavy scene is left to the
  grain and bloom rather than spending the second budgeted pass on SMAA.
  `setPixelRatio` is now capped at 2, the biggest single lever on
  post-processing cost.
- **Menu chrome finish** per `MOODBOARD.md`'s "Menu & intro screens": the
  barely-perceptible grid line-scroll, a real monospace stack instead of
  `Courier New`, focus on the first enabled menu item (`:focus` as well as
  `:focus-visible`, since programmatic focus doesn't match the latter and the
  underline is the menu's only affordance), and intro fades moved off inline
  styles onto classes so reduced motion can switch them off.

Also fixes, in files the above already touched: the frame-rate-dependent Act 2
HUD flicker and audio stutter (both now edge-detected — frame-counted in the
HUD, scheduled on the audio clock — so a ~50 ms window no longer lasts one
frame at 20 fps and six at 120, and `MOODBOARD.md`'s *single-frame* flicker is
actually single-frame), and `scene.ts`'s no-op `AmbientLight`.

Howler.js is deliberately **not** installed: its value is sample loading and
crossfading, and there are no produced audio assets yet, so it would add a
dependency that plays silence and can't be verified. `RevealAudio`'s public
surface is kept Howler-shaped so the swap stays a file replacement.

`CLAUDE.md` is updated to match: the new modules, the out-of-order M5 note,
and a known-issues list that no longer claims fixed things are broken — while
attributing the pause-clock and intro auto-advance fixes to the in-flight
Milestone 2 work rather than to this change.
