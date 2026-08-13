import { describe, expect, it } from "vitest";
import { getLevelCatalog } from "../levelCatalog.ts";
import { loadStoredLevelNumber } from "../levelProgress.ts";

describe("getLevelCatalog", () => {
  it("loads every bundled level file, sorted by number", () => {
    const catalog = getLevelCatalog();
    expect(catalog.map((e) => e.number)).toEqual(Array.from({ length: catalog.length }, (_, i) => i + 1));
    expect(catalog.length).toBeGreaterThanOrEqual(3);
  });

  it("gives every level a non-empty name and a playable LevelDef", () => {
    for (const entry of getLevelCatalog()) {
      expect(entry.name.trim().length).toBeGreaterThan(0);
      expect(entry.level.width).toBeGreaterThan(0);
      expect(entry.level.height).toBeGreaterThan(0);
    }
  });
});

describe("loadStoredLevelNumber", () => {
  it("falls back to the catalog's first level when storage is unavailable or empty", () => {
    const catalog = getLevelCatalog();
    expect(loadStoredLevelNumber(catalog)).toBe(catalog[0].number);
  });
});
