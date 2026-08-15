import { test, expect } from '@playwright/test';

/**
 * Reproduces the user-reported bugs:
 *   1. `obs N` does not open a board window.
 *   2. Server messages (sr seek-removals, seek ads, whispers, vars dumps,
 *      "You are now observing game N", "Game N: ...") leak into the chat
 *      window verbatim.
 *
 * The test logs in as a guest, runs `games`, picks the first observable
 * game id, runs `obs <id>`, then captures: (a) whether a board popup
 * opens within 30s, (b) the last few KB of chat text for leak inspection.
 */

test.setTimeout(180_000);

test('obs N — board window + chat leak diagnosis', async ({ page, context }) => {
  page.on('console', m => console.log(`[main ${m.type()}] ${m.text()}`));
  await page.goto('/');

  await page.getByLabel('Guest login').check();
  await page.getByRole('textbox').first().fill('');

  const popupPromise = context.waitForEvent('page', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Login' }).click();
  const chat = await popupPromise;
  chat.on('console', m => console.log(`[chat ${m.type()}] ${m.text()}`));
  await chat.waitForLoadState('domcontentloaded');

  // Wait for FICS banner.
  let banner = false;
  for (let i = 0; i < 30; i++) {
    await chat.waitForTimeout(2000);
    const body = (await chat.textContent('body')) ?? '';
    if (/Starting FICS session as Guest[A-Z]{4}/.test(body)) {
      banner = true;
      break;
    }
  }
  expect(banner).toBe(true);

  const input = chat.getByLabel("FICS command");

  // Run `games` and wait for the listing to arrive.
  await input.fill('games');
  await input.press('Enter');
  await chat.waitForTimeout(4000);

  const gamesBody = (await chat.textContent('body')) ?? '';
  console.log('===== CHAT AFTER `games` (last 3000 chars) =====');
  console.log(gamesBody.slice(-3000));

  // Pick first observable game id. FICS lines look like:
  //   "  1 (Exam.    0 Foo            0 Bar     ) [ uu  0  0] ..."
  //   " 21 2895 Horsian       2830 ArasanX     [ sr 15   3]  ..."
  // We want a non-Exam game. Match a leading id then a rating column.
  const gameLine = gamesBody.match(/^\s*(\d{1,4})\s+\d{3,4}\s+\S+\s+\d{3,4}\s+\S+\s+\[/m);
  const gameId = gameLine?.[1];
  console.log('[picked game id]', gameId);
  expect(gameId, 'no observable game found in `games` output').toBeTruthy();

  // Arm the board popup listener BEFORE issuing observe.
  const boardPopupPromise = context
    .waitForEvent('page', {
      timeout: 30_000,
      predicate: p => p.url().includes('window=board'),
    })
    .catch(() => null);

  await input.fill(`obs ${gameId}`);
  await input.press('Enter');

  const boardPage = await boardPopupPromise;

  // Give style12 / chat a moment to flow regardless.
  await chat.waitForTimeout(5000);

  const postObsBody = (await chat.textContent('body')) ?? '';
  console.log('===== CHAT AFTER `obs` (last 4000 chars) =====');
  console.log(postObsBody.slice(-4000));

  console.log('===== BOARD WINDOW OPENED? =====', boardPage ? 'YES' : 'NO');
  if (boardPage) {
    boardPage.on('console', m => console.log(`[board ${m.type()}] ${m.text()}`));
    await boardPage.waitForLoadState('domcontentloaded').catch(() => {});
    const boardText = (await boardPage.textContent('body').catch(() => '')) ?? '';
    console.log('===== BOARD TEXT (first 1500 chars) =====');
    console.log(boardText.slice(0, 1500));
  }

  // Leak detectors — these should NOT be in the chat output if the
  // parser/router were doing their job.
  const leaks: Record<string, boolean> = {
    sr_token: /<sr>/.test(postObsBody),
    seek_ad: /seeking \d+ \d+ (un)?rated/.test(postObsBody),
    you_are_now_observing: /You are now observing game/.test(postObsBody),
    game_header: /^Game \d+: \S+ \(\d+\) \S+ \(\d+\)/m.test(postObsBody),
    whisper_from_observed: /\(\d+\)\[\d+\] whispers:/.test(postObsBody),
    vars_dump: /Variable settings of/.test(postObsBody),
    fics_prompt_repeats: (postObsBody.match(/fics%/g) ?? []).length,
  };
  console.log('===== LEAK DETECTORS =====', JSON.stringify(leaks, null, 2));

  // We don't fail the test on leaks — this is diagnostic. We DO fail if
  // the board window did not open, since that's the headline bug.
  expect(boardPage, 'board window did not open after `obs N`').not.toBeNull();
});
