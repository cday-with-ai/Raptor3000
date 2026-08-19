import type { Messages } from '../messages.js';

/** Portuguese (Português, pt-BR). Judgment call: FICS jargon the player types or reads from the server (handle, tell, shout, kibitz, seek) stays in English; for Firefox’s popup bar I used «Opções», the pt-BR button label on Windows (Linux/macOS shows «Preferências»). */
const pt: Messages = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': 'Quase lá…',
  'gate.demoChip': 'demo',
  'gate.intro':
    'O Raptor3000 funciona como um app de desktop — o chat e cada tabuleiro abrem como <b>janelas de verdade</b>. Seu navegador está bloqueando essas janelas, e resolver isso leva dois cliques:',
  'gate.chromium.step1':
    'Encontre este ícone na ponta direita da barra de endereço — ele acabou de aparecer:',
  'gate.chromium.step2':
    'Clique nele, escolha <b>Sempre permitir</b> e depois <b>Concluído</b>. Só isso.',
  'gate.chromium.caption':
    '(é só uma imagem — o ícone de verdade está lá em cima, na barra do seu navegador)',
  'gate.firefox.step1': 'Uma barra acabou de aparecer no topo da página:',
  'gate.firefox.step2':
    'Clique em <b>Opções</b> e escolha <b>Permitir pop-ups deste site</b>.',
  'gate.firefox.caption':
    '(é só uma imagem — a barra de verdade é a do próprio Firefox, acima da página)',
  'gate.watching':
    'Não precisa avisar ninguém — esta tela verifica sozinha e sai da frente assim que as janelas forem permitidas.',
  'gate.others': 'Usando outro navegador?',
  'gate.testAgain': 'Testar de novo',
  'gate.stuck': 'Ainda travado?',
  'gate.report': 'relate o problema',
  'gate.demo.allowed': 'demo — este navegador agora: pop-ups permitidos',
  'gate.demo.blocked': 'demo — este navegador agora: pop-ups bloqueados',
  'gate.allowed.title': 'Pop-ups permitidos',
  'gate.allowed.body': 'As janelas de tabuleiro e de chat vão abrir. Aproveite.',

  // Per-browser directions. Browser names are product names and stay as
  // they are; the menu paths are what the visitor will literally see in a
  // browser whose own UI may well be in their language — translate the
  // words, keep the arrows and the order.
  // The labels inside the address-bar mock. They are a picture of the
  // visitor's own browser, so an English picture under translated
  // instructions is the same dead end the translations were for.
  'gate.pic.allow': 'Sempre permitir pop-ups e redirecionamentos deste site',
  'gate.pic.blocking': 'Continuar bloqueando',
  'gate.pic.done': 'Concluído',
  'gate.pic.ffBar': 'O Firefox impediu que este site abrisse uma janela pop-up',
  'gate.pic.ffPrefs': 'Preferências',
  'gate.pic.ffAllow': 'Permitir pop-ups de raptor3000.pages.dev',
  'gate.pic.ffEdit': 'Editar opções do bloqueador de pop-ups…',

  'dir.chromium.steps':
    'Clique no ícone de pop-up na ponta direita da barra de endereço e escolha "Sempre permitir pop-ups e redirecionamentos deste site", depois Concluído. (Ou: Configurações → Privacidade e segurança → Configurações do site → Pop-ups e redirecionamentos → adicione este site.)',
  'dir.firefox.steps':
    'Quando um pop-up é bloqueado, uma barra aparece no topo — escolha Opções → "Permitir pop-ups deste site". (Ou: Configurações → Privacidade e Segurança → Permissões → Bloquear janelas pop-up → Exceções.)',
  'dir.safari.steps':
    'Menu Safari → Ajustes → Sites → Janelas Pop-Up → defina este site como Permitir.',
  'dir.ios.steps':
    'App Ajustes → Safari → desative "Bloquear Pop-ups". (Aviso honesto: no celular abrem abas em vez de janelas — a experiência de verdade é no desktop.)',
  'dir.android.steps':
    'Menu ⋮ → Configurações → Configurações do site → Pop-ups e redirecionamentos → permitir. (Mesmo aviso — abas, não janelas.)',

  // ---- login screen ------------------------------------------------------
  'login.tagline': 'Entre no FICS',
  'login.profile': 'Perfil',
  'login.handle': 'Handle',
  'login.password': 'Senha',
  'login.server': 'Servidor',
  'login.port': 'Porta',
  'login.guest': 'Entrar como convidado',
  'login.timeseal': 'Timeseal ativado',
  'login.autoConnect': 'Entrar automaticamente da próxima vez',
  'login.submit': 'Entrar',
  'login.err.handleLength': 'O handle deve ter de 3 a 17 caracteres.',
  'login.err.handleLetters': 'O handle deve conter apenas letras.',
  'login.err.noHandle': 'Digite um handle ou marque "Entrar como convidado".',
  'login.err.noPassword': 'Digite uma senha.',
  'login.shot.observing': 'observando uma partida com análise de engine',
  'login.shot.playing': 'jogando uma partida de blitz',
  'login.shot.chat': 'o console de chat em visão dividida',
  'login.shot.seek': 'o gráfico de seeks ao vivo',

  // ---- language control --------------------------------------------------
  'options.session.appIcon': 'Ícone da aplicação',
  'options.session.appIconNote':
    'Muda o ícone do separador do navegador e o emblema dentro da aplicação. O ícone do atalho no ambiente de trabalho é definido fora da aplicação.',
  'lang.label': 'Idioma',
  'lang.auto': 'Automático',
  'lang.note':
    'O idioma da interface desta tela, das opções e da ajuda. Automático segue o navegador. O texto do servidor de xadrez — tells, canais, resultados de partidas — chega do FICS em inglês, seja qual for a sua escolha.',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'O Raptor3000 é um app de desktop',
  'mobile.body1':
    'Tabuleiros e chat abrem como <b>janelas de verdade do navegador</b>, controladas ao vivo pelo servidor de xadrez — celulares não conseguem fazer isso, então o app não funciona aqui.',
  'mobile.body2': 'Em um computador, acesse <b>raptor3000.pages.dev</b>.',
  'mobile.tryAnyway': 'Tenho um teclado e expectativas baixas — tentar mesmo assim',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': 'Opções',
  'shell.nav.help': 'Ajuda',
  'shell.signedIn': 'Conectado como <b>{who}</b> · {server}:{port} · perfil {profile}',
  'shell.who.anonGuest': 'convidado anônimo',
  'shell.who.namedGuest': '{name} (convidado)',
  'shell.theme.light': 'Dia',
  'shell.theme.dark': 'Noite',
  'shell.theme.system': 'Sistema',
  'shell.theme.aria': 'Tema: {mode}. Clique para alternar.',
  'shell.blocked.text':
    '<b>Seu navegador bloqueou uma janela de tabuleiro.</b> Uma partida começou no FICS mas o tabuleiro não pôde aparecer — permita pop-ups para este site e observe de novo.',
  'shell.blocked.showMe': 'Ver como fazer',
  'shell.blocked.dismiss': 'dispensar',
  'shell.disconnect.relaunch': 'Reiniciar',
  'shell.disconnect.body':
    'A conexão com o FICS foi encerrada. Reiniciar reabre o app na tela de login — as últimas linhas do console de chat dizem por que a sessão terminou (logout por inatividade, derrubada por um login mais recente ou queda da rede).',
  'shell.footer.session': 'sessão #{id}',
  'shell.footer.suggest': 'sugerir um recurso',
  'shell.footer.report': 'relatar um problema',

  // ---- options -----------------------------------------------------------
  'common.on': 'Ativado',
  'common.off': 'Desativado',
  'common.auto': 'Auto',
  'common.preview': 'Prévia',

  'options.session': 'Sessão',
  'options.session.startOver': 'Começar de novo',
  'options.session.relaunch': 'Reiniciar',
  'options.session.relaunchArmed': 'Clique de novo para reiniciar',
  'options.session.relaunchNote':
    'Desconecta, fecha todas as janelas e reinicia o app inteiro na tela de login — o login automático é pulado só nessa inicialização. Nada mais é alterado ou redefinido.',
  'options.session.autoLogin': 'Login automático',
  'options.session.autoLoginNote':
    'Desativado mostra a tela de login na próxima inicialização, em vez de conectar com o perfil salvo.',

  'options.board': 'Tabuleiro',
  'options.board.colors': 'Cores',
  'options.board.lightSquares': 'Casas claras',
  'options.board.darkSquares': 'Casas escuras',
  'options.board.pieceSet': 'Conjunto de peças',
  'options.board.animations': 'Animações de lance',
  'options.board.coordinates': 'Mostrar coordenadas',
  'options.board.flipAsBlack': 'Girar o tabuleiro ao jogar de pretas',
  'options.board.moveList': 'Lista de lances visível',
  'options.board.frame': 'Moldura',
  'options.board.frameNote':
    'A faixa em volta das casas. Shadow é o original. Madeira e Mat põem as letras na faixa.',
  // Board palettes: the four plain colors translate, IC and Horsey are
  // names (lichess's), and Custom is the escape hatch.
  'boardTheme.brown': 'Marrom',
  'boardTheme.blue': 'Azul',
  'boardTheme.green': 'Verde',
  'boardTheme.purple': 'Roxo',
  'boardTheme.custom': 'Personalizado',

  'options.clock': 'Relógios',
  'options.clock.design': 'Visual',
  'options.clock.active': 'Ativo',
  'options.clock.low': 'Pouco tempo',
  'options.clock.idle': 'Parado',
  'options.clock.note':
    'Um visual é o relógio inteiro — letra, caixa, dia e noite. As cores Auto seguem esse visual; escolha cores para substituir um estado.',
  'options.color.background': 'Fundo',
  'options.color.text': 'Texto',
  'options.color.hex': '{title} (hex)',

  'options.console': 'Console',
  'options.console.font': 'Fonte',
  'options.console.fontFamilyTitle': 'font-family (CSS) da janela de chat',
  'options.console.fontSizeTitle': 'Tamanho da fonte (px)',
  'options.console.channelTells': 'Tells de canal',
  'options.console.tells': 'Tells',
  'options.console.shouts': 'Shouts',
  'options.console.kibitz': 'Kibitz / whisper',
  'options.console.challenges': 'Desafios',
  'options.console.gameStarts': 'Inícios de partida',
  'options.console.gameEnds': 'Fins de partida',
  'options.console.internal': 'Interno',
  'options.console.outbound': 'Seus envios',
  'options.console.note':
    'Cores por tipo de mensagem; Auto é a paleta de fábrica. Janelas de chat abertas mudam de estilo na hora.',

  'options.defaults': 'Padrões',
  'options.defaults.all': 'Todas as opções',
  'options.defaults.reset': 'Restaurar padrões',
  'options.defaults.resetArmed': 'Clique de novo para confirmar',
  'options.defaults.note':
    'Restaura todas as opções acima — cores do tabuleiro, peças, cores do relógio, os liga/desliga — para os padrões de fábrica. Os perfis de login não são tocados.',

  'options.engine': 'Engine',
  'options.engine.available': 'Análise com Stockfish disponível',
  'options.engine.note':
    'Só ao observar, examinar ou em modo inativo — nunca enquanto você joga.',

  'options.sound': 'Som',
  'options.sound.sounds': 'Sons',
  'options.sound.keepAlive': 'Manter conexão',
  'options.sound.keepAliveTitle':
    'enviado (oculto) a cada 59 minutos enquanto conectado',
  'options.sound.moveSounds': 'Sons de lance',
  'options.sound.movePreviewTitle':
    'toca lance, captura e xeque do conjunto selecionado',
  'options.sound.alerts': 'Alertas',
  'options.sound.alertPreviewTitle':
    'toca tell, chegada e saída de amigo no estilo do conjunto selecionado',
  'options.sound.note':
    'Lances, capturas e xeques usam o conjunto selecionado. Felt, Walnut, Marble, Clock, Study, Slate e Piano também tocam os próprios sons de fim de partida; Sfx / Futuristic / Nes recuam para Piano nisso. As seis paletas nomeadas são originais; as outras quatro são os conjuntos livres do Enigmahack no lichess — o famoso conjunto "standard" não tem licença livre. Os alertas — um tell chegando, um amigo entrando ou saindo — são notas sintetizadas por nós no estilo do conjunto selecionado.',

  'options.pgnJournal': 'Salvamento automático de PGN',
  'options.pgnJournal.append': 'Adicionar as partidas que eu jogo',
  'options.pgnJournal.appendNote':
    'Cada partida que você JOGA é adicionada a um arquivo PGN no final — as que você apenas observa ou examina nunca chegam lá. Funciona no Chrome, Brave e Edge; outros navegadores não salvam nada.',
  'options.pgnJournal.file': 'Arquivo do diário',
  'options.pgnJournal.choose': 'Escolher arquivo…',
  'options.pgnJournal.change': 'Trocar arquivo…',
  'options.pgnJournal.unsupported':
    'Este navegador não tem a API de acesso ao sistema de arquivos — o salvamento automático não está disponível aqui.',
  'options.pgnJournal.chosenNote':
    'As partidas serão adicionadas aqui no final. Se o navegador perguntar de novo, escolha o arquivo novamente para renovar a permissão.',
  'options.pgnJournal.noneNote':
    'Nenhum arquivo escolhido ainda — nada é salvo até você escolher um.',

  'options.loginScript': 'Script de login',
  'options.loginScript.note1':
    'Enviado (oculto) após cada login, um comando por linha; linhas em branco são ignoradas; vale a partir da próxima conexão. Mantenha',
  'options.loginScript.note2':
    'por ÚLTIMO se for mantê-lo — ele sela as configurações da interface, e qualquer coisa depois dele é recusada.',

  'options.channels': 'Canais',
  'options.channels.autoJoin': 'Entrar automaticamente no login',
  'options.channels.autoJoinNote': 'Números de canal separados por vírgula.',
  'options.channels.backfill': 'Histórico retroativo',
  'options.channels.backfillNote':
    'API de log de canais (o bot chessascent). Ao abrir a janela de chat, cada canal de entrada automática recebe até 24h de tells de antes do login — role para cima para lê-los. Vazio desativa.',

  // ---- help --------------------------------------------------------------
  'help.what.title': 'Que página é esta?',
  'help.what.body1':
    'Esta é a área de <b>Opções e Ajuda</b>. Não é um lançador — a janela de chat abre sozinha quando você entra, e as janelas de tabuleiro aparecem automaticamente quando você observa ou joga uma partida. Use a aba Opções para mudar as preferências do app.',

  'help.popups.title': 'Permitir pop-ups (obrigatório)',
  'help.popups.intro':
    'Os tabuleiros abrem quando o FICS avisa que uma partida começou — a partir de um evento de rede, não de um clique seu — que é exatamente o que os bloqueadores de pop-up bloqueiam. Enquanto esta origem não for permitida, observar uma partida gera uma linha no console em vez de abrir um tabuleiro. Correção única:',
  'help.popups.chromium':
    'clique no ícone de pop-up na ponta direita da barra de endereço quando ele aparecer e escolha "Sempre permitir pop-ups e redirecionamentos deste site". Ou: Configurações → Privacidade e segurança → Configurações do site → Pop-ups e redirecionamentos → adicione este site em "Com permissão para enviar pop-ups e usar redirecionamentos".',
  'help.popups.firefox':
    'uma barra amarela aparece quando um pop-up é bloqueado; escolha Opções → "Permitir pop-ups deste site". Ou: Configurações → Privacidade e Segurança → Permissões → Bloquear janelas pop-up → Exceções.',
  'help.popups.safari':
    'Safari → Ajustes → Sites → Janelas Pop-Up → defina este site como Permitir.',
  'help.popups.appmode1': 'No modo',
  'help.popups.appmode2':
    '(seção seguinte), os pop-ups abertos pela janela do app herdam a permissão assim que a origem for liberada.',

  'help.commands.title': 'Comandos de script',
  'help.commands.intro':
    'Algumas linhas que o próprio cliente trata (portadas dos aliases do Raptor) — digite em qualquer campo de chat:',
  'help.commands.clear1': 'busca a sua lista e remove cada nome que estiver nela, um',
  'help.commands.clear2': 'por vez.',
  'help.commands.tab1': 'abre uma aba de canal.',
  'help.commands.tab2': 'abre uma aba de pessoa. Os dois são locais: nada é enviado ao servidor.',
  'help.commands.rest1': 'Todo o resto vai para o FICS como foi digitado —',
  'help.commands.refLink': 'a referência de comandos do FICS',
  'help.commands.rest2': 'documenta o conjunto completo de comandos.',

  'help.appmode.title': 'Esconder a barra de endereço do navegador (modo app)',
  'help.appmode.intro1':
    'Navegadores modernos exigem barra de endereço em abas e pop-ups comuns, por segurança. Mas os navegadores baseados em Chromium (Chrome, Brave, Edge) aceitam a flag de inicialização',
  'help.appmode.intro2':
    'que abre a URL indicada em uma janela limpa — sem barra de endereço, sem fileira de abas, sem menu. Crie um atalho que passe a flag e fixe-o na barra de tarefas ou no Dock.',
  'help.appmode.baked1': 'Os comandos abaixo já vêm com',
  'help.appmode.baked2':
    '— o endereço de onde você está lendo isto — então saem corretos num copiar-e-colar, onde quer que o app esteja servido.',
  'help.appmode.linux': 'Linux (GNOME / Pop!_OS / KDE)',
  'help.appmode.linux1': 'Crie',
  'help.appmode.linux1b': 'com este conteúdo:',
  'help.appmode.linux2': 'Atualize o menu de aplicativos:',
  'help.appmode.linux3':
    'Abra Atividades / o menu de aplicativos, procure "Raptor3000", clique com o botão direito → Fixar no dash, ou arraste para a sua barra de tarefas.',
  'help.appmode.linuxSub1': 'Troque',
  'help.appmode.linuxSub2': 'por',
  'help.appmode.linuxSub3': 'ou',
  'help.appmode.linuxSub4': 'se você usa um desses.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'Clique com o botão direito na área de trabalho → Novo → Atalho.',
  'help.appmode.windows2':
    'No local do item, cole (ajuste o caminho se o seu navegador estiver em outro lugar):',
  'help.appmode.windows2b': 'Para o Chrome:',
  'help.appmode.windows3': 'Dê o nome "Raptor3000" e clique em Concluir.',
  'help.appmode.windows4': 'Clique com o botão direito no novo atalho → Fixar na barra de tarefas.',
  'help.appmode.windowsIcon1':
    '(Opcional) Clique com o botão direito no atalho → Propriedades → Alterar Ícone e aponte para um',
  'help.appmode.windowsIcon2': 'para que ele não fique com cara de Brave.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'O macOS não aceita flags de CLI puras em atalhos do Dock, então crie um pequeno app no',
  'help.appmode.macosIntro2': 'para embrulhar a inicialização:',
  'help.appmode.macos1a': 'Abra o',
  'help.appmode.macos1b': '→ Novo Documento →',
  'help.appmode.macos2a': 'Adicione a ação',
  'help.appmode.macos2b': 'ao fluxo. Cole (ajuste o caminho do navegador, se preciso):',
  'help.appmode.macos2c': 'Para o Chrome:',
  'help.appmode.macos3a': 'Salve como',
  'help.appmode.macos3b': 'em',
  'help.appmode.macos4a': 'Arraste',
  'help.appmode.macos4b': 'para o Dock.',
  'help.appmode.macosIcon1': '(Opcional) Clique com o botão direito em',
  'help.appmode.macosIcon2':
    'no Finder → Obter Informações → arraste um ícone personalizado sobre o ícone no alto da janela para dar um visual próprio no Dock.',

  'help.about.title': 'Sobre e licenças',
  'help.about.intro':
    'O Raptor3000 tem <b>licença MIT</b> — o terceiro de uma linhagem, depois do <b>Raptor</b> (SWT) e do <b>Decaf</b> (Java). Ele se apoia em ombros generosamente licenciados:',
  'help.about.stockfish':
    '— o engine de análise, rodando no seu navegador como WebAssembly (GPL-3.0).',
  'help.about.chessops':
    '— a biblioteca de xadrez do lichess: SAN, legalidade, replay (GPL-3.0-or-later).',
  'help.about.openings': '— os nomes das aberturas e os códigos ECO (CC0, domínio público).',
  'help.about.lichess':
    '— os conjuntos restantes piano / sfx / futuristic / nes de Enigmahack (AGPL-3.0+) e os conjuntos de peças (cburnett, de Colin M.L. Burnett, e companhia, cada um sob a própria licença). Os sons Felt, Walnut, Marble, Clock, Study e Slate, e o conjuntos de peças Of Course I Still Love You, Just Read The Instructions e A Shortfall Of Gravitas, So Much For Subtlety, Very Little Gravitas Indeed, são originais do Raptor3000.',
  'help.about.fics':
    '— o Free Internet Chess Server, com quem este app inteiro existe para conversar. Seja gentil no canal 39.',
  'help.about.outro1': 'O inventário completo, com as licenças exatas, fica em',
  'help.about.outro2': 'no',
  'help.about.repoLink': 'repositório do código-fonte',
  'help.about.outro3': '. Algo quebrado ou faltando?',
  'help.about.reportLink': 'Relate um problema',
  'help.about.outro4': 'ou',
  'help.about.suggestLink': 'sugira um recurso',

  'help.trouble.title': 'Solução de problemas',
  'help.trouble.addressBarTitle': 'A barra de endereço ainda aparece.',
  'help.trouble.addressBar1':
    'Navegadores modernos mostram uma faixa de uma linha com a origem no topo dos pop-ups, independentemente das opções. O modo',
  'help.trouble.addressBar2':
    'acima evita isso por completo para a janela principal. Pop-ups abertos de dentro de uma janela em modo app herdam o mesmo visual sem moldura.',
  'help.trouble.blockerTitle': 'Bloqueador de pop-ups.',
  'help.trouble.blocker1': 'Permita pop-ups para',
  'help.trouble.blocker2':
    '(ou o seu host de produção). No Brave: Configurações → Privacidade e segurança → Configurações do site → Pop-ups.',
  'help.trouble.shortcutTitle': 'O atalho abre uma aba comum, não uma janela de app.',
  'help.trouble.shortcut1': 'Confira se a flag é',
  'help.trouble.shortcut2': 'com um',
  'help.trouble.shortcut3':
    'e sem espaço, e se o navegador já não está rodando com um perfil que passa por cima dela.',
};

export default pt;
