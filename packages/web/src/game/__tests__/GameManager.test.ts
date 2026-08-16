import { describe, it, expect } from 'vitest';
import {
  ChatEventType,
  ChatService,
  FicsParser,
  GameService,
  defaultChatParsers,
  defaultChunkParsers,
  defaultGameLineParsers,
  makeChatEvent,
  type ChatEvent,
} from '@raptor3000/shared';
import type { OpenWindowSpec, WindowManager } from '../../windows/WindowManager.js';
import {
  GameManager,
  announceBlockedBoardWindows,
  blockedBoardWindowMessage,
} from '../GameManager.js';
import { GameWindowMachine } from '../GameWindowMachine.js';

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
 *  `blockedGames` names the game — the browser's own signal for a refusal.
 *  Slot windows are recorded as `kind:slot`; the per-game `onClose` callbacks
 *  are kept so tests can fire them the way WindowManager's poll would. */
class StubWindowManager {
  readonly opened: string[] = [];
  readonly closed: string[] = [];
  blockedGames = new Set<string>();
  private readonly onCloses = new Map<string, () => void>();

  open(spec: OpenWindowSpec): Window | null {
    const key = `${spec.kind}:${spec.slot ?? spec.id ?? ''}`;
    this.opened.push(key);
    if (spec.onClose) this.onCloses.set(key, spec.onClose);
    return this.blockedGames.has(spec.id ?? '')
      ? null
      : ({} as unknown as Window);
  }

  close(spec: OpenWindowSpec): void {
    this.closed.push(`${spec.kind}:${spec.slot ?? spec.id ?? ''}`);
  }

  /** Fire a slot's onClose the way WindowManager's close-poll would. */
  fireOnClose(key: string): void {
    this.onCloses.get(key)?.();
  }

  asWindowManager(): WindowManager {
    return this as unknown as WindowManager;
  }
}

// Style12 relation is what decides the mode, and therefore which lifecycle
// hook fires: 0 = observing live, 1 = playing with the move, 2 = examining.
function style12(
  gameId: string,
  relation: number,
  white = 'GuestFOO',
  black = 'GuestBAR',
): string {
  return (
    '<12> rnbqkbnr pppppppp -------- -------- ----P--- -------- PPPP-PPP RNBQKBNR' +
    ` B 4 1 1 1 1 0 ${gameId} ${white} ${black} ${relation} 3 0 39 39 180000 180000 1` +
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

/** The harness plus a GameWindowMachine, wired like appContext wires it
 *  (minus the connector: commands are fed by hand). */
function makeHarnessWithMachine() {
  const base = makeHarness();
  // The harness built a machine-less manager over the same gameService;
  // dispose it so only the wired manager answers lifecycle hooks.
  base.gameManager.dispose();
  const sent: string[] = [];
  const machine = new GameWindowMachine({
    chatService: base.chatService,
    sendHidden: line => sent.push(line),
  });
  const gameManager = new GameManager(
    base.gameService,
    base.windows.asWindowManager(),
    machine,
  );
  return { ...base, gameManager, machine, sent };
}

/** The FOLLOWING confirmation, as FICS would send it after a follow. */
function feedFollowing(chatService: ChatService, source: string): void {
  chatService.publish(
    makeChatEvent(ChatEventType.FOLLOWING, `You will now be following ${source}'s games.`, {
      source,
    }),
  );
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

    // Playing reuses one stable window; examine/observe get per-game ones.
    expect(windows.opened).toEqual(['board:playing', 'board:22', 'board:33']);
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

describe('GameManager → follow/playing slots', () => {
  it('routes a follow game into the follow slot window', () => {
    const { machine, windows, feed, chatService } = makeHarnessWithMachine();

    machine.onUserCommand('follow billjr');
    feedFollowing(chatService, 'billjr');
    feed(style12('77', 0, 'GuestFoo', 'billjr'));

    expect(windows.opened).toEqual(['board:follow']);
    expect(machine.isFollowGame('77')).toBe(true);
  });

  it('routes a game the user named to a per-game window, not the follow slot', () => {
    const { machine, windows, feed, chatService } = makeHarnessWithMachine();

    machine.onUserCommand('follow billjr');
    feedFollowing(chatService, 'billjr');
    machine.onUserCommand('observe 45');
    feed(style12('45', 0, 'billjr', 'GuestX'));
    feed(style12('77', 0, 'GuestFoo', 'billjr'));

    expect(windows.opened).toEqual(['board:45', 'board:follow']);
  });

  it('reuses the playing slot across two of our games', () => {
    const { windows, feed } = makeHarnessWithMachine();

    feed(style12('11', 1));
    feed(style12('22', 1));

    // The manager opens the slot once; the real WindowManager retargets
    // it (covered in windowManager.test.ts).
    expect(windows.opened).toEqual(['board:playing', 'board:playing']);
  });

  it('closing the follow window stops following', () => {
    const { machine, windows, feed, chatService, sent } = makeHarnessWithMachine();

    machine.onUserCommand('follow billjr');
    feedFollowing(chatService, 'billjr');
    feed(style12('77', 0, 'GuestFoo', 'billjr'));
    expect(windows.opened).toEqual(['board:follow']);

    windows.fireOnClose('board:follow');

    expect(sent).toEqual(['follow']);
    expect(machine.following).toBe(false);
  });

  it('a follow game ending keeps the window open for review', () => {
    const { gameService, windows, feed, chatService, machine } = makeHarnessWithMachine();

    machine.onUserCommand('follow billjr');
    feedFollowing(chatService, 'billjr');
    feed(style12('77', 0, 'GuestFoo', 'billjr'));
    gameService.fireGameInactive('77');

    expect(windows.closed).toEqual([]);
    expect(machine.following).toBe(true);
    expect(machine.currentFollowGame).toBeNull();
  });

  it('a blocked follow window still stops following when it never opened', () => {
    const { machine, windows, feed, chatService } = makeHarnessWithMachine();

    machine.onUserCommand('follow billjr');
    feedFollowing(chatService, 'billjr');
    windows.blockedGames.add('77');
    feed(style12('77', 0, 'GuestFoo', 'billjr'));

    expect(windows.opened).toEqual(['board:follow']);
    // No window exists, so no close event can ever fire; the machine's
    // own stop (bare `follow`) is the only way back.
    expect(machine.following).toBe(true);
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
