import { describe, expect, it } from "vitest";
import { analyzeSolution } from "../solve/analyzeSolution.ts";
import { sampleLevel } from "../levels/sampleLevel.ts";
import { variantEntity } from "../multiverse/entities.ts";
import type { LevelDef } from "../levels/level.ts";

describe("analyzeSolution", () => {
  it("reports the initial state's counts when given an empty move list", () => {
    const stats = analyzeSolution(sampleLevel, []);
    expect(stats).toEqual({ moveCount: 0, maxStateGroups: 1, maxPlayerLocations: 1 });
  });

  it("counts a step that splits the group without moving the player differently to one that also diverges the player", () => {
    // Up, Up reaches sampleLevel's box: it's only there for one of the 3
    // axis values, so the group splits in two - but the player ends up at
    // the same cell either way (either it pushed the box, or just walked
    // in), so this specifically exercises maxStateGroups > maxPlayerLocations.
    const stats = analyzeSolution(sampleLevel, ["Up", "Up"]);
    expect(stats.moveCount).toBe(2);
    expect(stats.maxStateGroups).toBe(2);
    expect(stats.maxPlayerLocations).toBe(1);
  });

  it("counts the player actually ending up in different places across branches", () => {
    // Mirrors the sceneAdapter.test.ts fixture: box "b" blocks the push in
    // universe 0 (wall right behind it) but is out of the way in universe 1,
    // so moving Right makes the player's position itself diverge.
    const level: LevelDef = {
      width: 4,
      height: 4,
      walls: [
        { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
        { x: 0, y: 1 }, { x: 3, y: 1 },
        { x: 0, y: 2 }, { x: 3, y: 2 },
        { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
      ],
      goals: [],
      player: { x: 1, y: 1 },
      entities: {
        b: variantEntity("a", [
          { x: 2, y: 1 },
          { x: 2, y: 2 },
        ]),
      },
    };

    const stats = analyzeSolution(level, ["Right"]);
    expect(stats.maxStateGroups).toBe(2);
    expect(stats.maxPlayerLocations).toBe(2);
  });
});
