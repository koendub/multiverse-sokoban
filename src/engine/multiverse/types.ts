// Core primitive types shared across the engine.

export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export function vecEq(a: Vec2, b: Vec2): boolean {
  return a.x === b.x && a.y === b.y;
}

export function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vecKey(v: Vec2): string {
  return `${v.x},${v.y}`;
}

export const Direction = {
  Up: { x: 0, y: -1 },
  Down: { x: 0, y: 1 },
  Left: { x: -1, y: 0 },
  Right: { x: 1, y: 0 },
} as const satisfies Record<string, Vec2>;

export type DirectionName = keyof typeof Direction;

/** Identifies an independent source of variation (see axis.ts). */
export type AxisId = string;

/** One value in an axis's small domain, e.g. "which of 9 starting spots". */
export type AxisValue = number;

/** Identifies an entity (box, later door/button/...) tracked across universes. */
export type EntityId = string;

/**
 * A full assignment of one value per axis - i.e. the identity of one
 * specific concrete universe. Only ever built on demand (e.g. to render one
 * universe); never stored in bulk, since the number of possible keys is the
 * product of every axis's domain size and can be huge.
 */
export type UniverseKey = Readonly<Record<AxisId, AxisValue>>;
