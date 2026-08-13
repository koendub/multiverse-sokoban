import { describe, expect, it } from "vitest";
import { Multiverse } from "../Multiverse.ts";
import type { LevelDef } from "../levels/level.ts";
import { sampleLevel } from "../sampleLevel.ts";
import { constantEntity, variantEntity } from "../entities.ts";

describe("Multiverse - lazy split/merge", () => {
  it("starts as a single group covering every universe, even with varying entities", () => {
    const mv = new Multiverse(sampleLevel);
    const groups = mv.getGroups();
    expect(groups).toHaveLength(1);
    expect(mv.groupMultiplicity(groups[0])).toBe(3n);
  });

  it("many independent varying entities still start as one group (no enumeration)", () => {
    const level: LevelDef = {
      width: 10,
      height: 10,
      walls: [],
      goals: [],
      axes: Array.from({ length: 5 }, (_, i) => ({ id: `axis${i}`, size: 3 })),
      player: { x: 0, y: 0 },
      boxes: Object.fromEntries(
        Array.from({ length: 5 }, (_, i) => [`box${i}`, variantEntity(`axis${i}`, (v) => ({ x: v, y: i + 1 }))]),
      ),
    };
    const mv = new Multiverse(level);
    // 5 independently-varying boxes over 3 values each = 3^5 = 243 theoretical
    // combinations, but nothing has been observed yet, so still one group -
    // and no per-universe list was ever built to get there.
    const groups = mv.getGroups();
    expect(groups).toHaveLength(1);
    expect(mv.groupMultiplicity(groups[0])).toBe(243n);
  });

  it("moving through empty cells never splits the group", () => {
    const mv = new Multiverse(sampleLevel);
    mv.step("Up"); // (2,4) -> (2,3), empty in every universe
    expect(mv.getGroups()).toHaveLength(1);
    for (const boxAxis of [0, 1, 2]) {
      expect(mv.getUniverseView({ boxAxis }).player).toEqual({ x: 2, y: 3 });
    }
  });

  it("splits only along the relevant axis when reaching a box that differs", () => {
    const mv = new Multiverse(sampleLevel);
    mv.step("Up"); // -> (2,3)
    mv.step("Up"); // -> target (2,2): box present only when boxAxis === 0

    const groups = mv.getGroups();
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => mv.groupMultiplicity(g)).sort()).toEqual([1n, 2n]);

    // boxAxis 0: box got pushed onto the goal
    expect(mv.getUniverseView({ boxAxis: 0 }).player).toEqual({ x: 2, y: 2 });
    expect(mv.getUniverseView({ boxAxis: 0 }).boxes.get("b")).toEqual({ x: 2, y: 1 });

    // boxAxis 1/2: nothing there, player just walked in; box untouched
    expect(mv.getUniverseView({ boxAxis: 1 }).player).toEqual({ x: 2, y: 2 });
    expect(mv.getUniverseView({ boxAxis: 1 }).boxes.get("b")).toEqual({ x: 3, y: 2 });
    expect(mv.getUniverseView({ boxAxis: 2 }).boxes.get("b")).toEqual({ x: 4, y: 2 });
  });

  it("re-merges branches once they reach an identical state", () => {
    const mv = new Multiverse(sampleLevel);
    mv.step("Up");
    mv.step("Up"); // splits into {boxAxis 0} and {boxAxis 1,2}
    mv.step("Right"); // boxAxis 1 pushes its box to (4,2); boxAxis 2 just walks to (3,2) with its box already at (4,2)

    const groups = mv.getGroups();
    expect(groups).toHaveLength(2);
    // one group (boxAxis 0, multiplicity 1) and one merged group (boxAxis {1,2}, multiplicity 2)
    expect(groups.map((g) => mv.groupMultiplicity(g)).sort()).toEqual([1n, 2n]);

    expect(mv.getUniverseView({ boxAxis: 1 }).player).toEqual({ x: 3, y: 2 });
    expect(mv.getUniverseView({ boxAxis: 1 }).boxes.get("b")).toEqual({ x: 4, y: 2 });
    expect(mv.getUniverseView({ boxAxis: 2 }).player).toEqual({ x: 3, y: 2 });
    expect(mv.getUniverseView({ boxAxis: 2 }).boxes.get("b")).toEqual({ x: 4, y: 2 });
  });

  it("undo restores the previous group configuration", () => {
    const mv = new Multiverse(sampleLevel);
    mv.step("Up");
    mv.step("Up"); // now split into 2 groups
    expect(mv.getGroups()).toHaveLength(2);

    expect(mv.undo()).toBe(true);
    expect(mv.getGroups()).toHaveLength(1);
    for (const boxAxis of [0, 1, 2]) {
      expect(mv.getUniverseView({ boxAxis }).player).toEqual({ x: 2, y: 3 });
    }

    expect(mv.undo()).toBe(true);
    expect(mv.getGroups()).toHaveLength(1);
    for (const boxAxis of [0, 1, 2]) {
      expect(mv.getUniverseView({ boxAxis }).player).toEqual({ x: 2, y: 4 });
    }

    expect(mv.undo()).toBe(false);
  });

  it("restart resets to the initial single group", () => {
    const mv = new Multiverse(sampleLevel);
    mv.step("Up");
    mv.step("Up");
    mv.restart();
    expect(mv.getGroups()).toHaveLength(1);
    expect(mv.canUndo()).toBe(false);
    expect(mv.getUniverseView({ boxAxis: 0 }).player).toEqual({ x: 2, y: 4 });
  });
});

