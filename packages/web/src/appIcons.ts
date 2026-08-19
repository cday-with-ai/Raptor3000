/**
 * The app icon is a choice, not a constant.
 *
 * Sixteen raptors exist because grok drew them across two sessions and
 * fourteen of them were never installed — they sat in its session folder
 * until they were recovered on 2026-08-18. Rather than pick one and throw
 * the rest away again, they all ship and the user picks. Carson: "can we
 * make it so they can change the icon with all groks images?"
 *
 * Scope, so nobody is surprised: this changes the icon **inside the app** —
 * the favicon every window carries, the badge on the login card, the brand
 * beside the main-window title. It does not touch the desktop launcher,
 * which is `raptor-icon.svg` plus the installed hicolor theme and belongs to
 * the machine, not to a browser preference.
 *
 * Two sizes per icon, and the split matters: the 256 is what the app
 * displays (88px on the login card, so it has room at 2× DPI), and the 64 is
 * what the options grid uses. Sixteen 256s would be 1.6 MB every time
 * somebody opened the picker; sixteen 64s are 145 KB, and the browser only
 * ever fetches the full-size file for the one icon actually selected.
 */

export const APP_ICONS = [
  'industrial',
  'classic',
  'olive',
  'charcoal',
  'grin',
  'toothy',
  'mech',
  'neon',
  'explorer',
  'orbital',
  'chibi',
  'pale',
  'nebula',
  'cadet',
  'ranger',
  'midnight',
] as const;

export type AppIcon = (typeof APP_ICONS)[number];

/** Names describe the art. English only and deliberately not translated —
 *  they are the names of pictures, like the piece sets and the wood
 *  species, and a translated "Midnight" would be a different icon's name
 *  in every locale. */
export const APP_ICON_LABELS: Record<AppIcon, string> = {
  industrial: 'Industrial',
  classic: 'Classic',
  olive: 'Olive',
  charcoal: 'Charcoal',
  grin: 'Grin',
  toothy: 'Toothy',
  mech: 'Mech',
  neon: 'Neon',
  explorer: 'Explorer',
  orbital: 'Orbital',
  chibi: 'Chibi',
  pale: 'Pale',
  nebula: 'Nebula',
  cadet: 'Cadet',
  ranger: 'Ranger',
  midnight: 'Midnight',
};

/** Full-size file, for display. */
export function appIconUrl(id: AppIcon): string {
  return `/icons/${id}.png`;
}

/** Thumbnail, for the options grid. */
export function appIconThumbUrl(id: AppIcon): string {
  return `/icons/${id}-64.png`;
}

/**
 * Point the document's favicon at the chosen icon.
 *
 * Every window loads the same index.html, so each one runs this for itself
 * and a board popup gets the same face as the chat window. The link element
 * is the one already in the head; if it has gone missing (a stripped host
 * page, a test fixture) one is created rather than silently doing nothing.
 */
export function applyFavicon(id: AppIcon, doc: Document = document): void {
  let link = doc.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = doc.createElement('link');
    link.rel = 'icon';
    doc.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = appIconUrl(id);
}

/**
 * Keep the favicon following the preference, in every window.
 *
 * Mirrors `installThemeSync`: apply once before React mounts so no window
 * flashes the old face, then follow both channels — `storage` for a change
 * made in another window, and the app's own local event for a change made
 * in this one (a tab does not receive its own storage event).
 */
export function installFaviconSync(
  read: () => AppIcon,
  localEvent: string,
): () => void {
  const apply = () => applyFavicon(read());
  apply();
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key.startsWith('pref.')) apply();
  };
  window.addEventListener('storage', onStorage);
  window.addEventListener(localEvent, apply);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(localEvent, apply);
  };
}
