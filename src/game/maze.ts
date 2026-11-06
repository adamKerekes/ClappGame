/**
 * Kör alakú (poláris) labirintus generálása.
 *
 * A pálya koncentrikus gyűrűkből áll. A 0. gyűrű a középső cél, a többi gyűrű
 * cellákra van osztva (kifelé haladva több cella jut egy gyűrűre). Egy
 * mélységi bejárás (recursive backtracker) vág átjárókat a cellák között,
 * a maradék határokból lesznek a falak.
 *
 * Koordináták: 1 egység = egy gyűrű szélessége. x jobbra, y lefelé (képernyő szerint).
 */

/** Cellák száma gyűrűnként, belülről kifelé. Minden szám osztója a következőnek. */
const RING_CELLS = [1, 6, 12, 12, 24, 24];

export const RING_COUNT = RING_CELLS.length;
export const MAZE_RADIUS = RING_COUNT; // a külső fal sugara
export const WALL_HALF_THICKNESS = 0.07;
export const GOAL_RADIUS = 0.6;

export type ArcWall = { kind: 'arc'; r: number; a0: number; a1: number };
export type RadialWall = { kind: 'radial'; angle: number; r0: number; r1: number };
export type Wall = ArcWall | RadialWall;

export type Maze = {
  walls: Wall[];
  start: { x: number; y: number };
};

type Cell = { ring: number; index: number };

const TAU = Math.PI * 2;

function key(a: Cell, b: Cell) {
  const ka = `${a.ring}:${a.index}`;
  const kb = `${b.ring}:${b.index}`;
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function inward(cell: Cell): Cell {
  const ratio = RING_CELLS[cell.ring] / RING_CELLS[cell.ring - 1];
  return { ring: cell.ring - 1, index: Math.floor(cell.index / ratio) };
}

function neighbours(cell: Cell): Cell[] {
  const { ring, index } = cell;
  const n = RING_CELLS[ring];
  const result: Cell[] = [];
  if (ring > 0) {
    result.push({ ring, index: (index + 1) % n });
    result.push({ ring, index: (index - 1 + n) % n });
    result.push(inward(cell));
  }
  if (ring < RING_COUNT - 1) {
    const ratio = RING_CELLS[ring + 1] / n;
    for (let i = 0; i < ratio; i++) result.push({ ring: ring + 1, index: index * ratio + i });
  }
  return result;
}

export function generateMaze(seed = 7): Maze {
  const random = mulberry32(seed);
  const passages = new Set<string>();
  const visited = new Set<string>(['0:0']);
  const stack: Cell[] = [{ ring: 0, index: 0 }];

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const options = neighbours(current).filter((c) => !visited.has(`${c.ring}:${c.index}`));
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const next = options[Math.floor(random() * options.length)];
    passages.add(key(current, next));
    visited.add(`${next.ring}:${next.index}`);
    stack.push(next);
  }

  const walls: Wall[] = [];

  for (let ring = 1; ring < RING_COUNT; ring++) {
    const n = RING_CELLS[ring];
    const step = TAU / n;

    // Belső körív minden cellánál, ha nincs átjáró befelé. A szomszédos íveket összevonjuk.
    let arcStart: number | null = null;
    for (let i = 0; i <= n; i++) {
      const closed = i < n && !passages.has(key({ ring, index: i }, inward({ ring, index: i })));
      if (closed && arcStart === null) arcStart = i * step;
      if (!closed && arcStart !== null) {
        walls.push({ kind: 'arc', r: ring, a0: arcStart, a1: i * step });
        arcStart = null;
      }
    }

    // Sugárirányú falak két szomszédos cella között.
    for (let i = 0; i < n; i++) {
      const next = { ring, index: (i + 1) % n };
      if (!passages.has(key({ ring, index: i }, next))) {
        walls.push({ kind: 'radial', angle: (i + 1) * step, r0: ring, r1: ring + 1 });
      }
    }
  }

  // Külső, zárt körfal.
  walls.push({ kind: 'arc', r: MAZE_RADIUS, a0: 0, a1: TAU });

  // Kezdés: a külső gyűrű legalsó cellája (a képernyő alja felé).
  const outer = RING_COUNT - 1;
  const n = RING_CELLS[outer];
  const startIndex = Math.floor((Math.PI / 2) / (TAU / n));
  const angle = (startIndex + 0.5) * (TAU / n);
  const r = outer + 0.5;

  return { walls, start: { x: r * Math.cos(angle), y: r * Math.sin(angle) } };
}

/** A fal (vastagság nélkül vett) középvonalának a ponthoz legközelebbi pontja. */
export function closestPointOnWall(wall: Wall, x: number, y: number): { x: number; y: number } {
  if (wall.kind === 'radial') {
    const dx = Math.cos(wall.angle);
    const dy = Math.sin(wall.angle);
    const t = Math.min(wall.r1, Math.max(wall.r0, x * dx + y * dy));
    return { x: t * dx, y: t * dy };
  }

  let angle = Math.atan2(y, x);
  while (angle < wall.a0) angle += TAU;
  while (angle >= wall.a0 + TAU) angle -= TAU;
  if (angle <= wall.a1) return { x: wall.r * Math.cos(angle), y: wall.r * Math.sin(angle) };

  // Az íven kívül esik: a közelebbi végpont.
  const ex0 = wall.r * Math.cos(wall.a0);
  const ey0 = wall.r * Math.sin(wall.a0);
  const ex1 = wall.r * Math.cos(wall.a1);
  const ey1 = wall.r * Math.sin(wall.a1);
  const d0 = (x - ex0) ** 2 + (y - ey0) ** 2;
  const d1 = (x - ex1) ** 2 + (y - ey1) ** 2;
  return d0 < d1 ? { x: ex0, y: ey0 } : { x: ex1, y: ey1 };
}
