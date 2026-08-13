import type { LevelDef } from "../engine/levels/level.ts";
import { useMultiverse } from "../game/useMultiverse.ts";
import { useWasdControls } from "../game/useWasdControls.ts";
import { GameBoard } from "./GameBoard.tsx";
import { StatsPanel } from "./StatsPanel.tsx";

export interface GameViewProps {
  readonly level: LevelDef;
}

export function GameView({ level }: GameViewProps) {
  const { scene, stats, solved, step, undo, restart } = useMultiverse(level);
  useWasdControls(step);

  return (
    <div className="flex min-h-svh flex-col items-center gap-6 bg-slate-950 px-4 py-8 text-slate-100">
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Multiverse Puzzles</h1>
        <p className="mt-1 text-sm text-slate-400">Move with W A S D - every universe moves at once.</p>
      </header>

      <div className="relative overflow-hidden rounded-xl border border-slate-700 shadow-lg">
        <GameBoard scene={scene} />
        {solved && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
            <span className="text-xl font-semibold text-emerald-400">All universes solved!</span>
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={undo}
          className="rounded-md border border-slate-600 px-4 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={restart}
          className="rounded-md border border-slate-600 px-4 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
        >
          Restart
        </button>
      </div>

      <div className="w-full max-w-2xl">
        <StatsPanel stats={stats} />
      </div>
    </div>
  );
}
