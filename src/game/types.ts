export type Direction = "up" | "down" | "left" | "right";
export type Point = Readonly<{ x: number; y: number }>;
export type PathPiece = Readonly<{ id: string; points: readonly Point[] }>;
export type Level = Readonly<{
  id: number;
  width: number;
  height: number;
  pieces: readonly PathPiece[];
}>;
