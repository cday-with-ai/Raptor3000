import { describe, it, expect } from 'vitest';
import {
  RELAUNCH_KEY,
  armRelaunchToLogin,
  consumeRelaunchToLogin,
} from '../relaunch.js';

/**
 * Options → Session → Relaunch: a page reload with auto-login suppressed
 * for exactly one launch. The one-shot contract is the whole feature —
 * consume twice and auto-login must be back.
 */

function memoryStore() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
  };
}

describe('relaunch-to-login flag', () => {
  it('is consumed exactly once', () => {
    const store = memoryStore();
    armRelaunchToLogin(store);
    expect(store.getItem(RELAUNCH_KEY)).toBe('true');
    expect(consumeRelaunchToLogin(store)).toBe(true);
    expect(consumeRelaunchToLogin(store)).toBe(false);
    expect(store.getItem(RELAUNCH_KEY)).toBeNull();
  });

  it('reports nothing when never armed', () => {
    expect(consumeRelaunchToLogin(memoryStore())).toBe(false);
  });

  it('tolerates a missing store (storage disabled)', () => {
    expect(() => armRelaunchToLogin(null)).not.toThrow();
    expect(consumeRelaunchToLogin(null)).toBe(false);
  });
});
