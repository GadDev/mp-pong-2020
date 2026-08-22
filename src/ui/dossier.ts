import "./theme.css";
import "./dossier.css";

/**
 * The dossier content. **Single source of truth is the `GadDev/GadDev` profile
 * README** — verified present at the time of writing and transcribed here
 * because TECHSTACK.md commits to a client-only build, so the payoff screen of
 * the whole project must not depend on a network fetch succeeding. If the
 * profile README changes, this constant is what needs updating; nothing in
 * `docs/` restates it, deliberately, so there is exactly one place to change.
 */
const DOSSIER = {
  name: "ALEXANDRE GADAIX",
  role: "Senior Frontend Engineer · Frontend Architect",
  yearsActive: "2014 — PRESENT (12+ YEARS)",
  specializations: [
    "REACT / TYPESCRIPT / NEXT.JS",
    "ENTERPRISE-SCALE FRONTEND ARCHITECTURE",
    "ACCESSIBILITY & PERFORMANCE",
  ],
  currentFocus:
    "FULL-STACK EXPANSION (PYTHON, JAVA) · LLM, AGENTIC & GENERATIVE AI INTEGRATION",
  channelLabel: "CHANNEL OPEN — DIRECT",
  channelHref: "https://www.linkedin.com/in/alexandre-gadaix-a7792947/",
  channelText: "LINKEDIN / ALEXANDRE-GADAIX",
} as const;

/** LORE.md's climax transition line, verbatim. Still in the clinical register. */
const TRANSITION_LINE = "EVALUATION COMPLETE — SOURCE DISCLOSURE FOLLOWS";
const TRANSITION_HOLD_MS = 2200;

export interface DossierOptions {
  onDismiss: () => void;
}

function row(label: string, value: string): HTMLElement {
  const element = document.createElement("div");
  element.className = "dossier__row";

  const key = document.createElement("span");
  key.className = "dossier__key";
  key.textContent = label;

  const val = document.createElement("span");
  val.className = "dossier__value";
  val.textContent = value;

  element.append(key, val);
  return element;
}

/**
 * The climax. LORE.md and MOODBOARD.md both require this to be **played
 * straight**: the interface's copy voice stays exactly as clinical as it has
 * been through Acts 1-3, with no fourth-wall wink and no tonal shift. The
 * surprise is entirely in *what* is being disclosed. The link is framed as a
 * channel the system is opening, never as a website-style button.
 *
 * Shown regardless of who won — BACKLOG.md: gating it on a win would turn the
 * reveal into an unlock and punish a losing player with the absence of the
 * only thing the game was building toward.
 */
export function createDossierScreen({ onDismiss }: DossierOptions): HTMLElement {
  const root = document.createElement("div");
  root.className = "screen screen--dossier";

  const transition = document.createElement("div");
  transition.className = "dossier__transition";
  transition.textContent = TRANSITION_LINE;
  root.appendChild(transition);

  const panel = document.createElement("div");
  panel.className = "dossier";

  const heading = document.createElement("div");
  heading.className = "dossier__heading";
  heading.textContent = "SOURCE RECORD — DECRYPTED";

  const name = document.createElement("div");
  name.className = "dossier__name";
  name.textContent = DOSSIER.name;

  const specializations = document.createElement("div");
  specializations.className = "dossier__row";
  const specKey = document.createElement("span");
  specKey.className = "dossier__key";
  specKey.textContent = "SPECIALIZATIONS";
  const specList = document.createElement("span");
  specList.className = "dossier__value";
  specList.textContent = DOSSIER.specializations.join("\n");
  specializations.append(specKey, specList);

  const channel = document.createElement("a");
  channel.className = "dossier__channel";
  channel.href = DOSSIER.channelHref;
  channel.target = "_blank";
  channel.rel = "noopener noreferrer";
  channel.textContent = `${DOSSIER.channelLabel} · ${DOSSIER.channelText}`;

  const dismiss = document.createElement("button");
  dismiss.className = "menu-item dossier__dismiss";
  dismiss.textContent = "Close Record";
  dismiss.addEventListener("click", onDismiss);

  panel.append(
    heading,
    name,
    row("ROLE", DOSSIER.role),
    row("YEARS ACTIVE", DOSSIER.yearsActive),
    specializations,
    row("CURRENT FOCUS", DOSSIER.currentFocus),
    channel,
    dismiss,
  );
  root.appendChild(panel);

  // The transition line holds alone first, then the record resolves out of it —
  // MOODBOARD.md's "the dense HUD panel resolves into" beat.
  const timer = window.setTimeout(() => {
    transition.classList.add("dossier__transition--settled");
    panel.classList.add("dossier--visible");
  }, TRANSITION_HOLD_MS);

  // Overlays are removed by `showScreen`, so clean the timer up with the node
  // rather than leaving it to fire against a detached element.
  const observer = new MutationObserver(() => {
    if (!root.isConnected) {
      window.clearTimeout(timer);
      observer.disconnect();
    }
  });
  queueMicrotask(() => {
    if (root.parentNode) observer.observe(root.parentNode, { childList: true });
  });

  return root;
}
