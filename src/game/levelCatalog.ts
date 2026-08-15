import type { LevelDef } from "../engine/levels/level.ts";
import type { LevelJson, LevelViews } from "../engine/levels/jsonLevel.ts";
import { parseLevelJson } from "../engine/levels/jsonLevel.ts";

export interface LevelCatalogEntry {
  readonly number: number;
  readonly name: string;
  readonly text?: string;
  readonly great?: number;
  readonly perfect?: number;
  readonly views: LevelViews;
  readonly level: LevelDef;
}

// Every JSON file under src/content/levels/ is a level - bundled and parsed
// once at startup. Adding a new file automatically adds a level; nothing
// else needs to list them.
const levelModules = import.meta.glob("../content/levels/*.json", { eager: true, import: "default" }) as Record<string, LevelJson>;

let cached: readonly LevelCatalogEntry[] | null = null;

/** All bundled levels, sorted by number ascending. */
export function getLevelCatalog(): readonly LevelCatalogEntry[] {
  if (!cached) {
    cached = Object.values(levelModules)
      .map((json) => {
        const { number, name, text, great, perfect, views, level } = parseLevelJson(json);
        return { number, name, text, great, perfect, views, level };
      })
      .sort((a, b) => a.number - b.number);
  }
  return cached;
}
