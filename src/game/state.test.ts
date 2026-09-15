import { describe, expect, it } from "vitest";
import { gameReducer, initialState } from "./state";
import type { Level } from "./types";

const fixture: Level = { id: 1, width: 10, height: 6, pieces: [
  { id: "1-1", points: [{ x: 1, y: 2 }, { x: 3, y: 2 }] },
  { id: "1-2", points: [{ x: 6, y: 2 }, { x: 8, y: 2 }] },
] };

describe("path game transitions", () => {
  it("removes a legal piece logically before its visual escape finishes", () => {
    const start = initialState(fixture), next = gameReducer(start, { type: "tap", id: "1-2" });
    expect(next.phase).toBe("animating");
    expect(next.remaining).toHaveLength(1);
    expect(next.feedback?.piece.id).toBe("1-2");
    expect(next.lives).toBe(3);
    expect(start.remaining).toEqual(fixture.pieces);
    expect(gameReducer(next, { type: "tap", id: "1-1" })).toBe(next);
  });
  it("charges exactly three blocked taps and restart restores the attempt", () => {
    let state = initialState(fixture);
    for (let lives = 2; lives >= 0; lives--) {
      state = gameReducer(state, { type: "tap", id: "1-1" });
      expect(state.lives).toBe(lives);
      expect(gameReducer(state, { type: "tap", id: "1-1" })).toBe(state);
      state = gameReducer(state, { type: "finish", attempt: state.attempt, move: state.move });
    }
    expect(state.phase).toBe("failed");
    expect(gameReducer(state, { type: "tap", id: "1-2" })).toBe(state);
    expect(gameReducer(state, { type: "restart" }).remaining).toEqual(fixture.pieces);
    expect(gameReducer(state, { type: "restart" }).lives).toBe(3);
  });
  it("completes once after the final escape and keeps progress on restart", () => {
    let state = initialState({ ...fixture, pieces: [fixture.pieces[1]] });
    state = gameReducer(state, { type: "tap", id: "1-2" });
    expect(state.phase).toBe("animating");
    state = gameReducer(state, { type: "finish", attempt: state.attempt, move: state.move });
    expect(state.phase).toBe("completed");
    expect(state.completed).toEqual([1]);
    expect(gameReducer(state, { type: "restart" }).completed).toEqual([1]);
    expect(gameReducer(state, { type: "finish", attempt: state.attempt, move: state.move })).toBe(state);
  });
  it("ignores stale callbacks, unknown IDs, and input before hydration", () => {
    const start = initialState(fixture);
    expect(gameReducer(start, { type: "tap", id: "missing" })).toBe(start);
    const old = gameReducer(start, { type: "tap", id: "1-2" });
    const next = gameReducer(gameReducer(old, { type: "restart" }), { type: "tap", id: "1-2" });
    expect(gameReducer(next, { type: "finish", attempt: old.attempt, move: old.move })).toBe(next);
    expect(gameReducer(next, { type: "finish", attempt: next.attempt, move: next.move - 1 })).toBe(next);
    const loading = initialState(fixture, 0, [], false);
    expect(gameReducer(loading, { type: "tap", id: "1-2" })).toBe(loading);
    expect(gameReducer(loading, { type: "hydrate", level: fixture, completed: [1] }).phase).toBe("completed");
  });
});
