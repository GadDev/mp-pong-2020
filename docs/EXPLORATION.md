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

> **Status: `EXCHANGE` is being trialled in the code** — the two DOM title
> marks and `index.html`'s `<title>`/`og:title` now read `EXCHANGE`. The
> question below is still **open**: nothing moved into `MOODBOARD.md` as
> spec, and no losing candidate moved into `BACKLOG.md`'s "rejected, with
> reasoning." Reverting is one constant and two HTML attributes.

### What the repo name is vs. what the game is called

`mp-pong-2020` stays the repo name — it's baked into
`vite.config.ts`'s `base` and therefore into the Pages URL, and renaming it
buys nothing. The **game title** is a separate string, and it now lives in
one place: `src/ui/title.ts`'s `GAME_TITLE`. The touch list is five sites,
two of which can import that constant and three of which can't:

- `src/ui/title.ts` → `GAME_TITLE` — the single source for the two DOM marks
- `src/ui/intro.ts` → reads `GAME_TITLE`
- `src/ui/mainMenu.ts` → reads `GAME_TITLE`
- `index.html` → `<title>` **and** `og:title` (both `EXCHANGE`)
- `README.md` H1 and `package.json` `description` → **deliberately still
  `MP PONG 2020` / "Pong".** These are the repo's outward face and are doing
  the same disguise work the constraints below are built around —
  `MISSION.md` opens "This is Pong. It looks like Pong." They move only when
  the title stops being a trial.

### The test a candidate has to pass

Not "is it cool." Four constraints, in priority order:

1. **It reads differently after the reveal.** A title that's merely
   evocative (`GRID DUEL`, `NEON VOLLEY`) fails: nothing about it
   recontextualizes, so it's decoration. The whole design thesis is
   "inevitable in hindsight" — the title is the first and cheapest place to
   earn that.
2. **It doesn't spoil.** Nothing about evaluation, observation, testing,
   subjects, or a person behind the curtain. This kills `OPERATOR`,
   `SUBJECT`, `EVALUATION`, and anything with "watcher" in it, however good
   they look on a title card. (`THE DIVISION` was previously listed here as
   a spoiler; per `LORE.md`'s reconciliation pass it isn't one — it's simply
   not canon. The name exists only as a writers'-room codename for the
   misdirection, appears nowhere in the game, and so is unavailable as a
   title for the more basic reason that it doesn't refer to anything.)
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
| **EXCHANGE** | "An exchange" is genuine racket-sport vocabulary. Also *telephone exchange* — period-correct switching hardware. | A two-way exchange, i.e. a conversation. The whole pre-reveal premise is that this is one-way (you versus logic); the climax is the moment it turns out to have had two parties the entire time. | **Contender.** Best flip on the list and the only candidate with no vocabulary collision — see below. Weakest disguise of the serious four. |
| **CONNECT** | Not Pong vocabulary — you don't *connect* in Pong. Reads as online multiplayer, or as `Connect Four`. | Human connection / an open channel. | Rejected — see below. Collides with `LORE.md`'s "channel," and has no innocent first reading to flip *from*. |
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

**Recommendation: `RALLY`** — *contested, see EXCHANGE below* — if you read
the redaction as the payoff. One word, tab-safe, indistinguishable from a
1982 cabinet, and the second meaning is already load-bearing in
`MOODBOARD.md`. **`VOLLEY`** if the camouflage and the clean Act 3 read
matter more than the flip.

### EXCHANGE vs CONNECT

Both dodge the RALLY objection entirely — neither is a word the Act 3 HUD
retires — but they don't fare equally, and the test that separates them is
the one RALLY forced into existence: **does the title collide with
vocabulary `LORE.md` sanctions for Act 3?**

**CONNECT collides.** `LORE.md`'s climax frames the dossier link as "a
*channel* or *signal* the system is opening." `CONNECT` is a synonym for
precisely that, arriving precisely when the HUD needs to be legible — the
same class of objection as RALLY's, not a lesser one. Worse, it fails
constraint 1 from the other side: a flip needs a strong *innocent* reading
to flip away from, and nobody connects anything in Pong. With no first
meaning, `CONNECT` lands on its second immediately — it asks "connect to
what?" before the player has pressed Start, which is a soft constraint-2
breach. Practical objection on top: one-word `CONNECT` on a Pong game reads
as online multiplayer, in a game that has none, and the repo being
`mp-pong-2020` makes that misread likelier rather than less.

**EXCHANGE doesn't collide** with anything in the sanctioned set (response
cycles, adaptation index, threat assessments, designation, channel, signal,
feed, observation). And it has the cleanest innocent reading available
after VOLLEY — "an exchange" is real racket-sport usage — so there is
something to flip. The flip itself is the strongest on the list: the game's
premise is a one-way relationship (a subject versus logic) and the climax
discloses that it was two-way all along. That is the thesis of the whole
design compressed into one word. It also sits in the *recruitment* register
`MOODBOARD.md` reserves amber for, where VOLLEY's "volley of questions"
reads adversarial — an exchange is between equals, which is what Act 3 is
actually offering.

