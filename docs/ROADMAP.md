# ROADMAP

Sequenced twist-first, per the Branch 4 decision: the reveal state machine
(camera/HUD/audio transitioning across three acts) is the single riskiest,
most unproven part of this project. Standard 3D Pong is a solved problem —
there's nothing to de-risk there that isn't better spent proving the reveal
works first. If the reveal doesn't land, no amount of paddle polish saves
the project; if it does, everything after is execution, not uncertainty.

The intro/menu/pause system added later is real scope, but it's low-risk,
well-understood UI work — it's sequenced *after* the reveal spike precisely
because there's nothing uncertain about it worth spiking first.

Each milestone lists a concrete demo condition, not a vibe. If you can't
show it to someone in under a minute, it's not done.

---

## Milestone 0 — Project skeleton
**Goal:** Vite + TypeScript + Three.js project that renders something on
screen, deployable from commit one.
**Done when:** `npm run dev` shows an empty Three.js scene with a rotating
placeholder cube, and `npm run build` produces a static bundle that runs
correctly when served locally.
**Size:** S

## Milestone 1 — The reveal spike (twist-first, highest risk)
**Goal:** Prove the Act 1 → Act 2 → Act 3 camera pull, HUD degrade, and
audio crossfade actually feels like a reveal, using dummy geometry — no
real paddles, no real ball, no real scoring.
**Done when:** A static scene (a plane, two placeholder blocks, a dot) runs
through a scripted or debug-key-triggered transition: fixed low Tron-style
camera → slow imperceptible pull-back with micro-drift → orbital Blade
Runner camera break with one jarring "watcher" cut, with HUD text and
ambient audio bed shifting in lockstep. You can watch it start-to-finish
and feel the moment it stops being "just" the opening shot.
**Size:** M
**Note:** This is allowed to look ugly. It is not allowed to feel flat. If
the pacing doesn't land here, iterate here — don't carry a weak reveal
forward into a prettier scene and hope polish fixes pacing. It won't.

## Milestone 2 — Intro, main menu & pause shell
**Goal:** The chrome around the game — a skippable intro beat, a real
title-screen main menu, and an in-game pause overlay — built as a DOM
overlay layer (see `TECHSTACK.md`), independent of whether real gameplay
exists yet underneath.
**Done when:**
- Loading the game shows a brief, skippable intro (title card / logo
  beat, skip on any key or click, no forced wait).
- A main menu offers **New Game**, **Continue**, and **Options**.
  **Continue** resumes an in-progress match within the current page
  session only — it's enabled while a match exists in memory (i.e. the
  player quit to menu from a paused game) and is absent on a fresh load.
  Explicitly *not* a save-game: no mid-match state is persisted to
  `localStorage`, so closing the tab discards the match.
- **Options** exposes volume and a skip-intro toggle. No skip-to-Act-3
  toggle: per the confirmed "discoverable once, no repeat trigger"
  decision, there is no menu path back to the reveal after a player has
  seen it — see Milestone 4 for how `hasSeenReveal` is actually used
  instead.
- Pressing pause mid-game (Esc or equivalent) freezes the game loop and
  shows Resume / Restart / Quit to Menu, without needing real gameplay
  wired in yet — this can and should be tested against Milestone 1's
  dummy scene before Milestone 3 exists.
**Size:** M

## Milestone 3 — Core Pong loop in 3D
**Goal:** Real Pong — mouse-controlled left paddle, CPU-controlled right
paddle, ball physics with paddle-angle deflection, scoring, win condition —
built into the proven Act 1 shell from Milestone 1, behind the menu shell
from Milestone 2.
**Done when:** Starting a New Game from the main menu plays a full game to
the winning score, entirely in 3D, with the Act 1 Tron visual language
applied, pause/resume working mid-match, and it feels at least as
responsive as the original 2020 `main.js` version.
**Size:** M

## Milestone 4 — Wire the reveal into real gameplay + environmental lore
**Goal:** Replace Milestone 1's dummy geometry with the real paddles/ball/
HUD from Milestone 3, trigger the reveal off actual game-state (rally
count or score threshold, whichever tests better), implement the Act 2/3
AI difficulty-state changes from Branch 2, and drop in the environmental
lore fragments specified in `LORE.md` (designation readout, relabeled
score language, HUD flicker text) exactly where `MOODBOARD.md` already
places them — no new delivery channels invented.
**Done when:** A full playthrough starts as real Pong, transitions through
the reveal at the designed trigger point with the correct HUD/lore
fragments appearing, and the opponent's behavior visibly and honestly
changes post-reveal. The climax resolves into the dossier screen specified
in `LORE.md` (name, role, years active, specializations, current focus)
pulled from the `GadDev/GadDev` profile README, with one working,
diegetically-framed link (LinkedIn/GitHub). Reaching the reveal for the
first time sets `hasSeenReveal` in `localStorage`; every subsequent New
Game checks that flag and, if set, **skips the Act 2/3 escalation
entirely** — the escalation trigger simply never fires again on that
device, so the twist is discoverable exactly once, with no menu path back
to it (confirmed: discoverable once, no repeat trigger).
**Size:** L

## Milestone 5 — Audio & post-processing polish
**Goal:** Replace placeholder audio/visuals with the final palette,
Howler.js-driven SFX and ambient bed, and the budgeted EffectComposer stack
(bloom + one stylistic pass, chromatic aberration reserved for the Act 3
watcher cut only).
**Done when:** The game matches `MOODBOARD.md`'s act-by-act audio-visual
texture notes end to end, the menu/pause chrome from Milestone 2 is
visually finished (styled per the Act 1 language, per `MOODBOARD.md`'s
new Menu & Intro Screens section), and the whole thing holds a stable
frame rate on a mid-range laptop GPU through all three acts (verify this
explicitly — post-processing is the most likely place this project
silently regresses).
**Size:** M

## Milestone 6 — Deploy
**Goal:** Public, shareable build.
**Done when:** A static Vite build is live on GitHub Pages at a stable URL,
loads cleanly on a cold cache, and the repo README points at it.
**Size:** S
