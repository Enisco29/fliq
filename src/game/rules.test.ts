import { describe, expect, it } from "vitest";
import { levels } from "./levels";
import { isBlocked, validateLevel } from "./rules";
import type { Level, PathPiece } from "./types";

const piece = (id: string, coords: number[][]): PathPiece => ({ id, points: coords.map(([x, y]) => ({ x, y })) });
const level = (pieces: PathPiece[]): Level => ({ id: 1, width: 20, height: 20, pieces });

describe("head-ray blocking", () => {
  it.each([0, 1, 2, 3])("checks perpendicular and collinear obstacles in rotation %s", (rotation) => {
    const rotate = (coords: number[][]) => coords.map(([x, y]) => {
      for (let r = 0; r < rotation; r++) [x, y] = [10 - y, x];
      return [x, y];
    });
    const a = piece("a", rotate([[2, 3], [5, 3]]));
    expect(isBlocked(a, [a, piece("b", rotate([[8, 1], [8, 5]]))])).toBe(true);
    expect(isBlocked(a, [a, piece("b", rotate([[7, 3], [9, 3]]))])).toBe(true);
    expect(isBlocked(a, [a, piece("b", rotate([[0, 1], [0, 5]]))])).toBe(false);
    expect(isBlocked(a, [a, piece("b", rotate([[7, 6], [8, 6]]))])).toBe(false);
  });
  it("does not treat empty space within an L-shaped bounding box as occupied", () => {
    const a = piece("a", [[8, 6], [8, 7], [9, 7]]);
    expect(isBlocked(a, [a, piece("b", [[7, 6], [7, 8], [10, 8]])])).toBe(false);
  });
});

describe("level validation", () => {
  it("validates all 20 fixed, frozen layouts including the 300-piece board", () => {
    expect(levels).toHaveLength(20);
    expect(levels.at(-1)?.pieces).toHaveLength(300);
    expect(new Set(levels.map((l) => l.id)).size).toBe(20);
    for (const l of levels) {
      expect(validateLevel(l), `Level ${l.id}`).toEqual([]);
      expect(Object.isFrozen(l.pieces)).toBe(true);
      expect(l.pieces.every((p) => Object.isFrozen(p.points))).toBe(true);
      expect(l.pieces.some((p) => p.points.length > 2)).toBe(true);
    }
  }, 30000);
  it("clears every level under several different legal-choice orders", () => {
    for (const l of levels) for (let order = 0; order < 3; order++) {
      let remaining = [...l.pieces];
      while (remaining.length) {
        const legal = remaining.filter((p) => !isBlocked(p, remaining));
        expect(legal.length, `Level ${l.id}`).toBeGreaterThan(0);
        const chosen = legal[(remaining.length * (order + 1)) % legal.length];
        remaining = remaining.filter((p) => p.id !== chosen.id);
      }
    }
  }, 30000);
  it("rejects invalid geometry, overlap, self-ray crossings, and deadlocks", () => {
    expect(validateLevel(level([]))).toContain("Empty level");
    expect(validateLevel(level([piece("a", [[2, 2]])]))).toContain("Piece needs two points");
    expect(validateLevel(level([piece("a", [[2, 2], [2, 2]])]))).toContain("Zero-length segment");
    expect(validateLevel(level([piece("a", [[2, 2], [3, 3]])]))).toContain("Diagonal segment");
    expect(validateLevel(level([piece("a", [[2, 2], [22, 2]])]))).toContain("Point out of bounds");
    expect(validateLevel(level([piece("a", [[2, 2], [5, 2], [3, 2]])]))).toContain("Reversed segment");
    expect(validateLevel(level([piece("a", [[8, 2], [8, 5], [4, 5], [4, 2], [6, 2]])]))).toContain("Head ray crosses own body");
    expect(validateLevel(level([piece("a", [[2, 3], [5, 3]]), piece("b", [[4, 2], [4, 5]])]))).toContain("Overlapping or insufficiently spaced pieces");
    expect(validateLevel(level([piece("a", [[2, 3], [5, 3]]), piece("b", [[8, 3], [6, 3]])]))).toContain("Unsolvable level");
    expect(validateLevel(level([piece("a", [[2, 2], [4, 2]]), piece("a", [[2, 4], [4, 4]])]))).toContain("Duplicate or empty piece ID");
  });
});
