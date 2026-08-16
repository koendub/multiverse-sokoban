import { forwardRef } from "react";
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
  /** Whether this level has a blurb to show - see LevelIntroModal.tsx. When false, no info icon is shown. */
  readonly hasIntroText: boolean;
  readonly onShowIntro: () => void;
  /** True on a phone turned sideways - see useTopBarRail.ts. Switches the whole layout to a right-side vertical rail instead of the usual top-center bar. */
  readonly isRail: boolean;
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

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <line x1="12" y1="11" x2="12" y2="16" strokeLinecap="round" />
      <circle cx="12" cy="7.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Vertical rail, flush to the right edge - see useTopBarRail.ts for when this applies. */
const RAIL_CONTAINER_CLASS =
  "fixed right-0 top-0 z-40 flex max-h-[75vh] w-fit flex-col items-center divide-y divide-slate-700 overflow-y-auto rounded-l-xl bg-slate-900/95 text-slate-200 shadow-lg";

/**
 * Horizontal badge, centered at the top with slanted sides. Below `sm` it
 * wraps onto as many rows as it needs (capped to the viewport width)
 * instead of overflowing off-screen - relevant for a narrow phone in
 * portrait, which uses this layout rather than the rail.
 */
const BAR_CONTAINER_CLASS =
  "fixed left-1/2 top-0 z-40 flex w-[94vw] flex-wrap items-center justify-center gap-x-1 gap-y-0.5 -translate-x-1/2 bg-slate-900/95 text-slate-200 shadow-lg sm:w-fit sm:flex-nowrap sm:gap-0 sm:divide-x sm:divide-slate-700 sm:[clip-path:polygon(0_0,100%_0,calc(100%-16px)_100%,16px_100%)]";

const ENTRY_CLASS = "flex flex-col items-center gap-1 px-3 pb-1.5 pt-2 sm:px-6 sm:pb-2.5 sm:pt-3";

/**
 * Forwards its ref to the outer (fixed-positioned) element so callers can
 * measure its real rendered box - its size varies with content and with
 * which layout is active, so a fixed CSS offset can't reliably reserve
 * enough space for it (see LevelPlayer.tsx).
 */
export const TopBar = forwardRef<HTMLDivElement, TopBarProps>(function TopBar(
  { levelNumber, levelName, stats, view, onSelectView, universeIndex, moves, viewAvailability, hasIntroText, onShowIntro, isRail },
  ref,
) {
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
      ref={ref}
      className={isRail ? RAIL_CONTAINER_CLASS : BAR_CONTAINER_CLASS}
      // Breathing room under a notch/dynamic island/rounded corner, if any
      // (0 everywhere else) - see the `viewport-fit=cover` meta tag in
      // index.html, which is what makes these env() calls resolve to
      // something nonzero. The rail sits flush against the right edge, so
      // it also needs the right inset; the bar only ever needs the top one.
      style={{ paddingTop: "env(safe-area-inset-top)", paddingRight: isRail ? "env(safe-area-inset-right)" : undefined }}
    >
      <div className={ENTRY_CLASS}>
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

      {hasIntroText && (
        <div className={ENTRY_CLASS}>
          <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500">Info</span>
          <button
            type="button"
            onClick={onShowIntro}
            aria-label="Show level info"
            title="Show level info"
            className="flex h-6 w-6 items-center justify-center rounded text-slate-500 transition-colors hover:text-slate-300"
          >
            <InfoIcon />
          </button>
        </div>
      )}

      {items.map((item) => (
        <div key={item.label} className={ENTRY_CLASS}>
          <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500">{item.label}</span>
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
});
