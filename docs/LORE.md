# LORE — internal story bible

This document is **not player-facing**. Nothing here gets dumped on-screen
as exposition, ever — that would be the exact mistake I flagged in Branch 1
against pure Blade-Runner-as-flavor-text: lore only has value if the player
pieces it together from fragments, not if it's handed to them. This exists
so that every HUD glitch, designation string, relabeled score term, and
audio stinger comes from one consistent underlying fiction instead of each
being invented independently and never quite agreeing with each other.

**Revision note 1:** this document originally treated the pre-reveal
institution (THE DIVISION) as the whole truth of the fiction, with a
deliberately unresolved sinister-institutional ending. That's superseded —
the twist is now fixed (the "system" is a stand-in for the developer;
see the climax section below) and the confirmed delivery tone is **played
straight, escalating reveal, OPERATOR as the pre-reveal name**. What
survives from the original draft: everything about the *disguise* — the
institutional framing is still exactly what makes the reveal land, since
"cold bureaucratic system" is precisely what needs to be undercut by
"actually just one person's project." What doesn't survive: the ending,
and the assumption that the institution is the actual point rather than
the misdirection.

**Revision note 2 — reconciliation pass.** Revision note 1 replaced the
ending but never went back and rewrote the sections written under the old
one, so this document was simultaneously asserting a real organization and
"the evaluation was never institutional." That and five smaller collisions
are now resolved. What changed:

| Was | Now | Why |
|---|---|---|
| THE DIVISION is an organization that seeded the instrument | THE DIVISION is a **writers'-room codename for the misdirection**. No institution exists in the fiction; the name is never on screen | A twist must recontextualize, not negate. Verified zero player-facing call sites, so this costs nothing to tighten |
| Act 3 is "the recruitment" (`MOODBOARD.md`) with no recruitment in it | The recruitment is **inverted and stated as such** — see "The recruitment that isn't" | A promise was being made and not paid |
| `threat assessments` (`MOODBOARD.md`, `hud.ts`) alongside `response cycles` / `adaptation index` | `threat assessment` **retired**. Two sanctioned terms only | Three competing terms, and "threat" pre-loads a hostility the ending explicitly disclaims |
| Score "becomes a running adaptation index rather than a point count" | Relabeling is **label-only**; the two digits and their green/red coding never change | As written it collided with the project's one hard readability rule |
| Watcher is "reviewed after the fact" while OPERATOR is live-adaptive | One person is present *sometimes*; the fixed asset records the rest | Something is either live or it isn't |
| Degradation costs overhead "each point lost" | Degradation is driven by **sustained rally performance** | Grounded a derezz mechanic the roadmap doesn't have, and punished losing instead of rewarding skill |

Two things this pass writes down that the docs never stated. Neither is a
new invention — both were settled in code during Milestone 4 and were simply
missing from the story bible, which is how a story bible drifts:

