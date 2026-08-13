/**
 * Rich-text tokenization for chat event display. Matches Raptor's behavior
 * in ChatConsoleController's text-rendering pass: URLs become clickable
 * links, and double- or single-quoted strings are visually set off (Raptor
 * drew them in italic/bold). The Java side also detects usernames and
 * channel numbers as clickable regions — we provide hooks for that too.
 */

export type RichToken =
  | { kind: 'text'; value: string }
  | { kind: 'url'; value: string }
  | { kind: 'quote'; value: string; quoteChar: '"' | "'" }
  | { kind: 'channel'; value: string }
  | { kind: 'user'; value: string };

// Raptor-style quoted-string detection: matches matched pairs of the same
// quote char, non-greedy, no nesting. We tokenize the input once, left to
// right, to preserve ordering.
//
// Single quotes only count at WORD BOUNDARIES (2026-08-13): the naive
// '[^']+' turned "I'm … doesn't" into an italic span from the apostrophe
// in I'm to the one in doesn't — and ate both apostrophes (Carson's
// screenshot). An apostrophe hugged by word characters is a contraction,
// not a quote.
const COMBINED_RE =
  /\b(?:https?|ftp):\/\/[^\s<>"']+[^\s<>"',.)]|"[^"]+"|(?<!\w)'[^']+'(?!\w)|#\d{1,3}\b/g;

/**
 * Hint set for username-looking tokens. We tokenize names only when the
 * caller supplies a "known sources" list (e.g. from ChatStore) because
 * otherwise every word looks like a username.
 */
export interface TokenizeOptions {
  /** If provided, these lowercased handles are recognized as users. */
  knownUsers?: ReadonlySet<string>;
}

export function tokenize(input: string, opts: TokenizeOptions = {}): RichToken[] {
  const tokens: RichToken[] = [];
  let pos = 0;
  // Phase 1: URLs, quotes, #channel mentions.
  for (const match of input.matchAll(COMBINED_RE)) {
    const start = match.index!;
    if (start > pos) {
      emitTextSegment(input.substring(pos, start), opts, tokens);
    }
    const s = match[0];
    if (s.startsWith('"') || s.startsWith("'")) {
      tokens.push({
        kind: 'quote',
        value: s.substring(1, s.length - 1),
        quoteChar: s.charAt(0) as '"' | "'",
      });
    } else if (s.startsWith('#')) {
      tokens.push({ kind: 'channel', value: s.substring(1) });
    } else {
      tokens.push({ kind: 'url', value: s });
    }
    pos = start + s.length;
  }
  if (pos < input.length) {
    emitTextSegment(input.substring(pos), opts, tokens);
  }
  return tokens;
}

// Given a plain text chunk, emit user mentions where recognizable, else text.
function emitTextSegment(
  text: string,
  opts: TokenizeOptions,
  out: RichToken[],
): void {
  if (!opts.knownUsers || opts.knownUsers.size === 0) {
    out.push({ kind: 'text', value: text });
    return;
  }
  // Walk word boundaries and check each word against the known set.
  const wordRe = /[A-Za-z][A-Za-z0-9]{2,16}/g;
  let i = 0;
  for (const m of text.matchAll(wordRe)) {
    const start = m.index!;
    if (start > i) out.push({ kind: 'text', value: text.substring(i, start) });
    const word = m[0];
    if (opts.knownUsers.has(word.toLowerCase())) {
      out.push({ kind: 'user', value: word });
    } else {
      out.push({ kind: 'text', value: word });
    }
    i = start + word.length;
  }
  if (i < text.length) out.push({ kind: 'text', value: text.substring(i) });
}
