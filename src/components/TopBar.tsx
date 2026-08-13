import type { MultiverseStats } from "../game/stats.ts";

export interface TopBarProps {
  readonly levelNumber: number;
  readonly levelName: string;
  readonly stats: MultiverseStats;
}

function formatBig(n: bigint): string {
  return n.toLocaleString("en-US");
}

/**
 * A slim badge anchored to the top-center of the screen, sized to its
 * content (not the viewport width), with slanted sides that are wider at
 * the top than the bottom.
 */
export function TopBar({ levelNumber, levelName, stats }: TopBarProps) {
  const items = [
    { label: "Level", value: `${levelNumber} · ${levelName}` },
    { label: "State Groups", value: stats.groupCount.toLocaleString("en-US") },
    { label: "Unique Universes", value: formatBig(stats.totalUniverses) },
    { label: "Completed", value: `${formatBig(stats.completedUniverses)} / ${formatBig(stats.totalUniverses)}` },
  ];

  return (
    <div
      className="fixed left-1/2 top-0 z-40 flex w-fit -translate-x-1/2 divide-x divide-slate-700 bg-slate-900/95 text-slate-200 shadow-lg"
      style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 16px) 100%, 16px 100%)" }}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col items-center gap-0.5 px-6 pb-2.5 pt-3">
          <span className="whitespace-nowrap text-[10px] font-medium uppercase tracking-wide text-slate-500">{item.label}</span>
          <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
