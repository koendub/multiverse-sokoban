import { describe, expect, it } from "vitest";
import { solveLevel } from "../solve/solveLevel.ts";
import { Multiverse } from "../multiverse/Multiverse.ts";
import { constantEntity } from "../multiverse/entities.ts";
import type { LevelDef } from "../levels/level.ts";
import type { DirectionName } from "../multiverse/types.ts";
import { sampleLevel } from "../levels/sampleLevel.ts";

/** Replays `moves` and confirms they actually solve `level` - the property every solveLevel result must have, independent of whether it's optimal. */
function solves(level: LevelDef, moves: readonly DirectionName[]): boolean {
  const mv = new Multiverse(level);
  for (const dir of moves) mv.step(dir);
  return mv.isSolved();
}

describe("solveLevel", () => {
  it("returns an empty solution for an already-solved level", () => {
    const level: LevelDef = {
      width: 3,
      height: 3,
      walls: [],
      goals: [{ x: 1, y: 1 }],
      player: { x: 0, y: 0 },
      entities: { b: constantEntity({ x: 1, y: 1 }) },
    };
    expect(solveLevel(level)).toEqual([]);
  });

  it("finds the exact optimal path when there's only one way to solve it (walk then push)", () => {
    // #P..G#  - player must walk one step, then push the box one step onto the goal.
    const level: LevelDef = {
      width: 6,
      height: 3,
      walls: [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }, { x: 5, y: 0 },
        { x: 0, y: 1 }, { x: 5, y: 1 },
        { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 },
      ],
      goals: [{ x: 4, y: 1 }],
      player: { x: 1, y: 1 },
      entities: { b: constantEntity({ x: 3, y: 1 }) },
    };
    expect(solveLevel(level)).toEqual(["Right", "Right"]);
  });

  it("returns null for a level with no solution", () => {
    // The box sits right in a corner (walls immediately to its left and
    // above, from the border alone) - all 4 pushes need either the player
    // or the box's destination to be one of those wall cells, so the box
    // can never move at all, and the goal is elsewhere.
    const level: LevelDef = {
      width: 5,
      height: 5,
      walls: [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
        { x: 0, y: 1 }, { x: 4, y: 1 },
        { x: 0, y: 2 }, { x: 4, y: 2 },
        { x: 0, y: 3 }, { x: 4, y: 3 },
        { x: 0, y: 4 }, { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 },
      ],
      goals: [{ x: 3, y: 3 }],
      player: { x: 2, y: 2 },
      entities: { b: constantEntity({ x: 1, y: 1 }) },
    };
    expect(solveLevel(level)).toBeNull();
  });

  it("finds a real solution for a level with a variant (multiverse) box", () => {
    const moves = solveLevel(sampleLevel);
    expect(moves).not.toBeNull();
    expect(solves(sampleLevel, moves!)).toBe(true);
  });
});
