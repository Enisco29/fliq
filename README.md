# Fliq

A mobile-first path puzzle. Tap an arrow-shaped line to send its head forward; its tail follows through its bends. Other pieces ahead of the head block escape. A blocked tap costs one of three lives. Dense boards support pinch zoom and drag pan.

## Run locally

Use Node.js 22.12+ on the Node 22 release line, or Node.js 24+.

```sh
npm install
npm run dev
```

Open http://localhost:3000. The game has 20 fixed levels and saves completed levels in this browser. There are no accounts or backend services. Reloading restarts your current attempt, keeping completed levels.

## Project map

- `src/game/types.ts`: point, path piece, and level data shapes.
- `src/game/levels-data.json`: explicit fixed coordinates for the 20 levels.
- `src/game/levels.ts`: loads and freezes those coordinates.
- `src/game/geometry.ts`: segments, arrowheads, hit testing, and escape routes.
- `src/game/rules.ts`: blocking checks and solvability validation.
- `src/game/state.ts`: the reducer controlling taps, lives, animations, and restart.
- `src/game/progress.ts`: browser storage with a safe session-only fallback.
- `src/components/BoardViewport.tsx`: the SVG board, zoom/pan, and touch selection.
- `src/components/PathPiece.tsx`: static pieces and the moving escape line.
- `src/app/globals.css`: responsive layout and CSS animations.

Each piece is a list of integer points from tail to head. Consecutive points form horizontal or vertical segments. The last segment supplies the arrow's direction. There are no visible cells. Blocking checks the head's straight forward ray against the actual segments of other pieces, not their bounding boxes. Removing a legal piece only removes blockers, so any legal order can solve a valid board.

The reducer processes one action at a time. A legal tap removes a piece logically and keeps a temporary visual copy. Its animation advances a constant-length window along the original route and a straight extension beyond the head. Only the moving SVG line is updated each frame. Input is locked during feedback; attempt and move numbers reject stale callbacks after restart. Completion and unlocking update together, then save to browser storage.

## Add or change a level

Edit point arrays in `levels-data.json`. Points must be inside the level bounds, segments must be axis-aligned, and pieces must not overlap, reverse, or intersect themselves. The head's forward ray must not cross its own body. Keep at least one logical unit between neighboring lines.

You can construct layouts from empty by adding pieces with clear head rays among pieces already added; reverse insertion order is a solution. Alternatively, carve paths from a filled silhouette in legal removal order, as the offline authoring script does. Independent validation checks geometry and solvability before coordinates are saved.

```sh
node --experimental-strip-types scripts/author-levels.mts
npm test
```

This deliberately replaces the campaign data. It never runs in the browser. Review screenshots after regenerating. Touch selection uses the nearest path within 12 screen pixels; close competing candidates are highlighted without charging a life. Zoom to separate them. Geometry uses a much narrower collision clearance, independent of touch targets.

## Check the game

```sh
npm test
npm run typecheck
npm run lint
npx playwright install chromium
npm run test:e2e
npm run build
```

Browser tests automatically start or reuse a server on port 3001. Stop any server for this project on another port before testing: Next.js permits one dev server per project. Tests cover touch play, zoom/pan, escapes, campaign completion, lives, restart, storage recovery, keyboard focus, reduced motion, and responsive screenshots.

If Google Chrome is already installed, `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e` uses it instead of downloading Chromium.

## Publish

`npm run build` creates a static site in `out/`. Host that folder on any static host. A production Node.js server, database, and `npm start` are not required. Use an HTTP server rather than opening the exported HTML directly from disk.

Progress is stored under `fliq-path-progress-v1`. The old cell game's `fliq-progress-v1` is left untouched and does not unlock the new puzzles. Clearing this site's browser storage resets the campaign. There is no cross-device synchronization or partial-attempt saving.
