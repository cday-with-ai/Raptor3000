import { describe, it, expect } from 'vitest';
import { FicsConnector, type LoginCredentials } from '../FicsConnector.js';
import { ChatService } from '../ChatService.js';
import { GameService } from '../GameService.js';
import { FicsParser } from '../../parsers/FicsParser.js';
import {
  defaultChatParsers,
  defaultGameLineParsers,
  defaultChunkParsers,
} from '../../parsers/defaultParsers.js';
import { ChatEventType } from '../../events/ChatEventType.js';
import type { ChatEvent } from '../../events/ChatEvent.js';

/**
 * Login state machine, rewritten 2026-08-12 after the account kick-war.
 *
 * FICS allows one session per handle. Registered handles: a NEW login wins
 * — the server prints `**** X is already logged in - kicking them out. ****`
 * to the newcomer and `**** X has arrived - you can't both be logged in. ****`
 * to the loser, then closes the loser's socket. Unregistered handles: the
 * OLD session wins and the newcomer is refused (observed live: the second
 * named-guest connection was dropped before session start).
 *
 * The old connector became 'authed' the moment it SENT the password, so a
 * rejected password or refused handle left it deaf — bootstrap commands
 * fired into a login prompt and the session died silently ~60s later.
 * These tests pin the fix: authed comes only from the server's
 * "Starting FICS session as" line, and every verdict FICS prints during
 * login surfaces as an INTERNAL console event.
 */

// Raw shapes as the server actually sends them (\n\r line endings).
const LOGIN_PROMPT = '\n\rlogin: ';
const PASSWORD_PROMPT = '\n\rpassword: ';
const SESSION_START = (name: string) =>
  `\n\r**** Starting FICS session as ${name} ****\n\r`;
const KICKED_THEM = (name: string) =>
  `\n\r**** ${name} is already logged in - kicking them out. ****`;
const KICKED_US = (name: string) =>
  `\n\r**** ${name} has arrived - you can't both be logged in. ****\n\r`;
const INVALID_PASSWORD = '\n\r**** Invalid password! ****\n\r\n\rlogin: ';
const GUEST_CONFIRM = (name: string) =>
  `\n\rPress return to enter the server as "${name}":\n\r`;
// Refusal wording is pinned to our tolerant regex, not to captured server
// text — the live 2026-08-12 refusal closed the socket before we logged it.
const GUEST_REFUSED = (name: string) =>
  `\n\r${name} is already logged in --- select another name\n\r`;

function makeLoginSession(credOverrides: Partial<LoginCredentials> = {}) {
  const chatService = new ChatService();
  const gameService = new GameService();
  const parser = new FicsParser({
    chatParsers: defaultChatParsers(),
    gameLineParsers: defaultGameLineParsers(),
    chunkParsers: defaultChunkParsers(),
    gameService,
  });
  const connector = new FicsConnector({ chatService, gameService, parser });

  const chat: ChatEvent[] = [];
  chatService.addMainConsoleListener({
    id: 'test-console',
    accepts: () => true,
    handle: e => chat.push(e),
  });

  // Reach the private login machinery directly instead of opening a real
  // WebSocket: inject creds/stage, capture plaintext sends pre-timeseal.
  const priv = connector as unknown as {
    pendingCreds: LoginCredentials | null;
    loginStage: string;
    connected: boolean;
    sendRawString(line: string): void;
    handleRaw(raw: string): void;
  };
  const sent: string[] = [];
  priv.sendRawString = line => sent.push(line);
  priv.connected = true; // socket "open"; lets onLoggedIn's bootstrap flow
  priv.pendingCreds = {
    handle: 'cday',
    password: 'sesame',
    isGuest: false,
    ...credOverrides,
  };

  const internal = () =>
    chat.filter(e => e.type === ChatEventType.INTERNAL).map(e => e.message);

  return {
    connector,
    feed: (raw: string) => priv.handleRaw(raw),
    sent,
    internal,
    stage: () => priv.loginStage,
    setStage: (s: string) => {
      priv.loginStage = s;
    },
  };
}

