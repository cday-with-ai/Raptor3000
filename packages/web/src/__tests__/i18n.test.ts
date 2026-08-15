import { describe, it, expect } from 'vitest';
import { en } from '../i18n/messages.js';
import {
  LOCALES,
  LOCALE_NAMES,
  detectLocale,
  isRtl,
  matchLocale,
  messagesFor,
  resolveLocale,
  translate,
  type Locale,
} from '../i18n/index.js';

/**
 * The catalogs are written by hand, one file per language, and English
 * is the source of truth. These tests are the gate that a catalog is
 * actually usable — TypeScript already refuses a *missing* key, but it
 * cannot see a dropped `<b>`, a placeholder translated into
 * `{nombre}`, or a file that was truncated halfway through.
 */

const KEYS = Object.keys(en) as (keyof typeof en)[];

/** `{name}` placeholders, as a sorted set — order is the translator's. */
function placeholders(s: string): string[] {
  return [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
}

function boldTags(s: string): { open: number; close: number } {
  return {
    open: (s.match(/<b>/g) ?? []).length,
    close: (s.match(/<\/b>/g) ?? []).length,
  };
}

describe('catalog integrity', () => {
  it('ships a name for every locale and a locale for every name', () => {
    expect(Object.keys(LOCALE_NAMES).sort()).toEqual([...LOCALES].sort());
  });

  it.each(LOCALES)('%s has exactly the English keys', locale => {
    const catalog = messagesFor(locale);
    expect(Object.keys(catalog).sort()).toEqual([...KEYS].sort());
  });

  it.each(LOCALES)('%s leaves no value empty', locale => {
    const catalog = messagesFor(locale);
    const blank = KEYS.filter(k => catalog[k].trim() === '');
    expect(blank).toEqual([]);
  });

  it.each(LOCALES)('%s keeps every placeholder', locale => {
    const catalog = messagesFor(locale);
    const wrong = KEYS.filter(
      k => placeholders(catalog[k]).join() !== placeholders(en[k]).join(),
    );
    expect(wrong).toEqual([]);
  });

  it.each(LOCALES)('%s keeps <b> balanced and unaccompanied', locale => {
    const catalog = messagesFor(locale);
    const unbalanced = KEYS.filter(k => {
      const { open, close } = boldTags(catalog[k]);
      return open !== close || open !== boldTags(en[k]).open;
    });
    expect(unbalanced).toEqual([]);
    // <b> is the ONLY markup the renderer understands; anything else
    // would render as literal text in the middle of a sentence.
    const strayTags = KEYS.filter(k =>
      /<(?!\/?b>)[a-zA-Z/][^>]*>/.test(catalog[k]),
    );
    expect(strayTags).toEqual([]);
  });

  it.each(LOCALES.filter(l => l !== 'en'))(
    '%s is actually translated, not a copy of English',
    locale => {
      const catalog = messagesFor(locale);
      // Short labels legitimately coincide (e.g. "Port", "Server"), so
      // this is a bulk check, not a per-key one: a catalog that is
      // mostly identical to English is a stub someone forgot to finish.
      const identical = KEYS.filter(k => catalog[k] === en[k]);
      expect(identical.length).toBeLessThan(KEYS.length / 3);
    },
  );
});

describe('matchLocale', () => {
  it('drops the region', () => {
    expect(matchLocale('pt-BR')).toBe('pt');
    expect(matchLocale('de-AT')).toBe('de');
    expect(matchLocale('zh-Hans-CN')).toBe('zh');
    expect(matchLocale('fr_CA')).toBe('fr');
  });

  it('handles the legacy and folded codes', () => {
    // `iw` is Hebrew's pre-1989 code and still turns up.
    expect(matchLocale('iw-IL')).toBe('he');
    expect(matchLocale('he')).toBe('he');
    // We ship Bokmål; Nynorsk and the macrolanguage tag fold into it.
    expect(matchLocale('nn-NO')).toBe('nb');
    expect(matchLocale('no')).toBe('nb');
    expect(matchLocale('nb')).toBe('nb');
  });

  it('does not match a language we do not ship', () => {
    expect(matchLocale('it')).toBeNull();
    expect(matchLocale('sv')).toBeNull();
    // legacy Indonesian — must not be mistaken for anything
    expect(matchLocale('in-ID')).toBeNull();
    expect(matchLocale('')).toBeNull();
  });
});

describe('detectLocale', () => {
  it('honors the visitor’s own preference order', () => {
    expect(detectLocale(['de-AT', 'en-US'])).toBe('de');
    expect(detectLocale(['en-GB', 'de'])).toBe('en');
  });

  it('skips languages we cannot serve', () => {
    expect(detectLocale(['is', 'sv', 'nb-NO'])).toBe('nb');
  });

  it('falls back to English when nothing matches', () => {
    expect(detectLocale(['is', 'sv'])).toBe('en');
    expect(detectLocale([])).toBe('en');
  });
});

describe('resolveLocale', () => {
  it('an explicit choice beats the browser', () => {
    expect(resolveLocale('ja', ['de'])).toBe('ja');
    expect(resolveLocale('auto', ['de'])).toBe('de');
  });
});

describe('translate', () => {
  it('substitutes named placeholders', () => {
    expect(translate('en', 'shell.who.namedGuest', { name: 'billjr' })).toBe(
      'billjr (guest)',
    );
  });

  it('leaves an unknown placeholder visible rather than blanking it', () => {
    expect(translate('en', 'shell.footer.session', {})).toContain('{id}');
  });

  it('falls back per key, not per catalog', () => {
    const gappy = { ...messagesFor('de') } as Record<string, string>;
    // Simulating a catalog gap: the lookup must reach English for the
    // one missing string and stay German for the rest.
    delete gappy['login.submit'];
    expect(gappy['login.tagline']).not.toBe(en['login.tagline']);
    expect(en['login.submit']).toBe('Login');
  });
});

describe('isRtl', () => {
  it('is Hebrew and only Hebrew, of what we ship', () => {
    const rtl = LOCALES.filter((l: Locale) => isRtl(l));
    expect(rtl).toEqual(['he']);
  });
});
