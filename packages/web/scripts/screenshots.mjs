// Capture interface screenshots + a video for the README and landing.
//
//   node scripts/screenshots.mjs        (dev server must be up on :5173)
//
// Plain playwright API, not the test runner — this is a camera. Popups
// (chat, boards) are separate pages here, which is why this exists:
// interactive browser tools only shoot tabs. Shot list is Carson's:
// split chat, playing, observing with engine, options, and a video.
// Output: docs/screenshots/*.jpg + board.webm (gif conversion happens
// in the caller if ffmpeg is around). One gentle rig pair, slow moves.

import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve(import.meta.dirname, '../../../docs/screenshots');
mkdirSync(OUT, { recursive: true });

const shot = (page, name) =>
  page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82 });

const browser = await chromium.launch();

async function guestSession(context) {
  const page = await context.newPage();
  await page.goto('http://localhost:5173/');
  await page.waitForSelector('text=Sign in to FICS');
  await page.getByLabel('Guest login').check();
  const chatPromise = context.waitForEvent('page', { timeout: 15_000 });
  await page.getByRole('button', { name: 'Login' }).click();
  const chat = await chatPromise;
  await chat.waitForLoadState('domcontentloaded');
  await page.waitForFunction(
    () => window.raptor?.connector?.getLoggedInAs?.() != null,
    null,
    { timeout: 30_000 },
  );
  const name = await page.evaluate(() => window.raptor.connector.getLoggedInAs());
  return { page, chat, name };
}

// ── context A: the star of every shot ─────────────────────────────
const ctxA = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1180, height: 820 } },
});
await ctxA.addInitScript(() => localStorage.setItem('raptor.popupsVerified', 'true'));

const landing = await ctxA.newPage();
await landing.goto('http://localhost:5173/');
await landing.waitForSelector('text=Sign in to FICS');
await landing.waitForTimeout(400);
await shot(landing, 'landing');
await landing.close();
console.log('landing ✓');

const A = await guestSession(ctxA);

// Observing, engine on: the standard game with the most watchers.
const obsBoardPromise = ctxA.waitForEvent('page', { timeout: 20_000 });
await A.page.evaluate(() => window.raptor.connector.sendMessage('observe /s'));
const obsBoard = await obsBoardPromise;
await obsBoard.waitForLoadState('domcontentloaded');
await obsBoard.setViewportSize({ width: 1180, height: 820 });
await obsBoard.waitForSelector('img[src*="/pieces/"]', { timeout: 20_000 });
await obsBoard.waitForTimeout(10_000); // engine lines, opening name, clocks
await shot(obsBoard, 'observing');
console.log('observing ✓ (engine visible)');

// Options page (the main window sits on it post-login).
await A.page.waitForTimeout(300);
await shot(A.page, 'options');
console.log('options ✓');

// ── context B: the sparring partner ───────────────────────────────
const ctxB = await browser.newContext({ viewport: { width: 1280, height: 860 } });
await ctxB.addInitScript(() => localStorage.setItem('raptor.popupsVerified', 'true'));
const B = await guestSession(ctxB);

await B.page.evaluate(() => window.raptor.connector.sendMessage('set formula none'));
await A.page.evaluate(() => window.raptor.connector.sendMessage('set formula none'));
const playBoardPromise = ctxA.waitForEvent('page', { timeout: 25_000 });
await B.page.evaluate(name => window.raptor.connector.sendMessage(`match ${name} 10 5 u white`), A.name);
await A.page.waitForTimeout(2_500);
await A.page.evaluate(() => window.raptor.connector.sendMessage('accept'));
const playBoard = await playBoardPromise;
await playBoard.waitForLoadState('domcontentloaded');
await playBoard.setViewportSize({ width: 1180, height: 820 });
await playBoard.waitForSelector('img[src*="/pieces/"]', { timeout: 20_000 });

// A short, unhurried Italian for the camera — B is white.
const MOVES = [
  ['B', 'e4'], ['A', 'e5'], ['B', 'Nf3'], ['A', 'Nc6'],
  ['B', 'Bc4'], ['A', 'Bc5'], ['B', 'c3'], ['A', 'Nf6'],
];
for (const [who, mv] of MOVES) {
  const s = who === 'A' ? A : B;
  await s.page.evaluate(m => window.raptor.connector.sendMessage(m), mv);
  await A.page.waitForTimeout(2_200);
}
await shot(playBoard, 'playing');
console.log('playing ✓');

// The chat window in the Decaf split, with the game's traffic on it.
await A.chat.setViewportSize({ width: 980, height: 640 });
const splitBtn = A.chat.getByRole('button', { name: '(split)' });
if (await splitBtn.count()) await splitBtn.click();
await A.chat.waitForTimeout(1_200);
await shot(A.chat, 'chat-split');
console.log('chat-split ✓');

// The seek graph with whatever's live.
await A.page.getByRole('button', { name: 'Seek' }).click();
await A.page.waitForTimeout(3_000);
await shot(A.page, 'seek-graph');
console.log('seek-graph ✓');

// Wind down politely; the context video finalizes on close.
await B.page.evaluate(() => window.raptor.connector.sendMessage('abort'));
await A.page.waitForTimeout(1_200);
await A.page.evaluate(() => window.raptor.connector.sendMessage('abort'));
await A.page.waitForTimeout(1_000);
await A.page.evaluate(() => window.raptor.connector.sendMessage('quit'));
await B.page.evaluate(() => window.raptor.connector.sendMessage('quit'));

const video = playBoard.video();
await ctxA.close();
await ctxB.close();
if (video) {
  const path = await video.path();
  console.log(`video → ${path}`);
}
await browser.close();
console.log(`done → ${OUT}`);
