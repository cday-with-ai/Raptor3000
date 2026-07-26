import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameService, BoardMode, type Style12Message } from '@raptor3000/shared';
import { EngineManager } from '../EngineManager.js';

/**
 * EngineManager tests. We stub out `Worker` so the EngineService inside
 * never actually starts Stockfish — we only assert the gating logic
 * (which game gets focused, when analysis is started/stopped) behaves
 * per the design rules:
 *
 *   PLAYING:    never analyze.
 *   OBSERVING:  analyze on first Style12, refresh on each update.
 *   EXAMINING:  same as observing.
 *   INACTIVE:   one-off after game-end (covered separately when we have it).
 */

class FakeWorker {
  static instances: FakeWorker[] = [];
  posted: string[] = [];
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onerror: ((err: ErrorEvent) => void) | null = null;
  constructor(_url: string | URL) {
    FakeWorker.instances.push(this);
  }
  postMessage(cmd: string): void {
    this.posted.push(cmd);
    // Auto-respond to UCI handshake so EngineService transitions to ready.
    if (cmd === 'uci') queueMicrotask(() => this.fire('uciok'));
    if (cmd === 'isready') queueMicrotask(() => this.fire('readyok'));
  }
  terminate(): void {}
  private fire(line: string): void {
    this.onmessage?.({ data: line } as MessageEvent);
  }
}

beforeEach(() => {
  FakeWorker.instances = [];
  // @ts-expect-error — overriding for tests
  globalThis.Worker = FakeWorker;
});

function makeStyle12(gameId: string, relation: -3 | -2 | -1 | 0 | 1 | 2): Style12Message {
  return {
    gameId,
    position: Array.from({ length: 8 }, () => Array<number>(8).fill(0)),
    isWhitesMoveAfterMoveIsMade: true,
    doublePawnPushFile: -1,
    canWhiteCastleKSide: false,
    canWhiteCastleQSide: false,
    canBlackCastleKSide: false,
    canBlackCastleQSide: false,
    numberOfMovesSinceLastIrreversible: 0,
    whiteName: 'A',
    blackName: 'B',
    relation,
    initialTimeMillis: 180_000,
    initialIncMillis: 0,
    whiteStrength: 39,
    blackStrength: 39,
    whiteRemainingTimeMillis: 180_000,
    blackRemainingTimeMillis: 180_000,
    fullMoveNumber: 1,
    san: 'none',
    lan: 'none',
    timeTakenForLastMoveMillis: 0,
    lagInMillis: 0,
    isClockTicking: true,
    isWhiteOnTop: false,
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('EngineManager — anti-cheat & lifecycle gating', () => {
  it('does NOT start the engine for PLAYING-mode games', async () => {
    const game = new GameService();
    const _mgr = new EngineManager(game);

    game.recordStyle12(makeStyle12('1', 1));
    game.fireGameCreated('1');
    game.fireGameStateChanged('1', false);
    await flushMicrotasks();

    expect(FakeWorker.instances.length).toBe(0);
    expect(_mgr.getFocusedGameId()).toBeNull();
  });

  it('starts the engine and focuses on OBSERVING start', async () => {
    const game = new GameService();
    const mgr = new EngineManager(game);

    game.recordStyle12(makeStyle12('77', 0));
    game.fireGameCreated('77');
    game.fireGameStateChanged('77', false);
    await flushMicrotasks();

    expect(FakeWorker.instances.length).toBe(1);
    expect(mgr.getFocusedGameId()).toBe('77');
    const posted = FakeWorker.instances[0].posted;
    expect(posted).toContain('uci');
    expect(posted.some(p => p.startsWith('position fen '))).toBe(true);
    expect(posted.some(p => p.startsWith('go depth '))).toBe(true);
  });

  it('starts the engine and focuses on EXAMINING start', async () => {
    const game = new GameService();
    const mgr = new EngineManager(game);

    game.recordStyle12(makeStyle12('88', 2));
    game.fireGameCreated('88');
    game.fireGameStateChanged('88', false);
    await flushMicrotasks();

    expect(mgr.getFocusedGameId()).toBe('88');
  });

  it('refreshes analysis on every Style12 for the focused game', async () => {
    const game = new GameService();
    const _mgr = new EngineManager(game);

    game.recordStyle12(makeStyle12('1', 0));
    game.fireGameCreated('1');
    game.fireGameStateChanged('1', false);
    await flushMicrotasks();

    const worker = FakeWorker.instances[0];
    const initialFenCount = worker.posted.filter(p => p.startsWith('position fen ')).length;

    // Simulate next move.
    game.recordStyle12(makeStyle12('1', 0));
    game.fireGameStateChanged('1', true);
    await flushMicrotasks();

    const afterFenCount = worker.posted.filter(p => p.startsWith('position fen ')).length;
    expect(afterFenCount).toBeGreaterThan(initialFenCount);
  });

  it('unfocuses when the observed game ends', async () => {
    const game = new GameService();
    const mgr = new EngineManager(game);

    game.recordStyle12(makeStyle12('5', 0));
    game.fireGameCreated('5');
    game.fireGameStateChanged('5', false);
    await flushMicrotasks();
    expect(mgr.getFocusedGameId()).toBe('5');

    // Game-end: GameService transitions OBSERVING → INACTIVE on fireGameInactive.
    // It will fire onObsGameEnd first then gameInactive.
    game.fireGameInactive('5');
    expect(mgr.getFocusedGameId()).toBeNull();
  });

  it('manual focus() respects PLAYING anti-cheat gate', async () => {
    const game = new GameService();
    const mgr = new EngineManager(game);

    game.recordStyle12(makeStyle12('p', 1));
    // Try to manually focus a playing game — should be a no-op.
    mgr.focus('p');
    expect(mgr.getFocusedGameId()).toBeNull();

    game.recordStyle12(makeStyle12('o', 0));
    mgr.focus('o');
    await flushMicrotasks();
    expect(mgr.getFocusedGameId()).toBe('o');
  });

  it('switches focus when a new analyzable game starts', async () => {
    const game = new GameService();
    const mgr = new EngineManager(game);

    game.recordStyle12(makeStyle12('a', 0));
    game.fireGameCreated('a');
    game.fireGameStateChanged('a', false);
    await flushMicrotasks();
    expect(mgr.getFocusedGameId()).toBe('a');

    game.recordStyle12(makeStyle12('b', 2)); // examine another
    game.fireGameCreated('b');
    game.fireGameStateChanged('b', false);
    await flushMicrotasks();
    expect(mgr.getFocusedGameId()).toBe('b');
  });

  it('dispose() unsubscribes and tears down the worker', async () => {
    const game = new GameService();
    const mgr = new EngineManager(game);

    game.recordStyle12(makeStyle12('x', 0));
    game.fireGameCreated('x');
    game.fireGameStateChanged('x', false);
    await flushMicrotasks();

    const terminateSpy = vi.spyOn(FakeWorker.instances[0], 'terminate');
    mgr.dispose();
    expect(terminateSpy).toHaveBeenCalled();

    // Subsequent events are ignored.
    game.recordStyle12(makeStyle12('y', 0));
    game.fireGameCreated('y');
    await flushMicrotasks();
    // No new worker — manager was disposed.
    expect(FakeWorker.instances.length).toBe(1);
  });
});
