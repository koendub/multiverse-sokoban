import type { StateGroup } from "../engine/multiverse/StateGroup.ts";

export interface IdentifiedGroup {
  readonly id: number;
  readonly group: StateGroup;
}

/**
 * How much of `a` and `b`'s underlying universes overlap: for each axis,
 * how many values their subsets share, summed across axes. This is the
 * right continuity signal (unlike player position or entity positions,
 * which are *derived* and change every move) because axis-subset
 * membership is exactly what's conserved as groups split and merge - a
 * split's children are each a strict subset of the parent, and a merge's
 * result is the union of its parents, so overlap is never coincidental the
 * way two groups' screen positions can be.
 */
function overlapScore(a: StateGroup, b: StateGroup): number {
  // A level with no axes at all has exactly one possible group forever -
  // nothing distinguishes "this group" from "that group" (there's nothing
  // to compare), so treat them as trivially the same rather than as
  // permanently unrelated.
  if (a.axisSubsets.size === 0 && b.axisSubsets.size === 0) return 1;

  let score = 0;
  for (const [axisId, subsetA] of a.axisSubsets) {
    const subsetB = b.axisSubsets.get(axisId);
    if (!subsetB) continue;
    for (const value of subsetA) if (subsetB.has(value)) score++;
  }
  return score;
}

/**
 * Assigns each of `groups` a stable id: the id of whichever `prev` group it
 * overlaps with most (its most likely parent), or a freshly-minted id via
 * `nextId()` if it doesn't meaningfully overlap with any remaining `prev`
 * group (a genuinely new branch, or the level has no axes to compare at
 * all - in which case there's only ever one group anyway). Each `prev`
 * group can donate its id to at most one new group, so when a group splits
 * in two, exactly one child keeps the id and the other is treated as new.
 *
 * Matching is resolved globally by strongest overlap first (not by
 * scanning `prev` in order), so e.g. in a merge, the parent that
 * contributed *more* of the merged group's universes wins its id even if
 * it appears later in `prev`.
 *
 * Pure and side-effect free: callers own persisting the result for next
 * time (see useMultiverse.ts).
 */
export function matchGroupIdentities(prev: readonly IdentifiedGroup[], groups: readonly StateGroup[], nextId: () => number): IdentifiedGroup[] {
  const candidates: { prevIndex: number; groupIndex: number; score: number }[] = [];
  prev.forEach((p, prevIndex) => {
    groups.forEach((group, groupIndex) => {
      const score = overlapScore(p.group, group);
      if (score > 0) candidates.push({ prevIndex, groupIndex, score });
    });
  });
  candidates.sort((a, b) => b.score - a.score);

  const groupIndexByPrevIndex = new Map<number, number>();
  const claimedGroups = new Set<number>();
  const claimedPrev = new Set<number>();
  for (const c of candidates) {
    if (claimedGroups.has(c.groupIndex) || claimedPrev.has(c.prevIndex)) continue;
    claimedGroups.add(c.groupIndex);
    claimedPrev.add(c.prevIndex);
    groupIndexByPrevIndex.set(c.prevIndex, c.groupIndex);
  }

  // Output order: continuing branches first, in their previous relative
  // order (this is what keeps split-view boards from reshuffling), then
  // genuinely new branches appended.
  const result: IdentifiedGroup[] = [];
  prev.forEach((p, prevIndex) => {
    const groupIndex = groupIndexByPrevIndex.get(prevIndex);
    if (groupIndex === undefined) return;
    result.push({ id: p.id, group: groups[groupIndex] });
  });
  groups.forEach((group, index) => {
    if (claimedGroups.has(index)) return;
    result.push({ id: nextId(), group });
  });

  return result;
}
