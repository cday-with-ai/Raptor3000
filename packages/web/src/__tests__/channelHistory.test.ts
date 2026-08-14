import { describe, it, expect } from 'vitest';
import { ChatEventType, type ChatEvent } from '@raptor3000/shared';
import {
  MAX_HISTORY_ROWS,
  mergeHistory,
  parseChannels,
  rowToEvent,
  toTimeline,
  type ChannelTellRow,
} from '../channelHistory.js';

/**
 * Chat backfill from the chessascent channel logger (2026-08-12).
 *
 * The API stores the full FICS line ("user(39): content") with an epoch
 * timestamp, newest first, 24h TTL. These tests pin the conversion to
 * live-parser-shaped events, the ordering/cap, the live-overlap dedupe,
 * and the separator that marks where history ends.
 */

const row = (
  username: string,
  content: string,
  timestamp: number,
  channel = 39,
): ChannelTellRow => ({
  channel,
  username,
  message: `${username}(${channel}): ${content}`,
  timestamp,
});

describe('rowToEvent', () => {
  it('produces the shape the live ChannelTellEventParser produces', () => {
    const e = rowToEvent(row('blore', 'fk off', 1786553653155));
    expect(e.type).toBe(ChatEventType.CHANNEL_TELL);
    expect(e.source).toBe('blore');
    expect(e.channel).toBe('39');
    expect(e.message).toBe('fk off');
    expect(e.raw).toBe('blore(39): fk off');
    expect(e.time).toBe(1786553653155); // original time, not receipt time
  });

  it('strips only the envelope, not envelope-looking content', () => {
    const e = rowToEvent(row('krell', 'see foo(39): bar for details', 5));
    expect(e.message).toBe('see foo(39): bar for details');
  });
});

describe('toTimeline', () => {
  it('reverses newest-first API order into oldest-first', () => {
    const t = toTimeline([row('b', 'second', 200), row('a', 'first', 100)]);
    expect(t.map(e => e.message)).toEqual(['first', 'second']);
  });

  it('caps to the newest MAX_HISTORY_ROWS', () => {
    const rows = Array.from({ length: MAX_HISTORY_ROWS + 50 }, (_, i) =>
      row('u', `m${i}`, 1_000_000 - i), // newest first, like the API
    );
    const t = toTimeline(rows);
    expect(t).toHaveLength(MAX_HISTORY_ROWS);
    // The cap keeps the recent end: the very newest row survives …
    expect(t[t.length - 1].message).toBe('m0');
    // … and what is dropped is the oldest tail.
    expect(t.some(e => e.message === `m${MAX_HISTORY_ROWS + 10}`)).toBe(false);
  });
});

describe('toTimeline near-duplicate collapse', () => {
  // Two logger instances overlapping (2026-08-13→14) stamped every tell
  // twice, 0–130ms apart — the API itself served doubles.
  it('collapses the same sender+text milliseconds apart into one tell', () => {
    const t = toTimeline([
      row('boodroe', 'ai wrote a song', 1786744046593),
      row('boodroe', 'ai wrote a song', 1786744046580),
    ]);
    expect(t).toHaveLength(1);
  });

  it('keeps a genuine repeat said again later', () => {
    const t = toTimeline([
      row('cday', 'hahaha', 1786744100980),
      row('cday', 'hahaha', 1786739252494), // hours earlier
    ]);
    expect(t).toHaveLength(2);
  });

  it('collapses doubles even when another tell lands between them', () => {
    const t = toTimeline([
      row('a', 'doubled line', 1000),
      row('b', 'interleaved', 1040),
      row('a', 'doubled line', 1080),
    ]);
    expect(t.map(e => e.message)).toEqual(['doubled line', 'interleaved']);
  });
});

describe('mergeHistory', () => {
  const hist = toTimeline([row('b', 'later', 200), row('a', 'earlier', 100)]);

  it('prepends history and closes it with a channel-scoped separator', () => {
    const live = [rowToEvent(row('c', 'live line', 300))];
    const merged = mergeHistory(hist, live, '39');
    expect(merged.map(e => e.message)).toEqual([
      'earlier',
      'later',
      expect.stringContaining('end of logged history'),
      'live line',
    ]);
    const sep = merged[2];
    expect(sep.type).toBe(ChatEventType.INTERNAL);
    expect(sep.channel).toBe('39'); // so the channel tab shows it
  });

  it('drops history rows that already arrived live', () => {
    const live = [rowToEvent(row('b', 'later', 250))]; // same sender+text
    const merged = mergeHistory(hist, live, '39');
    expect(merged.filter(e => e.message === 'later')).toHaveLength(1);
  });

  it('adds nothing when everything overlapped', () => {
    const live = hist.map(e => ({ ...e })) as ChatEvent[];
    const merged = mergeHistory(hist, live, '39');
    expect(merged).toHaveLength(live.length); // no separator either
  });
});

describe('parseChannels', () => {
  it('pulls numbers out of the auto-join preference, deduped', () => {
    expect(parseChannels('39, 4,53 39')).toEqual(['39', '4', '53']);
    expect(parseChannels('')).toEqual([]);
    expect(parseChannels('none')).toEqual([]);
  });
});
