import { useEffect, useRef } from "react";
import { PixiBoard } from "../render/PixiBoard.ts";
import type { Scene } from "../render/types.ts";

export interface GameBoardProps {
  readonly scene: Scene;
  readonly tileSize?: number;
  readonly className?: string;
}

/**
 * Mounts one Pixi canvas and keeps it in sync with `scene`. This component
 * only knows about the plain Scene type, so rendering more than one board
 * side by side later (e.g. one per StateGroup) just means rendering more
 * than one <GameBoard>, each with its own Scene.
 */
export function GameBoard({ scene, tileSize, className }: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<PixiBoard | null>(null);
  const latestScene = useRef(scene);
  latestScene.current = scene;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    PixiBoard.mount(container, { tileSize }).then((board) => {
      if (cancelled) {
        board.destroy();
        return;
      }
      boardRef.current = board;
      board.update(latestScene.current);
    });

    return () => {
      cancelled = true;
      boardRef.current?.destroy();
      boardRef.current = null;
    };
  }, [tileSize]);

  useEffect(() => {
    boardRef.current?.update(scene);
  }, [scene]);

  return <div ref={containerRef} className={className} />;
}
