import { memo, useEffect, useRef } from "react";
import { directionOf, escapePoints, geometryOf, headPoints, pointsAttribute, STROKE_WIDTH } from "@/game/geometry";
import type { Level, PathPiece as Piece } from "@/game/types";

export const PathPiece = memo(function PathPiece({ piece, blocked, locked, onTap }: {
  piece: Piece; blocked: boolean; locked: boolean; onTap: (id: string) => void;
}) {
  const direction = directionOf(piece.points);
  const label = `Piece ${piece.id.split("-")[1]}, pointing ${direction}`;
  return <g className={`path-piece${blocked ? " path-blocked" : ""}`} role="button" tabIndex={locked ? -1 : 0}
    aria-label={label} aria-disabled={locked} data-piece-id={piece.id}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault(); event.stopPropagation();
        if (!locked) onTap(piece.id);
      }
    }}>
    <title>{label}</title>
    <polyline className="piece-body" points={pointsAttribute(piece.points)} />
    <polyline className="piece-head" points={pointsAttribute(headPoints(piece.points))} />
  </g>;
});

export function EscapingPiece({ piece, level, attempt, move, onFinish }: {
  piece: Piece; level: Level; attempt: number; move: number; onFinish: (attempt: number, move: number) => void;
}) {
  const bodyRef = useRef<SVGPolylineElement>(null), headRef = useRef<SVGPolylineElement>(null), groupRef = useRef<SVGGElement>(null);
  useEffect(() => {
    const { length, head, vector } = geometryOf(piece);
    const distanceToEdge = vector.x > 0 ? level.width - head.x : vector.x < 0 ? head.x : vector.y > 0 ? level.height - head.y : head.y;
    const travel = length + distanceToEdge + 4;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 80 : Math.max(250, Math.min(650, 200 + travel / Math.max(level.width, level.height) * 400));
    const start = performance.now();
    let frame = 0, finished = false;
    const finish = () => { if (!finished) { finished = true; onFinish(attempt, move); } };
    const timer = window.setTimeout(finish, duration + 120);
    const tick = (now: number) => {
      if (finished) return;
      const progress = Math.min(1, (now - start) / duration);
      if (reduced) groupRef.current?.setAttribute("opacity", String(1 - progress));
      else {
        const points = escapePoints(piece, travel * progress * progress);
        bodyRef.current?.setAttribute("points", pointsAttribute(points));
        headRef.current?.setAttribute("points", pointsAttribute(headPoints(points)));
      }
      if (progress === 1) finish(); else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { finished = true; cancelAnimationFrame(frame); window.clearTimeout(timer); };
  }, [piece, level, attempt, move, onFinish]);

  return <g ref={groupRef} className="escaping-piece" aria-hidden="true" strokeWidth={STROKE_WIDTH}>
    <polyline ref={bodyRef} className="piece-body" points={pointsAttribute(piece.points)} />
    <polyline ref={headRef} className="piece-head" points={pointsAttribute(headPoints(piece.points))} />
  </g>;
}
