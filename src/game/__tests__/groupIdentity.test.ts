import { describe, expect, it } from "vitest";
import { matchGroupIdentities } from "../groupIdentity.ts";
import type { IdentifiedGroup } from "../groupIdentity.ts";
import type { StateGroup } from "../../engine/multiverse/StateGroup.ts";

function group(player: { x: number; y: number }, axisSubsets: Record<string, number[]>): StateGroup {
  return {
    player,
    axisSubsets: new Map(Object.entries(axisSubsets).map(([id, values]) => [id, new Set(values)])),
    overrides: new Map(),
  };
}

function idGen(start = 0) {
  let n = start;
  return () => n++;
}

describe("matchGroupIdentities", () => {
  it("assigns fresh ids when there is no previous state", () => {
    const groups = [group({ x: 1, y: 1 }, { a: [0] }), group({ x: 2, y: 2 }, { a: [1] })];
    const result = matchGroupIdentities([], groups, idGen());
    expect(result.map((r) => r.id)).toEqual([0, 1]);
  });

  it("keeps a group's id across moves based on its universes, not its position", () => {
    const prev: IdentifiedGroup[] = [{ id: 0, group: group({ x: 3, y: 5 }, { a: [0, 1, 2] }) }];
    const moved = group({ x: 4, y: 5 }, { a: [0, 1, 2] }); // same universes, player just moved
    const result = matchGroupIdentities(prev, [moved], idGen(100));
    expect(result).toEqual([{ id: 0, group: moved }]);
  });

  it("does not swap identities when two branches move the same direction and their positions cross", () => {
    // The reported bug: branch A at x=3, branch B at x=4. Both move Left by
    // one. A ends at x=2, B ends at x=3 - B's new position numerically
    // equals A's *old* position, which is exactly what tripped up
    // position-based matching. Identity here is carried by axis "a"'s
    // subset, which is untouched by simply walking, so it must not be
    // fooled by the coincidental numeric overlap.
    const prevA = group({ x: 3, y: 0 }, { a: [0] });
    const prevB = group({ x: 4, y: 0 }, { a: [1] });
    const prev: IdentifiedGroup[] = [
      { id: 10, group: prevA },
      { id: 20, group: prevB },
    ];

    const newA = group({ x: 2, y: 0 }, { a: [0] }); // A moved left
    const newB = group({ x: 3, y: 0 }, { a: [1] }); // B moved left onto A's old spot

    // Order shouldn't matter for correctness, but feed them as the adapter
    // would (sorted by new position): B (x=2... wait newA is x=2) then newB.
    const result = matchGroupIdentities(prev, [newA, newB], idGen(1000));

    const byId = new Map(result.map((r) => [r.id, r.group]));
    expect(byId.get(10)).toBe(newA); // id 10 (branch A) still tracks its own group
    expect(byId.get(20)).toBe(newB); // id 20 (branch B) still tracks its own group
  });

  it("gives exactly one child the parent's id when a group splits, and a fresh id to the other", () => {
    const parent = group({ x: 0, y: 0 }, { a: [0, 1] });
    const prev: IdentifiedGroup[] = [{ id: 5, group: parent }];

    const childA = group({ x: 1, y: 0 }, { a: [0] });
    const childB = group({ x: 2, y: 0 }, { a: [1] });
    const result = matchGroupIdentities(prev, [childA, childB], idGen(50));

    const ids = result.map((r) => r.id);
    expect(ids).toContain(5);
    expect(new Set(ids).size).toBe(2); // the two children get distinct ids
    const winner = result.find((r) => r.id === 5)!;
    expect([childA, childB]).toContain(winner.group);
  });

  it("carries an id forward through a merge, matching the parent with the larger overlap", () => {
    const smallParent: IdentifiedGroup = { id: 1, group: group({ x: 0, y: 0 }, { a: [0] }) };
    const bigParent: IdentifiedGroup = { id: 2, group: group({ x: 1, y: 0 }, { a: [1, 2] }) };

    const merged = group({ x: 3, y: 0 }, { a: [0, 1, 2] });
    const result = matchGroupIdentities([smallParent, bigParent], [merged], idGen(900));

    expect(result).toEqual([{ id: 2, group: merged }]); // bigParent has more overlap (2 vs 1)
  });

  it("treats groups from a level with no axes as continuously the same, not endlessly new", () => {
    const prev: IdentifiedGroup[] = [{ id: 7, group: group({ x: 0, y: 0 }, {}) }];
    const moved = group({ x: 1, y: 0 }, {});
    const result = matchGroupIdentities(prev, [moved], idGen(300));
    expect(result).toEqual([{ id: 7, group: moved }]);
  });

  it("drops a previous id whose branch no longer exists", () => {
    const prev: IdentifiedGroup[] = [
      { id: 1, group: group({ x: 0, y: 0 }, { a: [0] }) },
      { id: 2, group: group({ x: 5, y: 5 }, { a: [1] }) },
    ];
    const onlySurvivor = group({ x: 0, y: 1 }, { a: [0] });
    const result = matchGroupIdentities(prev, [onlySurvivor], idGen(400));
    expect(result).toEqual([{ id: 1, group: onlySurvivor }]);
  });
});
