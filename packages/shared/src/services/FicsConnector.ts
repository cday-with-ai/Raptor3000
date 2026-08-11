import type { ChatService } from './ChatService.js';
import type { GameService } from './GameService.js';
import type { FicsParser } from '../parsers/FicsParser.js';
import { ChatEventType } from '../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../events/ChatEvent.js';
import { BaseConnector, type Connector } from './Connector.js';

/**
 * Timeseal2 + WebSocket connector for FICS. Ported from
 * Simple-FICS-Interface (cday-with-ai/Simple-FICS-Interface, BSD).
 *
 * Connects to `wss://www.freechess.org:5001`, performs the Timeseal2
 * handshake, and feeds cleaned lines through `FicsParser.parseStream()`
 * — which in turn fans events out to `ChatService` and `GameService`.
 *
 * Login state machine:
 *   1. WebSocket `open` → send timeseal connect string.
 *   2. Server prompts `login:` → send username (or "guest").
 *   3. If guest: server asks `Press return to enter the server as "<name>":`
 *      → send empty line.
 *   4. If registered: server prompts `password:` → send password.
 *   5. Server sends session-start banner → we fire SESSION_STARTED.
 */

export interface FicsConnectorOptions {
  chatService: ChatService;
  gameService: GameService;
  parser: FicsParser;
  /** Typically `"freechess.org"`. */
  host?: string;
  /** Default 5001 (FICS's WebSocket port). */
  port?: number;
  /** Default true — use TLS. */
  secure?: boolean;
  /** Short identifier sent in the timeseal connect line. */
  clientIdentifier?: string;
}

export interface LoginCredentials {
  handle: string;
  password: string;
  isGuest: boolean;
}

const TIMESEAL_KEY = 'Timestamp (FICS) v1.0 - programmed by Henrik Gram.';

export class FicsConnector extends BaseConnector implements Connector {
  private ws: WebSocket | null = null;
  private connected = false;
  private pendingCreds: LoginCredentials | null = null;
  private loginStage: 'pre' | 'sent-handle' | 'guest-confirm' | 'authed' =
    'pre';
  private readonly options: Required<Omit<FicsConnectorOptions, 'gameService' | 'parser'>> &
    Pick<FicsConnectorOptions, 'gameService' | 'parser'>;

  constructor(options: FicsConnectorOptions) {
    super({
      chatService: options.chatService,
      sendRaw: () => {
        // Overridden via `sendRaw` below once WebSocket is live.
      },
    });
    this.options = {
      chatService: options.chatService,
      gameService: options.gameService,
      parser: options.parser,
      host: options.host ?? 'www.freechess.org',
      port: options.port ?? 5001,
      secure: options.secure ?? true,
      clientIdentifier: options.clientIdentifier ?? 'raptor3000',
    };
  }

  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Connect to FICS and log in with the given creds. Chainable listeners
   * on `chatService` / `gameService` produce the UI updates.
   */
  connect(creds: LoginCredentials): void {
    if (this.ws) {
      console.log('[FicsConnector] connect() ignored — already connected');
      return;
    }
    this.pendingCreds = creds;
    this.loginStage = 'pre';

    const scheme = this.options.secure ? 'wss' : 'ws';
    const url = `${scheme}://${this.options.host}:${this.options.port}`;
    console.log(`[FicsConnector] connecting to ${url}`);
    this.publishInternal(`Connecting to ${url}…`);

    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      console.log('[FicsConnector] WebSocket onopen');
      // Timeseal2 opener: `TIMESEAL2|openseal|<id>|` — must be encoded.
      const opener = `TIMESEAL2|openseal|${this.options.clientIdentifier}|`;
      ws.send(encodeTimeseal(opener));
      this.connected = true;
      this.publishInternal('WebSocket connected; handshaking…');
    };

    ws.onmessage = async ev => {
      const raw = await readAsString(ev.data);
      this.handleRaw(raw);
    };

    ws.onclose = ev => {
      console.log(`[FicsConnector] WebSocket onclose: code=${ev.code} reason=${ev.reason}`);
      this.connected = false;
      this.ws = null;
      this.loginStage = 'pre';
      this.pendingCreds = null;
      this.publishInternal(
        `WebSocket closed${ev.reason ? `: ${ev.reason}` : ''}`,
      );
    };

