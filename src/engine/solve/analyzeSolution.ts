import type { DirectionName } from "../multiverse/types.ts";
import type { StateGroup } from "../multiverse/StateGroup.ts";
import { Multiverse } from "../multiverse/Multiverse.ts";
import type { LevelDef } from "../levels/level.ts";

export interface SolutionStats {
  readonly moveCount: number;
  /** The most StateGroups simultaneously active at any point while running the moves (initial state included). */
  readonly maxStateGroups: number;
  /** The most distinct player locations simultaneously represented (across active groups) at any point while running the moves (initial state included). */
  readonly maxPlayerLocations: number;
}

function distinctPlayerLocations(groups: readonly StateGroup[]): number {
  return new Set(groups.map((g) => `${g.player.x},${g.player.y}`)).size;
}

/**
 * Replays `moves` on a fresh Multiverse and gathers stats about the run -
 * kept separate from however the move sequence was produced (an optimal
 * search, a hand-authored solution, anything) so it's reusable wherever a
 * "how did this play out" summary is useful, not just for solveLevel.ts.
 */
export function analyzeSolution(level: LevelDef, moves: readonly DirectionName[]): SolutionStats {
  const mv = new Multiverse(level);

  let maxStateGroups = mv.getGroups().length;
  let maxPlayerLocations = distinctPlayerLocations(mv.getGroups());

  for (const dir of moves) {
    mv.step(dir);
    const groups = mv.getGroups();
    maxStateGroups = Math.max(maxStateGroups, groups.length);
    maxPlayerLocations = Math.max(maxPlayerLocations, distinctPlayerLocations(groups));
  }

  return { moveCount: moves.length, maxStateGroups, maxPlayerLocations };
}
