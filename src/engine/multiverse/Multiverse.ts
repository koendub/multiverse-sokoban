import type { DirectionName, EntityId, UniverseKey, Vec2 } from "./types.ts";
import { Direction } from "./types.ts";
import type { Grid } from "./grid.ts";
import type { EntitySpec } from "./entities.ts";
import type { StateGroup } from "./StateGroup.ts";
import { entityOutcomes, representativeValue } from "./StateGroup.ts";
import { resolveMove } from "./movement.ts";
import { mergeGroups } from "./merge.ts";
import type { LevelDef } from "../levels/level.ts";
import { buildLevel } from "../levels/level.ts";

export interface UniverseView {
  readonly player: Vec2;
  /** Every entity's position in this universe - `null` for one that isn't present here. */
  readonly entities: ReadonlyMap<EntityId, Vec2 | null>;
}

/**
 * Top-level simulation. Owns the static grid and the current set of
 * StateGroups, which together partition all possible universes - without
 * ever listing them. `step(dir)` applies one input to every universe
 * simultaneously: each existing group is resolved independently (lazily
 * splitting only along the one axis a real distinction depends on, see
 * movement.ts), and results are merged back together wherever they've
 * become equivalent (see merge.ts).
 */
export class Multiverse {
  readonly grid: Grid;
  readonly entities: ReadonlyMap<EntityId, EntitySpec>;

  private groups: StateGroup[];
  private readonly initialGroup: StateGroup;
  private history: StateGroup[][] = [];

  constructor(level: LevelDef) {
    const { grid, entities, initialGroup } = buildLevel(level);
    this.grid = grid;
    this.entities = entities;
    this.groups = [initialGroup];
    this.initialGroup = initialGroup;
  }

  /** Current groups. Their count reflects meaningfully-different states, not the theoretical universe count. */
  getGroups(): readonly StateGroup[] {
    return this.groups;
  }

  /** How many concrete universes a group currently stands for - a product of small counts, never enumerated. */
  groupMultiplicity(group: StateGroup): bigint {
    let total = 1n;
    for (const subset of group.axisSubsets.values()) total *= BigInt(subset.size);
    return total;
  }

  step(dir: DirectionName): void {
    const delta = Direction[dir];
    const expanded = this.groups.flatMap((g) => resolveMove(g, delta, this.grid, this.entities));
    const merged = mergeGroups(expanded, this.entities);
    this.history.push(this.groups);
    this.groups = merged;
  }

  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.groups = prev;
    return true;
  }

  restart(): void {
    this.groups = [this.initialGroup];
    this.history = [];
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  /**
   * True once every box sits on a goal in every universe currently
   * represented. Walls never factor in here, and a box that's absent
   * (`null`) in a given universe is trivially satisfied there - it doesn't
   * need a goal to not be sitting on.
   */
  isSolved(): boolean {
    return this.groups.every((group) =>
      [...this.entities].every(
        ([id, spec]) => spec.role !== "box" || entityOutcomes(group, id, spec).every((o) => o.value === null || this.grid.isGoal(o.value)),
      ),
    );
  }

  /**
   * How many currently-represented universes already have every box on a
   * goal. Computed per axis rather than by enumerating universes: since
   * axes vary independently, the count for a group is the product, over
   * each axis, of how many of its remaining values keep every entity that
   * depends on it on a goal (axes no entity depends on contribute their
   * full size unchanged).
   */
  solvedMultiplicity(): bigint {
    return this.groups.reduce((sum, group) => sum + this.groupSolvedMultiplicity(group), 0n);
  }

  private groupSolvedMultiplicity(group: StateGroup): bigint {
    const dependents = new Map<string, EntitySpec[]>();
    for (const [id, spec] of this.entities) {
      if (spec.role !== "box") continue; // walls never factor into solved-ness
      if (spec.kind === "constant" || group.overrides.has(id)) {
        const value = representativeValue(group, id, spec);
        if (value !== null && !this.grid.isGoal(value)) return 0n; // null (absent) is trivially satisfied
        continue;
      }
      const list = dependents.get(spec.axis) ?? [];
      list.push(spec);
      dependents.set(spec.axis, list);
    }

    let total = 1n;
    for (const [axisId, subset] of group.axisSubsets) {
      const deps = dependents.get(axisId);
      if (!deps) {
        total *= BigInt(subset.size);
        continue;
      }
      let satisfying = 0;
      for (const v of subset) {
        if (deps.every((spec) => spec.kind === "variant" && (spec.positions[v] === null || this.grid.isGoal(spec.positions[v]!)))) satisfying += 1;
      }
      total *= BigInt(satisfying);
      if (total === 0n) return 0n;
    }
    return total;
  }

  /**
   * Reconstructs one arbitrary representative universe's state for a group,
   * without needing a full axis assignment - handy for rendering "one board
   * per group" without caring exactly which universe it stands for.
   */
  getRepresentativeView(group: StateGroup): UniverseView {
    const entities = new Map<EntityId, Vec2 | null>();
    for (const [id, spec] of this.entities) entities.set(id, representativeValue(group, id, spec));
    return { player: group.player, entities };
  }

  /** Reconstructs one specific universe's state from a full per-axis key. */
  getUniverseView(key: UniverseKey): UniverseView {
    const group = this.groups.find((g) => [...g.axisSubsets].every(([axis, subset]) => !(axis in key) || subset.has(key[axis])));
    if (!group) throw new Error(`No group matches universe key ${JSON.stringify(key)}`);

    const entities = new Map<EntityId, Vec2 | null>();
    for (const [id, spec] of this.entities) {
      if (spec.kind === "constant" || group.overrides.has(id)) {
        entities.set(id, representativeValue(group, id, spec));
      } else {
        entities.set(id, spec.positions[key[spec.axis]]);
      }
    }
    return { player: group.player, entities };
  }
}
