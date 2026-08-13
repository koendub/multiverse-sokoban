import { useState } from "react";
import type { LevelCatalogEntry } from "../game/levelCatalog.ts";
import type { BestMovesByLevel } from "../game/levelScores.ts";

export interface LevelSidebarProps {
  readonly levels: readonly LevelCatalogEntry[];
  readonly currentLevel: number;
  readonly bestMoves: BestMovesByLevel;
  readonly onSelect: (levelNumber: number) => void;
}

const PANEL_WIDTH = "18rem";
const TAB_WIDTH = "2.5rem";

/**
 * Collapsed, only a peeking tab (with an arrow icon) is on screen; expanded,
 * it slides out to show every level with the fewest moves recorded to solve
 * it so far. The tab is a fixed child of the panel itself, so it stays put
 * at the panel's trailing edge in both states.
 */
export function LevelSidebar({ levels, currentLevel, bestMoves, onSelect }: LevelSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-full flex-col border-r border-slate-700 bg-slate-900 shadow-xl transition-transform duration-200 ease-out"
      style={{ width: PANEL_WIDTH, transform: open ? "translateX(0)" : `translateX(calc(-100% + ${TAB_WIDTH}))` }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Collapse level list" : "Expand level list"}
        aria-expanded={open}
        className="absolute right-0 top-1/2 flex h-16 -translate-y-1/2 items-center justify-center text-slate-300 transition-colors hover:text-white"
        style={{ width: TAB_WIDTH }}
      >
        <svg viewBox="0 0 24 24" className={`h-5 w-5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="flex-1 overflow-y-auto pt-4" style={{ paddingRight: TAB_WIDTH }}>
        <h2 className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Levels</h2>
        <ul className="flex flex-col gap-0.5 px-2">
          {levels.map((entry) => {
            const isCurrent = entry.number === currentLevel;
            const best = bestMoves[entry.number];
            return (
              <li key={entry.number}>
                <button
                  type="button"
                  onClick={() => onSelect(entry.number)}
                  aria-current={isCurrent ? "true" : undefined}
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                    isCurrent ? "bg-slate-700 text-white" : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <span className="truncate">
                    {entry.number}. {entry.name}
                  </span>
                  <span className="shrink-0 tabular-nums text-slate-400">{best ?? "–"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
