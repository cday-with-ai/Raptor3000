import { test, expect } from '@playwright/test';
import { loginAsGuest, settle, typeInChat, waitForBoard } from './guests.js';

/**
 * Closing a board leaves the game on FICS too (Carson, 2026-08-15:
 * "after closing windows getting (cdaysDog is observing game(s) 7 and
 * 16) closing should unobs, unex automatically").
 *
 * The check is the server's own answer, not ours: after the window is
 * gone, ask FICS what we are observing. It answers "You are not
 * observing any games." when the goodbye landed, and lists the game
 * when it did not — which is exactly the line Carson saw.
 *
 * This is the half that cannot be unit-tested. The unload path depends
 * on which event the browser fires for a closing popup and on whether
 * the socket is still alive at that moment, and neither is visible from
 * a fake window.
 */

test.setTimeout(300_000);

test('closing an observed board unobserves it on the server', async () => {
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

    // FICS agrees we are observing something.
    await typeInChat(me.chat, 'games');
    await settle(me.chat, 2500);
    await expect(me.chat.locator('body')).toContainText(/Observing|observing/, {
      timeout: 20_000,
    });

    // Close the board the way a user does.
    await board.close({ runBeforeUnload: true });
    await settle(me.chat, 3000);

    // The server's verdict, asked the way Carson hit it: `finger` on
    // yourself prints "<handle> is observing game(s) 7 and 16" for
    // whatever you are still attached to. `observe` with no argument
    // only prints usage, which is a trap worth not falling into twice.
    await typeInChat(me.chat, `finger ${me.handle}`);
    await settle(me.chat, 3000);
    const text = (await me.chat.textContent('body')) ?? '';
    const tail = text.slice(-1500);
    console.log('[watcher] finger tail: ' + JSON.stringify(tail.slice(-300)));
    expect(
      /is observing game/i.test(tail),
      'FICS still thinks we are observing after the board was closed',
    ).toBe(false);
    console.log('[watcher] FICS agrees the board was left cleanly');

    await ctx.close();
  } finally {
    await browser.close();
  }
});

/**
 * And the other half: closing a board mid-game resigns it (Carson,
 * 2026-08-15: "if you try to close a window while you are playing you
 * get a confirm box and if you close it you resign it").
 *
 * Verified from the OPPONENT's side, because that is the only witness
 * that cannot be faked by our own optimism — bob's console has to show
 * the game ending in alice's resignation, sent by a window that no
 * longer exists.
 */
test('closing a board mid-game resigns the game', async () => {
  const { chromium } = await import('@playwright/test');
  const { playAGame } = await import('./guests.js');
  const browser = await chromium.launch({ args: ['--disable-popup-blocking'] });
  try {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const [alice, bob] = await Promise.all([
      loginAsGuest(ctxA, 'alice'),
      loginAsGuest(ctxB, 'bob'),
    ]);
    const { boardWhite } = await playAGame(alice, bob, ctxA, ctxB);
    console.log('[both] game on');

    await boardWhite.close({ runBeforeUnload: true });

    await expect(bob.chat.locator('body')).toContainText(
      /resigns|forfeits by disconnection|1-0|0-1/i,
      { timeout: 30_000 },
    );
    const seen = (await bob.chat.textContent('body')) ?? '';
    expect(seen, 'the game should have ended by resignation').toMatch(/resign/i);
    console.log('[bob] saw the resignation');

    await ctxA.close();
    await ctxB.close();
  } finally {
    await browser.close();
  }
});
