# Visual moodboard — Pong reboot

## Color palette

**Tron — the grid** (used for the arena floor, wireframe geometry, the "known world")
- `#0A0E14` — void black, the base of everything
- `#00F0FF` — cyan grid lines, paddle edges, primary "system" glow
- `#0057FF` — deep blue, secondary structural lines, shadows within the grid
- `#E8FBFF` — near-white, used sparingly for the ball's core and UI hairlines

**Blade Runner — the neon** (used for atmosphere, fog, and anything "off-grid" — i.e. moments the twist bleeds through)
- `#1A1220` — smog-purple black, replaces void black once the twist starts intruding
- `#FF3D7A` — magenta neon, opponent's signature color once it's revealed as a character, not a wall
- `#FFB020` — amber, warning states and "recruitment" beats
- `#7A4FE0` — violet, ambient fog/backlight, never used on gameplay-critical elements (reserved for atmosphere only, so it never competes with things the player needs to read)

**Shared — void and signal** (functional colors, meaning-coded, used sparingly across both halves)
- `#000000` — true black, background only, never a UI element
- `#C8C8C8` — neutral gray, default HUD text
- `#00FFA0` — signal green, reserved exclusively for "you scored" / positive feedback
- `#FF2D2D` — alert red, reserved exclusively for "you were scored on" / danger states

**Rule of thumb:** cyan/blue = the world as the player first understands it. Magenta/violet/amber = the world underneath, revealed gradually. Green/red are the only colors used for score feedback — never reused elsewhere, so they stay instantly readable at a glance (readability over spectacle, per the brief).

---

## Camera language

Three camera modes, one per act of the twist:

**Act 1 — "Just Pong" (low, wide, Tron-style)**
- Slightly elevated, near-horizontal angle looking down the length of the court — the classic Tron light-cycle-arena shot, not a top-down retro-Pong view.
- Fixed, static. No drift, no shake. The stillness is what makes later camera changes feel like a violation.
- Subtle depth-of-field falloff toward the horizon line, where the grid fades to black — implies a much larger space than the playable court, without spending budget rendering it.

**Act 2 — "Something's wrong" (the reveal begins)**
- Camera very slowly starts to pull back and rise, almost imperceptibly at first — by the time the player consciously notices, the court has revealed it's sitting inside a much larger structure (a la the twist in *The Last Starfighter*, where the "cabinet" was never a cabinet).
- Introduce a subtle handheld-style micro-drift (a few pixels of sway, not shake) — the first hint that a camera operator/observer exists, not just a fixed rig.

**Act 3 — "The recruitment" (Blade Runner-style)**
- Camera can break from the fixed axis entirely for the first time — slow orbital drift around the court, volumetric fog rolling through the grid lines, rain-slicked reflections on the floor plane.
- Occasional cut to a "watcher" POV — a brief, deliberately jarring shot from outside the court looking in, implying the player was being observed the whole time.

**Technical note for implementation:** all three modes should share one `PerspectiveCamera` instance with animated `position`/`lookAt` targets rather than swapping cameras — keeps transitions smooth and avoids the jump-cut feeling except where Act 3's "watcher" cut is deliberately jarring.

---

## HUD language

The HUD itself should carry the twist — it's not just an overlay, it's a diegetic object that degrades/evolves.

