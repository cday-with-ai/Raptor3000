import type { Messages } from '../messages.js';

/** Korean (한국어). Judgment calls: 존댓말 throughout (~합니다/~하세요 — a competent desktop app, not marketing copy); browser menu paths use each browser’s real Korean UI strings (Chrome’s “개인정보 보호 및 보안”, Firefox’s “개인 정보 및 보안 → 권한 → 예외 목록”, Safari’s “팝업 윈도우”, Windows’ “마침”, GNOME’s “즐겨찾기에 추가”, Automator’s “새로운 문서”); and since Korean is SOV, the sentence fragments around `<code>` spans are re-cut so a particle never lands after a JSX space — e.g. `+tab 39` is followed by a full clause and `/Applications` by a noun, never by a bare 을/를/에. */
const ko: Messages = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': '거의 다 됐습니다…',
  'gate.demoChip': '데모',
  'gate.intro':
    'Raptor3000은 데스크톱 앱처럼 동작합니다 — 채팅도, 모든 체스판도 <b>진짜 창</b>으로 열립니다. 지금은 브라우저가 그 창들을 막고 있는데, 푸는 데는 두 번의 클릭이면 충분합니다:',
  'gate.chromium.step1':
    '주소 표시줄 오른쪽 끝에 있는 이 아이콘을 찾아보세요 — 방금 나타났습니다:',
  'gate.chromium.step2':
    '아이콘을 클릭해 <b>항상 허용</b>을 고른 다음 <b>완료</b>를 누르세요. 이게 전부입니다.',
  'gate.chromium.caption':
    '(그림일 뿐입니다 — 진짜 아이콘은 위쪽 브라우저 자체 표시줄에 있습니다)',
  'gate.firefox.step1': '방금 페이지 맨 위에 알림 막대가 나타났습니다:',
  'gate.firefox.step2':
    '<b>설정</b>을 클릭하고 <b>이 사이트의 팝업 허용</b>을 고르세요.',
  'gate.firefox.caption':
    '(그림일 뿐입니다 — 진짜 막대는 Firefox 자체 알림으로, 페이지 위쪽에 있습니다)',
  'gate.watching':
    '누구에게 알릴 필요는 없습니다 — 이 화면이 알아서 확인하다가 창이 허용되는 순간 비켜섭니다.',
  'gate.others': '다른 브라우저를 쓰고 계신가요?',
  'gate.testAgain': '다시 확인',
  'gate.stuck': '아직도 막혀 있나요?',
  'gate.report': '알려 주세요',
  'gate.demo.allowed': '데모 — 지금 이 브라우저: 팝업 허용됨',
  'gate.demo.blocked': '데모 — 지금 이 브라우저: 팝업 차단됨',
  'gate.allowed.title': '팝업이 허용되었습니다',
  'gate.allowed.body': '이제 체스판과 채팅 창이 열립니다. 즐거운 대국 되세요.',

  // Per-browser directions. Browser names are product names and stay as
  // they are; the menu paths are what the visitor will literally see in a
  // browser whose own UI may well be in their language — translate the
  // words, keep the arrows and the order.
  // The labels inside the address-bar mock. They are a picture of the
  // visitor's own browser, so an English picture under translated
  // instructions is the same dead end the translations were for.
  'gate.pic.allow': '이 사이트에서 팝업 및 리디렉션 항상 허용',
  'gate.pic.blocking': '계속 차단',
  'gate.pic.done': '완료',
  'gate.pic.ffBar': 'Firefox가 이 사이트의 팝업 창 열기를 차단했습니다',
  'gate.pic.ffPrefs': '설정',
  'gate.pic.ffAllow': 'raptor3000.pages.dev의 팝업 허용',
  'gate.pic.ffEdit': '팝업 차단 설정 편집…',

  'dir.chromium.steps':
    '주소 표시줄 오른쪽 끝의 팝업 아이콘을 클릭해 "이 사이트에서 팝업 및 리디렉션 항상 허용"을 고른 다음 완료를 누르세요. (또는: 설정 → 개인정보 보호 및 보안 → 사이트 설정 → 팝업 및 리디렉션 → 이 사이트를 추가.)',
  'dir.firefox.steps':
    '팝업이 차단되면 페이지 맨 위에 막대가 나타납니다 — 거기서 설정 → "이 사이트의 팝업 허용"을 고르세요. (또는: 설정 → 개인 정보 및 보안 → 권한 → 팝업 창 차단 → 예외 목록.)',
  'dir.safari.steps':
    'Safari 메뉴 → 설정 → 웹사이트 → 팝업 윈도우 → 이 사이트를 허용으로 설정하세요.',
  'dir.ios.steps':
    '설정 앱 → Safari → "팝업 차단"을 끄세요. (미리 말씀드리면: 휴대폰에서는 창 대신 브라우저 탭이 열립니다 — 제대로 된 경험은 데스크톱에 있습니다.)',
  'dir.android.steps':
    '⋮ 메뉴 → 설정 → 사이트 설정 → 팝업 및 리디렉션 → 허용. (같은 이야기입니다 — 창이 아니라 탭입니다.)',

  // ---- login screen ------------------------------------------------------
  'login.tagline': 'FICS에 로그인',
  'login.profile': '프로필',
  'login.handle': '핸들',
  'login.password': '비밀번호',
  'login.server': '서버',
  'login.port': '포트',
  'login.guest': '게스트 로그인',
  'login.timeseal': 'Timeseal 사용',
  'login.autoConnect': '다음부터 자동으로 로그인',
  'login.submit': '로그인',
  'login.err.handleLength': '핸들은 3자 이상 17자 이하여야 합니다.',
  'login.err.handleLetters': '핸들에는 영문자만 쓸 수 있습니다.',
  'login.err.noHandle': '핸들을 입력하거나 게스트 로그인을 선택하세요.',
  'login.err.noPassword': '비밀번호를 입력하세요.',
  'login.shot.observing': '엔진 분석과 함께 대국 관전하기',
  'login.shot.playing': '블리츠 대국 두기',
  'login.shot.chat': '분할 화면의 채팅 콘솔',
  'login.shot.seek': '실시간 시크 그래프',

  // ---- language control --------------------------------------------------
  'lang.label': '언어',
  'lang.auto': '자동',
  'lang.note':
    '이 화면과 옵션, 도움말에 쓰이는 인터페이스 언어입니다. 자동은 브라우저 설정을 따릅니다. 체스 서버에서 오는 텍스트(텔, 채널, 대국 결과)는 무엇을 고르든 FICS에서 영어로 도착합니다.',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'Raptor3000은 데스크톱 앱입니다',
  'mobile.body1':
    '체스판과 채팅은 <b>진짜 브라우저 창</b>으로 열리고, 체스 서버가 그 창들을 실시간으로 움직입니다 — 휴대폰은 그렇게 하지 못하므로 여기서는 앱이 동작하지 않습니다.',
  'mobile.body2': '컴퓨터에서 <b>raptor3000.pages.dev</b>로 접속하세요.',
  'mobile.tryAnyway': '키보드도 있고 기대치도 낮습니다 — 그래도 해 보기',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': '옵션',
  'shell.nav.help': '도움말',
  'shell.signedIn': '<b>{who}</b>(으)로 로그인 중 · {server}:{port} · 프로필 {profile}',
  'shell.who.anonGuest': '익명 게스트',
  'shell.who.namedGuest': '{name} (게스트)',
  'shell.theme.light': '낮',
  'shell.theme.dark': '밤',
  'shell.theme.system': '시스템',
  'shell.theme.aria': '테마: {mode}. 클릭하면 전환합니다.',
  'shell.blocked.text':
    '<b>브라우저가 체스판 창을 차단했습니다.</b> FICS에서 대국이 시작됐지만 체스판을 띄우지 못했습니다 — 이 사이트의 팝업을 허용한 뒤 다시 관전하세요.',
  'shell.blocked.showMe': '방법 보기',
  'shell.blocked.dismiss': '닫기',
  'shell.disconnect.relaunch': '다시 시작',
  'shell.disconnect.body':
    'FICS와의 연결이 끊어졌습니다. 다시 시작을 누르면 앱이 로그인 화면에서 새로 뜹니다 — 세션이 왜 끝났는지는 채팅 콘솔의 마지막 줄에 남아 있습니다(대기 시간 초과, 더 새로운 로그인에 밀림, 네트워크 끊김).',
  'shell.footer.session': '세션 #{id}',
  'shell.footer.suggest': '기능 제안하기',
  'shell.footer.report': '문제 신고하기',

  // ---- options -----------------------------------------------------------
  'common.on': '켬',
  'common.off': '끔',
  'common.auto': '자동',
  'common.preview': '미리 듣기',

  'options.session': '세션',
  'options.session.startOver': '처음부터 다시',
  'options.session.relaunch': '다시 시작',
  'options.session.relaunchArmed': '다시 시작하려면 한 번 더 클릭',
  'options.session.relaunchNote':
    '연결을 끊고 모든 창을 닫은 뒤, 앱 전체를 로그인 화면에서 다시 시작합니다 — 그 한 번만 자동 로그인을 건너뜁니다. 그 밖에는 아무것도 바뀌거나 초기화되지 않습니다.',
  'options.session.autoLogin': '자동 로그인',
  'options.session.autoLoginNote':
    '끄면 다음 실행 때 저장된 프로필로 연결하지 않고 로그인 화면을 보여 줍니다.',

  'options.board': '체스판',
  'options.board.colors': '색상',
  'options.board.lightSquares': '밝은 칸',
  'options.board.darkSquares': '어두운 칸',
  'options.board.pieceSet': '기물 세트',
  'options.board.animations': '기물 이동 애니메이션',
  'options.board.coordinates': '좌표 표시',
  'options.board.flipAsBlack': '흑으로 둘 때 체스판 뒤집기',
  'options.board.moveList': '기보 목록 표시',
  // Board palettes: the four plain colors translate, IC and Horsey are
  // names (lichess's), and Custom is the escape hatch.
  'boardTheme.brown': '갈색',
  'boardTheme.blue': '파랑',
  'boardTheme.green': '초록',
  'boardTheme.purple': '보라',
  'boardTheme.custom': '직접 지정',

  'options.clock': '시계 색상',
  'options.clock.active': '진행 중',
  'options.clock.low': '시간 부족',
  'options.clock.idle': '대기',
  'options.clock.note':
    '자동은 대기일 때 앱 테마를, 진행 중과 시간 부족일 때 기본 초록/빨강 칩을 따릅니다. 직접 정하려면 색을 고르세요 — 배경을 먼저, 그다음 글자색입니다.',
  'options.color.background': '배경',
  'options.color.text': '글자',
  'options.color.hex': '{title} (16진수)',

  'options.console': '콘솔',
  'options.console.font': '글꼴',
  'options.console.fontFamilyTitle': '채팅 창에 쓸 CSS font-family',
  'options.console.fontSizeTitle': '글자 크기(px)',
  'options.console.channelTells': '채널 텔',
  'options.console.tells': '텔',
  'options.console.shouts': '샤우트',
  'options.console.kibitz': '키비츠 / 위스퍼',
  'options.console.challenges': '대국 신청',
  'options.console.gameStarts': '대국 시작',
  'options.console.gameEnds': '대국 종료',
  'options.console.internal': '내부 메시지',
  'options.console.outbound': '내가 보낸 메시지',
  'options.console.note':
    '메시지 종류별 색상입니다. 자동은 기본 팔레트입니다. 열려 있는 채팅 창에는 바로 반영됩니다.',

  'options.defaults': '기본값',
  'options.defaults.all': '모든 옵션',
  'options.defaults.reset': '기본값으로 되돌리기',
  'options.defaults.resetArmed': '확인하려면 한 번 더 클릭',
  'options.defaults.note':
    '위에 있는 모든 옵션(체스판 색상, 기물, 시계 색상, 각종 스위치)을 출고 기본값으로 되돌립니다. 로그인 프로필은 건드리지 않습니다.',

  'options.engine': '엔진',
  'options.engine.available': 'Stockfish 분석 사용 가능',
  'options.engine.note':
    '관전, 검토, 비활성 모드에서만 쓸 수 있습니다 — 대국 중에는 절대 쓸 수 없습니다.',

  'options.sound': '소리',
  'options.sound.sounds': '소리 사용',
  'options.sound.keepAlive': 'Keep alive',
  'options.sound.keepAliveTitle':
    '연결되어 있는 동안 59분마다 (보이지 않게) 전송됩니다',
  'options.sound.moveSounds': '기물 이동 소리',
  'options.sound.movePreviewTitle':
    '선택한 세트의 이동, 잡기, 체크 소리를 들려줍니다',
  'options.sound.alerts': '알림음',
  'options.sound.alertPreviewTitle':
    '선택한 세트의 분위기로 텔, 친구 접속, 친구 접속 종료 소리를 들려줍니다',
  'options.sound.note':
    '이동과 잡기, 체크는 선택한 세트를 쓰고, 대국 종료 소리는 Piano로 고정입니다. 모든 세트는 lichess가 자유 라이선스로 공개한 것입니다 — 정작 유명한 "standard" 세트는 자유 라이선스가 아닙니다. 알림음(들어온 텔, 친구의 접속과 접속 종료)은 선택한 세트의 분위기에 맞춰 저희가 직접 합성한 소리입니다.',

  'options.pgnJournal': 'PGN 자동 저장',
  'options.pgnJournal.append': '내가 둔 기보 추가',
  'options.pgnJournal.appendNote':
    '내가 둔 기보는 기보가 끝날 때 PGN 파일 끝에 추가됩니다. 지켜보기나 분석만 한 기보는 절대 추가되지 않습니다. Chrome, Brave, Edge에서 작동하며 다른 브라우저에서는 저장되지 않습니다.',
  'options.pgnJournal.file': '저널 파일',
  'options.pgnJournal.choose': '파일 선택…',
  'options.pgnJournal.change': '파일 변경…',
  'options.pgnJournal.unsupported':
    '이 브라우저에는 파일 시스템 접근 API가 없어 자동 저장을 사용할 수 없습니다.',
  'options.pgnJournal.chosenNote':
    '기보가 끝나면 여기에 추가됩니다. 브라우저가 다시 묻는다면 파일을 다시 선택해 권한을 갱신하세요.',
  'options.pgnJournal.noneNote':
    '아직 파일을 선택하지 않았습니다. 선택하기 전에는 아무것도 저장되지 않습니다.',

  'options.loginScript': '로그인 스크립트',
  'options.loginScript.note1':
    '로그인할 때마다 (보이지 않게) 전송됩니다. 한 줄에 명령 하나씩이고, 빈 줄은 건너뜁니다. 다음 연결부터 적용됩니다. 그리고',
  'options.loginScript.note2':
    '명령을 남겨 둘 거라면 반드시 맨 마지막 줄에 두세요 — 이 명령이 인터페이스 설정을 잠그기 때문에, 그 뒤에 오는 것은 모두 거부됩니다.',

  'options.channels': '채널',
  'options.channels.autoJoin': '로그인할 때 자동 입장',
  'options.channels.autoJoinNote': '채널 번호를 쉼표로 구분해 적으세요.',
  'options.channels.backfill': '지난 대화 채우기',
  'options.channels.backfillNote':
    '채널 로그 API(chessascent 봇)입니다. 채팅 창을 열 때 자동 입장 채널마다 로그인 전 최대 24시간 분량의 텔을 채워 넣습니다 — 위로 스크롤하면 읽을 수 있습니다. 비워 두면 꺼집니다.',

  // ---- help --------------------------------------------------------------
  'help.what.title': '이 페이지는 무엇인가요?',
  'help.what.body1':
    '여기는 <b>옵션 & 도움말</b> 화면입니다. 실행기가 아닙니다 — 채팅 창은 로그인하면 저절로 열리고, 체스판 창은 대국을 관전하거나 둘 때 자동으로 뜹니다. 앱 설정은 옵션 탭에서 바꾸세요.',

  'help.popups.title': '팝업 허용하기 (필수)',
  'help.popups.intro':
    '체스판은 FICS가 대국이 시작됐다고 알려 줄 때 열립니다 — 여러분의 클릭이 아니라 네트워크 이벤트에서 열리는 셈인데, 팝업 차단기가 막는 것이 바로 그것입니다. 이 사이트를 허용하기 전까지는 대국을 관전해도 체스판 대신 콘솔에 한 줄이 남을 뿐입니다. 한 번만 해 두면 되는 설정입니다:',
  'help.popups.chromium':
    '주소 표시줄 오른쪽 끝에 팝업 아이콘이 나타나면 클릭한 뒤 "이 사이트에서 팝업 및 리디렉션 항상 허용"을 고르세요. 또는: 설정 → 개인정보 보호 및 보안 → 사이트 설정 → 팝업 및 리디렉션 → "허용됨" 목록에 이 사이트를 추가.',
  'help.popups.firefox':
    '팝업이 차단되면 노란 막대가 나타납니다. 거기서 설정 → "이 사이트의 팝업 허용"을 고르세요. 또는: 설정 → 개인 정보 및 보안 → 권한 → 팝업 창 차단 → 예외 목록.',
  'help.popups.safari':
    'Safari → 설정 → 웹사이트 → 팝업 윈도우 → 이 사이트를 허용으로 설정하세요.',
  'help.popups.appmode1': '다음 절에서 설명하는',
  'help.popups.appmode2':
    '모드에서는, 이 오리진이 한 번 허용되고 나면 앱 창에서 열리는 팝업도 그 허용을 그대로 물려받습니다.',

  'help.commands.title': '스크립트 명령',
  'help.commands.intro':
    '클라이언트가 직접 처리하는 몇 줄입니다(Raptor의 별칭에서 옮겨 왔습니다). 아무 채팅 입력창에나 입력하세요:',
  'help.commands.clear1': '목록을 받아와, 거기 있는 모든 이름을 하나씩',
  'help.commands.clear2': '명령으로 지웁니다.',
  'help.commands.tab1': '채널 탭을 엽니다.',
  'help.commands.tab2': '사람 탭을 엽니다. 둘 다 로컬 동작이라 서버로는 아무것도 보내지 않습니다.',
  'help.commands.rest1': '나머지는 입력한 그대로 FICS로 갑니다 —',
  'help.commands.refLink': 'FICS 명령어 레퍼런스',
  'help.commands.rest2': '문서에 전체 명령어가 정리되어 있습니다.',

  'help.appmode.title': '브라우저 주소 표시줄 숨기기 (앱 모드)',
  'help.appmode.intro1':
    '최신 브라우저는 보안 때문에 일반 탭과 팝업에 주소 표시줄을 반드시 표시합니다. 하지만 Chromium 계열 브라우저(Chrome, Brave, Edge)는',
  'help.appmode.intro2':
    '실행 플래그를 지원합니다. 지정한 URL을 장식 없는 창으로 열어 주죠 — URL 표시줄도, 탭 바도, 메뉴도 없습니다. 이 플래그를 넘기는 바로 가기를 만들어 작업 표시줄이나 Dock에 고정해 두세요.',
  'help.appmode.baked1': '아래 명령에는',
  'help.appmode.baked2':
    '주소가 이미 박혀 있습니다 — 지금 이 글을 읽고 있는 바로 그 주소입니다 — 그래서 앱이 어디에서 서비스되든 그대로 복사해 붙여 넣으면 맞습니다.',
  'help.appmode.linux': 'Linux (GNOME / Pop!_OS / KDE)',
  'help.appmode.linux1': '다음 내용으로',
  'help.appmode.linux1b': '파일을 만듭니다:',
  'help.appmode.linux2': '앱 메뉴를 새로 고칩니다:',
  'help.appmode.linux3':
    '현재 활동 / 앱 메뉴를 열고 "Raptor3000"을 검색한 다음, 오른쪽 클릭 → 즐겨찾기에 추가를 고르거나 작업 표시줄로 끌어다 놓습니다.',
  'help.appmode.linuxSub1': 'Chrome이나 Edge를 쓴다면',
  'help.appmode.linuxSub2': '부분을',
  'help.appmode.linuxSub3': '또는',
  'help.appmode.linuxSub4': '중 하나로 바꾸세요.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': '바탕 화면에서 마우스 오른쪽 버튼 클릭 → 새로 만들기 → 바로 가기.',
  'help.appmode.windows2':
    '항목 위치에 다음을 붙여 넣습니다(브라우저가 다른 곳에 있다면 경로를 맞춰 주세요):',
  'help.appmode.windows2b': 'Chrome이라면 이쪽을:',
  'help.appmode.windows3': '이름을 "Raptor3000"으로 하고 마침을 클릭합니다.',
  'help.appmode.windows4': '새로 만든 바로 가기에서 오른쪽 클릭 → 작업 표시줄에 고정.',
  'help.appmode.windowsIcon1':
    '(선택) 바로 가기에서 오른쪽 클릭 → 속성 → 아이콘 변경을 누르고',
  'help.appmode.windowsIcon2': '파일을 지정하면 Brave처럼 보이지 않습니다.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS는 Dock 바로 가기에 CLI 플래그를 그대로 받아 주지 않으므로, 실행을 자그마한',
  'help.appmode.macosIntro2': '앱으로 감쌉니다:',
  'help.appmode.macos1a': '다음 순서로 엽니다:',
  'help.appmode.macos1b': '→ 새로운 문서 →',
  'help.appmode.macos2a': '동작 목록에서',
  'help.appmode.macos2b': '동작을 추가하고 다음을 붙여 넣습니다(필요하면 브라우저 경로를 맞춰 주세요):',
  'help.appmode.macos2c': 'Chrome이라면:',
  'help.appmode.macos3a': '이름은',
  'help.appmode.macos3b': '파일로, 저장 위치는',
  'help.appmode.macos4a': '마지막으로',
  'help.appmode.macos4b': '파일을 Dock으로 끌어다 놓습니다.',
  'help.appmode.macosIcon1': '(선택) Finder에서',
  'help.appmode.macosIcon2':
    '파일을 오른쪽 클릭 → 정보 가져오기 → 왼쪽 위 아이콘 칸에 원하는 아이콘 이미지를 끌어다 놓으면 Dock에서 확실히 구분됩니다.',

  'help.about.title': '정보 & 라이선스',
  'help.about.intro':
    'Raptor3000은 <b>MIT 라이선스</b>로 공개되어 있습니다 — <b>Raptor</b>(SWT)와 <b>Decaf</b>(Java)를 잇는 세 번째 후예입니다. 너그러운 라이선스의 어깨 위에 서 있습니다:',
  'help.about.stockfish':
    '— 분석 엔진입니다. 브라우저 안에서 WebAssembly로 돌아갑니다 (GPL-3.0).',
  'help.about.chessops':
    '— lichess의 체스 라이브러리입니다. SAN, 합법 수 판정, 기보 재생 (GPL-3.0-or-later).',
  'help.about.openings': '— 오프닝 이름과 ECO 코드 (CC0 퍼블릭 도메인).',
  'help.about.lichess':
    '— Enigmahack이 만든 피아노 사운드 세트(AGPL-3.0+)와 기물 세트(Colin M.L. Burnett과 동료들의 cburnett 등, 각각 자체 라이선스).',
  'help.about.fics':
    '— 이 앱이 존재하는 이유인 Free Internet Chess Server입니다. 39번 채널에서는 상냥하게 굴어 주세요.',
  'help.about.outro1': '정확한 라이선스까지 빠짐없이 적은 전체 목록은',
  'help.about.outro2': '파일에 있습니다 —',
  'help.about.repoLink': '소스 저장소',
  'help.about.outro3': '에서 바로 볼 수 있습니다. 뭔가 깨졌거나 빠져 있나요?',
  'help.about.reportLink': '문제 신고하기',
  'help.about.outro4': '또는',
  'help.about.suggestLink': '기능 제안하기',

  'help.trouble.title': '문제 해결',
  'help.trouble.addressBarTitle': '주소 표시줄이 그대로 보입니다.',
  'help.trouble.addressBar1':
    '최신 브라우저는 어떤 창 옵션을 주든 팝업 맨 위에 한 줄짜리 오리진 표시줄을 보여 줍니다. 위에서 설명한',
  'help.trouble.addressBar2':
    '모드는 메인 창에서 그 줄을 아예 없애 줍니다. 앱 모드 창 안에서 열린 팝업도 똑같이 장식 없는 모습을 물려받습니다.',
  'help.trouble.blockerTitle': '팝업 차단기.',
  'help.trouble.blocker1': '다음 주소에 대해 팝업을 허용하세요:',
  'help.trouble.blocker2':
    '(또는 실제 운영 호스트). Brave에서는: 설정 → 개인정보 보호 및 보안 → 사이트 설정 → 팝업 및 리디렉션.',
  'help.trouble.shortcutTitle': '바로 가기가 앱 창이 아니라 일반 탭을 엽니다.',
  'help.trouble.shortcut1': '플래그가 정확히',
  'help.trouble.shortcut2': '형식인지 — 즉',
  'help.trouble.shortcut3':
    '기호를 쓰고 그 앞뒤에 공백이 없는지 — 확인하세요. 그리고 이 설정을 덮어쓰는 프로필로 브라우저가 이미 실행 중이지는 않은지도 살펴보세요.',
};

export default ko;
