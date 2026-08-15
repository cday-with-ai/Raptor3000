/**
 * UI language: detection, persistence, and the message lookup.
 *
 * Why this exists (Carson, 2026-08-15): "i think non english speakers are
 * running into the instructions page and can't decipher it." The popup
 * gate is a *first-contact* surface — a visitor meets it before they have
 * signed in, and it asks them to perform surgery on their browser. In
 * English, to someone who does not read English, that is a dead end.
 *
 * Scope is deliberately the first-contact surfaces only: the gate, the
 * login screen, and the post-login Options/Help page. Chat, boards and
 * everything downstream stay English on purpose — FICS itself speaks
 * English ("the user will know some english by default"), so translating
 * the client's chrome while the server streams English tells would only
 * move the language boundary, not remove it. For the same reason FICS
 * commands, code snippets, product names and the `--app` shortcut
 * recipes stay untranslated *inside* the localized prose.
 *
 * Mechanics mirror `theme.ts`: the choice lives in localStorage, which
 * same-origin windows share, and a `storage` event carries a change from
 * the window that made it to every other document. Unlike theme there is
 * no OS-level event to watch — `navigator.languages` does not change
 * mid-session.
 */

import { en, type MessageKey, type Messages } from './messages.js';
import de from './locales/de.js';
import es from './locales/es.js';
import fr from './locales/fr.js';
import he from './locales/he.js';
import ja from './locales/ja.js';
import ko from './locales/ko.js';
import nb from './locales/nb.js';
import pl from './locales/pl.js';
import pt from './locales/pt.js';
import ru from './locales/ru.js';
import zh from './locales/zh.js';

export type { MessageKey, Messages } from './messages.js';

/**
 * The languages we ship. Chosen from who actually plays on FICS rather
 * than from a list of biggest languages: the European chess countries,
 * Brazil (pt), Russia, Poland, Scandinavia, Israel, and the three East
 * Asian chess-playing countries.
 */
export const LOCALES = [
  'en', 'de', 'es', 'pt', 'fr', 'ru', 'pl', 'nb', 'he', 'zh', 'ja', 'ko',
] as const;

export type Locale = (typeof LOCALES)[number];

/** Endonyms — a language picker nobody can read is not a picker. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  ru: 'Русский',
  pl: 'Polski',
  nb: 'Norsk',
  he: 'עברית',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
};

const CATALOGS: Record<Locale, Messages> = {
  en, de, es, pt, fr, ru, pl, nb, he, zh, ja, ko,
};

/** Right-to-left scripts among the shipped set. */
const RTL: ReadonlySet<Locale> = new Set<Locale>(['he']);

export function isRtl(locale: Locale): boolean {
  return RTL.has(locale);
}

/** `auto` follows the browser; anything else is an explicit override. */
export type LangPref = 'auto' | Locale;

export const LANG_STORAGE_KEY = 'pref.uiLang';

function isLocale(v: string): v is Locale {
  return (LOCALES as readonly string[]).includes(v);
}

/**
 * BCP-47 tag → shipped locale. Region is dropped (pt-BR and pt-PT both
 * get pt; zh-TW gets our Simplified catalog, which reads awkwardly but
 * beats English). The odd ones are deliberate:
 *   - `iw` is the legacy code for Hebrew and still emitted by old stacks.
 *   - `no`/`nn` fold into `nb`: we ship Bokmål, and Nynorsk readers read
 *     it far more comfortably than they read English.
 *   - `in` is legacy Indonesian, NOT a match for anything we ship — it is
 *     listed here only so nobody "fixes" it into an Italian match.
 */
export function matchLocale(tag: string): Locale | null {
  const base = tag.toLowerCase().split(/[-_]/)[0];
  if (base === 'iw') return 'he';
  if (base === 'no' || base === 'nn') return 'nb';
  if (base === 'in') return null;
  return isLocale(base) ? base : null;
}

/**
 * First tag the visitor's browser offers that we can serve. Order is the
 * visitor's own preference order, so a de-AT/en-US browser gets German
 * and an en-GB/de browser gets English.
 */
export function detectLocale(
  languages: readonly string[] = typeof navigator !== 'undefined'
    ? (navigator.languages ?? [navigator.language])
    : [],
): Locale {
  for (const tag of languages) {
    if (!tag) continue;
    const hit = matchLocale(tag);
    if (hit) return hit;
  }
  return 'en';
}

export function resolveLocale(
  pref: LangPref,
  languages?: readonly string[],
): Locale {
  return pref === 'auto' ? detectLocale(languages) : pref;
}

export function loadLangPref(): LangPref {
  try {
    const v = localStorage.getItem(LANG_STORAGE_KEY);
    if (v === 'auto') return 'auto';
    if (v && isLocale(v)) return v;
  } catch {
    // storage unavailable: detection still works, it just won't persist
  }
  return 'auto';
}

function persist(pref: LangPref): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, pref);
  } catch {
    // best-effort, like every other preference here
  }
}

/**
 * Reflect the locale onto the document: `lang` for spellcheck, voice and
 * font selection, `dir` for Hebrew. Set on <html> so popups — separate
 * documents running this same bundle — each do it for themselves.
 */
export function applyDocumentLocale(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
}

// ---- the store -----------------------------------------------------------
// A module-level store rather than React context: board and chat windows
// are separate documents with their own React roots, so a provider in the
// main window could not reach them. This can, because the state it wraps
// is localStorage.

const listeners = new Set<() => void>();
let current: Locale = 'en';
let started = false;

function start(): void {
  if (started) return;
  started = true;
  current = resolveLocale(loadLangPref());
  applyDocumentLocale(current);
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', ev => {
      // `null` key is a whole-store clear, which drops the choice too.
      if (ev.key !== null && ev.key !== LANG_STORAGE_KEY) return;
      const next = resolveLocale(loadLangPref());
      if (next === current) return;
      current = next;
      applyDocumentLocale(current);
      for (const l of listeners) l();
    });
  }
}

export function currentLocale(): Locale {
  start();
  return current;
}

/**
 * Resolve and reflect the language before React mounts, and keep this
 * document following changes made in other windows. `main.tsx` calls it
 * once per document — main and every popup run the same bundle — and
 * never tears it down, exactly like `installThemeSync`.
 */
export function installLocale(): Locale {
  return currentLocale();
}

export function setLangPref(pref: LangPref): void {
  start();
  persist(pref);
  const next = resolveLocale(pref);
  if (next === current) return;
  current = next;
  applyDocumentLocale(current);
  // The writing window gets no `storage` event of its own, so notify here.
  for (const l of listeners) l();
}

export function subscribeLocale(onChange: () => void): () => void {
  start();
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

// ---- lookup --------------------------------------------------------------

export type TParams = Readonly<Record<string, string | number>>;

/**
 * Look up a message, falling back per key (not per catalog) to English:
 * a translation that is missing one string should show that one string
 * in English, not drop the whole language.
 *
 * `{name}` placeholders are substituted; an unknown placeholder is left
 * as written so it shows up in review rather than vanishing.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: TParams,
): string {
  const raw = CATALOGS[locale]?.[key] ?? en[key];
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

export function messagesFor(locale: Locale): Messages {
  return CATALOGS[locale] ?? en;
}
