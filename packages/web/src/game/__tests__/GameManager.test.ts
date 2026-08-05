import { describe, it, expect } from 'vitest';
import {
  ChatEventType,
  ChatService,
  FicsParser,
  GameService,
  defaultChatParsers,
  defaultChunkParsers,
  defaultGameLineParsers,
  type ChatEvent,
} from '@raptor3000/shared';
import type { OpenWindowSpec, WindowManager } from '../../windows/WindowManager.js';
import {
  GameManager,
  announceBlockedBoardWindows,
  blockedBoardWindowMessage,
} from '../GameManager.js';

/**
 * GameManager tests — the segment past where the shared-package seam test
 * stops.
 *
 * `connectorBoardSeam.test.ts` walks raw server bytes through FicsParser into
 * GameService and asserts against a listener *shaped like* GameManager's. This
 * file uses the real GameManager, so the thing under test is what actually
 * turns a lifecycle hook into a `WindowManager.open` call — including the case
 * where the browser refuses.
 *
 * No DOM: `WindowManager` is stubbed to the two methods GameManager uses, and
 * `open` returning null is exactly how a real browser reports a blocked popup.
 * A true BoardWindow render test still needs jsdom.
 */

/** Records what GameManager asked the browser to do. `open` returns null when
 *  `blockedGames` names the game — the browser's own signal for a refusal. */
class StubWindowManager {
  readonly opened: string[] = [];
  readonly closed: string[] = [];
  blockedGames = new Set<string>();

  open(spec: OpenWindowSpec): Window | null {
    this.opened.push(`${spec.kind}:${spec.id ?? ''}`);
    return this.blockedGames.has(spec.id ?? '')
      ? null
      : ({} as unknown as Window);
  }

  close(spec: OpenWindowSpec): void {
    this.closed.push(`${spec.kind}:${spec.id ?? ''}`);
  }

  asWindowManager(): WindowManager {
    return this as unknown as WindowManager;
  }
}

// Style12 relation is what decides the mode, and therefore which lifecycle
// hook fires: 0 = observing live, 1 = playing with the move, 2 = examining.
function style12(gameId: string, relation: number): string {
  return (
    '<12> rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR' +
    ` B 4 1 1 1 1 0 ${gameId} GuestFOO GuestBAR ${relation} 3 0 39 39 180000 180000 1` +
    ' P/e2-e4 (0:00.000) e4 0 1 0\n'
  );
}

function makeHarness() {
  const chatService = new ChatService();
  const gameService = new GameService();
  const parser = new FicsParser({
    chatParsers: defaultChatParsers(),
    gameLineParsers: defaultGameLineParsers(),
    chunkParsers: defaultChunkParsers(),
    gameService,
  });
  const windows = new StubWindowManager();
  const gameManager = new GameManager(gameService, windows.asWindowManager());

  const chat: ChatEvent[] = [];
  chatService.addMainConsoleListener({
    id: 'test-console',
    accepts: () => true,
    handle: e => chat.push(e),
  });

  // parseStream is the connector's path minus the `\n\r` normalization and
  // timeseal framing, both already covered in connectorBoardSeam.test.ts.
  const feed = (text: string) => {
    for (const e of parser.parseStream(text)) chatService.publish(e);
  };

  return { chatService, gameService, gameManager, windows, chat, feed };
}

describe('GameManager → WindowManager', () => {
  it('opens one board window per game from a parsed Style12', () => {
    const { gameManager, windows, feed } = makeHarness();

    feed(style12('95', 0));

    expect(windows.opened).toEqual(['board:95']);
    expect([...gameManager.getOpenGameIds()]).toEqual(['95']);
  });

  it('does not reopen the window on later moves in the same game', () => {
    const { windows, feed } = makeHarness();

    feed(style12('95', 0));
    feed(style12('95', 0));
    feed(style12('95', 0));

    expect(windows.opened).toEqual(['board:95']);
  });

  it('opens a board for playing and examining, not only observing', () => {
    const { windows, feed } = makeHarness();

    feed(style12('11', 1)); // playing, our move
    feed(style12('22', 2)); // examining
    feed(style12('33', 0)); // observing

    expect(windows.opened).toEqual(['board:11', 'board:22', 'board:33']);
  });

  it('keeps observed and played games open past game end, closes examines', () => {
    const { gameService, gameManager, windows, feed } = makeHarness();

    feed(style12('95', 0));
    gameService.fireGameInactive('95');
    // Observed games stay open for review; the user unobserves or closes.
    expect(windows.closed).toEqual([]);
    expect([...gameManager.getOpenGameIds()]).toEqual(['95']);

    feed(style12('42', 2));
    gameService.fireGameInactive('42');
    // Leaving examine is a deliberate exit — the window goes with it.
    expect(windows.closed).toEqual(['board:42']);
    expect([...gameManager.getOpenGameIds()]).toEqual(['95']);
  });

  it('stops opening windows once disposed', () => {
    const { gameManager, windows, feed } = makeHarness();

    gameManager.dispose();
    feed(style12('95', 0));

    expect(windows.opened).toEqual([]);
  });
});

describe('blocked board popup', () => {
  it('fires onBoardWindowBlocked when the browser refuses the popup', () => {
    const { gameManager, windows, feed } = makeHarness();
    const blocked: string[] = [];
    gameManager.onBoardWindowBlocked = id => blocked.push(id);
    windows.blockedGames.add('95');

    feed(style12('95', 0));

    expect(windows.opened).toEqual(['board:95']);
    expect(blocked).toEqual(['95']);
  });

  it('reports the blocked board in the chat console as an INTERNAL error', () => {
    const { chatService, gameManager, windows, chat, feed } = makeHarness();
    announceBlockedBoardWindows(gameManager, chatService);
    windows.blockedGames.add('95');

    feed(style12('95', 0));

    const notices = chat.filter(e => e.type === ChatEventType.INTERNAL);
    expect(notices).toHaveLength(1);
    expect(notices[0].message).toBe(blockedBoardWindowMessage('95'));
    expect(notices[0].gameId).toBe('95');
    // The <12> that caused it must still not leak into chat as server text.
    expect(chat.some(e => e.raw.includes('<12>'))).toBe(false);
  });

  it('says nothing when the popup opens normally', () => {
    const { chatService, gameManager, chat, feed } = makeHarness();
    announceBlockedBoardWindows(gameManager, chatService);

    feed(style12('95', 0));

    expect(chat.filter(e => e.type === ChatEventType.INTERNAL)).toEqual([]);
  });

  it('still records the game as open when blocked, so a retry can focus it', () => {
    const { gameManager, windows, feed } = makeHarness();
    windows.blockedGames.add('95');

    feed(style12('95', 0));

    // Deliberate: the game exists and has state even though no window drew.
    // GameManager tracks games it wants windows for, not windows that exist.
    expect([...gameManager.getOpenGameIds()]).toEqual(['95']);
  });
});
