import { describe, expect, it } from "vitest";
import { totalUniverseCount, universeKeyAt } from "../levels/level.ts";
import type { LevelDef } from "../levels/level.ts";

const level: LevelDef = {
  width: 5,
  height: 5,
  walls: [],
  goals: [{ x: 0, y: 0 }],
  axes: [
    { id: "a", size: 2 },
    { id: "b", size: 3 },
  ],
  player: { x: 0, y: 0 },
  boxes: {},
};

describe("universeKeyAt", () => {
  it("stays within each axis's domain", () => {
    const total = Number(totalUniverseCount(level));
    for (let i = 0; i < total; i++) {
      const key = universeKeyAt(level, i);
      expect(key.a).toBeGreaterThanOrEqual(0);
      expect(key.a).toBeLessThan(2);
      expect(key.b).toBeGreaterThanOrEqual(0);
      expect(key.b).toBeLessThan(3);
    }
  });

  it("is a bijection over [0, total)", () => {
    const total = Number(totalUniverseCount(level));
    const seen = new Set<string>();
    for (let i = 0; i < total; i++) {
      const key = universeKeyAt(level, i);
      seen.add(`${key.a},${key.b}`);
    }
    expect(seen.size).toBe(total);
  });
});
