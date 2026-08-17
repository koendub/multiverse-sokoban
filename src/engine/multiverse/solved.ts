import type { EntityId } from "./types.ts";
import type { EntitySpec } from "./entities.ts";
import type { Grid } from "./grid.ts";
import type { StateGroup } from "./StateGroup.ts";
import { entityOutcomes } from "./StateGroup.ts";

/**
 * True once every box sits on a goal in every universe `groups` represents.
 * Walls never factor in, and a box that's absent (`null`) in a given
 * universe is trivially satisfied there - it doesn't need a goal to not be
 * sitting on.
 *
 * Pure and stateless (no Multiverse instance needed) so it works equally
 * well checking a live game's current groups (see Multiverse.isSolved) or
 * hypothetical groups a search is exploring (see solve/solveLevel.ts).
 */
export function groupsSolved(groups: readonly StateGroup[], grid: Grid, entities: ReadonlyMap<EntityId, EntitySpec>): boolean {
  return groups.every((group) =>
    [...entities].every(([id, spec]) => spec.role !== "box" || entityOutcomes(group, id, spec).every((o) => o.value === null || grid.isGoal(o.value))),
  );
}
