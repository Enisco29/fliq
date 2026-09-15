import { useEffect, useRef } from "react";
import type { GameState } from "@/game/state";
import { BoardViewport } from "./BoardViewport";
import { EscapingPiece, PathPiece } from "./PathPiece";

export function Board({ state, paused, onTap, onFinish }: {
  state: GameState; paused: boolean; onTap: (id: string) => void; onFinish: (attempt: number, move: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null), keyboard = useRef(false);
  const { feedback, attempt, move } = state;
  useEffect(() => {
    if (feedback?.kind !== "blocked") return;
    const timer = window.setTimeout(() => onFinish(attempt, move), 280);
    return () => window.clearTimeout(timer);
  }, [feedback, attempt, move, onFinish]);
  useEffect(() => {
    if (!feedback && state.phase === "playing" && keyboard.current && !paused && document.activeElement === document.body) {
      ref.current?.querySelector<SVGGElement>(".path-piece")?.focus({ preventScroll: true });
    }
  }, [feedback, state.phase, paused]);
  const locked = paused || state.phase !== "playing" || !!feedback;
  return <div ref={ref} className={`board-stage${state.phase === "completed" ? " board-completed" : ""}`} onPointerDownCapture={() => { keyboard.current = false; }}>
    <BoardViewport key={attempt} level={state.level} pieces={state.remaining} locked={locked} onTap={onTap} onKeyboard={() => { keyboard.current = true; }}>
      {state.remaining.map((piece) => <PathPiece key={piece.id} piece={piece} blocked={feedback?.kind === "blocked" && feedback.piece.id === piece.id} locked={locked} onTap={onTap} />)}
      {feedback?.kind === "escape" && <EscapingPiece key={`${attempt}-${move}`} piece={feedback.piece} level={state.level} attempt={attempt} move={move} onFinish={onFinish} />}
    </BoardViewport>
  </div>;
}
