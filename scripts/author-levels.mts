import { writeFileSync } from "node:fs";
import { validateLevel } from "../src/game/rules.ts";
import type { PathPiece, Point } from "../src/game/types.ts";

// Offline only: carve a filled silhouette in legal removal order, then save points.
const counts = [8, 12, 16, 20, 28, 36, 45, 56, 70, 85, 100, 120, 140, 160, 180, 200, 225, 250, 275, 300];
let seed = 7219;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
const key = (p: Point) => `${p.x},${p.y}`;
const steps = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
function compress(points: Point[]): Point[] {
  return points.filter((p, i) => i === 0 || i === points.length - 1 || (p.x - points[i - 1].x) !== (points[i + 1].x - p.x) || (p.y - points[i - 1].y) !== (points[i + 1].y - p.y));
}

function author(count: number, index: number, extra: number) {
  const width = Math.ceil(Math.sqrt(count * 10)) + 6 + extra, height = Math.ceil(width * 1.12);
  const cells = new Map<string, Point>();
  for (let y = 1; y < height; y++) for (let x = 1; x < width; x++) {
    const canopy = ((x - width / 2) / (width * .47)) ** 2 + ((y - height * .32) / (height * .3)) ** 2 <= 1;
    const stem = ((x - width / 2) / (width * .24)) ** 2 + ((y - height * .72) / (height * .27)) ** 2 <= 1;
    if (canopy || stem) cells.set(`${x},${y}`, { x, y });
  }
  const pieces: PathPiece[] = [];
  function clearRay(head: Point, v: Point) {
    for (let x = head.x + v.x, y = head.y + v.y; x >= 0 && x <= width && y >= 0 && y <= height; x += v.x, y += v.y) {
      if (cells.has(`${x},${y}`)) return false;
    }
    return true;
  }
  while (cells.size) {
    const available = [...cells.values()];
    // Shuffle the scan start, keeping carving distributed around the boundary.
    const offset = Math.floor(random() * available.length);
    let head: Point | undefined, vector: Point | undefined;
    for (let i = 0; i < available.length; i++) {
      const candidate = available[(offset + i) % available.length];
      const neighbors = steps.filter((v) => cells.has(key({ x: candidate.x - v.x, y: candidate.y - v.y })));
      if (!neighbors.length) { cells.delete(key(candidate)); continue; }
      const directions = neighbors.filter((v) => clearRay(candidate, v));
      if (directions.length) { head = candidate; vector = directions[Math.floor(random() * directions.length)]; break; }
    }
    if (!head || !vector) { if (!cells.size) break; return null; }
    const behind = { x: head.x - vector.x, y: head.y - vector.y };
    const route = [head, behind], visited = new Set(route.map(key));
    const desired = 3 + Math.floor(random() * (index < 4 ? 6 : 10));
    for (let step = 0; step < desired; step++) {
      const previous = route[route.length - 1];
      const options = steps.map((v) => ({ x: previous.x + v.x, y: previous.y + v.y }))
        .filter((p) => cells.has(key(p)) && !visited.has(key(p)));
      if (!options.length) break;
      const next = options[Math.floor(random() * options.length)];
      route.push(next); visited.add(key(next));
    }
    pieces.push({ id: "", points: compress(route.reverse()) });
    route.forEach((p) => cells.delete(key(p)));
  }
  if (pieces.length < count) return null;
  // Dropping pieces removes blockers. Keep a uniformly distributed subset.
  const selected = Array.from({ length: count }, (_, i) => ({ ...pieces[Math.floor(i * pieces.length / count)], id: `${index + 1}-${i + 1}` }));
  return { id: index + 1, width, height, pieces: selected };
}

const campaign = counts.map((count, index) => {
  for (let retry = 0; retry < 5; retry++) {
    const level = author(count, index, retry * 2);
    if (!level) continue;
    const errors = validateLevel(level);
    if (errors.length) throw new Error(`Level ${level.id}: ${errors.join(", ")}`);
    console.log(`Level ${level.id}: ${level.pieces.length} pieces (${level.width} x ${level.height})`);
    return level;
  }
  throw new Error(`Could not author level ${index + 1} within the retry limit`);
});
writeFileSync(new URL("../src/game/levels-data.json", import.meta.url), JSON.stringify(campaign, null, 2) + "\n");
