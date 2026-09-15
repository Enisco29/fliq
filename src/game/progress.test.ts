import { expect, it } from "vitest";
import { parseProgress } from "./progress";

it("recovers from corrupt storage and filters invalid IDs", () => {
  expect(parseProgress(null)).toEqual([]);
  expect(parseProgress("broken")).toEqual([]);
  expect(parseProgress('{"completed": [1]}')).toEqual([]);
  expect(parseProgress('[1, 2, 2, "3", 99, -1]')).toEqual([1, 2]);
  expect(parseProgress("[1, 3]")).toEqual([1]);
  expect(parseProgress(JSON.stringify(Array.from({ length: 20 }, (_, i) => i + 1)))).toHaveLength(20);
});
