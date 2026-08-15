import type { MultiverseStats } from "../game/stats.ts";
import type { ViewMode } from "../game/useViewKeys.ts";

export interface TopBarProps {
  readonly levelNumber: number;
  readonly levelName: string;
  readonly stats: MultiverseStats;
  readonly view: ViewMode;
  readonly onSelectView: (view: ViewMode) => void;
  /** Which universe is currently shown in the single-universe view (0-based). Only meaningful when `view === 3`. */
  readonly universeIndex: number;
  readonly moves: number;
  readonly viewAvailability: Readonly<Record<ViewMode, boolean>>;
}

function formatBig(n: bigint): string {
  return n.toLocaleString("en-US");
}

const VIEW_OPTIONS: { readonly mode: ViewMode; readonly label: string }[] = [
  { mode: 1, label: "Overlay view - every universe in one render" },
  { mode: 2, label: "Split view - one render per player location" },
  { mode: 3, label: "Single-universe view - one specific universe" },
];

function ViewIcon({ mode }: { mode: ViewMode }) {
  if (mode === 1) {
    // Two overlapping squares: everything drawn on top of everything else.
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="4" y="4" width="12" height="12" rx="1.5" />
        <rect x="8" y="8" width="12" height="12" rx="1.5" />
      </svg>
    );
  }
  if (mode === 2) {
    // A 2x2 grid: several boards side by side.
    return (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="3" width="8" height="8" rx="1" />
        <rect x="13" y="3" width="8" height="8" rx="1" />
        <rect x="3" y="13" width="8" height="8" rx="1" />
        <rect x="13" y="13" width="8" height="8" rx="1" />
      </svg>
    );
  }
  // A single board with one marked spot: one specific universe.
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * A slim badge anchored to the top-center of the screen, sized to its
 * content (not the viewport width), with slanted sides that are wider at
 * the top than the bottom.
 */
export function TopBar({ levelNumber, levelName, stats, view, onSelectView, universeIndex, moves, viewAvailability }: TopBarProps) {
  const items = [
    { label: "Level", value: `${levelNumber} · ${levelName}` },
    { label: "Moves", value: moves.toLocaleString("en-US") },
    { label: "State Groups", value: stats.groupCount.toLocaleString("en-US") },
    // In single-universe view, this slot shows which universe is being viewed instead of the total count.
    { label: "Unique Universes", value: view === 3 ? `${universeIndex + 1}/${formatBig(stats.totalUniverses)}` : formatBig(stats.totalUniverses) },
    { label: "Completed", value: `${formatBig(stats.completedUniverses)} / ${formatBig(stats.totalUniverses)}` },
  ];

  return (
    <div
      className="fixed left-1/2 top-0 z-40 flex w-fit -translate-x-1/2 divide-x divide-slate-700 bg-slate-900/95 text-slate-200 shadow-lg"
      style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 16px) 100%, 16px 100%)" }}
    >
      <div className="flex flex-col items-center gap-1 px-6 pb-2.5 pt-3">
        <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500">View</span>
        <div className="flex items-center gap-1">
          {VIEW_OPTIONS.map((option) => {
            const available = viewAvailability[option.mode];
            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => onSelectView(option.mode)}
                disabled={!available}
                aria-label={available ? option.label : `${option.label} - unavailable right now`}
                aria-pressed={view === option.mode}
                title={available ? option.label : `${option.label} - unavailable right now`}
                className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${
                  !available
                    ? "cursor-not-allowed text-slate-700"
                    : view === option.mode
                      ? "bg-sky-500/20 text-sky-400"
                      : "text-slate-500 hover:text-slate-300"
                }`}
              >
                <ViewIcon mode={option.mode} />
              </button>
            );
          })}
        </div>
      </div>

      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-0.5 px-6 pb-2.5 pt-3">
          <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500">{item.label}</span>
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
