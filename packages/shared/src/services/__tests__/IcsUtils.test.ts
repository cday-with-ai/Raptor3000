import { describe, it, expect } from 'vitest';
import {
  filterOutbound,
  decodeMaciej,
  breakUpMessage,
  limitForMessage,
  MAX_SEND_MESSAGE_LENGTH,
  MAX_MESSAGE_MESSAGE_LENGTH,
} from '../IcsUtils.js';

describe('filterOutbound (Maciej encoding)', () => {
  it('passes ASCII through unchanged', () => {
    expect(filterOutbound('hello world')).toBe('hello world');
  });

  it('passes latin-1 chars unchanged (≤ 255)', () => {
    expect(filterOutbound('café')).toBe('café');
  });

  it('encodes chars > 255 as &#xHEX;', () => {
    // Greek alpha (U+03B1), cyrillic (U+0444), emoji (U+1F600)
    expect(filterOutbound('α')).toBe('&#x3B1;');
    expect(filterOutbound('ф')).toBe('&#x444;');
    expect(filterOutbound('😀')).toBe('&#x1F600;');
  });

  it('round-trips via decodeMaciej', () => {
    const orig = 'hi α β 😀 world';
    expect(decodeMaciej(filterOutbound(orig))).toBe(orig);
  });

  it('strips control chars except tab/CR/LF', () => {
    expect(filterOutbound('a\x00b\x07c\x7fd')).toBe('abcd');
    expect(filterOutbound('a\tb\nc\rd')).toBe('a\tb\nc\rd');
  });
});

describe('limitForMessage', () => {
  it('uses 400 for tells and shouts', () => {
    expect(limitForMessage('tell 50 hi')).toBe(MAX_SEND_MESSAGE_LENGTH);
    expect(limitForMessage('shout anyone?')).toBe(MAX_SEND_MESSAGE_LENGTH);
  });

  it('uses 800 for message/mess/mes', () => {
    expect(limitForMessage('message GMBob hi')).toBe(MAX_MESSAGE_MESSAGE_LENGTH);
    expect(limitForMessage('mess GMBob hi')).toBe(MAX_MESSAGE_MESSAGE_LENGTH);
    expect(limitForMessage('mes GMBob hi')).toBe(MAX_MESSAGE_MESSAGE_LENGTH);
  });
});

describe('breakUpMessage', () => {
  it('returns a single chunk when under limit', () => {
    const r = breakUpMessage('tell 50 short message');
    expect(r.chunks).toHaveLength(1);
    expect(r.warning).toBeUndefined();
  });

  it('splits long tells preserving "tell N " prefix on each chunk', () => {
    const body = 'word '.repeat(120).trim(); // 599 chars
    const msg = 'tell 50 ' + body;
    expect(msg.length).toBeGreaterThan(MAX_SEND_MESSAGE_LENGTH);
    const { chunks, warning } = breakUpMessage(msg);
    expect(warning).toBeUndefined();
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.startsWith('tell 50 ')).toBe(true);
      expect(c.length).toBeLessThanOrEqual(MAX_SEND_MESSAGE_LENGTH);
    }
    // Rejoining the body words should recover the original.
    const recombined = chunks
      .map(c => c.substring('tell 50 '.length))
      .join(' ');
    expect(recombined).toBe(body);
  });

  it('uses 800-char limit for message command', () => {
    const body = 'word '.repeat(180).trim(); // ~899 chars
    const msg = 'message GMBob ' + body;
    const { chunks } = breakUpMessage(msg);
    for (const c of chunks) {
      expect(c.length).toBeLessThanOrEqual(MAX_MESSAGE_MESSAGE_LENGTH);
      expect(c.startsWith('message GMBob ')).toBe(true);
    }
  });

  it('warns and truncates when message has no spaces', () => {
    const msg = 'x'.repeat(500);
    const { chunks, warning } = breakUpMessage(msg);
    expect(warning).toBeDefined();
    expect(chunks).toHaveLength(1);
    expect(chunks[0].length).toBeLessThanOrEqual(MAX_SEND_MESSAGE_LENGTH);
  });

  it('warns when prefix dominates the limit', () => {
    // single-word prefix only
    const msg = 'tell ' + 'x'.repeat(500);
    const { warning } = breakUpMessage(msg);
    expect(warning).toBeDefined();
  });
});

describe('decodeMaciej decimal entities (2026-08-12)', () => {
  it('decodes decimal &#NNNN; alongside the hex form', () => {
    expect(decodeMaciej('now $12&#8230; wow')).toBe('now $12… wow');
    expect(decodeMaciej('&#x263A; and &#9731;')).toBe('☺ and ☃');
  });

  it('leaves malformed or out-of-range entities untouched', () => {
    expect(decodeMaciej('&#0; &#1114112; &#xZZ;')).toBe('&#0; &#1114112; &#xZZ;');
    expect(decodeMaciej('AT&T &# 39;')).toBe('AT&T &# 39;');
  });
});
