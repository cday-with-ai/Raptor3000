/**
 * Login-profile persistence. Port of Raptor's IcsLoginDialog preference
 * scheme (`<prefix><profile>-user-name`, etc.). Three named profiles,
 * each with its own credential set; a top-level `<prefix>profile` and
 * `<prefix>auto-connect` track the active one.
 *
 * Backed by localStorage (keys match Raptor prefix-style so a future
 * import tool could read preferences.properties 1:1).
 */

export type ProfileName = 'Primary' | 'Secondary' | 'Tertiary';
export const PROFILE_NAMES: readonly ProfileName[] = [
  'Primary',
  'Secondary',
  'Tertiary',
];

export interface ProfileCreds {
  userName: string;
  password: string;
  serverUrl: string;
  port: string;
  isNamedGuest: boolean;
  isAnonGuest: boolean;
  timesealEnabled: boolean;
}

export interface LoginSelection {
  activeProfile: ProfileName;
  autoConnect: boolean;
}

const PREFIX = 'fics.';
const key = (profile: ProfileName, field: string) =>
  `${PREFIX}${profile}-${field}`;

function readString(k: string, fallback = ''): string {
  try {
    return localStorage.getItem(k) ?? fallback;
  } catch {
    return fallback;
  }
}

function readBool(k: string, fallback = false): boolean {
  const v = readString(k, '');
  if (v === '') return fallback;
  return v === 'true';
}

function writeString(k: string, v: string): void {
  try {
    localStorage.setItem(k, v);
  } catch {
    // quota / disabled storage — silently ignore, preferences are best-effort
  }
}

function writeBool(k: string, v: boolean): void {
  writeString(k, v ? 'true' : 'false');
}

export function loadProfile(profile: ProfileName): ProfileCreds {
  return {
    userName: readString(key(profile, 'user-name')),
    password: readString(key(profile, 'password')),
    serverUrl: readString(key(profile, 'server-url'), 'freechess.org'),
    port: readString(key(profile, 'port'), '5000'),
    isNamedGuest: readBool(key(profile, 'is-named-guest')),
    isAnonGuest: readBool(key(profile, 'is-anon-guest')),
    timesealEnabled: readBool(key(profile, 'timeseal-enabled'), true),
  };
}

export function saveProfile(profile: ProfileName, creds: ProfileCreds): void {
  writeString(key(profile, 'user-name'), creds.userName);
  writeString(key(profile, 'password'), creds.password);
  writeString(key(profile, 'server-url'), creds.serverUrl);
  writeString(key(profile, 'port'), creds.port);
  writeBool(key(profile, 'is-named-guest'), creds.isNamedGuest);
  writeBool(key(profile, 'is-anon-guest'), creds.isAnonGuest);
  writeBool(key(profile, 'timeseal-enabled'), creds.timesealEnabled);
}

export function loadSelection(): LoginSelection {
  const active = readString(`${PREFIX}profile`, 'Primary') as ProfileName;
  return {
    activeProfile: PROFILE_NAMES.includes(active) ? active : 'Primary',
    autoConnect: readBool(`${PREFIX}auto-connect`),
  };
}

export function saveSelection(sel: LoginSelection): void {
  writeString(`${PREFIX}profile`, sel.activeProfile);
  writeBool(`${PREFIX}auto-connect`, sel.autoConnect);
}