- **The match plays to its natural first-to-N conclusion and the dossier
  resolves after the final point, regardless of who won.** Implemented at
  `presentationState.ts` ("the dossier resolves whenever a match that *did*
  escalate finishes") and routed in `main.ts` as
  `showScreen(frame.climax ? "dossier" : "result")`.
- **The opponent is unnamed in Act 1 and `OPERATOR` from Act 2.** This one is
  a genuine decision rather than a transcription — the docs left it
  ambiguous whether the player ever sees the word, and `src/ui/result.ts`
  currently resolves that ambiguity in the other direction. See "The
  opponent."

Per the confirmed direction: **environmental-only storytelling before the
climax.** Everything through Act 2 and early Act 3 is delivery-constrained
to channels already specified in `MOODBOARD.md` — HUD readouts,
designation IDs, relabeled score language, ambient audio texture. The
climax dossier is the one deliberate exception to "environmental only" —
it's an explicit, full-screen disclosure, not a fragment, because the
brief requires it to actually convey real, actionable information (name,
role, years, specializations, current focus, a live link), which cannot be
inferred from atmosphere alone.

---

## The scenario — beat sheet

The whole story in reading order. Everything after this section is the
*reasoning* behind a beat; this is the beat, and **this sheet wins every
tiebreak.** If a section below disagrees with it, the section is stale —
that's a bug to report and fix here, not a choice to implement.

**Logline.** A game of Pong is being used to read the person playing it;
when the read finishes, the thing on the other side turns out to be one
person, and it introduces itself.

**Act 1 — "Just Pong."** First serve to the escalation trigger. Real Pong,
played straight, no narrative content whatsoever. Camera dead still. HUD is
two digits and nothing else — no labels, no opponent name, no designation.
The opponent is *unnamed*: it reads as ball-tracking logic because that is
all the game gives you to read. Nothing here is a tell, including the
absence of tells. **The single most common way to break this act is to put
something interesting in it.**

**Act 2 — "Something's wrong."** Triggered by sustained rally performance
(see "The read"): the better you play, the deeper the read goes. Camera
begins its imperceptible pull-back and picks up micro-drift — the first
implication of an operator rather than a rig. A designation readout appears
in a corner, small and easy to miss. The score digits flicker for single
frames to an unfamiliar counting system and snap back. Audio picks up
stutter and pitch-bend. The opponent is named **OPERATOR** for the first
time, here, flatly, as a label on a readout. The player now suspects
something and can confirm nothing. Still no line of copy addresses them.

**Act 3 — three internal beats, strictly in this order.** They are not
simultaneous, and shipping them simultaneously is the failure mode:

1. **The relabel.** The clean cyan HUD densifies into the amber/magenta
   clinical interface. The score gains the label `ADAPTATION INDEX`; the
   rally counter reads `RESPONSE CYCLE n`. The digits and their green/red
   coding do not change. This is the coldest point in the game, and it is
   where the player concludes they are inside an institution. That
   conclusion is the misdirection doing its job — the interface never
   claimed it.
2. **The watcher cut.** One jarring shot from outside the court, looking
   in. Chromatic aberration, used here and nowhere else. Fires *once*,
   mid-act, not at the end. Confirms observation without explaining it.
3. **The disclosure.** The match plays to its natural first-to-N
   conclusion. After the final point — **regardless of who won** —
   `EVALUATION COMPLETE — SOURCE DISCLOSURE FOLLOWS`, and the dense panel
   resolves into the dossier: a real personnel file for the person who
   built the game, with one diegetically-framed link. The interface's
   register does not shift by a single word. The content is the entire
   surprise.

**The ending.** The dossier is the ending. No acknowledgement of the player,
no score of how they did, and **no epilogue in current scope** — a single
additional fragment after the disclosure stays parked in `BACKLOG.md`
Tier 2, where the argument against overreaching on it is recorded. Win and
loss are undifferentiated beyond the match-end headline, because the
evaluation completing is the point and gating the payoff on winning would
turn it into an unlock.

**The second playthrough.** `hasSeenReveal` is set, and the escalation never
fires again on that device. In-fiction this is not a technical concession —
the evaluation is *complete*. There is nothing left to measure, so the
instrument doesn't wake up. The game is Act 1 forever, still and quiet and
never mentioning that it used to be something else. Don't apologise for
this beat in copy or UI; it's the best one in the game and it works only if
nothing points at it.

## Canon glossary

The terms, and which act each is allowed to exist in. Deviating invents a
fourth vocabulary in a fiction that already had trouble holding two.

| Term | Status |
|---|---|
| `OPERATOR` | The opponent. On screen from **Act 2 only**; never in Act 1. Never "CPU", never "AI", never "computer" — those break the HUD's diegesis. |
| `RESPONSE CYCLE n` | Act 3 label for the rally counter. Sanctioned. |
| `ADAPTATION INDEX` | Act 3 label sitting above the score. **Label only** — the two digits and their green/red coding are untouched. |
| `SUBJECT / 47-KAPPA` | The player's designation. Persistent identity, appears Act 2. |
| `EVAL-ID: 8841-C` | The *session* ID — this match, not this player. Two different fields on purpose; don't merge them or use one where the other belongs. |
| `THE DIVISION` | **Writers'-room codename for the misdirection.** Never on screen, never in copy, not canon in the fiction. |
| `threat assessment` / `THREATS` | **Retired.** Supersedes `MOODBOARD.md`'s "or similar" and the strings currently in `hud.ts`. |
| The player | Deliberately nobody — unnamed, un-charactered, addressed only as a designation. Not a protagonist; do not give them one. |

---

## The premise (what the player doesn't know)

What looks like a cabinet-style Pong game is a **field evaluation
instrument**, disguised as recreational hardware. Who built it and why is
the twist; the misdirection is that the player will assume an institution,
and the interface will never once confirm or deny it.

**On THE DIVISION.** Earlier drafts of this document named that assumed
institution and treated it as real. It isn't, and the name is not canon —
it's the writers'-room shorthand for the misdirection itself, kept because
it's useful to have a word for "the thing the player wrongly infers." It
appears nowhere on screen and nowhere in copy. This is a tightening rather
than a change: no player-facing string in `src/` has ever carried it.

The reason this matters more than a naming preference: **a twist has to
recontextualize, not negate.** If the institution were real and then
revealed to be fake, every cold procedural detail the player collected was
a lie, and being lied to by a game is not the same experience as being
surprised by one. So nothing in Acts 1-3 is false. A subject genuinely was
being read. The opponent genuinely was adapting. The observation asset
genuinely was recording. The player gets exactly one thing wrong, and they
get it wrong entirely by themselves: **the scale.** They infer an
organization from evidence that only ever supported *someone*. The climax
doesn't take anything away from them — it corrects a number from "many" to
"one," and every detail they gathered stays true and re-reads warmer.

The instrument measures a specific trait: **pattern-adaptation under
pressure** — how quickly a subject adjusts their play after being read and
countered. This is not a fun fact for the player to learn; it's the reason
the AI opponent's difficulty states (Branch 2's honest 2-3 behavior tiers)
exist in-fiction, not just as a difficulty curve. The opponent isn't "the
CPU getting harder." It's an operator recalibrating against you in real
time — mechanically implemented as discrete state changes, but narratively
framed (via the Act 2/3 HUD relabeling) as evaluation, not escalation.

