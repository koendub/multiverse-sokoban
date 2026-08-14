import type { Multiverse } from "../engine/multiverse/Multiverse.ts";
import { entityOutcomes } from "../engine/multiverse/StateGroup.ts";
import type { StateGroup } from "../engine/multiverse/StateGroup.ts";
import type { UniverseKey } from "../engine/multiverse/types.ts";
import type { Facing, GhostLayer, Point, Scene } from "../render/types.ts";
import type { IdentifiedGroup } from "./groupIdentity.ts";

// This is the only module that imports from both ../engine and ../render:
// it translates live simulation state into the plain, engine-agnostic Scene
// the renderer draws. Nothing under src/render or src/components should
// ever import the engine directly.

const PLAYER_COLOR = 0x60a5fa;

/** Tint applied to the single box sprite, one color per box entity (up to 9 before repeating). */
const BOX_PALETTE = [0xef4444, 0x3b82f6, 0x22c55e, 0xf97316, 0xa855f7, 0x06b6d4, 0xeab308, 0xec4899, 0x14b8a6];

/**
 * Builds one Scene that overlays the given groups: for the player and each
 * box entity, every distinct position it could be in - across those groups
 * - is collected and drawn translucently on top of each other. Groups that
 * already agree contribute the same position once.
 *
 * `facing` (the last direction input) isn't simulation state - it's purely
 * which way the player sprite should point - so it's passed in by the
 * caller (see useMultiverse.ts) rather than derived here.
 */
function buildSceneForGroups(mv: Multiverse, groups: readonly StateGroup[], facing: Facing): Scene {
  const player = dedupeLayer("player", PLAYER_COLOR, groups.map((g) => g.player));

  const entities: GhostLayer[] = [...mv.entities.entries()].map(([entityId, spec], index) => {
    const positions = groups.flatMap((group) => entityOutcomes(group, entityId, spec).map((o) => o.value));
    return dedupeLayer(entityId, BOX_PALETTE[index % BOX_PALETTE.length], positions);
  });

  return {
    width: mv.grid.width,
    height: mv.grid.height,
    walls: mv.grid.allWalls(),
    goals: mv.grid.allGoals(),
    player,
    playerFacing: facing,
    entities,
  };
}

/** View 1: every currently-represented universe overlaid into a single board. */
export function buildCombinedScene(mv: Multiverse, facing: Facing): Scene {
  return buildSceneForGroups(mv, mv.getGroups(), facing);
}

export interface IdentifiedScene {
  readonly id: number;
  readonly scene: Scene;
}

/**
 * View 2: one Scene per distinct player location currently in play, each
 * overlaying only the groups that share it.
 *
 * `orderedGroups` must come from matchGroupIdentities (see groupIdentity.ts
 * and useMultiverse.ts) rather than being freshly sorted by position here:
 * position is a *derived* value that can coincidentally collide between
 * unrelated branches (e.g. two branches moving the same direction can make
 * one's new position equal another's old one), so sorting by it would
 * reshuffle boards that never actually changed. Cluster order instead
 * follows `orderedGroups`' own (already-stable) order, and each cluster's
 * id is the smallest id among its member groups.
 */
export function buildSplitScenesByPlayerPosition(mv: Multiverse, orderedGroups: readonly IdentifiedGroup[], facing: Facing): IdentifiedScene[] {
  const order: string[] = [];
  const clusters = new Map<string, { id: number; groups: StateGroup[] }>();

  for (const { id, group } of orderedGroups) {
    const key = `${group.player.x},${group.player.y}`;
    const cluster = clusters.get(key);
    if (cluster) {
      cluster.groups.push(group);
      cluster.id = Math.min(cluster.id, id);
    } else {
      clusters.set(key, { id, groups: [group] });
      order.push(key);
    }
  }

  return order.map((key) => {
    const cluster = clusters.get(key)!;
    return { id: cluster.id, scene: buildSceneForGroups(mv, cluster.groups, facing) };
  });
}

/** View 3: one specific, fully-resolved universe - never more than one position per layer. */
export function buildSingleUniverseScene(mv: Multiverse, key: UniverseKey, facing: Facing): Scene {
  const view = mv.getUniverseView(key);

  const player: GhostLayer = { id: "player", color: PLAYER_COLOR, positions: [view.player] };
  const entities: GhostLayer[] = [...mv.entities.keys()].map((entityId, index) => ({
    id: entityId,
    color: BOX_PALETTE[index % BOX_PALETTE.length],
    positions: [view.boxes.get(entityId)!],
  }));

  return {
    width: mv.grid.width,
    height: mv.grid.height,
    walls: mv.grid.allWalls(),
    goals: mv.grid.allGoals(),
    player,
    playerFacing: facing,
    entities,
  };
}

function dedupeLayer(id: string, color: number, positions: readonly Point[]): GhostLayer {
  const byKey = new Map<string, Point>();
  for (const p of positions) byKey.set(`${p.x},${p.y}`, p);
  return { id, color, positions: [...byKey.values()] };
}
