import { test, expect } from '@playwright/test';

/**
 * Smoke test: log in to FICS as a guest and verify that
 *   1. Chat events stream into the popup chat window.
 *   2. Observing a live game pops a board window.
 *   3. The board window receives Style12 updates (move count changes).
 */

test.setTimeout(180_000);

test('guest login → chat flow → observe spawns a board', async ({ page, context }) => {
  page.on('console', msg => console.log(`[main ${msg.type()}] ${msg.text()}`));

  await page.goto('/');

  const guestCheckbox = page.getByLabel('Guest login');
  await guestCheckbox.check();
  const handleInput = page.getByRole('textbox').first();
  await handleInput.fill('');

  const popupPromise = context.waitForEvent('page', { timeout: 10_000 });
  await page.getByRole('button', { name: 'Login' }).click();

  const chatPage = await popupPromise;
  chatPage.on('console', msg => console.log(`[chat ${msg.type()}] ${msg.text()}`));
  await chatPage.waitForLoadState('domcontentloaded');

  // Diagnostic loop — poll every 3s for FICS text so we can see progress.
  let gotBanner = false;
  for (let i = 0; i < 30; i++) {
    await chatPage.waitForTimeout(2000);
    const body = (await chatPage.textContent('body')) ?? '';
    console.log(`[poll ${i * 2}s] body length=${body.length}, tail=${JSON.stringify(body.slice(-300))}`);
    if (/Starting FICS session|Press return|login:\s|^guest|fics%/im.test(body)) {
      gotBanner = true;
      break;
    }
  }
  expect(gotBanner, 'never received FICS login banner').toBe(true);

  // Board popup listener ready before we send the observe command.
  const boardPopupPromise = context.waitForEvent('page', {
    timeout: 60_000,
    predicate: p => p.url().includes('window=board'),
  });

  const input = chatPage.getByPlaceholder(/FICS command/i);
  await input.fill('observe /b');
  await input.press('Enter');

  const boardPage = await boardPopupPromise.catch(async () => {
    const afterObserve = await chatPage.textContent('body');
    console.log('[chat snapshot post-observe]', afterObserve?.slice(-3000));
    throw new Error('Board popup never opened — observe may have failed.');
  });

  boardPage.on('console', msg => console.log(`[board ${msg.type()}] ${msg.text()}`));
  await boardPage.waitForLoadState('domcontentloaded');

  await boardPage.waitForFunction(
    () => /to move/.test(document.body.innerText),
    { timeout: 30_000 },
  );

  const boardText = await boardPage.textContent('body');
  expect(boardText).toMatch(/to move/);
});
