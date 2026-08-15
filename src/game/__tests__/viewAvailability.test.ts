import { describe, expect, it } from "vitest";
import { firstAvailableView, isViewAvailable } from "../viewAvailability.ts";
import type { LevelViews } from "../../engine/levels/jsonLevel.ts";

const UNRESTRICTED: LevelViews = { merged: "unrestricted", perCharacter: "unrestricted", perUniverse: "unrestricted" };

describe("isViewAvailable", () => {
  it("is always available when unrestricted", () => {
    expect(isViewAvailable(UNRESTRICTED, 1, 0)).toBe(true);
    expect(isViewAvailable(UNRESTRICTED, 1, 50)).toBe(true);
  });

  it("is never available when disabled", () => {
    const views: LevelViews = { ...UNRESTRICTED, perUniverse: "disabled" };
    expect(isViewAvailable(views, 3, 0)).toBe(false);
    expect(isViewAvailable(views, 3, 5)).toBe(false);
  });

  it("is available only before any moves have been made when 'before-moves'", () => {
    const views: LevelViews = { ...UNRESTRICTED, merged: "before-moves" };
    expect(isViewAvailable(views, 1, 0)).toBe(true);
    expect(isViewAvailable(views, 1, 1)).toBe(false);
  });
});

describe("firstAvailableView", () => {
  it("picks the lowest-numbered available view", () => {
    const views: LevelViews = { merged: "disabled", perCharacter: "unrestricted", perUniverse: "unrestricted" };
    expect(firstAvailableView(views, 0)).toBe(2);
  });

  it("re-evaluates 'before-moves' views as moves accumulate", () => {
    const views: LevelViews = { merged: "before-moves", perCharacter: "unrestricted", perUniverse: "unrestricted" };
    expect(firstAvailableView(views, 0)).toBe(1);
    expect(firstAvailableView(views, 1)).toBe(2);
  });
});
