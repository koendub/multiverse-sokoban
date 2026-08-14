import { Assets, Rectangle, Texture } from "pixi.js";

const SHEET_URL = "/spritesheet.png";
const CELL = 128;
const TALL = CELL * 2;

export interface SpriteAtlas {
  /** 4 floor variants, index 0 most common down to index 3 rarest. */
  readonly floors: readonly Texture[];
  /** Ground tile used on goal cells instead of a floor variant. */
  readonly goalFloor: Texture;
  /** 128x256 - taller than one tile; anchor its bottom to the tile's bottom edge. For top/bottom edge walls. */
  readonly wallEdge: Texture;
  /** 128x256, front-facing edge wall for the *left* boundary. Flip horizontally (negative x scale) for the right boundary. */
  readonly wallEdgeVertical: Texture;
  /** 128x256, for a wall cell not on the level's outer boundary. */
  readonly wallMid: Texture;
  /** 128x256, same bottom-anchor treatment as walls. Tinted per entity at draw time rather than using multiple box textures. */
  readonly box: Texture;
  /** 128x256 each, player facing right/up/down. Facing left reuses `playerRight` flipped horizontally. */
  readonly playerRight: Texture;
  readonly playerUp: Texture;
  readonly playerDown: Texture;
}

function slice(base: Texture, x: number, y: number, w: number, h: number): Texture {
  return new Texture({ source: base.source, frame: new Rectangle(x, y, w, h) });
}

let cached: Promise<SpriteAtlas> | null = null;

/** Loads (once, cached) and slices the shared game spritesheet into named textures. */
export function loadSpriteAtlas(): Promise<SpriteAtlas> {
  cached ??= Assets.load<Texture>(SHEET_URL).then((base) => ({
    floors: [0, 1, 2, 3].map((i) => slice(base, i * CELL, 0, CELL, CELL)),
    goalFloor: slice(base, 4 * CELL, 0, CELL, CELL),
    wallEdge: slice(base, 0, CELL, CELL, TALL),
    wallEdgeVertical: slice(base, CELL, CELL, CELL, TALL),
    wallMid: slice(base, CELL, CELL * 3, CELL, TALL),
    box: slice(base, 0, CELL * 3, CELL, TALL),
    playerRight: slice(base, 2 * CELL, CELL * 3, CELL, TALL),
    playerUp: slice(base, 3 * CELL, CELL * 3, CELL, TALL),
    playerDown: slice(base, 4 * CELL, CELL * 3, CELL, TALL),
  }));
  return cached;
}

/** Earlier entries are more common: index 0 ~50%, 1 ~30%, 2 ~15%, 3 ~5%. */
const FLOOR_WEIGHTS = [0.5, 0.3, 0.15, 0.05];

/**
 * A deterministic pick in [0, weights.length) for a given grid cell -
 * deliberately not Math.random(), so a cell's floor variant stays the same
 * across re-renders instead of reshuffling on every game update.
 */
export function pickFloorIndex(x: number, y: number): number {
  const t = hash01(x, y);
  let acc = 0;
  for (let i = 0; i < FLOOR_WEIGHTS.length; i++) {
    acc += FLOOR_WEIGHTS[i];
    if (t < acc) return i;
  }
  return FLOOR_WEIGHTS.length - 1;
}

function hash01(x: number, y: number): number {
  let n = (x * 374761393 + y * 668265263) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  n ^= n >>> 16;
  return (n >>> 0) / 0xffffffff;
}
