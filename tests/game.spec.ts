import { expect, test, type Page } from "@playwright/test";
import { levels } from "../src/game/levels";
import { findTapCandidates, geometryOf } from "../src/game/geometry";
import { isBlocked } from "../src/game/rules";
import { PROGRESS_KEY } from "../src/game/progress";
import type { Point } from "../src/game/types";

async function screenPoint(page: Page, point: Point) {
  return page.locator(".path-board").evaluate((svg: SVGSVGElement, point) => {
    const mapped = new DOMPoint(point.x, point.y).matrixTransform(svg.getScreenCTM()!);
    return { x: mapped.x, y: mapped.y };
  }, point);
}
async function tapPiece(page: Page, id: string, point: Point) {
  const group = page.locator(`[data-piece-id="${id}"]`);
  await expect(group).toHaveAttribute("aria-disabled", "false");
  const screen = await screenPoint(page, point);
  await page.touchscreen.tap(screen.x, screen.y);
}
async function clearLevel(page: Page, index: number) {
  let remaining = [...levels[index].pieces];
  while (remaining.length) {
    const piece = remaining.find((p) => !isBlocked(p, remaining))!;
    const group = page.locator(`[data-piece-id="${piece.id}"]`);
    await expect(group).toHaveAttribute("aria-disabled", "false");
    await group.focus();
    await group.press("Enter");
    await page.clock.fastForward(800);
    remaining = remaining.filter((p) => p.id !== piece.id);
  }
  await expect(page.getByRole("region", { name: "Level completed" })).toBeVisible();
}

