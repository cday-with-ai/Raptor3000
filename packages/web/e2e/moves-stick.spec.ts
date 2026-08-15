import { test, expect } from '@playwright/test';
import { loginAsGuest, settle, typeInChat, waitForBoard } from './guests.js';

/**
 * The move list follows new moves from the bottom, and only from the
 * bottom (Carson, 2026-08-15: "if at the bottom when appending move list
 * should scroll to the bottom when adding content afterwards").
 *
 * Both halves are asserted and the second is the one that matters. A
 * list that always jumped would pass a "does it follow?" test and still
 * be a bug: it would drag you back down every time your opponent moved,
 * precisely while you were scrolled up working out how the game got
 * here.
 *
 * Two traps, both hit while writing this:
 *
 *  - "Did it follow?" cannot be `scrollTop increased`. Once you are at
 *    the bottom you are already at the maximum, so a working feature
 *    keeps the same number. It has to be `the content grew AND we are
 *    still at the end`.
 *  - Every move has to be legal in the position. An illegal one is
 *    refused by FICS, nothing is appended, and the test then measures a
 *    list that never changed — which looks exactly like the feature
 *    being broken.
 */

test.setTimeout(300_000);

// 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6 6.Be3 e5 7.Nb3 Be6
// 8.f3 Be7 9.Qd2 O-O 10.O-O-O Nbd7 — a real Najdorf, 20 plies.
const OPENING = ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6',
                 'Be3','e5','Nb3','Be6','f3','Be7','Qd2','O-O','O-O-O','Nbd7'];

async function dims(pane: import('@playwright/test').Locator) {
  return pane.evaluate(el => ({
    top: el.scrollTop,
    height: el.scrollHeight,
    client: el.clientHeight,
  }));
}

test('the move list sticks to the bottom, and lets go when you scroll up', async () => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ args: ['--disable-popup-blocking'] });
  try {
    const ctx = await browser.newContext();
    const me = await loginAsGuest(ctx, 'examiner');
    await typeInChat(me.chat, 'examine');
    const board = await waitForBoard(ctx, 'examiner');
    await expect(board.locator('body')).toContainText(/Status:\s*Examining/, {
      timeout: 30_000,
    });

    for (const m of OPENING) {
      await typeInChat(me.chat, m);
      await settle(board, 450);
    }
    await settle(board, 2500);
    // A short window, so the list is certain to overflow its pane.
    await board.setViewportSize({ width: 620, height: 420 });
    await settle(board, 1200);

    const pane = board.locator('[data-pane="moves"]');
    const start = await dims(pane);
    test.skip(start.height <= start.client + 4, 'move list did not overflow');

    // (1) At the bottom: appending must keep us at the (new) end.
    await pane.evaluate(el => { el.scrollTop = el.scrollHeight; });
    await settle(board, 300);
    const atBottom = await dims(pane);
    await typeInChat(me.chat, 'g4'); // legal for White here
    await settle(board, 1800);
    const followed = await dims(pane);
    expect(followed.height, 'no move was appended — g4 was refused').toBeGreaterThan(
      atBottom.height,
    );
    expect(
      followed.top + followed.client,
      'the list grew but the view stayed behind',
    ).toBeGreaterThanOrEqual(followed.height - 4);
    console.log(`[examiner] followed: height ${atBottom.height} -> ${followed.height}, still at the end`);

    // (2) Scrolled up: appending must not move the view at all.
    await pane.evaluate(el => { el.scrollTop = 0; });
    await settle(board, 300);
    const parked = await dims(pane);
    for (const m of ['b5', 'Kb1']) {   // two plies, so a new row appears
      await typeInChat(me.chat, m);
      await settle(board, 900);
    }
    const after = await dims(pane);
    expect(after.height, 'nothing was appended, so this proves nothing').toBeGreaterThan(
      parked.height,
    );
    expect(after.top, 'reading position was yanked toward the bottom').toBe(parked.top);
    console.log(`[examiner] stayed at ${after.top} while the list grew to ${after.height}`);

    await ctx.close();
  } finally {
    await browser.close();
  }
});
