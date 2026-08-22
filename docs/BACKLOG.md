# BACKLOG — post-ship features, improvements, and things deliberately not done

## Read this first

**Nothing in this document is committed scope, and nothing in it should be
started before `ROADMAP.md` Milestone 6 (deploy) is done.**

That's not boilerplate hedging — it's the actual point of the file. As of
writing, this project has zero lines of implementation code. A features
backlog for an unbuilt project is the most reliable way I know to never
ship it: every item in here is more fun to think about than finishing
Milestone 3, and if this doc starts competing with the roadmap for
attention, it has actively made the project worse.

The most useful section here is probably not the feature list. It's
**"Rejected, with reasoning"** at the bottom — the record of decisions
already made and why, so they don't get re-litigated in six months by a
version of me who's forgotten the trade-off and just thinks ECS sounds
mature.

Named `BACKLOG.md` rather than `FEATURES.md` or `IDEAS.md` on purpose. A
backlog is a queue you pull from when the committed work is done; a
features doc invites wishlisting.

---

## Not backlog — promote these into `ROADMAP.md` instead

Three items surfaced while writing this that I'd be wrong to defer. These
aren't future improvements, they're gaps in the current plan. **Recommend
folding them into the existing milestones rather than leaving them here.**

### Reduced-motion / photosensitivity path → Milestone 5
This game is, mechanically, a pile of things that trigger photosensitive
reactions: single-frame HUD flicker (`MOODBOARD.md` Act 2), strobing
glitch beats, heavy bloom, and a chromatic-aberration cut in Act 3. A
`prefers-reduced-motion` code path that damps the flicker, removes the
strobe, and holds the camera steadier isn't a courtesy feature to add if
there's time — it's the difference between a portfolio piece and a
portfolio piece that hurt someone who opened it. Cheap to build if
designed in during M5 (one media-query-driven flag the presentation layer
respects), expensive to retrofit after every effect is hand-tuned.

### Delta-time-based physics → Milestone 3
The 2020 original ran on `setInterval(..., 1000/30)`. If the rebuild
hand-rolls its loop the same way, ball and paddle speed become a function
of display refresh rate — the game plays measurably differently on a
120Hz laptop than a 60Hz monitor. This is a correctness bug, not polish,
and it's much cheaper to write correctly once in M3 than to unpick after
the reveal's pacing has been tuned against wrong-speed gameplay.

### Dev-only reveal re-trigger → Milestone 4
`hasSeenReveal` permanently disarms the escalation trigger (confirmed:
discoverable once, no repeat trigger). The consequence, stated plainly:
**after one playthrough on a device, there is no way to ever see the
reveal again on it.** That makes a debug re-trigger — a `?debug=reveal`
URL flag, or a key combo, explicitly not surfaced in any player-facing
menu — required scope for M4, not a nice-to-have. Without it you cannot
demo the payoff of your own project in a portfolio walkthrough without
clearing site data first.

---

## Tier 1 — worth doing soon after ship

**Touch / mobile input.** Paddle follows touch-drag instead of mouse Y.
Mechanically trivial. The real question isn't input, it's whether the
budgeted `EffectComposer` stack (bloom + one stylistic pass) holds a
playable frame rate on a mid-range phone GPU at all — if it doesn't, this
turns into "ship a reduced-effects mobile path," which is a genuinely
larger piece of work. **Measure before scoping.** Don't promise mobile
support in the README until a real device has run it.

**Keyboard input as a mouse alternative.** Up/down arrows or W/S with
sensible acceleration. Matters more than it sounds: mouse-Y paddle control
feels bad on a trackpad, which is how a meaningful share of anyone you
send this link to will first try it. Small effort, disproportionate effect
on first impressions.

**Score/impact juice.** Ball trail, brief paddle-flex or squash on
contact, a short camera kick on a score. The one hard constraint:
`MOODBOARD.md` reserves green/red exclusively for score feedback and
Act 1's camera is specified as dead-still — so any camera kick has to be
an Act 2/3 affordance, or it undermines the "stillness makes later
movement feel like a violation" premise the whole reveal rests on.

**Produced ambient pad replacing placeholder audio.** M5 ships with
whatever bed exists; a properly produced Vangelis-adjacent pad (sourced or
made) is a real quality jump for a project whose Act 3 leans on audio
arriving ahead of the visuals. Deferred because it's an asset-production
task with no code risk — exactly the kind of thing that shouldn't block a
deploy.

## Tier 2 — plausible, needs a design decision first

**Epilogue beat after the dossier.** `LORE.md` already parks this as a
note-for-later: a single additional fragment after the disclosure implying
what happens next. The reason it's not scoped is that the played-straight
tone makes it very easy to overreach here — one line too many and the
clinical register collapses into sentimentality, which is the failure mode
this tone was chosen to avoid. If it happens, it's one line, and it stays
in the same voice as everything before it.

**Win/loss differentiation at the climax.** Currently the dossier is the
climax regardless of match outcome. Arguably correct (the evaluation
completing is the point, not who won), but it's worth a deliberate
decision rather than an accident of implementation. My instinct: leave it
undifferentiated — making the reveal a *reward for winning* turns it into
an unlock, and a player who loses and gets nothing has been punished with
absence of the only thing the game was building toward.