**Act 1 HUD — clean and minimal**
- Typeface: a monospace or geometric sans (mimicking early terminal/arcade fonts — think the Tron identity disc's UI, not a modern game HUD).
- Score display: simple cyan digits, thin 1px underline, positioned top-center. No panels, no borders — just floating text, like a heads-up projection.
- No player name, no menu chrome. Deliberately sparse, so its later corruption reads as a real change rather than "more UI appearing."

**Act 2 HUD — glitching, questioning**
- Occasional single-frame flicker where the score digits are briefly replaced by unfamiliar symbols (implying a different, older, or non-human counting system underneath) before snapping back.
- A faint secondary readout appears in a corner — small, easy to miss on a first playthrough — showing something like a designation or subject ID instead of a score. This is the "recruitment test" paperwork peeking through.

**Act 3 HUD — the reveal, fully surfaced**
- The clean cyan HUD is replaced by a denser, amber/magenta interface — more
  panels, more information, styled after a cockpit/targeting HUD (Last
  Starfighter) crossed with a corporate surveillance readout (Blade Runner's
  Voight-Kampff aesthetic: sparse, clinical, faintly threatening) — right up
  until it isn't threatening at all.
- Score language can still shift ("hits" become "threat assessments," or
  similar) as an early Act 3 beat, before the actual reveal — this keeps the
  cold, clinical tone intact for a moment so the eventual warmth of the real
  reveal lands as a genuine tonal shift, not just more of the same.
- **The actual climax**: the "system" is forced to disclose its own
  identity. The dense HUD panel resolves into something that reads like a
  decrypted personnel file or an ID-disc profile — not a joke, an accurate
  one — showing name, role/title, years active, core specializations, and
  current focus, pulled from the same bio already established in the
  `GadDev/GadDev` profile README so the game and the portfolio agree with
  each other.
- The dossier can include a single actionable link (LinkedIn/GitHub) styled
  as part of the interface rather than a website-style button — e.g. framed
  as a "signal" or "channel" the system is now opening, so it never breaks
  the diegetic HUD language even at the very end.
- **Confirmed: played straight.** The panel's copy voice stays exactly as
  clinical as it's been throughout Acts 1-3 — no fourth-wall wink, no
  tonal shift in how the interface talks. The surprise is entirely in
  *what* the clinical interface is disclosing, not in it suddenly
  changing register to comment on the disclosure.

**Constant across all acts:** score feedback stays green/red (`#00FFA0` / `#FF2D2D`) no matter how much the surrounding HUD mutates — this is the one thing that must remain legible under any visual state, since a player mid-rally still needs instant, unambiguous feedback on who's winning.

---

## Typography

- **Primary UI font:** a geometric or monospace sans with a slight technical/military feel (e.g. something in the spirit of Eurostile Bold Extended for Act 1/headers, or a monospace like Space Mono for readouts) — avoid anything rounded or friendly.
- **Never use a "sci-fi" display font for body/score text** — display fonts (the kind with exaggerated angles or circuit-board serifs) read as costume-y at small sizes and hurt legibility exactly where legibility matters most. Reserve any stylized lettering for a title screen only.

---

## Menu & intro screens

The menu chrome (title screen, pause overlay, options) is not a separate
visual language — it's built entirely from the **Act 1 palette and
typography**, deliberately, because the menu is the first thing a player
sees and it needs to sell "clean, minimal, unremarkable Tron-adjacent
interface" before the game itself even starts making that promise. If the
menu looked more elaborate than Act 1's in-game HUD, it would undercut the
"this is deliberately plain so the later corruption reads as real" premise
this document already establishes for the HUD.

- **Title screen:** void black background, faint static cyan grid (no
  animation beyond perhaps a very slow, barely-perceptible line-scroll —
  stillness is the point, same as Act 1's camera). Title treatment is the
  one place a stylized display font is permitted (per the Typography
  section's "reserve stylized lettering for a title screen only" rule).
  Menu options below in the same monospace/geometric sans as in-game HUD
  text, cyan on black, thin 1px underline on the focused item — no boxes,
  no panels, consistent with Act 1's "no chrome" HUD philosophy.
- **Pause overlay:** the game scene stays visible but dimmed (a
  semi-transparent void-black scrim, not a full cut to a separate screen),
  with the same cyan monospace menu text centered. This keeps the pause
  state feeling like "the world paused," not "you left the game."
- **Options screen:** identical visual language to the title screen. Just
  volume and a skip-intro toggle — nothing here references the reveal in
  any way. Per the confirmed "discoverable once, no repeat trigger"
  decision, the menu never acknowledges that a twist happened at all,
  before or after a player has seen it; it stays exactly as sparse either
  way, which is itself the correct, unsettling-in-hindsight choice — the
  interface has no memory a player can consciously go looking for.
- **Intro beat:** a few seconds of void black with a small, static logo/
  title mark fading in — no camera movement, no grid yet, nothing that
  telegraphs Act 1's arena before the player has actually started. Skip
  prompt (`PRESS ANY KEY TO SKIP` or equivalent, small, corner-anchored,
  same neutral gray `#C8C8C8` as default HUD text) appears after a beat,
  not instantly, so it doesn't read as impatient design nagging the player
  before the logo's even registered.

## Audio-visual texture notes (for later polish pass)

- Act 1: clean synth blips for paddle/wall hits — think early 80s arcade, not full synthwave yet.
- Act 2: introduce subtle audio degradation — a few hits get a faint pitch-bend or digital stutter, mirroring the HUD glitches visually.
- Act 3: full ambient pad layer underneath gameplay (Vangelis-adjacent, slow attack, low in the mix so it never masks gameplay audio cues) — this is where the Blade Runner mood fully arrives, audio leading slightly ahead of the visual reveal.