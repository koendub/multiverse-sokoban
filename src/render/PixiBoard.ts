import { Application, Container, Sprite, Texture } from "pixi.js";
import type { Facing, GhostLayer, Point, Scene } from "./types.ts";
import { loadSpriteAtlas, pickFloorIndex } from "./sprites.ts";
import type { SpriteAtlas } from "./sprites.ts";

const MOVE_DURATION_MS = 100;

/** A player/box sprite that persists across updates, remembering which cell it's currently assigned to. */
interface GhostSprite {
  readonly sprite: Sprite;
  cell: Point;
}

/** An in-flight slide from one cell's screen position to another. */
interface Tween {
  readonly sprite: Sprite;
  readonly fromX: number;
  readonly fromY: number;
  readonly toX: number;
  readonly toY: number;
  readonly startedAt: number;
}

/**
 * Vanilla Pixi.js renderer for one Scene. Knows nothing about the
 * simulation - it only draws the plain cell/ghost data in Scene - so the
 * same class can back several boards on screen at once (one per StateGroup)
 * simply by mounting one PixiBoard per container.
 *
 * `tileSize` is mutable via `update()` rather than fixed at mount time:
 * callers that resize a board (e.g. the split view shrinking tiles as more
 * boards join) should keep reusing the same PixiBoard/canvas instead of
 * tearing down and recreating the whole Application, which is what causes
 * a visible flash.
 *
 * Floor and wall sprites never move, so they're simply destroyed and
 * redrawn on every update. Player/box sprites are different: to get a
 * short slide instead of an instant jump, each one *persists* across
 * updates (see `playerGhosts`/`entityGhosts`) and is matched to its new
 * cell by nearest distance (a branch's ghost moves at most one cell per
 * input, so proximity reliably identifies "the same ghost, just moved").
 * A matched ghost's position is animated toward its new cell over
 * `MOVE_DURATION_MS` via the Pixi ticker; only genuinely new/removed
 * ghosts (a split/merge, or the very first render) appear/disappear
 * instantly.
 */
export class PixiBoard {
  private readonly app: Application;
  private readonly root: Container;
  private readonly atlas: SpriteAtlas;
  private tileSize: number;

  private staticChildren: Container[] = [];
  private playerGhosts: GhostSprite[] = [];
  private entityGhosts = new Map<string, GhostSprite[]>();
  private tweens: Tween[] = [];

  private constructor(app: Application, root: Container, atlas: SpriteAtlas) {
    this.app = app;
    this.root = root;
    this.atlas = atlas;
    this.tileSize = 48;
    this.app.ticker.add(this.onTick);
  }

  static async mount(container: HTMLElement): Promise<PixiBoard> {
    const app = new Application();
    const [, atlas] = await Promise.all([
      app.init({
        backgroundAlpha: 0,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      }),
      loadSpriteAtlas(),
    ]);
    container.appendChild(app.canvas);

    const root = new Container();
    app.stage.addChild(root);
    return new PixiBoard(app, root, atlas);
  }

