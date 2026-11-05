import { closestPointOnWall, GOAL_RADIUS, WALL_HALF_THICKNESS, type Wall } from './maze';

export const BALL_RADIUS = 0.3;

/** Gyorsulás teljes (90°-os) dőlésnél, egység/s². */
const TILT_ACCELERATION = 30;
/** Gördülési súrlódás (sebesség-csillapítás másodpercenként). */
const FRICTION = 0.8;
const MAX_SPEED = 9;
const BOUNCE = 0.25;
const SUBSTEPS = 4;

export type Ball = { x: number; y: number; vx: number; vy: number };

/**
 * Egy lépés a golyó mozgásában.
 * `tiltX`, `tiltY`: a dőlés a képernyő síkjában (-1..1, ~ a dőlésszög szinusza),
 * pozitív x = jobbra, pozitív y = lefelé lejt a pálya.
 * Visszatér: elérte-e a golyó a középső célt.
 */
export function stepBall(ball: Ball, walls: Wall[], tiltX: number, tiltY: number, dt: number): boolean {
  ball.vx += tiltX * TILT_ACCELERATION * dt;
  ball.vy += tiltY * TILT_ACCELERATION * dt;

  const damping = Math.max(0, 1 - FRICTION * dt);
  ball.vx *= damping;
  ball.vy *= damping;

  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > MAX_SPEED) {
    ball.vx *= MAX_SPEED / speed;
    ball.vy *= MAX_SPEED / speed;
  }

  const h = dt / SUBSTEPS;
  const minDist = BALL_RADIUS + WALL_HALF_THICKNESS;
  for (let s = 0; s < SUBSTEPS; s++) {
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;

    for (const wall of walls) {
      const p = closestPointOnWall(wall, ball.x, ball.y);
      const dx = ball.x - p.x;
      const dy = ball.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= minDist || dist < 1e-6) continue;

      const nx = dx / dist;
      const ny = dy / dist;
      ball.x += nx * (minDist - dist);
      ball.y += ny * (minDist - dist);

      const vn = ball.vx * nx + ball.vy * ny;
      if (vn < 0) {
        ball.vx -= (1 + BOUNCE) * vn * nx;
        ball.vy -= (1 + BOUNCE) * vn * ny;
      }
    }
  }

  return Math.hypot(ball.x, ball.y) < GOAL_RADIUS;
}
