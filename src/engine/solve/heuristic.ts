import type { EntityId, Vec2 } from "../multiverse/types.ts";
import { vecKey } from "../multiverse/types.ts";
import type { Grid } from "../multiverse/grid.ts";
import type { EntitySpec } from "../multiverse/entities.ts";
import type { StateGroup } from "../multiverse/StateGroup.ts";

type Entities = ReadonlyMap<EntityId, EntitySpec>;

const NEIGHBOR_OFFSETS: readonly Vec2[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
];

/**
 * Shortest-path distance (grid steps, walls-aware, but ignoring every box
 * and the player) from every reachable cell to its nearest goal - a single
 * multi-source BFS seeded from all goals at once. Computed once per level
 * and reused for the whole search: the static grid never changes, so this
 * doesn't need to be redone per state.
 *
 * A cell absent from the map is unreachable from every goal - a box stuck
 * there could never reach one no matter what, which solveLevel treats as
 * an immediate dead end (see multiverseHeuristic's Infinity case).
 */
export function buildGoalDistances(grid: Grid): ReadonlyMap<string, number> {
  const distances = new Map<string, number>();
  const queue: Vec2[] = [];

  for (const goal of grid.allGoals()) {
    const key = vecKey(goal);
    if (distances.has(key)) continue;
    distances.set(key, 0);
    queue.push(goal);
  }

  let head = 0;
  while (head < queue.length) {
    const cell = queue[head++];
    const dist = distances.get(vecKey(cell))!;
    for (const offset of NEIGHBOR_OFFSETS) {
      const next = { x: cell.x + offset.x, y: cell.y + offset.y };
      if (!grid.inBounds(next) || grid.isWall(next)) continue;
      const key = vecKey(next);
      if (distances.has(key)) continue;
      distances.set(key, dist + 1);
      queue.push(next);
    }
  }

  return distances;
}

function goalDistance(pos: Vec2, distances: ReadonlyMap<string, number>): number {
  return distances.get(vecKey(pos)) ?? Infinity;
}

/**
 * A lower bound on the moves still needed to solve `group` alone, exact
 * (not just a bound) up to the walls-only shortest-path approximation:
 * every box needs at least `goalDistance` pushes to reach a goal, and each
 * push is itself one move, so summing that per box is admissible - pushing
 * one box never helps another, and walking between boxes only adds moves
 * on top.
 *
 * Entities correlated on the same axis are handled together rather than
 * independently: naively summing each entity's own worst case would
 * overcount, since they can't actually take mismatched axis values at
 * once. Instead, for each axis this sums its entities' distances *per
 * remaining value* and takes the max over those values - the true worst
 * case among the universes this group still represents, not an
 * unreachable combination of them. Axes are independent of each other, so
 * summing each axis's own worst case across axes is still exact.
 */
function groupHeuristic(group: StateGroup, entities: Entities, distances: ReadonlyMap<string, number>): number {
  let fixedTotal = 0;
  const byAxis = new Map<string, { readonly positions: readonly (Vec2 | null)[] }[]>();

  for (const [id, spec] of entities) {
    if (spec.role !== "box") continue;

    const override = group.overrides.get(id);
    if (override) {
      fixedTotal += goalDistance(override, distances);
      continue;
    }
    if (spec.kind === "constant") {
      fixedTotal += goalDistance(spec.pos, distances);
      continue;
    }

    const list = byAxis.get(spec.axis) ?? [];
    list.push(spec);
    byAxis.set(spec.axis, list);
  }

  let total = fixedTotal;
  for (const [axisId, specs] of byAxis) {
    const subset = group.axisSubsets.get(axisId);
    if (!subset) continue;

    let worst = 0;
    for (const v of subset) {
      let sum = 0;
      for (const spec of specs) {
        const pos = spec.positions[v];
        if (pos !== null) sum += goalDistance(pos, distances);
      }
      worst = Math.max(worst, sum);
    }
    total += worst;
  }

  return total;
}

/**
 * The A* heuristic for a whole multiverse state: every group must end up
 * solved by the same shared move sequence, so the number of moves still
 * needed is at least whichever group needs the most - the max, not the
 * sum, of each group's own lower bound.
 */
export function multiverseHeuristic(groups: readonly StateGroup[], entities: Entities, distances: ReadonlyMap<string, number>): number {
  let worst = 0;
  for (const group of groups) {
    worst = Math.max(worst, groupHeuristic(group, entities, distances));
  }
  return worst;
}
