import { test, expect, chromium } from '@playwright/test';
import { loginAsGuest, playAGame, settle, typeInChat } from './guests.js';

/**
 * Auto-draw, end to end against live FICS (Carson, 2026-08-15: "auto
 * draw mode will first offer the opponent a draw. If the opponent
 * declines it looks for 3 position repeats after every move made and if
 * found sends draw (forcing a draw)." — "it is for time scrambles").
 *
 * The claim this proves is the one that cannot be unit-tested: that the
 * machine fires *by itself*, with nobody touching anything, the moment
 * the third repetition appears. A test that clicked Draw at the right
 * time would prove only that FICS honours a claim.
 *
 * So: white arms auto-draw and then both sides shuffle knights out and
 * back twice — Nf3 Nf6 Ng1 Ng8 Nf3 Nf6 Ng1 Ng8 — which returns the
 * starting position for the third time. Nothing is clicked after the
 * arming. The game must end in a draw on its own.
 */

test.setTimeout(300_000);

test('arming auto-draw claims the threefold by itself', async () => {
  const browser = await chromium.launch({ args: ['--disable-popup-blocking'] });
  try {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const [alice, bob] = await Promise.all([
      loginAsGuest(ctxA, 'alice'),
      loginAsGuest(ctxB, 'bob'),
    ]);

    const { boardWhite, boardBlack } = await playAGame(alice, bob, ctxA, ctxB);
    console.log('[both] boards up — alice is white');

    // Arm it. This is the only interaction with the feature in the whole
    // test; everything after is two people playing chess.
    const toggle = boardWhite.getByRole('button', { name: /Auto-draw/ });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    console.log('[alice] auto-draw armed');

    // Stage one: arming IS the offer, so bob should see one arrive
    // without alice having typed anything.
    await expect(bob.chat.locator('body')).toContainText(
      /offers you a draw|draw.*offer/i,
      { timeout: 20_000 },
    );
    console.log('[bob] received the draw offer');

    // Bob declines, which is the case Carson described — the mode then
    // has to earn the draw rather than be given it.
    await typeInChat(bob.chat, 'decline');
    await settle(boardWhite);

    // Shuffle back to the starting position for the third time. Nobody
    // clicks anything; the claim has to fire on its own.
    const shuffle: [string, string][] = [
      ['g1f3', 'g8f6'],
      ['f3g1', 'f6g8'],
      ['g1f3', 'g8f6'],
      ['f3g1', 'f6g8'],
    ];
    for (const [white, black] of shuffle) {
      await typeInChat(alice.chat, white);
      await settle(boardWhite);
      await typeInChat(bob.chat, black);
      await settle(boardWhite);
    }
    console.log('[both] starting position reached a third time');

    // The whole point: a draw, claimed by the client, with no further
    // input. Both boards must agree the game is over and drawn.
    for (const [label, chat] of [['alice', alice.chat], ['bob', bob.chat]] as const) {
      await expect(chat.locator('body')).toContainText(
        /Game drawn by repetition|drawn by repetition|1\/2-1\/2/i,
        { timeout: 30_000 },
      );
      console.log(`[${label}] game drawn by repetition`);
    }

    // And the control stands down with the game, so it cannot follow you
    // into the next one.
    await expect(boardWhite.locator('body')).not.toContainText('Auto-draw ●', {
      timeout: 20_000,
    });
    console.log('[alice] auto-draw disarmed at game end');
    await expect(boardBlack.locator('body')).toContainText(/Status:/);

    await ctxA.close();
    await ctxB.close();
  } finally {
    await browser.close();
  }
});
