import { useEffect, useRef } from "react";
import { ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";

export function ResultPanel({ failed, campaignComplete, onNext, onReplay, onLevels }: {
  failed: boolean; campaignComplete: boolean; onNext: () => void; onReplay: () => void; onLevels: () => void;
}) {
  const actionRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { actionRef.current?.focus({ preventScroll: true }); }, []);
  return <section className={`result-panel${failed ? " result-failed" : ""}`} aria-label={failed ? "Level failed" : "Level completed"}>
    <div className="result-title">{failed ? <RotateCcw size={20} /> : campaignComplete ? <Sparkles size={21} /> : <Check size={22} />}<h2>{failed ? "A fresh start?" : campaignComplete ? "All clear. Beautifully done." : "A little less tangled."}</h2></div>
    <div className="result-actions">
      <button type="button" className="primary-button" ref={actionRef} onClick={failed ? onReplay : campaignComplete ? onLevels : onNext}>
        {failed ? "Try again" : campaignComplete ? "Explore levels" : "Next level"}{failed ? <RotateCcw size={16} /> : <ArrowRight size={17} />}
      </button>
      {!failed && <button type="button" className="icon-button" aria-label="Replay level" title="Replay level" onClick={onReplay}><RotateCcw size={19} /></button>}
    </div>
  </section>;
}