## The Grid (Act 1's reality)

The cyan-lit arena is not a metaphor layered on top of the real evaluation
space — in-fiction, **it is the evaluation space**, rendered to the subject
as something familiar and unthreatening (a video game) specifically so
they play naturally instead of performing for an audience they don't know
exists. The grid, the void-black backdrop, the clean minimal HUD — all of
it is deliberately designed *in-universe* to read as "just a game," which
is why Act 1's visual restraint (per `MOODBOARD.md`: no drift, no shake,
deliberately sparse HUD) isn't just good production design — it's the
in-fiction test environment doing its job of not tipping its hand.

## The read (what drives the degradation)

The instrument spends **processing overhead to keep the illusion running**,
and the deeper it reads, the more it spends — which is why the mask starts
slipping. Act 2's single-frame HUD flicker (an unfamiliar, non-human
counting system showing for a frame before snapping back) is the
evaluation's real interface leaking through the game-shaped one, exactly
where `MOODBOARD.md` already puts it. Degradation is the cost of attention,
not damage.

**What deepens the read is sustained rally performance, not points
conceded.** An earlier draft of this section tied the cost to each point
*lost*, inherited from a derezz mechanic the roadmap never adopted (M3/M4
is plain first-to-N scoring; there is no health to lose). Rebasing it on
rally performance is better on three counts and one of them is decisive:

1. It's the Last Starfighter logic this project is built on, and
   `MISSION.md` already says it in those words — "recontextualized the
   moment you're good enough for it to matter."
2. You cannot measure adaptation from someone who isn't adapting. A player
   who's losing badly is producing no signal worth spending overhead on.
   Escalating at them is the instrument behaving incoherently.
