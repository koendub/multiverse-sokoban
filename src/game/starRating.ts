export type StarTier = "bronze" | "silver" | "gold";

export interface StarThresholds {
  readonly great?: number;
  readonly perfect?: number;
}

/**
 * Bronze for simply finishing; silver at `moves <= great`; gold at
 * `moves <= perfect` (gold takes priority, so hitting both thresholds shows
 * as gold rather than silver). A level without `great`/`perfect` set can
 * only ever earn bronze.
 */
export function starTierForMoves(moves: number, thresholds: StarThresholds): StarTier {
  if (thresholds.perfect !== undefined && moves <= thresholds.perfect) return "gold";
  if (thresholds.great !== undefined && moves <= thresholds.great) return "silver";
  return "bronze";
}
