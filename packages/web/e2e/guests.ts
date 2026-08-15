import { expect, type BrowserContext, type Page } from '@playwright/test';

/**
 * The two-guests harness, shared.
 *
 * Every live spec needs the same three things — log a guest in, type at
 * the console, get hold of a board window — and each one had grown its
 * own copy. The copies drifted: all of them were addressing the console
 * input by a placeholder the app had stopped rendering, and all of them
 * were broken in the same way at the same time, which is what a fourth
 * copy buys you.
 *
 * Two of the three are less obvious than they look; the comments on
 * `waitForBoard` and `settle` are the ones worth reading before writing
 * a new spec.
 */

export interface Guest {
  main: Page;
  chat: Page;
  handle: string;
}

/** Log an anonymous guest in and return its windows and FICS handle. */
export async function loginAsGuest(
  ctx: BrowserContext,
  label: string,
): Promise<Guest> {
  const main = await ctx.newPage();
  await main.goto('http://localhost:5173/');
  await main.getByLabel('Guest login').check();
  await main.getByRole('textbox').first().fill('');

  const popupPromise = ctx.waitForEvent('page', { timeout: 15_000 });
  await main.getByRole('button', { name: 'Login' }).click();
  const chat = await popupPromise;
  await chat.waitForLoadState('domcontentloaded');

  // FICS assigns the handle at login: "**** Starting FICS session as
  // GuestABCD ****". Everything downstream needs it to address a match.
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

/** Send a line at the console, exactly as the user would. */
export async function typeInChat(chat: Page, cmd: string): Promise<void> {
  const input = chat.getByLabel('FICS command');
  await input.fill(cmd);
  await input.press('Enter');
}

/**
 * The board popup, once it exists.
 *
 * Not `waitForEvent('page', {predicate: url matches})`: a popup fires its
 * page event while still on about:blank and navigates afterwards, so a
 * URL predicate is evaluated once, against the wrong URL, and never
 * again. That wait hangs for the full test timeout while the board it
 * wants sits open on screen.
 */
export async function waitForBoard(
  ctx: BrowserContext,
  label: string,
): Promise<Page> {
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

/**
 * Put two guests in a game with `white` on the white side, and hand back
 * both board windows.
 *
 * Popups must be allowed on the browser (`--disable-popup-blocking`):
 * board windows are opened by a FICS message arriving rather than by a
 * click, which is the whole reason this app ships a popup gate.
 */
export async function playAGame(
  white: Guest,
  black: Guest,
  ctxWhite: BrowserContext,
  ctxBlack: BrowserContext,
  clock = '15 0',
): Promise<{ boardWhite: Page; boardBlack: Page }> {
  await typeInChat(white.chat, `match ${black.handle} ${clock} unrated white`);
  await expect(black.chat.locator('body')).toContainText(
    /Challenge:|offers you a match/i,
    { timeout: 30_000 },
  );
  await typeInChat(black.chat, 'accept');

  const [boardWhite, boardBlack] = await Promise.all([
    waitForBoard(ctxWhite, 'white'),
    waitForBoard(ctxBlack, 'black'),
  ]);
  await Promise.all([
    expect(boardWhite.locator('body')).toContainText(/Status: Playing/, {
      timeout: 30_000,
    }),
    expect(boardBlack.locator('body')).toContainText(/Status: Playing/, {
      timeout: 30_000,
    }),
  ]);
  return { boardWhite, boardBlack };
}

/**
 * Wait out a move.
 *
 * Deliberately a sleep rather than a wait on the board's own text.
 * `waitForFunction` polls with requestAnimationFrame *inside* the page,
 * and board windows are background popups — a hidden window fires no
 * frames, so that poll never ticks at all. Anything that must be
 * asserted goes through `expect`, which polls from the test process.
 */
export async function settle(page: Page, ms = 1200): Promise<void> {
  await page.waitForTimeout(ms);
}
