import type { AxisId, AxisValue, EntityId, UniverseKey, Vec2 } from "../multiverse/types.ts";
import { deriveAxes, fullDomain } from "../multiverse/entities.ts";
import type { EntitySpec } from "../multiverse/entities.ts";
import { Grid } from "../multiverse/grid.ts";
import type { StateGroup } from "../multiverse/StateGroup.ts";

export interface LevelDef {
  readonly width: number;
  readonly height: number;
  readonly walls: readonly Vec2[];
  readonly goals: readonly Vec2[];
  /** Player starts identically in every universe. */
  readonly player: Vec2;
  /** Axes (which independent things vary, and how many ways) are never declared here - see deriveAxes. */
  readonly entities: Readonly<Record<EntityId, EntitySpec>>;
}

export interface BuiltLevel {
  readonly grid: Grid;
  readonly entities: ReadonlyMap<EntityId, EntitySpec>;
  readonly initialGroup: StateGroup;
}

function entityMap(level: LevelDef): ReadonlyMap<EntityId, EntitySpec> {
  return new Map(Object.entries(level.entities));
}

/**
 * Builds the static grid plus a *single* initial StateGroup covering every
 * universe: every axis starts at its full domain, so a level with millions
 * of theoretical universe combinations still starts as exactly one group,
 * with a handful of small per-axis sets - never an enumerated list.
 */
export function buildLevel(level: LevelDef): BuiltLevel {
  const grid = new Grid(level.width, level.height, level.walls, level.goals);
  const entities = entityMap(level);
  const axes = deriveAxes(entities);

  const axisSubsets = new Map<AxisId, ReadonlySet<AxisValue>>();
  for (const axis of axes) {
    axisSubsets.set(axis.id, new Set(fullDomain(axis)));
  }

  const initialGroup: StateGroup = {
    player: level.player,
    axisSubsets,
    overrides: new Map(),
  };

  return { grid, entities, initialGroup };
}

/** Product of every axis's domain size - the theoretical universe count. For display only. */
export function totalUniverseCount(level: LevelDef): bigint {
  return deriveAxes(entityMap(level)).reduce((total, axis) => total * BigInt(axis.size), 1n);
}

/**
 * The `index`th concrete universe (0-based), as a full per-axis key -
 * computed on demand via mixed-radix decomposition, never by enumerating
 * the ones before it. Distinct indices in `[0, totalUniverseCount(level))`
 * always produce distinct keys.
 */
export function universeKeyAt(level: LevelDef, index: number): UniverseKey {
  let remaining = index;
  const key: Record<AxisId, AxisValue> = {};
  for (const axis of deriveAxes(entityMap(level))) {
    key[axis.id] = remaining % axis.size;
    remaining = Math.floor(remaining / axis.size);
  }
  return key;
}
