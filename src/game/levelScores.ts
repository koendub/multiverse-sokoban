const STORAGE_KEY = "multiverse-puzzles:bestMoves";

export type BestMovesByLevel = Readonly<Record<number, number>>;

function readAll(): Record<number, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as Record<number, number>;
  } catch {
    // localStorage unavailable, or corrupt JSON - just start fresh.
  }
  return {};
}

/** Every level's best (lowest) recorded move count, keyed by level number. */
export function getAllBestMoves(): BestMovesByLevel {
  return readAll();
}

/**
 * Records a solve of `moves` steps for `levelNumber`, keeping whichever is
 * lower if a best already exists. Returns the full updated map, so callers
 * can use it directly as new UI state without a separate re-read.
 */
export function recordSolve(levelNumber: number, moves: number): BestMovesByLevel {
  const all = readAll();
  const existing = all[levelNumber];
  if (existing !== undefined && existing <= moves) return all;

  const next = { ...all, [levelNumber]: moves };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore - this solve's score just won't persist
  }
  return next;
}
