import * as THREE from "three";
import {
  BALL_RADIUS,
  COURT_HALF_LENGTH,
  COURT_HALF_WIDTH,
  PADDLE_HALF_WIDTH,
  PLAY_HEIGHT,
} from "../game/gameState";
import { CYAN, DEEP_BLUE, MAGENTA, NEAR_WHITE, VOID_BLACK } from "./palette";

/** Paddle extent along Z (its "thickness") and its height off the floor plane. */
const PADDLE_DEPTH = 0.2;
const PADDLE_HEIGHT = 0.5;

export interface Arena {
  scene: THREE.Scene;
  ball: THREE.Mesh;
  playerPaddle: THREE.Mesh;
  operatorPaddle: THREE.Mesh;
  grid: THREE.GridHelper;
  /** Every geometry/material this module allocated, for teardown. */
  dispose(): void;
}

/**
 * The real arena (Milestone 3/4), replacing the M1 spike's plane-and-two-blocks.
 *
 * Everything is `MeshBasicMaterial` on purpose — that unlit, flat-emissive
 * look *is* the Tron language MOODBOARD.md specifies, which is also why there
 * is no light in this scene. The M1 spike carried an `AmbientLight` that
 * nothing could respond to; it's gone rather than replaced.
 *
 * The court runs along Z so the Act 1 camera can look down its length.
 */
export function buildArena(): Arena {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(VOID_BLACK);

  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(resource: T): T => {
    disposables.push(resource);
    return resource;
  };

  // Grid sized to the court's long axis, so the cell lines read as court
  // markings rather than as arbitrary floor decoration.
  // Both colour args are DEEP_BLUE deliberately: GridHelper's third argument
  // is the *centre-line* colour, and highlighting it draws a bright line down
  // the court's length — reading as a divider along the wrong axis for Pong.
  // The net-equivalent marking is the explicit centre line added below.
  const gridSpan = COURT_HALF_LENGTH * 2;
  const grid = new THREE.GridHelper(gridSpan, 14, DEEP_BLUE, DEEP_BLUE);
  grid.scale.x = COURT_HALF_WIDTH / COURT_HALF_LENGTH;
  scene.add(grid);
  disposables.push({ dispose: () => grid.dispose() });

  // Court outline: four hairlines at the play height, the only thing telling
  // the player where the walls actually are.
  const outlineGeometry = track(new THREE.BufferGeometry());
  const w = COURT_HALF_WIDTH;
  const l = COURT_HALF_LENGTH;
  outlineGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [-w, 0, -l, w, 0, -l, w, 0, -l, w, 0, l, w, 0, l, -w, 0, l, -w, 0, l, -w, 0, -l],
      3,
    ),
  );
  const outlineMaterial = track(
    new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.55 }),
  );
  const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
  outline.position.y = 0.01;
  scene.add(outline);

  // Centre line, standing in for the original's dashed net.
  const centreGeometry = track(new THREE.BufferGeometry());
  centreGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0], 3),
  );
  const centreMaterial = track(
    new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.75 }),
  );
  const centreLine = new THREE.LineSegments(centreGeometry, centreMaterial);
  centreLine.position.y = 0.01;
  scene.add(centreLine);

  const paddleGeometry = track(
    new THREE.BoxGeometry(PADDLE_HALF_WIDTH * 2, PADDLE_HEIGHT, PADDLE_DEPTH),
  );

  // The player's paddle stays cyan in every act — it's the one object the
  // player has to read reliably. OPERATOR's material is the one that changes
  // (MOODBOARD.md: magenta is "the opponent's signature color once it's
  // revealed as a character, not a wall"), so it gets its own instance.
  const playerMaterial = track(new THREE.MeshBasicMaterial({ color: CYAN }));
  const playerPaddle = new THREE.Mesh(paddleGeometry, playerMaterial);
  playerPaddle.position.set(0, PLAY_HEIGHT, COURT_HALF_LENGTH);
  scene.add(playerPaddle);

  const operatorMaterial = track(new THREE.MeshBasicMaterial({ color: CYAN }));
  const operatorPaddle = new THREE.Mesh(paddleGeometry, operatorMaterial);
  operatorPaddle.position.set(0, PLAY_HEIGHT, -COURT_HALF_LENGTH);
  scene.add(operatorPaddle);

  const ballGeometry = track(new THREE.SphereGeometry(BALL_RADIUS, 16, 16));
  const ballMaterial = track(new THREE.MeshBasicMaterial({ color: NEAR_WHITE }));
  const ball = new THREE.Mesh(ballGeometry, ballMaterial);
  ball.position.set(0, PLAY_HEIGHT, 0);
  scene.add(ball);

  return {
    scene,
    ball,
    playerPaddle,
    operatorPaddle,
    grid,
    dispose() {
      for (const resource of disposables) resource.dispose();
      disposables.length = 0;
    },
  };
}

/** MOODBOARD.md's opponent colour reveal. Mutates in place — no new material per frame. */
export const OPERATOR_REVEALED_COLOR = MAGENTA;
