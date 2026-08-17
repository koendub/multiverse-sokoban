import type { LevelCatalogEntry } from "./levelCatalog.ts";

const STORAGE_KEY = "multiverse-sokoban:levelNumber";

/** The level number to resume at: the last one saved, or the catalog's first. */
export function loadStoredLevelNumber(catalog: readonly LevelCatalogEntry[]): number {
  const fallback = catalog[0]?.number ?? 1;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return fallback;
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && catalog.some((entry) => entry.number === parsed)) return parsed;
  } catch {
    // localStorage unavailable (private browsing, disabled, etc.) - just don't persist.
  }
  return fallback;
}

export function saveLevelNumber(number: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(number));
  } catch {
    // ignore - progress just won't persist this session
  }
}
