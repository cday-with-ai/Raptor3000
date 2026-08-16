import { describe, expect, it } from 'vitest';
import { savePgnFile, type PgnSaveEnvironment, type PgnSaveResult } from '../pgnSaver.js';

/**
 * The seam tests: a fake environment stands in for the browser, and the
 * assertions land on what a real browser would act on — the picked
 * handle's write stream contents, the blob handed to the download, the
 * confirm prompt shown.
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
  const calls: { pick: string[]; download: { name: string; blob: Blob }[]; confirms: string[] } = {
    pick: [],
    download: [],
    confirms: [],
  };
  const env: PgnSaveEnvironment = {
    supportsSavePicker: true,
    pickFile: async (name: string) => {
      calls.pick.push(name);
      return null;
    },
    confirmAppend: (message: string) => {
      calls.confirms.push(message);
      return true;
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

  it('writes the pgn to a brand-new file without asking anything', async () => {
    const handle = fakeHandle('');
    const { env, calls } = fakeEnv({ pickFile: async () => handle as never });

    const result = await savePgnFile(PGN_A, 'a-vs-b.pgn', env);

    expect(result).toBe('saved');
    expect(calls.confirms).toEqual([]);
    expect(handle.writable.written.map(String)).toEqual([PGN_A]);
  });

  it('writes to an empty existing file without asking either', async () => {
    const handle = fakeHandle('   \n');
    const { env, calls } = fakeEnv({ pickFile: async () => handle as never });

    const result = await savePgnFile(PGN_A, 'a-vs-b.pgn', env);

    expect(result).toBe('saved');
    expect(calls.confirms).toEqual([]);
    expect(handle.writable.written.map(String)).toEqual([PGN_A]);
  });

  it('appends to a non-empty file after the offer is accepted', async () => {
    const handle = fakeHandle('[Event "Online Game"]\n\n1. e4 e5 *\n');
    const { env, calls } = fakeEnv({ pickFile: async () => handle as never });

    const result = await savePgnFile(PGN_B, 'games.pgn', env);

    expect(result).toBe('appended');
    expect(calls.confirms).toHaveLength(1);
    expect(calls.confirms[0]).toContain('already contains 1 game');
    expect(handle.writable.written.map(String)).toEqual([
      '[Event "Online Game"]\n\n1. e4 e5 *\n\n[Event "Online Game"]\n\n1. d4 d5 *\n',
    ]);
  });

  it('counts the games the file already holds in the offer', async () => {
    const handle = fakeHandle('[Event "a"]\n\n1. e4 *\n\n[Event "b"]\n\n1. d4 *\n');
    const { env, calls } = fakeEnv({ pickFile: async () => handle as never });

    await savePgnFile(PGN_B, 'games.pgn', env);

    expect(calls.confirms[0]).toContain('already contains 2 games');
  });

  it('writes nothing when the append offer is declined', async () => {
    const handle = fakeHandle('[Event "Online Game"]\n\n1. e4 e5 *\n');
    const { env, calls } = fakeEnv({
      pickFile: async () => handle as never,
      confirmAppend: message => {
        calls.confirms.push(message);
        return false;
      },
    });

    const result = await savePgnFile(PGN_B, 'games.pgn', env);

    expect(result).toBe('cancelled');
    expect(handle.writable.written).toEqual([]);
    expect(calls.confirms).toHaveLength(1);
  });

  it('cancels quietly when the user dismisses the picker', async () => {
    const { env, calls } = fakeEnv({ pickFile: async () => null });

    const result = await savePgnFile(PGN_A, 'a-vs-b.pgn', env);

    expect(result).toBe('cancelled');
    expect(calls.download).toEqual([]);
    expect(calls.confirms).toEqual([]);
  });

  it('falls back to overwriting... never — an unreadable file aborts', async () => {
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