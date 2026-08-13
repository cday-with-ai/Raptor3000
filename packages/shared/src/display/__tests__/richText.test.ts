import { describe, it, expect } from 'vitest';
import { tokenize } from '../richText.js';

describe('richText tokenize', () => {
  it('returns plain text as a single text token', () => {
    expect(tokenize('hello world')).toEqual([
      { kind: 'text', value: 'hello world' },
    ]);
  });

  it('extracts an https URL', () => {
    const tokens = tokenize('see https://lichess.org now');
    expect(tokens).toEqual([
      { kind: 'text', value: 'see ' },
      { kind: 'url', value: 'https://lichess.org' },
      { kind: 'text', value: ' now' },
    ]);
  });

  it('does not include trailing punctuation in a URL', () => {
    const tokens = tokenize('check http://example.com.');
    expect(tokens).toEqual([
      { kind: 'text', value: 'check ' },
      { kind: 'url', value: 'http://example.com' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('extracts double-quoted strings', () => {
    const tokens = tokenize('I said "hello there" to them');
    expect(tokens).toEqual([
      { kind: 'text', value: 'I said ' },
      { kind: 'quote', value: 'hello there', quoteChar: '"' },
      { kind: 'text', value: ' to them' },
    ]);
  });

  it('extracts single-quoted strings', () => {
    const tokens = tokenize("he said 'no way' back");
    expect(tokens).toEqual([
      { kind: 'text', value: 'he said ' },
      { kind: 'quote', value: 'no way', quoteChar: "'" },
      { kind: 'text', value: ' back' },
    ]);
  });

  it('extracts #channel mentions', () => {
    const tokens = tokenize('join #50 for chess chat');
    expect(tokens).toEqual([
      { kind: 'text', value: 'join ' },
      { kind: 'channel', value: '50' },
      { kind: 'text', value: ' for chess chat' },
    ]);
  });

  it('handles multiple features in one line', () => {
    const tokens = tokenize(
      'see "this link" https://ex.com or join #50',
    );
    expect(tokens.map(t => t.kind)).toEqual([
      'text', 'quote', 'text', 'url', 'text', 'channel',
    ]);
  });

  it('recognizes known users when given a hint set', () => {
    const tokens = tokenize('GMBob is here with pal', {
      knownUsers: new Set(['gmbob']),
    });
    expect(tokens.find(t => t.kind === 'user')).toEqual({
      kind: 'user',
      value: 'GMBob',
    });
  });
});

describe("contractions are not quotes (2026-08-13, sircmpwn's tell)", () => {
  it('leaves apostrophes inside words alone', () => {
    const line = "I'm getting the impression blore doesn't care for the USA";
    const tokens = tokenize(line);
    expect(tokens).toEqual([{ kind: 'text', value: line }]);
  });

  it('still recognizes a genuinely quoted span', () => {
    const tokens = tokenize("he said 'good game' afterwards");
    expect(tokens).toContainEqual({ kind: 'quote', value: 'good game', quoteChar: "'" });
  });

  it('a possessive before a real quote does not derail it', () => {
    const tokens = tokenize("the players' favorite was 'the fried liver'");
    const quotes = tokens.filter(t => t.kind === 'quote');
    expect(quotes).toEqual([{ kind: 'quote', value: 'the fried liver', quoteChar: "'" }]);
  });

  it('double quotes are unaffected', () => {
    expect(tokenize('say "hello world" now')).toContainEqual({
      kind: 'quote',
      value: 'hello world',
      quoteChar: '"',
    });
  });
});
