import type { Messages } from '../messages.js';

/** Polish (Polski). Judgment calls: informal „ty” throughout (a chess app, not an office); browser menu paths use each browser’s real Polish UI (Chrome’s „Wyskakujące okienka i przekierowania”, Firefox’s „wyskakujące okna”, Safari’s „Okna wyskakujące → Dopuść”, Windows’ „Zakończ”, GNOME’s „Dodaj do ulubionych”); proper names are declined where Polish demands it (Raptora, Stockfisha) but „Colin M.L. Burnett” is left in the nominative. */
const pl: Messages = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': 'Już prawie…',
  'gate.demoChip': 'demo',
  'gate.intro':
    'Raptor3000 działa jak program na pulpicie — czat i każda szachownica otwierają się jako <b>prawdziwe okna</b>. Twoja przeglądarka właśnie je blokuje, a naprawa to dwa kliknięcia:',
  'gate.chromium.step1':
    'Poszukaj tej ikony na prawym końcu paska adresu — pojawiła się przed chwilą:',
  'gate.chromium.step2':
    'Kliknij ją, wybierz <b>Zawsze zezwalaj</b>, potem <b>Gotowe</b>. To cała robota.',
  'gate.chromium.caption':
    '(to tylko obrazek — prawdziwa ikona jest wyżej, na pasku twojej przeglądarki)',
  'gate.firefox.step1': 'U góry strony pojawił się właśnie pasek:',
  'gate.firefox.step2':
    'Kliknij <b>Ustawienia</b> i wybierz <b>Zezwalaj na wyskakujące okna z tej witryny</b>.',
  'gate.firefox.caption':
    '(to tylko obrazek — prawdziwy pasek należy do przeglądarki Firefox i jest nad stroną)',
  'gate.watching':
    'Nie musisz nikomu nic zgłaszać — ten ekran sprawdza sam i usuwa się z drogi w chwili, gdy okna będą dozwolone.',
  'gate.others': 'Używasz innej przeglądarki?',
  'gate.testAgain': 'Sprawdź ponownie',
  'gate.stuck': 'Nadal nie działa?',
  'gate.report': 'zgłoś to',
  'gate.demo.allowed': 'demo — ta przeglądarka w tej chwili: wyskakujące okna dozwolone',
  'gate.demo.blocked': 'demo — ta przeglądarka w tej chwili: wyskakujące okna zablokowane',
  'gate.allowed.title': 'Wyskakujące okna dozwolone',
  'gate.allowed.body': 'Okna szachownic i czatu będą się otwierać. Miłej gry.',

  // Per-browser directions. Browser names are product names and stay as
  // they are; the menu paths are what the visitor will literally see in a
  // browser whose own UI may well be in their language — translate the
  // words, keep the arrows and the order.
  // The labels inside the address-bar mock. They are a picture of the
  // visitor's own browser, so an English picture under translated
  // instructions is the same dead end the translations were for.
  'gate.pic.allow': 'Zawsze zezwalaj na wyskakujące okienka i przekierowania z tej witryny',
  'gate.pic.blocking': 'Blokuj nadal',
  'gate.pic.done': 'Gotowe',
  'gate.pic.ffBar': 'Firefox zablokował tej witrynie otwarcie wyskakującego okna',
  'gate.pic.ffPrefs': 'Ustawienia',
  'gate.pic.ffAllow': 'Zezwalaj na wyskakujące okna z raptor3000.pages.dev',
  'gate.pic.ffEdit': 'Edytuj opcje blokowania wyskakujących okien…',

  'dir.chromium.steps':
    'Kliknij ikonę wyskakującego okienka na prawym końcu paska adresu i wybierz „Zawsze zezwalaj na wyskakujące okienka i przekierowania z tej witryny”, a potem Gotowe. (Albo: Ustawienia → Prywatność i bezpieczeństwo → Ustawienia witryn → Wyskakujące okienka i przekierowania → dodaj tę witrynę.)',
  'dir.firefox.steps':
    'Gdy wyskakujące okno zostaje zablokowane, u góry pojawia się pasek — wybierz na nim Ustawienia → „Zezwalaj na wyskakujące okna z tej witryny”. (Albo: Ustawienia → Prywatność i bezpieczeństwo → Uprawnienia → Blokuj wyskakujące okna → Wyjątki.)',
  'dir.safari.steps':
    'Menu Safari → Ustawienia → Witryny → Okna wyskakujące → ustaw tę witrynę na Dopuść.',
  'dir.ios.steps':
    'Aplikacja Ustawienia → Safari → wyłącz „Blokuj wyskakujące okna”. (Uczciwe ostrzeżenie: telefony dostają karty przeglądarki zamiast okien — prawdziwe wrażenia są na komputerze.)',
  'dir.android.steps':
    'Menu ⋮ → Ustawienia → Ustawienia witryn → Wyskakujące okienka i przekierowania → zezwól. (To samo uczciwe ostrzeżenie — karty, nie okna.)',

  // ---- login screen ------------------------------------------------------
  'login.tagline': 'Zaloguj się do FICS',
  'login.profile': 'Profil',
  'login.handle': 'Nick',
  'login.password': 'Hasło',
  'login.server': 'Serwer',
  'login.port': 'Port',
  'login.guest': 'Logowanie jako gość',
  'login.timeseal': 'Timeseal włączony',
  'login.autoConnect': 'Zaloguj mnie automatycznie następnym razem',
  'login.submit': 'Zaloguj',
  'login.err.handleLength': 'Nick musi mieć od 3 do 17 znaków.',
  'login.err.handleLetters': 'Nick może zawierać tylko litery.',
  'login.err.noHandle': 'Podaj nick albo zaznacz logowanie jako gość.',
  'login.err.noPassword': 'Podaj hasło.',
  'login.shot.observing': 'obserwowanie partii z analizą silnika',
  'login.shot.playing': 'gra w blitza',
  'login.shot.chat': 'konsola czatu w widoku podzielonym',
  'login.shot.seek': 'wykres ofert gry na żywo',

  // ---- language control --------------------------------------------------
  'lang.label': 'Język',
  'lang.auto': 'Automatycznie',
  'lang.note':
    'Język interfejsu tego ekranu, opcji i pomocy. Automatycznie idzie za ustawieniem przeglądarki. Tekst z serwera szachowego — tells, kanały, wyniki partii — przychodzi z FICS po angielsku, cokolwiek wybierzesz.',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'Raptor3000 to program na komputer',
  'mobile.body1':
    'Szachownice i czat otwierają się jako <b>prawdziwe okna przeglądarki</b>, sterowane na żywo z serwera szachowego — telefony tego nie potrafią, więc aplikacja tutaj nie zadziała.',
  'mobile.body2': 'Na komputerze wejdź na <b>raptor3000.pages.dev</b>.',
  'mobile.tryAnyway': 'Mam klawiaturę i niskie oczekiwania — spróbuj mimo to',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': 'Opcje',
  'shell.nav.help': 'Pomoc',
  'shell.signedIn': 'Zalogowano jako <b>{who}</b> · {server}:{port} · profil {profile}',
  'shell.who.anonGuest': 'anonimowy gość',
  'shell.who.namedGuest': '{name} (gość)',
  'shell.theme.light': 'Dzień',
  'shell.theme.dark': 'Noc',
  'shell.theme.system': 'Systemowy',
  'shell.theme.aria': 'Motyw: {mode}. Kliknij, aby przełączyć.',
  'shell.blocked.text':
    '<b>Przeglądarka zablokowała okno szachownicy.</b> Na FICS zaczęła się partia, ale jej szachownica nie mogła się pojawić — zezwól tej witrynie na wyskakujące okna i zacznij obserwować jeszcze raz.',
  'shell.blocked.showMe': 'Pokaż jak',
  'shell.blocked.dismiss': 'ukryj',
  'shell.disconnect.relaunch': 'Uruchom ponownie',
  'shell.disconnect.body':
    'Połączenie z FICS zostało zamknięte. Ponowne uruchomienie startuje aplikację od ekranu logowania — ostatnie linijki w konsoli czatu mówią, dlaczego sesja się skończyła (wylogowanie za bezczynność, wyrzucenie przez nowsze logowanie albo zerwana sieć).',
  'shell.footer.session': 'sesja #{id}',
  'shell.footer.suggest': 'zaproponuj funkcję',
  'shell.footer.report': 'zgłoś problem',

  // ---- options -----------------------------------------------------------
  'common.on': 'Wł.',
  'common.off': 'Wył.',
  'common.auto': 'Auto',
  'common.preview': 'Podgląd',

  'options.session': 'Sesja',
  'options.session.startOver': 'Zacznij od nowa',
  'options.session.relaunch': 'Uruchom ponownie',
  'options.session.relaunchArmed': 'Kliknij ponownie, aby uruchomić od nowa',
  'options.session.relaunchNote':
    'Rozłącza, zamyka wszystkie okna i uruchamia całą aplikację od nowa na ekranie logowania — automatyczne logowanie jest przy tym jednym starcie pomijane. Nic poza tym nie zostaje zmienione ani wyzerowane.',
  'options.session.autoLogin': 'Automatyczne logowanie',
  'options.session.autoLoginNote':
    'Wyłączone pokazuje przy następnym uruchomieniu ekran logowania, zamiast łączyć się z zapisanym profilem.',

  'options.board': 'Szachownica',
  'options.board.colors': 'Kolory',
  'options.board.lightSquares': 'Jasne pola',
  'options.board.darkSquares': 'Ciemne pola',
  'options.board.pieceSet': 'Zestaw bierek',
  'options.board.animations': 'Animacje ruchów',
  'options.board.coordinates': 'Pokaż współrzędne',
  'options.board.flipAsBlack': 'Obróć, gdy grasz czarnymi',
  'options.board.moveList': 'Lista ruchów widoczna',
  // Board palettes: the four plain colors translate, IC and Horsey are
  // names (lichess's), and Custom is the escape hatch.
  'boardTheme.brown': 'Brązowa',
  'boardTheme.blue': 'Niebieska',
  'boardTheme.green': 'Zielona',
  'boardTheme.purple': 'Fioletowa',
  'boardTheme.custom': 'Własna',

  'options.clock': 'Kolory zegara',
  'options.clock.active': 'Aktywny',
  'options.clock.low': 'Mało czasu',
  'options.clock.idle': 'Nieaktywny',
  'options.clock.note':
    'Auto idzie za motywem aplikacji (Nieaktywny) i fabrycznymi zielonymi/czerwonymi polami (Aktywny, Mało czasu). Wybierz kolory, aby to nadpisać — najpierw tło, potem tekst.',
  'options.color.background': 'Tło',
  'options.color.text': 'Tekst',
  'options.color.hex': '{title} (hex)',

  'options.console': 'Konsola',
  'options.console.font': 'Czcionka',
  'options.console.fontFamilyTitle': 'CSS font-family dla okna czatu',
  'options.console.fontSizeTitle': 'Rozmiar czcionki (px)',
  'options.console.channelTells': 'Tells z kanałów',
  'options.console.tells': 'Tells',
  'options.console.shouts': 'Shouts',
  'options.console.kibitz': 'Kibitz / whisper',
  'options.console.challenges': 'Wyzwania',
  'options.console.gameStarts': 'Początki partii',
  'options.console.gameEnds': 'Końce partii',
  'options.console.internal': 'Wewnętrzne',
  'options.console.outbound': 'Twoje wysłane',
  'options.console.note':
    'Kolory dla każdego typu wiadomości; Auto to fabryczna paleta. Otwarte okna czatu przestawiają się na żywo.',

  'options.defaults': 'Ustawienia domyślne',
  'options.defaults.all': 'Wszystkie opcje',
  'options.defaults.reset': 'Przywróć domyślne',
  'options.defaults.resetArmed': 'Kliknij ponownie, aby potwierdzić',
  'options.defaults.note':
    'Przywraca każdą opcję powyżej — kolory szachownicy, bierki, kolory zegara, przełączniki — do wartości fabrycznych. Profile logowania zostają nietknięte.',

  'options.engine': 'Silnik',
  'options.engine.available': 'Analiza Stockfisha dostępna',
  'options.engine.note':
    'Tylko w trybie obserwowania, analizy i bezczynności — nigdy w trakcie własnej partii.',

  'options.sound': 'Dźwięk',
  'options.sound.sounds': 'Dźwięki',
  'options.sound.keepAlive': 'Podtrzymanie połączenia',
  'options.sound.keepAliveTitle':
    'wysyłane (niewidocznie) co 59 minut, dopóki połączenie działa',
  'options.sound.moveSounds': 'Dźwięki ruchów',
  'options.sound.movePreviewTitle':
    'odtwarza ruch, bicie i szacha z wybranego zestawu',
  'options.sound.alerts': 'Powiadomienia',
  'options.sound.alertPreviewTitle':
    'odtwarza tell, przyjście i odejście znajomego w stylu wybranego zestawu',
  'options.sound.note':
    'Ruchy, bicia i szachy używają wybranego zestawu; dźwięki końca partii zostają na Piano. Wszystkie zestawy pochodzą z lichess i mają wolne licencje — słynny zestaw „standard” wolnej licencji nie ma. Powiadomienia — przychodzący tell, przyjście albo odejście znajomego — to nasze własne syntezowane dźwięki w stylu wybranego zestawu.',

  'options.pgnJournal': 'Autozapis PGN',
  'options.pgnJournal.append': 'Dodawaj partie, które gram',
  'options.pgnJournal.appendNote':
    'Każda partia, którą GRASZ, jest dodawana do pliku PGN na koniec — partie, które tylko obserwujesz lub analizujesz, nigdy tam nie trafiają. Działa w Chrome, Brave i Edge; inne przeglądarki nie zapisują niczego.',
  'options.pgnJournal.file': 'Plik dziennika',
  'options.pgnJournal.choose': 'Wybierz plik…',
  'options.pgnJournal.change': 'Zmień plik…',
  'options.pgnJournal.unsupported':
    'Ta przeglądarka nie ma API dostępu do systemu plików — autozapis jest tu niedostępny.',
  'options.pgnJournal.chosenNote':
    'Partie będą tu dodawane na koniec. Jeśli przeglądarka zapyta ponownie, wybierz plik jeszcze raz, aby odnowić zgodę.',
  'options.pgnJournal.noneNote':
    'Nie wybrano jeszcze pliku — nic nie zostanie zapisane, dopóki go nie wybierzesz.',

  'options.loginScript': 'Skrypt logowania',
  'options.loginScript.note1':
    'Wysyłany (niewidocznie) po każdym logowaniu, jedna komenda na linijkę; puste linijki są pomijane; działa od następnego połączenia. Zostaw',
  'options.loginScript.note2':
    'na samym KOŃCU, jeśli je zachowujesz — zamyka ustawienia interfejsu na klucz, a wszystko po nim zostaje odrzucone.',

  'options.channels': 'Kanały',
  'options.channels.autoJoin': 'Dołącz automatycznie przy logowaniu',
  'options.channels.autoJoinNote': 'Numery kanałów oddzielone przecinkami.',
  'options.channels.backfill': 'Uzupełnianie historii',
  'options.channels.backfillNote':
    'API logów kanałów (bot chessascent). Przy otwarciu okna czatu każdy kanał z automatycznego dołączania dostaje do 24 h tells sprzed logowania — przewiń w górę, żeby je przeczytać. Puste pole wyłącza tę funkcję.',

  // ---- help --------------------------------------------------------------
  'help.what.title': 'Co to za strona?',
  'help.what.body1':
    'To jest ekran <b>Opcje i pomoc</b>. Nie służy do otwierania okien — okno czatu otwiera się samo po zalogowaniu, a okna szachownic pojawiają się automatycznie, gdy obserwujesz albo grasz partię. Ustawienia aplikacji zmienisz w zakładce Opcje.',

  'help.popups.title': 'Zezwól na wyskakujące okna (wymagane)',
  'help.popups.intro':
    'Szachownice otwierają się wtedy, gdy FICS zgłasza początek partii — ze zdarzenia sieciowego, nie z twojego kliknięcia — a to jest dokładnie to, co blokują blokady wyskakujących okien. Dopóki ta witryna nie ma zgody, obserwowanie partii kończy się linijką w konsoli zamiast szachownicą. Jednorazowa naprawa:',
  'help.popups.chromium':
    'kliknij ikonę wyskakującego okienka na prawym końcu paska adresu, gdy się pojawi, i wybierz „Zawsze zezwalaj na wyskakujące okienka z tej witryny”. Albo: Ustawienia → Prywatność i bezpieczeństwo → Ustawienia witryn → Wyskakujące okienka i przekierowania → dodaj tę witrynę do „Dozwolone”.',
  'help.popups.firefox':
    'gdy wyskakujące okno zostaje zablokowane, pojawia się żółty pasek; wybierz na nim Ustawienia → „Zezwalaj na wyskakujące okna z tej witryny”. Albo: Ustawienia → Prywatność i bezpieczeństwo → Uprawnienia → Blokuj wyskakujące okna → Wyjątki.',
  'help.popups.safari':
    'Safari → Ustawienia → Witryny → Okna wyskakujące → ustaw tę witrynę na Dopuść.',
  'help.popups.appmode1': 'W trybie',
  'help.popups.appmode2':
    '(następna sekcja) wyskakujące okna otwierane z okna aplikacji dziedziczą zgodę, gdy tylko witryna ją dostanie.',

  'help.commands.title': 'Komendy skryptowe',
  'help.commands.intro':
    'Kilka linijek, które klient obsługuje sam (przeniesione z aliasów Raptora) — wpisz je w dowolne pole czatu:',
  'help.commands.clear1': 'pobiera twoją listę i usuwa z niej każdą osobę, wysyłając',
  'help.commands.clear2': 'po jednym na raz.',
  'help.commands.tab1': 'otwiera zakładkę kanału.',
  'help.commands.tab2': 'otwiera zakładkę osoby. Obie są lokalne: nic nie leci na serwer.',
  'help.commands.rest1': 'Wszystko inne trafia do FICS tak, jak je wpiszesz —',
  'help.commands.refLink': 'dokumentacja komend FICS',
  'help.commands.rest2': 'opisuje cały zestaw komend.',

  'help.appmode.title': 'Ukryj pasek adresu przeglądarki (tryb aplikacji)',
  'help.appmode.intro1':
    'Nowoczesne przeglądarki wymagają paska adresu w zwykłych kartach i wyskakujących oknach ze względów bezpieczeństwa. Ale przeglądarki oparte na Chromium (Chrome, Brave, Edge) obsługują flagę',
  'help.appmode.intro2':
    'przy uruchamianiu, która otwiera podany adres w oknie bez ozdób — bez paska adresu, bez paska kart, bez menu. Utwórz skrót, który przekazuje tę flagę, i przypnij go do paska zadań albo do docka.',
  'help.appmode.baked1': 'W komendy poniżej wpisany jest już',
  'help.appmode.baked2':
    '— adres, spod którego to czytasz — więc kopiuj-wklej zadziała wszędzie tam, gdzie aplikacja jest serwowana.',
  'help.appmode.linux': 'Linux (GNOME / Pop!_OS / KDE)',
  'help.appmode.linux1': 'Utwórz',
  'help.appmode.linux1b': 'o tej treści:',
  'help.appmode.linux2': 'Odśwież menu programów:',
  'help.appmode.linux3':
    'Otwórz Podgląd / menu programów, wyszukaj „Raptor3000”, kliknij prawym przyciskiem → Dodaj do ulubionych albo przeciągnij na pasek zadań.',
  'help.appmode.linuxSub1': 'Jeśli wolisz Chrome albo Edge, zamień',
  'help.appmode.linuxSub2': 'na',
  'help.appmode.linuxSub3': 'albo',
  'help.appmode.linuxSub4': 'w tym pliku.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'Kliknij pulpit prawym przyciskiem → Nowy → Skrót.',
  'help.appmode.windows2':
    'Jako lokalizację elementu wklej (dostosuj ścieżkę, jeśli twoja przeglądarka mieszka gdzie indziej):',
  'help.appmode.windows2b': 'Dla Chrome zamiast tego:',
  'help.appmode.windows3': 'Nazwij go „Raptor3000” i kliknij Zakończ.',
  'help.appmode.windows4': 'Kliknij nowy skrót prawym przyciskiem → Przypnij do paska zadań.',
  'help.appmode.windowsIcon1':
    '(Opcjonalnie) Żeby skrót nie wyglądał jak Brave: kliknij go prawym przyciskiem → Właściwości → Zmień ikonę i wskaż plik',
  'help.appmode.windowsIcon2': 'z własną ikoną.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS nie przyjmuje surowych flag CLI w skrótach na Docku, dlatego uruchomienie trzeba opakować w maleńki program — zrobi to',
  'help.appmode.macosIntro2': 'w kilku krokach:',
  'help.appmode.macos1a': 'Otwórz',
  'help.appmode.macos1b': '→ Nowy dokument →',
  'help.appmode.macos2a': 'Dodaj czynność',
  'help.appmode.macos2b': 'i wklej w nią (w razie potrzeby dostosuj ścieżkę do przeglądarki):',
  'help.appmode.macos2c': 'Dla Chrome:',
  'help.appmode.macos3a': 'Zachowaj jako',
  'help.appmode.macos3b': 'w',
  'help.appmode.macos4a': 'Przeciągnij',
  'help.appmode.macos4b': 'na Dock.',
  'help.appmode.macosIcon1': '(Opcjonalnie) Kliknij prawym przyciskiem',
  'help.appmode.macosIcon2':
    'w Finderze → Informacje → przeciągnij własną ikonę na miniaturę w lewym górnym rogu, a wpis w Docku będzie nie do pomylenia.',

  'help.about.title': 'O programie i licencje',
  'help.about.intro':
    'Raptor3000 jest <b>na licencji MIT</b> — trzeci w linii, po <b>Raptorze</b> (SWT) i <b>Decafie</b> (Java). Stoi na hojnie licencjonowanych ramionach:',
  'help.about.stockfish':
    '— silnik analizy, działa w twojej przeglądarce jako WebAssembly (GPL-3.0).',
  'help.about.chessops':
    '— biblioteka szachowa od lichess: SAN, legalność ruchów, odtwarzanie partii (GPL-3.0-or-later).',
  'help.about.openings': '— nazwy debiutów i kody ECO (CC0, domena publiczna).',
  'help.about.lichess':
    '— zestaw dźwięków Piano od Enigmahack (AGPL-3.0+) i zestawy bierek (cburnett: Colin M.L. Burnett i przyjaciele; każdy na własnej licencji).',
  'help.about.fics':
    '— Free Internet Chess Server, dla którego ta cała aplikacja w ogóle istnieje. Bądź miły na kanale 39.',
  'help.about.outro1': 'Pełny spis z dokładnymi licencjami leży w pliku',
  'help.about.outro2': 'w',
  'help.about.repoLink': 'repozytorium źródłowym',
  'help.about.outro3': '. Coś nie działa albo czegoś brakuje?',
  'help.about.reportLink': 'Zgłoś problem',
  'help.about.outro4': 'albo',
  'help.about.suggestLink': 'zaproponuj funkcję',

  'help.trouble.title': 'Rozwiązywanie problemów',
  'help.trouble.addressBarTitle': 'Pasek adresu nadal widać.',
  'help.trouble.addressBar1':
    'Nowoczesne przeglądarki pokazują u góry wyskakujących okien jednolinijkowy pasek z adresem, niezależnie od tego, o jakie okno poprosisz. Opisany wyżej tryb',
  'help.trouble.addressBar2':
    'całkowicie omija go w głównym oknie. Wyskakujące okna otwierane z okna w trybie aplikacji dziedziczą to samo pozbawione ramek traktowanie.',
  'help.trouble.blockerTitle': 'Blokada wyskakujących okien.',
  'help.trouble.blocker1': 'Zezwól na wyskakujące okna dla',
  'help.trouble.blocker2':
    '(albo twojego hosta produkcyjnego). W Brave: Ustawienia → Prywatność i bezpieczeństwo → Ustawienia witryn → Wyskakujące okienka.',
  'help.trouble.shortcutTitle': 'Skrót otwiera zwykłą kartę zamiast okna aplikacji.',
  'help.trouble.shortcut1': 'Upewnij się, że flaga to dokładnie',
  'help.trouble.shortcut2': 'ze znakiem',
  'help.trouble.shortcut3':
    'bez spacji i że przeglądarka nie działa już z profilem, który to nadpisuje.',
};

export default pl;
