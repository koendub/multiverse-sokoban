import { describe, expect, it } from "vitest";
import { Multiverse } from "../../engine/multiverse/Multiverse.ts";
import { variantEntity } from "../../engine/multiverse/entities.ts";
import type { LevelDef } from "../../engine/levels/level.ts";
import { universeKeyAt } from "../../engine/levels/level.ts";
import { buildCombinedScene, buildSingleUniverseScene, buildSplitScenesByPlayerPosition } from "../sceneAdapter.ts";
import type { IdentifiedGroup } from "../groupIdentity.ts";

/** Fresh, order-preserving identity assignment for a Multiverse's current groups - fine for tests, which don't care about cross-step continuity here. */
function identify(mv: Multiverse): IdentifiedGroup[] {
  return mv.getGroups().map((group, id) => ({ id, group }));
}

// A box that blocks the player's push in universe 0 (wall right behind it)
// but sits out of the way entirely in universe 1, so moving Right makes the
// player's position genuinely diverge between the two universes.
const level: LevelDef = {
  width: 4,
  height: 4,
  walls: [
    { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 },
    { x: 0, y: 1 }, { x: 3, y: 1 },
    { x: 0, y: 2 }, { x: 3, y: 2 },
    { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
  ],
  goals: [],
  player: { x: 1, y: 1 },
  entities: {
    b: variantEntity("a", [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ]),
  },
};

function sortByPosition(points: readonly { x: number; y: number }[]) {
  return [...points].sort((a, b) => a.x - b.x || a.y - b.y);
}

describe("buildSplitScenesByPlayerPosition", () => {
  it("returns a single scene while every player position agrees", () => {
    const mv = new Multiverse(level);
    expect(buildSplitScenesByPlayerPosition(mv, identify(mv), "down")).toHaveLength(1);
  });

  it("splits into one scene per distinct player position once they diverge", () => {
    const mv = new Multiverse(level);
    mv.step("Right"); // blocked (wall behind box) for universe 0, walks through for universe 1

    const scenes = buildSplitScenesByPlayerPosition(mv, identify(mv), "down");
    expect(scenes).toHaveLength(2);
    for (const { scene } of scenes) expect(scene.player.positions).toHaveLength(1);

    const positions = sortByPosition(scenes.map(({ scene }) => scene.player.positions[0]));
    expect(positions).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
  });

  it("covers the same set of player positions as the combined view", () => {
    const mv = new Multiverse(level);
    mv.step("Right");

    const combined = sortByPosition(buildCombinedScene(mv, "down").player.positions);
    const split = sortByPosition(buildSplitScenesByPlayerPosition(mv, identify(mv), "down").map(({ scene }) => scene.player.positions[0]));
    expect(split).toEqual(combined);
  });
});

describe("buildSingleUniverseScene", () => {
  it("shows exactly one position per layer", () => {
    const mv = new Multiverse(level);
    const scene = buildSingleUniverseScene(mv, universeKeyAt(level, 0), "down");
    expect(scene.player.positions).toHaveLength(1);
    for (const entity of scene.entities) expect(entity.positions).toHaveLength(1);
  });

  it("reflects each universe's own box position", () => {
    const mv = new Multiverse(level);
    const scene0 = buildSingleUniverseScene(mv, universeKeyAt(level, 0), "down");
    const scene1 = buildSingleUniverseScene(mv, universeKeyAt(level, 1), "down");
    expect(scene0.entities[0].positions[0]).toEqual({ x: 2, y: 1 });
    expect(scene1.entities[0].positions[0]).toEqual({ x: 2, y: 2 });
  });
});