3. It makes the reveal a consequence of playing well rather than a
   consolation for playing badly. Punishing failure with story is the
   cheapest possible version of this game.

**What shipped, and why it's compatible.** Milestone 4 resolved the trigger
`ROADMAP.md` had deferred: **rally count primary with a score backstop** —
and the reasoning recorded there is subtly different from, and better than,
the one above. It picks rally count because it measures *engagement* rather
than skill, so a strong and a weak player reach the escalation at a
comparable point in their experience. That's the stronger argument: the
fiction above says the instrument spends overhead where there's signal to
read, and a long rally is signal regardless of who eventually wins the
point. Take the narrative claim as **the read deepens where there's
something to read**, not as "good players get the story." The score backstop
is the fiction's own safeguard — an instrument that never commits to a read
has failed at its one job.

**Act 3's runway is also already solved, and it's worth knowing why it
existed.** Because the dossier waits for the match's last point, a late
escalation would compress Act 3 to nothing — escalate at 9–9 in a
first-to-11 and the three ordered beats have two rallies to land in, so the
watcher cut either doesn't fire or collides with the disclosure it's meant to
precede. M4 handles this with minimum act dwell (`ACT_ONE_MIN_SECONDS`,
`ACT_TWO_MIN_SECONDS`) plus an override near match point. The constraint to
preserve, if those numbers are ever retuned: **Act 3 must always have enough
remaining match to hold three beats in order.**

**One thing that isn't solved.** `hasSeenReveal` is persisted via
`onEscalation`, which `presentationState.ts` fires at the Act 1→2
transition — "the first time the escalation fires." So a player who quits or
reloads during Act 2 has already spent their single discovery on something
they never saw, and there is deliberately no route back. The flag should be
written when the **dossier renders**, not when the escalation starts: the
thing being made once-only is the disclosure, not the approach to it.

## The opponent (Acts 1-2: a function — Act 3 climax: a person)

Designated **OPERATOR** — flat, bureaucratic, deliberately giving away
nothing (this naming was chosen specifically because a played-straight slow
burn needs zero early tells; see the Branch 1 naming discussion). No face,
no backstory teased before
the climax — a rim-lit silhouette is sufficient and correct pre-reveal,
since the whole point is that it reads as a function, not a character with
an arc, right up until it isn't one.

Pre-reveal, the player reads OPERATOR as ball-tracking logic, exactly as
intended. Its behavior-state changes across Acts 2/3 (the honest 2-3
difficulty tiers from Branch 2) still need to be real, not cosmetic — this
matters even more now than it did under the institutional-only framing,
because the eventual reveal ("this was a person adjusting to you") only
lands if OPERATOR's in-game behavior actually was adjusting. A twist that
retroactively claims depth the mechanic never had is a broken promise to
the player, not a clever reveal.

**When the name is visible.** Not in Act 1 — `MOODBOARD.md` specifies that
HUD as two digits and no chrome, and a label there is a tell. `OPERATOR`
first appears in Act 2 alongside the designation readout, as one more cold
field on a form. This is a decision, not a restatement; the word previously
sat in this document as an internal designation with no stated call site,
which left it ambiguous whether the player ever sees it.

The direct consequence, worth stating because it's live in code:
**Act 1 has no word for the opponent, so nothing in Act 1 may name it.**
`src/ui/result.ts` — the outcome screen for a match that did *not* escalate —
reads `OPERATOR WINS`. Its own comment says it "says nothing about a twist,
in either direction," and it's right about the twist but the name is still a
leak: a first-time player whose match ends without escalating meets a proper
noun for the opponent having never seen the designation readout that
introduces it. In Act 1 the opponent is supposed to be furniture.

The case is narrow — after `hasSeenReveal` is set the player has already met
OPERATOR, so the unescalated path is only wrong on a *first* unescalated
match — but that's also the exact session the disguise has to survive. A
pre-escalation result screen should resolve on the score alone, which is
both the fix and the plainest, most Act-1-correct thing it could do. The
green/red verdict colouring is already carrying the outcome, so nothing is
lost by dropping the noun.

