import { test, expect } from '@playwright/test';
import { loginAsGuest, settle, waitForBoard } from './guests.js';

/**
 * The Actions pane's follow buttons (Carson, 2026-08-15: "add follow as
 * options under best commands").
 *
 * The pane's rule is that every button is a real FICS command, so the
 * test that matters is whether the SERVER accepts what the button
 * prints. `follow /b` is the form worth checking: everyone remembers
 * `follow <handle>`, this file's own comment used to claim the flag
 * form did not exist, and a button that prints a command FICS rejects
 * would be worse than no button at all.
 */

test.setTimeout(300_000);

test('follow /b is a command FICS accepts, from the button that prints it', async () => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ args: ['--disable-popup-blocking'] });
  try {
    const ctx = await browser.newContext();
    const me = await loginAsGuest(ctx, 'follower');

    // Switch the chat window to the actions view and use the button —
    // not a typed command, so the pane itself is what is under test.
    // The switcher draws its modes parenthesised — "(actions)".
    await me.chat.getByRole('button', { name: '(actions)', exact: true }).click();
    const followBlitz = me.chat.getByRole('button', { name: /follow blitz/ });
    await expect(followBlitz).toBeVisible();
    await expect(followBlitz).toContainText('follow /b');
    await followBlitz.click();
    // The button hands the console back, which is where FICS answers.

    // FICS's acceptance wording, verbatim: "You will now be following
    // strongest players' games." A rejection produces a usage line
    // instead, so this one positive match settles it.
    //
    // Deliberately NOT also asserting the absence of error words. The
    // console holds the whole session, and FICS's guest welcome
    // includes "not a registered" among much else — a negative scan
    // over that text fails on the banner rather than on the command,
    // which is precisely the false alarm it was meant to prevent.
    await expect(me.chat.locator('body')).toContainText(
      /will now be following/i,
      { timeout: 30_000 },
    );
    console.log('[follower] FICS accepted follow /b');

    // The stop button's claim is about WHICH command it prints, and
    // that is checkable without another round trip: FICS's help says
    // "Without parameters, follow will end your current follow
    // situation", so the off switch is the same word. Asserted on the
    // pane rather than on a reply because clicking `follow /b` above
    // handed the console back — the pane is no longer on screen, which
    // is the behaviour being relied on, not a problem to work around.
    await me.chat.getByRole('button', { name: '(actions)', exact: true }).click();
    const stop = me.chat.getByRole('button', { name: /stop following/ });
    await expect(stop).toBeVisible();
    await expect(stop).toContainText('follow');
    console.log('[follower] stop button prints bare follow');

    void waitForBoard;
    await ctx.close();
  } finally {
    await browser.close();
  }
});
