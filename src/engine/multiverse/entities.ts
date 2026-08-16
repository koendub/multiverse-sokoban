import type { AxisId, AxisValue, EntityId, Vec2 } from "./types.ts";

/**
 * An independent source of variation across universes, e.g. "which of 9
 * spots this box starts in". Domains are small (bounded by the number of
 * meaningfully different starting configurations for that one thing - in
 * practice at most a few dozen, never the product of unrelated axes).
 *
 * Two entities that should move together across universes (correlated)
 * simply reference the same axis. Two entities that vary independently get
 * separate axes - the engine never has to form their cross product, so
 * their group count multiplies out only once gameplay actually forces it.
 *
 * Axes are never declared up front - see `deriveAxes` below.
 */
export interface Axis {
  readonly id: AxisId;
  /** Domain is 0..size-1. */
  readonly size: number;
}

export function fullDomain(axis: Axis): AxisValue[] {
  return Array.from({ length: axis.size }, (_, i) => i);
}

/**
 * What kind of thing an entity is:
 * - "box": pushable, and (if present) must end up on a goal to solve the level.
 * - "wall": blocks movement like the static grid, but - unlike the grid -
 *   can be in different positions (or absent) per universe. Never pushable.
 */
export type EntityRole = "box" | "wall";

/**
 * How an entity's position is determined:
 * - "constant": same position in every universe.
 * - "variant": looked up from one axis's current value - `positions[v]` is
 *   the position at axis value `v`, or `null` if the entity simply isn't
 *   present in universes where that axis holds value `v`. Two entities
 *   sharing the same axis id stay correlated for free, since both are
 *   looked up against the same (small) set of remaining axis values. Plain
 *   data rather than a function, so levels - including ones loaded from
 *   config files - can declare it directly.
 *
 * Once a variant entity is actually pushed, its position for the owning
 * group is recorded as an override (see StateGroup.ts) and `positions`
 * stops being consulted for that group - it only matters for entities that
 * haven't been touched yet.
 */
export type EntitySpec =
  | { readonly role: EntityRole; readonly kind: "constant"; readonly pos: Vec2 }
  | { readonly role: EntityRole; readonly kind: "variant"; readonly axis: AxisId; readonly positions: readonly (Vec2 | null)[] };

export function constantEntity(pos: Vec2, role: EntityRole = "box"): EntitySpec {
  return { role, kind: "constant", pos };
}

/** `positions[v]` must exist for every value `v` in the axis's domain (0..size-1); `null` means "absent at that value". */
export function variantEntity(axis: AxisId, positions: readonly (Vec2 | null)[], role: EntityRole = "box"): EntitySpec {
  return { role, kind: "variant", axis, positions };
}

/**
 * Derives every axis's id and size purely from how entities use it - there's
 * no separate axis declaration to keep in sync. An axis's size is however
 * many positions its entities declare; every entity sharing an axis id must
 * declare the same number (that's what keeps them correlated), so a
 * mismatch is a level-definition bug, not something to silently resolve.
 */
export function deriveAxes(entities: ReadonlyMap<EntityId, EntitySpec>): Axis[] {
  const sizeByAxis = new Map<AxisId, number>();
  for (const [entityId, spec] of entities) {
    if (spec.kind !== "variant") continue;
    const existing = sizeByAxis.get(spec.axis);
    if (existing !== undefined && existing !== spec.positions.length) {
      throw new Error(
        `Axis "${spec.axis}" has conflicting sizes: entity "${entityId}" declares ${spec.positions.length} positions, but another entity on the same axis declared ${existing}`,
      );
    }
    sizeByAxis.set(spec.axis, spec.positions.length);
  }
  return [...sizeByAxis].map(([id, size]) => ({ id, size }));
}