describe('registered login', () => {
  it('answers the prompts but is only authed by "Starting FICS session"', () => {
    const s = makeLoginSession();

    s.feed(LOGIN_PROMPT);
    expect(s.sent).toEqual(['cday']);
    expect(s.stage()).toBe('sent-handle');

    s.feed(PASSWORD_PROMPT);
    expect(s.sent).toEqual(['cday', 'sesame']);
    // The old code went 'authed' here and blasted bootstrap into a login
    // that might still fail. Now nothing more is sent until FICS confirms.
    expect(s.stage()).toBe('sent-password');
    expect(s.sent).toHaveLength(2);

    s.feed(SESSION_START('cday'));
    expect(s.stage()).toBe('authed');
    expect(s.internal()).toContain('Logged in as cday');
    // Bootstrap runs exactly once, after confirmation, iset lock last.
    expect(s.sent).toContain('set style 12');
    expect(s.sent[s.sent.length - 1]).toBe('iset lock 1');
  });

  it('surfaces the kicked-them-out notice and continues to authed', () => {
    const s = makeLoginSession();
    s.feed(LOGIN_PROMPT);
    s.feed(PASSWORD_PROMPT);
    // Verdict and session start arrive in one chunk, as the server sends it.
    s.feed(KICKED_THEM('cday') + SESSION_START('cday'));
    expect(s.stage()).toBe('authed');
    expect(
      s.internal().some(m => m.includes('kicked an existing session')),
    ).toBe(true);
  });

  it('treats Invalid password as terminal — no automatic retry loop', () => {
    const s = makeLoginSession();
    s.feed(LOGIN_PROMPT);
    s.feed(PASSWORD_PROMPT);
    const sentBefore = s.sent.length;

    s.feed(INVALID_PASSWORD); // includes the fresh login: prompt
    expect(s.stage()).toBe('failed');
    expect(s.internal().some(m => m.includes('rejected the password'))).toBe(
      true,
    );
    // The fresh login: prompt in the same chunk must NOT re-trigger the
    // handle send — that would resend the same wrong password forever.
    s.feed(LOGIN_PROMPT);
    expect(s.sent).toHaveLength(sentBefore);
  });
});

describe('guest login', () => {
  it('confirms with an empty line and waits for session start', () => {
    const s = makeLoginSession({ handle: '', isGuest: true });
    s.feed(LOGIN_PROMPT);
    expect(s.sent).toEqual(['guest']);
    s.feed(GUEST_CONFIRM('GuestXYZW'));
    expect(s.sent).toEqual(['guest', '']);
    expect(s.stage()).toBe('sent-password');
    s.feed(SESSION_START('GuestXYZW'));
    expect(s.stage()).toBe('authed');
    expect(s.internal()).toContain('Logged in as GuestXYZW');
  });

  it('surfaces the refusal when the guest name is taken', () => {
    const s = makeLoginSession({ handle: 'RaptorKickTst', isGuest: true });
    s.feed(LOGIN_PROMPT);
    s.feed(GUEST_CONFIRM('RaptorKickTst'));
    s.feed(GUEST_REFUSED('RaptorKickTst'));
    expect(s.stage()).toBe('failed');
    expect(s.internal().some(m => m.includes('refused this login'))).toBe(
      true,
    );
  });
});

describe('kicked mid-session', () => {
  it("surfaces FICS's farewell when a newer login takes the account", () => {
    const s = makeLoginSession();
    s.feed(LOGIN_PROMPT);
    s.feed(PASSWORD_PROMPT);
    s.feed(SESSION_START('cday'));
    expect(s.stage()).toBe('authed');

    s.feed(KICKED_US('cday'));
    expect(
      s.internal().some(m => m.includes('taken over the session')),
    ).toBe(true);
    // Stage stays authed — the server closes the socket next, and onclose
    // owns the reset. Nothing here may re-enter the login machine.
    expect(s.stage()).toBe('authed');
  });
});

