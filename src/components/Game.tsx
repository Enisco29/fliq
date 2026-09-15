"use client";

import { useCallback, useEffect, useReducer, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { levels } from "@/game/levels";
import { gameReducer, initialState } from "@/game/state";
import { readProgress, saveProgress } from "@/game/progress";
import { Board } from "./Board";
import { GameHeader } from "./GameHeader";
import { LevelPicker } from "./LevelPicker";
import { ResultPanel } from "./ResultPanel";

export function Game() {
  const [state, dispatch] = useReducer(gameReducer, levels[0], (level) => initialState(level, 0, [], false));
  const { completed, ready } = state;
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    const saved = readProgress();
    // Defer browser-only state so server markup and the first client render agree.
    const timer = window.setTimeout(() => {
      dispatch({ type: "hydrate", completed: saved, level: levels.find((level) => !saved.includes(level.id)) ?? levels[levels.length - 1] });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) saveProgress(completed);
  }, [completed, ready]);

  const finish = useCallback((attempt: number, move: number) => dispatch({ type: "finish", attempt, move }), []);
  const tap = useCallback((id: string) => dispatch({ type: "tap", id }), []);
  const restart = () => dispatch({ type: "restart" });
  const select = (id: number) => {
    const level = levels.find((item) => item.id === id);
    if (!level || (id !== 1 && !completed.includes(id - 1))) return;
    dispatch({ type: "load", level });
    setPickerOpen(false);
  };
  const campaignComplete = completed.length === levels.length && state.level.id === 20;
  const announcement = state.phase === "completed" ? campaignComplete ? "All 20 levels completed." : `Level ${state.level.id} completed.` : state.phase === "failed" ? "No lives remaining. Try again." : state.feedback?.kind === "blocked" ? `Arrow blocked. ${state.lives} ${state.lives === 1 ? "life" : "lives"} remaining.` : "";

  return <div className="app-shell">
    <GameHeader level={state.level.id} completed={completed.length} lives={state.lives} ready={ready} onRestart={restart} onLevels={() => setPickerOpen(true)} />
    <main className="game-main">
      <div className="board-region" aria-busy={!ready}>
        <Board state={state} paused={!ready || pickerOpen} onTap={tap} onFinish={finish} />
        <div className="board-caption"><span className="caption-dot" /><span>{ready ? `${state.remaining.length} pieces remaining` : "Loading your progress"}</span></div>
      </div>
      <div className="outcome-region">
        {(state.phase === "completed" || state.phase === "failed") && <ResultPanel key={`${state.attempt}-${state.phase}`} failed={state.phase === "failed"} campaignComplete={campaignComplete}
          onNext={() => select(state.level.id + 1)} onReplay={restart} onLevels={() => setPickerOpen(true)} />}
      </div>
      <section className="journey" aria-label="Level progress">
        <div className="journey-label"><span>THE JOURNEY</span><span>{String(state.level.id).padStart(2, "0")} <span className="journey-slash">/</span> 20</span></div>
        <div className="journey-steps" aria-hidden="true">{levels.map((level) => <span key={level.id} className={`journey-step${completed.includes(level.id) ? " complete" : ""}${state.level.id === level.id ? " active" : ""}`}><span /></span>)}</div>
      </section>
    </main>
    <footer className="site-footer"><span>fliq</span><span>A little direction goes a long way.</span><ArrowUpRight className="footer-symbol" size={20} aria-hidden="true" /></footer>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    {pickerOpen && <LevelPicker current={state.level.id} completed={completed} onClose={() => setPickerOpen(false)} onSelect={select} />}
  </div>;
}
