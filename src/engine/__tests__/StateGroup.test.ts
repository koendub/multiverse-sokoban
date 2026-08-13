import { describe, expect, it } from "vitest";
import { entityOutcomes, representativeValue, restrictGroupByAxis } from "../multiverse/StateGroup.ts";
import type { StateGroup } from "../multiverse/StateGroup.ts";
import { constantEntity, variantEntity } from "../multiverse/entities.ts";

function group(axisSubset: number[]): StateGroup {
  return {
    player: { x: 0, y: 0 },
    axisSubsets: new Map([["a", new Set(axisSubset)]]),
    overrides: new Map(),
  };
}

describe("entityOutcomes", () => {
  it("a constant entity has exactly one outcome, unrelated to any axis", () => {
    const spec = constantEntity({ x: 5, y: 5 });
    const outcomes = entityOutcomes(group([0, 1, 2]), "e", spec);
    expect(outcomes).toEqual([{ value: { x: 5, y: 5 }, axisValues: [] }]);
  });

  it("a variant entity buckets by distinct resulting value, not by raw axis value", () => {
    const spec = variantEntity("a", [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 0 },
    ]);
    const outcomes = entityOutcomes(group([0, 1, 2, 3]), "e", spec);
    expect(outcomes).toHaveLength(2);
    const byX = new Map(outcomes.map((o) => [o.value.x, o.axisValues.slice().sort()]));
    expect(byX.get(0)).toEqual([0, 1]);
    expect(byX.get(1)).toEqual([2, 3]);
  });

  it("an override takes precedence over the position table", () => {
    const spec = variantEntity(
      "a",
      [0, 1, 2].map((v) => ({ x: v, y: 0 })),
    );
    const g: StateGroup = { ...group([0, 1, 2]), overrides: new Map([["e", { x: 99, y: 99 }]]) };
    expect(entityOutcomes(g, "e", spec)).toEqual([{ value: { x: 99, y: 99 }, axisValues: [] }]);
  });
});

describe("restrictGroupByAxis", () => {
  it("narrows one axis and leaves everything else untouched", () => {
    const g = group([0, 1, 2]);
    const restricted = restrictGroupByAxis(g, "a", new Set([1]));
    expect(restricted.axisSubsets.get("a")).toEqual(new Set([1]));
    expect(restricted.player).toBe(g.player);
    expect(restricted.overrides).toBe(g.overrides);
  });
});

describe("representativeValue", () => {
  it("resolves via the position table when not overridden", () => {
    const spec = variantEntity(
      "a",
      [0, 1, 2].map((v) => ({ x: v * 10, y: 0 })),
    );
    expect(representativeValue(group([2]), "e", spec)).toEqual({ x: 20, y: 0 });
  });
});
