import { useCallback, useState } from "react";
import type { LevelDef } from "../engine/levels/level.ts";
import { useMultiverse } from "../game/useMultiverse.ts";
import { useWasdControls } from "../game/useWasdControls.ts";
import { useAdvanceKey } from "../game/useAdvanceKey.ts";
import { useUndoRestartKeys } from "../game/useUndoRestartKeys.ts";
import { useViewKeys } from "../game/useViewKeys.ts";
import type { ViewMode } from "../game/useViewKeys.ts";
import { GameBoard } from "./GameBoard.tsx";
import { MultiBoardGrid } from "./MultiBoardGrid.tsx";
import { TopBar } from "./TopBar.tsx";

export interface LevelPlayerProps {
  readonly levelNumber: number;
  readonly levelName: string;
  /** Optional blurb shown above the game render. Nothing is shown if omitted. */
  readonly levelText?: string;
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
export function LevelPlayer({ levelNumber, levelName, levelText, level, hasNextLevel, onAdvance, onSolved }: LevelPlayerProps) {
  const {
    combinedScene,
    splitScenes,
    singleUniverseScene,
    stats,
    solved,
    universeIndex,
    step,
    undo,
    restart,
    goToUniverse,
    cycleUniverse,
  } = useMultiverse(level, onSolved);

  const [viewMode, setViewMode] = useState<ViewMode>(1);

  const selectView = useCallback(
    (view: ViewMode) => {
      if (view === 3 && viewMode === 3) {
        cycleUniverse();
      } else {
        setViewMode(view);
        if (view === 3) goToUniverse(0);
      }
    },
    [viewMode, cycleUniverse, goToUniverse],
  );

  useWasdControls((dir) => {
    if (!solved) step(dir);
  });
  useUndoRestartKeys(undo, restart);
  useAdvanceKey(solved, onAdvance);
  useViewKeys(selectView);

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-slate-950 px-4 pb-8 pt-20 text-slate-100">
      <TopBar
        levelNumber={levelNumber}
        levelName={levelName}
        stats={stats}
        view={viewMode}
        onSelectView={selectView}
        universeIndex={universeIndex}
      />

      {levelText && <p className="max-w-prose text-center text-sm text-slate-400">{levelText}</p>}

      <div className="relative overflow-hidden rounded-xl border border-slate-700 shadow-lg">
        {/*
         * All three views stay mounted at all times, switching only via
         * `hidden` - this keeps each one's Pixi canvas(es) alive across
         * mode switches, so flipping between 1/2/3 never tears down and
         * re-initializes a board (which is what caused the flicker).
         */}
        <div className={viewMode === 1 ? undefined : "hidden"}>
          <GameBoard scene={combinedScene} />
        </div>
        <div className={viewMode === 2 ? undefined : "hidden"}>
          <MultiBoardGrid scenes={splitScenes} />
        </div>
        <div className={viewMode === 3 ? undefined : "hidden"}>
          <GameBoard scene={singleUniverseScene} />
        </div>
        {solved && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/85 text-center">
            <span className="text-xl font-semibold text-emerald-400">Congratz!</span>
            <span className="text-sm text-slate-200">
              {hasNextLevel ? "Press space to go to the next level" : "You've completed every level!"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
