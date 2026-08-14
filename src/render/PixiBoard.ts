import { Application, Container, Graphics } from "pixi.js";
import type { GhostLayer, Point, Scene } from "./types.ts";

const FLOOR_LIGHT = 0x2a2b33;
const FLOOR_DARK = 0x24252c;
const WALL = 0x494a56;
const GOAL_RING = 0xf4c542;

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
  private tileSize: number;

  private constructor(app: Application, root: Container) {
    this.app = app;
    this.root = root;
    this.tileSize = 48;
  }

  static async mount(container: HTMLElement): Promise<PixiBoard> {
    const app = new Application();
    await app.init({
      backgroundAlpha: 0,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    container.appendChild(app.canvas);

    const root = new Container();
    app.stage.addChild(root);
    return new PixiBoard(app, root);
  }

  update(scene: Scene, tileSize: number): void {
    this.tileSize = tileSize;
    const size = this.tileSize;
    this.app.renderer.resize(scene.width * size, scene.height * size);

    for (const child of this.root.removeChildren()) child.destroy();

    const tiles = new Graphics();
    drawFloor(tiles, scene.width, scene.height, size);
    drawCells(tiles, scene.walls, size, WALL);
    drawGoals(tiles, scene.goals, size);
    this.root.addChild(tiles);

    for (const layer of scene.entities) this.root.addChild(drawGhostLayer(layer, size, "box"));
    this.root.addChild(drawGhostLayer(scene.player, size, "circle"));
  }

  destroy(): void {
    this.app.destroy({ removeView: true }, { children: true, texture: true });
  }
}

function drawFloor(g: Graphics, width: number, height: number, size: number): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const color = (x + y) % 2 === 0 ? FLOOR_LIGHT : FLOOR_DARK;
      g.rect(x * size, y * size, size, size).fill(color);
    }
  }
}

function drawCells(g: Graphics, cells: readonly Point[], size: number, color: number): void {
  for (const cell of cells) {
    g.rect(cell.x * size, cell.y * size, size, size).fill(color);
  }
}

function drawGoals(g: Graphics, goals: readonly Point[], size: number): void {
  const r = size * 0.28;
  for (const goal of goals) {
    const cx = goal.x * size + size / 2;
    const cy = goal.y * size + size / 2;
    g.circle(cx, cy, r).stroke({ width: 3, color: GOAL_RING, alpha: 0.9 });
  }
}

/** Ghost alpha shrinks as more positions share a layer, but never fades past legibility. */
function ghostAlpha(count: number): number {
  return Math.max(0.3, 1 / count);
}

function drawGhostLayer(layer: GhostLayer, size: number, shape: "box" | "circle"): Graphics {
  const g = new Graphics();
  const alpha = ghostAlpha(layer.positions.length);
  const pad = size * 0.14;

  for (const pos of layer.positions) {
    const cx = pos.x * size + size / 2;
    const cy = pos.y * size + size / 2;
    if (shape === "circle") {
      g.circle(cx, cy, size / 2 - pad).fill({ color: layer.color, alpha });
    } else {
      const s = size - pad * 2;
      g.roundRect(pos.x * size + pad, pos.y * size + pad, s, s, size * 0.15).fill({ color: layer.color, alpha });
    }
  }
  return g;
}
