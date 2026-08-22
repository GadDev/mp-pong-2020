import * as THREE from "three";
import "./style.css";
import { buildRevealScene } from "./reveal/scene";
import { isWatcherCut, updateRevealCamera } from "./reveal/camera";
import { createRevealComposer } from "./reveal/postprocessing";
import { FrameRateProbe } from "./reveal/framerate";
import { RevealHud } from "./reveal/hud";
import { RevealAudio } from "./reveal/audio";
import { Act, RevealTimeline } from "./reveal/timeline";
import { createIntroScreen } from "./ui/intro";
import { createMainMenu } from "./ui/mainMenu";
import { createOptionsScreen } from "./ui/options";
import { createPauseOverlay } from "./ui/pause";
import { getSkipIntro, getVolume, setSkipIntro, setVolume } from "./persistence";

const appElement = document.querySelector<HTMLDivElement>("#app");
if (!appElement) {
  throw new Error("#app root element not found");
}
const app: HTMLDivElement = appElement;

const gameLayer = document.createElement("div");
app.appendChild(gameLayer);

const { scene, ball } = buildRevealScene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);

// Milestone 5: `antialias` is now redundant — EffectComposer renders into its
// own targets, so the WebGLRenderer's MSAA never applies to what reaches the
// screen. Dropped rather than left in as a misleading no-op that costs a
// context attribute; the film grain and bloom hide edge aliasing well enough
// on a wireframe-heavy scene that a dedicated SMAA pass would blow the
// two-pass budget for very little.
const renderer = new THREE.WebGLRenderer();
// Capped at 2: post-processing cost scales with the square of this number,
// and it's the single biggest lever on the "stable frame rate on a mid-range
// laptop GPU" done-condition.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
gameLayer.appendChild(renderer.domElement);

const composer = createRevealComposer(renderer, scene, camera);
const frameRate = new FrameRateProbe();
frameRate.attachReadout(gameLayer);

const hud = new RevealHud(gameLayer);
const audio = new RevealAudio();
const timeline = new RevealTimeline();
audio.setMasterVolume(getVolume());

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  // The composer owns its own render targets — without this they keep the
  // old dimensions and the canvas renders blurry (and stretched) after a
  // resize, with no error to point at.
  composer.setSize(window.innerWidth, window.innerHeight);
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

function animate(): void {
  requestAnimationFrame(animate);
  const now = tickGameClock(currentScreen === "playing");
  if (currentScreen !== "playing" && currentScreen !== "paused") return;

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
    composer.update(act, isWatcherCut(act, elapsedInAct));
    frameRate.sample(act);
  }

  composer.render();
}

animate();
