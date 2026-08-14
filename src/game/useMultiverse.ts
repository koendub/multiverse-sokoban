import { useCallback, useRef, useState } from "react";
import type { DirectionName } from "../engine/multiverse/types.ts";
import { Multiverse } from "../engine/multiverse/Multiverse.ts";
import type { LevelDef } from "../engine/levels/level.ts";
import { totalUniverseCount, universeKeyAt } from "../engine/levels/level.ts";
import { buildCombinedScene, buildSingleUniverseScene, buildSplitScenesByPlayerPosition } from "./sceneAdapter.ts";
import type { IdentifiedScene } from "./sceneAdapter.ts";
import { matchGroupIdentities } from "./groupIdentity.ts";
import type { IdentifiedGroup } from "./groupIdentity.ts";
import { computeStats } from "./stats.ts";
import type { MultiverseStats } from "./stats.ts";
import type { Scene } from "../render/types.ts";

export interface MultiverseSnapshot {
  readonly combinedScene: Scene;
  readonly splitScenes: readonly IdentifiedScene[];
  readonly singleUniverseScene: Scene;
  readonly stats: MultiverseStats;
  readonly solved: boolean;
}

/** Mutable, persisted across snapshots so split-view boards keep a stable identity (see groupIdentity.ts). */
interface IdentityState {
  groups: readonly IdentifiedGroup[];
  nextId: number;
}

function snapshot(multiverse: Multiverse, level: LevelDef, universeIndex: number, identity: IdentityState): MultiverseSnapshot {
  const matchedGroups = matchGroupIdentities(identity.groups, multiverse.getGroups(), () => identity.nextId++);
  identity.groups = matchedGroups;

  return {
    combinedScene: buildCombinedScene(multiverse),
    splitScenes: buildSplitScenesByPlayerPosition(multiverse, matchedGroups),
    singleUniverseScene: buildSingleUniverseScene(multiverse, universeKeyAt(level, universeIndex)),
    stats: computeStats(multiverse, level),
    solved: multiverse.isSolved(),
  };
}

/**
 * Owns one Multiverse instance for the lifetime of `level`. Multiverse is a
 * plain mutable class (step/undo/restart mutate it in place), so - unlike
 * ordinary derived-during-render values - a fresh snapshot (every scene
 * variant, stats, solved) is computed and pushed via setState right when an
 * action happens, rather than re-derived from `multiverse` on every render.
 * That sidesteps a real footgun with this codebase's React Compiler setup:
 * memoizing a call like `buildCombinedScene(multiverse)` purely by
 * `multiverse`'s identity would cache it forever, since mutating the
 * instance never changes that identity. This applies just as much to
 * `singleUniverseScene`, which also depends on `universeIndex` - so
 * cycling it goes through the same setState path as step/undo/restart.
 *
 * Also tracks a move counter (steps taken, minus undone ones), so the
 * caller can report how many moves a solve took via `onSolved`.
 */
export function useMultiverse(level: LevelDef, onSolved?: (moves: number) => void) {
  const multiverseRef = useRef<Multiverse | null>(null);
  if (!multiverseRef.current) multiverseRef.current = new Multiverse(level);
  const multiverse = multiverseRef.current;

  const identityRef = useRef<IdentityState | null>(null);
  if (!identityRef.current) identityRef.current = { groups: [], nextId: 0 };

  const totalUniverses = Math.max(1, Number(totalUniverseCount(level)));
  const moveCountRef = useRef(0);
  const [universeIndex, setUniverseIndex] = useState(0);
  const [state, setState] = useState(() => snapshot(multiverse, level, universeIndex, identityRef.current!));

  const step = useCallback(
    (dir: DirectionName) => {
      multiverse.step(dir);
      moveCountRef.current += 1;
      const next = snapshot(multiverse, level, universeIndex, identityRef.current!);
      setState(next);
      if (next.solved) onSolved?.(moveCountRef.current);
    },
    [multiverse, level, universeIndex, onSolved],
  );

  const undo = useCallback(() => {
    if (multiverse.undo()) {
      moveCountRef.current = Math.max(0, moveCountRef.current - 1);
      setState(snapshot(multiverse, level, universeIndex, identityRef.current!));
    }
  }, [multiverse, level, universeIndex]);

  const restart = useCallback(() => {
    multiverse.restart();
    moveCountRef.current = 0;
    identityRef.current = { groups: [], nextId: 0 }; // a fresh playthrough starts identity numbering over
    setState(snapshot(multiverse, level, universeIndex, identityRef.current));
  }, [multiverse, level, universeIndex]);

  const goToUniverse = useCallback(
    (index: number) => {
      const normalized = ((index % totalUniverses) + totalUniverses) % totalUniverses;
      setUniverseIndex(normalized);
      setState(snapshot(multiverse, level, normalized, identityRef.current!));
    },
    [multiverse, level, totalUniverses],
  );

  const cycleUniverse = useCallback(() => {
    goToUniverse(universeIndex + 1);
  }, [goToUniverse, universeIndex]);

  return { multiverse, ...state, universeIndex, totalUniverses, step, undo, restart, goToUniverse, cycleUniverse };
}
