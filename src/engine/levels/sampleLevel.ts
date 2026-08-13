import type { LevelDef } from "./levels/level.ts";
import type { Vec2 } from "./types.ts";
import { variantEntity } from "./entities.ts";

/**
 * A small demo level: one box that starts at (2,2), (3,2) or (4,2)
 * depending on the universe. The wall row beneath it only has openings at
 * x=2 and x=6, so pushing the box up to the goal requires first sliding it
 * sideways to x=2 - a different number of pushes per universe.
 *
 *   ########
 *   #..G...#
 *   #......#
 *   #..###.#
 *   #......#
 *   ########
 *
 * All 3 universes start in a single StateGroup. They only split once the
 * player reaches the box (its position differs), and re-merge once every
 * branch has pushed it to the same cell (2,2) on the way to the goal.
 */
export const sampleLevel: LevelDef = {
  width: 8,
  height: 6,
  walls: wallsFromMask(["########", "#......#", "#......#", "#..###.#", "#......#", "########"]),
  goals: [{ x: 2, y: 1 }],
  axes: [{ id: "boxAxis", size: 3 }],
  player: { x: 2, y: 4 },
  boxes: {
    b: variantEntity("boxAxis", (v) => ({ x: 2 + v, y: 2 })),
  },
};

function wallsFromMask(rows: string[]): Vec2[] {
  const walls: Vec2[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === "#") walls.push({ x, y });
    });
  });
  return walls;
}
