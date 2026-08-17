import type { DirectionName } from "../multiverse/types.ts";

const ARROWS: Readonly<Record<DirectionName, string>> = { Up: "↑", Down: "↓", Left: "←", Right: "→" };

/** A move sequence as arrows, e.g. ["Right", "Up"] -> "→ ↑" - shared by the in-app solver panel and the `npm run solve` CLI. */
export function formatMoves(moves: readonly DirectionName[]): string {
  return moves.map((dir) => ARROWS[dir]).join(" ");
}
