import type { AxisId, AxisValue, EntityId, Vec2 } from "./types.ts";
import { vecAdd, vecEq } from "./types.ts";
import type { Grid } from "./grid.ts";
import type { EntitySpec } from "./entities.ts";
import type { StateGroup } from "./StateGroup.ts";
import { representativeValue, restrictGroupByAxis } from "./StateGroup.ts";

type Entities = ReadonlyMap<EntityId, EntitySpec>;

/**
 * If some variant entity's axis has values that partially agree with
 * `target` (some remaining axis values put it there, others don't), the
 * group is genuinely ambiguous about `target` and must split before we can
 * proceed. Returns the first such distinction found, restricted to just
 * that one axis - every other axis (and every other entity) is left
 * completely untouched, which is what keeps splits cheap and lazy.
 */
function findAmbiguity(group: StateGroup, target: Vec2, entities: Entities): { axis: AxisId; matching: Set<AxisValue> } | null {
  for (const [entityId, spec] of entities) {
    if (spec.kind !== "variant" || group.overrides.has(entityId)) continue;
    const subset = group.axisSubsets.get(spec.axis);
    if (!subset || subset.size <= 1) continue;
    const matching = new Set<AxisValue>();
    for (const v of subset) {
      if (vecEq(spec.valueFor(v), target)) matching.add(v);
    }
    if (matching.size > 0 && matching.size < subset.size) {
      return { axis: spec.axis, matching };
    }
  }
  return null;
}

/**
 * Which entity (if any) occupies `target`, given the group has already been
 * split so no entity is ambiguous about it (see findAmbiguity). Under that
 * guarantee, checking one representative value per entity is enough - if it
 * matches, every universe in the group agrees.
 */
function findOccupant(group: StateGroup, target: Vec2, entities: Entities): EntityId | null {
  for (const [entityId, spec] of entities) {
    if (vecEq(representativeValue(group, entityId, spec), target)) return entityId;
  }
  return null;
}

function splitOnAxis(group: StateGroup, axis: AxisId, matching: Set<AxisValue>): [StateGroup, StateGroup] {
  const subset = group.axisSubsets.get(axis)!;
  const rest = new Set([...subset].filter((v) => !matching.has(v)));
  return [restrictGroupByAxis(group, axis, matching, `${group.id}.a`), restrictGroupByAxis(group, axis, rest, `${group.id}.b`)];
}

/**
 * Applies one directional move to `group`, returning the resulting
 * sub-group(s). Only ever splits along the one axis an ambiguous decision
 * actually depends on - every other axis (and any entity that hasn't been
 * approached yet) is carried over unchanged.
 */
export function resolveMove(group: StateGroup, dir: Vec2, grid: Grid, entities: Entities): StateGroup[] {
  const target = vecAdd(group.player, dir);

  // The grid itself is shared/static in v1, so a wall blocks every universe
  // in the group uniformly - never a reason to split.
  if (grid.isBlocked(target)) {
    return [group];
  }

  const ambiguity = findAmbiguity(group, target, entities);
  if (ambiguity) {
    const [a, b] = splitOnAxis(group, ambiguity.axis, ambiguity.matching);
    return [...resolveMove(a, dir, grid, entities), ...resolveMove(b, dir, grid, entities)];
  }

  const occupant = findOccupant(group, target, entities);
  if (occupant === null) {
    return [{ ...group, player: target }];
  }

  // Target holds a box (uniformly, for every universe in this group): try to push it.
  const pushTarget = vecAdd(target, dir);
  if (grid.isBlocked(pushTarget)) {
    return [group]; // pushing into a wall/out of bounds fails for everyone in the group
  }

  const beyondAmbiguity = findAmbiguity(group, pushTarget, entities);
  if (beyondAmbiguity) {
    const [a, b] = splitOnAxis(group, beyondAmbiguity.axis, beyondAmbiguity.matching);
    return [...resolveMove(a, dir, grid, entities), ...resolveMove(b, dir, grid, entities)];
  }

  if (findOccupant(group, pushTarget, entities) !== null) {
    return [group]; // can't push a box into another box
  }

  const overrides = new Map(group.overrides);
  overrides.set(occupant, pushTarget);
  return [{ ...group, player: target, overrides }];
}
