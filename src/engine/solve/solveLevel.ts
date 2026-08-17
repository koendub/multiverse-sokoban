import type { DirectionName, EntityId } from "../multiverse/types.ts";
import { Direction } from "../multiverse/types.ts";
import type { EntitySpec } from "../multiverse/entities.ts";
import type { StateGroup } from "../multiverse/StateGroup.ts";
import { resolveMove } from "../multiverse/movement.ts";
import { canonicalSignature, mergeGroups } from "../multiverse/merge.ts";
import { groupsSolved } from "../multiverse/solved.ts";
import type { LevelDef } from "../levels/level.ts";
import { buildLevel } from "../levels/level.ts";

type Entities = ReadonlyMap<EntityId, EntitySpec>;

const ALL_DIRECTIONS: readonly DirectionName[] = ["Up", "Down", "Left", "Right"];

/** Safety valve against a pathologically large or genuinely-unsolvable level running forever - hand-authored levels here explore far fewer states than this. */
const MAX_VISITED_STATES = 2_000_000;

/** A whole multiverse state's identity for the search's visited set: every group's own signature (see merge.ts), order-independent since group order carries no meaning. */
function multiverseSignature(groups: readonly StateGroup[], entities: Entities): string {
  return groups
    .map((g) => canonicalSignature(g, entities))
    .sort()
    .join("||");
}

/**
 * Breadth-first search for the shortest move sequence that solves `level`.
 * BFS explores states in strict order of increasing move count, so the
 * first solved state it finds is guaranteed optimal.
 *
 * Operates on the same lazy StateGroup representation the live game uses
 * (resolveMove/mergeGroups) rather than a stateful Multiverse instance,
 * since the search branches 4 ways from every node and a mutable instance
 * can't represent "the same state, about to be explored down 4 different
 * paths" without cloning. It never enumerates individual universes either -
 * a "state" here is still a small set of StateGroups, exactly as the game
 * itself represents it.
 *
 * Returns `null` if the level is unsolvable, or if the search exceeds
 * MAX_VISITED_STATES before finding a solution.
 */
export function solveLevel(level: LevelDef): readonly DirectionName[] | null {
  const { grid, entities, initialGroup } = buildLevel(level);
  const startGroups = mergeGroups([initialGroup], entities);

  if (groupsSolved(startGroups, grid, entities)) return [];

  const visited = new Set<string>([multiverseSignature(startGroups, entities)]);
  const queue: { groups: readonly StateGroup[]; path: readonly DirectionName[] }[] = [{ groups: startGroups, path: [] }];

  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];

    for (const dir of ALL_DIRECTIONS) {
      const delta = Direction[dir];
      const expanded = node.groups.flatMap((g) => resolveMove(g, delta, grid, entities));
      const merged = mergeGroups(expanded, entities);

      const sig = multiverseSignature(merged, entities);
      if (visited.has(sig)) continue;
      visited.add(sig);

      const path = [...node.path, dir];
      if (groupsSolved(merged, grid, entities)) return path;
      if (visited.size > MAX_VISITED_STATES) return null;
      queue.push({ groups: merged, path });
    }
  }

  return null;
}
