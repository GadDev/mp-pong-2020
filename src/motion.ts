/**
 * Milestone 5 accessibility flag (BACKLOG.md "Reduced-motion / photosensitivity
 * path"). This game is mechanically a pile of photosensitivity triggers —
 * single-frame HUD flicker, the Act 2 glitch beats, heavy bloom, and the Act 3
 * chromatic-aberration cut. Every one of those reads the flag below rather than
 * hand-checking `matchMedia` itself, so there is exactly one place to reason
 * about what "reduced" means.
 *
 * Live, not read-once-at-boot: the OS-level setting can be toggled while the
 * tab is open, and a player who turns it on mid-reveal is precisely the player
 * who needs it to take effect immediately.
 *
 * Reduced mode damps; it does not delete. The reveal still happens, the acts
 * still change, the watcher still cuts in — what goes away is the strobing,
 * the sway, and the continuous orbital drift. Removing the beats outright
 * would make the accessible path a different (worse) game rather than the
 * same game without the flashing.
 */

const QUERY = "(prefers-reduced-motion: reduce)";

// `matchMedia` is guaranteed in every browser this project targets; the guard
// exists so that a non-DOM context (a Vitest unit test importing a pure
// function from a module that transitively pulls this in) doesn't throw.
const mediaQuery =
  typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia(QUERY)
    : null;

let reduced = mediaQuery?.matches ?? false;

mediaQuery?.addEventListener("change", (event) => {
  reduced = event.matches;
});

/**
 * True when the player has asked the OS for reduced motion.
 *
 * Polled per frame by the render loop rather than pushed through
 * subscriptions. That keeps the flag live with no wiring, at the cost of one
 * sharp edge: toggling the setting mid-Act-3 snaps the camera from wherever
 * the orbit had drifted to its held angle. That snap is accepted rather than
 * eased — it happens only on a deliberate OS-level change, and easing it
 * would mean animating a transition *into* the state the player just asked
 * for less animation in.
 */
export function prefersReducedMotion(): boolean {
  return reduced;
}

/**
 * Scales a motion amplitude to zero under reduced motion. Use for sway, drift,
 * and shake — anything where the honest reduced-motion answer is "hold still."
 */
export function motionScale(amount: number): number {
  return reduced ? 0 : amount;
}
