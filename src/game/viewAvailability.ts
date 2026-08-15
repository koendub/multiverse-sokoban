import type { LevelViews, ViewRestriction } from "../engine/levels/jsonLevel.ts";
import type { ViewMode } from "./useViewKeys.ts";

const VIEW_KEY_BY_MODE: Readonly<Record<ViewMode, keyof LevelViews>> = {
  1: "merged",
  2: "perCharacter",
  3: "perUniverse",
};

const ALL_MODES: readonly ViewMode[] = [1, 2, 3];

export function restrictionForMode(views: LevelViews, mode: ViewMode): ViewRestriction {
  return views[VIEW_KEY_BY_MODE[mode]];
}

/** "before-moves" is available exactly while `movesMade` is still 0. */
export function isViewAvailable(views: LevelViews, mode: ViewMode, movesMade: number): boolean {
  const restriction = restrictionForMode(views, mode);
  if (restriction === "disabled") return false;
  if (restriction === "before-moves") return movesMade === 0;
  return true;
}

/** The lowest-numbered available view, for picking a starting view or a fallback once the current one stops being available. Falls back to 1 if every view is somehow disabled, so callers always get a mode back. */
export function firstAvailableView(views: LevelViews, movesMade: number): ViewMode {
  return ALL_MODES.find((mode) => isViewAvailable(views, mode, movesMade)) ?? 1;
}
