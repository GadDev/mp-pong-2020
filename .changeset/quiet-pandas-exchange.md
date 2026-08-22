---
"mp-pong-2020": patch
---

Trial `EXCHANGE` as the on-screen game title. The intro and main-menu title
marks and the document/`og:title` now read `EXCHANGE` instead of `PONG`/`MP
Pong`, sourced from a single `GAME_TITLE` constant in `src/ui/title.ts`. The
shared title mark also gets a clamped font size so a longer word no longer
overflows a narrow viewport. The repo name, README, and package description
are unchanged — the title is still an open question in `docs/EXPLORATION.md`.
