import { test, expect } from '@playwright/test';

/**
 * End-to-end engine smoke test.
 *
 * Loads the real Stockfish WASM binary in a headless browser, hands it
 * a position, and verifies it produces analysis output (depth, eval,
 * principal variation). This test is the only one that proves the
 * engine actually runs in a browser — unit tests cover the UCI parser
 * and lifecycle gating with stubs.
 *
 * Strategy: open a small in-page harness URL that imports EngineService,
 * runs an analyze() against the starting position, and writes the
 * result back to the DOM. Playwright reads the DOM to assert.
 *
 * The single-threaded WASM build is used (no SharedArrayBuffer needed),
 * so this works in any browser without cross-origin isolation headers.
 */

test.setTimeout(120_000);

test('Stockfish WASM produces analysis from the starting position', async ({ page }) => {
  page.on('console', m => console.log(`[engine ${m.type()}] ${m.text()}`));

  // Navigate to a tiny inline harness via data-URL trick: we point at
  // the dev server (so module resolution works) and inject a script
  // that imports EngineService directly.
  await page.goto('/');

  // Inject a harness script into the page that uses the EngineService
  // via the dev server's module graph.
  const result = await page.evaluate(async () => {
    // Dynamic import keeps the harness self-contained.
    const mod = await import('/src/engine/EngineService.ts');
    const engine = new mod.EngineService();

    const updates: unknown[] = [];
    engine.onAnalysis((info: unknown) => updates.push(info));
    engine.start();

    const startingFen =
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    engine.analyze(startingFen, { movetime: 2000 });

    // Wait up to 10 sec for some analysis output.
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 200));
      if (updates.length >= 3 && (updates[updates.length - 1] as { depth?: number }).depth) {
        break;
      }
    }
    engine.stop();
    return {
      updateCount: updates.length,
      latest: updates[updates.length - 1] ?? null,
    };
  });

  console.log('engine result:', JSON.stringify(result, null, 2));

  expect(result.updateCount).toBeGreaterThan(0);
  expect(result.latest).not.toBeNull();
  const latest = result.latest as {
    depth: number;
    pv: string[];
    bestMove: string | null;
    scoreCp: number | null;
  };
  // From the starting position with a 2 sec think, Stockfish 18 reaches
  // double-digit depth easily and the best move is in the standard
  // opening pool (e2e4, d2d4, g1f3, c2c4, ...).
  expect(latest.depth).toBeGreaterThanOrEqual(8);
  expect(latest.pv.length).toBeGreaterThan(0);
  expect(latest.bestMove).toMatch(/^[a-h][1-8][a-h][1-8][qrbn]?$/);
  // From start position, |eval| should be small. Allow generous slack.
  expect(latest.scoreCp).not.toBeNull();
  expect(Math.abs(latest.scoreCp ?? 0)).toBeLessThan(150);
});
