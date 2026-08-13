import { describe, expect, it } from "vitest";
import { parseLevelJson } from "../levels/jsonLevel.ts";
import type { LevelJson } from "../levels/jsonLevel.ts";
import { Multiverse } from "../multiverse/Multiverse.ts";
import type { DirectionName } from "../multiverse/types.ts";

/**
 * One known-good move sequence per bundled level, verified here by
 * replaying it end to end and checking `isSolved()`. This is the
 * regression guard for level content itself: if a level file is edited and
 * becomes unsolvable (or the solution goes stale), this test catches it.
 *
 * Levels are discovered dynamically (whatever's currently in
 * src/content/levels/), so this stays correct as levels are added or
 * removed - it just requires a matching entry here for each one.
 */
const solutions: Record<string, readonly DirectionName[]> = {
  "1_introduction.json": [
    "Up", "Up", "Up", "Right", "Right", "Right", "Down", "Left", "Left",
    "Right", "Right", "Right", "Down", "Down", "Left", "Left", "Left", "Left",
    "Up", "Up",
  ],
  "2_twin_boxes.json": ["Up", "Up", "Up", "Left", "Left", "Right", "Right", "Down", "Down", "Left", "Left"],
  "3_correlated_pair.json": [
    "Right", "Right", "Right", "Right", "Right", "Left", "Left", "Left", "Left", "Down", "Right", "Right", "Right", "Right",
  ],
};

const levelModules = import.meta.glob("../../content/levels/*.json", { eager: true, import: "default" }) as Record<string, LevelJson>;

const levels = Object.entries(levelModules).map(([path, json]) => ({
  file: path.split("/").pop()!,
  json,
}));

describe("bundled levels", () => {
  it("has exactly one recorded solution per level file", () => {
    expect(Object.keys(solutions).sort()).toEqual(levels.map((l) => l.file).sort());
  });

  it("numbers are unique and sequential starting at 1", () => {
    const numbers = levels.map(({ json }) => json.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: levels.length }, (_, i) => i + 1));
  });

  it("names are unique and non-empty", () => {
    const names = levels.map(({ json }) => json.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((n) => n.trim().length > 0)).toBe(true);
  });

  for (const { file, json } of levels) {
    it(`${file} is solved by its recorded solution`, () => {
      const { level } = parseLevelJson(json);
      const mv = new Multiverse(level);
      expect(mv.isSolved()).toBe(false);

      for (const dir of solutions[file]) mv.step(dir);

      expect(mv.isSolved()).toBe(true);
    });
  }
});
