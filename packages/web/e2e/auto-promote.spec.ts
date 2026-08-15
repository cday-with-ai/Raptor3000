import { test, expect, chromium, type Page } from '@playwright/test';
import { loginAsGuest, playAGame, settle, typeInChat } from './guests.js';

/**
 * Auto-promote, end to end against live FICS (Carson, 2026-08-15: "auto
 * promote should be checkboxes with pieces … It bypasses the popup if
 * selected. Default is on queen.").
 *
 * This spec exists because the claim is a NEGATIVE one about a render —
 * no dialog appears — and nothing offline can make it. The unit tests
 * pin which piece is armed and which modes show the control; only a real
 * board can show that the picker stayed away and a queen arrived.
 *
 * Two cooperating guests walk a white pawn to the eighth rank:
 *
 *   1. a4  b5   2. axb5  a6   3. bxa6  Nc6   4. a7  Rb8   5. a8=Q
 *
 * Black's knight and rook step off b8/a8 so the pawn has an empty square
 * to promote onto — a pawn on a7 promotes by advancing, and it cannot
 * capture onto an empty b8. The last move is made BY CLICKING THE BOARD,
 * not by typing, because typing `a7a8=Q` into the console would prove
 * nothing about the control being tested.
 */

test.setTimeout(300_000);

/** What the board is rendering on a square, or a marker for empty. */
async function pieceOn(board: Page, sq: string): Promise<string> {
  const img = board.locator(`[data-square="${sq}"] img`);
  if ((await img.count()) === 0) return '(empty)';
  return (await img.first().getAttribute('src')) ?? '(no src)';
}

test('a promotion plays a queen with no picker', async () => {
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

    // The control itself: four piece boxes on the playing toolbar with
    // the queen armed. (The fifth aria-pressed control is the auto-draw
    // toggle, which shares the cluster.) This is the render the unit
    // tests cannot see.
    await expect(boardWhite.locator('button[aria-pressed]')).toHaveCount(5);
    const armedPiece = boardWhite.locator(
      'button[aria-pressed="true"]:not([title*="Auto-draw"])',
    );
    await expect(armedPiece).toHaveCount(1);
    await expect(armedPiece).toHaveAttribute('title', /queen/i);
    console.log('[alice] auto-promote row present, queen armed');

    // Walk the pawn up. Typed, because these moves are not what is being
    // tested and typing is the reliable way to drive both sides.
    const line: [string, string][] = [
      ['a2a4', 'b7b5'],
      ['a4b5', 'a7a6'],
      ['b5a6', 'b8c6'],
      ['a6a7', 'a8b8'],
    ];
    for (const [white, black] of line) {
      await typeInChat(alice.chat, white);
      await settle(boardWhite);
      await typeInChat(bob.chat, black);
      await settle(boardWhite);
    }

    // The pawn is on a7 and a8 is empty — the position the test is for.
    await expect(boardWhite.locator('[data-square="a7"] img')).toBeVisible({
      timeout: 20_000,
    });
    expect(await pieceOn(boardWhite, 'a8')).toBe('(empty)');
    console.log('[alice] pawn on a7, a8 clear');

    // Promote BY CLICKING. With the queen armed this must send the move
    // outright; the picker must never appear.
    await boardWhite.locator('[data-square="a7"]').click();
    await boardWhite.locator('[data-square="a8"]').click();

    // The negative assertion: no modal overlay, taken immediately.
    await settle(boardWhite, 400);
    const overlay = await boardWhite
      .locator('div[style*="rgba(0,0,0,0.35)"]')
      .count();
    expect(overlay, 'the promotion picker overlay appeared').toBe(0);
    console.log('[alice] no picker overlay');

    // And a queen actually arrived on a8, on BOTH boards — the move went
    // to FICS with its promotion piece, not just into our own optimism.
    for (const [label, board] of [
      ['alice', boardWhite],
      ['bob', boardBlack],
    ] as const) {
      await expect(board.locator('[data-square="a8"] img')).toHaveAttribute(
        'src',
        /wQ\.svg$/,
        { timeout: 20_000 },
      );
      console.log(`[${label}] white queen on a8`);
    }

    await typeInChat(alice.chat, 'resign');
    await settle(alice.chat, 1500);
    await ctxA.close();
    await ctxB.close();
  } finally {
    await browser.close();
  }
});
