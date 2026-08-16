import type { EntityId, Vec2 } from "../multiverse/types.ts";
import { constantEntity, variantEntity } from "../multiverse/entities.ts";
import type { EntityRole, EntitySpec } from "../multiverse/entities.ts";
import type { LevelDef } from "./level.ts";

/**
 * On-disk level format. Deliberately plain data (no functions) so levels
 * can be authored and loaded as JSON:
 *
 * - `grid` is an ASCII mask: '#' wall, '.' floor, 'G' goal, 'P' the (single,
 *   universe-independent) player start. Rows must all be the same length.
 * - `entities` maps an entity id to a "box" (pushable, must reach a goal to
 *   solve the level) or a "wall" (blocks movement like the grid, but can
 *   vary or be absent per universe, and is never pushable). Each entity is
 *   either a fixed position (`pos`) or tied to an axis (`axis` + one
 *   `positions` entry per axis value, `null` meaning "absent there"). Axis
 *   ids and sizes are never declared separately - see deriveAxes in
 *   entities.ts - they're inferred from how entities use them, and every
 *   entity sharing an axis id must declare the same number of positions.
 */
export interface LevelJsonEntityConstant {
  readonly type: EntityRole;
  readonly pos: Vec2;
}

export interface LevelJsonEntityVariant {
  readonly type: EntityRole;
  readonly axis: string;
  readonly positions: readonly (Vec2 | null)[];
}

export type LevelJsonEntity = LevelJsonEntityConstant | LevelJsonEntityVariant;

/**
 * How available one of the 3 view modes is on a level:
 * - "unrestricted" (the default, same as omitting the view entirely): usable anytime.
 * - "before-moves": only usable while the player hasn't moved yet this playthrough.
 * - "disabled": never usable.
 */
export type ViewRestriction = "unrestricted" | "before-moves" | "disabled";

export interface LevelJsonViews {
  /** View 1: every currently-represented universe overlaid into one render. */
  readonly merged?: ViewRestriction;
  /** View 2: one render per distinct player location. */
  readonly perCharacter?: ViewRestriction;
  /** View 3: one render for a single, fully-resolved universe. */
  readonly perUniverse?: ViewRestriction;
}

/** Same shape as `LevelJsonViews`, but with every entry defaulted - see `parseViews`. */
export interface LevelViews {
  readonly merged: ViewRestriction;
  readonly perCharacter: ViewRestriction;
  readonly perUniverse: ViewRestriction;
}

export interface LevelJson {
  readonly number: number;
  readonly name: string;
  readonly grid: readonly string[];
  readonly entities?: Readonly<Record<string, LevelJsonEntity>>;
  /** Optional blurb shown above the game render. Omit for no text at all. */
  readonly text?: string;
  /** Move counts for the silver/gold star thresholds - see starRating.ts. Both optional; omitting one just makes that tier unreachable. */
  readonly great?: number;
  readonly perfect?: number;
  /** Per-view availability restrictions. Any view not mentioned defaults to "unrestricted". */
  readonly views?: LevelJsonViews;
}

export interface ParsedLevel {
  readonly number: number;
  readonly name: string;
  readonly text?: string;
  readonly great?: number;
  readonly perfect?: number;
  readonly views: LevelViews;
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

const VALID_VIEW_RESTRICTIONS: ReadonlySet<string> = new Set<ViewRestriction>(["unrestricted", "before-moves", "disabled"]);

function parseViews(json: LevelJson, context: string): LevelViews {
  const views = json.views ?? {};
  const pick = (key: keyof LevelJsonViews): ViewRestriction => {
    const value = views[key];
    if (value === undefined) return "unrestricted";
    if (!VALID_VIEW_RESTRICTIONS.has(value)) fail(context, `views.${key} has invalid value "${value}"`);
    return value;
  };
  return { merged: pick("merged"), perCharacter: pick("perCharacter"), perUniverse: pick("perUniverse") };
}

const VALID_ROLES: ReadonlySet<string> = new Set<EntityRole>(["box", "wall"]);

function inBounds(pos: Vec2, width: number, height: number): boolean {
  return pos.x >= 0 && pos.y >= 0 && pos.x < width && pos.y < height;
}

function parseEntities(json: LevelJson, bounds: { width: number; height: number }, context: string): Record<EntityId, EntitySpec> {
  const entities: Record<EntityId, EntitySpec> = {};
  const positionCountByAxis = new Map<string, number>();

  for (const [entityId, spec] of Object.entries(json.entities ?? {})) {
    const entityContext = `${context}, entity "${entityId}"`;
    if (!VALID_ROLES.has(spec.type)) fail(entityContext, `unknown type "${spec.type}"`);

    if ("pos" in spec) {
      if (!inBounds(spec.pos, bounds.width, bounds.height)) fail(entityContext, `position (${spec.pos.x},${spec.pos.y}) is out of bounds`);
      entities[entityId] = constantEntity({ x: spec.pos.x, y: spec.pos.y }, spec.type);
    } else if ("positions" in spec) {
      if (!Array.isArray(spec.positions) || spec.positions.length === 0) fail(entityContext, "'positions' must be a non-empty array");

      const expectedSize = positionCountByAxis.get(spec.axis);
      if (expectedSize !== undefined && expectedSize !== spec.positions.length) {
        fail(
          entityContext,
          `axis "${spec.axis}" has ${spec.positions.length} positions here but ${expectedSize} on another entity - every entity sharing an axis must declare the same number of positions`,
        );
      }
      positionCountByAxis.set(spec.axis, spec.positions.length);

      const positions = spec.positions.map((p, i) => {
        if (p === null) return null;
        if (!inBounds(p, bounds.width, bounds.height)) fail(entityContext, `position #${i} (${p.x},${p.y}) is out of bounds`);
        return { x: p.x, y: p.y };
      });
      entities[entityId] = variantEntity(spec.axis, positions, spec.type);
    } else {
      fail(entityContext, "must have either 'pos' or 'positions'");
    }
  }

  return entities;
}

export function parseLevelJson(json: LevelJson): ParsedLevel {
  if (typeof json !== "object" || json === null) throw new Error("Level JSON must be an object");
  if (!Number.isInteger(json.number)) throw new Error("Level JSON missing an integer 'number'");
  const context = `Level ${json.number}`;
  if (typeof json.name !== "string" || !json.name) fail(context, "missing 'name'");

  if (json.text !== undefined && typeof json.text !== "string") fail(context, "'text' must be a string if present");
  if (json.great !== undefined && (!Number.isInteger(json.great) || json.great < 0)) fail(context, "'great' must be a non-negative integer if present");
  if (json.perfect !== undefined && (!Number.isInteger(json.perfect) || json.perfect < 0)) fail(context, "'perfect' must be a non-negative integer if present");

  const { width, height, walls, goals, player } = parseGrid(json, context);
  const entities = parseEntities(json, { width, height }, context);
  const views = parseViews(json, context);

  const level: LevelDef = { width, height, walls, goals, player, entities };
  return { number: json.number, name: json.name, text: json.text, great: json.great, perfect: json.perfect, views, level };
}
