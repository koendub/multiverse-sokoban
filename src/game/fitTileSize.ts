import type { ElementSize } from "./useElementSize.ts";

/**
 * Largest whole-pixel tile size that fits a `gridWidth`x`gridHeight` board
 * inside `available` without overflowing it, given PixiBoard's canvas-size
 * formula (see PixiBoard.ts): `gridWidth * size` wide, `(gridHeight + 0.5)
 * * size` tall (the extra half-tile is the top-only padding for tall wall
 * sprites). Falls back to `fallback` while `available` hasn't been measured
 * yet (both dimensions 0), and never returns below `min` even if the
 * measured space is tighter than that.
 */
export function fitTileSize(gridWidth: number, gridHeight: number, available: ElementSize, fallback: number, min = 8): number {
  if (available.width <= 0 || available.height <= 0) return fallback;
  const byWidth = available.width / gridWidth;
  const byHeight = available.height / (gridHeight + 0.5);
  return Math.max(min, Math.floor(Math.min(byWidth, byHeight)));
}
