import { useEffect, useRef, useState, type ReactNode } from "react";
import { Scan, ZoomIn, ZoomOut } from "lucide-react";
import { findTapCandidates, geometryOf, STROKE_WIDTH } from "@/game/geometry";
import type { Level, PathPiece, Point } from "@/game/types";

type Camera = { zoom: number; x: number; y: number };
type Pointer = { start: Point; current: Point };
type Gesture = { camera: Camera; moved: boolean; pinch: { distance: number; zoom: number; anchor: Point } | null };

export function BoardViewport({ level, pieces, locked, children, onTap, onKeyboard }: {
  level: Level; pieces: readonly PathPiece[]; locked: boolean; children: ReactNode;
  onTap: (id: string) => void; onKeyboard: () => void;
}) {
  const initial = { zoom: 1, x: level.width / 2, y: level.height / 2 };
  const [camera, setCamera] = useState<Camera>(initial);
  const [ambiguous, setAmbiguous] = useState<string[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const cameraRef = useRef(camera);
  const pointers = useRef(new Map<number, Pointer>());
  const gesture = useRef<Gesture | null>(null);
  const timerRef = useRef<number | null>(null);
  const width = level.width + 4, height = level.height + 4;

  useEffect(() => { cameraRef.current = camera; }, [camera]);
  useEffect(() => () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); }, []);

  function clamp(next: Camera): Camera {
    const zoom = Math.max(1, Math.min(6, next.zoom));
    const halfWidth = width / zoom / 2, halfHeight = height / zoom / 2;
    return { zoom, x: Math.max(-2 + halfWidth, Math.min(level.width + 2 - halfWidth, next.x)), y: Math.max(-2 + halfHeight, Math.min(level.height + 2 - halfHeight, next.y)) };
  }
  function update(next: Camera) {
    const bounded = clamp(next);
    cameraRef.current = bounded;
    setCamera(bounded);
  }
  function toWorld(point: Point): Point | null {
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return null;
    const mapped = new DOMPoint(point.x, point.y).matrixTransform(matrix.inverse());
    return { x: mapped.x, y: mapped.y };
  }
  function anchoredZoom(zoom: number, anchor: Point, screen: Point) {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const boundedZoom = Math.max(1, Math.min(6, zoom));
    update({ zoom: boundedZoom, x: anchor.x - ((screen.x - bounds.left) / bounds.width - .5) * width / boundedZoom, y: anchor.y - ((screen.y - bounds.top) / bounds.height - .5) * height / boundedZoom });
  }
  function startPinch() {
    const [a, b] = [...pointers.current.values()].map((p) => p.current);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, anchor = toWorld(mid);
    if (anchor && gesture.current) {
      gesture.current.moved = true;
      gesture.current.pinch = { distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), zoom: cameraRef.current.zoom, anchor };
    }
  }
  function select(screen: Point) {
    if (locked) return;
    const point = toWorld(screen), matrix = svgRef.current?.getScreenCTM();
    if (!point || !matrix) return;
    const inverse = matrix.inverse();
    const candidates = findTapCandidates(point, pieces, Math.hypot(inverse.a, inverse.b));
    if (candidates.length === 1) onTap(candidates[0].id);
    else if (candidates.length > 1) {
      setAmbiguous(candidates.map((piece) => piece.id));
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setAmbiguous([]), 450);
    }
  }

  const viewWidth = width / camera.zoom, viewHeight = height / camera.zoom;
  return <div className="board-viewport">
    <svg ref={svgRef} className="path-board" viewBox={`${camera.x - viewWidth / 2} ${camera.y - viewHeight / 2} ${viewWidth} ${viewHeight}`}
      style={{ aspectRatio: `${width} / ${height}` }} strokeWidth={STROKE_WIDTH}
      role="group" aria-label={`Level ${level.id} path puzzle`} data-zoom={camera.zoom.toFixed(2)}
      onKeyDownCapture={onKeyboard}
      onFocus={(event) => {
        const id = (event.target as SVGGElement).dataset.pieceId;
        const piece = pieces.find((p) => p.id === id);
        if (!piece) return;
        const { head } = geometryOf(piece), current = cameraRef.current;
        if (Math.abs(head.x - current.x) > width / current.zoom / 2 - 1 || Math.abs(head.y - current.y) > height / current.zoom / 2 - 1) update({ ...current, x: head.x, y: head.y });
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || pointers.current.size >= 2) return;
        const point = { x: event.clientX, y: event.clientY };
        pointers.current.set(event.pointerId, { start: point, current: point });
        if (pointers.current.size === 1) gesture.current = { camera: cameraRef.current, moved: false, pinch: null };
        else startPinch();
        try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* A cancelled pointer may no longer be capturable. */ }
      }}
      onPointerMove={(event) => {
        const pointer = pointers.current.get(event.pointerId), active = gesture.current;
        if (!pointer || !active) return;
        pointer.current = { x: event.clientX, y: event.clientY };
        if (Math.hypot(pointer.current.x - pointer.start.x, pointer.current.y - pointer.start.y) > 8) active.moved = true;
        if (pointers.current.size === 2 && active.pinch) {
          const [a, b] = [...pointers.current.values()].map((p) => p.current);
          anchoredZoom(active.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y) / active.pinch.distance, active.pinch.anchor, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
        } else if (active.moved) {
          const bounds = event.currentTarget.getBoundingClientRect();
          update({ zoom: active.camera.zoom, x: active.camera.x - (pointer.current.x - pointer.start.x) * width / active.camera.zoom / bounds.width, y: active.camera.y - (pointer.current.y - pointer.start.y) * height / active.camera.zoom / bounds.height });
        }
      }}
      onPointerUp={(event) => {
        const pointer = pointers.current.get(event.pointerId), active = gesture.current;
        if (!pointer) return;
        pointers.current.delete(event.pointerId);
        if (pointer && active && !active.moved && Math.hypot(event.clientX - pointer.start.x, event.clientY - pointer.start.y) <= 8) select({ x: event.clientX, y: event.clientY });
        if (!pointers.current.size) gesture.current = null;
        else if (active) {
          active.camera = cameraRef.current; active.pinch = null; active.moved = true;
          for (const remaining of pointers.current.values()) remaining.start = remaining.current;
        }
      }}
      onPointerCancel={(event) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.delete(event.pointerId);
        if (!pointers.current.size) gesture.current = null;
        else if (gesture.current) {
          gesture.current.moved = true; gesture.current.pinch = null; gesture.current.camera = cameraRef.current;
          for (const pointer of pointers.current.values()) pointer.start = pointer.current;
        }
      }}
      onLostPointerCapture={(event) => { if (pointers.current.has(event.pointerId)) { pointers.current.delete(event.pointerId); if (gesture.current) gesture.current.moved = true; } }}>
      {children}
      {ambiguous.map((id) => {
        const piece = pieces.find((p) => p.id === id);
        return piece ? <polyline key={id} className="ambiguous-piece" points={piece.points.map((p) => `${p.x},${p.y}`).join(" ")} aria-hidden="true" /> : null;
      })}
    </svg>
    <div className="viewport-controls">
      <button type="button" className="icon-button" aria-label="Zoom out" title="Zoom out" disabled={camera.zoom <= 1} onClick={() => update({ ...cameraRef.current, zoom: cameraRef.current.zoom / 1.5 })}><ZoomOut size={18} /></button>
      <span className="zoom-value">{Math.round(camera.zoom * 100)}%</span>
      <button type="button" className="icon-button" aria-label="Zoom in" title="Zoom in" disabled={camera.zoom >= 6} onClick={() => update({ ...cameraRef.current, zoom: cameraRef.current.zoom * 1.5 })}><ZoomIn size={18} /></button>
      <span className="control-divider" />
      <button type="button" className="icon-button" aria-label="Fit puzzle" title="Fit puzzle" onClick={() => update(initial)}><Scan size={18} /></button>
    </div>
  </div>;
}
