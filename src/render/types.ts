// Plain rendering types. Deliberately independent of the simulation engine:
// nothing here knows about StateGroups, axes, or entity ids as anything
// other than opaque strings - that's what keeps this layer reusable and
// testable without the engine, and reusable for more than one board later.

export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * One "ghostable" thing to draw with a single color - the player, or one
 * box entity. When `positions` has more than one entry, every position is
 * drawn translucently on top of each other: that's how superposition across
 * universes is shown, without the renderer knowing anything about universes.
 */
export interface GhostLayer {
  readonly id: string;
  readonly color: number;
  readonly positions: readonly Point[];
}

/**
 * A fully self-contained description of one board. Grid dimensions and
 * cell lists only - no reference to how many universes or groups produced
 * it. `PixiBoard.update` can be called with any Scene, so the exact same
 * renderer draws either one board for the whole multiverse overlaid, or one
 * board per StateGroup shown side by side, depending on what the caller
 * builds.
 */
export interface Scene {
  readonly width: number;
  readonly height: number;
  readonly walls: readonly Point[];
  readonly goals: readonly Point[];
  readonly player: GhostLayer;
  readonly entities: readonly GhostLayer[];
}
