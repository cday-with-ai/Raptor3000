import { test } from '@playwright/test';
import { loginAsGuest, playAGame, settle, typeInChat } from './guests.js';

// Temporary: screenshot a live playing board for a look at the new
// toolbar. Deleted after the run.
test.setTimeout(300_000);

const OUT =
  '/tmp/claude-1000/-home-cday-projects-raptor3000/1c277c1b-eae2-4edf-82f6-30a9fc846772/scratchpad';

test('shot', async () => {
  const browser = await chromiumLaunch();
  try {
    const ctxA = await browser.newContext({ viewport: { width: 1100, height: 800 } });
    const ctxB = await browser.newContext();
    const [alice, bob] = await Promise.all([
      loginAsGuest(ctxA, 'alice'),
      loginAsGuest(ctxB, 'bob'),
    ]);
    const { boardWhite } = await playAGame(alice, bob, ctxA, ctxB);

    // A couple of moves so the board looks like a game, not a setup.
    for (const [w, b] of [['e2e4', 'e7e5'], ['g1f3', 'b8c6']]) {
      await typeInChat(alice.chat, w);
      await settle(boardWhite);
      await typeInChat(bob.chat, b);
      await settle(boardWhite);
    }

    await boardWhite.screenshot({ path: `${OUT}/board-default.png` });

    // Arm auto-draw and switch the promotion piece to a knight, so the
    // armed/unarmed difference is visible side by side.
    await boardWhite.getByRole('button', { name: /Auto-draw/ }).click();
    await boardWhite.locator('button[title*="knight"]').click();
    await settle(boardWhite, 600);
    await boardWhite.screenshot({ path: `${OUT}/board-armed.png` });

    await typeInChat(alice.chat, 'resign');
    await settle(alice.chat, 1500);
    await ctxA.close();
    await ctxB.close();
  } finally {
    await browser.close();
  }
});

async function chromiumLaunch() {
  const { chromium } = await import('@playwright/test');
  return chromium.launch({ args: ['--disable-popup-blocking'] });
}
