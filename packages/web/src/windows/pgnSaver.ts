/**
 * Save a PGN through the File System Access API when the browser has it
 * (Chrome/Brave/Edge), falling back to a blob download elsewhere
 * (Firefox/Safari). The one behaviour the picker makes possible that the
 * download cannot: choosing an EXISTING file and appending the game to
 * the end of it instead of silently destroying its contents — the
 * collection-file flow (BOTCHvinik, 2026-08-16).
 *
 * The environment seam mirrors `theme.ts`: the default is the browser
 * implementation, tests inject a fake and never touch the DOM.
 */

export type PgnSaveResult = 'downloaded' | 'saved' | 'appended' | 'cancelled';

export interface PgnSaveEnvironment {
  /** Whether `showSaveFilePicker` exists at all. */
  supportsSavePicker: boolean;
  /** Open the save dialog; null when the user dismisses it. */
  pickFile: (suggestedName: string) => Promise<FileSystemFileHandle | null>;
  /** The append offer; the user's yes is the only way content merges. */
  confirmAppend: (message: string) => boolean;
  /** Fallback: the classic anchor-click blob download. */
  downloadBlob: (blob: Blob, name: string) => void;
}

declare global {
  interface Window {
    showSaveFilePicker?: (options: {
      suggestedName?: string;
      types?: { description?: string; accept: Record<string, string[]> }[];
    }) => Promise<FileSystemFileHandle>;
  }
}

const browserEnvironment: PgnSaveEnvironment = {
  supportsSavePicker: typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function',
  async pickFile(suggestedName) {
    if (typeof window === 'undefined' || !window.showSaveFilePicker) return null;
    try {
      return await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'PGN', accept: { 'application/x-chess-pgn': ['.pgn'] } }],
      });
    } catch {
      return null;
    }
  },
  confirmAppend: message => window.confirm(message),
  downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    // In the DOM and revoking late (2026-08-16): clicking a detached
    // anchor while revoking the blob URL immediately could abort the
    // download before it started — and the click fell through to
    // navigating the blob, which popped the PGN open in a new window.
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};

/**
 * Write `pgn` to a file the user picks. When the chosen file already
 * holds games, offer to append instead of overwriting; a declined offer
 * writes nothing. Returns what actually happened.
 */
export async function savePgnFile(
  pgn: string,
  suggestedName: string,
  env: PgnSaveEnvironment = browserEnvironment,
): Promise<PgnSaveResult> {
  if (!env.supportsSavePicker) {
    env.downloadBlob(new Blob([pgn], { type: 'application/x-chess-pgn' }), suggestedName);
    return 'downloaded';
  }

  const handle = await env.pickFile(suggestedName);
  if (!handle) return 'cancelled';

  let existing: string;
  try {
    existing = await (await handle.getFile()).text();
  } catch {
    // Cannot tell whether the file holds games — overwriting it could
    // destroy a collection. Abort rather than guess.
    return 'cancelled';
  }
  const existingTrimmed = existing.trim();
  if (existingTrimmed.length > 0) {
    const games = (existing.match(/\[Event\s/g) ?? []).length;
    const ok = env.confirmAppend(
      `${suggestedName} already contains ${games} game${games === 1 ? '' : 's'}. ` +
        'Append this game to the end instead of overwriting it?',
    );
    if (!ok) return 'cancelled';
    const writable = await handle.createWritable();
    await writable.write(existing.replace(/\s+$/, '') + '\n\n' + pgn);
    await writable.close();
    return 'appended';
  }

  const writable = await handle.createWritable();
  await writable.write(pgn);
  await writable.close();
  return 'saved';
}