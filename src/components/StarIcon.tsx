import type { StarTier } from "../game/starRating.ts";

export interface StarIconProps {
  readonly tier: StarTier;
  readonly className?: string;
}

const TIER_COLOR: Readonly<Record<StarTier, string>> = {
  bronze: "#cd7f32",
  silver: "#c0c0c0",
  gold: "#facc15",
};

/** A single filled star, colored by tier - see starRating.ts. */
export function StarIcon({ tier, className }: StarIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={TIER_COLOR[tier]} aria-hidden="true">
      <path d="M12 2.5l2.95 6.28 6.85.86-5.07 4.77 1.4 6.79L12 17.9l-6.13 3.3 1.4-6.79-5.07-4.77 6.85-.86z" />
    </svg>
  );
}
