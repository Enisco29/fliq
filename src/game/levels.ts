import campaign from "./levels-data.json";
import type { Level } from "./types";

// Explicit, reviewed coordinates. No puzzle generation runs in the browser.
export const levels: readonly Level[] = Object.freeze(campaign.map((level) => Object.freeze({
  ...level,
  pieces: Object.freeze(level.pieces.map((piece) => Object.freeze({
    ...piece, points: Object.freeze(piece.points.map((point) => Object.freeze(point))),
  }))),
})));
