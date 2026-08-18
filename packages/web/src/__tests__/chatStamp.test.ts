import { describe, it, expect } from 'vitest';
import { ChatEventType, type ChatEvent } from '@raptor3000/shared';
import { timelineStamps } from '../chatStamp.js';

/**
 * Timeline stamps for backfilled chat (2026-08-18, Carson): state the
 * minute once even when several tells share it, and the weekday only
 * when the day changes (Mon -> Tue). Once a tab holds backfill, the
 * stamp chain runs on into the live tells that follow it.
 */

const ev = (time: number, message = 'hi'): ChatEvent => ({
  type: ChatEventType.CHANNEL_TELL,
  raw: '',
  time,
  source: 'someone',
  channel: '39',
  gameId: null,
  message,
  pingMs: null,
});

// The walk is relative to the window-open moment; every test pins `now`.
// Local-time constructors so the hour/minute assertions hold in any TZ.
const NOW = new Date(2026, 7, 18, 12, 0, 0).getTime(); // Tue 2026-08-18 12:00
const m = (minute: number, hour = 8) =>
  new Date(2026, 7, 18, hour, minute, 0).getTime();
const day = (d: number, hour = 8, minute = 0) =>
  new Date(2026, 7, d, hour, minute, 0).getTime();

// The same toLocaleDateString call the stamp uses, so tests do not
// depend on the machine's locale for weekday names.
const wd = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { weekday: 'short' });

describe('timelineStamps', () => {
  it('leaves a stream with no backfill unstamped', () => {
    const events = [ev(NOW - 1_000), ev(NOW - 500), ev(NOW)];
    expect(timelineStamps(events, NOW)).toEqual(['', '', '']);
  });

  it('states the minute once across tells that share it', () => {
    const events = [ev(m(14)), ev(m(14) + 30_000), ev(m(15)), ev(m(15) + 10_000)];
    expect(timelineStamps(events, NOW)).toEqual(['[08:14] ', '', '[08:15] ', '']);
  });

  it('shows the weekday on the first stamp when the day differs from now', () => {
    const events = [ev(day(17, 23)), ev(day(17, 23) + 30_000), ev(day(17, 23, 55))];
    expect(timelineStamps(events, NOW)).toEqual([
      `[${wd(day(17))} 23:00] `,
      '',
      '[23:55] ',
    ]);
  });

  it('shows the weekday only at the day change, not on every stamp', () => {
    const events = [ev(day(17, 23)), ev(day(17, 23, 55)), ev(day(18, 8))];
    expect(timelineStamps(events, NOW)).toEqual([
      `[${wd(day(17))} 23:00] `,
      '[23:55] ',
      `[${wd(day(18))} 08:00] `,
    ]);
  });

  it('does not re-state the day for later same-day minutes', () => {
    const events = [
      ev(day(17, 23)),
      ev(day(17, 23, 59)),
      ev(day(18, 8)),
      ev(day(18, 9)),
    ];
    expect(timelineStamps(events, NOW)).toEqual([
      `[${wd(day(17))} 23:00] `,
      '[23:59] ',
      `[${wd(day(18))} 08:00] `,
      '[09:00] ',
    ]);
  });

  it('stamps a new minute even when the clock shows the same hh:mm on another day', () => {
    // Mon 23:59 and Tue 23:59 share "23:59" but are different days.
    const events = [ev(day(17, 23, 59)), ev(day(18, 23, 59))];
    const stamps = timelineStamps(events, NOW);
    expect(stamps[0]).toBe(`[${wd(day(17))} 23:59] `);
    expect(stamps[1]).toBe(`[${wd(day(18))} 23:59] `);
  });

  it('carries the chain into live tells after backfill', () => {
    const events = [
      ev(m(14)),
      ev(m(14) + 30_000), // same minute — no stamp
      ev(NOW - 60_000), // live tell, new minute — stamped
      ev(NOW - 20_000), // still that minute — no stamp
    ];
    expect(timelineStamps(events, NOW)).toEqual(['[08:14] ', '', '[11:59] ', '']);
  });

  it('handles an empty stream', () => {
    expect(timelineStamps([], NOW)).toEqual([]);
  });
});