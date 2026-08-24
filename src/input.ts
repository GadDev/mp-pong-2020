/**
 * Keyboard input for the player paddle, kept separate from `gameState.ts` so
 * paddle physics never has to know how its target position was produced —
 * mouse (`main.ts`'s `mousemove` → `courtXFromPointer`), keyboard (this
 * module's `axis()`), or, later, a gamepad reporting through the same
 * `axis()` shape without any paddle-movement code changing.
 *
 * Held-key state, not per-event polling: `keydown`/`keyup` only add/remove
 * from a set, so two keys physically held at once (e.g. releasing S a frame
 * after pressing W) resolve correctly instead of one event's edge clobbering
 * the other's.
 */

const UP_KEYS = new Set(["w", "W", "ArrowUp"]);
const DOWN_KEYS = new Set(["s", "S", "ArrowDown"]);

export class InputController {
  private held = new Set<string>();

  /** `isActive` gates both key capture and `preventDefault` — no scroll-jack on the menu/dossier/etc. */
  constructor(private readonly isActive: () => boolean) {
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    // Losing focus (alt-tab, devtools, ...) must drop held keys — the
    // corresponding `keyup` never arrives, and without this a paddle would
    // drift forever on whatever was held at the moment focus left.
    window.addEventListener("blur", this.clear);
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isActive()) return;
    if (UP_KEYS.has(event.key) || DOWN_KEYS.has(event.key)) {
      // Only the paddle-move keys are hijacked; nothing else on the page loses default behaviour.
      event.preventDefault();
      this.held.add(event.key);
    }
  };

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    this.held.delete(event.key);
  };

  private readonly clear = (): void => {
    this.held.clear();
  };

  /** -1 / 0 / 1. Opposite keys held together cancel out rather than picking one. */
  axis(): -1 | 0 | 1 {
    const up = [...UP_KEYS].some((key) => this.held.has(key));
    const down = [...DOWN_KEYS].some((key) => this.held.has(key));
    if (up === down) return 0;
    return up ? -1 : 1;
  }

  dispose(): void {
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.clear);
  }
}
