import { describe, expect, it } from "vitest";
import { directionOf, escapePoints, findTapCandidates, geometryOf, pointsAttribute } from "./geometry";
import type { PathPiece } from "./types";

const bent: PathPiece = { id: "1-1", points: [{ x: 2, y: 8 }, { x: 6, y: 8 }, { x: 6, y: 3 }, { x: 9, y: 3 }] };

describe("path geometry", () => {
  it("derives direction and caches route measurements", () => {
    expect(directionOf(bent.points)).toBe("right");
    expect(geometryOf(bent).length).toBe(12);
    expect(geometryOf(bent)).toBe(geometryOf(bent));
  });
  it("follows bends and preserves body length as the head exits straight", () => {
    expect(escapePoints(bent, 0)).toEqual(bent.points);
    const points = escapePoints(bent, 5);
    expect(points[0]).toEqual({ x: 6, y: 7 });
    expect(points.at(-1)).toEqual({ x: 14, y: 3 });
    expect(geometryOf({ id: "moving", points }).length).toBe(12);
    expect(escapePoints(bent, 20)).toEqual([{ x: 17, y: 3 }, { x: 29, y: 3 }]);
    expect(pointsAttribute(points)).not.toContain("NaN");
  });
  it("selects the nearest path and exposes close competing candidates", () => {
    const a = { id: "a", points: [{ x: 0, y: 0 }, { x: 5, y: 0 }] };
    const b = { id: "b", points: [{ x: 0, y: 1 }, { x: 5, y: 1 }] };
    expect(findTapCandidates({ x: 2, y: 0 }, [a, b], .1)).toEqual([a]);
    expect(findTapCandidates({ x: 2, y: .5 }, [a, b], .1)).toHaveLength(2);
    expect(findTapCandidates({ x: 20, y: 20 }, [a, b], .1)).toEqual([]);
  });
});
