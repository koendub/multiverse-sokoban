import type { EntityId, Vec2 } from "../multiverse/types.ts";
import type { Axis } from "../multiverse/entities.ts";
import { constantEntity, variantEntity } from "../multiverse/entities.ts";
import type { EntitySpec } from "../multiverse/entities.ts";
import type { LevelDef } from "./level.ts";

/**
 * On-disk level format. Deliberately plain data (no functions) so levels
 * can be authored and loaded as JSON:
 *
 * - `grid` is an ASCII mask: '#' wall, '.' floor, 'G' goal, 'P' the (single,
 *   universe-independent) player start. Rows must all be the same length.
 * - `axes` declares each independent source of variation and its domain size.
 * - `boxes` maps an entity id to either a fixed position ("constant") or a
 *   "variant" tied to one axis, with one explicit position per axis value.
 */
export interface LevelJsonAxis {
  readonly id: string;
  readonly size: number;
}

export interface LevelJsonConstantBox {
  readonly type: "constant";
  readonly pos: Vec2;
}

export interface LevelJsonVariantBox {
  readonly type: "variant";
  readonly axis: string;
  readonly positions: readonly Vec2[];
}

export type LevelJsonBox = LevelJsonConstantBox | LevelJsonVariantBox;

export interface LevelJson {
  readonly number: number;
  readonly name: string;
  readonly grid: readonly string[];
  readonly axes?: readonly LevelJsonAxis[];
  readonly boxes?: Readonly<Record<string, LevelJsonBox>>;
}

export interface ParsedLevel {
  readonly number: number;
  readonly name: string;
  readonly level: LevelDef;
}

function fail(context: string, message: string): never {
  throw new Error(`${context}: ${message}`);
}

function parseGrid(json: LevelJson, context: string): { width: number; height: number; walls: Vec2[]; goals: Vec2[]; player: Vec2 } {
  if (!Array.isArray(json.grid) || json.grid.length === 0) fail(context, "'grid' must be a non-empty array of strings");

  const height = json.grid.length;
  const width = json.grid[0].length;
  const walls: Vec2[] = [];
  const goals: Vec2[] = [];
  let player: Vec2 | undefined;

  json.grid.forEach((row, y) => {
    if (row.length !== width) fail(context, `row ${y} has length ${row.length}, expected ${width} (all rows must match)`);
    [...row].forEach((ch, x) => {
      switch (ch) {
        case "#":
          walls.push({ x, y });
          break;
        case "G":
          goals.push({ x, y });
          break;
        case "P":
          if (player) fail(context, `multiple player start cells ('P') found, second at (${x},${y})`);
          player = { x, y };
          break;
        case ".":
          break;
        default:
          fail(context, `unknown grid character '${ch}' at (${x},${y})`);
      }
    });
  });

  if (!player) fail(context, "grid has no player start ('P')");
  if (goals.length === 0) fail(context, "grid has no goals ('G')");

  return { width, height, walls, goals, player };
}

function parseAxes(json: LevelJson, context: string): Axis[] {
  return (json.axes ?? []).map((a): Axis => {
    if (!a.id) fail(context, "an axis is missing 'id'");
    if (!Number.isInteger(a.size) || a.size < 1) fail(context, `axis "${a.id}" has invalid size ${a.size}`);
    return { id: a.id, size: a.size };
  });
}

function inBounds(pos: Vec2, width: number, height: number): boolean {
  return pos.x >= 0 && pos.y >= 0 && pos.x < width && pos.y < height;
}

function parseBoxes(
  json: LevelJson,
  axes: readonly Axis[],
  bounds: { width: number; height: number },
  context: string,
): Record<EntityId, EntitySpec> {
  const axisById = new Map(axes.map((a) => [a.id, a]));
  const boxes: Record<EntityId, EntitySpec> = {};

  for (const [entityId, spec] of Object.entries(json.boxes ?? {})) {
    const boxContext = `${context}, box "${entityId}"`;
    if (spec.type === "constant") {
      if (!inBounds(spec.pos, bounds.width, bounds.height)) fail(boxContext, `position (${spec.pos.x},${spec.pos.y}) is out of bounds`);
      boxes[entityId] = constantEntity(spec.pos);
    } else if (spec.type === "variant") {
      const axis = axisById.get(spec.axis);
      if (!axis) fail(boxContext, `references unknown axis "${spec.axis}"`);
      if (!Array.isArray(spec.positions) || spec.positions.length !== axis.size) {
        fail(boxContext, `needs exactly ${axis.size} positions for axis "${spec.axis}", got ${spec.positions?.length ?? 0}`);
      }
      const positions = spec.positions.map((p, i) => {
        if (!inBounds(p, bounds.width, bounds.height)) fail(boxContext, `position #${i} (${p.x},${p.y}) is out of bounds`);
        return { x: p.x, y: p.y };
      });
      boxes[entityId] = variantEntity(axis.id, positions);
    } else {
      fail(boxContext, `unknown type "${(spec as LevelJsonBox).type}"`);
    }
  }

  return boxes;
}

export function parseLevelJson(json: LevelJson): ParsedLevel {
  if (typeof json !== "object" || json === null) throw new Error("Level JSON must be an object");
  if (!Number.isInteger(json.number)) throw new Error("Level JSON missing an integer 'number'");
  const context = `Level ${json.number}`;
  if (typeof json.name !== "string" || !json.name) fail(context, "missing 'name'");

  const { width, height, walls, goals, player } = parseGrid(json, context);
  const axes = parseAxes(json, context);
  const boxes = parseBoxes(json, axes, { width, height }, context);

  const level: LevelDef = { width, height, walls, goals, axes, player, boxes };
  return { number: json.number, name: json.name, level };
}
