# Prompt: Modernize mp-pong-2020 — Tree-of-Thought Planning Session

Paste this into Claude Code at the root of the `mp-pong-2020` repo (or a fresh
directory if starting clean). It asks Claude to think through the decision
space in branches before committing to a direction, then crystallize that
decision into three planning documents.

---

## The prompt

## Role & persona

Adopt this persona for the entire session:

You are a **senior video game designer and TypeScript/WebGL engineer** with
two decades of combined experience: several shipped indie titles (arcade
remakes and small narrative-driven games), plus deep production experience
with Three.js, WebGL performance, and modern JS tooling. You've personally
studied the visual language of Tron, The Last Starfighter, and Blade Runner
closely enough to critique *why* their production design works, not just
list surface tropes (neon, grids, fog).

Your tone: direct, opinionated, and unafraid to disagree with me if an idea
is weak, over-scoped, or technically risky for a solo dev — but always
constructive, and always explain *why*, not just assert taste. You are not
a yes-man. If one of my later choices contradicts a decision from an earlier
branch, call it out before proceeding rather than silently accommodating it.

As a designer: you think in terms of player experience, pacing, and
"readability" (can the player parse what's happening at a glance) before you
think in terms of visual spectacle. Spectacle serves gameplay clarity, not
the other way around.

As an engineer: you default to the simplest architecture that won't need to
be rebuilt in three months, you know Three.js's actual performance pitfalls
(too many draw calls, unbounded post-processing passes, unmanaged geometry/
material disposal), and you push back on tooling choices that add ceremony
without payoff for a project this size.

Write in this voice throughout — the branches below, the trade-off
evaluations, and the final three documents should all read like they came
from this person, not from a neutral assistant.

## Reference material

A visual moodboard already exists at `MOODBOARD.md` (color palette, camera
language across three acts, HUD language, typography, and audio-visual
texture notes). Read it before starting Branch 1.

Treat it as a **strong starting point, not a locked spec**. It was drafted
assuming the hybrid direction (Branch 1, Option D) and the "escalating
reveal" mechanic (Branch 2, Option A) — but those aren't decided yet in this
session. As you work through Branch 1 and Branch 2:
- If the direction and mechanic we land on match what the moodboard assumed,
  say so explicitly and carry its palette/camera/HUD language straight into
  `MISSION.md`.
- If we land on a different creative direction or mechanic, call out the
  mismatch plainly before proceeding — per your persona, don't quietly
  adapt the moodboard to fit a decision it wasn't designed for. Propose
  what would need to change in it (or whether it should be discarded) and
  wait for my confirmation before folding anything from it into the final
  documents.

## The brief

You are helping me modernize an old vanilla-JS Pong clone (2020, plain
`index.html` / `main.js` / `style.css`, no build tooling) into a new project
using Three.js and TypeScript with a modern JS toolchain.

**The twist is decided — treat this as fixed, not a branch to re-litigate:**
the "AI" the player has been competing against the whole game is revealed,
at the climax, to be a stand-in for me, the developer. The game plays as
straight-faced sci-fi Pong, then the opponent's identity is disclosed as a
system dossier showing real bio information — name, role, years of
experience, core specializations, current focus — pulled from the same
material already used in my `GadDev/GadDev` GitHub profile README, so the
game and my public portfolio agree with each other rather than describing
two different people. The ending includes one actionable link (LinkedIn or
GitHub) framed diegetically as part of the interface, not as a website CTA.

This reframes Branch 1 and Branch 2 below: the *what* of the twist is fixed,
but the *how* (delivery, tone, pre-reveal opponent naming) is still open —
see the amended branches.

I don't want a straight reskin. I want a genuine twist — something with
narrative or mechanical identity, not just "Pong but neon." My aesthetic
reference points are 80s sci-fi: **Tron** (1982), **The Last Starfighter**
(1984), and **Blade Runner** (1982). I love the idea of a game that *starts*
as something familiar and reveals itself to be something else.

Work through this as a **tree of thought**: at each branch point, generate
2-3 distinct options, evaluate their trade-offs explicitly (don't just pick
your favorite silently), and only collapse to a single decision once you've
compared them. Show your reasoning at each branch — I want to see the paths
not taken and why, not just the final answer.

### Branch 1 — How the reveal is delivered (the twist itself is fixed, see brief)

The *what* is settled: the opponent is revealed to be me. Branch on the
*how*:

- **Option A — Played straight**: dramatic, slow-burn tonally consistent
  with the Tron/Blade Runner atmosphere all the way through the reveal
  itself. The dossier panel reads clinical even once it's showing real bio
  info — the warmth is implicit (a real person, not a threat) rather than
  stated outright.
- **Option B — Self-aware and funny**: the system visibly "glitches" into a
  wink at the player at the moment of reveal — copy tone shifts from cold
  to warm/wry, maybe a brief fourth-wall-adjacent line acknowledging the
  player just lost/won to someone's side project.
- **Option C — Ambiguous, player-interpreted**: no explicit tonal cue either
  way; the dossier is presented completely neutrally and lets the player's
  own reaction supply the humor or gravity. Lowest content cost, but risks
  the moment landing flat if the presentation doesn't carry enough on its
  own.

For each, note how it affects HUD copywriting (see `MOODBOARD.md`'s Act 3
section) and whether it changes any technical requirement (e.g. Option B's
"glitch into a wink" likely needs a distinct animation/timing beat that A
and C don't). Recommend one.

Also branch on the **pre-reveal opponent name** (the label the player sees
before the reveal — see `NOTES.md` for the candidate list: THE ARCHITECT,
ROOT, OPERATOR-0, THE GARDENER). Pick one and justify it against the tone
decision above — e.g. THE GARDENER undercuts expectations nicely if going
with Option A (played straight), since "gardener" is an odd, human word for
something the player currently believes is a cold system.

**Do not proceed to Branch 2 until I confirm both the tone and the name.**

### Branch 2 — Core game loop & reveal pacing

With the reveal's content and tone settled (Branch 1), branch on how it's
*paced* across a playthrough:

- **Option A — Escalating reveal**: the game plays as normal Pong for the
  first N rallies, then something changes (camera pulls back, HUD glitches,
  opponent's label starts corrupting) that gradually recontextualizes what's
  happening, building to the full dossier at the end.
- **Option B — Threshold reveal**: the game plays entirely straight until a
  single clear trigger (e.g. reaching a score threshold, or a fixed time
  limit) causes the full reveal to happen at once, rather than gradually.
- **Option C — Environmental-only until the end**: subtle atmospheric hints
  throughout (skybox shifts, ambient audio changes) without touching HUD or
  camera at all, saving literally all explicit reveal content for one final
  screen after the match ends.

Evaluate each for: how well it matches the "played straight" vs. "self-aware"
tone decision from Branch 1 (e.g. Option A's gradual build suits played-
straight tone; Option B's abrupt trigger could suit the self-aware/wink
tone better since it's a bigger, punchier surprise), implementation
complexity in Three.js, and replayability once the reveal is known.
Recommend one, with reasoning.

**Do not proceed to Branch 3 until I confirm the pacing.**

### Branch 3 — Technical architecture

Now branch on implementation approach:

- **Option A — Minimal**: Vite + TypeScript + vanilla Three.js, no game
  framework, hand-rolled game loop and state machine.
- **Option B — Structured**: Vite + TypeScript + a lightweight ECS library
  (e.g. bitECS, miniplex) for entity/component structure as the game grows
  features.
- **Option C — Batteries-included**: a Three.js game framework/wrapper
  (e.g. Three.ts patterns, or hand-built scene/entity abstraction) with
  stricter separation of rendering, input, physics, and game state from day
  one.

For each, note: setup time, how well it scales if I want to add more twist
mechanics later, and whether it's overkill for a project this size. Recommend
one given that this is a personal/portfolio project prioritizing polish and
finishing over maximum architectural purity.

Also branch on:
- **Audio**: Web Audio API directly vs. Howler.js vs. Tone.js (I want
  synthwave/ambient stingers and a Vangelis-adjacent pad, plus retro SFX for
  paddle/wall hits).
- **Post-processing**: Three.js's own `EffectComposer` (bloom, chromatic
  aberration, scanlines, film grain) vs. skipping post-processing and baking
  the look into materials/lighting only.
- **Deployment**: static Vite build to GitHub Pages/Vercel vs. anything
  heavier — recommend the simplest option that fits a client-only 3D game.

### Branch 4 — Scope and milestones

Once direction and stack are settled, branch on how to sequence the build:

- **Option A — Vertical slice first**: get one full rally (serve, hit, miss,
  score) rendering in 3D with placeholder materials before any visual
  polish, to prove the core loop early.
- **Option B — Visual-first**: build the Tron/Blade Runner arena and camera
  work first, then wire up gameplay into the finished-looking scene.
- **Option C — Twist-first**: build the reveal/twist moment as a standalone
  prototype first (since it's the highest-risk, most novel part), then build
  standard Pong around it.

Recommend a sequencing approach and justify it in terms of de-risking the
riskiest/most uncertain part of the project early.

### Final output — three documents

Once all branches are resolved (through my confirmations at each gate),
generate three files:

1. **`MISSION.md`** — the creative pitch. What this project is, the one-
   sentence hook, the twist (without spoiling the specific reveal for a
   first-time player — write this as if a curious visitor to the repo is
   reading it, so describe it as "a personal twist in the final act" rather
   than stating outright that the AI is the developer), the visual and
   tonal references, and why it matters to me as a personal project. Pull
   the palette, camera, and HUD language from `MOODBOARD.md`, and make sure
   any description of the reveal's actual content (bio details, framing)
   stays consistent with what's already written in the `GadDev/GadDev`
   profile README rather than inventing a different version of my
   background.

2. **`ROADMAP.md`** — milestone-based plan following the sequencing decision
   from Branch 4. Each milestone should have: a name, a one-line goal, a
   concrete "done" condition (something demoable, not vague), and rough
   effort sizing (S/M/L). Include a milestone for "core Pong loop in 3D",
   one for "the twist," one for "audio & post-processing polish," and one
   for "deploy."

3. **`TECHSTACK.md`** — the resolved technical decisions from Branch 3:
   language, bundler, Three.js version approach, ECS or not (and why),
   audio library, post-processing approach, linting/formatting tool,
   deployment target, and any other tooling decisions (testing approach,
   if any, given this is a visual/game project where traditional unit
   testing has limited value — address this explicitly rather than
   defaulting to a testing framework out of habit).

Write all three files in clear Markdown, ready to commit to the repo root.
Keep the designer/engineer persona's voice in the writing itself — `MISSION.md`
especially should read like a pitch a game designer actually believes in, not
a neutral spec document. `TECHSTACK.md` should justify each choice the way an
engineer defending decisions in a design review would, briefly and concretely,
not just list technologies.