import type { MultiverseStats } from "../game/stats.ts";

export interface StatsPanelProps {
  readonly stats: MultiverseStats;
}

function formatBig(n: bigint): string {
  return n.toLocaleString("en-US");
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const items: { label: string; value: string; hint: string }[] = [
    {
      label: "State groups",
      value: stats.groupCount.toLocaleString("en-US"),
      hint: "Distinct simulation buckets currently tracked",
    },
    {
      label: "Unique universes",
      value: formatBig(stats.totalUniverses),
      hint: "Total parallel universes this puzzle defines",
    },
    {
      label: "Completed universes",
      value: `${formatBig(stats.completedUniverses)} / ${formatBig(stats.totalUniverses)}`,
      hint: "Universes with every box on a goal",
    },
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{item.label}</dt>
          <dd className="mt-1 text-2xl font-semibold text-slate-50">{item.value}</dd>
          <dd className="mt-1 text-xs text-slate-500">{item.hint}</dd>
        </div>
      ))}
    </dl>
  );
}
