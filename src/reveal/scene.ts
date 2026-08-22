import * as THREE from "three";
import { CYAN, DEEP_BLUE, NEAR_WHITE, VOID_BLACK } from "./palette";

export interface RevealScene {
  scene: THREE.Scene;
  ball: THREE.Mesh;
  paddleLeft: THREE.Mesh;
  paddleRight: THREE.Mesh;
  grid: THREE.GridHelper;
}

/** Dummy court geometry only — a plane, two blocks, a dot. Real Pong arrives in Milestone 3/4. */
export function buildRevealScene(): RevealScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID_BLACK);

  const grid = new THREE.GridHelper(20, 20, CYAN, DEEP_BLUE);
  scene.add(grid);

  const paddleGeometry = new THREE.BoxGeometry(0.3, 1, 0.1);
  const paddleMaterial = new THREE.MeshBasicMaterial({ color: CYAN });

  const paddleLeft = new THREE.Mesh(paddleGeometry, paddleMaterial);
  paddleLeft.position.set(-4, 0.6, 0);
  scene.add(paddleLeft);

  const paddleRight = new THREE.Mesh(
    paddleGeometry,
    paddleMaterial.clone(),
  );
  paddleRight.position.set(4, 0.6, 0);
  scene.add(paddleRight);

  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: NEAR_WHITE }),
  );
  ball.position.set(0, 0.6, 0);
  scene.add(ball);

  const ambient = new THREE.AmbientLight(NEAR_WHITE, 0.6);
  scene.add(ambient);

  return { scene, ball, paddleLeft, paddleRight, grid };
}
