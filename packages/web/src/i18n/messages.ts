/**
 * The English catalog — source of truth for every translated string.
 *
 * House rules for anything added here, which the translations follow:
 *
 *   - `<b>…</b>` is the only markup. `renderRich` in `Rich.tsx` turns it
 *     into <strong>; anything else must live in the JSX around the
 *     string, not inside it.
 *   - `{name}` placeholders are substituted by `translate()`. Translators
 *     keep the braces and the name; word order around them is theirs.
 *   - Things that stay English in EVERY catalog because they are what the
 *     user must type or click in an English system: FICS commands
 *     (`+tab 39`, `iset lock 1`), browser menu paths, CLI flags and file
 *     paths, product names (Raptor3000, Stockfish, Timeseal, FICS,
 *     Chrome), and the piece-set / non-color board-theme names.
 */

export const en = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': 'Almost there…',
  'gate.demoChip': 'demo',
  'gate.intro':
    'Raptor3000 plays like a desktop app — chat and every board open as <b>real windows</b>. Your browser is blocking them, and fixing that takes two clicks:',
  'gate.chromium.step1':
    'Find this icon at the right end of your address bar — it appeared just now:',
  'gate.chromium.step2':
    'Click it, pick <b>Always allow</b>, then <b>Done</b>. That’s the whole job.',
  'gate.chromium.caption':
    '(just a picture — the real one is up in your browser’s own bar)',
  'gate.firefox.step1': 'A bar just appeared at the top of the page:',
  'gate.firefox.step2':
    'Click <b>Preferences</b> and pick <b>Allow pop-ups for this site</b>.',
  'gate.firefox.caption':
    '(just a picture — the real bar is Firefox’s own, above the page)',
  'gate.watching':
    'No need to tell anyone — this screen checks by itself and steps aside the moment windows are allowed.',
  'gate.others': 'Using a different browser?',
  'gate.testAgain': 'Test again',
  'gate.stuck': 'Still stuck?',
  'gate.report': 'report it',
  'gate.demo.allowed': 'demo — this browser right now: pop-ups allowed',
  'gate.demo.blocked': 'demo — this browser right now: pop-ups blocked',
  'gate.allowed.title': 'Pop-ups allowed',
  'gate.allowed.body': 'Board and chat windows will open. Enjoy.',

  // Per-browser directions. Browser names are product names and stay as
  // they are; the menu paths are what the visitor will literally see in a
  // browser whose own UI may well be in their language — translate the
  // words, keep the arrows and the order.
  // The labels inside the address-bar mock. They are a picture of the
  // visitor's own browser, so an English picture under translated
  // instructions is the same dead end the translations were for.
  'gate.pic.allow': 'Always allow pop-ups and redirects from this site',
  'gate.pic.blocking': 'Continue blocking',
  'gate.pic.done': 'Done',
  'gate.pic.ffBar': 'Firefox prevented this site from opening a pop-up window',
  'gate.pic.ffPrefs': 'Preferences',
  'gate.pic.ffAllow': 'Allow pop-ups for raptor3000.pages.dev',
  'gate.pic.ffEdit': 'Edit Pop-up Blocker Options…',

  'dir.chromium.steps':
    'Click the popup icon at the right end of the address bar and pick "Always allow pop-ups and redirects from this site", then Done. (Or: Settings → Privacy → Site settings → Pop-ups and redirects → add this site.)',
  'dir.firefox.steps':
    'A bar appears at the top when a popup is blocked — choose Preferences → "Allow pop-ups for this site". (Or: Settings → Privacy & Security → Permissions → Block pop-up windows → Exceptions.)',
  'dir.safari.steps':
    'Safari menu → Settings → Websites → Pop-up Windows → set this site to Allow.',
  'dir.ios.steps':
    'Settings app → Safari → turn OFF "Block Pop-ups". (Fair warning: phones get browser tabs instead of windows — a desktop is the real experience.)',
  'dir.android.steps':
    '⋮ menu → Settings → Site settings → Pop-ups and redirects → allow. (Same fair warning — tabs, not windows.)',

  // ---- login screen ------------------------------------------------------
  'login.tagline': 'Sign in to FICS',
  'login.profile': 'Profile',
  'login.handle': 'Handle',
  'login.password': 'Password',
  'login.server': 'Server',
  'login.port': 'Port',
  'login.guest': 'Guest login',
  'login.timeseal': 'Timeseal enabled',
  'login.autoConnect': 'Log me in automatically next time',
  'login.submit': 'Login',
  'login.err.handleLength': 'Handle must be 3 to 17 characters.',
  'login.err.handleLetters': 'Handle must contain only letters.',
  'login.err.noHandle': 'Please enter a handle or check Guest login.',
  'login.err.noPassword': 'Please enter a password.',
  'login.shot.observing': 'observing a game with engine analysis',
  'login.shot.playing': 'playing a blitz game',
  'login.shot.chat': 'the chat console in split view',
  'login.shot.seek': 'the live seek graph',

  // ---- language control --------------------------------------------------
  'lang.label': 'Language',
  'lang.auto': 'Automatic',
  'lang.note':
    'The interface language for this screen, the options and the help. Automatic follows your browser. Chess-server text — tells, channels, game results — arrives from FICS in English whatever you pick.',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'Raptor3000 is a desktop app',
  'mobile.body1':
    'Boards and chat open as <b>real browser windows</b>, driven live from the chess server — phones can’t do that, so the app doesn’t work here.',
  'mobile.body2': 'On a computer, visit <b>raptor3000.pages.dev</b>.',
  'mobile.tryAnyway': 'I have a keyboard and low expectations — try anyway',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': 'Options',
  'shell.nav.help': 'Help',
  'shell.signedIn': 'Signed in as <b>{who}</b> · {server}:{port} · profile {profile}',
  'shell.who.anonGuest': 'anonymous guest',
  'shell.who.namedGuest': '{name} (guest)',
  'shell.theme.light': 'Day',
  'shell.theme.dark': 'Night',
  'shell.theme.system': 'System',
  'shell.theme.aria': 'Theme: {mode}. Click to switch.',
  'shell.blocked.text':
    '<b>Your browser blocked a board window.</b> A game opened on FICS but its board couldn’t appear — allow popups for this site and re-observe.',
  'shell.blocked.showMe': 'Show me how',
  'shell.blocked.dismiss': 'dismiss',
  'shell.disconnect.relaunch': 'Relaunch',
  'shell.disconnect.body':
    'The connection to FICS closed. Relaunch restarts the app at the login screen — the chat console’s last lines say why the session ended (idle logout, kicked by a newer login, or the network dropped).',
  'shell.footer.session': 'session #{id}',
  'shell.footer.suggest': 'suggest a feature',
  'shell.footer.report': 'report an issue',

  // ---- options -----------------------------------------------------------
  'common.on': 'On',
  'common.off': 'Off',
  'common.auto': 'Auto',
  'common.preview': 'Preview',

  'options.session': 'Session',
  'options.session.chatWindow': 'Chat window',
  'options.session.reopen': 'Reopen',
  'options.session.chatNote':
    'The chat window auto-opens at login; reopen here if closed.',
  'options.session.connection': 'Connection',
  'options.session.reconnect': 'Reconnect',
  'options.session.connectionNote':
    'No-op while connected. Use it after another login kicks this session — it takes the account back (FICS kicks them in turn).',
  'options.session.startOver': 'Start over',
  'options.session.relaunch': 'Relaunch',
  'options.session.relaunchArmed': 'Click again to relaunch',
  'options.session.relaunchNote':
    'Disconnects, closes every window, and restarts the whole app at the login screen — auto-login is skipped for that one launch. Nothing else is changed or reset.',
  'options.session.autoLogin': 'Auto-login',
  'options.session.autoLoginNote':
    'Off shows the login screen on the next launch instead of connecting with the saved profile.',

  'options.board': 'Board',
  'options.board.colors': 'Colors',
  'options.board.lightSquares': 'Light squares',
  'options.board.darkSquares': 'Dark squares',
  'options.board.pieceSet': 'Piece set',
  'options.board.animations': 'Move animations',
  'options.board.coordinates': 'Show coordinates',
  'options.board.flipAsBlack': 'Flip when playing as black',
  'options.board.moveList': 'Move list visible',
  // Board palettes: the four plain colors translate, IC and Horsey are
  // names (lichess's), and Custom is the escape hatch.
  'boardTheme.brown': 'Brown',
  'boardTheme.blue': 'Blue',
  'boardTheme.green': 'Green',
  'boardTheme.purple': 'Purple',
  'boardTheme.custom': 'Custom',

  'options.clock': 'Clock colors',
  'options.clock.active': 'Active',
  'options.clock.low': 'Low on time',
  'options.clock.idle': 'Idle',
  'options.clock.note':
    'Auto follows the app theme (idle) and the stock green/red chips (active, low). Pick colors to override — background, then text.',
  'options.color.background': 'Background',
  'options.color.text': 'Text',
  'options.color.hex': '{title} (hex)',

  'options.console': 'Console',
  'options.console.font': 'Font',
  'options.console.fontFamilyTitle': 'CSS font-family for the chat window',
  'options.console.fontSizeTitle': 'Font size (px)',
  'options.console.channelTells': 'Channel tells',
  'options.console.tells': 'Tells',
  'options.console.shouts': 'Shouts',
  'options.console.kibitz': 'Kibitz / whisper',
  'options.console.challenges': 'Challenges',
  'options.console.gameStarts': 'Game starts',
  'options.console.gameEnds': 'Game ends',
  'options.console.internal': 'Internal',
  'options.console.outbound': 'Your sends',
  'options.console.note':
    'Colors per message type; Auto is the stock palette. Open chat windows restyle live.',

  'options.defaults': 'Defaults',
  'options.defaults.all': 'All options',
  'options.defaults.reset': 'Reset to defaults',
  'options.defaults.resetArmed': 'Click again to confirm',
  'options.defaults.note':
    'Restores every option above — board colors, pieces, clock colors, toggles — to the shipped defaults. Login profiles are not touched.',

  'options.engine': 'Engine',
  'options.engine.available': 'Stockfish analysis available',
  'options.engine.note':
    'Only in observing, examining, and inactive modes — never while playing.',

  'options.sound': 'Sound',
  'options.sound.sounds': 'Sounds',
  'options.sound.keepAlive': 'Keep alive',
  'options.sound.keepAliveTitle':
    'sent (hidden) every 59 minutes while connected',
  'options.sound.moveSounds': 'Move sounds',
  'options.sound.movePreviewTitle':
    'play move, capture, check from the selected set',
  'options.sound.alerts': 'Alerts',
  'options.sound.alertPreviewTitle':
    'play tell, friend-arrives, friend-departs in the selected set’s style',
  'options.sound.note':
    'Moves, captures and checks use the selected set; game-end sounds stay on Piano. All sets are lichess’s freely licensed ones — the famous "standard" set is not freely licensed. Alerts — an incoming tell, a friend arriving or departing — are our own synthesized notes styled after the selected set.',

  'options.pgnJournal': 'PGN auto-save',
  'options.pgnJournal.append': 'Append games I play',
  'options.pgnJournal.appendNote':
    'Every game you PLAY is appended to one PGN file at game end — games you only watch or examine never reach it. Works in Chrome, Brave and Edge; other browsers save nothing.',
  'options.pgnJournal.file': 'Journal file',
  'options.pgnJournal.choose': 'Choose file…',
  'options.pgnJournal.change': 'Change file…',
  'options.pgnJournal.unsupported':
    'This browser has no File System Access API — auto-save is unavailable here.',
  'options.pgnJournal.chosenNote':
    'Games will be appended here at game end. If the browser ever asks again, re-choose the file to re-grant.',
  'options.pgnJournal.noneNote':
    'No file chosen yet — nothing is saved until you pick one.',

  'options.loginScript': 'Login script',
  'options.loginScript.note1':
    'Sent (hidden) after each login, one command per line; blank lines are skipped; applies to the next connect. Keep',
  'options.loginScript.note2':
    'LAST if you keep it — it seals interface settings, and anything after it is refused.',

  'options.channels': 'Channels',
  'options.channels.autoJoin': 'Auto-join on login',
  'options.channels.autoJoinNote': 'Comma-separated channel numbers.',
  'options.channels.backfill': 'History backfill',
  'options.channels.backfillNote':
    'Channel-log API (the chessascent bot). On chat-window open, each auto-join channel is backfilled with up to 24h of tells from before login — scroll up to read them. Empty disables.',

  // ---- help --------------------------------------------------------------
  'help.what.title': 'What is this page?',
  'help.what.body1':
    'This is the <b>Options & Help</b> surface. It’s not a launcher — the chat window auto-opens when you sign in, and board windows pop up automatically when you observe or play a game. Use the Options tab to change app preferences.',

  'help.popups.title': 'Allow popups (required)',
  'help.popups.intro':
    'Boards open when FICS says a game started — from a network event, not from your click — which is exactly what popup blockers block. Until this origin is allowed, observing a game logs a console line instead of opening a board. One-time fix:',
  'help.popups.chromium':
    'click the popup icon at the right end of the address bar when it appears and pick "Always allow pop-ups from this site". Or: Settings → Privacy → Site settings → Pop-ups and redirects → Add this site to "Allowed".',
  'help.popups.firefox':
    'a yellow bar appears when a popup is blocked; choose Preferences → "Allow pop-ups for this site". Or: Settings → Privacy & Security → Permissions → Block pop-up windows → Exceptions.',
  'help.popups.safari':
    'Safari → Settings → Websites → Pop-up Windows → set this site to Allow.',
  'help.popups.appmode1': 'In',
  'help.popups.appmode2':
    'mode (next section) popups from the app window inherit the allowance once the origin is allowed.',

  'help.commands.title': 'Script commands',
  'help.commands.intro':
    'A few lines the client handles itself (ported from Raptor’s aliases) — type them into any chat input:',
  'help.commands.clear1': 'fetches your list and removes every name on it, one',
  'help.commands.clear2': 'at a time.',
  'help.commands.tab1': 'opens a channel tab.',
  'help.commands.tab2': 'opens a person tab. Both are local: nothing is sent to the server.',
  'help.commands.rest1': 'Everything else goes to FICS as typed —',
  'help.commands.refLink': 'the FICS command reference',
  'help.commands.rest2': 'documents the whole command set.',

  'help.appmode.title': 'Hide the browser address bar (app mode)',
  'help.appmode.intro1':
    'Modern browsers require an address bar on regular tabs and popups for security. But Chromium-based browsers (Chrome, Brave, Edge) support an',
  'help.appmode.intro2':
    'launch flag that opens a given URL in a chromeless window — no URL bar, no tab strip, no menu. Create a shortcut that passes the flag and pin it to your taskbar/dock.',
  'help.appmode.baked1': 'The commands below are baked with',
  'help.appmode.baked2':
    '— the address you’re reading this from — so they’re copy-paste correct wherever the app is served.',
  'help.appmode.linux': 'Linux (GNOME / Pop!_OS / KDE)',
  'help.appmode.linux1': 'Create',
  'help.appmode.linux1b': 'with this content:',
  'help.appmode.linux2': 'Refresh the app menu:',
  'help.appmode.linux3':
    'Open Activities / app menu, search "Raptor3000", right-click → Pin to Dash or drag to your taskbar.',
  'help.appmode.linuxSub1': 'Substitute',
  'help.appmode.linuxSub2': 'with',
  'help.appmode.linuxSub3': 'or',
  'help.appmode.linuxSub4': 'if you use those instead.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'Right-click your desktop → New → Shortcut.',
  'help.appmode.windows2':
    'For the location, paste (adjust the path if your browser lives elsewhere):',
  'help.appmode.windows2b': 'For Chrome instead:',
  'help.appmode.windows3': 'Name it "Raptor3000", click Finish.',
  'help.appmode.windows4': 'Right-click the new shortcut → Pin to taskbar.',
  'help.appmode.windowsIcon1':
    '(Optional) Right-click the shortcut → Properties → Change Icon, point at a',
  'help.appmode.windowsIcon2': 'so it doesn’t look like Brave.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS doesn’t accept raw CLI flags on Dock shortcuts, so wrap the launch in a tiny',
  'help.appmode.macosIntro2': 'app:',
  'help.appmode.macos1a': 'Open',
  'help.appmode.macos1b': '→ New Document →',
  'help.appmode.macos2a': 'Add a',
  'help.appmode.macos2b': 'action. Paste (adjust the browser path if needed):',
  'help.appmode.macos2c': 'For Chrome:',
  'help.appmode.macos3a': 'Save as',
  'help.appmode.macos3b': 'into',
  'help.appmode.macos4a': 'Drag',
  'help.appmode.macos4b': 'into the Dock.',
  'help.appmode.macosIcon1': '(Optional) Right-click',
  'help.appmode.macosIcon2':
    'in Finder → Get Info → drag a custom icon onto the icon well for a distinct Dock look.',

  'help.about.title': 'About & licenses',
  'help.about.intro':
    'Raptor3000 is <b>MIT-licensed</b> — the third of a line after <b>Raptor</b> (SWT) and <b>Decaf</b> (Java). It stands on generously licensed shoulders:',
  'help.about.stockfish':
    '— the analysis engine, running in your browser as WebAssembly (GPL-3.0).',
  'help.about.chessops':
    '— lichess’s chess library: SAN, legality, replay (GPL-3.0-or-later).',
  'help.about.openings': '— the opening names and ECO codes (CC0 public domain).',
  'help.about.lichess':
    '— the piano sound set by Enigmahack (AGPL-3.0+) and the piece sets (cburnett by Colin M.L. Burnett and friends, each under its own license).',
  'help.about.fics':
    '— the Free Internet Chess Server this whole app exists to talk to. Be nice in channel 39.',
  'help.about.outro1': 'The complete inventory with exact licenses lives in',
  'help.about.outro2': 'in',
  'help.about.repoLink': 'the source repository',
  'help.about.outro3': '. Something broken or missing?',
  'help.about.reportLink': 'Report an issue',
  'help.about.outro4': 'or',
  'help.about.suggestLink': 'suggest a feature',

  'help.trouble.title': 'Troubleshooting',
  'help.trouble.addressBarTitle': 'Address bar still shows.',
  'help.trouble.addressBar1':
    'Modern browsers show a one-line origin strip at the top of popups regardless of features. The',
  'help.trouble.addressBar2':
    'mode above avoids it entirely for the main window. Popups opened from inside an app-mode window inherit the same chromeless treatment.',
  'help.trouble.blockerTitle': 'Popup blocker.',
  'help.trouble.blocker1': 'Allow popups for',
  'help.trouble.blocker2':
    '(or your prod host). In Brave: Settings → Privacy and security → Site settings → Pop-ups.',
  'help.trouble.shortcutTitle': 'Shortcut opens a regular tab, not an app window.',
  'help.trouble.shortcut1': 'Make sure the flag is',
  'help.trouble.shortcut2': 'with an',
  'help.trouble.shortcut3':
    'and no space, and the browser isn’t already running with a profile that overrides it.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
