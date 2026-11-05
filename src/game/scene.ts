import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

import { GOAL_RADIUS, MAZE_RADIUS, WALL_HALF_THICKNESS, type Maze, type Wall } from './maze';
import { BALL_RADIUS } from './physics';
import type { Tilt } from './use-tilt';

const WALL_HEIGHT = 0.55;
const TAU = Math.PI * 2;
/** Mennyire dőljön meg látványosan a pálya a telefon dőléséhez képest. */
const VISUAL_TILT = 0.12;

/**
 * three.js jelenet az expo-gl kontextusán. A logika koordinátái (x, y) a 3D-ben (x, z),
 * a pálya síkja y = 0, a falak felfelé (+y) állnak.
 */
export function createScene(gl: ExpoWebGLRenderingContext, maze: Maze) {
  const width = gl.drawingBufferWidth;
  const height = gl.drawingBufferHeight;

  const canvas =
    (gl as unknown as { canvas?: HTMLCanvasElement }).canvas ??
    ({
      width,
      height,
      style: {},
      clientWidth: width,
      clientHeight: height,
      addEventListener: () => {},
      removeEventListener: () => {},
      getContext: () => gl,
    } as unknown as HTMLCanvasElement);

  const renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGLRenderingContext, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x0b0d12);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 200);
  const halfV = THREE.MathUtils.degToRad(camera.fov / 2);
  const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
  const fit = MAZE_RADIUS + 0.9;
  const distance = Math.max(fit / Math.tan(halfH), fit / Math.tan(halfV)) * 0.98;
  const viewAngle = THREE.MathUtils.degToRad(22); // a függőlegeshez képest, kicsit szemből
  camera.position.set(0, distance * Math.cos(viewAngle), distance * Math.sin(viewAngle));
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1208, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(-4, 12, 6);
  scene.add(sun);

  const board = new THREE.Group();
  scene.add(board);

  // Talaj
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(MAZE_RADIUS + 0.35, MAZE_RADIUS + 0.35, 0.4, 96),
    new THREE.MeshStandardMaterial({ color: 0x2b5d8a, roughness: 0.9 }),
  );
  floor.position.y = -0.2;
  board.add(floor);

  // Cél középen
  const goal = new THREE.Mesh(
    new THREE.CircleGeometry(GOAL_RADIUS, 48),
    new THREE.MeshStandardMaterial({ color: 0xffc83d, emissive: 0x7a5200, roughness: 0.4 }),
  );
  goal.rotation.x = -Math.PI / 2;
  goal.position.y = 0.01;
  board.add(goal);

  // Falak
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xe9e2d0, roughness: 0.6 });
  const postGeometry = new THREE.CylinderGeometry(WALL_HALF_THICKNESS, WALL_HALF_THICKNESS, WALL_HEIGHT, 12);
  const addPost = (x: number, z: number) => {
    const post = new THREE.Mesh(postGeometry, wallMaterial);
    post.position.set(x, WALL_HEIGHT / 2, z);
    board.add(post);
  };
  for (const wall of maze.walls) {
    board.add(new THREE.Mesh(wallGeometry(wall), wallMaterial));
    if (wall.kind === 'radial') {
      addPost(wall.r0 * Math.cos(wall.angle), wall.r0 * Math.sin(wall.angle));
      addPost(wall.r1 * Math.cos(wall.angle), wall.r1 * Math.sin(wall.angle));
    } else if (wall.a1 - wall.a0 < TAU) {
      addPost(wall.r * Math.cos(wall.a0), wall.r * Math.sin(wall.a0));
      addPost(wall.r * Math.cos(wall.a1), wall.r * Math.sin(wall.a1));
    }
  }

  // Golyó és alatta egy puha árnyék
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(BALL_RADIUS, 32, 24),
    new THREE.MeshStandardMaterial({ color: 0xf2f4f8, metalness: 0.35, roughness: 0.25 }),
  );
  board.add(ball);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(BALL_RADIUS * 1.1, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  board.add(shadow);

  return {
    render(position: { x: number; y: number }, tilt: Tilt) {
      board.rotation.z = -tilt.x * VISUAL_TILT;
      board.rotation.x = tilt.y * VISUAL_TILT;
      ball.position.set(position.x, BALL_RADIUS, position.y);
      shadow.position.set(position.x + 0.08, 0.02, position.y + 0.06);
      renderer.render(scene, camera);
      gl.endFrameEXP?.();
    },
    dispose() {
      renderer.dispose();
    },
  };
}

function wallGeometry(wall: Wall): THREE.BufferGeometry {
  const t = WALL_HALF_THICKNESS;

  if (wall.kind === 'radial') {
    const length = wall.r1 - wall.r0;
    const geometry = new THREE.BoxGeometry(length, WALL_HEIGHT, t * 2);
    const mid = (wall.r0 + wall.r1) / 2;
    geometry.rotateY(-wall.angle);
    geometry.translate(mid * Math.cos(wall.angle), WALL_HEIGHT / 2, mid * Math.sin(wall.angle));
    return geometry;
  }

  // Körív: a síkbeli (x, y) alakzatot kihúzzuk, majd a 3D-s (x, z) síkba forgatjuk.
  const shape = new THREE.Shape();
  if (wall.a1 - wall.a0 >= TAU) {
    shape.absarc(0, 0, wall.r + t, 0, TAU, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, wall.r - t, 0, TAU, true);
    shape.holes.push(hole);
  } else {
    shape.moveTo((wall.r + t) * Math.cos(wall.a0), (wall.r + t) * Math.sin(wall.a0));
    shape.absarc(0, 0, wall.r + t, wall.a0, wall.a1, false);
    shape.lineTo((wall.r - t) * Math.cos(wall.a1), (wall.r - t) * Math.sin(wall.a1));
    shape.absarc(0, 0, wall.r - t, wall.a1, wall.a0, true);
    shape.closePath();
  }
  const segments = Math.min(96, Math.max(4, Math.ceil(((wall.a1 - wall.a0) * wall.r) / 0.3)));
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: WALL_HEIGHT, bevelEnabled: false, curveSegments: segments });
  geometry.rotateX(Math.PI / 2); // (x, y, z) -> (x, -z, y)
  geometry.translate(0, WALL_HEIGHT, 0);
  return geometry;
}