describe("Multiverse - core Sokoban mechanics", () => {
  // A single-row corridor: walls above/below/at both ends, open at x=1..3.
  // No variation at all here - this is the plain single-universe case.
  const corridorLevel: LevelDef = {
    width: 5,
    height: 3,
    walls: [
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 },
      { x: 0, y: 1 }, { x: 4, y: 1 },
      { x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 },
    ],
    goals: [{ x: 3, y: 1 }],
    axes: [],
    player: { x: 1, y: 1 },
    boxes: {},
  };

  it("a wall blocks the player uniformly", () => {
    const mv = new Multiverse(corridorLevel);
    mv.step("Up");
    expect(mv.getGroups()).toHaveLength(1);
    expect(mv.getUniverseView({}).player).toEqual({ x: 1, y: 1 });
  });

  it("pushes a single box onto a goal and detects the win", () => {
    const level: LevelDef = { ...corridorLevel, boxes: { b: constantEntity({ x: 2, y: 1 }) } };
    const mv = new Multiverse(level);
    expect(mv.isSolved()).toBe(false);
    mv.step("Right"); // player (1,1) pushes box (2,1) -> (3,1), which is the goal
    expect(mv.getUniverseView({}).player).toEqual({ x: 2, y: 1 });
    expect(mv.getUniverseView({}).boxes.get("b")).toEqual({ x: 3, y: 1 });
    expect(mv.isSolved()).toBe(true);
  });

  it("refuses to push a box into another box", () => {
    const level: LevelDef = {
      ...corridorLevel,
      boxes: { a: constantEntity({ x: 2, y: 1 }), b: constantEntity({ x: 3, y: 1 }) },
    };
    const mv = new Multiverse(level);
    mv.step("Right"); // player pushes box "a" toward box "b" at (3,1) - blocked
    expect(mv.getUniverseView({}).player).toEqual({ x: 1, y: 1 });
    expect(mv.getUniverseView({}).boxes.get("a")).toEqual({ x: 2, y: 1 });
    expect(mv.getUniverseView({}).boxes.get("b")).toEqual({ x: 3, y: 1 });
  });
});

describe("Multiverse - correlated entities across universes", () => {
  it("preserves correlation between two entities that vary together", () => {
    // box "a" and box "b" share the same axis: whichever axis value you're
    // in, a.x === 1 + v and b.y === 1 + v. A split triggered by inspecting
    // "a" must not scramble "b"'s per-universe correlation.
    const level: LevelDef = {
      width: 6,
      height: 6,
      walls: [],
      goals: [],
      axes: [{ id: "shared", size: 3 }],
      player: { x: 0, y: 3 },
      boxes: {
        a: variantEntity("shared", (v) => ({ x: 1 + v, y: 3 })),
        b: variantEntity("shared", (v) => ({ x: 5, y: 1 + v })),
      },
    };
    const mv = new Multiverse(level);
    expect(mv.getGroups()).toHaveLength(1);

    mv.step("Right"); // reaches box "a" - differs per axis value, forces a split

    expect(mv.getGroups().length).toBeGreaterThan(1);
    for (const shared of [0, 1, 2]) {
      // box "b" must still reflect the same axis value's correlated value,
      // even though the split was triggered by box "a".
      expect(mv.getUniverseView({ shared }).boxes.get("b")).toEqual({ x: 5, y: 1 + shared });
    }
  });
});
