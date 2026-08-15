import { test, expect } from '@playwright/test';
import { loginAsGuest, settle, typeInChat, waitForBoard } from './guests.js';

/**
 * The move list scrolls on the wheel from anywhere in the side panel
 * (Carson, 2026-08-15: "move list needs wheel support to scroll it").
 *
 * The pane has always scrolled natively when the pointer was inside it.
 * What this pins is the part that was missing: a wheel over the STATUS
 * LINE — outside the scroll container, and in a short window most of
 * what your hand is near — now scrolls the list rather than doing
 * nothing.
 *
 * It observes the highest-rated game in progress, because that reliably
 * has a movelist long enough to overflow. If FICS ever has no game in
 * progress the test skips rather than fails: an empty server is not a
 * regression.
 */

test.setTimeout(300_000);

test('the wheel scrolls the move list from anywhere in the panel', async () => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ args: ['--disable-popup-blocking'] });
  try {
    const ctx = await browser.newContext();
    const me = await loginAsGuest(ctx, 'watcher');
    await typeInChat(me.chat, 'observe /b');

    const board = await waitForBoard(ctx, 'watcher');
    await expect(board.locator('body')).toContainText(/Status: Observing/, {
      timeout: 30_000,
    });
    // The movelist seed has to land before there is anything to scroll.
    await settle(board, 6000);
    // A short window, so the list is guaranteed to overflow its pane.
    await board.setViewportSize({ width: 620, height: 420 });
    await settle(board, 1500);

    const scroller = board.locator('[data-pane="moves"]');
    const overflows = await scroller.evaluate(
      el => el.scrollHeight > el.clientHeight + 2,
    );
    test.skip(!overflows, 'no game in progress long enough to overflow');

    // Wheel over the status line — deliberately NOT over the list.
    const status = board.locator('text=Status:').first();
    const box = await status.boundingBox();
    expect(box, 'status line not found').toBeTruthy();
    await board.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);

    const before = await scroller.evaluate(el => el.scrollTop);
    await board.mouse.wheel(0, 300);
    await settle(board, 400);
    const after = await scroller.evaluate(el => el.scrollTop);

    expect(after, 'wheel over the status line did not scroll the list').toBeGreaterThan(
      before,
    );
    console.log(`[watcher] wheel over the status line scrolled ${before} -> ${after}`);

    await ctx.close();
  } finally {
    await browser.close();
  }
});
