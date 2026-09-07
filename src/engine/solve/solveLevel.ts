import type { DirectionName, EntityId, Vec2 } from "../multiverse/types.ts";
import { Direction } from "../multiverse/types.ts";
import type { EntitySpec } from "../multiverse/entities.ts";
import type { StateGroup } from "../multiverse/StateGroup.ts";
import { entityOutcomes } from "../multiverse/StateGroup.ts";
import { resolveMove } from "../multiverse/movement.ts";
import { canonicalSignature, mergeGroups } from "../multiverse/merge.ts";
import { groupsSolved } from "../multiverse/solved.ts";
import type { Grid } from "../multiverse/grid.ts";
import type { LevelDef } from "../levels/level.ts";
import { buildLevel } from "../levels/level.ts";
import { buildGoalDistances, multiverseHeuristic } from "./heuristic.ts";
import { MinHeap } from "./minHeap.ts";

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
 * How a state was first settled: the move applied to `parent` (its
 * signature) that produced it. `null` only for the start state, which has
 * no move/parent of its own - the sentinel reconstructPath walks back to.
 */
interface SettledEntry {
  readonly parent: string | null;
  readonly move: DirectionName | null;
}

/** Walks `settled`'s parent pointers from `sig` back to the start, collecting the move at each step - the inverse of however the search reached `sig`. */
function reconstructPath(settled: ReadonlyMap<string, SettledEntry>, sig: string): DirectionName[] {
  const moves: DirectionName[] = [];
  let current = sig;
  for (;;) {
    const entry = settled.get(current)!;
    if (entry.move === null) break;
    moves.push(entry.move);
    current = entry.parent!;
  }
  return moves.reverse();
}

/** The 4 corners a box can be wedged into: each pair is one axis's wall (up/down) plus one perpendicular axis's wall (left/right) - not the two opposite walls on the same axis, which still leave the other axis free to push along. */
const CORNER_OFFSETS: readonly [Vec2, Vec2][] = [
  [{ x: 0, y: -1 }, { x: -1, y: 0 }],
  [{ x: 0, y: -1 }, { x: 1, y: 0 }],
  [{ x: 0, y: 1 }, { x: -1, y: 0 }],
  [{ x: 0, y: 1 }, { x: 1, y: 0 }],
];

/**
 * True if `pos` is wedged into a corner: a wall (or the level's edge) on
 * one of its perpendicular pairs of sides at once, e.g. directly above AND
 * directly left. Pushing a box needs the player standing on the opposite
 * side of the push, so once two perpendicular sides are blocked, all 4
 * pushes are impossible - the two blocked directions are blocked outright,
 * and the other two need the player standing *on* one of those same two
 * blocked cells. A box like that can never move again.
 */
function isCornered(pos: Vec2, grid: Grid): boolean {
  return CORNER_OFFSETS.some(
    ([a, b]) => grid.isBlocked({ x: pos.x + a.x, y: pos.y + a.y }) && grid.isBlocked({ x: pos.x + b.x, y: pos.y + b.y }),
  );
}

/**
 * True if some universe still possible in `groups` has a box permanently
 * cornered off a goal. Once that's true, no future move can ever solve
 * that universe, so the whole state - every group in it, since they all
 * have to end up solved together - is a dead end not worth searching
 * further (see solveLevel's main loop).
 */
function hasDeadlockedBox(groups: readonly StateGroup[], grid: Grid, entities: Entities): boolean {
  for (const group of groups) {
    for (const [id, spec] of entities) {
      if (spec.role !== "box") continue;
      for (const { value } of entityOutcomes(group, id, spec)) {
        if (value !== null && !grid.isGoal(value) && isCornered(value, grid)) return true;
      }
    }
  }
  return false;
}

interface QueueEntry {
  readonly groups: readonly StateGroup[];
  readonly sig: string;
  /** Moves taken to reach this state - A*'s "g". */
  readonly g: number;
  readonly parent: string | null;
  readonly move: DirectionName | null;
}

/**
 * Shortest (optimal) move sequence that solves `level`, found via A*.
 *
 * Operates on the same lazy StateGroup representation the live game uses
 * (resolveMove/mergeGroups) rather than a stateful Multiverse instance,
 * since the search branches 4 ways from every node and a mutable instance
 * can't represent "the same state, about to be explored down 4 different
 * paths" without cloning. It never enumerates individual universes either -
 * a "state" here is still a small set of StateGroups, exactly as the game
 * itself represents it.
 *
 * The open set is ordered by f = g + h, where h (see heuristic.ts) is each
 * box's walls-aware shortest-path distance to its nearest goal, combined
 * per group to account for correlated (same-axis) entities exactly rather
 * than overestimating them, and combined across groups by their *worst*
 * case - every group must end up solved by the same shared moves, so the
 * state needs at least as many moves as its most-demanding group. h is
 * admissible (never overestimates the true remaining distance, since
 * pushing one box can't help another, and it ignores obstructions that
 * could only make the real path longer) and consistent (one move changes
 * at most one box's distance by 1, matching its own cost of 1), so A*
 * finds the same optimal answer plain BFS would, just by looking at far
 * fewer states along the way once the heuristic can steer it.
 *
 * A state is only finalized in `settled` when it's *popped* as the open
 * set's current minimum - thanks to consistency, that pop is guaranteed to
 * be via the shortest path to it, so later, worse-g duplicates for the
 * same state can just be skipped rather than needing a decrease-key step.
 *
 * Also prunes any state with a box wedged permanently into a corner off a
 * goal (see hasDeadlockedBox), or with a box the goal-distance BFS never
 * reached at all (h is infinite) - neither can ever lead to a solution, so
 * there's no point expanding them further.
 *
 * Returns `null` if the level is unsolvable, or if the search settles more
 * than MAX_VISITED_STATES states before finding a solution.
 */
export function solveLevel(level: LevelDef): readonly DirectionName[] | null {
  const { grid, entities, initialGroup } = buildLevel(level);
  const startGroups = mergeGroups([initialGroup], entities);

  if (groupsSolved(startGroups, grid, entities)) return [];

  const distances = buildGoalDistances(grid);
  const startSig = multiverseSignature(startGroups, entities);

  const settled = new Map<string, SettledEntry>();
  const open = new MinHeap<QueueEntry>();
  open.push(multiverseHeuristic(startGroups, entities, distances), { groups: startGroups, sig: startSig, g: 0, parent: null, move: null });

  for (;;) {
    const node = open.pop();
    if (!node) return null;
    if (settled.has(node.sig)) continue; // a stale duplicate - already settled via an equal-or-shorter path

    settled.set(node.sig, { parent: node.parent, move: node.move });
    if (groupsSolved(node.groups, grid, entities)) return reconstructPath(settled, node.sig);
    if (settled.size > MAX_VISITED_STATES) return null;

    for (const dir of ALL_DIRECTIONS) {
      const delta = Direction[dir];
      const expanded = node.groups.flatMap((g) => resolveMove(g, delta, grid, entities));
      const merged = mergeGroups(expanded, entities);

      const sig = multiverseSignature(merged, entities);
      if (settled.has(sig)) continue;
      if (hasDeadlockedBox(merged, grid, entities)) continue;

      const h = multiverseHeuristic(merged, entities, distances);
      if (!Number.isFinite(h)) continue;

      const g = node.g + 1;
      open.push(g + h, { groups: merged, sig, g, parent: node.sig, move: dir });
    }
  }
}
