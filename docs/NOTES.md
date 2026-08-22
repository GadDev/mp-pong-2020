# Notes — Pong reboot planning

Context from the planning conversation that produced `pong-modernization-prompt.md`
and `MOODBOARD.md`. Not a decision, just the reasoning trail in case this session
starts fresh without the original chat.

> ## ⚠️ Status: historical record — parts of this are superseded
>
> This file is kept as a reasoning trail, **not** as current spec. Several
> things below were open questions or working assumptions at the time of
> writing and have since been decided in the planning session:
>
> | Recorded below as | Actually decided |
> |---|---|
> | Tone: "personal and a little funny," a wink at the player | **Played straight** — the interface never changes register; the surprise is the content, not a tonal shift |
> | Pre-reveal opponent name: undecided (4 candidates) | **OPERATOR** — flat and bureaucratic, chosen because a slow burn needs zero early tells |
> | Reveal pacing: leaning escalating | **Escalating reveal** — confirmed, three-act build |
> | Discoverable once vs. re-triggerable: open | **Discoverable once**, no repeat trigger, no menu path back |
> | Creative direction: hybrid, pending confirmation | **Hybrid confirmed** (Tron → Starfighter reveal → Blade Runner payoff) |
> | "Weekly boss fight" replay loop: undecided | **No** — see `BACKLOG.md`, incoherent alongside discoverable-once |
| THE DIVISION as a real in-fiction organization | **Not canon** — a writers'-room codename for the misdirection, never on screen. `LORE.md` revision note 2 |
| The recruitment framing "now has a literal answer to 'recruited for what?'" | **It doesn't** — nobody is recruited. The recruitment is inverted: the system discloses itself instead of asking. `LORE.md`, "The recruitment that isn't" |
| Reveal timing vs. the match: never stated | **Match plays to its natural first-to-N end; dossier resolves after the final point, either outcome** |
>
> Current sources of truth: `MISSION.md` (pitch), `LORE.md` (story bible),
> `MOODBOARD.md` (visual/HUD language), `ROADMAP.md` (sequencing),
> `TECHSTACK.md` (architecture), `BACKLOG.md` (post-ship + rejected).
>
> The tone entry is the one worth keeping visible rather than deleting: the
> "funny wink" version was considered seriously and argued against, and
> knowing *why* it lost is more useful than a file that pretends the
> question never came up.

## Origin

`mp-pong-2020` is a 2020 vanilla-JS Pong clone (`index.html`, `main.js`,
`style.css`, no build tooling, no framework). The goal is a full rebuild —
Three.js + TypeScript + modern tooling — with a genuine creative twist, not
just a visual reskin.

## Reference films and how each maps to the game

- **Tron (1982)** — cleanest mechanical translation. Its whole aesthetic is
  already geometric and game-like, so "arena as grid, paddle as wall segment,
  ball as data" falls out naturally. Best source for **architecture**.
- **The Last Starfighter (1984)** — the one with real narrative teeth. Its
  entire premise (an arcade game secretly being an alien recruitment test)
  is almost exactly the reveal structure we want. Best source for **the
  twist's story logic**.
- **Blade Runner (1982)** — hardest to translate mechanically; its power is
  mood, not systems. Works best layered on as **atmosphere and texture**
  (fog, neon, synth pads) rather than driving gameplay decisions directly.

## Direction landed on (pending confirmation in the actual Claude Code session)

A **hybrid**: Tron geometry as the default visual language, Blade Runner
atmosphere bleeding in as the twist progresses, Last Starfighter's
recruitment-reveal as the narrative spine. The twist itself is the highest-
value creative idea here — turning the reveal into the hook, not just
prettier visuals.

Mechanically, leaned toward an **escalating reveal**: play opens as normal
Pong, then camera, HUD, and audio gradually reveal the game was never just
Pong. This was preferred over baking the twist into visible day-one mechanics,
because a slow reveal respects the Last-Starfighter-style "you didn't know
what you were playing" beat — front-loading it would spoil the point.

## Why a tree-of-thought prompt instead of a single ask

