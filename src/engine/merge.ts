import type { AxisId, AxisValue, EntityId, GroupId, Vec2 } from "./types.ts";
import { vecKey } from "./types.ts";
import type { EntitySpec } from "./entities.ts";
import type { StateGroup } from "./StateGroup.ts";
import { entityOutcomes } from "./StateGroup.ts";

type Entities = ReadonlyMap<EntityId, EntitySpec>;

/**
 * Equal for two groups exactly when they'd be indistinguishable for future
 * simulation: same player position, and for every entity the same *set of
 * distinct values* it could currently take. Which raw axis values produce
 * those distinct values doesn't matter for equality - only the union of
 * axis subsets changes once we actually merge.
 */
function canonicalSignature(group: StateGroup, entities: Entities): string {
  const parts = [...entities.entries()].map(([id, spec]) => {
    const values = entityOutcomes(group, id, spec)
      .map((o) => vecKey(o.value))
      .sort();
    return `${id}=${values.join(",")}`;
  });
  return `${vecKey(group.player)}|${parts.join(";")}`;
}

function mergeAxisSubsets(a: StateGroup, b: StateGroup): Map<AxisId, Set<AxisValue>> {
  const merged = new Map<AxisId, Set<AxisValue>>();
  const axisIds = new Set([...a.axisSubsets.keys(), ...b.axisSubsets.keys()]);
  for (const axisId of axisIds) {
    merged.set(axisId, new Set([...(a.axisSubsets.get(axisId) ?? []), ...(b.axisSubsets.get(axisId) ?? [])]));
  }
  return merged;
}

/**
 * An entity keeps its override in the merged group whenever either side had
 * one. That's always safe: canonicalSignature having matched means the
 * other side's axis-derived value(s) equal that same override across its
 * entire current subset, so fixing it as a single value is still correct -
 * and necessary, since falling back to the axis formula could reproduce a
 * stale (pre-push) position.
 */
function mergeOverride(a: StateGroup, b: StateGroup, entityId: EntityId): Vec2 | undefined {
  return a.overrides.get(entityId) ?? b.overrides.get(entityId);
}

function mergeTwoGroups(a: StateGroup, b: StateGroup, entities: Entities, id: GroupId): StateGroup {
  const overrides = new Map<EntityId, Vec2>();
  for (const entityId of entities.keys()) {
    const value = mergeOverride(a, b, entityId);
    if (value !== undefined) overrides.set(entityId, value);
  }
  return { id, player: a.player, axisSubsets: mergeAxisSubsets(a, b), overrides };
}

/**
 * Combines any groups that have become equivalent (e.g. two branches that
 * diverged over a wall, then both ended up at the same cell) back into one
 * group, so the group count stays proportional to meaningfully different
 * states rather than to history.
 */
export function mergeGroups(groups: readonly StateGroup[], entities: Entities, nextId: () => GroupId): StateGroup[] {
  const bySignature = new Map<string, StateGroup>();
  for (const group of groups) {
    const sig = canonicalSignature(group, entities);
    const existing = bySignature.get(sig);
    bySignature.set(sig, existing ? mergeTwoGroups(existing, group, entities, nextId()) : group);
  }
  return [...bySignature.values()];
}
