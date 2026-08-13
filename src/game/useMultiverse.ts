import { useCallback, useRef, useState } from "react";
import type { DirectionName } from "../engine/multiverse/types.ts";
import { Multiverse } from "../engine/multiverse/Multiverse.ts";
import type { LevelDef } from "../engine/levels/level.ts";
import { buildCombinedScene } from "./sceneAdapter.ts";
import { computeStats } from "./stats.ts";
import type { MultiverseStats } from "./stats.ts";
import type { Scene } from "../render/types.ts";

export interface MultiverseSnapshot {
  readonly scene: Scene;
  readonly stats: MultiverseStats;
  readonly solved: boolean;
}

function snapshot(multiverse: Multiverse, level: LevelDef): MultiverseSnapshot {
  return {
    scene: buildCombinedScene(multiverse),
    stats: computeStats(multiverse, level),
    solved: multiverse.isSolved(),
  };
}

/**
 * Owns one Multiverse instance for the lifetime of `level`. Multiverse is a
 * plain mutable class (step/undo/restart mutate it in place), so - unlike
 * ordinary derived-during-render values - a fresh Scene/stats snapshot is
 * computed and pushed via setState right when an action happens, rather
 * than re-derived from `multiverse` on every render. That sidesteps a real
 * footgun with this codebase's React Compiler setup: memoizing a call like
 * `buildCombinedScene(multiverse)` purely by `multiverse`'s identity would
 * cache it forever, since mutating the instance never changes that identity.
 *
 * Also tracks a move counter (steps taken, minus undone ones), so the
 * caller can report how many moves a solve took via `onSolved`.
 */
export function useMultiverse(level: LevelDef, onSolved?: (moves: number) => void) {
  const multiverseRef = useRef<Multiverse | null>(null);
  if (!multiverseRef.current) multiverseRef.current = new Multiverse(level);
  const multiverse = multiverseRef.current;

  const moveCountRef = useRef(0);
  const [state, setState] = useState(() => snapshot(multiverse, level));

  const step = useCallback(
    (dir: DirectionName) => {
      multiverse.step(dir);
      moveCountRef.current += 1;
      const next = snapshot(multiverse, level);
      setState(next);
      if (next.solved) onSolved?.(moveCountRef.current);
    },
    [multiverse, level, onSolved],
  );

  const undo = useCallback(() => {
    if (multiverse.undo()) {
      moveCountRef.current = Math.max(0, moveCountRef.current - 1);
      setState(snapshot(multiverse, level));
    }
  }, [multiverse, level]);

  const restart = useCallback(() => {
    multiverse.restart();
    moveCountRef.current = 0;
    setState(snapshot(multiverse, level));
  }, [multiverse, level]);

  return { multiverse, ...state, step, undo, restart };
}
