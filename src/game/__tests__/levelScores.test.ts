import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAllBestMoves, recordSolve } from "../levelScores.ts";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("levelScores", () => {
  const original = (globalThis as { localStorage?: unknown }).localStorage;

  beforeEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = new MemoryStorage();
  });

  afterEach(() => {
    (globalThis as { localStorage?: unknown }).localStorage = original;
  });

  it("starts empty when nothing has been recorded", () => {
    expect(getAllBestMoves()).toEqual({});
  });

  it("records a solve and reflects it in the returned map and future reads", () => {
    const result = recordSolve(3, 12);
    expect(result[3]).toBe(12);
    expect(getAllBestMoves()[3]).toBe(12);
  });

  it("keeps the lower of two recorded scores for the same level", () => {
    recordSolve(5, 20);
    const afterBetter = recordSolve(5, 8);
    expect(afterBetter[5]).toBe(8);

    const afterWorse = recordSolve(5, 15);
    expect(afterWorse[5]).toBe(8); // worse attempt does not overwrite the best
  });

  it("tracks separate levels independently", () => {
    recordSolve(1, 10);
    recordSolve(2, 25);
    const all = getAllBestMoves();
    expect(all[1]).toBe(10);
    expect(all[2]).toBe(25);
  });
});
