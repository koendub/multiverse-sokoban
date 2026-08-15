import { useCallback, useEffect, useState } from "react";
import type { LevelDef } from "../engine/levels/level.ts";
import type { LevelViews } from "../engine/levels/jsonLevel.ts";
import { useMultiverse } from "../game/useMultiverse.ts";
import { useWasdControls } from "../game/useWasdControls.ts";
import { useAdvanceKey } from "../game/useAdvanceKey.ts";
import { useUndoRestartKeys } from "../game/useUndoRestartKeys.ts";
import { useViewKeys } from "../game/useViewKeys.ts";
import type { ViewMode } from "../game/useViewKeys.ts";
import { starTierForMoves } from "../game/starRating.ts";
import { firstAvailableView, isViewAvailable } from "../game/viewAvailability.ts";
import { useElementSize } from "../game/useElementSize.ts";
import { fitTileSize } from "../game/fitTileSize.ts";
import { GameBoard } from "./GameBoard.tsx";
import { MultiBoardGrid } from "./MultiBoardGrid.tsx";
import { TopBar } from "./TopBar.tsx";
import { StarIcon } from "./StarIcon.tsx";

/** Tile size used before the board area's real size has been measured (see useElementSize.ts). */
const DEFAULT_TILE_SIZE = 48;
/** The bordered box around the active view has a 1px border on every side. */
const BOARD_BORDER_PX = 2;

export interface LevelPlayerProps {
  readonly levelNumber: number;
  readonly levelName: string;
  /** Optional blurb shown above the game render. Nothing is shown if omitted. */
  readonly levelText?: string;
  /** Move-count thresholds for the silver/gold star - see starRating.ts. */
  readonly levelGreat?: number;
  readonly levelPerfect?: number;
  readonly levelViews: LevelViews;
  readonly level: LevelDef;
  readonly hasNextLevel: boolean;
  readonly onAdvance: () => void;
  readonly onSolved: (moves: number) => void;
}

/**
 * Plays exactly one level. Mount a fresh instance per level (e.g. via a
 * `key={levelNumber}` from the parent) so its Multiverse resets cleanly
 * instead of trying to migrate state between unrelated levels.
 */
export function LevelPlayer({ levelNumber, levelName, levelText, levelGreat, levelPerfect, levelViews, level, hasNextLevel, onAdvance, onSolved }: LevelPlayerProps) {
  const {
    combinedScene,
    splitScenes,
    singleUniverseScene,
    stats,
    solved,
    universeIndex,
    moves,
    step,
    undo,
    restart,
    goToUniverse,
    cycleUniverse,
  } = useMultiverse(level, onSolved);

  const [viewMode, setViewMode] = useState<ViewMode>(() => firstAvailableView(levelViews, 0));

  // Switching views is always "go to this mode, and if it's the per-universe
  // one, reset which universe it's showing" - shared by picking a view by
  // hand and by the auto-fallback effect below, which needs the exact same
  // reset when it moves the player into view 3 on its own.
  const applyView = useCallback(
    (view: ViewMode) => {
      setViewMode(view);
      if (view === 3) goToUniverse(0);
    },
    [goToUniverse],
  );

  const selectView = useCallback(
    (view: ViewMode) => {
      if (!isViewAvailable(levelViews, view, moves)) return;
      if (view === 3 && viewMode === 3) {
        cycleUniverse();
      } else {
        applyView(view);
      }
    },
    [levelViews, moves, viewMode, cycleUniverse, applyView],
  );

  // A "before-moves" view stops being available the instant the player's
  // first move lands - if that was the view on screen, hop to the next
  // available one rather than leaving an unusable view showing.
  useEffect(() => {
    if (!isViewAvailable(levelViews, viewMode, moves)) {
      applyView(firstAvailableView(levelViews, moves));
    }
  }, [levelViews, viewMode, moves, applyView]);

  useWasdControls((dir) => {
    if (!solved) step(dir);
  });
  useUndoRestartKeys(undo, restart);
  useAdvanceKey(solved, onAdvance);
  useViewKeys(selectView);

  const [boardAreaRef, boardAreaSize] = useElementSize<HTMLDivElement>();
  const availableSize = { width: boardAreaSize.width - BOARD_BORDER_PX, height: boardAreaSize.height - BOARD_BORDER_PX };
  const combinedTileSize = fitTileSize(combinedScene.width, combinedScene.height, availableSize, DEFAULT_TILE_SIZE);
  const singleTileSize = fitTileSize(singleUniverseScene.width, singleUniverseScene.height, availableSize, DEFAULT_TILE_SIZE);

  return (
    <div className="flex h-svh flex-col items-center gap-6 overflow-hidden bg-slate-950 px-4 pb-8 pt-20 text-slate-100">
      <TopBar
        levelNumber={levelNumber}
        levelName={levelName}
        stats={stats}
        view={viewMode}
        onSelectView={selectView}
        universeIndex={universeIndex}
        moves={moves}
        viewAvailability={{
          1: isViewAvailable(levelViews, 1, moves),
          2: isViewAvailable(levelViews, 2, moves),
          3: isViewAvailable(levelViews, 3, moves),
        }}
      />

      {levelText && <p className="max-w-prose text-center text-sm text-slate-400">{levelText}</p>}

      {/*
       * This wrapper is the sizing source for the board(s) below: it's a
       * flex child that naturally shrinks to whatever room is left after
       * the top bar's reserved padding, the optional blurb, and the gaps
       * between them, and `useElementSize` reports its true pixel size so
       * `fitTileSize`/`MultiBoardGrid` can pick the largest tile size that
       * still fits without overflowing.
       */}
      <div ref={boardAreaRef} className="flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
        <div className="relative overflow-hidden rounded-xl border border-slate-700 shadow-lg">
          {/*
           * All three views stay mounted at all times, switching only via
           * `hidden` - this keeps each one's Pixi canvas(es) alive across
           * mode switches, so flipping between 1/2/3 never tears down and
           * re-initializes a board (which is what caused the flicker).
           */}
          <div className={viewMode === 1 ? undefined : "hidden"}>
            <GameBoard scene={combinedScene} tileSize={combinedTileSize} />
          </div>
          <div className={viewMode === 2 ? undefined : "hidden"}>
            <MultiBoardGrid scenes={splitScenes} availableSize={availableSize} />
          </div>
          <div className={viewMode === 3 ? undefined : "hidden"}>
            <GameBoard scene={singleUniverseScene} tileSize={singleTileSize} />
          </div>
          {solved && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/85 text-center">
              <StarIcon tier={starTierForMoves(moves, { great: levelGreat, perfect: levelPerfect })} className="h-10 w-10" />
              <span className="text-xl font-semibold text-emerald-400">Congratz!</span>
              <span className="text-sm text-slate-200">
                {hasNextLevel ? "Press space to go to the next level" : "You've completed every level!"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
