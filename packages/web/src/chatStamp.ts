import type { ChatEvent } from '@raptor3000/shared';

/**
 * Timeline stamps for one tab's event stream, in order (Carson,
 * 2026-08-18). Only tabs that hold backfill get stamps — live-only
 * traffic stays bare, as before. Once a tab has backfill, the stamp
 * chain runs on into the live tells that follow it: the minute is
 * stated once even when several tells share it, and the weekday only
 * when the day actually changes (Mon -> Tue).
 */

/** When the chat window opened — events older than this are backfill. */
export const WINDOW_OPENED = Date.now();

/** Events within this of the window opening count as live, not backfill. */
const BACKFILL_GRACE_MS = 5_000;

export function timelineStamps(
  events: readonly ChatEvent[],
  now: number = WINDOW_OPENED,
): string[] {
  const stamps = events.map(() => '');
  const hasBackfill = events.some(e => e.time < now - BACKFILL_GRACE_MS);
  if (!hasBackfill) return stamps;
  let lastStampKey: string | null = null;
  let lastStampDay: string | null = null;
  for (let i = 0; i < events.length; i++) {
    const d = new Date(events[i].time);
    const dayKey = d.toDateString();
    const hhmm = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const key = `${dayKey} ${hhmm}`;
    if (key === lastStampKey) continue;
    const dayChanged =
      lastStampDay === null
        ? new Date(now).toDateString() !== dayKey
        : lastStampDay !== dayKey;
    const day = d.toLocaleDateString(undefined, { weekday: 'short' });
    stamps[i] = dayChanged ? `[${day} ${hhmm}] ` : `[${hhmm}] `;
    lastStampKey = key;
    lastStampDay = dayKey;
  }
  return stamps;
}