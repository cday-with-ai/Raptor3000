/**
 * The PGN journal — auto-append every game you PLAY to one designated
 * file, at game end, with nothing asked (Carson, 2026-08-16: "auto
 * appened only games they play to a file").
 *
 * The file is chosen once in Options — the only place with a user
 * gesture, which both the picker and `requestPermission` require — and
 * the FileSystemFileHandle is persisted in IndexedDB. Same-origin
 * windows share that storage, so the board popup that plays the game
 * finds the handle the main window's Options page stored.
 *
 * The permission rules shape the whole module (Carson asked for the
 * restrictions, 2026-08-16):
 *   - The picker and `requestPermission` need a gesture; appends do not.
 *   - The stored handle can decay to 'prompt' on a later visit;
 *     `queryPermission` says which before a write, and a 'prompt' write
 *     would throw. So appends check first and report instead of firing
 *     a permission prompt from nowhere.
 *   - 'denied' means the user said no in the browser's own UI; we
 *     report it and stay out of their way.
 *   - Incognito/private mode empties IndexedDB per session: the handle
 *     is gone, the append reports 'no-file', Options re-picks.
 *
 * The environment seam mirrors `theme.ts`/`pgnSaver.ts`: the default is
 * the browser implementation (IndexedDB + the File System Access API),
 * tests inject fakes and never touch the DOM.
 */

import { writePgnToHandle } from './pgnSaver.js';

export type JournalAppendResult = 'appended' | 'saved' | 'no-file' | 'needs-permission' | 'denied' | 'unreadable';

export interface PgnJournalEnvironment {
  /** Whether `showSaveFilePicker` exists at all. */
  supportsSavePicker: boolean;
  /** Open the save dialog; null when the user dismisses it. */
  pickFile: (suggestedName: string) => Promise<FileSystemFileHandle | null>;
  /** The stored handle, or null when none was ever chosen. */
  loadHandle: () => Promise<FileSystemFileHandle | null>;
  /** Persist the chosen handle. */
  storeHandle: (handle: FileSystemFileHandle) => Promise<void>;
  /** What the browser says about writes to this handle. */
  queryPermission: (handle: FileSystemFileHandle) => Promise<'granted' | 'prompt' | 'denied'>;
  /** Ask the user (must run inside a click). */
  requestPermission: (handle: FileSystemFileHandle) => Promise<'granted' | 'prompt' | 'denied'>;
  /** The chosen file's name, for the Options row to display. */
  handleName: (handle: FileSystemFileHandle) => Promise<string>;
}

// lib.dom's FileSystemFileHandle carries createWritable/getFile but not
// the permission methods — they exist on the real API (Chrome/Brave/
// Edge implement them; Firefox/Safari lack the API entirely).
declare global {
  interface FileSystemFileHandle {
    queryPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'prompt' | 'denied'>;
    requestPermission?: (opts: { mode: 'read' | 'readwrite' }) => Promise<'granted' | 'prompt' | 'denied'>;
  }
}

/** Whether this browser can host the journal at all (Chrome/Brave/Edge). */
export function supportsSavePicker(): boolean {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

/** The persisted handle, or null when none was ever chosen. Options
 *  shows its name; the board popup appends through it. */
export async function loadJournalHandle(
  env: PgnJournalEnvironment = browserEnvironment,
): Promise<FileSystemFileHandle | null> {
  return env.loadHandle();
}

const DB_NAME = 'raptor3000';
const STORE = 'pgnJournal';
const HANDLE_KEY = 'handle';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDb();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

async function idbPut(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

const browserEnvironment: PgnJournalEnvironment = {
  supportsSavePicker: supportsSavePicker(),
  async pickFile(suggestedName) {
    if (typeof window === 'undefined' || !window.showSaveFilePicker) return null;
    try {
      return await window.showSaveFilePicker({
        suggestedName,
        types: [{ description: 'PGN', accept: { 'application/x-chess-pgn': ['.pgn'] } }],
        // A stable id keeps the permission tied to this same file
        // across picker calls, so re-choosing it later does not re-ask.
        id: 'raptor-pgn-journal',
      });
    } catch {
      return null;
    }
  },
  async loadHandle() {
    try {
      return await idbGet<FileSystemFileHandle>(HANDLE_KEY);
    } catch {
      // IndexedDB unavailable (private-mode storage blocked): behave
      // as if no file was ever chosen.
      return null;
    }
  },
  async storeHandle(handle) {
    await idbPut(HANDLE_KEY, handle);
  },
  async queryPermission(handle) {
    if (!handle.queryPermission) return 'granted';
    return handle.queryPermission({ mode: 'readwrite' });
  },
  async requestPermission(handle) {
    if (!handle.requestPermission) return 'granted';
    return handle.requestPermission({ mode: 'readwrite' });
  },
  async handleName(handle) {
    return handle.name;
  },
};

/**
 * The Options-side flow, run from a click: pick the journal file and
 * ask for write permission on the spot (both need the gesture), then
 * persist the handle. Returns the outcome for the Options row.
 */
export async function chooseJournalFile(
  suggestedName: string,
  env: PgnJournalEnvironment = browserEnvironment,
): Promise<
  | { ok: true; name: string }
  | { ok: false; reason: 'unsupported' | 'dismissed' | 'denied' | 'failed' }
> {
  if (!env.supportsSavePicker) return { ok: false, reason: 'unsupported' };
  const handle = await env.pickFile(suggestedName);
  if (!handle) return { ok: false, reason: 'dismissed' };
  const perm = await env.requestPermission(handle);
  if (perm !== 'granted') return { ok: false, reason: 'denied' };
  try {
    await env.storeHandle(handle);
  } catch {
    return { ok: false, reason: 'failed' };
  }
  return { ok: true, name: await env.handleName(handle) };
}

/**
 * The game-end side: append `pgn` to the stored journal file, quietly.
 * No gesture exists here, so a handle whose permission has decayed to
 * 'prompt' is reported rather than prompted for. Returns the outcome
 * for the INTERNAL console line.
 */
export async function appendToJournal(
  pgn: string,
  env: PgnJournalEnvironment = browserEnvironment,
): Promise<JournalAppendResult> {
  const handle = await env.loadHandle();
  if (!handle) return 'no-file';
  const perm = await env.queryPermission(handle);
  if (perm === 'prompt') return 'needs-permission';
  if (perm === 'denied') return 'denied';
  const written = await writePgnToHandle(handle, pgn);
  if (written === 'cancelled') return 'unreadable';
  return written;
}