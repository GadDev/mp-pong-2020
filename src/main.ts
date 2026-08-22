import * as THREE from "three";
import "./style.css";
import { buildRevealScene } from "./reveal/scene";
import { updateRevealCamera } from "./reveal/camera";
import { RevealHud } from "./reveal/hud";
import { RevealAudio } from "./reveal/audio";
import { Act, RevealTimeline } from "./reveal/timeline";
import { createIntroScreen } from "./ui/intro";
import { createMainMenu } from "./ui/mainMenu";
import { createOptionsScreen } from "./ui/options";
import { createPauseOverlay } from "./ui/pause";
import { createPresence } from "./presence/presence";
import { createPresenceVoice } from "./presence/voice";
import { getSkipIntro, getVolume, setSkipIntro, setVolume } from "./persistence";

const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) {
  throw new Error("#app root element not found");
}
const app: HTMLDivElement = appElement;

// The canvas is shared by the reveal scene and the pre-game presence, so it
// lives outside gameLayer — gameLayer (the HUD) still hides off-play, but
// hiding the canvas would take the presence down with it.
const canvasLayer = document.createElement("div");
app.appendChild(canvasLayer);

const gameLayer = document.createElement("div");
app.appendChild(gameLayer);

const { scene, ball } = buildRevealScene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
canvasLayer.appendChild(renderer.domElement);

const presence = createPresence();
const presenceVoice = createPresenceVoice();
app.appendChild(presenceVoice.element);

const hud = new RevealHud(gameLayer);
const audio = new RevealAudio();
const timeline = new RevealTimeline();
audio.setMasterVolume(getVolume());

window.addEventListener("resize", () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  presence.setViewport(window.innerWidth, window.innerHeight);
  renderer.setSize(window.innerWidth, window.innerHeight);
});

type Screen = "intro" | "menu" | "options" | "playing" | "paused";

// A clock that only advances while actually playing — RevealTimeline's
// autoplay schedule compares against this, not wall-clock time, so pausing
// (or sitting in the menu after a quit) doesn't cause it to "catch up" and
// jump acts the moment play resumes.
let playedSeconds = 0;
let lastPlayingTimestamp: number | null = null;

function tickGameClock(isPlaying: boolean): number {
  const raw = performance.now() / 1000;
  if (isPlaying) {
    if (lastPlayingTimestamp !== null) {
      playedSeconds += raw - lastPlayingTimestamp;
    }
    lastPlayingTimestamp = raw;
  } else {
    lastPlayingTimestamp = null;
  }
  return playedSeconds;
}

function resetGameClock(): void {
  playedSeconds = 0;
  lastPlayingTimestamp = null;
}

let currentScreen: Screen = getSkipIntro() ? "menu" : "intro";
let overlay: HTMLElement | null = null;
// Milestone 2 (ROADMAP.md): Continue is in-memory only, never persisted —
// true once a match has started, so quitting to menu from pause re-offers it.
let hasActiveMatch = false;

function showScreen(screen: Screen): void {
  currentScreen = screen;
  overlay?.remove();
  overlay = null;

  const gameVisible = screen === "playing" || screen === "paused";
  gameLayer.style.display = gameVisible ? "block" : "none";
  // The presence belongs to the pre-game chrome only. Once a match is on
  // screen, OPERATOR is the only thing paying attention to the player.
  presenceVoice.element.style.display = gameVisible ? "none" : "flex";
  // The intro is a bare title; the menu adds a list under it. The mark sits
  // just above whichever, so it has to know which is on screen.
  presence.setLayout(screen === "intro" ? "intro" : "menu");

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
      onRestart: restartGame,
      onQuitToMenu: quitToMenu,
    });
  }

  if (overlay) app.appendChild(overlay);
}

function startNewGame(): void {
  hasActiveMatch = true;
  resetGameClock();
  timeline.startAutoplay(0);
  audio.setActive(true);
  showScreen("playing");
}

function continueGame(): void {
  audio.setActive(true);
  showScreen("playing");
}

function pauseGame(): void {
  audio.setActive(false);
  showScreen("paused");
}

function resumeGame(): void {
  audio.setActive(true);
  showScreen("playing");
}

function restartGame(): void {
  resetGameClock();
  timeline.startAutoplay(0);
  audio.setActive(true);
  showScreen("playing");
}

function quitToMenu(): void {
  audio.setActive(false);
  showScreen("menu");
}

// Milestone 1 debug controls, gated to when a match is actually on screen —
// see LORE.md's "discoverable once" rule; never exposed via the menu.
window.addEventListener("keydown", (event) => {
  audio.resume();

  if (event.key === "Escape") {
    if (currentScreen === "playing") pauseGame();
    else if (currentScreen === "paused") resumeGame();
    return;
  }

  if (currentScreen !== "playing") return;
  const now = playedSeconds;
  if (event.key === "1") timeline.setAct(Act.ONE, now);
  else if (event.key === "2") timeline.setAct(Act.TWO, now);
  else if (event.key === "3") timeline.setAct(Act.THREE, now);
  else if (event.key === "p" || event.key === "P") timeline.startAutoplay(now);
  else if (event.key === "h" || event.key === "H")
    audio.playBlip(timeline.getAct());
});
window.addEventListener("click", () => audio.resume());

showScreen(currentScreen);
// Boot fragments run once, with the intro beat. Skipping the intro skips
// them too — they're the cabinet waking up, not a greeting.
if (currentScreen === "intro") presenceVoice.start();

let lastFrameTimestamp = performance.now() / 1000;

function animate(): void {
  requestAnimationFrame(animate);
  const now = tickGameClock(currentScreen === "playing");

  const raw = performance.now() / 1000;
  // Clamped: a backgrounded tab returns one enormous delta, which would
  // otherwise snap the presence through a whole rotation on the first frame.
  const dt = Math.min(raw - lastFrameTimestamp, 0.1);
  lastFrameTimestamp = raw;

  if (currentScreen !== "playing" && currentScreen !== "paused") {
    presenceVoice.update(dt);
    presence.update(dt, presenceVoice.isSpeaking());
    renderer.render(presence.scene, presence.camera);
    return;
  }

  // Paused: freeze game/HUD/audio state, but keep painting the same frame —
  // an idle WebGL canvas that stops issuing draw calls while still visible
  // is the more fragile state to leave a GPU-composited page in.
  if (currentScreen === "playing") {
    timeline.tickAutoplay(now);
    const act = timeline.getAct();
    const elapsedInAct = timeline.elapsed(now);

    ball.position.x = Math.sin(now * 0.8) * 3;

    updateRevealCamera(camera, act, elapsedInAct, now);
    hud.update(act, elapsedInAct);
    audio.update(act, elapsedInAct, now);
  }

  renderer.render(scene, camera);
}

animate();
