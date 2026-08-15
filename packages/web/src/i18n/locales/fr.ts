import type { Messages } from '../messages.js';

/**
 * French (Français). Menu paths use the browsers’ real French labels
 * (Chrome’s Done is « OK », Firefox’s Preferences button is « Options »,
 * Safari says « Réglages ») ; FICS jargon (tell, seek, kibitz, shout)
 * stays English, as French players themselves use it.
 */
const fr: Messages = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': 'On y est presque…',
  'gate.demoChip': 'démo',
  'gate.intro':
    'Raptor3000 se comporte comme une app de bureau — le chat et chaque échiquier s’ouvrent dans de <b>vraies fenêtres</b>. Votre navigateur les bloque, et deux clics suffisent à y remédier :',
  'gate.chromium.step1':
    'Repérez cette icône à l’extrémité droite de votre barre d’adresse — elle vient d’apparaître :',
  'gate.chromium.step2':
    'Cliquez dessus, choisissez <b>Toujours autoriser</b>, puis <b>OK</b>. Et c’est réglé.',
  'gate.chromium.caption':
    '(simple illustration — la vraie icône est en haut, dans la barre de votre navigateur)',
  'gate.firefox.step1': 'Une barre vient d’apparaître en haut de la page :',
  'gate.firefox.step2':
    'Cliquez sur <b>Options</b> et choisissez <b>Autoriser les popups pour ce site</b>.',
  'gate.firefox.caption':
    '(simple illustration — la vraie barre est celle de Firefox, au-dessus de la page)',
  'gate.watching':
    'Pas besoin de prévenir qui que ce soit — cet écran vérifie tout seul et s’efface dès que les fenêtres sont autorisées.',
  'gate.others': 'Vous utilisez un autre navigateur ?',
  'gate.testAgain': 'Retester',
  'gate.stuck': 'Toujours bloqué ?',
  'gate.report': 'signalez-le',
  'gate.demo.allowed': 'démo — ce navigateur, là maintenant : popups autorisées',
  'gate.demo.blocked': 'démo — ce navigateur, là maintenant : popups bloquées',
  'gate.allowed.title': 'Popups autorisées',
  'gate.allowed.body': 'Les fenêtres d’échiquier et de chat vont s’ouvrir. Bonne partie.',

  // Per-browser directions — the menu wording each browser really uses in
  // French, arrows and order preserved.
  // The labels inside the address-bar mock. They are a picture of the
  // visitor's own browser, so an English picture under translated
  // instructions is the same dead end the translations were for.
  'gate.pic.allow': 'Toujours autoriser les pop-up et les redirections de ce site',
  'gate.pic.blocking': 'Continuer à bloquer',
  'gate.pic.done': 'OK',
  'gate.pic.ffBar': 'Firefox a empêché ce site d’ouvrir une fenêtre pop-up',
  'gate.pic.ffPrefs': 'Préférences',
  'gate.pic.ffAllow': 'Autoriser les pop-up pour raptor3000.pages.dev',
  'gate.pic.ffEdit': 'Modifier les options du bloqueur de pop-up…',

  'dir.chromium.steps':
    'Cliquez sur l’icône de popup à l’extrémité droite de la barre d’adresse et choisissez « Toujours autoriser les pop-up et les redirections de ce site », puis OK. (Ou : Paramètres → Confidentialité et sécurité → Paramètres des sites → Pop-up et redirections → ajoutez ce site.)',
  'dir.firefox.steps':
    'Une barre apparaît en haut de la page quand une popup est bloquée — choisissez Options → « Autoriser les popups pour ce site ». (Ou : Paramètres → Vie privée et sécurité → Permissions → Bloquer les fenêtres popup → Exceptions.)',
  'dir.safari.steps':
    'Menu Safari → Réglages → Sites web → Fenêtres surgissantes → réglez ce site sur Autoriser.',
  'dir.ios.steps':
    'App Réglages → Safari → désactivez « Bloquer les pop-up ». (Petit avertissement : sur téléphone, ce sont des onglets, pas des fenêtres — la vraie expérience se joue sur un ordinateur.)',
  'dir.android.steps':
    'Menu ⋮ → Paramètres → Paramètres des sites → Pop-up et redirections → autoriser. (Même avertissement — des onglets, pas des fenêtres.)',

  // ---- login screen ------------------------------------------------------
  'login.tagline': 'Connectez-vous à FICS',
  'login.profile': 'Profil',
  'login.handle': 'Pseudo',
  'login.password': 'Mot de passe',
  'login.server': 'Serveur',
  'login.port': 'Port',
  'login.guest': 'Connexion en invité',
  'login.timeseal': 'Timeseal activé',
  'login.autoConnect': 'Me connecter automatiquement la prochaine fois',
  'login.submit': 'Se connecter',
  'login.err.handleLength': 'Le pseudo doit faire de 3 à 17 caractères.',
  'login.err.handleLetters': 'Le pseudo ne doit contenir que des lettres.',
  'login.err.noHandle': 'Saisissez un pseudo ou cochez Connexion en invité.',
  'login.err.noPassword': 'Saisissez un mot de passe.',
  'login.shot.observing': 'observation d’une partie avec analyse moteur',
  'login.shot.playing': 'une partie de blitz en cours',
  'login.shot.chat': 'la console de chat en vue partagée',
  'login.shot.seek': 'le graphe des seeks en direct',

  // ---- language control --------------------------------------------------
  'lang.label': 'Langue',
  'lang.auto': 'Automatique',
  'lang.note':
    'La langue de l’interface pour cet écran, les options et l’aide. Automatique suit votre navigateur. Le texte du serveur d’échecs — tells, canaux, résultats de parties — arrive de FICS en anglais, quel que soit votre choix.',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'Raptor3000 est une app de bureau',
  'mobile.body1':
    'Les échiquiers et le chat s’ouvrent dans de <b>vraies fenêtres de navigateur</b>, pilotées en direct par le serveur d’échecs — un téléphone ne sait pas faire ça, donc l’app ne fonctionne pas ici.',
  'mobile.body2': 'Sur un ordinateur, rendez-vous sur <b>raptor3000.pages.dev</b>.',
  'mobile.tryAnyway': 'J’ai un clavier et peu d’attentes — essayer quand même',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': 'Options',
  'shell.nav.help': 'Aide',
  'shell.signedIn': 'Connecté en tant que <b>{who}</b> · {server}:{port} · profil {profile}',
  'shell.who.anonGuest': 'invité anonyme',
  'shell.who.namedGuest': '{name} (invité)',
  'shell.theme.light': 'Jour',
  'shell.theme.dark': 'Nuit',
  'shell.theme.system': 'Système',
  'shell.theme.aria': 'Thème : {mode}. Cliquez pour changer.',
  'shell.blocked.text':
    '<b>Votre navigateur a bloqué une fenêtre d’échiquier.</b> Une partie s’est ouverte sur FICS mais son échiquier n’a pas pu apparaître — autorisez les popups pour ce site et observez à nouveau.',
  'shell.blocked.showMe': 'Voir comment faire',
  'shell.blocked.dismiss': 'ignorer',
  'shell.disconnect.relaunch': 'Relancer',
  'shell.disconnect.body':
    'La connexion à FICS s’est fermée. Relancer redémarre l’app sur l’écran de connexion — les dernières lignes de la console de chat disent pourquoi la session a pris fin (déconnexion pour inactivité, éjection par une connexion plus récente, ou réseau coupé).',
  'shell.footer.session': 'session n°{id}',
  'shell.footer.suggest': 'suggérer une fonctionnalité',
  'shell.footer.report': 'signaler un problème',

  // ---- options -----------------------------------------------------------
  'common.on': 'Activé',
  'common.off': 'Désactivé',
  'common.auto': 'Auto',
  'common.preview': 'Aperçu',

  'options.session': 'Session',
  'options.session.chatWindow': 'Fenêtre de chat',
  'options.session.reopen': 'Rouvrir',
  'options.session.chatNote':
    'La fenêtre de chat s’ouvre toute seule à la connexion ; rouvrez-la ici si vous l’avez fermée.',
  'options.session.connection': 'Connexion',
  'options.session.reconnect': 'Reconnecter',
  'options.session.connectionNote':
    'Sans effet tant que la connexion tient. À utiliser quand une autre connexion éjecte cette session — il reprend le compte (FICS les éjecte à leur tour).',
  'options.session.startOver': 'Tout recommencer',
  'options.session.relaunch': 'Relancer',
  'options.session.relaunchArmed': 'Cliquez encore pour relancer',
  'options.session.relaunchNote':
    'Déconnecte, ferme toutes les fenêtres et redémarre l’app entière sur l’écran de connexion — la connexion automatique est sautée pour ce lancement-là. Rien d’autre n’est modifié ni réinitialisé.',
  'options.session.autoLogin': 'Connexion automatique',
  'options.session.autoLoginNote':
    'Désactivé affiche l’écran de connexion au prochain lancement au lieu de se connecter avec le profil enregistré.',

  'options.board': 'Échiquier',
  'options.board.colors': 'Couleurs',
  'options.board.lightSquares': 'Cases claires',
  'options.board.darkSquares': 'Cases foncées',
  'options.board.pieceSet': 'Jeu de pièces',
  'options.board.animations': 'Animation des coups',
  'options.board.coordinates': 'Afficher les coordonnées',
  'options.board.flipAsBlack': 'Retourner l’échiquier quand vous jouez les noirs',
  'options.board.moveList': 'Liste des coups visible',
  // Board palettes: the four plain colors translate, IC and Horsey are
  // names (lichess's), and Custom is the escape hatch.
  'boardTheme.brown': 'Brun',
  'boardTheme.blue': 'Bleu',
  'boardTheme.green': 'Vert',
  'boardTheme.purple': 'Violet',
  'boardTheme.custom': 'Personnalisé',

  'options.clock': 'Couleurs de la pendule',
  'options.clock.active': 'Active',
  'options.clock.low': 'Manque de temps',
  'options.clock.idle': 'Inactive',
  'options.clock.note':
    'Auto suit le thème de l’app (inactive) et les pastilles verte/rouge d’origine (active, manque de temps). Choisissez des couleurs pour passer outre — le fond, puis le texte.',
  'options.color.background': 'Fond',
  'options.color.text': 'Texte',
  'options.color.hex': '{title} (hex)',

  'options.console': 'Console',
  'options.console.font': 'Police',
  'options.console.fontFamilyTitle': 'font-family CSS pour la fenêtre de chat',
  'options.console.fontSizeTitle': 'Taille de police (px)',
  'options.console.channelTells': 'Tells de canal',
  'options.console.tells': 'Tells',
  'options.console.shouts': 'Shouts',
  'options.console.kibitz': 'Kibitz / whisper',
  'options.console.challenges': 'Défis',
  'options.console.gameStarts': 'Débuts de partie',
  'options.console.gameEnds': 'Fins de partie',
  'options.console.internal': 'Interne',
  'options.console.outbound': 'Vos envois',
  'options.console.note':
    'Une couleur par type de message ; Auto est la palette d’origine. Les fenêtres de chat ouvertes changent de style en direct.',

  'options.defaults': 'Valeurs par défaut',
  'options.defaults.all': 'Toutes les options',
  'options.defaults.reset': 'Rétablir les valeurs par défaut',
  'options.defaults.resetArmed': 'Cliquez encore pour confirmer',
  'options.defaults.note':
    'Rétablit toutes les options ci-dessus — couleurs de l’échiquier, pièces, couleurs de la pendule, interrupteurs — aux valeurs d’usine. Les profils de connexion ne sont pas touchés.',

  'options.engine': 'Moteur',
  'options.engine.available': 'Analyse Stockfish disponible',
  'options.engine.note':
    'Uniquement en observation, en examen et en mode inactif — jamais en cours de partie.',

  'options.sound': 'Son',
  'options.sound.sounds': 'Sons',
  'options.sound.keepAlive': 'Maintien de connexion',
  'options.sound.keepAliveTitle':
    'envoyé (masqué) toutes les 59 minutes tant que la connexion est ouverte',
  'options.sound.moveSounds': 'Sons des coups',
  'options.sound.movePreviewTitle':
    'joue coup, prise et échec du jeu sélectionné',
  'options.sound.alerts': 'Alertes',
  'options.sound.alertPreviewTitle':
    'joue tell, arrivée d’un ami et départ d’un ami dans le style du jeu sélectionné',
  'options.sound.note':
    'Coups, prises et échecs utilisent le jeu sélectionné ; les sons de fin de partie restent sur Piano. Tous les jeux sont ceux de lichess, sous licence libre — le fameux jeu « standard », lui, ne l’est pas. Les alertes — un tell qui arrive, un ami qui se connecte ou s’en va — sont nos propres notes synthétisées, stylées d’après le jeu sélectionné.',

  'options.loginScript': 'Script de connexion',
  'options.loginScript.note1':
    'Envoyé (masqué) après chaque connexion, une commande par ligne ; les lignes vides sont sautées ; s’applique à la prochaine connexion. Gardez',
  'options.loginScript.note2':
    'EN DERNIER si vous le gardez — il scelle les réglages d’interface, et tout ce qui vient après est refusé.',

  'options.channels': 'Canaux',
  'options.channels.autoJoin': 'Rejoindre automatiquement à la connexion',
  'options.channels.autoJoinNote': 'Numéros de canaux séparés par des virgules.',
  'options.channels.backfill': 'Rattrapage d’historique',
  'options.channels.backfillNote':
    'API de journaux de canaux (le bot chessascent). À l’ouverture de la fenêtre de chat, chaque canal rejoint automatiquement est complété avec jusqu’à 24 h de tells d’avant la connexion — remontez pour les lire. Vide pour désactiver.',

  // ---- help --------------------------------------------------------------
  'help.what.title': 'C’est quoi, cette page ?',
  'help.what.body1':
    'Voici la surface <b>Options & Aide</b>. Ce n’est pas un lanceur — la fenêtre de chat s’ouvre toute seule à la connexion, et les fenêtres d’échiquier surgissent d’elles-mêmes quand vous observez ou jouez une partie. Passez par l’onglet Options pour régler les préférences de l’app.',

  'help.popups.title': 'Autoriser les popups (obligatoire)',
  'help.popups.intro':
    'Les échiquiers s’ouvrent quand FICS annonce qu’une partie a commencé — sur un événement réseau, pas sur un clic de votre part — exactement ce que les bloqueurs de popups bloquent. Tant que cette origine n’est pas autorisée, observer une partie écrit une ligne dans la console au lieu d’ouvrir un échiquier. À régler une seule fois :',
  'help.popups.chromium':
    'cliquez sur l’icône de popup à l’extrémité droite de la barre d’adresse quand elle apparaît et choisissez « Toujours autoriser les pop-up et les redirections de ce site ». Ou : Paramètres → Confidentialité et sécurité → Paramètres des sites → Pop-up et redirections → ajoutez ce site aux sites autorisés.',
  'help.popups.firefox':
    'une barre jaune apparaît quand une popup est bloquée ; choisissez Options → « Autoriser les popups pour ce site ». Ou : Paramètres → Vie privée et sécurité → Permissions → Bloquer les fenêtres popup → Exceptions.',
  'help.popups.safari':
    'Safari → Réglages → Sites web → Fenêtres surgissantes → réglez ce site sur Autoriser.',
  'help.popups.appmode1': 'En mode',
  'help.popups.appmode2':
    '(section suivante), les popups ouvertes depuis la fenêtre de l’app héritent de l’autorisation une fois l’origine autorisée.',

  'help.commands.title': 'Commandes de script',
  'help.commands.intro':
    'Quelques lignes que le client traite lui-même (portées des alias de Raptor) — à taper dans n’importe quelle zone de saisie du chat :',
  'help.commands.clear1': 'récupère votre liste et en retire chaque nom, un',
  'help.commands.clear2': 'à la fois.',
  'help.commands.tab1': 'ouvre un onglet de canal.',
  'help.commands.tab2': 'ouvre un onglet de personne. Les deux commandes sont locales : rien n’est envoyé au serveur.',
  'help.commands.rest1': 'Tout le reste part à FICS tel que tapé —',
  'help.commands.refLink': 'la référence des commandes FICS',
  'help.commands.rest2': 'documente l’ensemble des commandes.',

  'help.appmode.title': 'Masquer la barre d’adresse du navigateur (mode app)',
  'help.appmode.intro1':
    'Les navigateurs modernes imposent une barre d’adresse sur les onglets classiques et les popups, pour des raisons de sécurité. Mais les navigateurs basés sur Chromium (Chrome, Brave, Edge) acceptent une option de lancement',
  'help.appmode.intro2':
    'qui ouvre une URL donnée dans une fenêtre nue — pas de barre d’URL, pas de bandeau d’onglets, pas de menu. Créez un raccourci qui passe l’option et épinglez-le à votre barre des tâches ou à votre Dock.',
  'help.appmode.baked1': 'Les commandes ci-dessous sont préparées avec',
  'help.appmode.baked2':
    '— l’adresse même depuis laquelle vous lisez ceci — et sont donc justes au copier-coller, où que l’app soit servie.',
  'help.appmode.linux': 'Linux (GNOME / Pop!_OS / KDE)',
  'help.appmode.linux1': 'Créez',
  'help.appmode.linux1b': 'avec ce contenu :',
  'help.appmode.linux2': 'Actualisez le menu des applications :',
  'help.appmode.linux3':
    'Ouvrez Activités / le menu des applications, cherchez « Raptor3000 », clic droit → Ajouter aux favoris ou glissez l’icône vers votre barre des tâches.',
  'help.appmode.linuxSub1': 'Remplacez',
  'help.appmode.linuxSub2': 'par',
  'help.appmode.linuxSub3': 'ou',
  'help.appmode.linuxSub4': 'si c’est ce que vous utilisez.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'Clic droit sur le Bureau → Nouveau → Raccourci.',
  'help.appmode.windows2':
    'Comme emplacement, collez ceci (ajustez le chemin si votre navigateur vit ailleurs) :',
  'help.appmode.windows2b': 'Pour Chrome :',
  'help.appmode.windows3': 'Nommez-le « Raptor3000 », cliquez sur Terminer.',
  'help.appmode.windows4': 'Clic droit sur le nouveau raccourci → Épingler à la barre des tâches.',
  'help.appmode.windowsIcon1':
    '(Facultatif) Clic droit sur le raccourci → Propriétés → Changer d’icône, pointez vers un fichier',
  'help.appmode.windowsIcon2': 'pour qu’il ne ressemble pas à Brave.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS n’accepte pas d’options CLI brutes sur les raccourcis du Dock ; il faut donc envelopper le lancement dans une petite app',
  'help.appmode.macosIntro2': ':',
  'help.appmode.macos1a': 'Ouvrez',
  'help.appmode.macos1b': '→ Nouveau document →',
  'help.appmode.macos2a': 'Ajoutez une action',
  'help.appmode.macos2b': 'à votre document. Collez ceci (ajustez le chemin du navigateur si besoin) :',
  'help.appmode.macos2c': 'Pour Chrome :',
  'help.appmode.macos3a': 'Enregistrez sous',
  'help.appmode.macos3b': 'dans',
  'help.appmode.macos4a': 'Glissez',
  'help.appmode.macos4b': 'dans le Dock.',
  'help.appmode.macosIcon1': '(Facultatif) Clic droit sur',
  'help.appmode.macosIcon2':
    'dans le Finder → Lire les informations → glissez une icône personnalisée sur la petite icône en haut de la fenêtre pour un Dock plus reconnaissable.',

  'help.about.title': 'À propos & licences',
  'help.about.intro':
    'Raptor3000 est <b>sous licence MIT</b> — troisième d’une lignée, après <b>Raptor</b> (SWT) et <b>Decaf</b> (Java). Il repose sur des épaules aux licences généreuses :',
  'help.about.stockfish':
    '— le moteur d’analyse, qui tourne dans votre navigateur en WebAssembly (GPL-3.0).',
  'help.about.chessops':
    '— la bibliothèque d’échecs de lichess : SAN, légalité des coups, relecture (GPL-3.0-or-later).',
  'help.about.openings': '— les noms d’ouvertures et les codes ECO (CC0, domaine public).',
  'help.about.lichess':
    '— le jeu de sons piano d’Enigmahack (AGPL-3.0+) et les jeux de pièces (cburnett de Colin M.L. Burnett, entre autres, chacun sous sa propre licence).',
  'help.about.fics':
    '— le Free Internet Chess Server, celui-là même à qui toute cette app sert à parler. Soyez sympa sur le canal 39.',
  'help.about.outro1': 'L’inventaire complet, licences exactes comprises, se trouve dans',
  'help.about.outro2': 'dans',
  'help.about.repoLink': 'le dépôt source',
  'help.about.outro3': '. Quelque chose de cassé ou de manquant ?',
  'help.about.reportLink': 'Signalez un problème',
  'help.about.outro4': 'ou',
  'help.about.suggestLink': 'suggérez une fonctionnalité',

  'help.trouble.title': 'Dépannage',
  'help.trouble.addressBarTitle': 'La barre d’adresse s’affiche encore.',
  'help.trouble.addressBar1':
    'Les navigateurs modernes affichent une ligne d’origine en haut des popups, quelles que soient les options passées. Le mode',
  'help.trouble.addressBar2':
    'ci-dessus l’évite entièrement pour la fenêtre principale. Les popups ouvertes depuis une fenêtre en mode app héritent du même traitement, sans habillage.',
  'help.trouble.blockerTitle': 'Bloqueur de popups.',
  'help.trouble.blocker1': 'Autorisez les popups pour',
  'help.trouble.blocker2':
    '(ou votre hôte de production). Dans Brave : Paramètres → Confidentialité et sécurité → Paramètres des sites → Pop-up et redirections.',
  'help.trouble.shortcutTitle': 'Le raccourci ouvre un onglet normal, pas une fenêtre d’app.',
  'help.trouble.shortcut1': 'Vérifiez que l’option est bien',
  'help.trouble.shortcut2': 'avec un',
  'help.trouble.shortcut3':
    'et sans espace, et que le navigateur ne tourne pas déjà avec un profil qui écrase l’option.',
};

export default fr;
