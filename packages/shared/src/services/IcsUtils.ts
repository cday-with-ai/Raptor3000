/**
 * Outbound-message helpers, at behavioral parity with Raptor's IcsUtils.java
 * (see /tmp/raptor/raptor/src/raptor/connector/ics/IcsUtils.java) and
 * IcsConnector.breakUpMessage (/tmp/raptor/raptor/src/raptor/connector/ics/IcsConnector.java).
 */

/**
 * Strip FICS title markers like (GM), (IM), (*), (TD), (C), (U), (SR),
 * (D1)-(D9), (WIM), (WGM), (FM), (NM), (CA), (H), (B), (TM) from a handle.
 * Parity with Raptor's IcsUtils.stripTitles.
 *
 * We use a regex that matches `(` followed by `*` or 1–3 uppercase letters
 * optionally followed by 1-2 digits, closing `)`. Covers every FICS title.
 */
export function stripTitles(handle: string): string {
  return handle.replace(/\(\*\)|\([A-Z]{1,3}[0-9]{0,2}\)/g, '').trim();
}

/**
 * Java-style startsWith-at-offset. Many Raptor parsers use
 * `str.startsWith(X) || str.startsWith(X, 1)` to tolerate a single leading
 * whitespace char from the server. Replicate that exactly.
 */
export function startsWithOrOffset1(text: string, prefix: string): boolean {
  return text.startsWith(prefix) || (text.length > 1 && text.startsWith(prefix, 1));
}

/** Java-style startsWith at a specific offset. */
export function startsWithAt(text: string, prefix: string, offset: number): boolean {
  if (offset < 0 || offset + prefix.length > text.length) return false;
  return text.substring(offset, offset + prefix.length) === prefix;
}

/** Raptor: MAX_SEND_MESSAGE_LENGTH */
export const MAX_SEND_MESSAGE_LENGTH = 400;

/** Raptor: MAX_MESSAGE_MESSAGE_LENGTH (first word = message/mess/mes) */
export const MAX_MESSAGE_MESSAGE_LENGTH = 800;

/**
 * Maciejg encoding. FICS rejects bytes > 255 with cryptic errors; the
 * community-standard workaround is to encode them as `&#xHHHH;` so the
 * receiving client can decode them on display.
 *
 * Mirrors IcsUtils.filterOutbound. We also strip NUL + control chars that
 * the socket would reject.
 */
export function filterOutbound(msg: string): string {
  let out = '';
  for (const ch of msg) {
    const cp = ch.codePointAt(0)!;
    if ((cp < 0x20 && cp !== 0x09 && cp !== 0x0a && cp !== 0x0d) || cp === 0x7f) {
      continue; // strip control chars (keep tab / LF / CR)
    }
    if (cp > 0xff) {
      out += '&#x' + cp.toString(16).toUpperCase() + ';';
    } else {
      out += ch;
    }
  }
  return out;
}

/**
 * Decode Maciejg-encoded incoming text back to unicode.
 * Symmetric to filterOutbound.
 */
export function decodeMaciej(msg: string): string {
  return msg.replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => {
    const cp = parseInt(hex, 16);
    try {
      return String.fromCodePoint(cp);
    } catch {
      return '';
    }
  });
}

/**
 * Return the "first word" of a message for the per-command length-limit
 * lookup. Raptor uses indexOf(' ') not regex, so empty / single-word
 * messages return the whole string.
 */
function firstWord(msg: string): string {
  const sp = msg.indexOf(' ');
  return sp < 0 ? msg : msg.substring(0, sp);
}

/**
 * Determine the length limit for this message. `message|mess|mes <user> ...`
 * gets the longer 800-char limit because FICS mail lines are wider.
 */
export function limitForMessage(msg: string): number {
  const w = firstWord(msg).toLowerCase();
  if (w === 'message' || w === 'mess' || w === 'mes') {
    return MAX_MESSAGE_MESSAGE_LENGTH;
  }
  return MAX_SEND_MESSAGE_LENGTH;
}

/**
 * Word-wrap that mirrors Apache commons WordUtils.wrap behavior:
 * break on spaces when possible, hard-break only when a single token
 * exceeds the limit.
 */
function wordWrap(text: string, limit: number): string[] {
  if (text.length <= limit) return [text];
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (text.length - i <= limit) {
      chunks.push(text.substring(i));
      break;
    }
    // Look for last space within limit window
    let end = i + limit;
    let brk = text.lastIndexOf(' ', end - 1);
    if (brk <= i) {
      // No space in window → hard-break
      brk = end;
    }
    chunks.push(text.substring(i, brk).trimEnd());
    i = brk;
    // Skip leading space on next chunk
    while (i < text.length && text.charAt(i) === ' ') i++;
  }
  return chunks;
}

/**
 * Break a long outbound message into multiple sendable chunks.
 *
 * Follows Raptor's IcsConnector.breakUpMessage (L361-408):
 *   - If under limit, return [msg].
 *   - Otherwise, extract the first-two-word prefix (e.g. "tell 50 ") and
 *     prepend it to every continuation chunk so each chunk is a valid
 *     command.
 *   - Pathological case: no spaces at all in a long message — truncate
 *     and emit a warning.
 *
 * Returns a {chunks, warning?} tuple.
 */
export function breakUpMessage(msg: string): {
  chunks: string[];
  warning?: string;
} {
  const limit = limitForMessage(msg);
  if (msg.length <= limit) return { chunks: [msg] };

  // Extract first-two-word prefix. Raptor does this specifically for the
  // "tell <target>" style — continuation lines need the same prefix to be
  // valid tells.
  const firstSp = msg.indexOf(' ');
  if (firstSp < 0) {
    return {
      chunks: [msg.substring(0, limit)],
      warning: 'Message had no spaces and was too long; truncated.',
    };
  }
  const secondSp = msg.indexOf(' ', firstSp + 1);
  // No second word → also degenerate.
  if (secondSp < 0) {
    return {
      chunks: [msg.substring(0, limit)],
      warning: 'Message had only one word before the body and was too long; truncated.',
    };
  }
  const prefix = msg.substring(0, secondSp + 1); // includes trailing space
  const body = msg.substring(secondSp + 1);

  // Wrap body so that prefix + chunk <= limit.
  const bodyLimit = limit - prefix.length;
  if (bodyLimit <= 0) {
    return {
      chunks: [msg.substring(0, limit)],
      warning: 'Prefix longer than send limit; truncated.',
    };
  }
  const wrapped = wordWrap(body, bodyLimit);
  const chunks: string[] = [];
  // First chunk carries the original prefix naturally; subsequent chunks get
  // it re-prepended.
  chunks.push(prefix + wrapped[0]);
  for (let i = 1; i < wrapped.length; i++) chunks.push(prefix + wrapped[i]);
  return { chunks };
}
