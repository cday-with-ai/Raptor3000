import type { Messages } from '../messages.js';

/** German (Deutsch). Judgment call: informal „du“ throughout (lowercase, lichess-style register — a chess app, not a bank); browser menu paths use each browser’s real German UI strings (Chrome’s „Datenschutz und Sicherheit“, Windows’ „Fertig stellen“, GNOME’s „Zu Favoriten hinzufügen“). */
const de: Messages = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': 'Fast geschafft…',
  'gate.demoChip': 'Demo',
  'gate.intro':
    'Raptor3000 fühlt sich an wie eine Desktop-App — Chat und jedes Brett öffnen sich als <b>echte Fenster</b>. Dein Browser blockiert die gerade noch, und die Abhilfe kostet zwei Klicks:',
  'gate.chromium.step1':
    'Such dieses Symbol am rechten Ende deiner Adressleiste — es ist gerade eben erschienen:',
  'gate.chromium.step2':
    'Klick darauf, wähl <b>Immer zulassen</b> und dann <b>Fertig</b>. Das war schon alles.',
  'gate.chromium.caption':
    '(nur ein Bild — das echte Symbol sitzt oben in der Leiste deines Browsers)',
  'gate.firefox.step1': 'Oben auf der Seite ist gerade eine Leiste erschienen:',
  'gate.firefox.step2':
    'Klick auf <b>Einstellungen</b> und wähl <b>Pop-ups für diese Website erlauben</b>.',
  'gate.firefox.caption':
    '(nur ein Bild — die echte Leiste gehört Firefox und sitzt über der Seite)',
  'gate.watching':
    'Du musst niemandem Bescheid sagen — dieser Bildschirm prüft von selbst und macht Platz, sobald Fenster erlaubt sind.',
  'gate.others': 'Du nutzt einen anderen Browser?',
  'gate.testAgain': 'Erneut testen',
  'gate.stuck': 'Klemmt es immer noch?',
  'gate.report': 'melde es',
  'gate.demo.allowed': 'Demo — dieser Browser, jetzt gerade: Pop-ups erlaubt',
  'gate.demo.blocked': 'Demo — dieser Browser, jetzt gerade: Pop-ups blockiert',
  'gate.allowed.title': 'Pop-ups erlaubt',
  'gate.allowed.body': 'Brett- und Chatfenster öffnen sich jetzt. Viel Spaß.',

  // Per-browser directions. Browser names are product names and stay as
  // they are; the menu paths are what the visitor will literally see in a
  // browser whose own UI may well be in their language — translate the
  // words, keep the arrows and the order.
  // The labels inside the address-bar mock. They are a picture of the
  // visitor's own browser, so an English picture under translated
  // instructions is the same dead end the translations were for.
  'gate.pic.allow': 'Pop-ups und Weiterleitungen von dieser Website immer zulassen',
  'gate.pic.blocking': 'Weiter blockieren',
  'gate.pic.done': 'Fertig',
  'gate.pic.ffBar': 'Firefox hat diese Website daran gehindert, ein Pop-up-Fenster zu öffnen',
  'gate.pic.ffPrefs': 'Einstellungen',
  'gate.pic.ffAllow': 'Pop-ups für raptor3000.pages.dev erlauben',
  'gate.pic.ffEdit': 'Pop-up-Blocker-Einstellungen bearbeiten…',

  'dir.chromium.steps':
    'Klick auf das Pop-up-Symbol am rechten Ende der Adressleiste und wähl "Pop-ups und Weiterleitungen von dieser Website immer zulassen", dann Fertig. (Oder: Einstellungen → Datenschutz und Sicherheit → Website-Einstellungen → Pop-ups und Weiterleitungen → diese Website hinzufügen.)',
  'dir.firefox.steps':
    'Wird ein Pop-up blockiert, erscheint oben eine Leiste — wähl dort Einstellungen → "Pop-ups für diese Website erlauben". (Oder: Einstellungen → Datenschutz & Sicherheit → Berechtigungen → Pop-up-Fenster blockieren → Ausnahmen.)',
  'dir.safari.steps':
    'Menü Safari → Einstellungen → Websites → Pop-Up-Fenster → diese Website auf Erlauben stellen.',
  'dir.ios.steps':
    'Einstellungen-App → Safari → "Pop-Ups blockieren" ausschalten. (Ehrliche Warnung: Handys bekommen Browser-Tabs statt Fenster — das echte Erlebnis wohnt auf dem Desktop.)',
  'dir.android.steps':
    'Menü ⋮ → Einstellungen → Website-Einstellungen → Pop-ups und Weiterleitungen → zulassen. (Gleiche Warnung — Tabs, keine Fenster.)',

  // ---- login screen ------------------------------------------------------
  'login.tagline': 'Bei FICS anmelden',
  'login.profile': 'Profil',
  'login.handle': 'Handle',
  'login.password': 'Passwort',
  'login.server': 'Server',
  'login.port': 'Port',
  'login.guest': 'Gast-Login',
  'login.timeseal': 'Timeseal aktiviert',
  'login.autoConnect': 'Beim nächsten Mal automatisch anmelden',
  'login.submit': 'Anmelden',
  'login.err.handleLength': 'Das Handle muss 3 bis 17 Zeichen lang sein.',
  'login.err.handleLetters': 'Das Handle darf nur Buchstaben enthalten.',
  'login.err.noHandle': 'Bitte gib ein Handle ein oder wähle Gast-Login.',
  'login.err.noPassword': 'Bitte gib ein Passwort ein.',
  'login.shot.observing': 'eine Partie mit Engine-Analyse beobachten',
  'login.shot.playing': 'eine Blitzpartie spielen',
  'login.shot.chat': 'die Chat-Konsole in geteilter Ansicht',
  'login.shot.seek': 'der Live-Seek-Graph',

  // ---- language control --------------------------------------------------
  'lang.label': 'Sprache',
  'lang.auto': 'Automatisch',
  'lang.note':
    'Die Oberflächensprache für diesen Bildschirm, die Optionen und die Hilfe. Automatisch richtet sich nach deinem Browser. Text vom Schachserver — Tells, Channels, Partieergebnisse — kommt von FICS auf Englisch, egal was du wählst.',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'Raptor3000 ist eine Desktop-App',
  'mobile.body1':
    'Bretter und Chat öffnen sich als <b>echte Browserfenster</b>, live gesteuert vom Schachserver — Handys können das nicht, also funktioniert die App hier nicht.',
  'mobile.body2': 'Öffne auf einem Computer <b>raptor3000.pages.dev</b>.',
  'mobile.tryAnyway': 'Ich habe eine Tastatur und niedrige Erwartungen — trotzdem versuchen',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': 'Optionen',
  'shell.nav.help': 'Hilfe',
  'shell.signedIn': 'Angemeldet als <b>{who}</b> · {server}:{port} · Profil {profile}',
  'shell.who.anonGuest': 'anonymer Gast',
  'shell.who.namedGuest': '{name} (Gast)',
  'shell.theme.light': 'Tag',
  'shell.theme.dark': 'Nacht',
  'shell.theme.system': 'System',
  'shell.theme.aria': 'Design: {mode}. Klicken zum Wechseln.',
  'shell.blocked.text':
    '<b>Dein Browser hat ein Brettfenster blockiert.</b> Auf FICS hat eine Partie begonnen, aber ihr Brett konnte nicht erscheinen — erlaube Pop-ups für diese Website und beobachte die Partie erneut.',
  'shell.blocked.showMe': 'Zeig mir, wie',
  'shell.blocked.dismiss': 'ausblenden',
  'shell.disconnect.relaunch': 'Neu starten',
  'shell.disconnect.body':
    'Die Verbindung zu FICS wurde beendet. Neu starten setzt die App am Login-Bildschirm wieder auf — die letzten Zeilen der Chat-Konsole verraten, warum die Sitzung endete (Logout wegen Inaktivität, von einem neueren Login verdrängt oder das Netzwerk war weg).',
  'shell.footer.session': 'Sitzung #{id}',
  'shell.footer.suggest': 'ein Feature vorschlagen',
  'shell.footer.report': 'ein Problem melden',

  // ---- options -----------------------------------------------------------
  'common.on': 'An',
  'common.off': 'Aus',
  'common.auto': 'Auto',
  'common.preview': 'Vorschau',

  'options.session': 'Sitzung',
  'options.session.chatWindow': 'Chatfenster',
  'options.session.reopen': 'Wieder öffnen',
  'options.session.chatNote':
    'Das Chatfenster öffnet sich beim Login von selbst; falls geschlossen, hier wieder öffnen.',
  'options.session.connection': 'Verbindung',
  'options.session.reconnect': 'Neu verbinden',
  'options.session.connectionNote':
    'Ohne Wirkung, solange die Verbindung steht. Gedacht für den Fall, dass ein anderer Login diese Sitzung rausgeworfen hat — der Knopf holt das Konto zurück (FICS wirft dann die andere Seite raus).',
  'options.session.startOver': 'Von vorn anfangen',
  'options.session.relaunch': 'Neu starten',
  'options.session.relaunchArmed': 'Zum Neustarten erneut klicken',
  'options.session.relaunchNote':
    'Trennt die Verbindung, schließt jedes Fenster und startet die ganze App am Login-Bildschirm neu — Auto-Login wird für diesen einen Start übersprungen. Sonst wird nichts geändert oder zurückgesetzt.',
  'options.session.autoLogin': 'Auto-Login',
  'options.session.autoLoginNote':
    'Aus zeigt beim nächsten Start den Login-Bildschirm, statt mit dem gespeicherten Profil zu verbinden.',

  'options.board': 'Brett',
  'options.board.colors': 'Farben',
  'options.board.lightSquares': 'Helle Felder',
  'options.board.darkSquares': 'Dunkle Felder',
  'options.board.pieceSet': 'Figurensatz',
  'options.board.animations': 'Zug-Animationen',
  'options.board.coordinates': 'Koordinaten anzeigen',
  'options.board.flipAsBlack': 'Brett drehen, wenn du Schwarz spielst',
  'options.board.moveList': 'Zugliste sichtbar',
  // Board palettes: the four plain colors translate, IC and Horsey are
  // names (lichess's), and Custom is the escape hatch.
  'boardTheme.brown': 'Braun',
  'boardTheme.blue': 'Blau',
  'boardTheme.green': 'Grün',
  'boardTheme.purple': 'Lila',
  'boardTheme.custom': 'Eigene',

  'options.clock': 'Uhrenfarben',
  'options.clock.active': 'Aktiv',
  'options.clock.low': 'Wenig Zeit',
  'options.clock.idle': 'Inaktiv',
  'options.clock.note':
    'Auto folgt dem App-Design (Inaktiv) und den mitgelieferten grünen/roten Chips (Aktiv, Wenig Zeit). Wähle eigene Farben zum Überschreiben — erst Hintergrund, dann Text.',
  'options.color.background': 'Hintergrund',
  'options.color.text': 'Text',
  'options.color.hex': '{title} (Hex)',

  'options.console': 'Konsole',
  'options.console.font': 'Schrift',
  'options.console.fontFamilyTitle': 'CSS font-family für das Chatfenster',
  'options.console.fontSizeTitle': 'Schriftgröße (px)',
  'options.console.channelTells': 'Channel-Tells',
  'options.console.tells': 'Tells',
  'options.console.shouts': 'Shouts',
  'options.console.kibitz': 'Kibitz / Whisper',
  'options.console.challenges': 'Herausforderungen',
  'options.console.gameStarts': 'Partiebeginn',
  'options.console.gameEnds': 'Partieende',
  'options.console.internal': 'Intern',
  'options.console.outbound': 'Von dir gesendet',
  'options.console.note':
    'Farben je Nachrichtentyp; Auto ist die mitgelieferte Palette. Offene Chatfenster übernehmen Änderungen live.',

  'options.defaults': 'Standardwerte',
  'options.defaults.all': 'Alle Optionen',
  'options.defaults.reset': 'Auf Standard zurücksetzen',
  'options.defaults.resetArmed': 'Zum Bestätigen erneut klicken',
  'options.defaults.note':
    'Setzt jede Option oben — Brettfarben, Figuren, Uhrenfarben, Schalter — auf die Auslieferungswerte zurück. Login-Profile bleiben unangetastet.',

  'options.engine': 'Engine',
  'options.engine.available': 'Stockfish-Analyse verfügbar',
  'options.engine.note':
    'Nur in den Modi Beobachten, Untersuchen und Inaktiv — nie beim Spielen.',

  'options.sound': 'Sound',
  'options.sound.sounds': 'Sounds',
  'options.sound.keepAlive': 'Keep-alive',
  'options.sound.keepAliveTitle':
    'wird (unsichtbar) alle 59 Minuten gesendet, solange die Verbindung steht',
  'options.sound.moveSounds': 'Zug-Sounds',
  'options.sound.movePreviewTitle':
    'spielt Zug, Schlag und Schach aus dem gewählten Satz',
  'options.sound.alerts': 'Hinweise',
  'options.sound.alertPreviewTitle':
    'spielt Tell, Freund-kommt und Freund-geht im Stil des gewählten Satzes',
  'options.sound.note':
    'Züge, Schläge und Schachgebote nutzen den gewählten Satz; Partieende-Sounds bleiben auf Piano. Alle Sätze sind die frei lizenzierten von lichess — der berühmte "standard"-Satz ist nicht frei lizenziert. Hinweise — ein eingehendes Tell, ein Freund kommt oder geht — sind unsere eigenen synthetisierten Töne im Stil des gewählten Satzes.',

  'options.loginScript': 'Login-Skript',
  'options.loginScript.note1':
    'Wird nach jedem Login (unsichtbar) gesendet, ein Befehl pro Zeile; Leerzeilen werden übersprungen; gilt ab dem nächsten Verbinden. Lass',
  'options.loginScript.note2':
    'als LETZTES stehen, falls du es behältst — es versiegelt die Interface-Einstellungen, und alles danach wird abgewiesen.',

  'options.channels': 'Channels',
  'options.channels.autoJoin': 'Beim Login automatisch beitreten',
  'options.channels.autoJoinNote': 'Channel-Nummern, durch Kommas getrennt.',
  'options.channels.backfill': 'Verlauf nachladen',
  'options.channels.backfillNote':
    'Channel-Log-API (der chessascent-Bot). Beim Öffnen des Chatfensters wird jeder Auto-Join-Channel mit bis zu 24 h an Tells aus der Zeit vor dem Login aufgefüllt — hochscrollen zum Lesen. Leer lassen schaltet es ab.',

  // ---- help --------------------------------------------------------------
  'help.what.title': 'Was ist diese Seite?',
  'help.what.body1':
    'Das hier ist die Oberfläche für <b>Optionen & Hilfe</b>. Sie ist kein Launcher — das Chatfenster öffnet sich beim Anmelden von selbst, und Brettfenster erscheinen automatisch, wenn du eine Partie beobachtest oder spielst. App-Einstellungen änderst du im Tab Optionen.',

  'help.popups.title': 'Pop-ups erlauben (erforderlich)',
  'help.popups.intro':
    'Bretter öffnen sich, wenn FICS einen Partiebeginn meldet — ausgelöst von einem Netzwerk-Ereignis, nicht von deinem Klick — und genau das blockieren Pop-up-Blocker. Solange diese Origin nicht erlaubt ist, erzeugt das Beobachten einer Partie nur eine Konsolenzeile statt eines Bretts. Die einmalige Lösung:',
  'help.popups.chromium':
    'klick auf das Pop-up-Symbol am rechten Ende der Adressleiste, sobald es erscheint, und wähl "Pop-ups und Weiterleitungen von dieser Website immer zulassen". Oder: Einstellungen → Datenschutz und Sicherheit → Website-Einstellungen → Pop-ups und Weiterleitungen → diese Website unter "Zulassen" hinzufügen.',
  'help.popups.firefox':
    'wird ein Pop-up blockiert, erscheint eine gelbe Leiste; wähl dort Einstellungen → "Pop-ups für diese Website erlauben". Oder: Einstellungen → Datenschutz & Sicherheit → Berechtigungen → Pop-up-Fenster blockieren → Ausnahmen.',
  'help.popups.safari':
    'Safari → Einstellungen → Websites → Pop-Up-Fenster → diese Website auf Erlauben stellen.',
  'help.popups.appmode1': 'Im',
  'help.popups.appmode2':
    'Modus (nächster Abschnitt) erben Pop-ups aus dem App-Fenster die Freigabe, sobald die Origin erlaubt ist.',

  'help.commands.title': 'Skript-Befehle',
  'help.commands.intro':
    'Ein paar Zeilen, die der Client selbst verarbeitet (portiert aus Raptors Aliassen) — tipp sie in ein beliebiges Chat-Eingabefeld:',
  'help.commands.clear1': 'holt deine Liste und entfernt jeden Namen darauf, ein',
  'help.commands.clear2': 'nach dem anderen.',
  'help.commands.tab1': 'öffnet einen Channel-Tab.',
  'help.commands.tab2': 'öffnet einen Tab für eine Person. Beide sind lokal: Es wird nichts an den Server gesendet.',
  'help.commands.rest1': 'Alles andere geht wie getippt an FICS —',
  'help.commands.refLink': 'die FICS-Befehlsreferenz',
  'help.commands.rest2': 'dokumentiert den gesamten Befehlssatz.',

  'help.appmode.title': 'Die Browser-Adressleiste verstecken (App-Modus)',
  'help.appmode.intro1':
    'Moderne Browser bestehen bei normalen Tabs und Pop-ups aus Sicherheitsgründen auf einer Adressleiste. Chromium-basierte Browser (Chrome, Brave, Edge) kennen aber den',
  'help.appmode.intro2':
    'Startparameter, der eine URL in einem schmucklosen Fenster öffnet — keine URL-Leiste, keine Tab-Leiste, kein Menü. Leg eine Verknüpfung an, die den Parameter übergibt, und heft sie an Taskleiste oder Dock.',
  'help.appmode.baked1': 'In die Befehle unten ist bereits',
  'help.appmode.baked2':
    'eingebacken — die Adresse, unter der du das hier liest — Kopieren und Einfügen stimmt also, egal wo die App ausgeliefert wird.',
  'help.appmode.linux': 'Linux (GNOME / Pop!_OS / KDE)',
  'help.appmode.linux1': 'Lege',
  'help.appmode.linux1b': 'mit diesem Inhalt an:',
  'help.appmode.linux2': 'Aktualisiere das App-Menü:',
  'help.appmode.linux3':
    'Öffne Aktivitäten / das App-Menü, such nach "Raptor3000", Rechtsklick → Zu Favoriten hinzufügen oder zieh es in deine Taskleiste.',
  'help.appmode.linuxSub1': 'Nutzt du stattdessen Chrome oder Edge, ersetze',
  'help.appmode.linuxSub2': 'durch',
  'help.appmode.linuxSub3': 'oder',
  'help.appmode.linuxSub4': 'in der Datei.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'Rechtsklick auf den Desktop → Neu → Verknüpfung.',
  'help.appmode.windows2':
    'Füge als Speicherort ein (pass den Pfad an, falls dein Browser woanders wohnt):',
  'help.appmode.windows2b': 'Für Chrome stattdessen:',
  'help.appmode.windows3': 'Nenn sie "Raptor3000", klick auf Fertig stellen.',
  'help.appmode.windows4': 'Rechtsklick auf die neue Verknüpfung → An Taskleiste anheften.',
  'help.appmode.windowsIcon1':
    '(Optional) Rechtsklick auf die Verknüpfung → Eigenschaften → Anderes Symbol — mit einer',
  'help.appmode.windowsIcon2': 'sieht sie nicht mehr aus wie Brave.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS akzeptiert an Dock-Verknüpfungen keine rohen CLI-Flags, also verpack den Start in eine kleine',
  'help.appmode.macosIntro2': 'App:',
  'help.appmode.macos1a': 'Öffne',
  'help.appmode.macos1b': '→ Neues Dokument →',
  'help.appmode.macos2a': 'Füge die Aktion',
  'help.appmode.macos2b': 'hinzu. Füge ein (pass den Browser-Pfad bei Bedarf an):',
  'help.appmode.macos2c': 'Für Chrome:',
  'help.appmode.macos3a': 'Sichere es als',
  'help.appmode.macos3b': 'in',
  'help.appmode.macos4a': 'Zieh',
  'help.appmode.macos4b': 'ins Dock.',
  'help.appmode.macosIcon1': '(Optional) Rechtsklick auf',
  'help.appmode.macosIcon2':
    'im Finder → Informationen → zieh ein eigenes Icon auf das kleine Symbol oben links, und der Dock-Eintrag ist unverwechselbar.',

  'help.about.title': 'Über & Lizenzen',
  'help.about.intro':
    'Raptor3000 ist <b>MIT-lizenziert</b> — das dritte einer Linie nach <b>Raptor</b> (SWT) und <b>Decaf</b> (Java). Es steht auf großzügig lizenzierten Schultern:',
  'help.about.stockfish':
    '— die Analyse-Engine, läuft in deinem Browser als WebAssembly (GPL-3.0).',
  'help.about.chessops':
    '— die Schachbibliothek von lichess: SAN, Zuglegalität, Replay (GPL-3.0-or-later).',
  'help.about.openings': '— die Eröffnungsnamen und ECO-Codes (CC0, Public Domain).',
  'help.about.lichess':
    '— der Piano-Soundsatz von Enigmahack (AGPL-3.0+) und die Figurensätze (cburnett von Colin M.L. Burnett und weitere, jeder unter eigener Lizenz).',
  'help.about.fics':
    '— der Free Internet Chess Server, für den diese ganze App überhaupt existiert. Sei nett in Channel 39.',
  'help.about.outro1': 'Das vollständige Inventar mit den exakten Lizenzen liegt in',
  'help.about.outro2': 'im',
  'help.about.repoLink': 'Quell-Repository',
  'help.about.outro3': '. Ist etwas kaputt oder fehlt etwas?',
  'help.about.reportLink': 'Melde ein Problem',
  'help.about.outro4': 'oder',
  'help.about.suggestLink': 'schlag ein Feature vor',

  'help.trouble.title': 'Fehlerbehebung',
  'help.trouble.addressBarTitle': 'Die Adressleiste ist immer noch zu sehen.',
  'help.trouble.addressBar1':
    'Moderne Browser zeigen oben an Pop-ups immer eine einzeilige Origin-Leiste, egal welche Fenster-Features man anfordert. Der oben beschriebene',
  'help.trouble.addressBar2':
    'Modus umgeht sie für das Hauptfenster komplett. Pop-ups, die aus einem App-Modus-Fenster heraus geöffnet werden, erben dieselbe rahmenlose Darstellung.',
  'help.trouble.blockerTitle': 'Pop-up-Blocker.',
  'help.trouble.blocker1': 'Erlaube Pop-ups für',
  'help.trouble.blocker2':
    '(oder deinen eigenen Host). In Brave: Einstellungen → Datenschutz und Sicherheit → Website-Einstellungen → Pop-ups.',
  'help.trouble.shortcutTitle': 'Die Verknüpfung öffnet einen normalen Tab statt eines App-Fensters.',
  'help.trouble.shortcut1': 'Stell sicher, dass das Flag wirklich',
  'help.trouble.shortcut2': 'heißt — mit',
  'help.trouble.shortcut3':
    'und ohne Leerzeichen — und dass der Browser nicht schon mit einem Profil läuft, das die Einstellung überstimmt.',
};

export default de;
