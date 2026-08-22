import "./style.css";
import {
  createGameState,
  setPlayerPaddleX,
  stepGame,
  type GameState,
} from "./game/gameState";
import { Act, PresentationState } from "./game/presentationState";
import { Renderer } from "./render/renderer";
import { RevealAudio } from "./reveal/audio";
import { createIntroScreen } from "./ui/intro";
import { createMainMenu } from "./ui/mainMenu";
import { createOptionsScreen } from "./ui/options";
import { createPauseOverlay } from "./ui/pause";
import { createDossierScreen } from "./ui/dossier";
import { createResultScreen } from "./ui/result";
import {
  getHasSeenReveal,
  getSkipIntro,
  getVolume,
  setHasSeenReveal,
  setSkipIntro,
  setVolume,
} from "./persistence";

const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) {
  throw new Error("#app root element not found");
}
const app: HTMLDivElement = appElement;

const gameLayer = document.createElement("div");
app.appendChild(gameLayer);

/**
 * BACKLOG.md requires a dev-only reveal re-trigger as Milestone 4 scope, not a
 * nice-to-have: `hasSeenReveal` permanently disarms the escalation, so without
 * this there is no way to demo the payoff on a device that has seen it once
 * short of clearing site data. Read once, deliberately not surfaced anywhere in
 * the menu — the interface must have no memory a player can go looking for.
 */
const debugReveal =
  new URLSearchParams(window.location.search).get("debug") === "reveal";

const renderer = new Renderer(gameLayer);
const audio = new RevealAudio();
audio.setMasterVolume(getVolume());

let state: GameState = createGameState();
const presentation = new PresentationState({
  escalationArmed: debugReveal || !getHasSeenReveal(),
  onEscalation: () => setHasSeenReveal(true),
});

type Screen =
  | "intro"
  | "menu"
  | "options"
  | "playing"
  | "paused"
  | "result"
  | "dossier";

let currentScreen: Screen = getSkipIntro() ? "menu" : "intro";
let overlay: HTMLElement | null = null;
// ROADMAP.md M2: Continue is in-memory only, never persisted — true once a
// match has started, so quitting to menu from pause re-offers it.
let hasActiveMatch = false;
/** Drives the camera's micro-drift and the Act 3 audio LFO; only advances while playing. */
let playedSeconds = 0;

function showScreen(screen: Screen): void {
  currentScreen = screen;
  overlay?.remove();
  overlay = null;

  const gameVisible =
    screen === "playing" || screen === "paused" || screen === "result";
  gameLayer.style.display = gameVisible ? "block" : "none";

  if (screen === "intro") {
    overlay = createIntroScreen({ onSkip: () => showScreen("menu") });
  } else if (screen === "menu") {
    overlay = createMainMenu({
      canContinue: hasActiveMatch,
      onNewGame: startNewGame,
      onContinue: continueGame,
      onOptions: () => showScreen("options"),
    });
  } else if (screen === "options") {
    overlay = createOptionsScreen(
      { volume: getVolume(), skipIntro: getSkipIntro() },
      {
        onVolumeChange: (volume) => {
          setVolume(volume);
          audio.setMasterVolume(volume);
        },
        onSkipIntroChange: setSkipIntro,
        onBack: () => showScreen("menu"),
      },
    );
  } else if (screen === "paused") {
    overlay = createPauseOverlay({
      onResume: resumeGame,
      onRestart: startNewGame,
      onQuitToMenu: quitToMenu,
    });
  } else if (screen === "result") {
    overlay = createResultScreen({
      playerScore: state.playerScore,
      operatorScore: state.operatorScore,
      won: state.winner === "player",
      onDismiss: quitToMenu,
    });
  } else if (screen === "dossier") {
    overlay = createDossierScreen({ onDismiss: quitToMenu });
  }

  if (overlay) app.appendChild(overlay);
}

function startNewGame(): void {
  hasActiveMatch = true;
  playedSeconds = 0;
  state = createGameState();
  presentation.reset();
  // Re-evaluated per match, not fixed at construction: the previous match may
  // have just set `hasSeenReveal`, and ROADMAP.md M4 requires every subsequent
  // New Game to check it.
  presentation.setEscalationArmed(debugReveal || !getHasSeenReveal());
  state.paused = false;
  audio.setActive(true);
  showScreen("playing");
}

