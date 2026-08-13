import type { Multiverse } from "../engine/multiverse/Multiverse.ts";
import { entityOutcomes } from "../engine/multiverse/StateGroup.ts";
import type { GhostLayer, Point, Scene } from "../render/types.ts";

// This is the only module that imports from both ../engine and ../render:
// it translates live simulation state into the plain, engine-agnostic Scene
// the renderer draws. Nothing under src/render or src/components should
// ever import the engine directly.

const PLAYER_COLOR = 0x60a5fa;
const BOX_PALETTE = [0xf59e0b, 0xf43f5e, 0x10b981, 0x8b5cf6, 0x38bdf8, 0xfb7185, 0xa3e635, 0xfacc15];

/**
 * Builds one Scene that overlays every currently-represented universe: for
 * the player and for each box entity, every distinct position it could be
 * in - across every StateGroup - is collected and drawn translucently on
 * top of each other. Groups that already agree contribute the same
 * position once (no visual difference from being "merged"), which is
 * exactly the point of that merge.
 */
export function buildCombinedScene(mv: Multiverse): Scene {
  const groups = mv.getGroups();

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
    entities,
  };
}

function dedupeLayer(id: string, color: number, positions: readonly Point[]): GhostLayer {
  const byKey = new Map<string, Point>();
  for (const p of positions) byKey.set(`${p.x},${p.y}`, p);
  return { id, color, positions: [...byKey.values()] };
}
