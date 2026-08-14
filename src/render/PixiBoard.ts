import { Application, Container, FillGradient, Graphics, Sprite, Texture } from "pixi.js";
import type { Facing, Point, Scene } from "./types.ts";
import { loadSpriteAtlas, pickFloorIndex } from "./sprites.ts";
import type { SpriteAtlas } from "./sprites.ts";

const GROUND_FADE_COLOR = "38,41,48"; // rgb, matches the sheet's dark floor tone

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
 */
export class PixiBoard {
  private readonly app: Application;
  private readonly root: Container;
  private readonly atlas: SpriteAtlas;
  private tileSize: number;

  private constructor(app: Application, root: Container, atlas: SpriteAtlas) {
    this.app = app;
    this.root = root;
    this.atlas = atlas;
    this.tileSize = 48;
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

    // Wall (and box) sprites are 2 tiles tall and anchored to their cell's
    // bottom edge, so their top half pokes up into the row above - for a
    // cell at the very top/left/etc. of the grid that would otherwise be
    // clipped by the canvas edge. Padding every side by half a tile, plus a
    // fading ground edge in that padding, gives that overflow (and the
    // grid's true edge in general) somewhere to go instead of a hard cut.
    this.app.renderer.resize(scene.width * size + size, scene.height * size + size);
    this.root.position.set(half, half);

    for (const child of this.root.removeChildren()) child.destroy();

    const wallSet = new Set(scene.walls.map((p) => key(p)));
    const goalSet = new Set(scene.goals.map((p) => key(p)));

    this.root.addChild(drawGroundFade(scene.width, scene.height, size));
    this.drawFloor(scene.width, scene.height, wallSet, goalSet, size);

    // Everything with height (walls, boxes, the player) is drawn in a single
    // pass ordered by row, back to front, so a tall sprite from a nearer
    // (larger-y) row correctly overlaps whatever's in the row above it,
    // rather than e.g. boxes always ending up in front of walls regardless
    // of position.
    const depthSorted: { row: number; display: Container }[] = [];

    for (const cell of scene.walls) {
      const { texture, flip } = pickWallSprite(cell, scene.width, scene.height, this.atlas);
      const sprite = new Sprite(texture);
      placeTall(sprite, cell, size, flip);
      depthSorted.push({ row: cell.y, display: sprite });
    }

    for (const layer of scene.entities) {
      const alpha = ghostAlpha(layer.positions.length);
      for (const pos of layer.positions) {
        const sprite = new Sprite(this.atlas.box);
        sprite.tint = layer.color;
        sprite.alpha = alpha;
        placeTall(sprite, pos, size);
        depthSorted.push({ row: pos.y, display: sprite });
      }
    }

    {
      const { texture, flip } = pickPlayerSprite(scene.playerFacing, this.atlas);
      const alpha = ghostAlpha(scene.player.positions.length);
      for (const pos of scene.player.positions) {
        const sprite = new Sprite(texture);
        sprite.alpha = alpha;
        placeTall(sprite, pos, size, flip);
        depthSorted.push({ row: pos.y, display: sprite });
      }
    }

    depthSorted.sort((a, b) => a.row - b.row);
    for (const item of depthSorted) this.root.addChild(item.display);
  }

  destroy(): void {
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
      }
    }
  }
}

function key(p: Point): string {
  return `${p.x},${p.y}`;
}

/** Picks the wall texture/orientation for a cell: vertical (flipped on the right) for the left/right boundary, the front-facing sprite for top/bottom, or the interior sprite otherwise. */
function pickWallSprite(cell: Point, width: number, height: number, atlas: SpriteAtlas): { texture: Texture; flip: boolean } {
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
 * occupying the same cell column) via a negative x scale, for sprites whose
 * mirror image is reused for the opposite-facing variant.
 */
function placeTall(sprite: Sprite, cell: Point, size: number, flip = false): void {
  const width = size;
  const height = size * 2;
  const scaleX = width / sprite.texture.width;
  const scaleY = height / sprite.texture.height;
  sprite.scale.set(flip ? -scaleX : scaleX, scaleY);
  sprite.x = flip ? cell.x * size + size : cell.x * size;
  sprite.y = (cell.y + 1) * size - height;
}

/** Ghost alpha shrinks as more positions share a layer, but never fades past legibility. */
function ghostAlpha(count: number): number {
  return Math.max(0.3, 1 / count);
}

/**
 * A half-tile band around the grid, fading from the ground tone (at the
 * grid's edge) to fully transparent (at the outer edge) - so tall sprites
 * poking past the grid boundary, and the boundary itself, don't end in a
 * hard cut. On the top edge this is normally hidden again by any wall
 * sprite poking up from row 0, which is intended: the back wall shouldn't
 * fade.
 */
function drawGroundFade(gridWidth: number, gridHeight: number, size: number): Graphics {
  const g = new Graphics();
  const half = size / 2;
  const w = gridWidth * size;
  const h = gridHeight * size;
  const opaque = `rgba(${GROUND_FADE_COLOR},1)`;
  const clear = `rgba(${GROUND_FADE_COLOR},0)`;

  g.rect(-half, -half, w + size, half)
    .fill(new FillGradient({ type: "linear", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: clear }, { offset: 1, color: opaque }] }));
  g.rect(-half, h, w + size, half)
    .fill(new FillGradient({ type: "linear", start: { x: 0, y: 0 }, end: { x: 0, y: 1 }, colorStops: [{ offset: 0, color: opaque }, { offset: 1, color: clear }] }));
  g.rect(-half, -half, half, h + size)
    .fill(new FillGradient({ type: "linear", start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, colorStops: [{ offset: 0, color: clear }, { offset: 1, color: opaque }] }));
  g.rect(w, -half, half, h + size)
    .fill(new FillGradient({ type: "linear", start: { x: 0, y: 0 }, end: { x: 1, y: 0 }, colorStops: [{ offset: 0, color: opaque }, { offset: 1, color: clear }] }));

  return g;
}