test("small, medium, and dense SVG prototypes have no visible cells", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const index of [0, 10, 19]) {
    await page.goto("/");
    await expect(page.locator(".path-piece").first()).toHaveAttribute("aria-disabled", "false");
    await page.evaluate(({ key, index }) => localStorage.setItem(key, JSON.stringify(Array.from({ length: index }, (_, i) => i + 1))), { key: PROGRESS_KEY, index });
    await page.reload();
    await expect(page.getByRole("heading", { name: `Level ${String(index + 1).padStart(2, "0")}` })).toBeVisible();
    await expect(page.locator(".path-piece")).toHaveCount(levels[index].pieces.length);
    await expect(page.locator(".board-cell, .arrow-button")).toHaveCount(0);
    await page.screenshot({ path: `test-results/path-level-${index + 1}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});

test("touch removal, lives, failure, and restart", async ({ page }) => {
  await page.goto("/");
  const level = levels[0], accessible = level.pieces.find((p) => !isBlocked(p, level.pieces))!;
  await tapPiece(page, accessible.id, geometryOf(accessible).head);
  await expect(page.locator(`[data-piece-id="${accessible.id}"]`)).toHaveCount(0);
  await expect(page.locator(".escaping-piece")).toHaveCount(0);
  await page.getByRole("button", { name: "Restart level" }).click();
  const blocked = level.pieces.find((p) => isBlocked(p, level.pieces))!;
  for (let lives = 2; lives >= 0; lives--) {
    await tapPiece(page, blocked.id, geometryOf(blocked).head);
    await expect(page.getByRole("img", { name: `${lives} of 3 lives remaining` })).toBeVisible();
  }
  await expect(page.getByRole("region", { name: "Level failed" })).toBeVisible();
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".path-piece")).toHaveCount(8);
  await expect(page.getByRole("img", { name: "3 of 3 lives remaining" })).toBeVisible();
});

test("zoom, drag, pinch, and cancelled taps never remove pieces", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".path-piece").first()).toHaveAttribute("aria-disabled", "false");
  const svg = page.locator(".path-board"), box = (await svg.boundingBox())!;
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(svg).toHaveAttribute("data-zoom", "1.50");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 45, box.y + box.height / 2 + 20); await page.mouse.up();
  await expect(page.locator(".path-piece")).toHaveCount(8);
  await svg.dispatchEvent("pointerdown", { pointerId: 101, button: 0, clientX: box.x + 100, clientY: box.y + 100 });
  await svg.dispatchEvent("pointerdown", { pointerId: 102, button: 0, clientX: box.x + 150, clientY: box.y + 100 });
  await svg.dispatchEvent("pointermove", { pointerId: 102, clientX: box.x + 200, clientY: box.y + 100 });
  await svg.dispatchEvent("pointerup", { pointerId: 102, clientX: box.x + 200, clientY: box.y + 100 });
  await svg.dispatchEvent("pointercancel", { pointerId: 101 });
  await expect(svg).toHaveAttribute("data-zoom", "3.00");
  await page.getByRole("button", { name: "Fit puzzle" }).click();
  await expect(svg).toHaveAttribute("data-zoom", "1.00");
  await expect(page.locator(".path-piece")).toHaveCount(8);
  await expect(page.getByRole("img", { name: "3 of 3 lives remaining" })).toBeVisible();
});

test("ambiguous taps highlight competing paths without losing a life", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify(Array.from({ length: 19 }, (_, i) => i + 1))), PROGRESS_KEY);
  await page.goto("/");
  await expect(page.locator(".path-piece").first()).toHaveAttribute("aria-disabled", "false");
  const level = levels[19], bounds = (await page.locator(".path-board").boundingBox())!;
  const unitsPerPixel = (level.width + 4) / bounds.width;
  let point: Point | undefined;
  for (let y = 0; y < level.height && !point; y += .5) for (let x = 0; x < level.width && !point; x += .5) {
    if (findTapCandidates({ x, y }, level.pieces, unitsPerPixel).length > 1) point = { x, y };
  }
  expect(point).toBeDefined();
  const screen = await screenPoint(page, point!);
  await page.touchscreen.tap(screen.x, screen.y);
  await expect(page.locator(".ambiguous-piece").first()).toBeVisible();
  await expect(page.locator(".path-piece")).toHaveCount(300);
  await expect(page.getByRole("img", { name: "3 of 3 lives remaining" })).toBeVisible();
});

test("escape follows the original corners and restart cancels animation", async ({ page }) => {
  await page.goto("/");
  const piece = levels[0].pieces.find((p) => p.points.length > 2 && !isBlocked(p, levels[0].pieces))!;
  await expect(page.locator(`[data-piece-id="${piece.id}"]`)).toHaveAttribute("aria-disabled", "false");
  await page.clock.install();
  await page.locator(`[data-piece-id="${piece.id}"]`).focus();
  await page.locator(`[data-piece-id="${piece.id}"]`).press("Enter");
  const original = await page.locator(".escaping-piece .piece-body").getAttribute("points");
  await page.clock.runFor(120);
  expect(await page.locator(".escaping-piece .piece-body").getAttribute("points")).not.toBe(original);
  await page.screenshot({ path: "test-results/path-escape.png", fullPage: true });
  await page.getByRole("button", { name: "Restart level" }).click();
  await page.clock.runFor(1000);
  await expect(page.locator(".path-piece")).toHaveCount(8);
  await expect(page.locator(".escaping-piece")).toHaveCount(0);
});

test("completion unlocks, persists, replays, and restores keyboard focus", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".path-piece").first()).toHaveAttribute("aria-disabled", "false");
  await page.clock.install();
  await clearLevel(page, 0);
  await page.getByRole("button", { name: "Next level" }).click();
  await expect(page.getByRole("heading", { name: "Level 02" })).toBeVisible();
  await page.reload(); await page.clock.runFor(100);
  await expect(page.getByRole("heading", { name: "Level 02" })).toBeVisible();
  await page.getByRole("button", { name: "Choose level" }).click();
  await expect(page.getByRole("button", { name: "Level 3, locked", exact: true })).toBeDisabled();
  await page.screenshot({ path: "test-results/path-picker.png", fullPage: true });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Choose level" })).toBeFocused();
  await page.getByRole("button", { name: "Choose level" }).click();
  await page.getByRole("button", { name: "Level 1, completed", exact: true }).click();
  await clearLevel(page, 0);
  await page.getByRole("button", { name: "Replay level" }).click();
  await expect(page.locator(".path-piece")).toHaveCount(8);
});

test("new campaign ignores old cell progress and recovers from malformed storage", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("fliq-progress-v1", "[1,2,3,4,5]");
    localStorage.setItem("fliq-path-progress-v1", "broken");
  });
  await page.goto("/");
  await expect(page.locator(".path-piece").first()).toHaveAttribute("aria-disabled", "false");
  await expect(page.getByRole("heading", { name: "Level 01" })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("fliq-progress-v1"))).toBe("[1,2,3,4,5]");
});

test("all 20 path levels clear through the UI, including campaign completion", async ({ page }) => {
  test.setTimeout(360000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".path-piece").first()).toHaveAttribute("aria-disabled", "false");
  await page.clock.install();
  for (let index = 0; index < levels.length; index++) {
    await clearLevel(page, index);
    if (index < levels.length - 1) await page.getByRole("button", { name: "Next level" }).click();
  }
  await expect(page.getByRole("heading", { name: "All clear. Beautifully done." })).toBeVisible();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).length, PROGRESS_KEY)).toBe(20);
  await page.reload(); await page.clock.runFor(100);
  await expect(page.getByRole("heading", { name: "All clear. Beautifully done." })).toBeVisible();
});

test("dense boards remain framed and responsive across viewport sizes", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, JSON.stringify(Array.from({ length: 19 }, (_, i) => i + 1))), PROGRESS_KEY);
  for (const [width, height] of [[320, 740], [390, 844], [1440, 1000], [844, 390]]) {
    await page.setViewportSize({ width, height }); await page.goto("/");
    await expect(page.getByRole("heading", { name: "Level 20" })).toBeVisible();
    await expect(page.locator(".path-piece")).toHaveCount(300);
    const svg = (await page.locator(".path-board").boundingBox())!;
    expect(svg.width).toBeLessThanOrEqual(360); expect(svg.x).toBeGreaterThanOrEqual(16);
    expect(svg.x + svg.width).toBeLessThanOrEqual(width - 16);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/path-${width}x${height}.png`, fullPage: true });
    const staticPiece = page.locator(`[data-piece-id="${levels[19].pieces.at(-1)!.id}"] .piece-body`);
    const originalPoints = await staticPiece.getAttribute("points");
    const accessible = levels[19].pieces.find((p) => !isBlocked(p, levels[19].pieces))!;
    await tapPiece(page, accessible.id, geometryOf(accessible).head);
    const timings = await page.evaluate(async () => {
      const frames: number[] = []; let last = performance.now();
      for (let i = 0; i < 20; i++) await new Promise<void>((resolve) => requestAnimationFrame((now) => { frames.push(now - last); last = now; resolve(); }));
      return frames.slice(1).sort((a, b) => a - b)[9];
    });
    expect(timings).toBeLessThan(50);
    expect(await staticPiece.getAttribute("points")).toBe(originalPoints);
  }
});
