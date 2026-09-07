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
 * How a state was first reached: the move applied to `parent` (its
 * signature) that produced it. `null` only for the start state, which has
 * no move/parent of its own - the sentinel reconstructPath walks back to.
 */
interface VisitedEntry {
  readonly parent: string | null;
  readonly move: DirectionName | null;
}

/** Walks `visited`'s parent pointers from `sig` back to the start, collecting the move at each step - the inverse of however the search reached `sig`. */
function reconstructPath(visited: ReadonlyMap<string, VisitedEntry>, sig: string): DirectionName[] {
  const moves: DirectionName[] = [];
  let current = sig;
  for (;;) {
    const entry = visited.get(current)!;
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
 * Rather than carrying a full move-sequence array on every queued node
 * (allocating and copying an ever-longer array at every one of the
 * search's branches), `visited` doubles as a parent-pointer map: each state
 * records only the single move that reached it and its parent's signature.
 * The solution path is reconstructed once, by walking those pointers back
 * from the solved state - the same information, at O(1) per state instead
 * of O(depth), which is what lets this scale to much larger levels.
 *
 * Also prunes any state with a box wedged permanently into a corner off a
 * goal (see hasDeadlockedBox) - such a state can never lead to a solution,
 * so there's no point expanding it further.
 *
 * Returns `null` if the level is unsolvable, or if the search exceeds
 * MAX_VISITED_STATES before finding a solution.
 */
export function solveLevel(level: LevelDef): readonly DirectionName[] | null {
  const { grid, entities, initialGroup } = buildLevel(level);
  const startGroups = mergeGroups([initialGroup], entities);

  if (groupsSolved(startGroups, grid, entities)) return [];

  const startSig = multiverseSignature(startGroups, entities);
  const visited = new Map<string, VisitedEntry>([[startSig, { parent: null, move: null }]]);
  const queue: { groups: readonly StateGroup[]; sig: string }[] = [{ groups: startGroups, sig: startSig }];

  let head = 0;
  while (head < queue.length) {
    const node = queue[head++];

    for (const dir of ALL_DIRECTIONS) {
      const delta = Direction[dir];
      const expanded = node.groups.flatMap((g) => resolveMove(g, delta, grid, entities));
      const merged = mergeGroups(expanded, entities);

      const sig = multiverseSignature(merged, entities);
      if (visited.has(sig)) continue;
      visited.set(sig, { parent: node.sig, move: dir });

      if (groupsSolved(merged, grid, entities)) return reconstructPath(visited, sig);
      if (visited.size > MAX_VISITED_STATES) return null;
      if (hasDeadlockedBox(merged, grid, entities)) continue;
      queue.push({ groups: merged, sig });
    }
  }

  return null;
}
