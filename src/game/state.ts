import { isBlocked } from "./rules";
import type { PathPiece, Level } from "./types";

export type GameState = {
  level: Level;
  remaining: readonly PathPiece[];
  lives: number;
  phase: "playing" | "animating" | "failed" | "completed";
  feedback: { piece: PathPiece; kind: "escape" | "blocked" } | null;
  attempt: number;
  move: number;
  completed: number[];
  ready: boolean;
};

export type GameAction =
  | { type: "load"; level: Level }
  | { type: "hydrate"; level: Level; completed: number[] }
  | { type: "restart" }
  | { type: "tap"; id: string }
  | { type: "finish"; attempt: number; move: number };

export function initialState(level: Level, attempt = 0, completed: number[] = [], ready = true): GameState {
  return { level, remaining: [...level.pieces], lives: 3, phase: "playing", feedback: null, attempt, move: 0, completed, ready };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "hydrate": {
      const hydrated = initialState(action.level, state.attempt + 1, action.completed);
      return action.completed.includes(action.level.id) ? { ...hydrated, remaining: [], phase: "completed" } : hydrated;
    }
    case "load": return initialState(action.level, state.attempt + 1, state.completed, state.ready);
    case "restart": return initialState(state.level, state.attempt + 1, state.completed, state.ready);
    case "tap": {
      if (!state.ready || state.phase !== "playing" || state.feedback) return state;
      const piece = state.remaining.find((item) => item.id === action.id);
      if (!piece) return state;
      if (isBlocked(piece, state.remaining)) {
        const lives = state.lives - 1;
        return { ...state, lives, phase: lives === 0 ? "failed" : "playing", feedback: { piece, kind: "blocked" }, move: state.move + 1 };
      }
      return { ...state, remaining: state.remaining.filter((item) => item.id !== piece.id), phase: "animating", feedback: { piece, kind: "escape" }, move: state.move + 1 };
    }
    case "finish": {
      if (action.attempt !== state.attempt || action.move !== state.move || !state.feedback) return state;
      const phase = state.phase === "failed" ? "failed" : state.remaining.length === 0 ? "completed" : "playing";
      const completed = phase === "completed" && !state.completed.includes(state.level.id)
        ? [...state.completed, state.level.id].sort((a, b) => a - b) : state.completed;
      return { ...state, feedback: null, phase, completed };
    }
  }
}
