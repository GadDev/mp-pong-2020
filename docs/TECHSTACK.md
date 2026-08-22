# TECHSTACK

Resolved decisions from the architecture branch. Each one below is a
decision I'd defend in a design review, not a menu of options — if you
disagree with one, argue the specific trade-off, not "but framework X is
popular."

## Language: TypeScript

Not negotiable for a project of any real duration. Three.js's API surface
(vectors, materials, geometries, dozens of similarly-shaped constructor
args) is exactly the kind of thing that produces silent runtime bugs in
plain JS — passing a `Vector2` where a `Vector3` is expected, or a color as
a string where it wants a hex number. Types catch that at the editor, not
three months later when Act 3's fog color is wrong for a reason that took
twenty minutes to find.

## Bundler: Vite

Zero-config dev server with instant HMR, first-class TS support, and a
`build` command that outputs a static bundle with no server-side moving
parts — which is all this project will ever need. There's no scenario
here where webpack's extra configurability buys anything; Vite is the
tool that gets out of the way fastest.

## Three.js version approach: latest stable, pinned, no fancy version range

Pin an exact version in `package.json` (no `^`), upgrade deliberately when
you have a reason to (a bug fix you need, a feature you want), not on
autopilot. Three.js has historically made breaking changes across minor
versions more often than semver purists would like — an unpinned range on
a solo project with no CI regression suite is how you come back from a
week away and find the build silently broken by an upstream release.

## Structure: no ECS, no game framework — three disciplined modules

Rejected an ECS library (bitECS/miniplex) and a formal layered-architecture
framework, both explicitly, in Branch 3. The reasoning holds up here too:
ECS earns its keep when entity/component composition explodes
combinatorially — dozens of entity types with overlapping behavior sets.
We have a ball, two paddles, and three act-state machines (camera, HUD,
audio). That's not a composition problem, it's an organization problem,
and organization is free if you're disciplined about it.

Concretely: three modules with hard boundaries —
- **`gameState.ts`** — ball physics, paddle positions, score, win
  condition. Knows nothing about rendering or acts.
- **`presentationState.ts`** — a single `enum Act { ONE, TWO, THREE }`
  plus transition functions. Knows about game-state triggers (rally count,
  score thresholds) but owns none of the actual physics.
- **`renderer.ts`** — reads both, draws. Owns Three.js scene graph,
  camera tweening, HUD DOM/canvas overlay, material swaps.

The discipline this buys is the same discipline a formal framework would
enforce, minus the setup tax and minus an API you don't already know. The
risk with this approach is entirely self-inflicted: if you let
`renderer.ts` start reaching back to mutate `gameState.ts` directly (or
vice versa), you've lost the benefit for free. Don't do that. If a future
feature genuinely strains this — not "feels inelegant" but actually causes
bugs from update-order ambiguity — that's the signal to introduce more
structure, not a checklist item to pre-empt now.

## Audio: Howler.js

The actual audio requirements are playback and mixing — retro SFX,
one ambient synth-pad bed, crossfades across three acts, a bit of
pitch-bend/stutter degradation in Act 2 — not synthesis. Howler solves
sample loading, sprite-based SFX, crossfading, and mobile
autoplay-unlock quirks out of the box, which is the tedious 20% you'd
otherwise hand-write against the raw Web Audio API for no payoff. Tone.js
was considered and rejected — it's built for generative/scheduled
synthesis, a bigger API surface than this project needs since the ambient
pad is a produced audio file being crossfaded in, not something being
synthesized live in-browser. If that assumption changes (you decide to
generate the pad procedurally), that's the trigger to revisit, not before.

## Post-processing: `EffectComposer`, budgeted

Full-screen post-processing passes are Three.js's most common
easy-to-hide performance sink — one composer pass per full-resolution
render-target round-trip, and it's invisible in dev on your own machine
until someone opens it on a weaker laptop GPU. Budget:
- **Bloom** — real value, the neon glow the palette depends on, kept on
  in Acts 1-3.
- **One stylistic pass** (scanlines *or* film grain, not both — they read
  near-identically at a glance, stacking both spends GPU on redundant
  signal for zero additional perceived effect).
