import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FicsConnector } from '../FicsConnector.js';
import { ChatService } from '../ChatService.js';
import { GameService } from '../GameService.js';
import { FicsParser } from '../../parsers/FicsParser.js';
import {
  defaultChatParsers,
  defaultGameLineParsers,
  defaultChunkParsers,
} from '../../parsers/defaultParsers.js';

/**
 * onConnectionChange — the transport up/down feed behind the main
 * window's disconnect panel (Carson, 2026-08-14: on disconnect, just a
 * Relaunch button). These are the first tests to drive the real
 * `connect()` → ws.onopen/onclose path rather than injecting private
 * state, so they also pin which handler fires what.
 *
 * The contract under test is LEVEL-triggered, not edge-triggered:
 *   - onopen reports true.
 *   - onclose reports false unconditionally — including a socket that
 *     never reached onopen (unreachable server), because from the UI's
 *     side a link that never came up and a link that dropped are the
 *     same dead link.
 *   - disconnect() reports false only on a real transition; the
 *     browser's own trailing onclose then repeats the false, and
 *     consumers must treat the duplicate as a no-op.
 */

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  binaryType = 'blob';
  onopen: (() => void) | null = null;
  onmessage: ((ev: unknown) => void) | null = null;
  onclose: ((ev: { code: number; reason: string }) => void) | null = null;
  onerror: ((err: unknown) => void) | null = null;
  readonly sent: unknown[] = [];
  closed: { code?: number; reason?: string } | null = null;
  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }
  send(data: unknown): void {
    this.sent.push(data);
  }
  close(code?: number, reason?: string): void {
    this.closed = { code, reason };
  }
}

function makeConnector() {
  const chatService = new ChatService();
  const gameService = new GameService();
  const parser = new FicsParser({
    chatParsers: defaultChatParsers(),
    gameLineParsers: defaultGameLineParsers(),
    chunkParsers: defaultChunkParsers(),
    gameService,
  });
  return new FicsConnector({ chatService, gameService, parser });
}

const CREDS = { handle: '', password: '', isGuest: true };

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function lastSocket(): FakeWebSocket {
  const ws = FakeWebSocket.instances.at(-1);
  if (!ws) throw new Error('connect() opened no socket');
  return ws;
}

describe('onConnectionChange', () => {
  it('reports up on open and down on a server-side close', () => {
    const c = makeConnector();
    const seen: boolean[] = [];
    c.onConnectionChange(up => seen.push(up));

    c.connect(CREDS);
    expect(seen).toEqual([]); // dialing is not up

    lastSocket().onopen?.();
    expect(seen).toEqual([true]);
    expect(c.isConnected()).toBe(true);

    lastSocket().onclose?.({ code: 1006, reason: '' });
    expect(seen).toEqual([true, false]);
    expect(c.isConnected()).toBe(false);
  });

  it('a connect that never opens still reports down', () => {
    const c = makeConnector();
    const seen: boolean[] = [];
    c.onConnectionChange(up => seen.push(up));

    c.connect(CREDS);
    lastSocket().onclose?.({ code: 1006, reason: '' }); // server unreachable
    expect(seen).toEqual([false]);
  });

  it('disconnect() reports down; the browser’s trailing onclose repeats it (level, not edge)', () => {
    const c = makeConnector();
    const seen: boolean[] = [];
    c.onConnectionChange(up => seen.push(up));

    c.connect(CREDS);
    const ws = lastSocket();
    ws.onopen?.();
    c.disconnect();
    expect(seen).toEqual([true, false]);

    // The real browser fires onclose asynchronously after close(); the
    // repeat is contractual and consumers must no-op on it.
    ws.onclose?.({ code: 1000, reason: 'User requested disconnect' });
    expect(seen).toEqual([true, false, false]);
  });

  it('disconnect() with the link already down says nothing', () => {
    const c = makeConnector();
    const seen: boolean[] = [];
    c.onConnectionChange(up => seen.push(up));

    c.connect(CREDS); // dialing, onopen never fired
    c.disconnect();
    expect(seen).toEqual([]);
  });

  it('unsubscribing stops delivery; other subscribers keep hearing', () => {
    const c = makeConnector();
    const a: boolean[] = [];
    const b: boolean[] = [];
    const offA = c.onConnectionChange(up => a.push(up));
    c.onConnectionChange(up => b.push(up));

    c.connect(CREDS);
    lastSocket().onopen?.();
    expect(a).toEqual([true]);
    expect(b).toEqual([true]);

    offA();
    lastSocket().onclose?.({ code: 1006, reason: '' });
    expect(a).toEqual([true]);
    expect(b).toEqual([true, false]);
  });
});
