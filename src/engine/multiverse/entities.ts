import type { AxisId, AxisValue, Vec2 } from "./types.ts";

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
 * How a box's position is determined:
 * - "constant": same position in every universe.
 * - "variant": a pure function of one axis's current value. Two entities
 *   sharing the same axis id stay correlated for free, since both are
 *   evaluated against the same (small) set of remaining axis values.
 *
 * Once a variant entity is actually pushed, its position for the owning
 * group is recorded as an override (see StateGroup.ts) and this formula
 * stops being consulted for that group - it only matters for entities that
 * haven't been touched yet.
 */
export type EntitySpec =
  | { readonly kind: "constant"; readonly pos: Vec2 }
  | { readonly kind: "variant"; readonly axis: AxisId; readonly valueFor: (v: AxisValue) => Vec2 };

export function constantEntity(pos: Vec2): EntitySpec {
  return { kind: "constant", pos };
}

export function variantEntity(axis: AxisId, valueFor: (v: AxisValue) => Vec2): EntitySpec {
  return { kind: "variant", axis, valueFor };
}
