import { Fragment, useMemo, useSyncExternalStore } from 'react';
import {
  LOCALES,
  LOCALE_NAMES,
  currentLocale,
  loadLangPref,
  setLangPref,
  subscribeLocale,
  translate,
  type LangPref,
  type Locale,
  type MessageKey,
  type TParams,
} from './index.js';

/**
 * React bindings for the i18n store.
 *
 * `useSyncExternalStore` rather than context because the store is
 * localStorage-backed and shared across documents: board and chat popups
 * have their own React roots, and a provider mounted in the main window
 * could never reach them. Each document subscribes for itself.
 */
export function useLocale(): Locale {
  return useSyncExternalStore(
    subscribeLocale,
    currentLocale,
    () => 'en' as Locale,
  );
}

export interface Translator {
  locale: Locale;
  /** Plain string — for attributes, titles, aria labels, option labels. */
  t: (key: MessageKey, params?: TParams) => string;
  /** Same lookup, with `<b>…</b>` rendered — for anything inside JSX. */
  rich: (key: MessageKey, params?: TParams) => React.ReactNode;
}

export function useT(): Translator {
  const locale = useLocale();
  return useMemo(
    () => ({
      locale,
      t: (key: MessageKey, params?: TParams) => translate(locale, key, params),
      rich: (key: MessageKey, params?: TParams) =>
        renderRich(translate(locale, key, params)),
    }),
    [locale],
  );
}

/**
 * Turn the one piece of markup catalogs are allowed to carry — `<b>…</b>`
 * — into real elements. Everything else in the string is text.
 *
 * A translator who drops or unbalances a tag gets the tag shown as
 * literal text, which is visible in review; nothing is stripped silently
 * and no HTML is ever parsed, so a catalog cannot inject markup.
 */
export function renderRich(text: string): React.ReactNode {
  if (!text.includes('<b>')) return text;
  const parts = text.split(/(<b>[\s\S]*?<\/b>)/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = /^<b>([\s\S]*?)<\/b>$/.exec(part);
        return m ? (
          <strong key={i}>{m[1]}</strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        );
      })}
    </>
  );
}

/**
 * The language control. Detection is a guess — a shared machine, a
 * browser installed in the wrong language, an expat's laptop — so the
 * guess must always be overridable, and the control has to be legible to
 * someone who cannot read the current language: options are endonyms,
 * and the only translated entry is "Automatic".
 */
export function LanguageSelect({ style }: { style?: React.CSSProperties }) {
  const { t } = useT();
  const pref = useSyncExternalStore(subscribeLocale, loadLangPref, () =>
    'auto' as LangPref,
  );
  return (
    <select
      aria-label={t('lang.label')}
      value={pref}
      onChange={e => setLangPref(e.target.value as LangPref)}
      style={style}
    >
      <option value="auto">{t('lang.auto')}</option>
      {LOCALES.map(l => (
        <option key={l} value={l}>
          {LOCALE_NAMES[l]}
        </option>
      ))}
    </select>
  );
}
