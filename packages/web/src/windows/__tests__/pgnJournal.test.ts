import { describe, expect, it } from 'vitest';
import {
  appendToJournal,
  chooseJournalFile,
  type JournalAppendResult,
  type PgnJournalEnvironment,
} from '../pgnJournal.js';

/**
 * The seam tests: a fake environment stands in for IndexedDB and the
 * File System Access API, and the assertions land on what a browser
 * would act on — the stored handle, the write stream contents, the
 * permission states.
 *
 * The three browser restrictions these pin (Carson asked for them,
 * 2026-08-16):
 *   - The picker and `requestPermission` need a gesture, so the file is
 *     chosen in Options and the handle persisted.
 *   - A stored handle can decay to 'prompt' on a later visit, and a
 *     game-end append has no gesture to re-ask with — so 'prompt'
 *     reports and never prompts.
 *   - 'denied' means the user said no in the browser's own UI.
 */

const PGN_A = '[Event "Online Game"]\n\n1. e4 e5 *\n';

interface FakeHandleState {
  text: string;
  permission: 'granted' | 'prompt' | 'denied';
  requested: number;
}

function fakeHandle(overrides: Partial<FakeHandleState> = {}) {
  const state: FakeHandleState = {
    text: '',
    permission: 'granted',
    requested: 0,
    ...overrides,
  };
  const written: string[] = [];
  const handle = {
    name: 'games.pgn',
    getFile: async () => ({ text: async () => state.text }),
    createWritable: async () => ({
      write: async (chunk: string | Blob) => {
        written.push(String(chunk));
      },
      close: async () => {},
    }),
    queryPermission: async () => state.permission,
    requestPermission: async () => {
      state.requested += 1;
      return state.permission;
    },
  };
  return { state, written, handle: handle as unknown as FileSystemFileHandle };
}

function fakeEnv(overrides: Partial<PgnJournalEnvironment> = {}) {
  let stored: ReturnType<typeof fakeHandle>['handle'] | null = null;
  const calls = { picked: 0, requested: 0, queries: 0 };
  const env: PgnJournalEnvironment = {
    supportsSavePicker: true,
    pickFile: async () => {
      calls.picked += 1;
      return null;
    },
    loadHandle: async () => stored,
    storeHandle: async h => {
      stored = h;
    },
    queryPermission: async () => 'granted',
    requestPermission: async () => 'granted',
    handleName: async h => h.name,
    ...overrides,
  };
  return { env, calls, store: (h: ReturnType<typeof fakeHandle>['handle']) => (stored = h) };
}

describe('chooseJournalFile', () => {
  it('picks, asks for permission and persists the handle', async () => {
    const f = fakeHandle();
    const { env, calls } = fakeEnv({
      pickFile: async () => {
        calls.picked += 1;
        return f.handle;
      },
      requestPermission: async () =>
        f.handle.requestPermission!({ mode: 'readwrite' }),
    });
    const result = await chooseJournalFile('my-games.pgn', env);

    expect(result).toEqual({ ok: true, name: 'games.pgn' });
    expect(calls.picked).toBe(1);
    expect(f.state.requested).toBe(1);
  });

  it('reports unsupported browsers without touching the picker', async () => {
    const { env, calls } = fakeEnv({ supportsSavePicker: false });
    const result = await chooseJournalFile('my-games.pgn', env);

    expect(result).toEqual({ ok: false, reason: 'unsupported' });
    expect(calls.picked).toBe(0);
  });

  it('treats a dismissed picker as a cancel, not an error', async () => {
    const { env } = fakeEnv({ pickFile: async () => null });
    expect(await chooseJournalFile('my-games.pgn', env)).toEqual({
      ok: false,
      reason: 'dismissed',
    });
  });

  it('does not persist a handle whose permission was refused', async () => {
    const f = fakeHandle({ permission: 'denied' });
    const { env, store } = fakeEnv({
      pickFile: async () => f.handle,
      requestPermission: async () => 'denied',
    });
    store(f.handle);
    const result = await chooseJournalFile('my-games.pgn', env);

    expect(result).toEqual({ ok: false, reason: 'denied' });
  });
});

describe('appendToJournal', () => {
  it('appends to the stored file', async () => {
    const f = fakeHandle({ text: '[Event "Online Game"]\n\n1. e4 e5 *\n' });
    const { env, store } = fakeEnv();
    store(f.handle);

    const result = await appendToJournal(PGN_A, env);

    expect(result).toBe('appended');
    expect(f.written).toEqual([
      '[Event "Online Game"]\n\n1. e4 e5 *\n\n[Event "Online Game"]\n\n1. e4 e5 *\n',
    ]);
  });

  it('writes fresh when the stored file is empty', async () => {
    const f = fakeHandle();
    const { env, store } = fakeEnv();
    store(f.handle);

    const result = await appendToJournal(PGN_A, env);

    expect(result).toBe('saved');
    expect(f.written).toEqual([PGN_A]);
  });

  it('reports no-file when nothing was ever chosen — never prompts', async () => {
    const { env } = fakeEnv();
    const result = await appendToJournal(PGN_A, env);

    expect(result).toBe('no-file');
  });

  it('reports needs-permission when the handle decayed to prompt', async () => {
    const f = fakeHandle({ permission: 'prompt' });
    const { env, store } = fakeEnv({ queryPermission: async () => 'prompt' });
    store(f.handle);

    const result = await appendToJournal(PGN_A, env);

    expect(result).toBe('needs-permission');
    expect(f.written).toEqual([]);
    expect(f.state.requested).toBe(0);
  });

  it('reports denied without writing', async () => {
    const f = fakeHandle({ permission: 'denied' });
    const { env, store } = fakeEnv({ queryPermission: async () => 'denied' });
    store(f.handle);

    const result = await appendToJournal(PGN_A, env);

    expect(result).toBe('denied');
    expect(f.written).toEqual([]);
  });

  it('reports unreadable instead of overwriting a file it cannot read', async () => {
    const { env, store } = fakeEnv({
      loadHandle: async () =>
        ({
          name: 'games.pgn',
          getFile: async () => {
            throw new Error('unreadable');
          },
          createWritable: async () => {
            throw new Error('must not be called');
          },
        }) as never,
    });
    store(null as never);

    const result = await appendToJournal(PGN_A, env);

    expect(result).toBe('unreadable');
  });
});

describe('appendToJournal result contract', () => {
  it('returns one of the six documented outcomes', async () => {
    const outcomes: JournalAppendResult[] = [];
    const { env } = fakeEnv();
    outcomes.push(await appendToJournal(PGN_A, env));
    const f = fakeHandle({ permission: 'prompt' });
    const { env: env2, store } = fakeEnv({ queryPermission: async () => 'prompt' });
    store(f.handle);
    outcomes.push(await appendToJournal(PGN_A, env2));

    expect(outcomes.sort()).toEqual(['needs-permission', 'no-file']);
  });
});