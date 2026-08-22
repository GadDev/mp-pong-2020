---
"mp-pong-2020": minor
---

Milestone 2: intro/menu/pause shell. Adds a DOM-overlay chrome layer (`src/ui/`) independent of the reveal spike underneath: a skippable intro beat (any key/click, or a few seconds of auto-advance), a main menu with New Game / Continue / Options, and a pause overlay (Resume / Restart / Quit to Menu) reachable via Esc. Continue is in-memory only — enabled once a match has started, never persisted to `localStorage`, and absent on a fresh load. Options exposes volume and a skip-intro toggle, both persisted via the new `src/persistence.ts`; there is no skip-to-Act-3 toggle, per the "discoverable once" reveal rule. Pausing now freezes the reveal timeline correctly: the act clock is driven by accumulated played-time rather than wall-clock time, so time spent paused or sitting in the menu no longer causes the reveal to jump ahead on resume.
