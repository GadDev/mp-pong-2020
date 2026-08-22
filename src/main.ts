import * as THREE from "three";
import "./style.css";
import { buildRevealScene } from "./reveal/scene";
import { updateRevealCamera } from "./reveal/camera";
import { RevealHud } from "./reveal/hud";
import { RevealAudio } from "./reveal/audio";
import { Act, RevealTimeline } from "./reveal/timeline";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app root element not found");
}

const { scene, ball } = buildRevealScene();

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
app.appendChild(renderer.domElement);

const hud = new RevealHud(app);
const audio = new RevealAudio();
const timeline = new RevealTimeline();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Milestone 1 debug controls (not player-facing menu — see LORE.md's
// "discoverable once" rule; this spike bypasses it deliberately for review).
window.addEventListener("keydown", (event) => {
  audio.resume();
  const now = performance.now() / 1000;
  if (event.key === "1") timeline.setAct(Act.ONE, now);
  else if (event.key === "2") timeline.setAct(Act.TWO, now);
  else if (event.key === "3") timeline.setAct(Act.THREE, now);
  else if (event.key === "p" || event.key === "P") timeline.startAutoplay(now);
  else if (event.key === "h" || event.key === "H")
    audio.playBlip(timeline.getAct());
});
window.addEventListener("click", () => audio.resume(), { once: true });

// Plays start-to-finish on load, per ROADMAP.md Milestone 1 ("scripted or
// debug-key-triggered transition") — debug keys above are for re-running/
// jumping acts during review, not the only way to see it.
timeline.startAutoplay(performance.now() / 1000);

function animate(): void {
  const now = performance.now() / 1000;
  timeline.tickAutoplay(now);
  const act = timeline.getAct();
  const elapsedInAct = timeline.elapsed(now);

  ball.position.x = Math.sin(now * 0.8) * 3;

  updateRevealCamera(camera, act, elapsedInAct, now);
  hud.update(act, elapsedInAct);
  audio.update(act, elapsedInAct, now);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();
