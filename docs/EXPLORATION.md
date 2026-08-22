# EXPLORATION — open questions, nothing decided

> **Status: not spec.** `MOODBOARD.md`, `LORE.md`, `TECHSTACK.md` and
> `ROADMAP.md` are the sources of truth. This file is a staging area for
> ideas that are still being weighed — specifically the game's **title**,
> the **intro beat**, and the **pre-game presence** ("an AI avatar that
> talks to you"). Nothing here is committed scope. When something is
> decided, it moves into the relevant spec doc and its alternatives move
> into `BACKLOG.md`'s "rejected, with reasoning."
>
> `BACKLOG.md`'s thesis applies with full force here: this is the most fun
> part of the project to think about and the least likely to ship the game.
> Treat it as one session's exploration, not a workstream.

---

## 1. The title

### What the repo name is vs. what the game is called

`mp-pong-2020` stays the repo name — it's baked into
`vite.config.ts`'s `base` and therefore into the Pages URL, and renaming it
buys nothing. The **game title** is a separate string. If one is chosen,
the touch list is exactly four places:

- `index.html` → `<title>` (currently `MP Pong`)
- `src/ui/intro.ts` → hardcoded `"PONG"`
- `src/ui/mainMenu.ts` → hardcoded `"PONG"`
- `README.md` H1 and `package.json` `description`

### The test a candidate has to pass

Not "is it cool." Four constraints, in priority order:

1. **It reads differently after the reveal.** A title that's merely
   evocative (`GRID DUEL`, `NEON VOLLEY`) fails: nothing about it
   recontextualizes, so it's decoration. The whole design thesis is
   "inevitable in hindsight" — the title is the first and cheapest place to
   earn that.
2. **It doesn't spoil.** Nothing about evaluation, observation, testing,
   subjects, or a person behind the curtain. This kills `OPERATOR`,
   `SUBJECT`, `EVALUATION`, `THE DIVISION`, and anything with "watcher" in
   it, however good they look on a title card.
3. **It's plausibly a 1982 cabinet.** In-fiction, the disguise *is*
   recreational hardware (`LORE.md`, "The Grid"). A title that sounds like
   an art-house narrative game breaks the disguise before the player
   presses Start. This is a real constraint, not flavour — it's the same
   argument `MOODBOARD.md` makes for the menu being deliberately plain.
4. **It's short and legible.** One word if possible: it has to work in a
   browser tab, and it has to survive being set in the one permitted
   stylized display font (`MOODBOARD.md`, Typography).

### Candidates

| Title | Reads pre-reveal as | Reads post-reveal as | Verdict |
|---|---|---|---|
| **RALLY** | The Pong rally. Also faintly a 1980s racing cabinet (`Rally-X`, 1980) — good camouflage. | *To rally someone* — to a cause. `MOODBOARD.md` already calls Act 3 "the recruitment" and reserves amber for "recruitment beats." The title turns out to have named the recruitment, not the ball. | **Recommended, with one live objection** — see below. Strongest hindsight flip, and it maps onto vocabulary already in the spec. |
| **VOLLEY** | Pure Pong. The most cabinet-authentic word on the list. | A volley *of questions* — an interrogation exchange, which is precisely the Voight-Kampff register `MOODBOARD.md` cites for the Act 3 HUD. Also military. | **Strong runner-up.** Better disguise than RALLY, slightly weaker flip. |
| **RETURN** | Returning the ball. Also a key on the keyboard the player is touching — quietly diegetic. | A *reply*. Sits directly on `LORE.md`'s canonical "response cycles" relabeling. | Dark horse. Plainest of the three, which is either the point or too plain. |
| **SERVE** | Serving the ball. | *Service* — as in employment, as in being of use to someone. Cold. | Good flip, but "serve" reads slightly submissive for a title. |
| **DEREZZ** | Authentic Tron vocabulary; instantly signals the aesthetic. | Nothing. It's a costume. | Rejected — fails constraint 1. |
| **PATTERN** | Odd for a cabinet. | On the nose: `LORE.md`'s measured trait is literally "pattern-adaptation." | Rejected — brushes constraint 2. |

### The objection to RALLY, which cuts both ways

`LORE.md`'s single sanctioned relabeling is **"rallies become 'response
cycles'"** — i.e. *rally* is precisely the word the Act 3 interface
deliberately overwrites. Naming the game `RALLY` therefore means the title
is the term the system retires in front of the player.

That is either the sharpest hindsight flip available — the game's own name
gets redacted by the interface, in-fiction, while you watch — or it's a
collision that muddies the Act 3 HUD read, since the player is now holding
two competing meanings for one word at the exact moment the HUD is trying to
be legible. `MOODBOARD.md`'s readability-over-spectacle rule leans against
it; the design's "inevitable in hindsight" thesis leans hard for it.

This is the actual decision, and it's a taste call, not a derivable one.
`VOLLEY` has no such collision at all.

**Recommendation: `RALLY`,** if you read the redaction as the payoff. One
word, tab-safe, indistinguishable from a 1982 cabinet, and the second
meaning is already load-bearing in `MOODBOARD.md`. **`VOLLEY`** if the
camouflage and the clean Act 3 read matter more than the flip.

One consequence worth naming: the on-screen title mark currently says
`PONG`, which is doing real work — it's the plainest possible promise, and
plainness is the design. A more interesting title is a slightly worse
disguise. That trade is genuinely open.

---

## 2. The intro beat

### What's specified now, and the gap

`MOODBOARD.md`: "a few seconds of void black with a small, static logo/title
mark fading in — no camera movement, no grid yet, nothing that telegraphs
Act 1's arena. Skip prompt appears after a beat, not instantly."

`src/ui/intro.ts` implements the fade and the delayed skip prompt.
**Resolved:** it auto-advances to the menu after 4.5 s (`intro.ts:39`), so
an idle player is no longer stuck on the logo.

### Where a longer intro can go without breaking anything

The constraint that binds every option below: the intro cannot telegraph
the arena, cannot hint at a twist, and cannot be *more* elaborate than Act
1's in-game HUD — otherwise it undercuts the "deliberately plain so later
corruption reads as real" premise the whole reveal rests on.

The way out is that **an arcade cabinet from 1982 has its own conventions,
and every one of them is plain.** Leaning into hardware ritual buys
atmosphere without spending any of the reveal's budget:

- **A boot / self-test sequence.** Two or three lines of monospace gray,
  one every ~400 ms, then black. Diegetically it's cabinet hardware waking
  up. Pure Act 1 language (`#C8C8C8` on `#0A0E14`, no chrome). Cheap: it's
  a `setTimeout` chain over the DOM overlay already built. The trap is
  writing four lines when one would do — a self-test that scrolls is a
  loading screen, and nobody has ever enjoyed one.
- **Attract mode.** The single strongest idea here, because it's *free*:
  the reveal spike already autoplays. A cabinet left alone demos itself. If
  the title screen idles into a silent Act-1-only camera pass over the
  court — no HUD, no escalation, ever — the game gains the most
  period-authentic framing device available, and it costs a timer plus a
  hard cap at Act 1. **Risk to control:** attract mode must be incapable of
  entering Act 2. If it ever escalates unattended, the reveal is spent on a
  player who wasn't even holding the mouse.
- **A calibration handshake.** Before the first serve: `MOVE TO CALIBRATE`,
  and the paddle tracks your mouse for two seconds before the ball exists.
  Reads as a tutorial. In-fiction it is the evaluation taking a baseline
  (`LORE.md`, "pattern-adaptation under pressure" — you can't measure
  adaptation without a baseline). Zero spoiler, and it converts the most
  boring possible moment into the one that recontextualizes hardest.
- **Sound before image.** Room tone / a faint fan hum under the black,
  ahead of the logo. `MOODBOARD.md` already establishes audio-leads-visual
  as this project's technique for Act 3; using it once at the very start,
  quietly, teaches the player's ear that sound here means something. Held
  back until M5, when audio is real.

### Deliberately not doing

**Recognising a returning player at the intro** ("WELCOME BACK, SUBJECT")
is the tempting one, and it's a direct violation: `MOODBOARD.md` and
`BACKLOG.md` both require the interface to have *no memory a player can go
looking for*. `hasSeenReveal` may silently disarm the escalation; it must
never be visible.

---

## 3. The pre-game presence — "a Tron-style AI face that talks to you"

> **DECIDED — Tier 1, built.** `src/presence/` implements the faceless
> version: a cyan wireframe icosahedron above the title that turns slowly
> on its own, quickens and leans toward the pointer while you move, and
> eases back to the slow drift when you stop. (It never fully stops — a
> dead-still version reads as a static logo for anyone who doesn't move
> the mouse, and never moves at all on touch, which has no passive pointer
> movement to wake it.) Two boot fragments (`SYSTEM READY.` / `AWAITING INPUT.`),
> then silence for the session. Rendered in-canvas through the shared
> `WebGLRenderer` on its own bare scene — no grid, nothing that
> telegraphs the arena. The no-face rule stands; the counter-proposal
> below (the face belongs in the Act 3 dossier) is still the plan. The
> rest of this section is kept as the reasoning trail.

### The conflict, stated plainly

This one collides head-on with three confirmed decisions, and it's worth
being direct about it rather than quietly building a compromise:

- `LORE.md`: "No face, no backstory teased before the climax — a rim-lit
  silhouette is sufficient and correct pre-reveal, since the whole point is
  that it reads as a *function*, not a character with an arc, right up
  until it isn't one."
- `MOODBOARD.md`: the intro is void black and a static mark, "nothing that
  telegraphs."
- `BACKLOG.md`, under *features that would break the fiction*: anything in
  the menu that acknowledges the reveal exists.

And the structural version of the argument, which matters more than any
citation: **if a face greets you at boot, the face cannot be the reveal.**
The payoff gets spent on the title screen, and Act 3 arrives with nothing
left to disclose.

That said — these are your docs and you're entitled to reopen them. What
follows is a ladder, cheapest and most spec-compliant first, so the cost of
each step is visible.

### Tier 0 — a voice with no body (fully spec-compliant)

A blinking cursor and one or two clinical lines during the boot sequence.
No entity, no personality, no acknowledgement of the player as a person.
`SYSTEM READY.` / `AWAITING INPUT.` This is what the spec already permits,
and it's more than the current empty intro has.

### Tier 1 — a faceless presence (recommended if you want *something*)

**The Tron reference for a pre-game presence isn't the MCP. It's the Bit.**
A non-anthropomorphic object with obvious internal state: a slowly rotating
wireframe polyhedron, or a single flat audio-waveform line that spikes when
it speaks and flattens when it doesn't. It "talks" in one or two words at a
time, in the same clinical register as the HUD, and — this is the part that
does the work — **it reacts to you.** It stills when your mouse stops. It
tracks the cursor a little. It waits.

Why this is the right tier: it delivers everything the request is actually
after (the screen is inhabited, something is aware of you, the intro isn't
dead air) while OPERATOR stays a function and no face is spent. It also
plants, in hindsight, that *something was paying attention before the match
started* — which is true, and which the player can only read as decoration
on a first pass. That's the exact mechanic the rest of the design uses.

Cost: it's a new visual object with its own animation state, in a milestone
(M2) whose whole justification is being low-risk UI work. Realistically
this is an M5 polish item, not something to bolt onto the menu shell now.

### Tier 2 — an eye, not a face

A single aperture / iris / vertical scanline that opens when the game
starts and closes on quit. Ambiguously anthropomorphic. **Tension:** an eye
is unambiguously an observer, and being observed is the Act 3 reveal
(`MOODBOARD.md`'s watcher cut). This tier tips the hand. Not recommended.

### Tier 3 — the full talking face

Requires explicitly overriding `LORE.md`'s no-face rule and
`MOODBOARD.md`'s intro spec. If it happens, the version that costs the
least is a face the player *cannot* read as a character: geometric,
low-poly, no eyes, speaking in the same clinical fragments as the HUD —
closer to a mask than a portrait. It still spends the payoff. Recorded
here so the trade is on the record, not because it's advisable.

### The counter-proposal

**Put the face in Act 3, where it's the reveal.** `LORE.md`'s climax is a
dossier that resolves out of the dense HUD panel — a personnel file. A
personnel file has a photograph. The most Tron-accurate, most *earned*
version of "a digital face that talks to you" is the one that shows up in
the last ninety seconds, once, in the panel that discloses who built this —
having been a faceless function for the entire game up to that point.

That's the same asset, the same idea, and the same amount of work. It just
lands instead of leaking.

---

## Recommended next steps

Ordered by cost, and none of them are Milestone 2 blockers:

1. ~~Fix `intro.ts`'s missing auto-advance.~~ Done — `intro.ts:39`.
2. Decide the title (or explicitly decide to keep `PONG`), then update the
   four call sites at once so they can't drift.
3. Log attract mode and the calibration handshake in `BACKLOG.md` as Tier 1
   post-ship items — both are small, both are period-authentic, and both
   need the real court from M3 to exist first.
4. ~~Leave the presence question open until M5.~~ Decided early — Tier 1,
   built in `src/presence/`. See the note at the top of §3.