    ws.onerror = err => {
      console.log('[FicsConnector] WebSocket onerror', err);
      this.publishInternal('WebSocket error');
    };
  }

  disconnect(): void {
    try {
      this.sendRawString('quit');
    } catch {
      // socket may already be gone
    }
    this.ws?.close(1000, 'User requested disconnect');
    this.ws = null;
    this.connected = false;
    this.loginStage = 'pre';
    this.pendingCreds = null;
  }

  /**
   * Send a command string. Timeseal2 encoding appends its own line
   * terminator — so the plaintext MUST NOT include a trailing `\n` or
   * FICS will see two lines (one of them empty), which rejects the
   * username at login.
   */
  protected sendRawString(line: string): void {
    if (!this.ws) return;
    const plain = line.endsWith('\n') ? line.slice(0, -1) : line;
    this.ws.send(encodeTimeseal(plain));
  }

  override sendMessage(msg: string): boolean {
    if (!this.connected) return false;
    this.options.chatService.publish(
      makeChatEvent(ChatEventType.OUTBOUND, msg, { message: msg.trim() }),
    );
    this.sendRawString(msg);
    return true;
  }

  override sendMessageHidden(msg: string): boolean {
    if (!this.connected) return false;
    this.sendRawString(msg);
    return true;
  }

  private handleRaw(raw: string): void {
    // Strip timeseal `[G]\0` acks and reply for each.
    const { cleaned, ackCount } = stripTimesealAcks(raw);
    for (let i = 0; i < ackCount; i++) {
      this.ws?.send(encodeTimeseal(String.fromCharCode(2) + '9'));
    }
    if (cleaned.length === 0) return;

    const normalized = cleaned
      .replace(/\n\r/g, '\n')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');

    // Login-stage detection before handing bytes to FicsParser.
    if (this.loginStage !== 'authed') {
      this.checkLoginProgress(normalized);
    }

    // Parse and dispatch.
    const events = this.options.parser.parseStream(normalized);
    for (const e of events) this.publishEvent(e);
  }

  /**
   * Publish a parsed event, except that setting-rejection lines are surfaced
   * as INTERNAL errors instead of scrolling by as ordinary server text.
   *
   * Both 2026-07-26 login bugs (`iset lock 1` ordered too early, `set height
   * 1000` out of range) were reported by FICS in plain English during
   * bootstrap — `Cannot alter: Interface setting locked.` and `Bad value
   * given for variable height` — and filed as ordinary chat, where nothing
   * noticed them for three months. These two shapes are errors whenever they
   * occur, and FICS gives no end-of-bootstrap signal to scope a watch window
   * to, so they are intercepted for the whole session. Only UNKNOWN events
   * are inspected: a tell or shout quoting the phrase has already been
   * claimed by its own parser and passes through untouched.
   */
  private publishEvent(e: ChatEvent): void {
    if (e.type === ChatEventType.UNKNOWN) {
      const { rejections, remainder } = splitSettingRejections(
        e.raw,
        this.options.parser.prompt,
      );
      if (rejections.length > 0) {
        for (const line of rejections) {
          this.publishInternal(`FICS rejected a setting: ${line}`);
        }
        if (remainder.trim().length > 0) {
          this.options.chatService.publish(
            makeChatEvent(ChatEventType.UNKNOWN, remainder, {
              message: remainder,
            }),
          );
        }
        return;
      }
    }
    this.options.chatService.publish(e);
  }

  private checkLoginProgress(text: string): void {
    if (!this.pendingCreds) return;
    const creds = this.pendingCreds;

    // Stage 1: server has sent login banner, asks for handle.
    if (this.loginStage === 'pre' && /login:\s*$/m.test(text)) {
      const handle = creds.isGuest && creds.handle === '' ? 'guest' : creds.handle || 'guest';
      this.sendRawString(handle);
      this.loginStage = creds.isGuest ? 'guest-confirm' : 'sent-handle';
      return;
    }

    // Stage 2a (guest): "Press return to enter the server as ..."
    if (
      this.loginStage === 'guest-confirm' &&
      /Press return to enter the server/.test(text)
    ) {
      this.sendRawString('');
      this.loginStage = 'authed';
      this.publishInternal('Logged in as guest');
      this.onLoggedIn();
      return;
    }

    // Stage 2b (registered): "password:"
    if (this.loginStage === 'sent-handle' && /password:\s*$/m.test(text)) {
      this.sendRawString(creds.password);
      this.loginStage = 'authed';
      this.publishInternal(`Logged in as ${creds.handle}`);
      this.onLoggedIn();
      return;
    }

    // Registered-prompt-for-guest shortcut: if server offers "login as a
    // guest?" and we're opting in, just answer with a handle or "guest".
    if (
      this.loginStage === 'sent-handle' &&
      /login as a guest/i.test(text) &&
      creds.isGuest
    ) {
      this.sendRawString('');
      this.loginStage = 'authed';
      this.publishInternal('Logged in as guest');
      this.onLoggedIn();
    }
  }

  private onLoggedIn(): void {
    // Sensible defaults on login. Disable interactive pagination / bell so
    // the stream is clean, and enable style 12 + ivariables we rely on.
    //
    // ORDER MATTERS. `iset lock 1` freezes interface variables, so anything
    // after it is refused — it must be last. It used to sit third, and the
    // server answered with exactly four `Cannot alter: Interface setting
    // locked.` lines for startpos, pendinfo, gameinfo and nohighlight. Nothing
    // in the client noticed: the errors arrive as ordinary server text, the
    // connection stays up, and style 12 still works. What silently goes missing
    // is the context around it — `gameinfo` carries the metadata sent when a
    // game starts, `startpos` the initial position for non-standard games.
    // A board that renders but is missing its game information looks like a
    // board bug and is a login-ordering bug.
    const bootstrap = [
      'iset defprompt 1',
      'iset ms 1',
      'iset startpos 1',
      'iset pendinfo 1',
      'iset gameinfo 1',
      'iset nohighlight 1',
      'iset seekinfo 1',
      'set interface raptor3000',
      'set style 12',
      'set bell 0',
      'set echo 0',
      'set ptime 0',
      'set width 240',
      // FICS rejected `set height 1000` outright ("Bad value given for variable
      // height"). Matching width is known-good in at least one direction; if the
      // log shows this rejected too, the range is tighter than 240.
      'set height 240',
      // Last, deliberately. Everything above is already applied by the time the
      // interface is sealed against further change.
      'iset lock 1',
    ];
    for (const cmd of bootstrap) this.sendMessageHidden(cmd);
  }

  private publishInternal(message: string): void {
    const e: ChatEvent = makeChatEvent(ChatEventType.INTERNAL, message, {
      message,
    });
    this.options.chatService.publish(e);
  }
}

