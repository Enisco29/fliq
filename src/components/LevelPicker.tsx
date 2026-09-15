import { useEffect, useRef } from "react";
import { Check, LockKeyhole, X } from "lucide-react";
import { levels } from "@/game/levels";

export function LevelPicker({ current, completed, onClose, onSelect }: {
  current: number; completed: number[]; onClose: () => void; onSelect: (id: number) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector<HTMLButtonElement>("[aria-current='step']")?.focus();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);
  return <dialog ref={ref} className="level-dialog" aria-labelledby="levels-title" onCancel={onClose}
    onClick={(event) => { if (event.target === event.currentTarget) {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    } }}>
    <div className="dialog-heading"><div><p className="eyebrow">YOUR JOURNEY</p><h2 id="levels-title">The levels</h2></div>
      <button type="button" className="icon-button" aria-label="Close level picker" title="Close" onClick={onClose}><X size={20} /></button></div>
    <div className="level-grid">
      {levels.map((level, index) => {
        const done = completed.includes(level.id), unlocked = index === 0 || completed.includes(levels[index - 1].id);
        return <button type="button" key={level.id} className={`level-tile${done ? " done" : ""}${current === level.id ? " current" : ""}`}
          disabled={!unlocked} aria-label={`Level ${level.id}${done ? ", completed" : unlocked ? ", unlocked" : ", locked"}`}
          aria-current={current === level.id ? "step" : undefined} onClick={() => onSelect(level.id)}>
          <span>{String(level.id).padStart(2, "0")}</span>{done ? <Check size={12} aria-hidden="true" /> : !unlocked ? <LockKeyhole size={11} aria-hidden="true" /> : <span className="tile-dot" />}
        </button>;
      })}
    </div>
    <div className="dialog-footer"><span>{completed.length} / 20 completed</span><span className="tiny-progress" style={{ "--progress": `${completed.length * 5}%` } as React.CSSProperties} /></div>
  </dialog>;
}