describe('configurable login script (2026-08-12)', () => {
  it('a custom script replaces the bootstrap, blank lines skipped', () => {
    const chatService = new ChatService();
    const gameService = new GameService();
    const parser = new FicsParser({
      chatParsers: defaultChatParsers(),
      gameLineParsers: defaultGameLineParsers(),
      chunkParsers: defaultChunkParsers(),
      gameService,
    });
    const connector = new FicsConnector({
      chatService,
      gameService,
      parser,
      loginScript: () => ['set style 12', '', '  ', '+channel 39'],
    });
    const priv = connector as unknown as {
      pendingCreds: LoginCredentials | null;
      connected: boolean;
      sendRawString(line: string): void;
      handleRaw(raw: string): void;
    };
    const sent: string[] = [];
    priv.sendRawString = line => sent.push(line);
    priv.connected = true;
    priv.pendingCreds = { handle: 'cday', password: 'x', isGuest: false };
    priv.handleRaw('\n\rlogin: ');
    priv.handleRaw('\n\rpassword: ');
    priv.handleRaw('\n\r**** Starting FICS session as cday ****\n\r');
    expect(sent.slice(2)).toEqual(['set style 12', '+channel 39']);
  });
});

describe('outbound Maciejg (2026-08-12)', () => {
  it('prepareOutbound encodes unicode and strips the trailing newline', async () => {
    const { prepareOutbound } = await import('../FicsConnector.js');
    expect(prepareOutbound('tell raptortest ㄒ乇\n')).toBe(
      'tell raptortest &#x3112;&#x4E47;',
    );
    expect(prepareOutbound('who')).toBe('who');
  });
});

/**
 * The `=censor` bug of 2026-08-13: the first login prompt bounced with
 * "Sorry, names can only consist of lower and upper case letters" and
 * the second accepted the handle. Nothing sent the handle twice —
 * ChatWindow's censor seeding fired `=censor` on mount, the chat window
 * mounts mid-handshake, and sendMessageHidden gated on `connected`,
 * which is true from WebSocket OPEN rather than from auth. FICS's login
 * reader ate the `=` and the real handle landed on the second prompt.
 *
 * The rule now lives in the connector: humans may talk to the login
 * prompt, robots wait for auth.
 */
describe('hidden sends during login', () => {
  it('a hidden send never reaches the login buffer', () => {
    const s = makeLoginSession();

    s.feed(LOGIN_PROMPT);
    expect(s.sent).toEqual(['cday']);

    // ChatWindow mounting mid-handshake. It must not land here.
    expect(s.connector.sendMessageHidden('=censor')).toBe(true);
    expect(s.sent).toEqual(['cday']);

    s.feed(PASSWORD_PROMPT);
    expect(s.sent).toEqual(['cday', 'sesame']);
  });

  it('flushes after the login script, in order', () => {
    const s = makeLoginSession();
    s.feed(LOGIN_PROMPT);
    s.connector.sendMessageHidden('=censor');
    s.connector.sendMessageHidden('=noplay');
    s.feed(PASSWORD_PROMPT);
    s.feed(SESSION_START('cday'));

    // Everything the bootstrap script sent comes first; the parked
    // commands follow, in the order they were asked for. `iset lock 1`
    // seals interface settings, so nothing queued may precede it.
    const tail = s.sent.slice(-2);
    expect(tail).toEqual(['=censor', '=noplay']);
    const lock = s.sent.indexOf('iset lock 1');
    if (lock !== -1) {
      expect(s.sent.indexOf('=censor')).toBeGreaterThan(lock);
    }
  });

  it('a user-typed line still reaches the login prompt raw', () => {
    // Logging in by hand is documented FICS behaviour and must survive:
    // sendMessage is deliberately not queued.
    const s = makeLoginSession();
    s.feed(LOGIN_PROMPT);
    s.connector.sendMessage('guest');
    expect(s.sent).toContain('guest');
  });

  it('drops the queue when the login never completes', () => {
    // Otherwise a command parked during a failed attempt fires into
    // whatever session comes next.
    const s = makeLoginSession();
    s.feed(LOGIN_PROMPT);
    s.connector.sendMessageHidden('=censor');
    s.connector.disconnect();

    const after = s.sent.length;
    s.setStage('authed');
    s.connector.sendMessageHidden('ping');
    // disconnect() also drops `connected`, so nothing more can go out.
    expect(s.sent.length).toBe(after);
  });
});