A single "modernize this and make it sci-fi" prompt to Claude Code would
likely converge on generic neon-Pong without examining alternatives. The
prompt is structured as gated branches (creative direction → game mechanic →
tech architecture → scope/sequencing) specifically so each decision gets 2-3
real options compared before committing, rather than Claude silently picking
one and moving on.

## Why a two-hat persona (designer + engineer)

The decisions split cleanly: creative-direction and mechanic branches need
design judgment about player experience and readability; architecture and
performance branches need engineering judgment about Three.js's real
pitfalls (draw calls, post-processing cost, disposal). A single blurred
"expert game dev" persona tended to produce shallower answers on both than
naming the two roles explicitly and asking the persona to reason as each.

## MOODBOARD.md status

Drafted assuming the hybrid direction + escalating reveal, before those were
formally confirmed inside the actual planning session. Treat it as a strong
draft, not gospel — if the real session lands on a different direction or
mechanic, the moodboard's camera/HUD act structure will need to be revisited
to match, not silently kept as-is.

## The identity reveal (resolved — this is the twist)

The controlling intelligence the player has been playing against the entire
time is not a generic AI antagonist. It's **the developer** — a playful,
autobiographical reveal. The game plays straight-faced sci-fi Pong, then the
"opponent" turns out to be a stand-in for the person who built it, and the
climax surfaces real career info (experience, skills, projects) styled as a
decrypted system profile rather than a LinkedIn page.

This resolves the previously-open "sinister vs. wondrous" tone question:
it's neither — it's **personal and a little funny**, closer to a wink at the
player than a threat or an award. The AI was never hostile; it was curious
about who was good enough to keep playing.

Practical implication: the "recruitment" framing from The Last Starfighter
reference now has a literal answer to "recruited for what?" — the player
was being evaluated, and the payoff is meeting the person on the other side
of the system, not an abstract organization.

### Naming the pre-reveal entity

Before the reveal, the opponent needs a name/label that reads as cold and
system-like, not personal — so the eventual reveal ("this was a person all
along") actually lands as a shift. Options to pick from (not decided yet):
- `THE ARCHITECT` — fits Tron's vocabulary directly, slightly grandiose
- `ROOT` — terse, technical, very "system," lowest-key option
- `OPERATOR` / `OPERATOR-0` — neutral, faintly bureaucratic, Blade-Runner-adjacent
- `THE GARDENER` — odd one out, implies tending/cultivating rather than
  controlling — could undercut the eventual "it's a person" reveal nicely
  since gardening is a very human, unglamorous verb for a "godlike AI"

### What actually gets revealed

The climax should show real, current info, styled as a system dossier — not
a joke CV, an actual one, just presented as if the "system" is finally being
forced to disclose its own identity:
- Name
- Role / title (Senior Frontend Engineer, Frontend Architect)
- Years active (12+)
- Core specializations (React, TypeScript, Three.js, etc.)
- Current focus (AI integration, agentic systems — ties directly to the
  real bio already written for `GadDev/GadDev`)
- A way to actually connect (LinkedIn, GitHub) — the game's ending screen
  doubling as a soft call-to-action, which is unusual and memorable for
  something framed as a game rather than a portfolio site

This means `MISSION.md` and the eventual HUD copy should pull from the same
bio material already used in the `GadDev/GadDev` profile README, so the two
stay consistent rather than describing two different versions of the same
person.

## Open questions not yet resolved

- **Tone of the reveal itself**: played completely straight (dramatic,
  slow-burn) vs. self-aware and funny (the system visibly "glitches" into
  a wink at the player, maybe even breaking the fourth wall slightly). This
  is now the main open creative question — the *what* is decided, the
  *how* isn't.
- Pre-reveal entity name (see options above).
- Whether the twist should be discoverable only once, or whether repeat
  playthroughs should let the player deliberately trigger/skip toward it.
- No decision yet on scope for a "weekly boss fight"-style replay loop
  (relevant if this project follows the same daily-practice pattern as
  `big-o-society` / `dsa-system`) — may not even be a fit for this project's
  goals, worth a deliberate yes/no rather than defaulting either way.