## The designation readout (Act 2 HUD)

The small corner readout `MOODBOARD.md` specifies ("a designation or
subject ID instead of a score") should read as a subject file tag, not a
name. Deliberately bureaucratic and cold, never dramatic — what sells the
misdirection is paperwork, not menace. This is the single detail doing the
most work, and it should stay boring-looking on purpose.

**Two fields, not two drafts of one field.** This document previously
offered `SUBJECT / 47-KAPPA` and `EVAL-ID: 8841-C` as interchangeable
examples, which would put two unexplained ID formats in one interface.
They're now distinct and both canon:

- `SUBJECT / 47-KAPPA` — **the player.** Persistent identity. Implies a
  file that existed before this session and will outlast it.
- `EVAL-ID: 8841-C` — **this match.** A session number. Implies this is one
  of many, which is doing quiet work: the instrument has been run before.

Two fields with different scopes is what real forms look like. One field
that changes format between screens is what placeholder text looks like,
and this readout only works if it looks real.

## The relabeled score language (Act 3 HUD)

Two sanctioned terms, and only two: **rallies become "response cycles,"**
and the score gains the label **"adaptation index."** Resist inventing a
term per scene — consistency here is the whole reason it reads as a real
interface instead of flavor text.

**`threat assessment` is retired.** `MOODBOARD.md` proposed it ("hits become
threat assessments, *or similar*") and `src/reveal/hud.ts` still ships
`THREAT ASSESSMENT: ACTIVE` in the Act 3 panel, which is how the project
ended up carrying three vocabularies for one idea.
Retiring it is a tone fix as much as a consistency fix: "threat" tells the
player they are a danger being evaluated, and the confirmed ending
explicitly disclaims that — the thing on the other side was never hostile,
it was interested. A term that promises menace makes the ending read as a
reversal the fiction has to walk back, instead of a scale correction
everything else already supported.

**The relabeling is label-only.** "Adaptation index" is a caption above the
same two digits, with the same green/red coding, in the same position. It is
not a different number, not a composite, not a percentage. This needs saying
because the previous phrasing ("the score becomes a running adaptation index
rather than a point count") reads as license to replace the score, and
that collides head-on with the one hard constraint this project has:
`MOODBOARD.md` requires score feedback to stay instantly legible under any
visual state. The Milestone 1 spike had this wrong — it rendered
`THREATS : scoreLeft + scoreRight`, a *sum* of both scores, from which it is
arithmetically impossible to tell who is winning. Milestone 4's HUD already
does the right thing (`ADAPTATION INDEX` as a label above unchanged digits);
this section exists so the spike version can't come back.

The rule, stated so it can't drift again: **Act 3 may rename anything and
may re-skin everything; it may not change what the score digits mean.**

## The watcher (Act 3's POV cut)

The jarring outside-the-court shot `MOODBOARD.md` specifies is, in-fiction,
a **fixed observation asset** — an unattended camera, always on, pointed at
the court. It keeps the register clinical and procedural right up to the
climax, so the disclosure lands as a genuine shift rather than being
telegraphed early by a jump-scare the fiction never earns. It fires exactly
once, mid-Act-3, and it is the only place chromatic aberration is used.

**Reconciling live vs. recorded.** The previous version called this "a feed
being reviewed after the fact" while the opponent section insists OPERATOR
is genuinely adapting to the player *right now*. Both can't be true of the
same watcher, and the contradiction is the same scale error the premise
section resolves: an institution would staff a live monitoring post; one
person cannot. So — **the camera is always recording; the person is present
sometimes.** They check in on their own project, informally, the way anyone
does. The interface has no way to indicate which is happening, and never
tries.

This is why the watcher cut has to feel like being *seen* rather than being
*watched* — one glance that might be live, with no way to tell. And it's
why the copy can't be in the past tense: `ARCHIVED` and `OBSERVATION
COMPLETE` imply the session already ended and is being replayed, which
accidentally reframes the entire game as a flashback. Present tense only.

## The recruitment that isn't

`MOODBOARD.md` titles Act 3 "The recruitment" and reserves amber
specifically for "recruitment beats." `NOTES.md` claims the framing "now has
a literal answer to 'recruited for what?'" It doesn't. Nobody is recruited,
nothing is offered, and no role is filled — the act ends with a personnel
file and a link. That's a promise the design makes in its own vocabulary and
then quietly doesn't pay, which is exactly the kind of gap that survives
into a build as a `YOU HAVE BEEN SELECTED` screen nobody meant to write.

Resolving it rather than renaming the act, because the word is load-bearing
in two documents and the fix is better than the deletion: **the recruitment
is inverted.** The Last Starfighter structure is "you passed, now you're
wanted." Here the test is real and the result is real, and then the thing on
the other side does something a recruiter never does — it discloses itself
first. It doesn't ask the player for anything. It hands over a name, a
history, a specialization list, and a way to make contact, and then stops.

That is the shape of an introduction, and — said plainly, since this
document is where the honest version belongs — it is also the shape of an
application. The developer has spent the whole game evaluating the player's
adaptation, and the payoff is the developer submitting *their* credentials
to *them*. The evaluator turns out to be the applicant. That's the joke the
played-straight register is protecting, and it only works if the interface
never once acknowledges it's a joke.

Practical consequences for anyone implementing Act 3:

- **Amber's "recruitment beats" are the approach, not an offer.** Amber
  escalates toward a disclosure. It never lands on a proposition.
- **No second-person copy, ever.** `YOU HAVE BEEN SELECTED`, `WELCOME`,
  `JOIN`, and every cousin of theirs are out. The moment the interface
  addresses the player it stops being an instrument and becomes a character,
  and the whole reveal is that a character was behind the instrument.
- **Nothing is asked of the player.** The link is available, not requested.
  A call-to-action framed as a call to action is a portfolio site; this is a
  game that happens to end in a dossier.

## The climax (resolved — this is no longer ambiguous)

The evaluation was never institutional. **OPERATOR was a stand-in for the
developer**, and the climax is the moment the system is "forced" to
disclose that — played straight, so the interface itself doesn't change
register (no fourth-wall wink, no copy-voice shift per the confirmed
Branch 1 tone), only its *content* does.

**When it fires — recorded here because no document said it.** The match
plays to its **natural first-to-N conclusion**, and the dossier resolves
**after the final point, regardless of who won.** This is what Milestone 4
built (`presentationState.ts` sets `climax` when an escalated match ends;
`main.ts` routes to the dossier or the plain result screen accordingly), but
`ROADMAP.md` M4 only ever said the climax "resolves into the dossier screen"
— never whether the reveal interrupts the match or waits for it. That
omission is the ending, and it was living in code comments instead of the
story bible. Waiting is right on three counts, and they're worth having
written down in case anyone is ever tempted to make it a cutscene:

- `MISSION.md`'s central thesis is Pong that stays "worth playing on its own
  terms." A story beat that cuts the match off mid-rally makes the game an
  interruption of itself, and retroactively tells the player the Pong was
  the waiting room.
- It keeps win and loss undifferentiated, which `BACKLOG.md` argues for on
  its own merits: a payoff gated on winning is an unlock, and a player who
  loses and gets nothing has been punished with the absence of the only
  thing the game was building toward.
- It means Act 3 has to occupy real gameplay time rather than being a
  cutscene wearing Act 3's clothes — the densified HUD, the orbital camera,
  and the watcher cut all have to survive being played *through*, which is a
  far more demanding and more interesting version of the act.

The pre-escalation result screen and the post-escalation disclosure are
therefore **the same moment in the match, in different acts** — two states
of one thing rather than two features. `main.ts` already treats them that
way; the reason to say so here is that they will drift the moment someone
adds copy to one and not the other.

The dossier that resolves out of the dense Act 3 HUD panel should read like
a decrypted personnel file, not a joke:

- Name
- Role / title
- Years active
- Core specializations
- Current focus
- One actionable link (LinkedIn/GitHub), framed diegetically as a
  "channel" or "signal" the system is opening — never a website-style
  button, per `MOODBOARD.md`'s Act 3 section.

All of the above traces to the bio in the `GadDev/GadDev` profile README,
not invented here or anywhere else. As of Milestone 4 the README is verified
and the strings live in `src/ui/dossier.ts` — a client-only build means the
payoff screen can't depend on a fetch. This document still deliberately
doesn't restate any of it: one place to change, and no chance of the story
bible and the shipped dossier describing two different people.

The score/rally relabeling ("adaptation index," "response cycles")
established earlier in this document survives right up to the dossier —
it's the thing being played straight, not something the climax needs to
undo. The climax replaces the *content* under that language, not the
language itself.

## The second playthrough (the fiction of `hasSeenReveal`)

`ROADMAP.md` M4 and `BACKLOG.md` both specify the mechanism — the flag is
set on first reveal, the escalation never fires again on that device, there
is no player-facing route back — and neither says what it *means*. It was
being treated as a distribution decision (the twist is discoverable once)
with a technical implementation, and nobody wrote the story reason. It has
an excellent one, and it should be on the record before someone implements
the mechanism sympathetically and ruins it:

**The evaluation is complete.** There is nothing left to measure. The
instrument has what it came for and doesn't wake up again. Every subsequent
session is Act 1 forever — dead-still camera, two cyan digits, an opponent
with no name — playing perfectly well and never once mentioning that it used
to be something else.

Read cold, that's the most unsettling beat in the game, and it costs nothing
to build because it *is* the absence of building. Read warm, it's the second
half of the same joke: you've been introduced, so there's no reason to be
introduced again.

The failure mode is sympathy. Any acknowledgement — a changed line, a
lingering fragment, a menu state, a "welcome back" — converts a quiet
absence into a wink, and spends a payoff that has already been collected.
`BACKLOG.md` and `MOODBOARD.md` both already forbid the interface having a
memory the player can go looking for. This is the reason that rule is worth
holding: **the silence is the last beat of the story, not the end of it.**

---

## Sample environmental fragments (for implementation reference)

These are illustrative copy examples for the writer/implementer (probably
also you) to match tone against — not a locked script. Keep every fragment
this short; anything longer than one line stops being a glimpse and starts
being exposition.

**Act 1:** nothing. No fragments exist for Act 1 — that's not an omission
to be filled in later, it's the act.

**Act 2 HUD flicker (single-frame, snaps back):**
- `SUBJECT / 47-KAPPA`
- `PATTERN VARIANCE: NOMINAL`
- `RECALIBRATING...`
- `OPERATOR` — first and only place the opponent is named before Act 3;
  set as a bare field label, never in a sentence.

**Act 3 relabeled HUD (persistent):**
- Score label: `ADAPTATION INDEX` — a caption above the unchanged `n : n`
  digits, green/red intact. Not a replacement number.
- Rally counter label: `RESPONSE CYCLE 14`
- Ambient corner tag (small, easy to miss): `EVAL-ID: 8841-C — ACTIVE`

**Act 3 audio-adjacent text (if a fragment coincides with the watcher cut):**
- `FEED 03 — RECORDING`
- `OBSERVATION ONGOING`

Present tense, per the watcher section: the earlier `FEED 3 — ARCHIVED` /
`OBSERVATION COMPLETE` pair put the session in the past and accidentally
implied the player was watching a replay of their own match.

**Climax transition line (immediately before the dossier resolves, still
in the clinical register — no tonal shift, per the confirmed played-straight
decision):**
- `EVALUATION COMPLETE — SOURCE DISCLOSURE FOLLOWS`

The past tense here is correct and is not an oversight against the
present-tense rule above: at this exact moment the evaluation genuinely *is*
complete, and it's the only line in the game entitled to say so.
