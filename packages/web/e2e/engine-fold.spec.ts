import { test, expect } from '@playwright/test';
import { loginAsGuest, settle, typeInChat, waitForBoard } from './guests.js';

/**
 * The engine block folds and unfolds from the board itself (Carson,
 * 2026-08-15: "Engine needs a point arrow down to collapse it and
 * another to bring it back").
 *
 * Pinned live rather than in a unit test because the thing being
 * claimed is that a control on a seam actually hides a sibling block —
 * geometry, not logic. It also checks the fold SURVIVES A RELOAD, which
 * is the half most likely to rot: the state lives in per-bucket layout
 * memory, and a refactor that forgot to persist it would still look
 * perfect in a single session.
 */

test.setTimeout(300_000);

test('the engine block folds away and comes back', async () => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ args: ['--disable-popup-blocking'] });
  try {
    const ctx = await browser.newContext();
    const me = await loginAsGuest(ctx, 'watcher');
    await typeInChat(me.chat, 'observe /b');

    const board = await waitForBoard(ctx, 'watcher');
    await expect(board.locator('body')).toContainText(/Status:\s*Observing/, {
      timeout: 30_000,
    });
    await settle(board, 5000);

    const engine = board.locator('text=Engine:').first();
    const fold = board.locator('button[title="hide the engine"]');
    await expect(engine).toBeVisible();
    await expect(fold).toBeVisible();

    await fold.click();
    await expect(engine).toHaveCount(0);
    const unfold = board.locator('button[title="show the engine"]');
    await expect(unfold).toBeVisible();
    console.log('[watcher] engine folded away');

    // Remembered: a reload must come back folded, not reset.
    await board.reload();
    await expect(board.locator('body')).toContainText(/Status:/, { timeout: 30_000 });
    await settle(board, 4000);
    await expect(board.locator('text=Engine:')).toHaveCount(0);
    console.log('[watcher] still folded after a reload');

    await board.locator('button[title="show the engine"]').click();
    await expect(board.locator('text=Engine:').first()).toBeVisible();
    console.log('[watcher] engine back');

    await ctx.close();
  } finally {
    await browser.close();
  }
});