  update(scene: Scene, tileSize: number): void {
    this.tileSize = tileSize;
    const size = this.tileSize;
    const half = size / 2;
    const now = performance.now();

    // Wall (and box) sprites are 2 tiles tall and anchored to their cell's
    // bottom edge, so their top half pokes up into the row above - for row
    // 0 that would otherwise be clipped by the canvas's top edge. Only the
    // top gets padded by half a tile to give that overflow somewhere to go;
    // the other three sides sit flush against the grid.
    this.app.renderer.resize(scene.width * size, scene.height * size + half);
    this.root.position.set(0, half);

    for (const child of this.staticChildren) child.destroy();
    this.staticChildren = [];

    const wallSet = new Set(scene.walls.map((p) => key(p)));
    const goalSet = new Set(scene.goals.map((p) => key(p)));

    this.drawFloor(scene.width, scene.height, wallSet, goalSet, size);

    // Everything with height (walls, boxes, the player) is drawn in a single
    // pass ordered by row, back to front, so a tall sprite from a nearer
    // (larger-y) row correctly overlaps whatever's in the row above it,
    // rather than e.g. boxes always ending up in front of walls regardless
    // of position. `addChild` on a sprite that's already in `root` just
    // reorders it, so this works for both the fresh wall sprites and the
    // persisting ghost sprites.
    const depthSorted: { row: number; display: Container }[] = [];

    for (const cell of scene.walls) {
      const { texture, flip } = pickWallSprite(cell, scene.width, scene.height, this.atlas);
      const sprite = new Sprite(texture);
      // Bottom-row walls (including the bottom corners) sit half a tile
      // higher than every other tile - a deliberate visual offset, not tied
      // to the top-padding overflow handling above.
      const lift = cell.y === scene.height - 1 ? half : 0;
      placeTall(sprite, cell, size, flip, lift);
      this.staticChildren.push(sprite);
      depthSorted.push({ row: cell.y, display: sprite });
    }

    this.playerGhosts = this.reconcileGhosts(this.playerGhosts, scene.player, size, now, () => {
      const { texture, flip } = pickPlayerSprite(scene.playerFacing, this.atlas);
      return { texture, flip };
    });
    for (const g of this.playerGhosts) depthSorted.push({ row: g.cell.y, display: g.sprite });

    const nextEntityGhosts = new Map<string, GhostSprite[]>();
    for (const layer of scene.entities) {
      const updated = this.reconcileGhosts(this.entityGhosts.get(layer.id) ?? [], layer, size, now, () => ({
        texture: this.atlas.box,
        tint: layer.color,
      }));
      nextEntityGhosts.set(layer.id, updated);
      for (const g of updated) depthSorted.push({ row: g.cell.y, display: g.sprite });
    }
    for (const [id, ghosts] of this.entityGhosts) {
      if (nextEntityGhosts.has(id)) continue; // an entity id disappearing shouldn't normally happen, but clean up if it does
      for (const g of ghosts) this.discard(g.sprite);
    }
    this.entityGhosts = nextEntityGhosts;

    depthSorted.sort((a, b) => a.row - b.row);
    for (const item of depthSorted) this.root.addChild(item.display);
  }

  destroy(): void {
    this.app.ticker.remove(this.onTick);
    this.tweens = [];
    this.app.destroy({ removeView: true }, { children: true, texture: true });
  }

  private drawFloor(width: number, height: number, wallSet: ReadonlySet<string>, goalSet: ReadonlySet<string>, size: number): void {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (wallSet.has(key({ x, y }))) continue; // fully covered by the wall sprite
        const texture = goalSet.has(key({ x, y })) ? this.atlas.goalFloor : this.atlas.floors[pickFloorIndex(x, y)];
        const sprite = new Sprite(texture);
        sprite.x = x * size;
        sprite.y = y * size;
        sprite.width = size;
        sprite.height = size;
        this.root.addChild(sprite);
        this.staticChildren.push(sprite);
      }
    }
  }

  /**
   * Matches `layer`'s ghost positions against the sprites left over from
   * the previous update (by nearest cell), sliding continuing ones toward
   * their new cell and instantly creating/destroying the rest.
   */
  private reconcileGhosts(
    prev: readonly GhostSprite[],
    layer: GhostLayer,
    size: number,
    now: number,
    style: () => { texture: Texture; flip?: boolean; tint?: number },
  ): GhostSprite[] {
    const positions = layer.positions;
    const alpha = ghostAlpha(positions.length);
    const claimed = new Set<number>();
    const next: GhostSprite[] = [];

    for (const g of prev) {
      let bestIndex = -1;
      let bestDist = Infinity;
      positions.forEach((pos, i) => {
        if (claimed.has(i)) return;
        const d = Math.abs(pos.x - g.cell.x) + Math.abs(pos.y - g.cell.y);
        if (d < bestDist) {
          bestDist = d;
          bestIndex = i;
        }
      });
      if (bestIndex === -1) {
        this.discard(g.sprite);
        continue;
      }

      claimed.add(bestIndex);
      const cell = positions[bestIndex];
      const fromX = g.sprite.x;
      const fromY = g.sprite.y;
      this.applyGhostStyle(g.sprite, cell, size, alpha, style());
      const toX = g.sprite.x;
      const toY = g.sprite.y;
      // Drop any tween still in flight for this sprite before starting the
      // next one - otherwise, on rapid input, the old and new tweens both
      // keep writing to sprite.x/y every tick and fight over the result,
      // which looks like the sprite jumping around rather than sliding.
      this.tweens = this.tweens.filter((t) => t.sprite !== g.sprite);
      if (fromX !== toX || fromY !== toY) {
        // applyGhostStyle already moved the sprite to its final (toX,toY) -
        // put it back at the start so the very next painted frame shows it
        // there, and the ticker (see onTick) animates it forward from here.
        g.sprite.x = fromX;
        g.sprite.y = fromY;
        this.tweens.push({ sprite: g.sprite, fromX, fromY, toX, toY, startedAt: now });
      }
      next.push({ sprite: g.sprite, cell });
    }

    positions.forEach((pos, i) => {
      if (claimed.has(i)) return;
      const sprite = new Sprite();
      this.applyGhostStyle(sprite, pos, size, alpha, style());
      this.root.addChild(sprite);
      next.push({ sprite, cell: pos });
    });

    return next;
  }

  private applyGhostStyle(sprite: Sprite, cell: Point, size: number, alpha: number, style: { texture: Texture; flip?: boolean; tint?: number }): void {
    sprite.texture = style.texture;
    sprite.tint = style.tint ?? 0xffffff;
    sprite.alpha = alpha;
    placeTall(sprite, cell, size, style.flip ?? false);
  }

  private discard(sprite: Sprite): void {
    this.tweens = this.tweens.filter((t) => t.sprite !== sprite);
    sprite.destroy();
  }

  private readonly onTick = (): void => {
    if (this.tweens.length === 0) return;
    const now = performance.now();
    const remaining: Tween[] = [];
    for (const tw of this.tweens) {
      const t = Math.min(1, (now - tw.startedAt) / MOVE_DURATION_MS);
      const eased = 1 - (1 - t) * (1 - t); // ease-out: fast start, gentle settle
      tw.sprite.x = tw.fromX + (tw.toX - tw.fromX) * eased;
      tw.sprite.y = tw.fromY + (tw.toY - tw.fromY) * eased;
      if (t < 1) remaining.push(tw);
    }
    this.tweens = remaining;
  };
}

