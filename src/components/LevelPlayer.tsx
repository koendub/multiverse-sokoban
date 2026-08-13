import type { LevelDef } from "../engine/levels/level.ts";
import { useMultiverse } from "../game/useMultiverse.ts";
import { useWasdControls } from "../game/useWasdControls.ts";
import { useAdvanceKey } from "../game/useAdvanceKey.ts";
import { useUndoRestartKeys } from "../game/useUndoRestartKeys.ts";
import { GameBoard } from "./GameBoard.tsx";
import { TopBar } from "./TopBar.tsx";

export interface LevelPlayerProps {
  readonly levelNumber: number;
  readonly levelName: string;
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
export function LevelPlayer({ levelNumber, levelName, level, hasNextLevel, onAdvance, onSolved }: LevelPlayerProps) {
  const { scene, stats, solved, step, undo, restart } = useMultiverse(level, onSolved);

  useWasdControls((dir) => {
    if (!solved) step(dir);
  });
  useUndoRestartKeys(undo, restart);
  useAdvanceKey(solved, onAdvance);

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-slate-950 px-4 pb-8 pt-20 text-slate-100">
      <TopBar levelNumber={levelNumber} levelName={levelName} stats={stats} />

      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Multiverse Puzzles</h1>
        <p className="mt-1 text-sm text-slate-400">W A S D to move · R to undo · F to restart</p>
      </header>

      <div className="relative overflow-hidden rounded-xl border border-slate-700 shadow-lg">
        <GameBoard scene={scene} />
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
