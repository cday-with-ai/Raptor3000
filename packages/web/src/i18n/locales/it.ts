import type { Messages } from '../messages.js';

/** Italian (Italiano). Judgment calls: informal "tu" throughout (a chess app, not an office); browser menu paths use each browser's real Italian UI (Chrome's «Consenti sempre i popup e i reindirizzamenti da questo sito», Firefox's «Preferenze», Safari's «Finestre popup», Windows' «Fine», GNOME's «Aggiungi alle preferiti»); FICS jargon the player types or reads from the server (tell, shout, kibitz, whisper, keep alive) stays in English. */
const it: Messages = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': 'Quasi fatto…',
  'gate.demoChip': 'demo',
  'gate.intro':
    'Raptor3000 funziona come un\u2019applicazione desktop: la chat e ogni scacchiera si aprono come <b>vere finestre</b>. Il tuo browser le sta bloccando, e per sistemarlo bastano due clic:',
  'gate.chromium.step1':
    'Trova questa icona all\u2019estremità destra della barra degli indirizzi: è apparsa adesso:',
  'gate.chromium.step2':
    'Fai clic su di essa, scegli <b>Consenti sempre</b>, poi <b>Fine</b>. Tutto qui.',
  'gate.chromium.caption':
    '(solo un\u2019immagine: quella vera è nella barra del tuo browser)',
  'gate.firefox.step1': 'In cima alla pagina è appena comparsa una barra:',
  'gate.firefox.step2':
    'Fai clic su <b>Preferenze</b> e scegli <b>Consenti popup per questo sito</b>.',
  'gate.firefox.caption':
    '(solo un\u2019immagine: la barra vera è di Firefox ed è sopra la pagina)',
  'gate.watching':
    'Non devi avvisare nessuno: questa schermata verifica da sola e si toglie di mezzo nel momento in cui le finestre sono permesse.',
  'gate.others': 'Usi un altro browser?',
  'gate.testAgain': 'Riprova',
  'gate.stuck': 'Ancora bloccato?',
  'gate.report': 'segnalalo',
  'gate.demo.allowed': 'demo — questo browser in questo momento: popup consentiti',
  'gate.demo.blocked': 'demo — questo browser in questo momento: popup bloccati',
  'gate.allowed.title': 'Popup consentiti',
  'gate.allowed.body': 'Le finestre delle scacchiere e della chat si apriranno. Buona partita.',
  'gate.pic.allow': 'Consenti sempre i popup e i reindirizzamenti da questo sito',
  'gate.pic.blocking': 'Continua a bloccare',
  'gate.pic.done': 'Fine',
  'gate.pic.ffBar': 'Firefox ha impedito a questo sito di aprire una finestra popup',
  'gate.pic.ffPrefs': 'Preferenze',
  'gate.pic.ffAllow': 'Consenti i popup per raptor3000.pages.dev',
  'gate.pic.ffEdit': 'Modifica le opzioni del blocco popup…',

  'dir.chromium.steps':
    'Fai clic sull\u2019icona popup all\u2019estremità destra della barra degli indirizzi e scegli "Consenti sempre i popup e i reindirizzamenti da questo sito", poi Fine. (In alternativa: Impostazioni → Privacy e sicurezza → Impostazioni sito → Popup e reindirizzamenti → aggiungi questo sito.)',
  'dir.firefox.steps':
    'Quando un popup viene bloccato compare una barra in alto: scegli Preferenze → "Consenti popup per questo sito". (In alternativa: Impostazioni → Privacy e sicurezza → Autorizzazioni → Blocca le finestre popup → Eccezioni.)',
  'dir.safari.steps':
    'Menu Safari → Impostazioni → Siti web → Finestre popup → imposta questo sito su Consenti.',
  'dir.ios.steps':
    'App Impostazioni → Safari → disattiva "Blocca i popup". (Avvertenza: sul telefono si ottengono schede del browser invece di finestre: l\u2019esperienza vera è su desktop.)',
  'dir.android.steps':
    'Menu ⋮ → Impostazioni → Impostazioni sito → Popup e reindirizzamenti → consenti. (Stessa avvertenza: schede, non finestre.)',

  // ---- login screen ------------------------------------------------------
  'login.tagline': 'Accedi a FICS',
  'login.profile': 'Profilo',
  'login.handle': 'Nome utente',
  'login.password': 'Password',
  'login.server': 'Server',
  'login.port': 'Porta',
  'login.guest': 'Accesso ospite',
  'login.timeseal': 'Timeseal attivo',
  'login.autoConnect': 'Accedi automaticamente la prossima volta',
  'login.submit': 'Accedi',
  'login.err.handleLength': 'Il nome utente deve avere da 3 a 17 caratteri.',
  'login.err.handleLetters': 'Il nome utente può contenere solo lettere.',
  'login.err.noHandle': 'Inserisci un nome utente o spunta Accesso ospite.',
  'login.err.noPassword': 'Inserisci una password.',
  'login.shot.observing': 'a osservare una partita con analisi del motore',
  'login.shot.playing': 'a giocare una partita lampo',
  'login.shot.chat': 'la console di chat in vista divisa',
  'login.shot.seek': 'il grafico delle sfide in tempo reale',

  // ---- language control --------------------------------------------------
  'options.session.appIcon': 'Icona dell’app',
  'options.session.appIconNote':
    'Cambia l’icona nella scheda del browser e il badge dentro l’app. L’icona del lanciatore sul desktop si imposta fuori dall’app.',
  'lang.label': 'Lingua',
  'lang.auto': 'Automatica',
  'lang.note':
    'La lingua dell\u2019interfaccia per questa schermata, le opzioni e la guida. Automatica segue il tuo browser. Il testo del server di scacchi — tells, canali, risultati delle partite — arriva da FICS in inglese qualunque cosa scegli.',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'Raptor3000 è un\u2019applicazione desktop',
  'mobile.body1':
    'Scacchiere e chat si aprono come <b>vere finestre del browser</b>, pilotate in diretta dal server di scacchi: i telefoni non possono farlo, quindi l\u2019app qui non funziona.',
  'mobile.body2': 'Su un computer visita <b>raptor3000.pages.dev</b>.',
  'mobile.tryAnyway': 'Ho una tastiera e basse aspettative: provo comunque',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': 'Opzioni',
  'shell.nav.help': 'Aiuto',
  'shell.signedIn': 'Connesso come <b>{who}</b> · {server}:{port} · profilo {profile}',
  'shell.who.anonGuest': 'ospite anonimo',
  'shell.who.namedGuest': '{name} (ospite)',
  'shell.theme.light': 'Chiaro',
  'shell.theme.dark': 'Scuro',
  'shell.theme.system': 'Sistema',
  'shell.theme.aria': 'Tema: {mode}. Fai clic per cambiare.',
  'shell.blocked.text':
    '<b>Il tuo browser ha bloccato una finestra della scacchiera.</b> Una partita è iniziata su FICS ma la sua scacchiera non è potuta comparire: consenti i popup per questo sito e riosserva.',
  'shell.blocked.showMe': 'Mostrami come',
  'shell.blocked.dismiss': 'chiudi',
  'shell.disconnect.relaunch': 'Riavvia',
  'shell.disconnect.body':
    'La connessione a FICS si è chiusa. Riavvia riavvia l\u2019app alla schermata di accesso — le ultime righe della console di chat dicono perché la sessione è finita (logout per inattività, espulsione per un nuovo accesso, o rete caduta).',
  'shell.footer.session': 'sessione #{id}',
  'shell.footer.suggest': 'suggerisci una funzione',
  'shell.footer.report': 'segnala un problema',

  // ---- options -----------------------------------------------------------
  'common.on': 'Sì',
  'common.off': 'No',
  'common.auto': 'Auto',
  'common.preview': 'Anteprima',

  'options.session': 'Sessione',
  'options.session.startOver': 'Ricomincia',
  'options.session.relaunch': 'Riavvia',
  'options.session.relaunchArmed': 'Fai di nuovo clic per riavviare',
  'options.session.relaunchNote':
    'Disconnette, chiude ogni finestra e riavvia l\u2019intera app alla schermata di accesso — l\u2019accesso automatico è saltato per quel singolo avvio. Nient\u2019altro viene modificato o ripristinato.',
  'options.session.autoLogin': 'Accesso automatico',
  'options.session.autoLoginNote':
    'Se disattivo, al prossimo avvio compare la schermata di accesso invece di connettersi con il profilo salvato.',

  'options.board': 'Scacchiera',
  'options.board.colors': 'Colori',
  'options.board.lightSquares': 'Case chiare',
  'options.board.darkSquares': 'Case scure',
  'options.board.pieceSet': 'Set di pezzi',
  'options.board.animations': 'Animazioni delle mosse',
  'options.board.coordinates': 'Mostra coordinate',
  'options.board.flipAsBlack': 'Ruota quando giochi col nero',
  'options.board.moveList': 'Elenco mosse visibile',
  'options.board.frame': 'Cornice',
  'options.board.frameNote':
    'Il bordo intorno alle case. Shadow è l’originale. Legno e Mat mettono le lettere sul bordo.',
  'boardTheme.brown': 'Marrone',
  'boardTheme.blue': 'Blu',
  'boardTheme.green': 'Verde',
  'boardTheme.purple': 'Viola',
  'boardTheme.custom': 'Personalizzato',

  'options.clock': 'Orologi',
  'options.clock.design': 'Aspetto',
  'options.clock.active': 'Attivo',
  'options.clock.low': 'Tempo basso',
  'options.clock.idle': 'Inattivo',
  'options.clock.note':
    'Un aspetto è tutto il quadrante: carattere, cassa, giorno e notte. I colori Auto seguono quell\u2019aspetto; scegli i colori per sostituire uno stato.',
  'options.color.background': 'Sfondo',
  'options.color.text': 'Testo',
  'options.color.hex': '{title} (esadecimale)',

  'options.console': 'Console',
  'options.console.font': 'Carattere',
  'options.console.fontFamilyTitle': 'CSS font-family per la finestra di chat',
  'options.console.fontSizeTitle': 'Dimensione del carattere (px)',
  'options.console.channelTells': 'Tells dei canali',
  'options.console.tells': 'Tells',
  'options.console.shouts': 'Shouts',
  'options.console.kibitz': 'Kibitz / whisper',
  'options.console.challenges': 'Sfide',
  'options.console.gameStarts': 'Inizio partite',
  'options.console.gameEnds': 'Fine partite',
  'options.console.internal': 'Interno',
  'options.console.outbound': 'I tuoi invii',
  'options.console.note':
    'Colori per tipo di messaggio; Auto è la palette predefinita. Le finestre di chat aperte si ricolorano in diretta.',

  'options.defaults': 'Predefiniti',
  'options.defaults.all': 'Tutte le opzioni',
  'options.defaults.reset': 'Ripristina i predefiniti',
  'options.defaults.resetArmed': 'Fai di nuovo clic per confermare',
  'options.defaults.note':
    'Ripristina ogni opzione sopra — colori della scacchiera, pezzi, colori dell\u2019orologio, interruttori — ai predefiniti. I profili di accesso non vengono toccati.',

  'options.engine': 'Motore',
  'options.engine.available': 'Analisi Stockfish disponibile',
  'options.engine.note':
    'Solo in modalità osservazione, esame e inattiva — mai durante una partita.',

  'options.sound': 'Suoni',
  'options.sound.sounds': 'Suoni',
  'options.sound.keepAlive': 'Keep alive',
  'options.sound.keepAliveTitle':
    'inviato (nascosto) ogni 59 minuti mentre sei connesso',
  'options.sound.moveSounds': 'Suoni delle mosse',
  'options.sound.movePreviewTitle':
    'riproduce mossa, cattura, scacco dal set selezionato',
  'options.sound.alerts': 'Avvisi',
  'options.sound.alertPreviewTitle':
    'riproduce tell, arrivo e partenza di un amico nello stile del set selezionato',
  'options.sound.note':
    'Mosse, catture e scacchi usano il set selezionato. Felt, Walnut, Marble, Clock, Study, Slate e Piano suonano anche i propri finali; Sfx / Futuristic / Nes tornano a Piano per quelli. Le sei palette col nome sono originali; le altre quattro sono i set liberi di Enigmahack su lichess — il famoso set "standard" non ha licenza libera. Gli avvisi — un tell in arrivo, un amico che arriva o parte — sono nostre note sintetizzate nello stile del set selezionato.',

  'options.pgnJournal': 'Salvataggio PGN automatico',
  'options.pgnJournal.append': 'Aggiungi le partite che gioco',
  'options.pgnJournal.appendNote':
    'Ogni partita che GIOCHI viene aggiunta a un unico file PGN alla fine della partita — le partite solo osservate o esaminate non vi finiscono mai. Funziona in Chrome, Brave ed Edge; negli altri browser non viene salvato nulla.',
  'options.pgnJournal.file': 'File del diario',
  'options.pgnJournal.choose': 'Scegli file…',
  'options.pgnJournal.change': 'Cambia file…',
  'options.pgnJournal.unsupported':
    'Questo browser non ha l\u2019API File System Access — il salvataggio automatico non è disponibile qui.',
  'options.pgnJournal.chosenNote':
    'Le partite verranno aggiunte qui alla fine. Se il browser chiede di nuovo il permesso, riseleziona il file per riautorizzarlo.',
  'options.pgnJournal.noneNote':
    'Nessun file scelto ancora: non viene salvato nulla finché non ne scegli uno.',

  'options.loginScript': 'Script di accesso',
  'options.loginScript.note1':
    'Inviato (nascosto) dopo ogni accesso, un comando per riga; le righe vuote sono saltate; vale per la prossima connessione. Tieni',
  'options.loginScript.note2':
    'LAST se lo tieni: sigilla le impostazioni dell\u2019interfaccia, e tutto ciò che viene dopo viene rifiutato.',

  'options.channels': 'Canali',
  'options.channels.autoJoin': 'Unisciti automaticamente all\u2019accesso',
  'options.channels.autoJoinNote': 'Numeri di canale separati da virgole.',
  'options.channels.backfill': 'Recupero della cronologia',
  'options.channels.backfillNote':
    'API del log dei canali (il bot chessascent). All\u2019apertura della finestra di chat, ogni canale di auto-join riceve fino a 24h di tells precedenti all\u2019accesso — scorri in alto per leggerli. Vuoto disattiva.',

  // ---- help --------------------------------------------------------------
  'help.what.title': 'Cos\u2019è questa pagina?',
  'help.what.body1':
    'Questa è la superficie <b>Opzioni e Aiuto</b>. Non è un avviatore: la finestra di chat si apre da sola quando accedi, e le finestre delle scacchiere compaiono automaticamente quando osservi o giochi una partita. Usa la scheda Opzioni per cambiare le preferenze dell\u2019app.',

  'help.popups.title': 'Consenti i popup (obbligatorio)',
  'help.popups.intro':
    'Le scacchiere si aprono quando FICS dice che una partita è iniziata — da un evento di rete, non dal tuo clic — che è esattamente ciò che i blocca-popup bloccano. Finché questo sito non è consentito, osservare una partita registra una riga nella console invece di aprire una scacchiera. Soluzione una tantum:',
  'help.popups.chromium':
    'fai clic sull\u2019icona popup all\u2019estremità destra della barra degli indirizzi quando compare e scegli "Consenti sempre i popup da questo sito". In alternativa: Impostazioni → Privacy e sicurezza → Impostazioni sito → Popup e reindirizzamenti → aggiungi questo sito a "Consentiti".',
  'help.popups.firefox':
    'quando un popup viene bloccato compare una barra gialla; scegli Preferenze → "Consenti popup per questo sito". In alternativa: Impostazioni → Privacy e sicurezza → Autorizzazioni → Blocca le finestre popup → Eccezioni.',
  'help.popups.safari':
    'Safari → Impostazioni → Siti web → Finestre popup → imposta questo sito su Consenti.',
  'help.popups.appmode1': 'In',
  'help.popups.appmode2':
    'modalità (sezione successiva) i popup dalla finestra dell\u2019app ereditano il permesso una volta che il sito è consentito.',

  'help.commands.title': 'Comandi dello script',
  'help.commands.intro':
    'Alcune righe che il client gestisce da solo (portate dagli alias di Raptor) — scrivile in qualsiasi input di chat:',
  'help.commands.clear1': 'recupera la tua lista e rimuove ogni nome, uno',
  'help.commands.clear2': 'alla volta.',
  'help.commands.tab1': 'apre una scheda canale.',
  'help.commands.tab2': 'apre una scheda persona. Entrambe sono locali: nulla viene inviato al server.',
  'help.commands.rest1': 'Tutto il resto va a FICS come scritto —',
  'help.commands.refLink': 'il riferimento dei comandi FICS',
  'help.commands.rest2': 'documenta l\u2019intero set di comandi.',

  'help.appmode.title': 'Nascondi la barra degli indirizzi del browser (modalità app)',
  'help.appmode.intro1':
    'I browser moderni richiedono una barra degli indirizzi su schede e popup regolari per sicurezza. Ma i browser basati su Chromium (Chrome, Brave, Edge) supportano un',
  'help.appmode.intro2':
    'flag di avvio che apre un dato URL in una finestra senza chrome: niente barra URL, niente striscia schede, niente menu. Crea un collegamento che passa il flag e appuntalo alla barra delle applicazioni/dock.',
  'help.appmode.baked1': 'I comandi sotto sono incorporati con',
  'help.appmode.baked2':
    '— l\u2019indirizzo da cui stai leggendo — così sono copia-incolla corretti ovunque l\u2019app sia servita.',
  'help.appmode.linux': 'Linux (GNOME / Pop!_OS / KDE)',
  'help.appmode.linux1': 'Crea',
  'help.appmode.linux1b': 'con questo contenuto:',
  'help.appmode.linux2': 'Aggiorna il menu delle applicazioni:',
  'help.appmode.linux3':
    'Apri Attività / menu applicazioni, cerca "Raptor3000", clic destro → Blocca nel Dash o trascina sulla barra delle applicazioni.',
  'help.appmode.linuxSub1': 'Sostituisci',
  'help.appmode.linuxSub2': 'con',
  'help.appmode.linuxSub3': 'o',
  'help.appmode.linuxSub4': 'se usi quelli.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'Clic destro sul desktop → Nuovo → Collegamento.',
  'help.appmode.windows2':
    'Come posizione, incolla (aggiusta il percorso se il tuo browser è altrove):',
  'help.appmode.windows2b': 'Per Chrome invece:',
  'help.appmode.windows3': 'Chiamalo "Raptor3000", clic su Fine.',
  'help.appmode.windows4': 'Clic destro sul nuovo collegamento → Blocca sulla barra delle applicazioni.',
  'help.appmode.windowsIcon1':
    '(Opzionale) Clic destro sul collegamento → Proprietà → Cambia icona, e punta a',
  'help.appmode.windowsIcon2': 'così non sembra Brave.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS non accetta flag CLI grezzi sui collegamenti del Dock, quindi avvolgi l\u2019avvio in una minuscola',
  'help.appmode.macosIntro2': 'app:',
  'help.appmode.macos1a': 'Apri',
  'help.appmode.macos1b': '→ Nuovo documento →',
  'help.appmode.macos2a': 'Aggiungi un',
  'help.appmode.macos2b': 'azione. Incolla (aggiusta il percorso del browser se serve):',
  'help.appmode.macos2c': 'Per Chrome:',
  'help.appmode.macos3a': 'Salva come',
  'help.appmode.macos3b': 'in',
  'help.appmode.macos4a': 'Trascina',
  'help.appmode.macos4b': 'nel Dock.',
  'help.appmode.macosIcon1': '(Opzionale) Clic destro su',
  'help.appmode.macosIcon2':
    'nel Finder → Informazioni → trascina un\u2019icona personalizzata nell\u2019apposito riquadro per un look distinto nel Dock.',

  'help.about.title': 'Info e licenze',
  'help.about.intro':
    'Raptor3000 è <b>concesso in licenza MIT</b> — il terzo di una linea dopo <b>Raptor</b> (SWT) e <b>Decaf</b> (Java). Si regge su spalle generosamente licenziate:',
  'help.about.stockfish':
    '— il motore di analisi, che gira nel tuo browser come WebAssembly (GPL-3.0).',
  'help.about.chessops':
    '— la libreria scacchistica di lichess: SAN, legalità, replay (GPL-3.0-or-later).',
  'help.about.openings': '— i nomi delle aperture e i codici ECO (CC0 pubblico dominio).',
  'help.about.lichess':
    '— i set restanti piano / sfx / futuristic / nes di Enigmahack (AGPL-3.0+) e i set di pezzi (cburnett di Colin M.L. Burnett e collaboratori, ciascuno con la propria licenza). I suoni Felt, Walnut, Marble, Clock, Study e Slate, e il set di pezzi Of Course I Still Love You, Just Read The Instructions e A Shortfall Of Gravitas, So Much For Subtlety, Very Little Gravitas Indeed, sono originali di Raptor3000.',
  'help.about.fics':
    '— il Free Internet Chess Server con cui questa app intera esiste per parlare. Sii gentile nel canale 39.',
  'help.about.outro1': 'L\u2019inventario completo con le licenze esatte sta in',
  'help.about.outro2': 'in',
  'help.about.repoLink': 'il repository sorgente',
  'help.about.outro3': '. Qualcosa è rotto o manca?',
  'help.about.reportLink': 'Segnala un problema',
  'help.about.outro4': 'o',
  'help.about.suggestLink': 'suggerisci una funzione',

  'help.trouble.title': 'Risoluzione dei problemi',
  'help.trouble.addressBarTitle': 'La barra degli indirizzi è ancora visibile.',
  'help.trouble.addressBar1':
    'I browser moderni mostrano una striscia di origine di una riga in cima ai popup a prescindere dalle funzioni. La',
  'help.trouble.addressBar2':
    'modalità sopra la evita del tutto per la finestra principale. I popup aperti da una finestra in modalità app ereditano lo stesso trattamento senza chrome.',
  'help.trouble.blockerTitle': 'Blocco popup.',
  'help.trouble.blocker1': 'Consenti i popup per',
  'help.trouble.blocker2':
    '(o il tuo host di produzione). In Brave: Impostazioni → Privacy e sicurezza → Impostazioni sito → Popup.',
  'help.trouble.shortcutTitle': 'Il collegamento apre una scheda normale, non una finestra app.',
  'help.trouble.shortcut1': 'Assicurati che il flag sia',
  'help.trouble.shortcut2': 'con un',
  'help.trouble.shortcut3':
    'e senza spazi, e che il browser non sia già in esecuzione con un profilo che lo sovrascrive.',
};

export default it;