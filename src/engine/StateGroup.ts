import type { AxisId, AxisValue, EntityId, GroupId, Vec2 } from "./types.ts";
import type { EntitySpec } from "./entities.ts";

/**
 * A set of universes that currently share equivalent state for simulation
 * purposes. Universes are never listed individually - a group only tracks,
 * per axis, the *remaining possible values* (a small set bounded by that
 * axis's own domain, not by how many universes exist).
 *
 * - player is always uniform: any divergence in player position is, by
 *   construction, resolved into a split at the moment it happens (see
 *   movement.ts), so a group never needs to represent varying player
 *   positions.
 * - axisSubsets holds, for every axis declared by the level, the values
 *   still possible within this group. An entity whose axis subset has more
 *   than one value is still "unobserved": it hasn't caused a split yet.
 * - overrides holds entities that have diverged from their axis formula
 *   (typically because they were pushed) - from that point on they're a
 *   single fixed position for the whole group, independent of any axis.
 */
export interface StateGroup {
  readonly id: GroupId;
  readonly player: Vec2;
  readonly axisSubsets: ReadonlyMap<AxisId, ReadonlySet<AxisValue>>;
  readonly overrides: ReadonlyMap<EntityId, Vec2>;
}

export function restrictGroupByAxis(group: StateGroup, axis: AxisId, subset: ReadonlySet<AxisValue>, id: GroupId): StateGroup {
  const axisSubsets = new Map(group.axisSubsets);
  axisSubsets.set(axis, subset);
  return { id, player: group.player, axisSubsets, overrides: group.overrides };
}

/**
 * One distinct outcome (value) an entity can currently take within `group`,
 * and the axis values (if any) that produce it - used to decide whether a
 * decision needs to split the group. `axisValues` is empty for constant or
 * overridden entities, which are always uniform across the whole group.
 */
export interface EntityOutcome {
  readonly value: Vec2;
  readonly axisValues: readonly AxisValue[];
}

export function entityOutcomes(group: StateGroup, entityId: EntityId, spec: EntitySpec): EntityOutcome[] {
  const override = group.overrides.get(entityId);
  if (override) return [{ value: override, axisValues: [] }];
  if (spec.kind === "constant") return [{ value: spec.pos, axisValues: [] }];

  const subset = group.axisSubsets.get(spec.axis) ?? new Set<AxisValue>();
  const buckets = new Map<string, { value: Vec2; axisValues: AxisValue[] }>();
  for (const v of subset) {
    const value = spec.valueFor(v);
    const key = `${value.x},${value.y}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { value, axisValues: [] };
      buckets.set(key, bucket);
    }
    bucket.axisValues.push(v);
  }
  return [...buckets.values()];
}

/** The entity's current value, assuming it's already uniform within the group (see movement.ts's split check). */
export function representativeValue(group: StateGroup, entityId: EntityId, spec: EntitySpec): Vec2 {
  const override = group.overrides.get(entityId);
  if (override) return override;
  if (spec.kind === "constant") return spec.pos;
  const subset = group.axisSubsets.get(spec.axis);
  const first = subset?.values().next();
  if (!first || first.done) throw new Error(`Axis "${spec.axis}" has no remaining values in group ${group.id}`);
  return spec.valueFor(first.value);
}
