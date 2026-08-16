import { describe, expect, it } from 'vitest';
import { savePgnFile, type PgnSaveEnvironment, type PgnSaveResult } from '../pgnSaver.js';

/**
 * The seam tests: a fake environment stands in for the browser, and the
 * assertions land on what a real browser would act on — the picked
 * handle's write stream contents and the blob handed to the download.
 * The core behavioural pin: an existing non-empty file is appended to,
 * never offered, never overwritten (Carson, 2026-08-16).
 */

const PGN_A = '[Event "Online Game"]\n\n1. e4 e5 *\n';
const PGN_B = '[Event "Online Game"]\n\n1. d4 d5 *\n';

interface FakeWritable {
  written: (string | Blob)[];
}

function fakeHandle(initialText: string) {
  const writable: FakeWritable = { written: [] };
  return {
    writable,
    getFile: async () => ({ text: async () => initialText }),
    createWritable: async () => ({
      write: async (chunk: string | Blob) => {
        writable.written.push(chunk);
      },
      close: async () => {},
    }),
  };
}

function fakeEnv(overrides: Partial<PgnSaveEnvironment> = {}) {
  const calls: { pick: string[]; download: { name: string; blob: Blob }[] } = {
    pick: [],
    download: [],
  };
  const env: PgnSaveEnvironment = {
    supportsSavePicker: true,
    pickFile: async (name: string) => {
      calls.pick.push(name);
      return null;
    },
    downloadBlob: (blob: Blob, name: string) => {
      calls.download.push({ name, blob });
    },
    ...overrides,
  };
  return { env, calls };
}

describe('savePgnFile', () => {
  it('falls back to a blob download when the picker API is missing', async () => {
    const { env, calls } = fakeEnv({ supportsSavePicker: false });
    const result = await savePgnFile(PGN_A, 'a-vs-b.pgn', env);

    expect(result).toBe('downloaded');
    expect(calls.pick).toEqual([]);
    expect(calls.download).toHaveLength(1);
    expect(calls.download[0].name).toBe('a-vs-b.pgn');
    expect(await calls.download[0].blob.text()).toBe(PGN_A);
  });

  it('writes the pgn to a brand-new file as-is', async () => {
    const handle = fakeHandle('');
    const { env } = fakeEnv({ pickFile: async () => handle as never });

    const result = await savePgnFile(PGN_A, 'a-vs-b.pgn', env);

    expect(result).toBe('saved');
    expect(handle.writable.written.map(String)).toEqual([PGN_A]);
  });

  it('writes to an empty existing file as-is', async () => {
    const handle = fakeHandle('   \n');
    const { env } = fakeEnv({ pickFile: async () => handle as never });

    const result = await savePgnFile(PGN_A, 'a-vs-b.pgn', env);

    expect(result).toBe('saved');
    expect(handle.writable.written.map(String)).toEqual([PGN_A]);
  });

  it('appends to a non-empty file without asking', async () => {
    const handle = fakeHandle('[Event "Online Game"]\n\n1. e4 e5 *\n');
    const { env } = fakeEnv({ pickFile: async () => handle as never });

    const result = await savePgnFile(PGN_B, 'games.pgn', env);

    expect(result).toBe('appended');
    expect(handle.writable.written.map(String)).toEqual([
      '[Event "Online Game"]\n\n1. e4 e5 *\n\n[Event "Online Game"]\n\n1. d4 d5 *\n',
    ]);
  });

  it('normalises the join so trailing newlines do not accumulate', async () => {
    const handle = fakeHandle('[Event "Online Game"]\n\n1. e4 e5 *\n\n\n');
    const { env } = fakeEnv({ pickFile: async () => handle as never });

    const result = await savePgnFile(PGN_B, 'games.pgn', env);

    expect(result).toBe('appended');
    expect(handle.writable.written.map(String)).toEqual([
      '[Event "Online Game"]\n\n1. e4 e5 *\n\n[Event "Online Game"]\n\n1. d4 d5 *\n',
    ]);
  });

  it('cancels quietly when the user dismisses the picker', async () => {
    const { env, calls } = fakeEnv({ pickFile: async () => null });

    const result = await savePgnFile(PGN_A, 'a-vs-b.pgn', env);

    expect(result).toBe('cancelled');
    expect(calls.download).toEqual([]);
  });

  it('aborts on a file it cannot read, rather than guess and overwrite', async () => {
    const { env } = fakeEnv({
      pickFile: async () =>
        ({
          getFile: async () => {
            throw new Error('unreadable');
          },
          createWritable: async () => {
            throw new Error('must not be called');
          },
        }) as never,
    });

    const result = await savePgnFile(PGN_A, 'games.pgn', env);

    expect(result).toBe('cancelled');
  });
});

describe('savePgnFile result contract', () => {
  it('returns one of the four documented outcomes', async () => {
    const outcomes: PgnSaveResult[] = [];
    const { env } = fakeEnv({ supportsSavePicker: false });
    outcomes.push(await savePgnFile(PGN_A, 'x.pgn', env));
    const { env: env2 } = fakeEnv({ pickFile: async () => fakeHandle('') as never });
    outcomes.push(await savePgnFile(PGN_A, 'x.pgn', env2));
    const { env: env3 } = fakeEnv({ pickFile: async () => null });
    outcomes.push(await savePgnFile(PGN_A, 'x.pgn', env3));

    expect(outcomes.sort()).toEqual(['cancelled', 'downloaded', 'saved']);
  });
});