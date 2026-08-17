import { useState } from "react";
import type { DirectionName } from "../engine/multiverse/types.ts";
import type { LevelDef } from "../engine/levels/level.ts";
import { solveLevel } from "../engine/solve/solveLevel.ts";
import { analyzeSolution } from "../engine/solve/analyzeSolution.ts";
import type { SolutionStats } from "../engine/solve/analyzeSolution.ts";
import { formatMoves } from "../engine/solve/formatMoves.ts";

export interface SolverPanelProps {
  readonly level: LevelDef;
}

type SolveState =
  | { readonly status: "idle" }
  | { readonly status: "solving" }
  | { readonly status: "failed" }
  | { readonly status: "solved"; readonly moves: readonly DirectionName[]; readonly stats: SolutionStats };

const SOLVER_ENABLED = import.meta.env.VITE_ENABLE_SOLVER === "true";

/**
 * Dev-only tool: finds the optimal (fewest-move) solution for the current
 * level and reports a few stats about running it (see analyzeSolution.ts).
 * Only rendered when VITE_ENABLE_SOLVER is set (see vite-env.d.ts and
 * .env.example) - this is for level design/debugging, not for players.
 */
export function SolverPanel({ level }: SolverPanelProps) {
  const [state, setState] = useState<SolveState>({ status: "idle" });

  if (!SOLVER_ENABLED) return null;

  const handleSolve = () => {
    setState({ status: "solving" });
    // Defer so "Solving..." actually paints before the search - which can
    // run for a while on a bigger level - blocks the main thread.
    setTimeout(() => {
      const moves = solveLevel(level);
      if (!moves) {
        setState({ status: "failed" });
        return;
      }
      setState({ status: "solved", moves, stats: analyzeSolution(level, moves) });
    }, 0);
  };

  return (
    <div className="fixed bottom-3 left-3 z-40 flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleSolve}
        disabled={state.status === "solving"}
        className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 shadow-lg transition-colors hover:bg-amber-500/20 disabled:opacity-60"
      >
        {state.status === "solving" ? "Solving…" : "Solve (dev)"}
      </button>

      {state.status === "failed" && (
        <div className="rounded-md border border-red-500/40 bg-slate-900/95 px-3 py-2 text-xs text-red-300 shadow-lg">No solution found. (maximum visited states exceeded)</div>
      )}

      {state.status === "solved" && (
        <div className="flex max-w-xs flex-col gap-1 rounded-md border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs text-slate-200 shadow-lg">
          <div>
            <span className="text-slate-500">Optimal moves: </span>
            <span className="font-semibold tabular-nums">{state.stats.moveCount}</span>
          </div>
          <div className="wrap-break-word font-mono text-sm text-sky-300">{formatMoves(state.moves)}</div>
          <div>
            <span className="text-slate-500">Max state groups: </span>
            <span className="font-semibold tabular-nums">{state.stats.maxStateGroups}</span>
          </div>
          <div>
            <span className="text-slate-500">Max player locations: </span>
            <span className="font-semibold tabular-nums">{state.stats.maxPlayerLocations}</span>
          </div>
        </div>
      )}
    </div>
  );
}