function key(p: Point): string {
  return `${p.x},${p.y}`;
}

/** Picks the wall texture/orientation for a cell: the corner pillar (flipped on the right) for the level's four corners, vertical (flipped on the right) for the rest of the left/right boundary, the front-facing sprite for top/bottom, or the interior sprite otherwise. */
function pickWallSprite(cell: Point, width: number, height: number, atlas: SpriteAtlas): { texture: Texture; flip: boolean } {
  const isCorner = (cell.x === 0 || cell.x === width - 1) && (cell.y === 0 || cell.y === height - 1);
  if (isCorner) return { texture: atlas.wallCorner, flip: cell.x === width - 1 };
  if (cell.x === 0) return { texture: atlas.wallEdgeVertical, flip: false };
  if (cell.x === width - 1) return { texture: atlas.wallEdgeVertical, flip: true };
  if (cell.y === 0 || cell.y === height - 1) return { texture: atlas.wallEdge, flip: false };
  return { texture: atlas.wallMid, flip: false };
}

/** There's no dedicated left-facing sprite - it's `playerRight` mirrored, the same way the vertical wall sprite is mirrored for the right boundary. */
function pickPlayerSprite(facing: Facing, atlas: SpriteAtlas): { texture: Texture; flip: boolean } {
  switch (facing) {
    case "right":
      return { texture: atlas.playerRight, flip: false };
    case "left":
      return { texture: atlas.playerRight, flip: true };
    case "up":
      return { texture: atlas.playerUp, flip: false };
    case "down":
      return { texture: atlas.playerDown, flip: false };
  }
}

/**
 * Positions a 128x256 (2 tiles tall) sprite so its bottom sits on the
 * tile's bottom edge. `flip` mirrors it horizontally in place (still
 * occupying the same cell column) via a negative x scale.
 *
 * Anchored at bottom-center rather than top-left: that keeps `sprite.x`/`y`
 * equal to the same cell-derived value regardless of `flip`, so comparing a
 * ghost's before/after position (see `reconcileGhosts`) reliably detects
 * "did it move cells" instead of also tripping on "did it change facing" -
 * with a top-left anchor, flipping shifts x by a whole tile width even when
 * the cell doesn't change, which could cancel out (or fake) a real move.
 *
 * `lift` raises the sprite by that many pixels beyond the normal bottom
 * anchor - used for bottom-row walls, which sit half a tile higher than
 * the rest.
 */
function placeTall(sprite: Sprite, cell: Point, size: number, flip = false, lift = 0): void {
  const width = size;
  const height = size * 2;
  const scaleX = width / sprite.texture.width;
  const scaleY = height / sprite.texture.height;
  sprite.anchor.set(0.5, 1);
  sprite.scale.set(flip ? -scaleX : scaleX, scaleY);
  sprite.x = cell.x * size + size / 2;
  sprite.y = (cell.y + 1) * size - lift;
}

/** Ghost alpha shrinks as more positions share a layer, but never fades past legibility. */
function ghostAlpha(count: number): number {
  return Math.max(0.3, 1 / count);
}