Where EXCHANGE loses, plainly:

- **Constraint 3, its real weakness.** It's a worse 1982 cabinet word than
  VOLLEY and much worse than PONG; the stock-exchange echo is genuine. Its
  only counterweight is *telephone exchange* — period-correct switching
  hardware whose entire function is connecting two parties. That reading
  has to carry the disguise on its own, and it may be too oblique to.
- **Constraint 4.** Eight characters against the current four. At
  `theme.css`'s title mark (48 px, `0.35em` tracking) `PONG` measures
  roughly 180 px and `EXCHANGE` roughly 360 px — fine on desktop, tight on
  a 375 px viewport, and tighter still once a stylized display font
  replaces the monospace. Either the mark shrinks or the tracking does.

**Verdict: EXCHANGE is a real contender and CONNECT isn't.** Ranked on the
constraints as written, EXCHANGE wins constraint 1 outright, ties on 2,
loses 3 to VOLLEY, and pays a small cost on 4. Whether that trade is worth
taking is the same open question the doc already names below.

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

> **SUPERSEDED — Tier 3, adopted.** Tier 1 shipped first (see below for that
> reasoning trail) but the presence now overrides the no-face rule: it is a
> faceted, low-poly humanoid face (`src/presence/face.ts`) that speaks its
> boot fragments aloud via the browser's `speechSynthesis`
> (`src/presence/tts.ts`), pitched and paced into a flat, artifact-y register
> on purpose — synthetic, not warm, so it still reads as a function reporting
> status rather than a character with an arc. Still: no eyes that read as
> organic (angular glowing slits), no second-person copy, same clinical
> fragments as before (`SYSTEM READY.` / `AWAITING INPUT.`), same
> once-per-session silence.
>
> **Open question, deliberately not resolved here:** this does spend some of
> what `LORE.md`'s "no face, no backstory teased before the climax" rule was
> protecting — a synthetic voice at boot is more character than a silent
> wireframe was. The mitigation is the *register* (flat, machine-toned,
> uncanny rather than expressive) rather than removing the face, on the
> reasoning that the reveal's actual payoff — "OPERATOR was a stand-in for
> the developer" — is about identity, not about whether a face/voice existed
> at all. Whether that mitigation is sufficient, or whether the Act 3
> dossier payoff needs to be re-weighted now that the intro is no longer
> silent, is unresolved and belongs to a future pass, not this one.
>
> **Further amendment: a one-time first-boot monologue.** `src/presence/voice.ts`'s
> `INTRO_MONOLOGUE` — full sentences, addressed to "you" — plays once ever,
> gated by `persistence.ts`'s `hasHeardIntroMonologue`; every boot after that
> reverts to the short, impersonal `BOOT_SCRIPT`. This is a second, distinct
> override of `LORE.md`'s "No second-person copy, ever," on top of the one
> above. It stops short of the specific violation the doc names elsewhere
> (`EXPLORATION.md` §2's "WELCOME BACK, SUBJECT"): it never claims to
> recognise the player or implies memory across sessions, and it never says
> the words "OPERATOR" or "the Division." Whether one-time second-person
> address plus a synthetic talking face is still compatible with OPERATOR
> reading as "a function, not a character" going into Act 2 is the same open
> question as above, now with more surface area — not re-litigated here.

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

## 4. The presence's face and voice — resolved

> **Status: decided and built.** Unlike the rest of this file, this section is
> a record rather than an open question. Losing options are in `BACKLOG.md`'s
> "rejected, with reasoning."

### What was wrong, measured rather than assumed

§3 adopted a talking face. It did not deliver one. Screenshotting the intro:

- **It read as a mushroom.** `LatheGeometry` is open at both ends and
  single-sided, so the neck hole exposed the *interior* of the skull — the wide
  lit funnel under the head was the inside of the mesh.
- **Features sat ~0.3 world units too high.** The eyes were up in the crown and
  read as a visor slit; the nose cone landed at mouth height; the mouth bar was
  below the chin. The lathe's widest point was where a face narrows.
- **The grid was noise.** `EdgesGeometry(geometry, 1)` — one *degree* — kept
  every triangulation diagonal, so it was a lat/long net plus diagonals.
- **You could see through it**, and at a 95 px radius cap the whole head was
  190 px tall, too small for anatomy to read.

The structural point, which is what forced a replacement rather than a repair:
**a lathe of revolution is rotationally symmetric, and a face's entire
information content is in its front plane.** No profile tuning reaches a face.

### The axis that decided it

§3's own amendment says the mitigation for overriding `LORE.md`'s no-face rule
is *the register* — "if a face greets you at boot, the face cannot be the
reveal." So the scoring axis is **constructed artifact (good) vs. character
(bad)**, and it inverts the obvious ranking: blinking, brows, expression,
smooth organic skin and a warm voice all read as better craft and all spend
payoff Act 3 needs.

A useful consequence, and the reason the chosen option is *more* spec-compliant
than what it replaced: a bare wireframe with no skin reads as a model *of* a
face. The lit, flat-shaded head it replaced read as an object.

### What was built

- **Geometry:** the MediaPipe canonical face mesh (468 vertices, 898 triangles,
  Apache-2.0) inlined as typed arrays in `presence/faceMesh.data.ts` — ~9 kB
  gzipped. Anatomically correct with no art direction required, and its varying
  triangle density (dense at eyes and lips, sparse across the cheeks) *is* the
  reference look. Its one lore cost is worth naming: a face-*tracking* mesh
  reads as measurement, which brushes the objection that killed §3's Tier 2
  ("an eye is unambiguously an observer, and being observed is the Act 3
  reveal"). Weaker here — the presence is the thing meshed, not the player —
  but not zero.
- **Shading:** none. A void-black fill sits behind cyan lines purely to occlude
  the far side of the net, and the presence scene's three lights were deleted.
- **The mask has no back of head**, so both rotations are bounded well below
  the old shared 0.32 rad — past roughly a fifth of a radian its open edge
  comes into view.
- **Voice:** three changes, none of which is a new dependency.
  - The mouth is driven by *audio*, not by the fragment's on-screen window. It
    used to flap whether or not anything was audible — including before the
    first user gesture, when an utterance is queued but paused. Now: a measured
    amplitude envelope where one exists, word-boundary impulses where they
    don't, and the old phase clock only as a last resort (a muted player must
    still see a face that talks).
  - `presence/bed.ts` — an authored machine-audio layer under the voice. This
    exists because of one hard limitation: `speechSynthesis` exposes no
    MediaStream, so its output cannot be filtered at all. The voice being
    uncolourable is why the colour comes from underneath it.
  - The first-boot monologue is **pre-rendered** (`presence/clips.ts`), because
    on the `speechSynthesis` path the register is whatever voice the device
    ships — a coin flip, on a script that plays once ever with no route back.
    espeak-ng rather than macOS `say`: right sound, and unambiguously
    redistributable in a public Pages build.

### The open question §3 left is still open

None of this settles whether a synthetic talking face at boot is compatible
with OPERATOR reading as "a function, not a character" going into Act 2. It
does move the needle in the right direction — a wireframe mask is less of a
character than a lit head, and an authored machine bed is less of a character
than a stock assistant voice — but the question §3 records is unchanged, and
still belongs to a future pass.

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
   built in `src/presence/`, then superseded by Tier 3. See the note at the
   top of §3, and §4 for the face and voice as built.