- **Chromatic aberration** — reserved exclusively for the Act 3 "watcher
  POV" cut, not a permanently-on filter. Deliberately jarring per
  `MOODBOARD.md`, which only works if it's rare.

As much of the "glow" look as possible should be baked into emissive
materials and bloom threshold tuning rather than added via extra passes —
cheaper per frame and more art-directable per-object than a global filter.
Frame rate on a mid-range laptop GPU through all three acts is a named
done-condition in `ROADMAP.md` Milestone 4 specifically because this is
where projects like this quietly regress without anyone noticing during
dev.

## Linting/formatting: ESLint + Prettier, default configs

No custom rule tuning beyond `@typescript-eslint/recommended` and
Prettier's defaults. This is a solo project — the value of linting here is
catching typos and dead code, not enforcing a house style for a team that
doesn't exist. Time spent tuning lint rules on a portfolio project is time
not spent on the reveal.

## UI layer (intro/menu/pause/options): DOM overlay, not in-canvas

The main menu, pause overlay, options screen, and skippable intro are all
plain HTML/CSS absolutely positioned over the canvas, toggled via a simple
visibility state — not drawn inside the Three.js scene. Building menu UI
as Three.js meshes/sprites (text geometry, raycasted buttons) is a common
overkill move for exactly this kind of chrome: it buys you nothing (no
menu screen here needs to exist "in 3D space") and costs you text
rendering, hit-testing, and layout, all of which the browser already does
for free via the DOM. The one thing to get right is visual consistency —
the DOM overlay needs to use the same typography and color tokens as the
in-canvas HUD (see `MOODBOARD.md`'s Menu & Intro Screens section) so it
doesn't read as a different app bolted onto the game.

The pause overlay specifically needs to actually freeze the game loop
(stop the physics/render update, don't just draw on top of a running
game) — this is a common bug source (pause menu shows, ball keeps
moving underneath it) and costs nothing to get right if `gameState.ts`
exposes a single `paused` flag the loop checks each frame.

## Persistence: `localStorage`, two keys, nothing heavier

Two flags, no more:
- `hasSeenReveal` (boolean) — set once the player reaches the Act 3
  reveal for the first time. Per the confirmed "discoverable once, no
  repeat trigger" decision, this flag does not unlock anything in the
  menu — it's checked once at the start of each New Game, and if set,
  the escalation trigger is simply never armed for that playthrough. This
  is the only piece of "progress" this game has, and it doesn't need a
  real save-game system to represent it.
- User preferences (volume, skip-intro toggle) — plain key-value, no
  schema versioning needed for a project this size.

No backend, no account system, no cloud save — this is a single-player,
single-device, client-only game, and `localStorage` covers 100% of the
actual persistence need. Reaching for anything heavier here would be
solving a multi-device-sync problem nobody asked for.

## Testing: no traditional unit test suite — and that's a deliberate choice, not a gap

Addressing this head-on rather than defaulting to "add Jest" out of habit:
the vast majority of this codebase's *risk* lives in things unit tests
don't meaningfully cover — does the camera pull-back feel imperceptible-
then-obvious, does the HUD glitch read as intentional rather than broken,
does the reveal land emotionally. Those are eyes-on-screen judgment calls,
and Milestone 1 (the reveal spike) is structured specifically to let you
make that call early and often, which is the actual risk-mitigation this
project needs — not code coverage.

That said, there is a small, legitimate testable surface, and it should
get plain unit tests (via Vitest, since it's Vite-native and needs zero
extra config): ball-paddle collision/deflection math, score/win-condition
logic, and the act-transition trigger conditions in
`presentationState.ts`. These are pure functions with clear right answers,
cheap to test, and exactly the kind of logic that's easy to silently break
while refactoring the renderer around them. Don't test rendering output,
don't test "does the bloom pass run," don't chase coverage numbers — test
the handful of functions where a wrong answer is unambiguous and costly.

## Deployment: static Vite build → GitHub Pages

Client-only WebGL game, no backend, no persistence beyond an optional
`localStorage` flag for "seen the reveal, offer skip-to-Act-3." Anything
beyond a static host solves a problem this project doesn't have. GitHub
Pages over Vercel specifically because there's no team workflow here that
benefits from preview-URL-per-PR — it's zero-ceremony and it's already
where the repo lives.
