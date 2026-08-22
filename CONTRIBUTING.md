# Contributing

First, the honest framing: this is a personal portfolio project with a
finished design and a single maintainer. It isn't looking for feature
contributions, and a PR that adds something the design already rejected
will be closed even if the code is good. That's not unfriendliness — it's
that the design decisions here were argued through explicitly and written
down, including the options that lost, specifically so they wouldn't get
re-litigated later.

Bug reports, correctness fixes, and accessibility improvements are
genuinely welcome. So is telling me the reveal doesn't land — that's the
one piece of feedback I can't generate myself.

## Before anything else: the spoiler rule

**This project's entire value is a narrative beat the player discovers
once.** `README.md` and `docs/MISSION.md` are deliberately written to
withhold it. Please don't undo that in public:

- **Don't put the twist in an issue title, PR title, or commit message.**
  Those show up on the repo's front page and in every notification email.
- **Don't post screenshots or clips of Act 2 or Act 3** in an issue or PR
  without a spoiler warning and a collapsed `<details>` block.
- If a bug report can only be written by describing the reveal, say so and
  keep the public summary vague — "Act 3 HUD panel renders behind the
  canvas" is fine; the full explanation can go in a collapsed block.

> ⚠️ `docs/LORE.md` (the internal story bible) and `docs/NOTES.md` (the
> historical reasoning trail) give the whole twist away on the first page.
> They're intentionally left out of the doc table below. Read them if you're
> working on the reveal — just don't quote them into a public thread, and
> don't open them if you'd rather find out by playing.

## Read the docs before proposing anything

Orientation lives in [`CLAUDE.md`](CLAUDE.md) — what the project is, the
architecture it's heading toward, and the constraints that are easy to
violate by accident. It's written for AI agents but it's the fastest human
onboarding too.

The sources of truth, and what each one owns:

| Doc | Owns |
|---|---|
| [`docs/MISSION.md`](docs/MISSION.md) | The pitch and the creative intent |
| [`docs/MOODBOARD.md`](docs/MOODBOARD.md) | Palette, camera language, HUD/menu spec, typography |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Milestones 0–6 and their done-conditions |
| [`docs/TECHSTACK.md`](docs/TECHSTACK.md) | Every resolved technical decision, with its justification |
| [`docs/BACKLOG.md`](docs/BACKLOG.md) | Post-ship ideas, and **"rejected, with reasoning"** |
| [`docs/EXPLORATION.md`](docs/EXPLORATION.md) | Genuinely open questions. Not spec. |

**If you're about to propose a feature, read `docs/BACKLOG.md` first** —
specifically its "rejected, with reasoning" and "features that would break
the fiction" sections. Several of the most obvious-looking improvements to
this game are already-decided noes with the reasoning recorded. Local
two-player, a difficulty slider, an ECS refactor, a codex system, and a
game framework are all in there. Reopening one is fine; doing it without
addressing the recorded reason is not.

## Setup

```bash
npm install
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b && vite build → dist/
npm run lint     # eslint over src, eslint.config.js, vite.config.ts
```

Two things that look broken and aren't:

- **`npm test` exits 1** with "No test files found." No test files exist
  yet. See the testing policy below. CI deliberately doesn't run it.
- **`npm run build` warns about a >500 kB chunk.** That's Three.js. A
  single-scene game isn't getting code-split to silence a warning.

The dev server serves under `/mp-pong-2020/` because `vite.config.ts`
hardcodes that `base` for GitHub Pages. Not a bug.

## Constraints that are easy to break accidentally

These are all recorded in the docs; they're repeated here because they're
the ones a well-intentioned PR is most likely to trip over.

- **`three` is pinned exactly** (`0.185.1`, no caret). Three.js breaks
  across minors and there's no regression suite. Don't loosen it, and don't
  let a tooling change re-range it.
- **Green `#00FFA0` and red `#FF2D2D` are reserved exclusively for score
  feedback.** Nowhere else, ever, so they stay readable however much the
  HUD mutates.
- **Act 1's camera is dead still.** The stillness is what makes later
  movement land. Don't add juice to Act 1 — a camera kick on a score has to
  be an Act 2/3 affordance.
- **Menus and HUD are DOM overlays, not in-canvas Three.js UI.**
- **Nothing in the menu may acknowledge that a twist exists** — no unlock
  indicator, no "you've seen it" state, before or after. The interface
  having no memory a player can go looking for *is* the design.
- **Data flows one direction:** input → game state → presentation state →
  renderer. If the renderer starts mutating game state, the reason a
  framework was judged unnecessary evaporates.

## Testing policy

Deliberately no broad suite, and PRs adding one won't be merged. Most of
the risk in this project is whether the reveal *feels* right, which tests
can't assess.

Tests that are wanted (Vitest is installed) cover a narrow surface of pure
functions with unambiguous answers: ball/paddle collision and deflection
math, score and win-condition logic, act-transition trigger conditions. No
rendering-output tests, no coverage targets.

## Pull requests

- **Branch off `main`.** Keep it to one concern; a PR that fixes a bug and
  reorganises three files is two PRs.
- **`npm run lint` and `npm run build` must both pass.** CI runs exactly
  those two.
- **Add a changeset** for anything user-facing: `npx changeset`. The
  release workflow uses these for version bumps and `CHANGELOG.md`.
  Internal refactors and doc-only changes don't need one.
- **Say which milestone or done-condition it serves**, or say explicitly
  that it's out-of-band. `docs/ROADMAP.md` is the sequence; work that
  jumps ahead of it usually shouldn't.
- **Don't put speculation into the spec docs.** If an idea isn't decided,
  it goes in `docs/EXPLORATION.md` or `docs/BACKLOG.md`, not
  `MOODBOARD.md` or `LORE.md`. Those are sources of truth, and the whole
  reason the project has a chance of shipping is that they stay decided.

## Reporting a bug

Include the browser and OS, whether it's a dev or production build, and —
because a meaningful class of bug here is frame-rate dependent — your
display's refresh rate if you know it. Two known issues in the current
spike are exactly that shape, so it's a real diagnostic, not boilerplate.

Accessibility reports get priority. This game is, mechanically, a pile of
things that trigger photosensitive reactions — HUD flicker, strobe beats,
heavy bloom — and the `prefers-reduced-motion` path isn't built yet. If
something here hurt to look at, please say so.

## Conduct

Be decent. The full expectations are in
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
