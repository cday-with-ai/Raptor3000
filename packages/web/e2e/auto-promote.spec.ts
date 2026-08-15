import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';

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
 *   1. a4    b5      2. axb5  a6      3. bxa6  Nc6
 *   4. a7    Rb8     5. a8=Q
 *
 * Black's knight and rook step off b8/a8 so the pawn has an empty square
 * to promote onto — a pawn on a7 promotes by advancing, and it cannot
 * capture onto an empty b8. The last move is made BY CLICKING THE BOARD,
 * not by typing, because typing `a7a8=Q` into the console would prove
 * nothing about the control being tested.
 */

test.setTimeout(300_000); // FICS handshake + a five-move game

async function loginAsGuest(
  ctx: BrowserContext,
  label: string,
): Promise<{ main: Page; chat: Page; handle: string }> {
  const main = await ctx.newPage();
  main.on('console', m => console.log(`[${label} main ${m.type()}] ${m.text()}`));
  await main.goto('http://localhost:5173/');
  await main.getByLabel('Guest login').check();
  await main.getByRole('textbox').first().fill('');

  const popupPromise = ctx.waitForEvent('page', { timeout: 15_000 });
  await main.getByRole('button', { name: 'Login' }).click();
  const chat = await popupPromise;
  await chat.waitForLoadState('domcontentloaded');

  let handle: string | null = null;
  for (let i = 0; i < 60; i++) {
    await chat.waitForTimeout(1000);
    const body = (await chat.textContent('body')) ?? '';
    const m = /Starting FICS session as (Guest[A-Z]{4})/.exec(body);
    if (m) {
      handle = m[1];
      break;
    }
  }
  if (!handle) throw new Error(`[${label}] never saw guest handle in banner`);
  console.log(`[${label}] logged in as ${handle}`);
  return { main, chat, handle };
}

async function typeInChat(chat: Page, cmd: string): Promise<void> {
  const input = chat.getByLabel("FICS command");
  await input.fill(cmd);
  await input.press('Enter');
}

/**
 * The board popup, once it exists.
 *
 * Not `waitForEvent('page', {predicate: url matches})`: a popup fires its
 * page event while still on about:blank and navigates afterwards, so a
 * URL predicate is evaluated once, against the wrong URL, and never
 * again. That wait hangs forever while the board sits open on screen —
 * which is exactly how it failed here before this helper existed.
 */
async function waitForBoard(ctx: BrowserContext, label: string): Promise<Page> {
  for (let i = 0; i < 120; i++) {
    const board = ctx.pages().find(p => p.url().includes('window=board'));
    if (board) {
      await board.waitForLoadState('domcontentloaded');
      return board;
    }
    await ctx.pages()[0].waitForTimeout(500);
  }
  throw new Error(`[${label}] no board window appeared`);
}

/** The piece code the board is rendering on a square, or 0 for empty. */
async function pieceOn(board: Page, sq: string): Promise<string> {
  const img = board.locator(`[data-square="${sq}"] img`);
  if ((await img.count()) === 0) return '(empty)';
  return (await img.first().getAttribute('src')) ?? '(no src)';
}

test('a promotion plays a queen with no picker', async () => {
  // Board windows are opened by a FICS message arriving, not by a click,
  // so Chrome's popup blocker eats them — which is the whole reason this
  // app ships a popup gate. A real user grants the exception once; a test
  // browser has to be told.
  const browser = await chromium.launch({ args: ['--disable-popup-blocking'] });
  try {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();

    const [alice, bob] = await Promise.all([
      loginAsGuest(ctxA, 'alice'),
      loginAsGuest(ctxB, 'bob'),
    ]);

    // Long clock: this game takes five moves plus board interaction, and
    // a flagged pawn proves nothing.
    await typeInChat(alice.chat, `match ${bob.handle} 15 0 unrated white`);
    await expect(bob.chat.locator('body')).toContainText(
      /Challenge:|offers you a match/i,
      { timeout: 30_000 },
    );
    await typeInChat(bob.chat, 'accept');

    const [boardA, boardB] = await Promise.all([
      waitForBoard(ctxA, 'alice'),
      waitForBoard(ctxB, 'bob'),
    ]);
    boardA.on('console', m => console.log(`[alice board ${m.type()}] ${m.text()}`));
    // `expect` polls from the test process. `waitForFunction` polls with
    // requestAnimationFrame inside the page, and these boards are
    // background popups — a hidden window fires no frames, so that wait
    // simply never ticks.
    await Promise.all([
      expect(boardA.locator('body')).toContainText(/Status: Playing/, { timeout: 30_000 }),
      expect(boardB.locator('body')).toContainText(/Status: Playing/, { timeout: 30_000 }),
    ]);
    console.log('[both] boards up — alice is white');

    // The control itself: four boxes on the playing toolbar, the queen
    // armed by default. This is the render the unit tests cannot see.
    const boxes = boardA.locator('button[aria-pressed]');
    await expect(boxes).toHaveCount(4);
    await expect(boardA.locator('button[aria-pressed="true"]')).toHaveCount(1);
    await expect(boardA.locator('button[aria-pressed="true"]')).toHaveAttribute(
      'title',
      /queen/i,
    );
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
      await boardA.waitForTimeout(1200);
      await typeInChat(bob.chat, black);
      await boardA.waitForTimeout(1200);
    }

    // The pawn is on a7 and a8 is empty — the position the test is for.
    await expect(boardA.locator('[data-square="a7"] img')).toBeVisible({
      timeout: 20_000,
    });
    expect(await pieceOn(boardA, 'a8')).toBe('(empty)');
    console.log('[alice] pawn on a7, a8 clear');

    // Promote BY CLICKING. With the queen armed this must send the move
    // outright; the picker must never appear.
    await boardA.locator('[data-square="a7"]').click();
    await boardA.locator('[data-square="a8"]').click();

    // The negative assertion, taken immediately: no overlay, no piece
    // buttons beyond the four toolbar boxes.
    await boardA.waitForTimeout(400);
    const pickerButtons = await boardA.locator('button:not([aria-pressed])').count();
    const overlay = await boardA
      .locator('div[style*="rgba(0,0,0,0.35)"]')
      .count();
    expect(overlay, 'the promotion picker overlay appeared').toBe(0);
    console.log(`[alice] no picker overlay (${pickerButtons} non-box buttons on screen)`);

    // And a queen actually arrived on a8, on BOTH boards — the move went
    // to FICS with its promotion piece, not just into our own optimism.
    for (const [label, board] of [['alice', boardA], ['bob', boardB]] as const) {
      await expect(board.locator('[data-square="a8"] img')).toHaveAttribute(
        'src',
        /wQ\.svg$/,
        { timeout: 20_000 },
      );
      console.log(`[${label}] white queen on a8`);
    }

    await typeInChat(alice.chat, 'resign');
    await alice.chat.waitForTimeout(1500);
    await ctxA.close();
    await ctxB.close();
  } finally {
    await browser.close();
  }
});
