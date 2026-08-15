import type { Messages } from '../messages.js';

/** Spanish (Español). Browser menu paths follow es-ES UI wording (Chrome: 'Configuración de sitios web', 'Hecho'); FICS jargon (tell, shout, kibitz, seek) stays in English as server vocabulary. */
const es: Messages = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': 'Ya casi…',
  'gate.demoChip': 'demo',
  'gate.intro':
    'Raptor3000 funciona como una app de escritorio: el chat y cada tablero se abren como <b>ventanas de verdad</b>. Tu navegador las está bloqueando, y arreglarlo cuesta dos clics:',
  'gate.chromium.step1':
    'Busca este icono en el extremo derecho de la barra de direcciones — acaba de aparecer:',
  'gate.chromium.step2':
    'Haz clic en él, elige <b>Permitir siempre</b> y luego <b>Hecho</b>. Eso es todo.',
  'gate.chromium.caption':
    '(solo es una imagen — el de verdad está arriba, en la barra de tu navegador)',
  'gate.firefox.step1': 'Acaba de aparecer una barra en la parte superior de la página:',
  'gate.firefox.step2':
    'Haz clic en <b>Preferencias</b> y elige <b>Permitir ventanas emergentes para este sitio</b>.',
  'gate.firefox.caption':
    '(solo es una imagen — la barra de verdad es la de Firefox, encima de la página)',
  'gate.watching':
    'No hace falta avisar a nadie: esta pantalla comprueba por sí sola y se aparta en cuanto las ventanas estén permitidas.',
  'gate.others': '¿Usas otro navegador?',
  'gate.testAgain': 'Probar de nuevo',
  'gate.stuck': '¿Sigues atascado?',
  'gate.report': 'infórmanos',
  'gate.demo.allowed': 'demo — este navegador ahora mismo: ventanas emergentes permitidas',
  'gate.demo.blocked': 'demo — este navegador ahora mismo: ventanas emergentes bloqueadas',
  'gate.allowed.title': 'Ventanas emergentes permitidas',
  'gate.allowed.body': 'Las ventanas de tablero y chat se abrirán. Que lo disfrutes.',

  // Per-browser directions. Browser names are product names and stay as
  // they are; the menu paths are what the visitor will literally see in a
  // browser whose own UI may well be in their language — translate the
  // words, keep the arrows and the order.
  // The labels inside the address-bar mock. They are a picture of the
  // visitor's own browser, so an English picture under translated
  // instructions is the same dead end the translations were for.
  'gate.pic.allow': 'Permitir siempre ventanas emergentes y redirecciones de este sitio',
  'gate.pic.blocking': 'Seguir bloqueando',
  'gate.pic.done': 'Hecho',
  'gate.pic.ffBar': 'Firefox ha impedido que este sitio abra una ventana emergente',
  'gate.pic.ffPrefs': 'Preferencias',
  'gate.pic.ffAllow': 'Permitir ventanas emergentes de raptor3000.pages.dev',
  'gate.pic.ffEdit': 'Editar opciones del bloqueador de ventanas emergentes…',

  'dir.chromium.steps':
    'Haz clic en el icono de ventanas emergentes en el extremo derecho de la barra de direcciones y elige "Permitir siempre ventanas emergentes y redirecciones de este sitio", luego Hecho. (O bien: Configuración → Privacidad y seguridad → Configuración de sitios web → Ventanas emergentes y redirecciones → añade este sitio.)',
  'dir.firefox.steps':
    'Cuando se bloquea una ventana emergente aparece una barra en la parte superior — elige Preferencias → "Permitir ventanas emergentes para este sitio". (O bien: Ajustes → Privacidad y seguridad → Permisos → Bloquear ventanas emergentes → Excepciones.)',
  'dir.safari.steps':
    'Menú Safari → Ajustes → Sitios web → Ventanas emergentes → pon este sitio en Permitir.',
  'dir.ios.steps':
    'App Ajustes → Safari → desactiva "Bloquear ventanas emergentes". (Aviso justo: en el teléfono se abren pestañas en lugar de ventanas — la experiencia de verdad está en un ordenador.)',
  'dir.android.steps':
    'Menú ⋮ → Configuración → Configuración de sitios → Ventanas emergentes y redirecciones → permitir. (El mismo aviso justo: pestañas, no ventanas.)',

  // ---- login screen ------------------------------------------------------
  'login.tagline': 'Inicia sesión en FICS',
  'login.profile': 'Perfil',
  'login.handle': 'Usuario',
  'login.password': 'Contraseña',
  'login.server': 'Servidor',
  'login.port': 'Puerto',
  'login.guest': 'Entrar como invitado',
  'login.timeseal': 'Timeseal activado',
  'login.autoConnect': 'Iniciar mi sesión automáticamente la próxima vez',
  'login.submit': 'Iniciar sesión',
  'login.err.handleLength': 'El usuario debe tener entre 3 y 17 caracteres.',
  'login.err.handleLetters': 'El usuario solo puede contener letras.',
  'login.err.noHandle': 'Escribe un usuario o marca "Entrar como invitado".',
  'login.err.noPassword': 'Escribe una contraseña.',
  'login.shot.observing': 'observando una partida con análisis del motor',
  'login.shot.playing': 'jugando una partida de blitz',
  'login.shot.chat': 'la consola de chat en vista dividida',
  'login.shot.seek': 'el gráfico de seeks en vivo',

  // ---- language control --------------------------------------------------
  'lang.label': 'Idioma',
  'lang.auto': 'Automático',
  'lang.note':
    'El idioma de la interfaz para esta pantalla, las opciones y la ayuda. Automático sigue el de tu navegador. El texto del servidor de ajedrez — tells, canales, resultados de partidas — llega de FICS en inglés, elijas lo que elijas.',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'Raptor3000 es una app de escritorio',
  'mobile.body1':
    'Los tableros y el chat se abren como <b>ventanas de navegador de verdad</b>, dirigidas en vivo desde el servidor de ajedrez — los teléfonos no saben hacer eso, así que la app no funciona aquí.',
  'mobile.body2': 'Desde un ordenador, visita <b>raptor3000.pages.dev</b>.',
  'mobile.tryAnyway': 'Tengo teclado y pocas expectativas — probar igualmente',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': 'Opciones',
  'shell.nav.help': 'Ayuda',
  'shell.signedIn': 'Sesión iniciada como <b>{who}</b> · {server}:{port} · perfil {profile}',
  'shell.who.anonGuest': 'invitado anónimo',
  'shell.who.namedGuest': '{name} (invitado)',
  'shell.theme.light': 'Día',
  'shell.theme.dark': 'Noche',
  'shell.theme.system': 'Sistema',
  'shell.theme.aria': 'Tema: {mode}. Haz clic para cambiar.',
  'shell.blocked.text':
    '<b>Tu navegador bloqueó una ventana de tablero.</b> Se abrió una partida en FICS pero su tablero no pudo aparecer — permite las ventanas emergentes para este sitio y vuelve a observar.',
  'shell.blocked.showMe': 'Muéstrame cómo',
  'shell.blocked.dismiss': 'descartar',
  'shell.disconnect.relaunch': 'Relanzar',
  'shell.disconnect.body':
    'La conexión con FICS se cerró. Relanzar reinicia la app en la pantalla de inicio de sesión — las últimas líneas de la consola de chat dicen por qué terminó la sesión (cierre por inactividad, expulsión por un inicio de sesión más reciente, o caída de la red).',
  'shell.footer.session': 'sesión n.º {id}',
  'shell.footer.suggest': 'sugerir una función',
  'shell.footer.report': 'informar de un problema',

  // ---- options -----------------------------------------------------------
  'common.on': 'Activado',
  'common.off': 'Desactivado',
  'common.auto': 'Auto',
  'common.preview': 'Vista previa',

  'options.session': 'Sesión',
  'options.session.chatWindow': 'Ventana de chat',
  'options.session.reopen': 'Reabrir',
  'options.session.chatNote':
    'La ventana de chat se abre sola al iniciar sesión; reábrela aquí si la cerraste.',
  'options.session.connection': 'Conexión',
  'options.session.reconnect': 'Reconectar',
  'options.session.connectionNote':
    'No hace nada mientras estás conectado. Úsalo cuando otro inicio de sesión expulse a esta sesión — recupera la cuenta (y FICS los expulsa a ellos a su vez).',
  'options.session.startOver': 'Empezar de cero',
  'options.session.relaunch': 'Relanzar',
  'options.session.relaunchArmed': 'Haz clic otra vez para relanzar',
  'options.session.relaunchNote':
    'Desconecta, cierra todas las ventanas y reinicia la app entera en la pantalla de inicio de sesión — el inicio de sesión automático se omite solo en ese arranque. No se cambia ni se restablece nada más.',
  'options.session.autoLogin': 'Inicio de sesión automático',
  'options.session.autoLoginNote':
    'Desactivado muestra la pantalla de inicio de sesión en el próximo arranque en lugar de conectar con el perfil guardado.',

  'options.board': 'Tablero',
  'options.board.colors': 'Colores',
  'options.board.lightSquares': 'Casillas claras',
  'options.board.darkSquares': 'Casillas oscuras',
  'options.board.pieceSet': 'Conjunto de piezas',
  'options.board.animations': 'Animación de jugadas',
  'options.board.coordinates': 'Mostrar coordenadas',
  'options.board.flipAsBlack': 'Girar el tablero al jugar con negras',
  'options.board.moveList': 'Lista de jugadas visible',
  // Board palettes: the four plain colors translate, IC and Horsey are
  // names (lichess's), and Custom is the escape hatch.
  'boardTheme.brown': 'Marrón',
  'boardTheme.blue': 'Azul',
  'boardTheme.green': 'Verde',
  'boardTheme.purple': 'Morado',
  'boardTheme.custom': 'Personalizado',

  'options.clock': 'Colores del reloj',
  'options.clock.active': 'Activo',
  'options.clock.low': 'Poco tiempo',
  'options.clock.idle': 'Inactivo',
  'options.clock.note':
    'Auto sigue el tema de la app (inactivo) y los chips verde/rojo de serie (activo, poco tiempo). Elige colores para anularlos — primero el fondo, luego el texto.',
  'options.color.background': 'Fondo',
  'options.color.text': 'Texto',
  'options.color.hex': '{title} (hex)',

  'options.console': 'Consola',
  'options.console.font': 'Fuente',
  'options.console.fontFamilyTitle': 'font-family de CSS para la ventana de chat',
  'options.console.fontSizeTitle': 'Tamaño de fuente (px)',
  'options.console.channelTells': 'Tells de canal',
  'options.console.tells': 'Tells',
  'options.console.shouts': 'Shouts',
  'options.console.kibitz': 'Kibitz / whisper',
  'options.console.challenges': 'Retos',
  'options.console.gameStarts': 'Inicios de partida',
  'options.console.gameEnds': 'Finales de partida',
  'options.console.internal': 'Internos',
  'options.console.outbound': 'Tus envíos',
  'options.console.note':
    'Colores por tipo de mensaje; Auto es la paleta de serie. Las ventanas de chat abiertas cambian de estilo al instante.',

  'options.defaults': 'Valores predeterminados',
  'options.defaults.all': 'Todas las opciones',
  'options.defaults.reset': 'Restablecer valores predeterminados',
  'options.defaults.resetArmed': 'Haz clic otra vez para confirmar',
  'options.defaults.note':
    'Devuelve todas las opciones anteriores — colores del tablero, piezas, colores del reloj, interruptores — a los valores de fábrica. Los perfiles de inicio de sesión no se tocan.',

  'options.engine': 'Motor',
  'options.engine.available': 'Análisis con Stockfish disponible',
  'options.engine.note':
    'Solo en los modos de observación, examen e inactivo — nunca mientras juegas.',

  'options.sound': 'Sonido',
  'options.sound.sounds': 'Sonidos',
  'options.sound.keepAlive': 'Mantener la conexión',
  'options.sound.keepAliveTitle':
    'se envía (oculto) cada 59 minutos mientras estás conectado',
  'options.sound.moveSounds': 'Sonidos de jugada',
  'options.sound.movePreviewTitle':
    'reproduce jugada, captura y jaque del conjunto seleccionado',
  'options.sound.alerts': 'Alertas',
  'options.sound.alertPreviewTitle':
    'reproduce tell, llegada de amigo y salida de amigo al estilo del conjunto seleccionado',
  'options.sound.note':
    'Las jugadas, capturas y jaques usan el conjunto seleccionado; los sonidos de fin de partida se quedan en Piano. Todos los conjuntos son los de lichess con licencia libre — el famoso conjunto "standard" no tiene licencia libre. Las alertas — un tell entrante, un amigo que llega o que se va — son notas sintetizadas propias, al estilo del conjunto seleccionado.',

  'options.loginScript': 'Script de inicio de sesión',
  'options.loginScript.note1':
    'Se envía (oculto) tras cada inicio de sesión, un comando por línea; las líneas en blanco se saltan; se aplica en la próxima conexión. Deja',
  'options.loginScript.note2':
    'el ÚLTIMO si lo conservas — sella los ajustes de interfaz, y todo lo que venga después se rechaza.',

  'options.channels': 'Canales',
  'options.channels.autoJoin': 'Unirse automáticamente al iniciar sesión',
  'options.channels.autoJoinNote': 'Números de canal separados por comas.',
  'options.channels.backfill': 'Relleno de historial',
  'options.channels.backfillNote':
    'API de registro de canales (el bot chessascent). Al abrir la ventana de chat, cada canal de unión automática se rellena con hasta 24 h de tells anteriores al inicio de sesión — desplázate hacia arriba para leerlos. Vacío lo desactiva.',

  // ---- help --------------------------------------------------------------
  'help.what.title': '¿Qué es esta página?',
  'help.what.body1':
    'Esta es la pantalla de <b>Opciones y ayuda</b>. No es un lanzador — la ventana de chat se abre sola al iniciar sesión, y las ventanas de tablero aparecen automáticamente cuando observas o juegas una partida. Usa la pestaña Opciones para cambiar las preferencias de la app.',

  'help.popups.title': 'Permitir ventanas emergentes (obligatorio)',
  'help.popups.intro':
    'Los tableros se abren cuando FICS anuncia que empezó una partida — por un evento de red, no por un clic tuyo — que es exactamente lo que los bloqueadores de ventanas emergentes bloquean. Hasta que este origen esté permitido, observar una partida deja una línea en la consola en lugar de abrir un tablero. El arreglo, una sola vez:',
  'help.popups.chromium':
    'haz clic en el icono de ventanas emergentes en el extremo derecho de la barra de direcciones cuando aparezca y elige "Permitir siempre ventanas emergentes de este sitio". O bien: Configuración → Privacidad y seguridad → Configuración de sitios web → Ventanas emergentes y redirecciones → añade este sitio a la lista de permitidos.',
  'help.popups.firefox':
    'aparece una barra amarilla cuando se bloquea una ventana emergente; elige Preferencias → "Permitir ventanas emergentes para este sitio". O bien: Ajustes → Privacidad y seguridad → Permisos → Bloquear ventanas emergentes → Excepciones.',
  'help.popups.safari':
    'Safari → Ajustes → Sitios web → Ventanas emergentes → pon este sitio en Permitir.',
  'help.popups.appmode1': 'En modo',
  'help.popups.appmode2':
    '(sección siguiente), las ventanas emergentes abiertas desde la ventana de la app heredan el permiso una vez permitido el origen.',

  'help.commands.title': 'Comandos de script',
  'help.commands.intro':
    'Unas pocas líneas que el cliente gestiona por su cuenta (portadas de los alias de Raptor) — escríbelas en cualquier entrada de chat:',
  'help.commands.clear1': 'obtiene tu lista y elimina cada nombre que contiene, un',
  'help.commands.clear2': 'cada vez.',
  'help.commands.tab1': 'abre una pestaña de canal.',
  'help.commands.tab2': 'abre una pestaña de persona. Ambos son locales: no se envía nada al servidor.',
  'help.commands.rest1': 'Todo lo demás va a FICS tal cual lo escribes —',
  'help.commands.refLink': 'la referencia de comandos de FICS',
  'help.commands.rest2': 'documenta el conjunto completo de comandos.',

  'help.appmode.title': 'Ocultar la barra de direcciones del navegador (modo app)',
  'help.appmode.intro1':
    'Los navegadores modernos exigen, por seguridad, una barra de direcciones en las pestañas y ventanas emergentes normales. Pero los navegadores basados en Chromium (Chrome, Brave, Edge) admiten un flag de arranque',
  'help.appmode.intro2':
    'que abre la URL indicada en una ventana sin adornos — sin barra de URL, sin pestañas, sin menú. Crea un acceso directo que pase el flag y ánclalo a tu barra de tareas o Dock.',
  'help.appmode.baked1': 'Los comandos de abajo ya incluyen',
  'help.appmode.baked2':
    '— la dirección desde la que estás leyendo esto — así que se copian y pegan tal cual, se sirva donde se sirva la app.',
  'help.appmode.linux': 'Linux (GNOME / Pop!_OS / KDE)',
  'help.appmode.linux1': 'Crea',
  'help.appmode.linux1b': 'con este contenido:',
  'help.appmode.linux2': 'Actualiza el menú de aplicaciones:',
  'help.appmode.linux3':
    'Abre Actividades / el menú de aplicaciones, busca "Raptor3000", clic derecho → Anclar al Dash o arrástralo a tu barra de tareas.',
  'help.appmode.linuxSub1': 'Sustituye',
  'help.appmode.linuxSub2': 'por',
  'help.appmode.linuxSub3': 'o',
  'help.appmode.linuxSub4': 'si son los que usas.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'Clic derecho en el escritorio → Nuevo → Acceso directo.',
  'help.appmode.windows2':
    'En la ubicación, pega esto (ajusta la ruta si tu navegador vive en otro sitio):',
  'help.appmode.windows2b': 'Para Chrome, en cambio:',
  'help.appmode.windows3': 'Ponle el nombre "Raptor3000" y haz clic en Finalizar.',
  'help.appmode.windows4': 'Clic derecho en el nuevo acceso directo → Anclar a la barra de tareas.',
  'help.appmode.windowsIcon1':
    '(Opcional) Clic derecho en el acceso directo → Propiedades → Cambiar icono, y apúntalo a un',
  'help.appmode.windowsIcon2': 'para que no parezca Brave.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS no acepta flags de CLI directos en los accesos del Dock, así que envuelve el arranque en una pequeña app de',
  'help.appmode.macosIntro2': 'siguiendo estos pasos:',
  'help.appmode.macos1a': 'Abre',
  'help.appmode.macos1b': '→ Nuevo documento →',
  'help.appmode.macos2a': 'Añade una acción',
  'help.appmode.macos2b': 'al flujo de trabajo. Pega esto (ajusta la ruta del navegador si hace falta):',
  'help.appmode.macos2c': 'Para Chrome:',
  'help.appmode.macos3a': 'Guárdalo como',
  'help.appmode.macos3b': 'dentro de',
  'help.appmode.macos4a': 'Arrastra',
  'help.appmode.macos4b': 'al Dock.',
  'help.appmode.macosIcon1': '(Opcional) Clic derecho en',
  'help.appmode.macosIcon2':
    'en el Finder → Obtener información → arrastra un icono personalizado sobre el icono pequeño de arriba para un aspecto propio en el Dock.',

  'help.about.title': 'Acerca de y licencias',
  'help.about.intro':
    'Raptor3000 tiene <b>licencia MIT</b> — el tercero de una estirpe, tras <b>Raptor</b> (SWT) y <b>Decaf</b> (Java). Se apoya en hombros generosamente licenciados:',
  'help.about.stockfish':
    '— el motor de análisis, corriendo en tu navegador como WebAssembly (GPL-3.0).',
  'help.about.chessops':
    '— la biblioteca de ajedrez de lichess: SAN, legalidad, reproducción de partidas (GPL-3.0-or-later).',
  'help.about.openings': '— los nombres de las aperturas y los códigos ECO (CC0, dominio público).',
  'help.about.lichess':
    '— el conjunto de sonidos de piano de Enigmahack (AGPL-3.0+) y los conjuntos de piezas (cburnett, de Colin M.L. Burnett y compañía, cada uno con su propia licencia).',
  'help.about.fics':
    '— el Free Internet Chess Server con el que esta app entera existe para hablar. Pórtate bien en el canal 39.',
  'help.about.outro1': 'El inventario completo con las licencias exactas está en',
  'help.about.outro2': 'en',
  'help.about.repoLink': 'el repositorio del código fuente',
  'help.about.outro3': '. ¿Algo roto o que falte?',
  'help.about.reportLink': 'Informa de un problema',
  'help.about.outro4': 'o',
  'help.about.suggestLink': 'sugiere una función',

  'help.trouble.title': 'Solución de problemas',
  'help.trouble.addressBarTitle': 'La barra de direcciones sigue apareciendo.',
  'help.trouble.addressBar1':
    'Los navegadores modernos muestran una franja de una línea con el origen en la parte superior de las ventanas emergentes, se pidan las opciones que se pidan. El modo',
  'help.trouble.addressBar2':
    'de arriba lo evita por completo en la ventana principal. Las ventanas emergentes abiertas desde una ventana en modo app heredan el mismo tratamiento sin adornos.',
  'help.trouble.blockerTitle': 'Bloqueador de ventanas emergentes.',
  'help.trouble.blocker1': 'Permite las ventanas emergentes para',
  'help.trouble.blocker2':
    '(o tu host de producción). En Brave: Configuración → Privacidad y seguridad → Configuración de sitios web → Ventanas emergentes.',
  'help.trouble.shortcutTitle': 'El acceso directo abre una pestaña normal, no una ventana de app.',
  'help.trouble.shortcut1': 'Asegúrate de que el flag sea',
  'help.trouble.shortcut2': 'con un',
  'help.trouble.shortcut3':
    'y sin espacio, y de que el navegador no esté ya en ejecución con un perfil que lo anule.',
};

export default es;
