import { geometryOf, rayHitsSegment, segments, segmentsTooClose } from "./geometry.ts";
import type { Level, PathPiece } from "./types";

export function isBlocked(piece: PathPiece, remaining: readonly PathPiece[]): boolean {
  const { head, vector } = geometryOf(piece);
  return remaining.some((other) => other.id !== piece.id && geometryOf(other).segments.some((segment) => rayHitsSegment(head, vector, segment)));
}

export function validateLevel(level: Level): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(level.id) || level.id < 1) errors.push("Invalid level ID");
  if (!Number.isInteger(level.width) || !Number.isInteger(level.height) || level.width < 1 || level.height < 1) errors.push("Invalid board dimensions");
  if (!level.pieces.length) errors.push("Empty level");
  const ids = new Set<string>();
  for (const piece of level.pieces) {
    if (!piece.id || ids.has(piece.id)) errors.push("Duplicate or empty piece ID");
    ids.add(piece.id);
    if (piece.points.length < 2) { errors.push("Piece needs two points"); continue; }
    if (piece.points.some((p) => !Number.isInteger(p.x) || !Number.isInteger(p.y) || p.x < 0 || p.y < 0 || p.x > level.width || p.y > level.height)) errors.push("Point out of bounds");
    const lines = segments(piece.points);
    if (lines.some(({ a, b }) => a.x === b.x && a.y === b.y)) { errors.push("Zero-length segment"); continue; }
    if (lines.some(({ a, b }) => a.x !== b.x && a.y !== b.y)) { errors.push("Diagonal segment"); continue; }
    for (let i = 1; i < lines.length; i++) {
      const previous = lines[i - 1], current = lines[i];
      if ((previous.b.x - previous.a.x) * (current.b.x - current.a.x) + (previous.b.y - previous.a.y) * (current.b.y - current.a.y) < 0) errors.push("Reversed segment");
    }
    for (let i = 0; i < lines.length; i++) for (let j = i + 2; j < lines.length; j++) {
      if (segmentsTooClose(lines[i], lines[j])) errors.push("Self-intersection");
    }
    const { head, vector } = geometryOf(piece);
    if (lines.slice(0, -1).some((line) => rayHitsSegment(head, vector, line))) errors.push("Head ray crosses own body");
  }
  if (errors.length) return [...new Set(errors)];
  for (let i = 0; i < level.pieces.length; i++) for (let j = i + 1; j < level.pieces.length; j++) {
    if (geometryOf(level.pieces[i]).segments.some((a) => geometryOf(level.pieces[j]).segments.some((b) => segmentsTooClose(a, b)))) return ["Overlapping or insufficiently spaced pieces"];
  }
  // Every legal removal only removes blockers; greedy validation is sufficient.
  let remaining = [...level.pieces];
  while (remaining.length) {
    const accessible = remaining.find((piece) => !isBlocked(piece, remaining));
    if (!accessible) return ["Unsolvable level"];
    remaining = remaining.filter((piece) => piece.id !== accessible.id);
  }
  return [];
}
