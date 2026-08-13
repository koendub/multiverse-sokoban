import type { AxisId, AxisValue } from "./types.ts";

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
