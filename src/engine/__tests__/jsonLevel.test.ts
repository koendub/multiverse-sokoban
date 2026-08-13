import { describe, expect, it } from "vitest";
import { parseLevelJson } from "../levels/jsonLevel.ts";
import type { LevelJson } from "../levels/jsonLevel.ts";
import { Multiverse } from "../multiverse/Multiverse.ts";

const baseGrid = ["#####", "#G.P#", "#####"];

describe("parseLevelJson", () => {
  it("parses walls, goals and player from the grid mask", () => {
    const { level } = parseLevelJson({ number: 1, name: "Test", grid: baseGrid });
    expect(level.width).toBe(5);
    expect(level.height).toBe(3);
    expect(level.player).toEqual({ x: 3, y: 1 });
    expect(level.goals).toEqual([{ x: 1, y: 1 }]);
    expect(level.walls).toHaveLength(5 * 3 - 3); // everything except G, ., P
  });

  it("parses a constant box", () => {
    const json: LevelJson = {
      number: 2,
      name: "Test",
      grid: baseGrid,
      boxes: { b: { type: "constant", pos: { x: 2, y: 1 } } },
    };
    const { level } = parseLevelJson(json);
    expect(level.boxes.b).toEqual({ kind: "constant", pos: { x: 2, y: 1 } });
  });

  it("parses a variant box and preserves per-axis-value positions", () => {
    const json: LevelJson = {
      number: 3,
      name: "Test",
      grid: baseGrid,
      axes: [{ id: "a", size: 3 }],
      boxes: {
        b: {
          type: "variant",
          axis: "a",
          positions: [
            { x: 1, y: 1 },
            { x: 2, y: 1 },
            { x: 3, y: 1 },
          ],
        },
      },
    };
    const { level } = parseLevelJson(json);
    const spec = level.boxes.b;
    if (spec.kind !== "variant") throw new Error("expected variant");
    expect(spec.positions[0]).toEqual({ x: 1, y: 1 });
    expect(spec.positions[2]).toEqual({ x: 3, y: 1 });
  });

  it("carries number/name metadata separately from the simulation LevelDef", () => {
    const parsed = parseLevelJson({ number: 7, name: "Seven", grid: baseGrid });
    expect(parsed.number).toBe(7);
    expect(parsed.name).toBe("Seven");
  });

  it("produces a LevelDef that Multiverse can load directly", () => {
    const { level } = parseLevelJson({ number: 1, name: "Test", grid: baseGrid });
    expect(() => new Multiverse(level)).not.toThrow();
  });

  it("rejects rows of inconsistent length", () => {
    expect(() => parseLevelJson({ number: 1, name: "Test", grid: ["####", "#G.P#", "####"] })).toThrow(/length/);
  });

  it("rejects a grid with no player", () => {
    expect(() => parseLevelJson({ number: 1, name: "Test", grid: ["###", "#G#", "###"] })).toThrow(/player/);
  });

  it("rejects a grid with more than one player", () => {
    expect(() => parseLevelJson({ number: 1, name: "Test", grid: ["#####", "#PGP#", "#####"] })).toThrow(/multiple player/);
  });

  it("rejects a grid with no goals", () => {
    expect(() => parseLevelJson({ number: 1, name: "Test", grid: ["###", "#P#", "###"] })).toThrow(/goals/);
  });

  it("rejects an unknown grid character", () => {
    expect(() => parseLevelJson({ number: 1, name: "Test", grid: ["###", "#X#", "###"] })).toThrow(/unknown grid character/);
  });

  it("rejects a variant box referencing an unknown axis", () => {
    const json: LevelJson = {
      number: 1,
      name: "Test",
      grid: baseGrid,
      boxes: { b: { type: "variant", axis: "missing", positions: [{ x: 1, y: 1 }] } },
    };
    expect(() => parseLevelJson(json)).toThrow(/unknown axis/);
  });

  it("rejects a variant box with the wrong number of positions", () => {
    const json: LevelJson = {
      number: 1,
      name: "Test",
      grid: baseGrid,
      axes: [{ id: "a", size: 3 }],
      boxes: { b: { type: "variant", axis: "a", positions: [{ x: 1, y: 1 }] } },
    };
    expect(() => parseLevelJson(json)).toThrow(/needs exactly 3 positions/);
  });

  it("rejects an out-of-bounds box position", () => {
    const json: LevelJson = {
      number: 1,
      name: "Test",
      grid: baseGrid,
      boxes: { b: { type: "constant", pos: { x: 99, y: 99 } } },
    };
    expect(() => parseLevelJson(json)).toThrow(/out of bounds/);
  });
});
