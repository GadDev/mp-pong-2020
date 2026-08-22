# MISSION

## The pitch

This is Pong. It looks like Pong, it plays like Pong, and for the first
stretch of your session, it *is* Pong — a clean, geometric two-paddle duel
on a glowing grid, rendered the way you'd have drawn it if you were pitching
"Tron: The Arcade Game" in 1982.

It does not stay that way.

That's the whole project, in one sentence: **a familiar game that quietly
stops being what you thought it was, and makes you feel the moment it
happens rather than telling you about it.**

I'm not going to spoil the shape of the reveal here — if you're reading this
as a curious visitor to the repo rather than as me, the fun is in not
knowing exactly when the camera lies to you, or why the score display
starts asking a different question than "who's winning." What I will say is
that the twist isn't a coat of paint bolted onto a normal Pong loop after
the fact. It's built to be the single riskiest, most deliberately-engineered
part of the whole project — everything else here, the physics, the paddle
feel, the visuals, exists in service of making that one moment land.

## Why this exists

The original `mp-pong-2020` was a 2020 vanilla-JS weekend build — no
framework, no build step, functional and forgettable. This rebuild isn't
about making that old code prettier. It's about answering a question I
actually care about as a designer: **can a two-input, one-ball, first-to-N
game — the simplest possible game loop there is — carry a real narrative
beat without the mechanic getting in the way of it, or the narrative
becoming an excuse to stop making a good game?**

Most "arcade reskin with a twist" projects pick one lane: either the
mechanic stays untouched and the narrative is pure garnish, or the twist
gets so mechanically ambitious that it stops being recognizably Pong at
all. I want the version that respects both halves — Pong that's still worth
playing on its own terms, wearing a reveal that actually re-contextualizes
what you were doing, not just what it looked like.

## Visual and tonal references

Three films, each doing a different job, deployed in sequence rather than
blended into one muddy aesthetic:

- **Tron (1982)** owns the game's *baseline reality* — the clean geometric
  grid-world the player first understands the game to be. Cyan-and-void,
  wireframe, architectural, still.
- **The Last Starfighter (1984)** owns the *structure of the reveal* — the
  exact narrative device of a game that was never just a game, recontextualized
  the moment you're good enough for it to matter.
- **Blade Runner (1982)** owns the *emotional register the reveal builds
  through* — cold, clinical, faintly threatening, right up until it isn't.
  Fog, neon, a synth pad that arrives ahead of the visuals and tells you
  something's wrong before your eyes confirm it. The climax doesn't
  abandon that register so much as let something unexpectedly human show
  up inside it — the interface stays exactly as clinical as it's always
  been; what it's disclosing is the surprise, not a change in how it talks.

The palette, camera language, and HUD behavior across these three acts are
specified in full in `MOODBOARD.md` — this pitch deliberately doesn't
restate it. Short version: cyan/blue reads as "the world as you first
understand it"; magenta/violet/amber is the world underneath, surfacing
gradually; green and red are reserved exclusively for score feedback and
never reused anywhere else, so a player mid-rally can always read who's
winning at a glance no matter how far the surrounding scene has mutated.
Readability over spectacle, the whole way through — spectacle is what the
reveal spends, not what every frame is drenched in.

## Why it matters to me

I don't need another neon Pong clone in the world, and neither does anyone
else — there are dozens. What I want to prove to myself is narrower and
more personal: that I can take the smallest possible game system, add
exactly one well-engineered idea to it, and make that idea feel inevitable
in hindsight rather than tacked on. That's a design discipline, not an art
direction, and this project is the rep.

It's also, quietly, more personal than a straight tech demo — there's a
twist in the final act that's about who actually built this, not just what
it turned out to be. I won't say more than that here. If you get there,
you'll know.
