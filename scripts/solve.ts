// CLI entry point for `npm run solve <level-file.json>` - see package.json.
// Runs the same solveLevel/analyzeSolution the in-app dev-only SolverPanel
// uses (src/components/SolverPanel.tsx), just reported to the terminal
// instead of a React panel.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseLevelJson } from "../src/engine/levels/jsonLevel.ts";
import type { LevelJson } from "../src/engine/levels/jsonLevel.ts";
import { solveLevel } from "../src/engine/solve/solveLevel.ts";
import { analyzeSolution } from "../src/engine/solve/analyzeSolution.ts";
import { formatMoves } from "../src/engine/solve/formatMoves.ts";

const LEVELS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../src/content/levels");

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const arg = process.argv[2];
if (!arg) {
  fail("Usage: npm run solve <level-file.json>\n  e.g. npm run solve 2_multiverse.json");
}

const fileName = arg.endsWith(".json") ? arg : `${arg}.json`;
const filePath = resolve(LEVELS_DIR, fileName);

let json: LevelJson;
try {
  json = JSON.parse(readFileSync(filePath, "utf-8"));
} catch (err) {
  fail(`Couldn't read level file "${fileName}" from ${LEVELS_DIR}:\n  ${(err as Error).message}`);
}

const parsed = parseLevelJson(json);

console.log(`Solving level ${parsed.number} - "${parsed.name}" (${fileName})...`);

const startedAt = performance.now();
const moves = solveLevel(parsed.level);
const elapsedMs = performance.now() - startedAt;

if (!moves) {
  console.log(`No solution found. (${elapsedMs.toFixed(0)}ms)`);
  process.exit(1);
}

const stats = analyzeSolution(parsed.level, moves);

console.log(`Solved in ${elapsedMs.toFixed(0)}ms\n`);
console.log(`Optimal moves:        ${stats.moveCount}`);
console.log(`Move sequence:        ${formatMoves(moves)}`);
console.log(`Max state groups:     ${stats.maxStateGroups}`);
console.log(`Max player locations: ${stats.maxPlayerLocations}`);
