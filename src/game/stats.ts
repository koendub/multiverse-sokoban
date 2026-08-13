import type { Multiverse } from "../engine/multiverse/Multiverse.ts";
import type { LevelDef } from "../engine/levels/level.ts";
import { totalUniverseCount } from "../engine/levels/level.ts";

export interface MultiverseStats {
  readonly groupCount: number;
  readonly totalUniverses: bigint;
  readonly completedUniverses: bigint;
}

export function computeStats(mv: Multiverse, level: LevelDef): MultiverseStats {
  return {
    groupCount: mv.getGroups().length,
    totalUniverses: totalUniverseCount(level),
    completedUniverses: mv.solvedMultiplicity(),
  };
}