/** FICS responses that mean a `set`/`iset` command was refused. Matched at
 *  line start, after any buffered `fics% ` prompt is stripped. */
const SETTING_REJECTION_PATTERNS = [
  /^Cannot alter:/,
  /^Bad value given for variable/,
] as const;

/**
 * Split a chunk of server text into setting-rejection lines and everything
 * else. `remainder` preserves the chunk verbatim when nothing matched.
 */
export function splitSettingRejections(
  chunk: string,
  prompt = 'fics% ',
): { rejections: string[]; remainder: string } {
  const rejections: string[] = [];
  const kept: string[] = [];
  for (const line of chunk.split('\n')) {
    const bare = line.startsWith(prompt) ? line.slice(prompt.length) : line;
    if (SETTING_REJECTION_PATTERNS.some(p => p.test(bare))) {
      rejections.push(bare);
    } else {
      kept.push(line);
    }
  }
  return {
    rejections,
    remainder: rejections.length > 0 ? kept.join('\n') : chunk,
  };
}

// ---------- Timeseal2 bits (port of SFI/Raptor implementation) ----------

// Returns an ArrayBuffer-backed view specifically (not the ArrayBufferLike
// default the bare `Uint8Array` now widens to under TS 7's lib): the buffer is
// always a plain ArrayBuffer here, and WebSocket.send rejects the SharedArrayBuffer
// possibility that ArrayBufferLike admits.
export function encodeTimeseal(message: string): Uint8Array<ArrayBuffer> {
  let t = message.length;
  const n = new Uint8Array(t + 30);
  for (let i = 0; i < message.length; i++) n[i] = message.charCodeAt(i);
  n[t++] = 24;

  const now = Date.now();
  const seconds = Math.floor(now / 1000);
  const ts = ((seconds % 10000) * 1000 + (now - 1000 * seconds)).toString();
  for (let i = 0; i < ts.length; i++) n[t + i] = ts.charCodeAt(i);
  t += ts.length;
  n[t++] = 25;

  while (t % 12 !== 0) n[t++] = 49;

  for (let i = 0; i < t; i += 12) {
    n[i] ^= n[i + 11]; n[i + 11] ^= n[i]; n[i] ^= n[i + 11];
    n[i + 2] ^= n[i + 9]; n[i + 9] ^= n[i + 2]; n[i + 2] ^= n[i + 9];
    n[i + 4] ^= n[i + 7]; n[i + 7] ^= n[i + 4]; n[i + 4] ^= n[i + 7];
  }

  for (let i = 0; i < t; i++) {
    const keyChar = TIMESEAL_KEY.charCodeAt(i % TIMESEAL_KEY.length);
    n[i] = ((128 | n[i]) ^ keyChar) - 32;
  }
  n[t++] = 128;
  n[t++] = 10;

  return n.slice(0, t);
}

export function stripTimesealAcks(msg: string): {
  cleaned: string;
  ackCount: number;
} {
  const pattern = '[G]\u0000';
  let cleaned = msg;
  let count = 0;
  let idx = cleaned.indexOf(pattern);
  while (idx !== -1) {
    count++;
    cleaned = cleaned.substring(0, idx) + cleaned.substring(idx + pattern.length);
    idx = cleaned.indexOf(pattern);
  }
  return { cleaned, ackCount: count };
}

async function readAsString(data: ArrayBuffer | Blob | string): Promise<string> {
  if (typeof data === 'string') return data;
  if (data instanceof ArrayBuffer) {
    return new TextDecoder().decode(data);
  }
  return await data.text();
}
