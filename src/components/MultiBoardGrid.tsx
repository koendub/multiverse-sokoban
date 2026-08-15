import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { IdentifiedScene } from "../game/sceneAdapter.ts";
import type { ElementSize } from "../game/useElementSize.ts";
import { fitTileSize } from "../game/fitTileSize.ts";
import { GameBoard } from "./GameBoard.tsx";

export interface MultiBoardGridProps {
  readonly scenes: readonly IdentifiedScene[];
  /** Space available for the whole grid (all boards, gaps and borders included) - see useElementSize.ts. */
  readonly availableSize: ElementSize;
}

// Shrink boards as more of them need to share the screen - used only as a
// fallback before `availableSize` has been measured (see fitTileSize.ts).
const TILE_SIZE_BY_COLUMNS: Readonly<Record<number, number>> = { 1: 48, 2: 36, 3: 26, 4: 20 };

const GAP_PX = 12; // matches `gap-3`
const BORDER_PX = 2; // matches `border` (1px) on both sides of a BoardCell

/**
 * Lays out one board per Scene in a grid that stays roughly square as the
 * count grows - 2 columns up to 4 boards, 3 up to 9, 4 up to 16, and so on
 * (columns = ceil(sqrt(count))). That keeps the overall layout close to the
 * same proportions as a single board, just tiled, rather than spilling into
 * one very wide row or one very tall column.
 *
 * Each board's tile size is picked so the whole grid - every board, plus
 * the gaps and borders between them - fills as much of `availableSize` as
 * it can without overflowing it.
 *
 * `scenes` must already be in stable order with stable ids (see
 * groupIdentity.ts / useMultiverse.ts) - a branch that hasn't changed keeps
 * both its screen slot and its underlying PixiBoard instance across
 * renders; only genuinely new/removed branches mount or unmount.
 */
export function MultiBoardGrid({ scenes, availableSize }: MultiBoardGridProps) {
  const columns = Math.max(1, Math.ceil(Math.sqrt(scenes.length)));
  const rows = Math.max(1, Math.ceil(scenes.length / columns));
  const first = scenes[0];

  const cellSize: ElementSize = {
    width: (availableSize.width - GAP_PX * (columns - 1)) / columns - BORDER_PX,
    height: (availableSize.height - GAP_PX * (rows - 1)) / rows - BORDER_PX,
  };
  const fallback = TILE_SIZE_BY_COLUMNS[columns] ?? 16;
  const tileSize = first ? fitTileSize(first.scene.width, first.scene.height, cellSize, fallback) : fallback;

  return (
    <div className="grid justify-center gap-3" style={{ gridTemplateColumns: `repeat(${columns}, max-content)` }}>
      {scenes.map(({ id, scene }) => (
        <BoardCell key={id}>
          <GameBoard scene={scene} tileSize={tileSize} />
        </BoardCell>
      ))}
    </div>
  );
}

/** Pops a newly-mounted board in with a short scale/fade, as if it just split off. */
function BoardCell({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div
      className={`overflow-hidden rounded-lg border border-slate-700 transition-all duration-300 ease-out ${
        entered ? "scale-100 opacity-100" : "scale-75 opacity-0"
      }`}
    >
      {children}
    </div>
  );
}
