import type { AxisId, AxisValue, EntityId, Vec2 } from "../multiverse/types.ts";
import type { Axis } from "../multiverse/entities.ts";
import { fullDomain } from "../multiverse/entities.ts";
import type { EntitySpec } from "../multiverse/entities.ts";
import { Grid } from "../multiverse/grid.ts";
import type { StateGroup } from "../multiverse/StateGroup.ts";

export interface LevelDef {
  readonly width: number;
  readonly height: number;
  readonly walls: readonly Vec2[];
  readonly goals: readonly Vec2[];
  /** Independent sources of variation. Keep domains small - they're never multiplied together. */
  readonly axes: readonly Axis[];
  /** Player starts identically in every universe. */
  readonly player: Vec2;
  readonly boxes: Readonly<Record<EntityId, EntitySpec>>;
}

export interface BuiltLevel {
  readonly grid: Grid;
  readonly entities: ReadonlyMap<EntityId, EntitySpec>;
  readonly initialGroup: StateGroup;
}

/**
 * Builds the static grid plus a *single* initial StateGroup covering every
 * universe: every axis starts at its full domain, so a level with millions
 * of theoretical universe combinations still starts as exactly one group,
 * with a handful of small per-axis sets - never an enumerated list.
 */
export function buildLevel(level: LevelDef): BuiltLevel {
  const grid = new Grid(level.width, level.height, level.walls, level.goals);
  const entities = new Map<EntityId, EntitySpec>(Object.entries(level.boxes));

  const axisSubsets = new Map<AxisId, ReadonlySet<AxisValue>>();
  for (const axis of level.axes) {
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
  return level.axes.reduce((total, axis) => total * BigInt(axis.size), 1n);
}
