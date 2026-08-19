import type { Messages } from '../messages.js';

/** Romanian (Română). Judgment calls: informal "tu" throughout (a chess app, not an office); browser menu paths use each browser's real Romanian UI (Chrome's «Permite întotdeauna pop-up-urile și redirecționările de la acest site», Firefox's «Preferințe», Safari's «Ferestre pop-up», Windows' «Finalizare», GNOME's «Adaugă la favorite»); FICS jargon the player types or reads from the server (tell, shout, kibitz, whisper, keep alive, flag) stays in English. */
const ro: Messages = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': 'Aproape gata…',
  'gate.demoChip': 'demo',
  'gate.intro':
    'Raptor3000 funcționează ca o aplicație de desktop — chatul și fiecare tablă se deschid ca <b>ferestre reale</b>. Browserul tău le blochează, iar rezolvarea durează două clicuri:',
  'gate.chromium.step1':
    'Caută această pictogramă la capătul din dreapta al barei de adrese — tocmai a apărut:',
  'gate.chromium.step2':
    'Dă clic pe ea, alege <b>Permite întotdeauna</b>, apoi <b>Gata</b>. Asta e tot.',
  'gate.chromium.caption':
    '(doar o imagine — cea reală este sus, în bara propriului tău browser)',
  'gate.firefox.step1': 'Tocmai a apărut o bară în partea de sus a paginii:',
  'gate.firefox.step2':
    'Dă clic pe <b>Preferințe</b> și alege <b>Permite pop-up-uri pentru acest site</b>.',
  'gate.firefox.caption':
    '(doar o imagine — bara reală este a Firefox-ului, deasupra paginii)',
  'gate.watching':
    'Nu trebuie să anunți pe nimeni — acest ecran se verifică singur și se dă la o parte în clipa în care ferestrele sunt permise.',
  'gate.others': 'Folosești alt browser?',
  'gate.testAgain': 'Testează din nou',
  'gate.stuck': 'Tot blocat?',
  'gate.report': 'raportează-l',
  'gate.demo.allowed': 'demo — acest browser chiar acum: pop-up-uri permise',
  'gate.demo.blocked': 'demo — acest browser chiar acum: pop-up-uri blocate',
  'gate.allowed.title': 'Pop-up-uri permise',
  'gate.allowed.body': 'Ferestrele de tablă și chat se vor deschide. Joc plăcut.',
  'gate.pic.allow': 'Permite întotdeauna pop-up-urile și redirecționările de la acest site',
  'gate.pic.blocking': 'Continuă blocarea',
  'gate.pic.done': 'Gata',
  'gate.pic.ffBar': 'Firefox a împiedicat acest site să deschidă o fereastră pop-up',
  'gate.pic.ffPrefs': 'Preferințe',
  'gate.pic.ffAllow': 'Permite pop-up-uri pentru raptor3000.pages.dev',
  'gate.pic.ffEdit': 'Editează opțiunile de blocare a pop-up-urilor…',

  'dir.chromium.steps':
    'Dă clic pe pictograma pop-up de la capătul din dreapta al barei de adrese și alege „Permite întotdeauna pop-up-urile și redirecționările de la acest site”, apoi Gata. (Sau: Setări → Confidențialitate și securitate → Setări site → Pop-up-uri și redirecționări → adaugă acest site.)',
  'dir.firefox.steps':
    'Când un pop-up este blocat apare o bară sus — alege Preferințe → „Permite pop-up-uri pentru acest site”. (Sau: Setări → Confidențialitate și securitate → Permisiuni → Blochează ferestrele pop-up → Excepții.)',
  'dir.safari.steps':
    'Meniul Safari → Setări → Site-uri web → Ferestre pop-up → setează acest site pe Permite.',
  'dir.ios.steps':
    'Aplicația Setări → Safari → dezactivează „Blochează pop-up-urile”. (Avertisment: pe telefon primești file de browser în loc de ferestre — experiența reală este pe desktop.)',
  'dir.android.steps':
    'Meniul ⋮ → Setări → Setări site → Pop-up-uri și redirecționări → permite. (Același avertisment — file, nu ferestre.)',

  // ---- login screen ------------------------------------------------------
  'login.tagline': 'Autentificare pe FICS',
  'login.profile': 'Profil',
  'login.handle': 'Nume de utilizator',
  'login.password': 'Parolă',
  'login.server': 'Server',
  'login.port': 'Port',
  'login.guest': 'Autentificare ca invitat',
  'login.timeseal': 'Timeseal activat',
  'login.autoConnect': 'Autentifică-mă automat data viitoare',
  'login.submit': 'Autentificare',
  'login.err.handleLength': 'Numele de utilizator trebuie să aibă între 3 și 17 caractere.',
  'login.err.handleLetters': 'Numele de utilizator trebuie să conțină doar litere.',
  'login.err.noHandle': 'Introdu un nume de utilizator sau bifează Autentificare ca invitat.',
  'login.err.noPassword': 'Introdu o parolă.',
  'login.shot.observing': 'urmărind o partidă cu analiză de motor',
  'login.shot.playing': 'jucând o partidă blitz',
  'login.shot.chat': 'consola de chat în vizualizare divizată',
  'login.shot.seek': 'graficul live al provocărilor',

  // ---- language control --------------------------------------------------
  'options.session.appIcon': 'Pictograma aplicației',
  'options.session.appIconNote':
    'Schimbă pictograma din fila browserului și insigna din aplicație. Pictograma lansatorului de pe desktop se setează în afara aplicației.',
  'lang.label': 'Limbă',
  'lang.auto': 'Automată',
  'lang.note':
    'Limba interfeței pentru acest ecran, opțiuni și ajutor. Automată urmează browserul tău. Textul serverului de șah — tells, canale, rezultate de partide — sosește de la FICS în engleză indiferent ce alegi.',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'Raptor3000 este o aplicație de desktop',
  'mobile.body1':
    'Tablele și chatul se deschid ca <b>ferestre reale de browser</b>, conduse live de serverul de șah — telefoanele nu pot face asta, deci aplicația nu funcționează aici.',
  'mobile.body2': 'Pe un computer, vizitează <b>raptor3000.pages.dev</b>.',
  'mobile.tryAnyway': 'Am tastatură și așteptări scăzute — încearcă oricum',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': 'Opțiuni',
  'shell.nav.help': 'Ajutor',
  'shell.signedIn': 'Autentificat ca <b>{who}</b> · {server}:{port} · profil {profile}',
  'shell.who.anonGuest': 'invitat anonim',
  'shell.who.namedGuest': '{name} (invitat)',
  'shell.theme.light': 'Zi',
  'shell.theme.dark': 'Noapte',
  'shell.theme.system': 'Sistem',
  'shell.theme.aria': 'Temă: {mode}. Dă clic pentru a comuta.',
  'shell.blocked.text':
    '<b>Browserul tău a blocat o fereastră de tablă.</b> O partidă a început pe FICS dar tabla ei nu a putut apărea — permite pop-up-urile pentru acest site și re-observă.',
  'shell.blocked.showMe': 'Arată-mi cum',
  'shell.blocked.dismiss': 'închide',
  'shell.disconnect.relaunch': 'Repornește',
  'shell.disconnect.body':
    'Conexiunea cu FICS s-a închis. Repornirea restaurează aplicația la ecranul de autentificare — ultimele rânduri din consola de chat spun de ce s-a terminat sesiunea (deconectare din inactivitate, dat afară de o autentificare mai nouă, sau rețeaua a căzut).',
  'shell.footer.session': 'sesiune #{id}',
  'shell.footer.suggest': 'sugerează o funcție',
  'shell.footer.report': 'raportează o problemă',

  // ---- options -----------------------------------------------------------
  'common.on': 'Da',
  'common.off': 'Nu',
  'common.auto': 'Auto',
  'common.preview': 'Previzualizare',

  'options.session': 'Sesiune',
  'options.session.startOver': 'Ia de la capăt',
  'options.session.relaunch': 'Repornește',
  'options.session.relaunchArmed': 'Dă clic din nou pentru a reporni',
  'options.session.relaunchNote':
    'Deconectează, închide fiecare fereastră și repornește întreaga aplicație la ecranul de autentificare — autentificarea automată este sărită pentru acel singur start. Nimic altceva nu se schimbă sau resetează.',
  'options.session.autoLogin': 'Autentificare automată',
  'options.session.autoLoginNote':
    'Dezactivat afișează ecranul de autentificare la următorul start în loc să conecteze cu profilul salvat.',

  'options.board': 'Tablă',
  'options.board.colors': 'Culori',
  'options.board.lightSquares': 'Câmpuri deschise',
  'options.board.darkSquares': 'Câmpuri închise',
  'options.board.pieceSet': 'Set de piese',
  'options.board.animations': 'Animații de mutări',
  'options.board.coordinates': 'Arată coordonatele',
  'options.board.flipAsBlack': 'Întoarce când joci cu negrul',
  'options.board.moveList': 'Listă de mutări vizibilă',
  'options.board.frame': 'Ramă',
  'options.board.frameNote':
    'Bordura din jurul pătratelor. Shadow e originalul. Lemnul și Mat pun literele pe bordură.',
  'boardTheme.brown': 'Maro',
  'boardTheme.blue': 'Albastru',
  'boardTheme.green': 'Verde',
  'boardTheme.purple': 'Violet',
  'boardTheme.custom': 'Personalizat',

  'options.clock': 'Ceasuri',
  'options.clock.design': 'Aspect',
  'options.clock.active': 'Activ',
  'options.clock.low': 'Timp scăzut',
  'options.clock.idle': 'Inactiv',
  'options.clock.note':
    'Un aspect e tot cadranul — font, carcasă, zi și noapte. Culorile Auto urmează acel aspect; alege culori ca să înlocuiești o stare.',
  'options.color.background': 'Fundal',
  'options.color.text': 'Text',
  'options.color.hex': '{title} (hex)',

  'options.console': 'Consolă',
  'options.console.font': 'Font',
  'options.console.fontFamilyTitle': 'CSS font-family pentru fereastra de chat',
  'options.console.fontSizeTitle': 'Dimensiune font (px)',
  'options.console.channelTells': 'Tells de canal',
  'options.console.tells': 'Tells',
  'options.console.shouts': 'Shouts',
  'options.console.kibitz': 'Kibitz / whisper',
  'options.console.challenges': 'Provocări',
  'options.console.gameStarts': 'Început de partide',
  'options.console.gameEnds': 'Sfârșit de partide',
  'options.console.internal': 'Intern',
  'options.console.outbound': 'Trimișii tale',
  'options.console.note':
    'Culori pe tip de mesaj; Auto este paleta standard. Ferestrele de chat deschise se recolorează live.',

  'options.defaults': 'Implicit',
  'options.defaults.all': 'Toate opțiunile',
  'options.defaults.reset': 'Resetează la implicit',
  'options.defaults.resetArmed': 'Dă clic din nou pentru confirmare',
  'options.defaults.note':
    'Restaurează fiecare opțiune de mai sus — culori de tablă, piese, culori de ceas, comutatoare — la valorile implicite. Profilele de autentificare nu sunt atinse.',

  'options.engine': 'Motor',
  'options.engine.available': 'Analiză Stockfish disponibilă',
  'options.engine.note':
    'Doar în modurile de observare, examinare și inactiv — niciodată în timpul jocului.',

  'options.sound': 'Sunet',
  'options.sound.sounds': 'Sunete',
  'options.sound.keepAlive': 'Keep alive',
  'options.sound.keepAliveTitle':
    'trimis (ascuns) la fiecare 59 de minute cât ești conectat',
  'options.sound.moveSounds': 'Sunete de mutări',
  'options.sound.movePreviewTitle': 'redă mutare, captură, șah din setul selectat',
  'options.sound.alerts': 'Alerte',
  'options.sound.alertPreviewTitle':
    'redă tell, sosirea și plecarea unui prieten în stilul setului selectat',
  'options.sound.note':
    'Mutările, capturile și șahul folosesc setul selectat. Felt, Walnut, Marble, Clock, Study, Slate și Piano își cântă și sunetele de sfârșit; Sfx / Futuristic / Nes cad pe Piano acolo. Cele șase palete numite sunt originale; celelalte patru sunt seturile libere Enigmahack de la lichess — celebrul set „standard” nu are licență liberă. Alertele — un tell care sosește, un prieten care sosește sau pleacă — sunt notele noastre sintetizate în stilul setului selectat.',
  'options.pgnJournal': 'Salvare automată PGN',
  'options.pgnJournal.append': 'Anexează partidele pe care le joc',
  'options.pgnJournal.appendNote':
    'Fiecare partidă pe care o JOCI este anexată la un singur fișier PGN la sfârșitul partidei — partidele doar urmărite sau examinate nu ajung niciodată acolo. Funcționează în Chrome, Brave și Edge; în alte browsere nu se salvează nimic.',
  'options.pgnJournal.file': 'Fișier jurnal',
  'options.pgnJournal.choose': 'Alege fișier…',
  'options.pgnJournal.change': 'Schimbă fișier…',
  'options.pgnJournal.unsupported':
    'Acest browser nu are API-ul File System Access — salvarea automată nu este disponibilă aici.',
  'options.pgnJournal.chosenNote':
    'Partidele vor fi anexate aici la sfârșit. Dacă browserul mai întreabă vreodată, realege fișierul pentru a re-acorda permisiunea.',
  'options.pgnJournal.noneNote':
    'Niciun fișier ales încă — nu se salvează nimic până nu alegi unul.',

  'options.loginScript': 'Script de autentificare',
  'options.loginScript.note1':
    'Trimis (ascuns) după fiecare autentificare, o comandă pe linie; liniile goale sunt sărite; se aplică la următoarea conectare. Păstrează',
  'options.loginScript.note2':
    'LAST dacă îl păstrezi — sigilează setările de interfață, iar orice vine după el este refuzat.',

  'options.channels': 'Canale',
  'options.channels.autoJoin': 'Intră automat la autentificare',
  'options.channels.autoJoinNote': 'Numere de canal separate prin virgule.',
  'options.channels.backfill': 'Istoric retroactiv',
  'options.channels.backfillNote':
    'API de jurnal de canale (botul chessascent). La deschiderea ferestrei de chat, fiecare canal de intrare automată este completat cu până la 24h de tells dinaintea autentificării — derulează în sus pentru a le citi. Gol dezactivează.',

  // ---- help --------------------------------------------------------------
  'help.what.title': 'Ce este această pagină?',
  'help.what.body1':
    'Aceasta este suprafața <b>Opțiuni și Ajutor</b>. Nu este un lansator — fereastra de chat se deschide automat când te autentifici, iar ferestrele de tablă apar automat când observi sau joci o partidă. Folosește fila Opțiuni pentru a schimba preferințele aplicației.',

  'help.popups.title': 'Permite pop-up-urile (obligatoriu)',
  'help.popups.intro':
    'Tablele se deschid când FICS spune că a început o partidă — dintr-un eveniment de rețea, nu din clicul tău — exact ceea ce blochează blocatoarele de pop-up. Până când acest domeniu nu este permis, observarea unei partide înregistrează o linie în consolă în loc să deschidă o tablă. Rezolvare unică:',
  'help.popups.chromium':
    'dă clic pe pictograma pop-up de la capătul din dreapta al barei de adrese când apare și alege „Permite întotdeauna pop-up-urile de la acest site”. Sau: Setări → Confidențialitate și securitate → Setări site → Pop-up-uri și redirecționări → adaugă acest site la „Permise”.',
  'help.popups.firefox':
    'o bară galbenă apare când un pop-up este blocat; alege Preferințe → „Permite pop-up-uri pentru acest site”. Sau: Setări → Confidențialitate și securitate → Permisiuni → Blochează ferestrele pop-up → Excepții.',
  'help.popups.safari':
    'Safari → Setări → Site-uri web → Ferestre pop-up → setează acest site pe Permite.',
  'help.popups.appmode1': 'În',
  'help.popups.appmode2':
    'mod (secțiunea următoare) pop-up-urile din fereastra aplicației moștenesc permisiunea odată ce domeniul este permis.',

  'help.commands.title': 'Comenzi de script',
  'help.commands.intro':
    'Câteva linii pe care clientul le gestionează singur (purtate din aliasurile Raptor) — scrie-le în orice câmp de chat:',
  'help.commands.clear1': 'îți aduce lista și elimină fiecare nume, unul',
  'help.commands.clear2': 'câte unul.',
  'help.commands.tab1': 'deschide o filă de canal.',
  'help.commands.tab2': 'deschide o filă de persoană. Ambele sunt locale: nimic nu se trimite la server.',
  'help.commands.rest1': 'Orice altceva merge la FICS exact cum ai scris —',
  'help.commands.refLink': 'referința comenzilor FICS',
  'help.commands.rest2': 'documentează întregul set de comenzi.',

  'help.appmode.title': 'Ascunde bara de adrese a browserului (mod aplicație)',
  'help.appmode.intro1':
    'Browserele moderne cer o bară de adrese pe filele și pop-up-urile obișnuite din motive de securitate. Dar browserele bazate pe Chromium (Chrome, Brave, Edge) suportă un',
  'help.appmode.intro2':
    'flag de lansare care deschide un anumit URL într-o fereastră fără chrom — fără bară de URL, fără bandă de file, fără meniu. Creează o scurtătură care transmite flag-ul și fixează-o în bara de activități/dock.',
  'help.appmode.baked1': 'Comenzile de mai jos sunt coapte cu',
  'help.appmode.baked2':
    '— adresa de la care citești — deci sunt corecte la copiere-lipire oriunde este servită aplicația.',
  'help.appmode.linux': 'Linux (GNOME / Pop!_OS / KDE)',
  'help.appmode.linux1': 'Creează',
  'help.appmode.linux1b': 'cu acest conținut:',
  'help.appmode.linux2': 'Reîmprospătează meniul de aplicații:',
  'help.appmode.linux3':
    'Deschide Activități / meniul de aplicații, caută „Raptor3000”, clic dreapta → Fixează în Dash sau trage în bara de activități.',
  'help.appmode.linuxSub1': 'Înlocuiește',
  'help.appmode.linuxSub2': 'cu',
  'help.appmode.linuxSub3': 'sau',
  'help.appmode.linuxSub4': 'dacă le folosești pe acelea.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'Clic dreapta pe desktop → Nou → Scurtătură.',
  'help.appmode.windows2':
    'Pentru locație, lipește (ajustează calea dacă browserul tău este în altă parte):',
  'help.appmode.windows2b': 'Pentru Chrome în schimb:',
  'help.appmode.windows3': 'Numește-o „Raptor3000”, dă clic pe Finalizare.',
  'help.appmode.windows4': 'Clic dreapta pe noua scurtătură → Fixează în bara de activități.',
  'help.appmode.windowsIcon1':
    '(Opțional) Clic dreapta pe scurtătură → Proprietăți → Schimbă pictograma, și indică un',
  'help.appmode.windowsIcon2': 'ca să nu arate ca Brave.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS nu acceptă flags CLI brute pe scurtăturile din Dock, deci înfășoară lansarea într-o minusculă',
  'help.appmode.macosIntro2': 'aplicație:',
  'help.appmode.macos1a': 'Deschide',
  'help.appmode.macos1b': '→ Document nou →',
  'help.appmode.macos2a': 'Adaugă o',
  'help.appmode.macos2b': 'acțiune. Lipește (ajustează calea browserului dacă e nevoie):',
  'help.appmode.macos2c': 'Pentru Chrome:',
  'help.appmode.macos3a': 'Salvează ca',
  'help.appmode.macos3b': 'în',
  'help.appmode.macos4a': 'Trage',
  'help.appmode.macos4b': 'în Dock.',
  'help.appmode.macosIcon1': '(Opțional) Clic dreapta',
  'help.appmode.macosIcon2':
    'în Finder → Informații → trage o pictogramă personalizată pe câmpul de pictogramă pentru un aspect distinct în Dock.',

  'help.about.title': 'Despre și licențe',
  'help.about.intro':
    'Raptor3000 este <b>sub licență MIT</b> — al treilea dintr-o linie după <b>Raptor</b> (SWT) și <b>Decaf</b> (Java). Stă pe umeri generos licențiați:',
  'help.about.stockfish':
    '— motorul de analiză, care rulează în browserul tău ca WebAssembly (GPL-3.0).',
  'help.about.chessops':
    '— biblioteca de șah a lichess: SAN, legalitate, redare (GPL-3.0-or-later).',
  'help.about.openings': '— numele deschiderilor și codurile ECO (CC0 domeniu public).',
  'help.about.lichess':
    '— seturile rămase piano / sfx / futuristic / nes ale lui Enigmahack (AGPL-3.0+) și seturile de piese (cburnett de Colin M.L. Burnett și prieteni, fiecare sub propria licență). Sunetele Felt, Walnut, Marble, Clock, Study și Slate, și seturile de piese Of Course I Still Love You, Just Read The Instructions și A Shortfall Of Gravitas, So Much For Subtlety, Very Little Gravitas Indeed, sunt originale în Raptor3000.',
  'help.about.fics':
    '— Free Internet Chess Server cu care există toată această aplicație ca să vorbească. Fii drăguț în canalul 39.',
  'help.about.outro1': 'Inventarul complet cu licențele exacte trăiește în',
  'help.about.outro2': 'în',
  'help.about.repoLink': 'depozitul sursă',
  'help.about.outro3': '. Ceva stricat sau lipsește?',
  'help.about.reportLink': 'Raportează o problemă',
  'help.about.outro4': 'sau',
  'help.about.suggestLink': 'sugerează o funcție',

  'help.trouble.title': 'Depanare',
  'help.trouble.addressBarTitle': 'Bara de adrese încă se afișează.',
  'help.trouble.addressBar1':
    'Browserele moderne arată o bandă de origine pe o linie în partea de sus a pop-up-urilor indiferent de funcții. Modul',
  'help.trouble.addressBar2':
    'de mai sus îl evită complet pentru fereastra principală. Pop-up-urile deschise dintr-o fereastră în mod aplicație moștenesc același tratament fără chrom.',
  'help.trouble.blockerTitle': 'Blocator de pop-up.',
  'help.trouble.blocker1': 'Permite pop-up-urile pentru',
  'help.trouble.blocker2':
    '(sau gazda ta de producție). În Brave: Setări → Confidențialitate și securitate → Setări site → Pop-up-uri.',
  'help.trouble.shortcutTitle': 'Scurtătura deschide o filă obișnuită, nu o fereastră de aplicație.',
  'help.trouble.shortcut1': 'Asigură-te că flag-ul este',
  'help.trouble.shortcut2': 'cu un',
  'help.trouble.shortcut3':
    'și fără spațiu, și că browserul nu rulează deja cu un profil care îl suprascrie.',
};

export default ro;