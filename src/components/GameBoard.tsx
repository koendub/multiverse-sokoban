import { useEffect, useRef } from "react";
import { PixiBoard } from "../render/PixiBoard.ts";
import type { Scene } from "../render/types.ts";

export interface GameBoardProps {
  readonly scene: Scene;
  readonly tileSize?: number;
  readonly className?: string;
}

/**
 * Mounts one Pixi canvas and keeps it in sync with `scene`/`tileSize`. This
 * component only knows about the plain Scene type, so rendering more than
 * one board side by side (e.g. one per StateGroup) just means rendering
 * more than one <GameBoard>, each with its own Scene.
 *
 * Mounts exactly once per component instance - `tileSize` changes are
 * pushed into the existing PixiBoard via `update()` rather than
 * remounting, so a board that's just being resized (e.g. the split view
 * gaining a board and shrinking tiles to fit) never flashes empty.
 */
export function GameBoard({ scene, tileSize = 48, className }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<PixiBoard | null>(null);
  const latest = useRef({ scene, tileSize });
  latest.current = { scene, tileSize };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    PixiBoard.mount(container).then((board) => {
      if (cancelled) {
        board.destroy();
        return;
      }
      boardRef.current = board;
      board.update(latest.current.scene, latest.current.tileSize);
    });

    return () => {
      cancelled = true;
      boardRef.current?.destroy();
      boardRef.current = null;
    };
  }, []);

  useEffect(() => {
    boardRef.current?.update(scene, tileSize);
  }, [scene, tileSize]);

  return <div ref={containerRef} className={className} />;
}
