import type { ChatService } from './ChatService.js';
import type { GameService } from './GameService.js';
import type { FicsParser } from '../parsers/FicsParser.js';
import { ChatEventType } from '../events/ChatEventType.js';
import { makeChatEvent, type ChatEvent } from '../events/ChatEvent.js';
import { BaseConnector, type Connector } from './Connector.js';
import { filterOutbound } from './IcsUtils.js';

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
 *   5. Server prints `**** Starting FICS session as <name> ****` → authed.
 *      Only that line makes the session authed — never our own optimism
 *      after step 3/4, so a rejected password or refused handle can't
 *      leave the connector believing it logged in.
 *
 * One-session-per-account handling (both directions, 2026-08-12):
 *   - Registered handle already logged in elsewhere → FICS kicks the OLD
 *     session ("kicking them out") and continues this login. Surfaced as
 *     an INTERNAL notice.
 *   - Unregistered handle already logged in → FICS refuses THIS login and
 *     closes the socket. Surfaced, stage becomes 'failed'.
 *   - This session kicked mid-play ("you can't both be logged in") →
 *     surfaced, and the following onclose says kicked, not just closed.
 *   - Invalid password → 'failed' with no automatic retry; the console
 *     stays live so the user can log in by hand.
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
  private loginStage:
    | 'pre'
    | 'sent-handle'
    | 'guest-confirm'
    | 'sent-password'
    | 'failed'
    | 'authed' = 'pre';
  /** Set when FICS announces this session lost the account to a newer
   *  login, so the onclose that follows can say why the socket died. */
  private kicked = false;
  /** The handle FICS started this session as ("Starting FICS session as
   *  X") — guests get their generated GuestXXXX name here. Null before
   *  login completes. */
  private loggedInAs: string | null = null;
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

  /** The handle this session logged in as, or null before login. */
  getLoggedInAs(): string | null {
    return this.loggedInAs;
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
    this.kicked = false;
    this.loggedInAs = null;

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
      const wasKicked = this.kicked;
      const wasMidLogin = this.loginStage !== 'authed' && this.loginStage !== 'failed';
      this.connected = false;
      this.ws = null;
      this.loginStage = 'pre';
      this.pendingCreds = null;
      this.publishInternal(
        wasKicked
          ? 'Connection closed — this session was kicked by a newer login as the same account. Reconnect to take it back.'
          : `WebSocket closed${wasMidLogin ? ' during login' : ''}${ev.reason ? `: ${ev.reason}` : ''}`,
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
    // Maciejg-encode unicode + strip control chars for EVERYTHING that
    // goes out. The overridden sendMessage bypassed BaseConnector's
    // doSend, so `tell x ㄒ乇丂ㄒ` reached FICS raw and bounced with
    // "unprintable characters" (Carson, 2026-08-12). One choke point.
    this.ws.send(encodeTimeseal(filterOutbound(plain)));
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
    } else if (/you can'?t both be logged in/i.test(normalized)) {
      // FICS's farewell to the losing session when the same account logs
      // in elsewhere ("**** cday has arrived - you can't both be logged
      // in. ****"). The server closes the socket right after; flag it so
      // onclose reports a kick instead of a generic close.
      this.kicked = true;
      this.publishInternal(
        'Kicked: a newer login as this account has taken over the session.',
      );
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

    // Verdict lines first, prompt responses after: FICS batches output, so
    // a verdict routinely shares a chunk with the next prompt and must win.

    // FICS kicked a previous session of this account to admit this one
    // ("**** cday is already logged in - kicking them out. ****").
    // Informational — the server continues the login on its own.
    if (/is already logged in.{0,3} kicking them out/i.test(text)) {
      this.publishInternal(
        'FICS kicked an existing session of this account to let this one in.',
      );
    }

    // The login actually completed: FICS names the session it started.
    // This — not our own optimism after sending the password — is what
    // makes the session authed, so a rejected password or a refused guest
    // name can never leave the connector believing it logged in.
    const started = /\*{4} Starting FICS session as (\w+)/.exec(text);
    if (started) {
      this.loginStage = 'authed';
      this.loggedInAs = started[1];
      this.publishInternal(`Logged in as ${started[1]}`);
      this.onLoggedIn();
      return;
    }

    // Password rejected. No automatic retry — resending the same stored
    // password would loop forever. The console stays live, so the user can
    // finish by hand: the server's fresh `login:` prompt is already there.
    if (this.loginStage === 'sent-password' && /Invalid password/i.test(text)) {
      this.loginStage = 'failed';
      this.publishInternal(
        `FICS rejected the password for ${creds.handle}. Fix the profile and reconnect — or type into this console to log in by hand (the login prompt is live).`,
      );
      return;
    }

    // Handle collision, refusal variant: for unregistered handles FICS
    // refuses the NEW connection instead of kicking the old one, then
    // closes the socket. (Observed 2026-08-12: second named-guest login
    // was dropped while the first survived.)
    if (
      this.loginStage !== 'pre' &&
      /is already logged in/i.test(text) &&
      !/kicking them out/i.test(text)
    ) {
      this.loginStage = 'failed';
      this.publishInternal(
        'FICS refused this login: that handle is already logged in, and unregistered handles are not kicked. Close the other session or pick another name.',
      );
      return;
    }

    // Terminal: the user can still type commands through the console, but
    // the automatic state machine is done for this connection.
    if (this.loginStage === 'failed') return;

    // Stage 1: server has sent login banner, asks for handle.
    if (this.loginStage === 'pre' && /login:\s*$/m.test(text)) {
      const handle = creds.isGuest && creds.handle === '' ? 'guest' : creds.handle || 'guest';
      this.sendRawString(handle);
      this.loginStage = creds.isGuest ? 'guest-confirm' : 'sent-handle';
      return;
    }

    // Stage 2a (guest): "Press return to enter the server as ..." — answer,
    // then wait for the session-start line like every other path.
    if (
      this.loginStage === 'guest-confirm' &&
      /Press return to enter the server/.test(text)
    ) {
      this.sendRawString('');
      this.loginStage = 'sent-password';
      return;
    }

    // Stage 2b (registered): "password:" — answer, but authed comes only
    // from the "Starting FICS session" confirmation above.
    if (this.loginStage === 'sent-handle' && /password:\s*$/m.test(text)) {
      this.sendRawString(creds.password);
      this.loginStage = 'sent-password';
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
      this.loginStage = 'sent-password';
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
