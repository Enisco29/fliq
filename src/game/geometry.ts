import type { Direction, PathPiece, Point } from "./types";

export type Segment = Readonly<{ a: Point; b: Point }>;
export const CLEARANCE = 0.28;
export const STROKE_WIDTH = 0.2;
export const HEAD_SIZE = 0.4;
const vectors: Record<Direction, Point> = {
  right: { x: 1, y: 0 }, left: { x: -1, y: 0 },
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
};
const cache = new WeakMap<PathPiece, ReturnType<typeof measure>>();

export function segments(points: readonly Point[]): Segment[] {
  return points.slice(1).map((b, i) => ({ a: points[i], b }));
}
export function directionOf(points: readonly Point[]): Direction {
  const a = points[points.length - 2], b = points[points.length - 1];
  return b.x > a.x ? "right" : b.x < a.x ? "left" : b.y > a.y ? "down" : "up";
}
export function vectorOf(points: readonly Point[]): Point { return vectors[directionOf(points)]; }
export function pointsAttribute(points: readonly Point[]): string { return points.map((p) => `${p.x},${p.y}`).join(" "); }
export function headPoints(points: readonly Point[]): Point[] {
  const tip = points[points.length - 1], v = vectorOf(points);
  return [
    { x: tip.x - v.x * HEAD_SIZE + v.y * HEAD_SIZE, y: tip.y - v.y * HEAD_SIZE - v.x * HEAD_SIZE },
    tip,
    { x: tip.x - v.x * HEAD_SIZE - v.y * HEAD_SIZE, y: tip.y - v.y * HEAD_SIZE + v.x * HEAD_SIZE },
  ];
}
export function rayHitsSegment(head: Point, v: Point, segment: Segment, clearance = CLEARANCE): boolean {
  const minX = Math.min(segment.a.x, segment.b.x) - clearance, maxX = Math.max(segment.a.x, segment.b.x) + clearance;
  const minY = Math.min(segment.a.y, segment.b.y) - clearance, maxY = Math.max(segment.a.y, segment.b.y) + clearance;
  if (v.x) return head.y >= minY && head.y <= maxY && (v.x > 0 ? maxX > head.x : minX < head.x);
  return head.x >= minX && head.x <= maxX && (v.y > 0 ? maxY > head.y : minY < head.y);
}
export function distanceToSegment(point: Point, { a, b }: Segment): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}
export function segmentsTooClose(a: Segment, b: Segment, clearance = CLEARANCE): boolean {
  const cross = a.a.x === a.b.x
    ? a.a.x >= Math.min(b.a.x, b.b.x) && a.a.x <= Math.max(b.a.x, b.b.x) && b.a.y >= Math.min(a.a.y, a.b.y) && b.a.y <= Math.max(a.a.y, a.b.y)
    : b.a.x >= Math.min(a.a.x, a.b.x) && b.a.x <= Math.max(a.a.x, a.b.x) && a.a.y >= Math.min(b.a.y, b.b.y) && a.a.y <= Math.max(b.a.y, b.b.y);
  if ((a.a.x === a.b.x) !== (b.a.x === b.b.x) && cross) return true;
  return Math.min(distanceToSegment(a.a, b), distanceToSegment(a.b, b), distanceToSegment(b.a, a), distanceToSegment(b.b, a)) <= clearance;
}
function measure(piece: PathPiece) {
  const lines = segments(piece.points), cumulative = [0];
  for (const { a, b } of lines) cumulative.push(cumulative[cumulative.length - 1] + Math.abs(b.x - a.x) + Math.abs(b.y - a.y));
  return { segments: lines, cumulative, length: cumulative[cumulative.length - 1], head: piece.points[piece.points.length - 1], vector: vectorOf(piece.points) };
}
export function geometryOf(piece: PathPiece) {
  let geometry = cache.get(piece);
  if (!geometry) { geometry = measure(piece); cache.set(piece, geometry); }
  return geometry;
}
function pointAt(piece: PathPiece, distance: number): Point {
  const { cumulative, length, vector, head } = geometryOf(piece);
  if (distance >= length) return { x: head.x + vector.x * (distance - length), y: head.y + vector.y * (distance - length) };
  const i = Math.max(0, cumulative.findIndex((end) => end > distance) - 1);
  const a = piece.points[i], b = piece.points[i + 1];
  const t = (distance - cumulative[i]) / (Math.abs(b.x - a.x) + Math.abs(b.y - a.y));
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
// A fixed-length window follows the original route, then its straight extension.
export function escapePoints(piece: PathPiece, distance: number): Point[] {
  const { cumulative, length } = geometryOf(piece), end = distance + length;
  return [pointAt(piece, distance), ...piece.points.filter((_, i) => cumulative[i] > distance && cumulative[i] < end), pointAt(piece, end)];
}
export function findTapCandidates(point: Point, pieces: readonly PathPiece[], unitsPerPixel: number): PathPiece[] {
  const candidates = pieces.map((piece) => ({ piece, distance: Math.min(...geometryOf(piece).segments.map((segment) => distanceToSegment(point, segment))) / unitsPerPixel }))
    .filter((entry) => entry.distance <= 12).sort((a, b) => a.distance - b.distance);
  if (!candidates.length) return [];
  return candidates.filter((entry) => entry.distance - candidates[0].distance < 2).map((entry) => entry.piece);
}
