---
"mp-pong-2020": patch
---

Reconcile the story bible and align the specs that depended on it.

`LORE.md` gains a **scenario beat sheet** (the whole story in reading order,
including Act 3's three ordered beats) and a **canon glossary** (sanctioned
terms, ID fields, what is never on screen). Six inconsistencies resolved:
THE DIVISION demoted from a real in-fiction organization to a writers'-room
codename for the misdirection; Act 3's unpaid "recruitment" promise resolved
as an inversion; `threat assessment` retired in favour of `ADAPTATION INDEX`
/ `RESPONSE CYCLE`; the Act 3 relabeling constrained to label-only so it
can't drift back toward replacing the score; the watcher's live-vs-recorded
contradiction reconciled; and the escalation's in-fiction cost rebased off
points conceded.

Two things Milestone 4 settled in code but no document stated are now
written down: the match plays to its natural first-to-N conclusion with the
dossier resolving after the final point regardless of outcome, and the
in-fiction meaning of `hasSeenReveal` (the evaluation is complete, so the
instrument stays quiet — implement it as pure absence).

`MOODBOARD.md`, `ROADMAP.md`, `EXPLORATION.md`, `BACKLOG.md`, `NOTES.md` and
`CLAUDE.md` updated to match. No code changes; four canon/behaviour findings
against current code are logged in `CLAUDE.md`'s known-issues list.
