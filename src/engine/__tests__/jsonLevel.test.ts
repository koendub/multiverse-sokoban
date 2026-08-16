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

  it("parses a constant box entity, defaulting nothing about its role", () => {
    const json: LevelJson = {
      number: 2,
      name: "Test",
      grid: baseGrid,
      entities: { b: { type: "box", pos: { x: 2, y: 1 } } },
    };
    const { level } = parseLevelJson(json);
    expect(level.entities.b).toEqual({ role: "box", kind: "constant", pos: { x: 2, y: 1 } });
  });

  it("parses a constant wall entity", () => {
    const json: LevelJson = {
      number: 2,
      name: "Test",
      grid: baseGrid,
      entities: { w: { type: "wall", pos: { x: 2, y: 1 } } },
    };
    const { level } = parseLevelJson(json);
    expect(level.entities.w).toEqual({ role: "wall", kind: "constant", pos: { x: 2, y: 1 } });
  });

  it("parses a variant entity and preserves per-axis-value positions", () => {
    const json: LevelJson = {
      number: 3,
      name: "Test",
      grid: baseGrid,
      entities: {
        b: {
          type: "box",
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
    const spec = level.entities.b;
    if (spec.kind !== "variant") throw new Error("expected variant");
    expect(spec.positions[0]).toEqual({ x: 1, y: 1 });
    expect(spec.positions[2]).toEqual({ x: 3, y: 1 });
  });

  it("infers an axis's size from its entity's position count - no separate axis declaration needed", () => {
    const json: LevelJson = {
      number: 3,
      name: "Test",
      grid: baseGrid,
      entities: {
        b: { type: "box", axis: "a", positions: [{ x: 1, y: 1 }, { x: 2, y: 1 }, null] },
      },
    };
    const { level } = parseLevelJson(json);
    const mv = new Multiverse(level);
    expect(mv.groupMultiplicity(mv.getGroups()[0])).toBe(3n);
  });

  it("preserves a null position, meaning the entity is absent at that axis value", () => {
    const json: LevelJson = {
      number: 3,
      name: "Test",
      grid: baseGrid,
      entities: { b: { type: "box", axis: "a", positions: [{ x: 1, y: 1 }, null] } },
    };
    const { level } = parseLevelJson(json);
    const spec = level.entities.b;
    if (spec.kind !== "variant") throw new Error("expected variant");
    expect(spec.positions[1]).toBeNull();
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

  it("rejects an unknown entity type", () => {
    const json = { number: 1, name: "Test", grid: baseGrid, entities: { b: { type: "door", pos: { x: 1, y: 1 } } } } as unknown as LevelJson;
    expect(() => parseLevelJson(json)).toThrow(/unknown type/);
  });

  it("rejects two entities sharing an axis with different position counts", () => {
    const json: LevelJson = {
      number: 1,
      name: "Test",
      grid: baseGrid,
      entities: {
        a: { type: "box", axis: "shared", positions: [{ x: 1, y: 1 }, { x: 2, y: 1 }] },
        b: { type: "box", axis: "shared", positions: [{ x: 1, y: 1 }] },
      },
    };
    expect(() => parseLevelJson(json)).toThrow(/axis "shared"/);
  });

  it("rejects an out-of-bounds entity position", () => {
    const json: LevelJson = {
      number: 1,
      name: "Test",
      grid: baseGrid,
      entities: { b: { type: "box", pos: { x: 99, y: 99 } } },
    };
    expect(() => parseLevelJson(json)).toThrow(/out of bounds/);
  });

  it("defaults every view to unrestricted when 'views' is omitted", () => {
    const parsed = parseLevelJson({ number: 1, name: "Test", grid: baseGrid });
    expect(parsed.views).toEqual({ merged: "unrestricted", perCharacter: "unrestricted", perUniverse: "unrestricted" });
  });

  it("parses partial view restrictions, defaulting the rest", () => {
    const json: LevelJson = { number: 1, name: "Test", grid: baseGrid, views: { perUniverse: "disabled" } };
    const parsed = parseLevelJson(json);
    expect(parsed.views).toEqual({ merged: "unrestricted", perCharacter: "unrestricted", perUniverse: "disabled" });
  });

  it("parses a 'before-moves' view restriction", () => {
    const json: LevelJson = { number: 1, name: "Test", grid: baseGrid, views: { merged: "before-moves" } };
    expect(parseLevelJson(json).views.merged).toBe("before-moves");
  });

  it("rejects an invalid view restriction value", () => {
    const json = { number: 1, name: "Test", grid: baseGrid, views: { merged: "sometimes" } } as unknown as LevelJson;
    expect(() => parseLevelJson(json)).toThrow(/views.merged/);
  });
});
