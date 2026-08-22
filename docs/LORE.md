# LORE — internal story bible

This document is **not player-facing**. Nothing here gets dumped on-screen
as exposition, ever — that would be the exact mistake I flagged in Branch 1
against pure Blade-Runner-as-flavor-text: lore only has value if the player
pieces it together from fragments, not if it's handed to them. This exists
so that every HUD glitch, designation string, relabeled score term, and
audio stinger comes from one consistent underlying fiction instead of each
being invented independently and never quite agreeing with each other.

**Revision note:** this document originally treated the pre-reveal
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

## The premise (what the player doesn't know)

What looks like a cabinet-style Pong game is a **field evaluation
instrument**, disguised as recreational hardware and seeded into public
spaces by an organization referred to internally only as **THE DIVISION**
(no expansion of the acronym is ever given on-screen — it's a designation,
not a plot point that needs unpacking, in keeping with Blade Runner's
preference for institutions that are felt rather than explained).

The "game" measures a specific trait: **pattern-adaptation under
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

## The derezz / degradation (bridges Branch 1 Option A into the hybrid)

Each point lost isn't scored as failure in-fiction — it's the test
**consuming processing overhead to keep the illusion running** as it
reads deeper into the subject. Visually this shows up exactly where
`MOODBOARD.md` already puts it: Act 2's single-frame HUD flicker (briefly
showing an unfamiliar, non-human counting system before "snapping back")
is the evaluation's real interface leaking through the game-shaped one for
a frame at a time. This gives Option A's derezz mechanic honest narrative
grounding instead of being stakes for stakes' sake — it's the test's mask
slipping, not damage for its own sake.

## The opponent (Act 1-2: "OPERATOR," a function — Act 3 climax: a person)

Internally designated **OPERATOR** through Acts 1 and 2 — flat,
bureaucratic, deliberately giving away nothing (this naming was chosen
specifically because a played-straight slow burn needs zero early tells;
see the Branch 1 naming discussion). No face, no backstory teased before
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

## The designation readout (Act 2 HUD)

The small corner readout `MOODBOARD.md` specifies ("a designation or
subject ID instead of a score") should read as a subject file tag, not a
name — something in the shape of `SUBJECT / 47-KAPPA` or `EVAL-ID: 8841-C`.
Deliberately bureaucratic and cold, never dramatic — the horror of THE
DIVISION is that it's paperwork, not menace. This is the single detail
doing the most work to sell "you are being processed by an institution,"
and it should stay boring-looking on purpose.

## The relabeled score language (Act 3 HUD)

Per `MOODBOARD.md`: "hits" become "threat assessments" or similar, without
touching the underlying mechanic. Canonical in-fiction term to standardize
on: **rallies become "response cycles,"** and the score becomes a running
**"adaptation index"** rather than a point count. This is the single
sanctioned relabeling — resist the urge to invent a different term per
scene, since consistency here is what makes it read as a real interface
rather than random flavor text.

## The watcher (Act 3's POV cut)

The jarring outside-the-court shot `MOODBOARD.md` specifies is, in-fiction,
a fixed observation asset — not a person watching in real time, but a
recording device whose feed is being reviewed after the fact. This still
matters for played-straight tone even post-retcon: it keeps the register
clinical and procedural right up to the climax, so the reveal that it was
one person, informally checking in on their own project, lands as a real
tonal shift rather than being telegraphed early by a jump-scare beat the
fiction never earns.

## The climax (resolved — this is no longer ambiguous)

The evaluation was never institutional. **OPERATOR was a stand-in for the
developer**, and the climax is the moment the system is "forced" to
disclose that — played straight, so the interface itself doesn't change
register (no fourth-wall wink, no copy-voice shift per the confirmed
Branch 1 tone), only its *content* does. The dossier that resolves out of
the dense Act 3 HUD panel should read like a decrypted personnel file, not
a joke:

- Name
- Role / title
- Years active
- Core specializations
- Current focus
- One actionable link (LinkedIn/GitHub), framed diegetically as a
  "channel" or "signal" the system is opening — never a website-style
  button, per `MOODBOARD.md`'s Act 3 section.

All of the above must be pulled from the same bio material already
established in the `GadDev/GadDev` profile README, not invented here or
anywhere else — this document intentionally doesn't restate that content,
so there is exactly one source of truth for it and the game can't drift
out of sync with the public profile over time.

The score/rally relabeling ("adaptation index," "response cycles")
established earlier in this document survives right up to the dossier —
it's the thing being played straight, not something the climax needs to
undo. The climax replaces the *content* under that language, not the
language itself.

---

## Sample environmental fragments (for implementation reference)

These are illustrative copy examples for the writer/implementer (probably
also you) to match tone against — not a locked script. Keep every fragment
this short; anything longer than one line stops being a glimpse and starts
being exposition.

**Act 2 HUD flicker (single-frame, snaps back):**
- `SUBJECT / 47-KAPPA`
- `PATTERN VARIANCE: NOMINAL`
- `RECALIBRATING...`

**Act 3 relabeled HUD (persistent):**
- Score label: `ADAPTATION INDEX`
- Rally counter label: `RESPONSE CYCLE 14`
- Ambient corner tag (small, easy to miss): `EVAL-ID: 8841-C — ACTIVE`

**Act 3 audio-adjacent text (if a fragment coincides with the watcher cut):**
- `FEED 3 — ARCHIVED`
- `OBSERVATION COMPLETE`

**Climax transition line (immediately before the dossier resolves, still
in the clinical register — no tonal shift, per the confirmed played-straight
decision):**
- `EVALUATION COMPLETE — SOURCE DISCLOSURE FOLLOWS`