function continueGame(): void {
  state.paused = false;
  audio.setActive(true);
  showScreen("playing");
}

function pauseGame(): void {
  // The physics gate lives in game state; the act clock is dt-driven, so
  // skipping the presentation update freezes the reveal too.
  state.paused = true;
  audio.setActive(false);
  showScreen("paused");
}

function resumeGame(): void {
  state.paused = false;
  audio.setActive(true);
  showScreen("playing");
}

function quitToMenu(): void {
  audio.setActive(false);
  showScreen("menu");
}

// Input → game state. Screen-space X, mapped by the renderer; see the comment
// on `courtXFromPointer` for why this isn't a raycast into the floor plane.
window.addEventListener("mousemove", (event) => {
  if (currentScreen !== "playing") return;
  setPlayerPaddleX(state, renderer.courtXFromPointer(event.clientX));
});

window.addEventListener("keydown", (event) => {
  audio.resume();

  if (event.key === "Escape") {
    if (currentScreen === "playing") pauseGame();
    else if (currentScreen === "paused") resumeGame();
    return;
  }

  // Dev-only act jumps. These deliberately bypass `escalationArmed` so they
  // keep working after the reveal has been seen — never exposed via a menu.
  if (currentScreen !== "playing") return;
  if (event.key === "1") presentation.setAct(Act.ONE);
  else if (event.key === "2") presentation.setAct(Act.TWO);
  else if (event.key === "3") presentation.setAct(Act.THREE);
  else if (event.key === "p" || event.key === "P") {
    presentation.reset();
    presentation.arm();
  }
});
window.addEventListener("click", () => audio.resume());

showScreen(currentScreen);

/** Clamped so a backgrounded tab doesn't resume with one enormous simulation step. */
const MAX_FRAME_SECONDS = 0.1;
let lastTimestamp: number | null = null;
/**
 * The last frame produced while playing. Reused verbatim while paused rather
 * than calling `presentation.update` with dt 0 — the act machine should not be
 * ticked at all on a frame the player isn't playing.
 */
let lastFrame = presentation.update(state, 0);

function animate(timestamp: number): void {
  requestAnimationFrame(animate);

  const dt =
    lastTimestamp === null
      ? 0
      : Math.min((timestamp - lastTimestamp) / 1000, MAX_FRAME_SECONDS);
  lastTimestamp = timestamp;

  // `result` keeps the board on screen behind its scrim, same as `paused`, so
  // it needs to keep painting too.
  const boardVisible =
    currentScreen === "playing" ||
    currentScreen === "paused" ||
    currentScreen === "result";
  if (!boardVisible) return;

  // Paused/result: freeze simulation, act clock, HUD and audio, but keep
  // painting the same frame — an idle WebGL canvas that stops issuing draw
  // calls while still visible is the more fragile state to leave a
  // composited page in.
  if (currentScreen === "playing") {
    playedSeconds += dt;

    const events = stepGame(state, dt);
    const frame = presentation.update(state, dt);
    lastFrame = frame;

    // Presentation *commands* the game's difficulty tier. This is the one
    // write in that direction and it is not a read-back from the renderer, so
    // input → game → render still holds. Without it every tier collapses to 0
    // and OPERATOR never visibly adapts (ROADMAP.md M4).
    state.operatorTier = presentation.operatorTierFor();

    if (events.paddleHit) audio.playBlip(frame.act);
    if (events.wallHit) audio.playBlip(frame.act, true);
    if (events.playerScored || events.operatorScored) audio.playScore(frame.act);

    renderer.registerEvents(events);
    audio.update(frame.act, playedSeconds, frame.stutterPulse);
    renderer.render(state, frame, dt);

    // The dossier is the climax of a match that escalated, regardless of who
    // won. A match that never escalated just ends — nothing is shown, and the
    // menu says nothing about it either.
    if (state.matchOver) {
      // Cleared either way: Continue must not offer to resume a finished
      // match, which would drop the player into a frozen board.
      hasActiveMatch = false;
      audio.setActive(false);
      // Escalated matches resolve to the dossier (undifferentiated by winner);
      // every other match gets the plain outcome beat.
      showScreen(frame.climax ? "dossier" : "result");
    }
    return;
  }

  renderer.render(state, lastFrame, 0);
}

requestAnimationFrame(animate);
