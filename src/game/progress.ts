import { levels } from "./levels";

export const PROGRESS_KEY = "fliq-path-progress-v1";

export function parseProgress(raw: string | null): number[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    const valid = new Set(value.filter((id): id is number => typeof id === "number" && levels.some((level) => level.id === id)));
    // Only a contiguous completed campaign prefix may unlock new levels.
    const firstMissing = levels.findIndex((level) => !valid.has(level.id));
    return levels.slice(0, firstMissing === -1 ? levels.length : firstMissing).map((level) => level.id);
  } catch { return []; }
}

export function readProgress(): number[] {
  try { return parseProgress(localStorage.getItem(PROGRESS_KEY)); } catch { return []; }
}

export function saveProgress(completed: number[]): void {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(completed)); } catch { /* Session progress still works without browser storage. */ }
}
