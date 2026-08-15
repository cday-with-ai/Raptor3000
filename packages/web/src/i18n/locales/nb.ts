import type { Messages } from '../messages.js';

/** Norwegian Bokmål (Norsk). Judgment call: each browser’s own nb wording for the menu paths — Chrome «Forgrunnsvinduer og omdirigeringer», Firefox «sprettoppvinduer», Apple «popupvinduer» — while neutral prose says «popup-vinduer»; FICS jargon (tell, shout, seek, kibitz) stays English because that is what the server sends. */
const nb: Messages = {
  // ---- popup-porten: første møte, før innlogging -------------------------
  'gate.title': 'Nesten fremme…',
  'gate.demoChip': 'demo',
  'gate.intro':
    'Raptor3000 oppfører seg som et skrivebordsprogram — chat og hvert brett åpnes som <b>ekte vinduer</b>. Nettleseren din blokkerer dem, og det ordner seg med to klikk:',
  'gate.chromium.step1':
    'Finn dette ikonet helt til høyre i adressefeltet — det dukket opp akkurat nå:',
  'gate.chromium.step2':
    'Klikk på det, velg <b>Tillat alltid</b> og deretter <b>Ferdig</b>. Mer skal det ikke til.',
  'gate.chromium.caption':
    '(bare et bilde — det ekte sitter oppe i nettleserens eget felt)',
  'gate.firefox.step1': 'Det dukket nettopp opp en linje øverst på siden:',
  'gate.firefox.step2':
    'Klikk på <b>Innstillinger</b> og velg <b>Tillat sprettoppvinduer for dette nettstedet</b>.',
  'gate.firefox.caption':
    '(bare et bilde — den ekte linjen er Firefox sin egen, over siden)',
  'gate.watching':
    'Du trenger ikke si fra til noen — denne skjermen sjekker selv, og trer til side i det øyeblikket vinduer er tillatt.',
  'gate.others': 'Bruker du en annen nettleser?',
  'gate.testAgain': 'Test på nytt',
  'gate.stuck': 'Står du fortsatt fast?',
  'gate.report': 'meld fra',
  'gate.demo.allowed': 'demo — denne nettleseren akkurat nå: popup-vinduer tillatt',
  'gate.demo.blocked': 'demo — denne nettleseren akkurat nå: popup-vinduer blokkert',
  'gate.allowed.title': 'Popup-vinduer tillatt',
  'gate.allowed.body': 'Brett- og chatvinduer kommer til å åpne seg. God fornøyelse.',

  // Per-nettleser-veiledning: menyordlyden er den hver enkelt nettleser
  // faktisk bruker på norsk; pilene og rekkefølgen bærer stien.
  'dir.chromium.steps':
    'Klikk på popup-ikonet helt til høyre i adressefeltet og velg «Tillat alltid forgrunnsvinduer og omdirigeringer fra dette nettstedet», deretter Ferdig. (Eller: Innstillinger → Personvern og sikkerhet → Nettstedsinnstillinger → Forgrunnsvinduer og omdirigeringer → legg til dette nettstedet.)',
  'dir.firefox.steps':
    'Det dukker opp en linje øverst når et sprettoppvindu blokkeres — velg Innstillinger → «Tillat sprettoppvinduer for dette nettstedet». (Eller: Innstillinger → Personvern og sikkerhet → Tillatelser → Blokker sprettoppvinduer → Unntak.)',
  'dir.safari.steps':
    'Safari-menyen → Innstillinger → Nettsteder → Popupvinduer → sett dette nettstedet til Tillat.',
  'dir.ios.steps':
    'Innstillinger-appen → Safari → slå AV «Blokker popupvinduer». (Ærlig advarsel: telefoner får nettleserfaner i stedet for vinduer — den ekte opplevelsen krever en datamaskin.)',
  'dir.android.steps':
    '⋮-menyen → Innstillinger → Nettstedsinnstillinger → Forgrunnsvinduer og omdirigeringer → tillat. (Samme ærlige advarsel — faner, ikke vinduer.)',

  // ---- innloggingsskjermen -----------------------------------------------
  'login.tagline': 'Logg inn på FICS',
  'login.profile': 'Profil',
  'login.handle': 'Brukernavn',
  'login.password': 'Passord',
  'login.server': 'Server',
  'login.port': 'Port',
  'login.guest': 'Gjesteinnlogging',
  'login.timeseal': 'Timeseal aktivert',
  'login.autoConnect': 'Logg meg inn automatisk neste gang',
  'login.submit': 'Logg inn',
  'login.err.handleLength': 'Brukernavnet må være 3 til 17 tegn.',
  'login.err.handleLetters': 'Brukernavnet kan bare inneholde bokstaver.',
  'login.err.noHandle': 'Skriv inn et brukernavn, eller huk av for gjesteinnlogging.',
  'login.err.noPassword': 'Skriv inn et passord.',
  'login.shot.observing': 'observerer et parti med motoranalyse',
  'login.shot.playing': 'spiller et lynparti',
  'login.shot.chat': 'chatkonsollen i delt visning',
  'login.shot.seek': 'seek-grafen i sanntid',

  // ---- språkvelgeren ------------------------------------------------------
  'lang.label': 'Språk',
  'lang.auto': 'Automatisk',
  'lang.note':
    'Grensesnittspråket for denne skjermen, alternativene og hjelpen. Automatisk følger nettleseren din. Tekst fra sjakkserveren — tells, kanaler, partiresultater — kommer fra FICS på engelsk uansett hva du velger.',

  // ---- mobil-stoppskjermen ------------------------------------------------
  'mobile.title': 'Raptor3000 er et skrivebordsprogram',
  'mobile.body1':
    'Brett og chat åpnes som <b>ekte nettleservinduer</b>, styrt direkte fra sjakkserveren — det klarer ikke telefoner, så appen virker ikke her.',
  'mobile.body2': 'På en datamaskin: gå til <b>raptor3000.pages.dev</b>.',
  'mobile.tryAnyway': 'Jeg har tastatur og lave forventninger — prøv likevel',

  // ---- skallet etter innlogging -------------------------------------------
  'shell.nav.options': 'Alternativer',
  'shell.nav.help': 'Hjelp',
  'shell.signedIn': 'Innlogget som <b>{who}</b> · {server}:{port} · profil {profile}',
  'shell.who.anonGuest': 'anonym gjest',
  'shell.who.namedGuest': '{name} (gjest)',
  'shell.theme.light': 'Dag',
  'shell.theme.dark': 'Natt',
  'shell.theme.system': 'System',
  'shell.theme.aria': 'Tema: {mode}. Klikk for å bytte.',
  'shell.blocked.text':
    '<b>Nettleseren din blokkerte et brettvindu.</b> Et parti startet på FICS, men brettet fikk ikke vist seg — tillat popup-vinduer for dette nettstedet og observer på nytt.',
  'shell.blocked.showMe': 'Vis meg hvordan',
  'shell.blocked.dismiss': 'lukk',
  'shell.disconnect.relaunch': 'Start på nytt',
  'shell.disconnect.body':
    'Forbindelsen til FICS ble lukket. «Start på nytt» starter appen igjen på innloggingsskjermen — de siste linjene i chatkonsollen forteller hvorfor økten tok slutt (utlogget etter inaktivitet, kastet ut av en nyere innlogging, eller nettverket falt ut).',
  'shell.footer.session': 'økt #{id}',
  'shell.footer.suggest': 'foreslå en funksjon',
  'shell.footer.report': 'rapporter et problem',

  // ---- alternativer --------------------------------------------------------
  'common.on': 'På',
  'common.off': 'Av',
  'common.auto': 'Auto',
  'common.preview': 'Forhåndsvis',

  'options.session': 'Økt',
  'options.session.chatWindow': 'Chatvindu',
  'options.session.reopen': 'Åpne på nytt',
  'options.session.chatNote':
    'Chatvinduet åpnes automatisk ved innlogging; åpne det her igjen om det er lukket.',
  'options.session.connection': 'Tilkobling',
  'options.session.reconnect': 'Koble til på nytt',
  'options.session.connectionNote':
    'Gjør ingenting mens du er tilkoblet. Bruk den etter at en annen innlogging har kastet ut denne økten — den tar kontoen tilbake (FICS kaster dem ut i sin tur).',
  'options.session.startOver': 'Start forfra',
  'options.session.relaunch': 'Start på nytt',
  'options.session.relaunchArmed': 'Klikk igjen for å starte på nytt',
  'options.session.relaunchNote':
    'Kobler fra, lukker alle vinduer og starter hele appen på nytt på innloggingsskjermen — automatisk innlogging hoppes over den ene gangen. Ingenting annet endres eller nullstilles.',
  'options.session.autoLogin': 'Automatisk innlogging',
  'options.session.autoLoginNote':
    'Av viser innloggingsskjermen ved neste oppstart i stedet for å koble til med den lagrede profilen.',

  'options.board': 'Brett',
  'options.board.colors': 'Farger',
  'options.board.lightSquares': 'Lyse felter',
  'options.board.darkSquares': 'Mørke felter',
  'options.board.pieceSet': 'Brikkesett',
  'options.board.animations': 'Trekkanimasjoner',
  'options.board.coordinates': 'Vis koordinater',
  'options.board.flipAsBlack': 'Snu brettet når du spiller svart',
  'options.board.moveList': 'Trekkliste synlig',
  // Brettpaletter: de fire rene fargene oversettes, IC og Horsey er navn
  // (lichess sine), og Egendefinert er nødutgangen.
  'boardTheme.brown': 'Brun',
  'boardTheme.blue': 'Blå',
  'boardTheme.green': 'Grønn',
  'boardTheme.purple': 'Lilla',
  'boardTheme.custom': 'Egendefinert',

  'options.clock': 'Klokkefarger',
  'options.clock.active': 'Aktiv',
  'options.clock.low': 'Tidsnød',
  'options.clock.idle': 'Inaktiv',
  'options.clock.note':
    'Auto følger apptemaet (inaktiv) og de innebygde grønne/røde merkene (aktiv, tidsnød). Velg farger for å overstyre — bakgrunn, deretter tekst.',
  'options.color.background': 'Bakgrunn',
  'options.color.text': 'Tekst',
  'options.color.hex': '{title} (hex)',

  'options.console': 'Konsoll',
  'options.console.font': 'Skrift',
  'options.console.fontFamilyTitle': 'CSS font-family for chatvinduet',
  'options.console.fontSizeTitle': 'Skriftstørrelse (px)',
  'options.console.channelTells': 'Kanal-tells',
  'options.console.tells': 'Tells',
  'options.console.shouts': 'Shouts',
  'options.console.kibitz': 'Kibitz / whisper',
  'options.console.challenges': 'Utfordringer',
  'options.console.gameStarts': 'Partistart',
  'options.console.gameEnds': 'Partislutt',
  'options.console.internal': 'Internt',
  'options.console.outbound': 'Det du sender',
  'options.console.note':
    'Farger per meldingstype; Auto er standardpaletten. Åpne chatvinduer skifter stil umiddelbart.',

  'options.defaults': 'Standardinnstillinger',
  'options.defaults.all': 'Alle alternativer',
  'options.defaults.reset': 'Tilbakestill til standard',
  'options.defaults.resetArmed': 'Klikk igjen for å bekrefte',
  'options.defaults.note':
    'Setter alle alternativene ovenfor — brettfarger, brikker, klokkefarger, brytere — tilbake til slik de kom fra fabrikken. Innloggingsprofiler røres ikke.',

  'options.engine': 'Motor',
  'options.engine.available': 'Stockfish-analyse tilgjengelig',
  'options.engine.note':
    'Bare i modusene observering, undersøkelse og inaktiv — aldri mens du spiller.',

  'options.sound': 'Lyd',
  'options.sound.sounds': 'Lyder',
  'options.sound.keepAlive': 'Hold i live',
  'options.sound.keepAliveTitle':
    'sendes (skjult) hvert 59. minutt mens du er tilkoblet',
  'options.sound.moveSounds': 'Trekklyder',
  'options.sound.movePreviewTitle':
    'spill trekk, slag og sjakk fra det valgte settet',
  'options.sound.alerts': 'Varsler',
  'options.sound.alertPreviewTitle':
    'spill tell, venn ankommer og venn drar i stilen til det valgte settet',
  'options.sound.note':
    'Trekk, slag og sjakk bruker det valgte settet; lydene ved partislutt holder seg til Piano. Alle settene er lichess sine fritt lisensierte — det berømte «standard»-settet er ikke fritt lisensiert. Varsler — en innkommende tell, en venn som kommer eller går — er våre egne syntetiserte toner i stil med det valgte settet.',

  'options.loginScript': 'Innloggingsskript',
  'options.loginScript.note1':
    'Sendes (skjult) etter hver innlogging, én kommando per linje; tomme linjer hoppes over; gjelder fra neste tilkobling. Legg',
  'options.loginScript.note2':
    'SIST om du bruker den — den forsegler grensesnittinnstillingene, og alt som kommer etter, blir avvist.',

  'options.channels': 'Kanaler',
  'options.channels.autoJoin': 'Bli med automatisk ved innlogging',
  'options.channels.autoJoinNote': 'Kanalnumre atskilt med komma.',
  'options.channels.backfill': 'Etterfylling av historikk',
  'options.channels.backfillNote':
    'Kanallogg-API (chessascent-boten). Når chatvinduet åpnes, etterfylles hver automatisk kanal med opptil 24 timer med tells fra før innlogging — bla opp for å lese dem. Tomt felt slår det av.',

  // ---- hjelp ---------------------------------------------------------------
  'help.what.title': 'Hva er denne siden?',
  'help.what.body1':
    'Dette er siden for <b>Alternativer og hjelp</b>. Den er ingen startmeny — chatvinduet åpnes automatisk når du logger inn, og brettvinduer spretter opp av seg selv når du observerer eller spiller et parti. Bruk Alternativer-fanen til å endre appinnstillinger.',

  'help.popups.title': 'Tillat popup-vinduer (påkrevd)',
  'help.popups.intro':
    'Brett åpnes når FICS melder at et parti har startet — fra en nettverkshendelse, ikke fra et klikk — og det er nøyaktig det popup-blokkere blokkerer. Frem til dette nettstedet er tillatt, fører observering av et parti bare til en linje i konsollen i stedet for et brettvindu. Engangsfiks:',
  'help.popups.chromium':
    'klikk på popup-ikonet helt til høyre i adressefeltet når det dukker opp, og velg «Tillat alltid forgrunnsvinduer og omdirigeringer fra dette nettstedet». Eller: Innstillinger → Personvern og sikkerhet → Nettstedsinnstillinger → Forgrunnsvinduer og omdirigeringer → legg til dette nettstedet under «Har lov til å sende forgrunnsvinduer og bruke omdirigeringer».',
  'help.popups.firefox':
    'en gul linje dukker opp når et sprettoppvindu blokkeres; velg Innstillinger → «Tillat sprettoppvinduer for dette nettstedet». Eller: Innstillinger → Personvern og sikkerhet → Tillatelser → Blokker sprettoppvinduer → Unntak.',
  'help.popups.safari':
    'Safari → Innstillinger → Nettsteder → Popupvinduer → sett dette nettstedet til Tillat.',
  'help.popups.appmode1': 'Med flagget',
  'help.popups.appmode2':
    '(neste avsnitt) arver popup-vinduer fra appvinduet tillatelsen så snart nettstedet er tillatt.',

  'help.commands.title': 'Skriptkommandoer',
  'help.commands.intro':
    'Noen få linjer klienten håndterer selv (portet fra Raptors aliaser) — skriv dem i et hvilket som helst chatfelt:',
  'help.commands.clear1': 'henter listen din og fjerner hvert navn på den, én',
  'help.commands.clear2': 'om gangen.',
  'help.commands.tab1': 'åpner en kanalfane.',
  'help.commands.tab2': 'åpner en personfane. Begge er lokale: ingenting sendes til serveren.',
  'help.commands.rest1': 'Alt annet går til FICS slik det er skrevet —',
  'help.commands.refLink': 'FICS-kommandoreferansen',
  'help.commands.rest2': 'dokumenterer hele kommandosettet.',

  'help.appmode.title': 'Skjul nettleserens adressefelt (app-modus)',
  'help.appmode.intro1':
    'Moderne nettlesere krever et adressefelt på vanlige faner og popup-vinduer av sikkerhetshensyn. Men Chromium-baserte nettlesere (Chrome, Brave, Edge) støtter',
  'help.appmode.intro2':
    '— et oppstartsflagg som åpner en gitt URL i et vindu uten nettleserramme: ingen adresselinje, ingen fanerad, ingen meny. Lag en snarvei som sender med flagget, og fest den til oppgavelinjen eller Dock.',
  'help.appmode.baked1': 'Kommandoene nedenfor er ferdig utfylt med',
  'help.appmode.baked2':
    '— adressen du leser dette fra — så de kan kopieres og limes rett inn, uansett hvor appen serveres fra.',
  'help.appmode.linux': 'Linux (GNOME / Pop!_OS / KDE)',
  'help.appmode.linux1': 'Opprett',
  'help.appmode.linux1b': 'med dette innholdet:',
  'help.appmode.linux2': 'Oppdater appmenyen:',
  'help.appmode.linux3':
    'Åpne Aktiviteter / appmenyen, søk etter «Raptor3000», høyreklikk → Legg til i favoritter, eller dra ikonet til oppgavelinjen.',
  'help.appmode.linuxSub1': 'Bytt ut',
  'help.appmode.linuxSub2': 'med',
  'help.appmode.linuxSub3': 'eller',
  'help.appmode.linuxSub4': 'om du bruker dem i stedet.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'Høyreklikk på skrivebordet → Ny → Snarvei.',
  'help.appmode.windows2':
    'Som plassering limer du inn (juster stien om nettleseren din ligger et annet sted):',
  'help.appmode.windows2b': 'For Chrome i stedet:',
  'help.appmode.windows3': 'Kall den «Raptor3000», og klikk Fullfør.',
  'help.appmode.windows4': 'Høyreklikk den nye snarveien → Fest til oppgavelinjen.',
  'help.appmode.windowsIcon1':
    '(Valgfritt) Høyreklikk snarveien → Egenskaper → Endre ikon, og pek den mot en fil av typen',
  'help.appmode.windowsIcon2': 'så den ikke ser ut som Brave.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS godtar ikke rene CLI-flagg på Dock-snarveier, så pakk oppstarten inn i en liten app du lager i',
  'help.appmode.macosIntro2': 'slik:',
  'help.appmode.macos1a': 'Åpne',
  'help.appmode.macos1b': '→ Nytt dokument →',
  'help.appmode.macos2a': 'Legg til handlingen',
  'help.appmode.macos2b': 'og lim inn (juster nettleserstien ved behov):',
  'help.appmode.macos2c': 'For Chrome:',
  'help.appmode.macos3a': 'Lagre som',
  'help.appmode.macos3b': 'i',
  'help.appmode.macos4a': 'Dra',
  'help.appmode.macos4b': 'inn i Dock.',
  'help.appmode.macosIcon1': '(Valgfritt) Høyreklikk',
  'help.appmode.macosIcon2':
    'i Finder → Vis info → dra et eget ikon over på det lille ikonet øverst, så skiller den seg ut i Dock.',

  'help.about.title': 'Om og lisenser',
  'help.about.intro':
    'Raptor3000 er <b>MIT-lisensiert</b> — tredjemann i rekken etter <b>Raptor</b> (SWT) og <b>Decaf</b> (Java). Den står på sjenerøst lisensierte skuldre:',
  'help.about.stockfish':
    '— analysemotoren, som kjører i nettleseren din som WebAssembly (GPL-3.0).',
  'help.about.chessops':
    '— lichess sitt sjakkbibliotek: SAN, lovlighet, gjennomspilling (GPL-3.0-or-later).',
  'help.about.openings': '— åpningsnavnene og ECO-kodene (CC0, i det fri).',
  'help.about.lichess':
    '— pianolydsettet av Enigmahack (AGPL-3.0+) og brikkesettene (cburnett av Colin M.L. Burnett med flere, hvert under sin egen lisens).',
  'help.about.fics':
    '— Free Internet Chess Server, serveren hele denne appen finnes for å snakke med. Vær grei i kanal 39.',
  'help.about.outro1': 'Den fullstendige oversikten med nøyaktige lisenser ligger i',
  'help.about.outro2': 'i',
  'help.about.repoLink': 'kildekoderepoet',
  'help.about.outro3': '. Er noe ødelagt, eller mangler noe?',
  'help.about.reportLink': 'Rapporter et problem',
  'help.about.outro4': 'eller',
  'help.about.suggestLink': 'foreslå en funksjon',

  'help.trouble.title': 'Feilsøking',
  'help.trouble.addressBarTitle': 'Adressefeltet vises fortsatt.',
  'help.trouble.addressBar1':
    'Moderne nettlesere viser en smal stripe med nettstedets adresse øverst i popup-vinduer, uansett hvilke vindusinnstillinger man ber om. Flagget',
  'help.trouble.addressBar2':
    'i avsnittet ovenfor fjerner den helt for hovedvinduet. Popup-vinduer som åpnes fra innsiden av et vindu i app-modus, arver den samme rammeløse behandlingen.',
  'help.trouble.blockerTitle': 'Popup-blokkering.',
  'help.trouble.blocker1': 'Tillat popup-vinduer for',
  'help.trouble.blocker2':
    '(eller din egen produksjonsvert). I Brave: Innstillinger → Personvern og sikkerhet → Nettstedsinnstillinger → Forgrunnsvinduer og omdirigeringer.',
  'help.trouble.shortcutTitle': 'Snarveien åpner en vanlig fane, ikke et appvindu.',
  'help.trouble.shortcut1': 'Sjekk at flagget er',
  'help.trouble.shortcut2': 'med et',
  'help.trouble.shortcut3':
    'og uten mellomrom, og at nettleseren ikke allerede kjører med en profil som overstyrer det.',
};

export default nb;
