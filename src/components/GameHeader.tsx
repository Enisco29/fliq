import { Grid2X2, Heart, RotateCcw, ArrowUpRight } from "lucide-react";

export function GameHeader({
  level,
  completed,
  lives,
  ready,
  onRestart,
  onLevels,
}: {
  level: number;
  completed: number;
  lives: number;
  ready: boolean;
  onRestart: () => void;
  onLevels: () => void;
}) {
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="./" aria-label="Fliq home">
          fliq
          <span className="brand-mark">
            <ArrowUpRight size={21} strokeWidth={2.5} />
          </span>
        </a>
        <div className="header-right">
          <span className="campaign-count">
            <strong>{String(completed).padStart(2, "0")}</strong>
            <span>/ 20</span>
          </span>
          <button
            type="button"
            className="icon-button"
            aria-label="Choose level"
            title="Choose level"
            onClick={onLevels}
            disabled={!ready}
          >
            <Grid2X2 size={19} />
          </button>
        </div>
      </header>
      <div className="level-header">
        <div>
          <p className="eyebrow">
            {level <= 4
              ? "FIRST STEPS"
              : level <= 9
                ? "FIND YOUR FLOW"
                : level <= 14
                  ? "A NEW TWIST"
                  : "THE FINAL STRETCH"}
          </p>
          <h1>
            Level <span>{String(level).padStart(2, "0")}</span>
          </h1>
        </div>
        <div className="level-controls">
          <div
            className={`lives${lives === 1 ? " last-life" : ""}`}
            role="img"
            aria-label={`${lives} of 3 lives remaining`}
          >
            {[1, 2, 3].map((life) => (
              <Heart
                key={life}
                size={18}
                strokeWidth={1.8}
                className={life <= lives ? "heart-filled" : "heart-empty"}
                aria-hidden="true"
              />
            ))}
          </div>
          <button
            type="button"
            className="icon-button restart-button"
            aria-label="Restart level"
            title="Restart level"
            onClick={onRestart}
            disabled={!ready}
          >
            <RotateCcw size={19} />
          </button>
        </div>
      </div>
    </>
  );
}
