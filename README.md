# MP PONG 2020

**A single-player 3D Pong on a glowing grid. It does not stay that way.**

A ground-up rebuild of a 2020 vanilla-JS Pong clone into 3D, using Vite +
TypeScript + Three.js. It looks like Pong, it plays like Pong, and for the
first stretch of a session it *is* Pong — a clean geometric two-paddle duel
rendered the way you'd have drawn it if you were pitching "Tron: The Arcade
Game" in 1982.

Then it stops being that. Working out when, and why, is the point — so this
README deliberately doesn't tell you. See [`docs/MISSION.md`](docs/MISSION.md)
for the pitch in full; it's written to stay spoiler-light too.

**Play it:** _not deployed yet — link lands with Milestone 6._

## Status

Milestone 0 (skeleton) is done. Milestone 1 (the reveal spike) is
implemented end to end — Act 1 fixed shot → Act 2 pull-back with micro-drift
→ Act 3 orbital break with the watcher cut, HUD and audio shifting in
lockstep — but its done-condition is whether the pacing *feels* like a
reveal, so it stays open until that's signed off rather than when the code
compiles. Milestone 2 (intro / menu / pause shell) is in progress on top of
it.

The build order is **twist-first** on purpose: the riskiest, least-provable
part — the three-act reveal — is being prototyped *before* real Pong exists.
So right now the repo contains an elaborate camera/HUD/audio reveal spike
running on dummy geometry, and no gameplay. That's intentional, not
backwards. If the reveal doesn't land, no amount of paddle polish saves the
project; if it does, everything after is execution rather than uncertainty.

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the six milestones and their
done-conditions.

## Running it

```bash
npm install
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b && vite build → dist/
npm run preview  # serve the production build locally
npm run lint     # eslint over src, eslint.config.js, vite.config.ts
```

Two notes so neither reads as a broken build:

- **`npm test` currently exits 1** with "No test files found." No test files
  exist yet — that's the deliberate testing policy below, not a regression.
  CI runs `lint` and `build` and *not* `test`, so this never reddens a
  deploy.
- **`npm run build` warns about a >500 kB chunk.** That's Three.js. A
  single-scene game doesn't get code-split to silence a warning.

`vite.config.ts` hardcodes `base: "/mp-pong-2020/"` because GitHub Pages
serves project pages from a subpath, and hardcoding keeps local and CI
builds byte-identical. The tradeoff: `npm run dev` also serves under that
subpath.

## Layout

```
src/main.ts           # wiring + debug keys + rAF loop
src/persistence.ts    # localStorage: volume, skip-intro
src/ui/               # DOM-overlay chrome: intro, main menu, options, pause
src/reveal/           # the Milestone 1 spike
  timeline.ts         # Act enum + scripted act clock (throwaway)
  camera.ts           # per-act camera behaviour on one shared PerspectiveCamera
  hud.ts / hud.css    # DOM-overlay HUD that degrades across acts
  audio.ts            # procedural Web Audio placeholder (Howler.js in M5)
  scene.ts            # dummy court: grid, two blocks, a sphere
  palette.ts          # MOODBOARD.md hex tokens
```

Menus and HUD are DOM overlays, not in-canvas Three.js UI — the browser
already does text layout and hit-testing for free.

The architecture this is heading toward is three modules with hard
boundaries and one-directional data flow (`gameState` → `presentationState`
→ `renderer`), no ECS and no game framework. Both were explicitly rejected;
[`docs/TECHSTACK.md`](docs/TECHSTACK.md) records why.

## Documentation

The design is complete and was argued through explicitly, including the
options that lost. These docs are the sources of truth — for anyone (or any
agent) working on this, [`CLAUDE.md`](CLAUDE.md) is the orientation
document.

| Doc | What it owns |
|---|---|
| [`docs/MISSION.md`](docs/MISSION.md) | Creative pitch and one-sentence hook (spoiler-light) |
| [`docs/MOODBOARD.md`](docs/MOODBOARD.md) | Palette, three-act camera language, HUD/menu spec, typography |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Milestones 0–6 with concrete done-conditions |
| [`docs/TECHSTACK.md`](docs/TECHSTACK.md) | Every resolved technical decision, with its justification |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Post-ship ideas, plus "rejected with reasoning" |

> ⚠️ **Spoilers.** [`docs/LORE.md`](docs/LORE.md) is the internal story
> bible and gives the whole twist away on the first page.
> [`docs/NOTES.md`](docs/NOTES.md) is a historical reasoning trail (not
> current spec) and leaks it too. If you'd rather find out by playing,
> don't open either.

## Testing policy

Deliberately no broad suite. Most of the risk here is whether the reveal
*feels* right, which tests can't assess. When tests arrive (Vitest is
installed), they cover a narrow surface of pure functions with unambiguous
answers: ball/paddle collision and deflection math, score and win-condition
logic, act-transition trigger conditions. No rendering-output tests, no
coverage chasing.

## Deployment

Two independent workflows fire on push to `main`:

- **`release.yml`** — changesets: version-bump PRs, `CHANGELOG.md`, git
  tags, GitHub Releases. Configured for a private package, so it never
  publishes to npm. Versioning only.
- **`deploy.yml`** — `npm ci` → lint → build → publish `dist/` to GitHub
  Pages. This is what actually gets the game online.

One manual step is still outstanding: repo Settings → Pages → Source must
be set to "GitHub Actions" before the first deploy will publish.

## Contributing

This is a personal portfolio project with a finished design, so it isn't
looking for feature contributions — but bug reports, correctness fixes, and
accessibility improvements are welcome, and so is telling me the reveal
doesn't land. [`CONTRIBUTING.md`](CONTRIBUTING.md) covers setup, the
constraints that are easy to break by accident, and **the spoiler rule**:
please don't put the twist in a public issue title, PR title, or commit
message. [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) applies.

## License

[ISC](LICENSE) — © 2026 Alexandre Gadaix.

## Lineage

The original 2020 implementation is deleted from the working tree but lives
in git history at commit `66d1862` (`main.js`). It's still worth consulting
for the ball deflection feel (`deltaY * 0.35` off paddle centre) — matching
or beating its responsiveness is an explicit Milestone 3 done-condition.
