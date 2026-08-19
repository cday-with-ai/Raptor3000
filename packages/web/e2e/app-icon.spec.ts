import { test, expect, chromium } from '@playwright/test';
import { loginAsGuest } from './guests.js';

/**
 * The app icon is a preference over sixteen images, and three separate
 * things have to agree for it to work: the pick has to persist, the
 * favicon has to follow, and the badge in the header has to repaint.
 *
 * All three broke on the way in and none of them broke loudly:
 *   - `savePreferences` is a hand-written list of `setRaw` calls parallel
 *     to the reader's list. `appIcon` was in the type, the defaults and the
 *     reader but not the writer, so the option moved and stored nothing.
 *   - the options page's `update()` called `savePreferences` directly,
 *     which does not fire the local change event — and a window gets no
 *     `storage` event for its own write, so nothing outside the component
 *     ever heard the change.
 *
 * Unit tests could not see either one; both need a real document with a
 * real `<link rel="icon">`. Hence a live spec.
 */
test('picking an app icon persists it and moves the favicon', async () => {
  test.setTimeout(120_000);
  const browser = await chromium.launch({ args: ['--disable-popup-blocking'] });
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 1500 } });
  const g = await loginAsGuest(ctx, 'app-icon');

  // Default is Industrial — the one installed on the desktop 2026-08-18.
  await expect(g.main.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    '/icons/industrial.png',
  );

  // The icon picker is the first disclosure on the options page.
  await g.main.locator('button[aria-expanded="false"]').first().click();
  await g.main.getByRole('button', { name: 'Ranger' }).click();

  await expect(g.main.locator('link[rel="icon"]')).toHaveAttribute(
    'href',
    '/icons/ranger.png',
  );
  expect(await g.main.evaluate(() => localStorage.getItem('pref.appIcon'))).toBe('ranger');

  await browser.close();
});