**Trigger-point tuning as a first-class task.** `ROADMAP.md` M4 says the
escalation fires on "rally count or score threshold, whichever tests
better." That's an honest deferral, but it means the single most
pacing-sensitive number in the project is currently unspecified. Post-ship,
this is worth actually A/B-feeling rather than leaving at whatever value
shipped.

## Tier 3 — speculative, probably never

**Multiple arenas / visual variants.** Doesn't serve the twist. A second
arena is content that dilutes a single well-paced 15-minute experience into
a shallower longer one.

**Any form of score persistence or leaderboard.** Requires a backend,
contradicts `TECHSTACK.md`'s client-only stance, and — more importantly —
a high-score table reframes the game as a skill challenge, which is not
what it is.

---

## Features that would break the fiction

Worth recording separately from "rejected for scope," because these are
the ones most likely to look like obvious wins to a future me who's
forgotten *why* the design holds together.

**Local two-player (shared keyboard).** The most obviously-requested Pong
feature there is, and it's structurally incompatible with this project.
OPERATOR cannot be a stand-in for the developer if player 2 is a human
sitting next to you — the entire reveal depends on the right paddle having
been an unknown the whole time. Adding hot-seat multiplayer doesn't just
fail to serve the twist; it makes the twist impossible to deliver in that
mode, which means shipping a mode where the game's whole point is absent.

**A difficulty slider (Easy / Normal / Hard).** Subtler version of the
same problem. OPERATOR's 2-3 behavior tiers are *diegetic* — in-fiction
it's recalibrating against your play, which is the mechanical honesty that
makes the eventual "this was a person adjusting to you" land. A settings
menu that exposes those tiers as a preference retroactively reframes them
as a config value, and the reveal loses the one piece of mechanical
evidence backing it up. If difficulty accommodation is genuinely needed,
do it invisibly (widen OPERATOR's error margin based on observed player
performance) rather than as a menu the player sets themselves.

**Anything in the menu that acknowledges the reveal exists.** Already
decided in `MOODBOARD.md`, restated here because it's the kind of thing
that erodes: no "you've seen the twist" state, no unlock indicator, no
achievement. The interface having no memory a player can go looking for
*is* the design.

---

## Rejected, with reasoning preserved

Do not re-open these without a specific new reason. The reasoning is
recorded so the decision doesn't have to be re-derived from scratch.

**ECS (bitECS / miniplex).** Rejected in the architecture branch. ECS
earns its keep when entity/component composition explodes
combinatorially; this project has a ball, two paddles, and three act
state machines. That's an organization problem, not a composition
problem, and organization is free if the three-module boundary in
`TECHSTACK.md` is respected. Revisit only if a concrete feature causes
real update-order bugs — "feels inelegant" is not the trigger.

**A game framework / batteries-included abstraction layer.** Same branch.
The separation it would enforce is correct and necessary; getting that
separation via three disciplined modules costs a fraction of the setup
and requires learning no one else's API.

**Tone.js for audio.** Rejected in favour of Howler. The requirement is
playback and mixing, not synthesis. Revisit only if the ambient pad
becomes something generated live in-browser rather than a produced file.

**In-canvas menu UI (Three.js text geometry, raycast buttons).** Rejected
in favour of a DOM overlay. No menu screen in this game needs to exist in
3D space; the browser already does text layout and hit-testing for free.

**A codex / unlockable logs system.** Rejected when story depth was
settled as environmental-only. It would add both a writing surface and a
new UI surface (list view, unlock tracking, persistence) to a project
whose narrative works precisely because it's delivered through channels
that already exist. Also now in direct tension with discoverable-once: a
codex is a place to go *re-read* the reveal.

**A "weekly boss fight" / daily-practice replay loop.** Carried as an
open question in `NOTES.md`, resolving it here as **no**. It was always a
poor fit — this is a single-sitting narrative experience, not a practice
system — and the discoverable-once decision makes it incoherent: a
recurring loop needs something to recur, and the twist explicitly does
not.

**Chromatic aberration as an always-on effect.** Reserved for the Act 3
watcher cut only. A permanently-on aberration filter stops being noticed
within thirty seconds, which spends GPU budget to achieve nothing; its
value is entirely in being rare.

---

## Open items that need an answer during the build, not after

Not features — unresolved specification. Flagging so they don't quietly
become defaults chosen by whoever implements them first.

1. **`GadDev/GadDev` is load-bearing and unverified.** `MISSION.md`,
   `LORE.md`, `MOODBOARD.md`, and `ROADMAP.md` M4 all cite that profile
   README as the single source of truth for the dossier content — i.e. the
   actual payoff of the project. Nobody has confirmed in-session that the
   repo exists or what's in it (`gh` was unauthenticated at time of
   writing). The one-source-of-truth design is right; it just needs to
   point at something real. **Verify before M4.** Do not inline the bio
   into these docs — that recreates the drift problem the citation exists
   to prevent.
2. ~~**"Continue" on the main menu is still undefined.**~~ **Resolved:**
   same-page-session resume only, no persisted mid-match state.
   `ROADMAP.md` M2 now states this explicitly.
3. ~~**`NOTES.md` contradicts confirmed decisions.**~~ **Resolved:**
   `NOTES.md` now carries a status header marking superseded entries and
   pointing at the current sources of truth, while keeping the reasoning
   trail (including the rejected "funny wink" tone) intact as history.
