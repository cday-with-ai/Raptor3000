import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';

/**
 * Two-guest end-to-end: launch two browser contexts, log each in as an
 * anonymous FICS guest, have one challenge the other to a 3 0 game, and
 * verify both sides get a synchronized board window. This exercises the
 * WHOLE pipeline:
 *
 *   1. Timeseal2 WebSocket + login.
 *   2. Guest-guest match offer + accept flow.
 *   3. Per-mode lifecycle hooks (onPlayingGameStart fires, GameManager
 *      opens a board window).
 *   4. Style12 propagation → board UI.
 *   5. Move input (one side plays e2e4, the other sees it).
 *
 * FICS anonymous guests are assigned a random handle like "GuestABCD"
 * when they log in. We scrape that handle from the banner and use it
 * as the match target.
 */

test.setTimeout(300_000); // 5 min — FICS handshake can be slow

async function loginAsGuest(
  ctx: BrowserContext,
  label: string,
): Promise<{ main: Page; chat: Page; handle: string }> {
  const main = await ctx.newPage();
  main.on('console', m => console.log(`[${label} main ${m.type()}] ${m.text()}`));
  await main.goto('http://localhost:5173/');

  // Unique profile per context so we don't cross-contaminate localStorage.
  await main.getByLabel('Guest login').check();
  await main.getByRole('textbox').first().fill(''); // anon guest

  const popupPromise = ctx.waitForEvent('page', { timeout: 15_000 });
  await main.getByRole('button', { name: 'Login' }).click();
  const chat = await popupPromise;
  chat.on('console', m => console.log(`[${label} chat ${m.type()}] ${m.text()}`));
  await chat.waitForLoadState('domcontentloaded');

  // Scrape the assigned guest handle from the FICS banner. FICS says:
  // "**** Starting FICS session as GuestABCD ****"
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
  if (!handle) {
    throw new Error(`[${label}] never saw guest handle in banner`);
  }
  console.log(`[${label}] logged in as ${handle}`);
  return { main, chat, handle };
}

async function typeInChat(chat: Page, cmd: string): Promise<void> {
  const input = chat.getByPlaceholder(/FICS command/i);
  await input.fill(cmd);
  await input.press('Enter');
}

test('two guests play each other: match → accept → moves', async () => {
  const browser = await chromium.launch();
  try {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();

    const [alice, bob] = await Promise.all([
      loginAsGuest(ctxA, 'alice'),
      loginAsGuest(ctxB, 'bob'),
    ]);

    // Before matching, each guest needs to ignore the auto-"muted" spam
    // and be a clean target. Nothing to do — they can still receive matches.

    // Alice challenges Bob to a 3 0 unrated game.
    const boardAPromise = ctxA.waitForEvent('page', {
      timeout: 60_000,
      predicate: p => p.url().includes('window=board'),
    });
    const boardBPromise = ctxB.waitForEvent('page', {
      timeout: 60_000,
      predicate: p => p.url().includes('window=board'),
    });

    await typeInChat(alice.chat, `match ${bob.handle} 3 0 unrated`);

    // Bob sees the offer; accept it. FICS sends something like:
    //   Challenge: GuestAAAA (----) GuestBBBB (----) unrated blitz 3 0.
    //   You can "accept" or "decline", or propose different parameters.
    // We just `accept`.
    await bob.chat.waitForFunction(
      () => /Challenge:|offers you a match|unrated (blitz|lightning|standard)/i.test(document.body.innerText),
      { timeout: 30_000 },
    );
    await typeInChat(bob.chat, 'accept');

    // Both sides should pop a board window.
    const [boardA, boardB] = await Promise.all([boardAPromise, boardBPromise]);
    boardA.on('console', m => console.log(`[alice board ${m.type()}] ${m.text()}`));
    boardB.on('console', m => console.log(`[bob board ${m.type()}] ${m.text()}`));
    await Promise.all([
      boardA.waitForLoadState('domcontentloaded'),
      boardB.waitForLoadState('domcontentloaded'),
    ]);

    // Wait for initial Style12 on both boards.
    await Promise.all([
      boardA.waitForFunction(
        () => /to move/.test(document.body.innerText),
        { timeout: 30_000 },
      ),
      boardB.waitForFunction(
        () => /to move/.test(document.body.innerText),
        { timeout: 30_000 },
      ),
    ]);

    console.log('[both] boards up');

    // Figure out who plays white. The Style12 sets isWhiteOnTop based on
    // the user's color: if I'm white, white is on the bottom (default),
    // so isWhiteOnTop=false. That's visible in the "# to move" area which
    // always says "white to move" at the start, but we don't know WHOSE
    // perspective is which without more work.
    //
    // Simpler: tell both players to type a move. FICS will reject the
    // non-moving side with "It is not your move." — harmless. The
    // whose-turn-it-is side plays.
    await typeInChat(alice.chat, 'e2e4');
    await typeInChat(bob.chat, 'e2e4');

    // Whoever was white just moved. Wait for the pawn to appear on e4 on
    // both boards. The Board renders piece glyphs; a white pawn on e4
    // means the position[3][4] slot has piece code 1 (WP). We don't have
    // direct access to that from DOM text, but we CAN check that the
    // move counter ticked to 1 (black to move after white's e4).
    await Promise.all([
      boardA.waitForFunction(
        () => /black to move/.test(document.body.innerText),
        { timeout: 15_000 },
      ),
      boardB.waitForFunction(
        () => /black to move/.test(document.body.innerText),
        { timeout: 15_000 },
      ),
    ]);

    console.log('[both] saw white e4 → black to move');

    // And a black move to verify the other direction.
    await typeInChat(alice.chat, 'e7e5');
    await typeInChat(bob.chat, 'e7e5');

    await Promise.all([
      boardA.waitForFunction(
        () => /#2.*white to move/.test(document.body.innerText),
        { timeout: 15_000 },
      ),
      boardB.waitForFunction(
        () => /#2.*white to move/.test(document.body.innerText),
        { timeout: 15_000 },
      ),
    ]);

    console.log('[both] move 2 white to move — round trip OK');

    // Cleanly resign so we don't leave a live game on the server. We don't
    // block waiting for a visual confirmation — the game-end chat text
    // ("{Game X ... resigns}") shows up in the chat stream, but the board
    // window only updates its mode label on the next Style12 which a
    // resigned game doesn't send. Core feature set is already validated
    // by the move round-trip above.
    await typeInChat(alice.chat, 'resign');
    // Give FICS a beat to process.
    await alice.chat.waitForTimeout(1500);

    await ctxA.close();
    await ctxB.close();

    // Core stack works end-to-end: login, match, play, move sync.
    expect(true).toBe(true);
  } finally {
    await browser.close();
  }
});
