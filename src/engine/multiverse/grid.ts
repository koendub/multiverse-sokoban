import type { Vec2 } from "./types.ts";
import { vecKey } from "./types.ts";

/**
 * The static, shared-across-all-universes part of the level: bounds, walls
 * and goals. Every universe in every group renders on top of this same grid.
 *
 * Walls/goals are fixed for v1. Nothing here prevents a future extension
 * (e.g. a wall that only exists in some universes) from moving into the
 * per-universe entity system instead of this static grid.
 */
export class Grid {
  readonly width: number;
  readonly height: number;
  private readonly walls: ReadonlySet<string>;
  private readonly goals: ReadonlySet<string>;

  constructor(width: number, height: number, walls: Iterable<Vec2>, goals: Iterable<Vec2>) {
    this.width = width;
    this.height = height;
    this.walls = new Set([...walls].map(vecKey));
    this.goals = new Set([...goals].map(vecKey));
  }

  inBounds(pos: Vec2): boolean {
    return pos.x >= 0 && pos.y >= 0 && pos.x < this.width && pos.y < this.height;
  }

  isWall(pos: Vec2): boolean {
    return this.walls.has(vecKey(pos));
  }

  isGoal(pos: Vec2): boolean {
    return this.goals.has(vecKey(pos));
  }

  /** A cell blocks movement if it's out of bounds or a wall. */
  isBlocked(pos: Vec2): boolean {
    return !this.inBounds(pos) || this.isWall(pos);
  }

  get goalCount(): number {
    return this.goals.size;
  }

  allGoals(): Vec2[] {
    return [...this.goals].map(parseKey);
  }

  allWalls(): Vec2[] {
    return [...this.walls].map(parseKey);
  }
}

function parseKey(key: string): Vec2 {
  const [x, y] = key.split(",").map(Number);
  return { x, y };
}
