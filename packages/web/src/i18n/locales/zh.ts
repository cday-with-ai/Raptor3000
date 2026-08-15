import type { Messages } from '../messages.js';

/** Simplified Chinese (中文). 浏览器菜单路径照各家简体中文界面实际用词（Chrome：一律允许／完成；Firefox：选项／拦截弹窗；macOS：显示简介）；FICS 行话意译为国际象棋圈说法（tell=私聊、shout=喊话、kibitz=评棋、seek=求战）。 */
const zh: Messages = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': '就差一步……',
  'gate.demoChip': '演示',
  'gate.intro':
    'Raptor3000 用起来就像桌面应用——聊天和每个棋盘都以<b>真正的窗口</b>打开。你的浏览器正拦着它们，解决只需两次点击：',
  'gate.chromium.step1': '在地址栏右端找到这个图标——它刚刚才出现：',
  'gate.chromium.step2': '点击它，选择<b>一律允许</b>，再点<b>完成</b>。就这么简单。',
  'gate.chromium.caption': '（这只是示意图——真正的图标在上面，在你浏览器自己的地址栏里）',
  'gate.firefox.step1': '页面顶部刚刚出现了一条提示栏：',
  'gate.firefox.step2': '点击<b>选项</b>，选择<b>允许此网站显示弹窗</b>。',
  'gate.firefox.caption': '（这只是示意图——真正的提示栏是 Firefox 自己的，在页面上方）',
  'gate.watching': '不用告诉任何人——这个页面会自己检测，窗口一被允许就立刻让开。',
  'gate.others': '在用别的浏览器？',
  'gate.testAgain': '再测一次',
  'gate.stuck': '还是卡住？',
  'gate.report': '反馈给我们',
  'gate.demo.allowed': '演示——当前这个浏览器：允许弹出窗口',
  'gate.demo.blocked': '演示——当前这个浏览器：拦截弹出窗口',
  'gate.allowed.title': '弹出窗口已允许',
  'gate.allowed.body': '棋盘和聊天窗口都能正常打开了。玩得开心。',

  // Per-browser directions. Browser names are product names and stay as
  // they are; the menu paths are what the visitor will literally see in a
  // browser whose own UI may well be in their language — translate the
  // words, keep the arrows and the order.
  // The labels inside the address-bar mock. They are a picture of the
  // visitor's own browser, so an English picture under translated
  // instructions is the same dead end the translations were for.
  'gate.pic.allow': '一律允许此网站显示弹出式窗口和重定向',
  'gate.pic.blocking': '继续屏蔽',
  'gate.pic.done': '完成',
  'gate.pic.ffBar': 'Firefox 已阻止此网站打开弹出式窗口',
  'gate.pic.ffPrefs': '设置',
  'gate.pic.ffAllow': '允许 raptor3000.pages.dev 显示弹出式窗口',
  'gate.pic.ffEdit': '编辑弹出窗口拦截器选项…',

  'dir.chromium.steps':
    '点击地址栏右端的弹窗图标，选择“一律允许此网站显示弹出式窗口和重定向”，再点“完成”。（或者：设置 → 隐私和安全 → 网站设置 → 弹出式窗口和重定向 → 添加本站。）',
  'dir.firefox.steps':
    '弹窗被拦截时页面顶部会出现一条提示栏——点“选项”→“允许此网站显示弹窗”。（或者：设置 → 隐私与安全 → 权限 → 拦截弹窗 → 例外。）',
  'dir.safari.steps': 'Safari 浏览器菜单 → 设置 → 网站 → 弹出式窗口 → 将此网站设为“允许”。',
  'dir.ios.steps':
    '“设置”应用 → Safari → 关掉“阻止弹出式窗口”。（先把话说在前面：手机上打开的是浏览器标签页而不是窗口——完整体验还得在电脑上。）',
  'dir.android.steps':
    '⋮ 菜单 → 设置 → 网站设置 → 弹出式窗口和重定向 → 允许。（同样把话说在前面——是标签页，不是窗口。）',

  // ---- login screen ------------------------------------------------------
  'login.tagline': '登录 FICS',
  'login.profile': '配置',
  'login.handle': '用户名',
  'login.password': '密码',
  'login.server': '服务器',
  'login.port': '端口',
  'login.guest': '访客登录',
  'login.timeseal': '启用 Timeseal',
  'login.autoConnect': '下次自动登录',
  'login.submit': '登录',
  'login.err.handleLength': '用户名须为 3 到 17 个字符。',
  'login.err.handleLetters': '用户名只能包含字母。',
  'login.err.noHandle': '请输入用户名，或勾选“访客登录”。',
  'login.err.noPassword': '请输入密码。',
  'login.shot.observing': '带引擎分析观看一盘对局',
  'login.shot.playing': '正在进行一盘快棋',
  'login.shot.chat': '分栏视图下的聊天控制台',
  'login.shot.seek': '实时求战图',

  // ---- language control --------------------------------------------------
  'lang.label': '语言',
  'lang.auto': '自动',
  'lang.note':
    '本页、选项和帮助所用的界面语言。“自动”跟随浏览器。棋服文本——私聊、频道、对局结果——不管你选什么，都由 FICS 以英文发来。',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'Raptor3000 是桌面应用',
  'mobile.body1':
    '棋盘和聊天都以<b>真正的浏览器窗口</b>打开，由棋服实时驱动——手机做不到这一点，所以应用在这里没法工作。',
  'mobile.body2': '请在电脑上访问 <b>raptor3000.pages.dev</b>。',
  'mobile.tryAnyway': '我有键盘，期望也不高——照样试试',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': '选项',
  'shell.nav.help': '帮助',
  'shell.signedIn': '已登录为 <b>{who}</b> · {server}:{port} · 配置 {profile}',
  'shell.who.anonGuest': '匿名访客',
  'shell.who.namedGuest': '{name}（访客）',
  'shell.theme.light': '日间',
  'shell.theme.dark': '夜间',
  'shell.theme.system': '跟随系统',
  'shell.theme.aria': '主题：{mode}。点击切换。',
  'shell.blocked.text':
    '<b>浏览器拦截了一个棋盘窗口。</b>FICS 上有对局开始了，棋盘却没能弹出来——请允许本站的弹出窗口，然后重新观棋。',
  'shell.blocked.showMe': '教我怎么做',
  'shell.blocked.dismiss': '忽略',
  'shell.disconnect.relaunch': '重新启动',
  'shell.disconnect.body':
    '与 FICS 的连接已断开。“重新启动”会让应用回到登录界面——会话为什么结束，聊天控制台的最后几行写着（闲置登出、被更新的登录顶下线，或是网络断了）。',
  'shell.footer.session': '会话 #{id}',
  'shell.footer.suggest': '建议新功能',
  'shell.footer.report': '报告问题',

  // ---- options -----------------------------------------------------------
  'common.on': '开',
  'common.off': '关',
  'common.auto': '自动',
  'common.preview': '预览',

  'options.session': '会话',
  'options.session.chatWindow': '聊天窗口',
  'options.session.reopen': '重新打开',
  'options.session.chatNote': '聊天窗口在登录时自动打开；如果关掉了，从这里重开。',
  'options.session.connection': '连接',
  'options.session.reconnect': '重新连接',
  'options.session.connectionNote':
    '连接正常时按了也没动作。留着它对付被另一次登录顶下线的时候——它会把账号抢回来（这回换 FICS 去顶掉对方）。',
  'options.session.startOver': '重新开始',
  'options.session.relaunch': '重新启动',
  'options.session.relaunchArmed': '再点一次即重启',
  'options.session.relaunchNote':
    '断开连接、关闭所有窗口，并把整个应用重启到登录界面——仅那一次启动会跳过自动登录。其他任何东西都不会被更改或重置。',
  'options.session.autoLogin': '自动登录',
  'options.session.autoLoginNote':
    '关闭后，下次启动会显示登录界面，而不是用保存的配置直接连接。',

  'options.board': '棋盘',
  'options.board.colors': '颜色',
  'options.board.lightSquares': '浅色格',
  'options.board.darkSquares': '深色格',
  'options.board.pieceSet': '棋子样式',
  'options.board.animations': '走子动画',
  'options.board.coordinates': '显示坐标',
  'options.board.flipAsBlack': '执黑时翻转棋盘',
  'options.board.moveList': '显示着法列表',
  // Board palettes: the four plain colors translate, IC and Horsey are
  // names (lichess's), and Custom is the escape hatch.
  'boardTheme.brown': '棕色',
  'boardTheme.blue': '蓝色',
  'boardTheme.green': '绿色',
  'boardTheme.purple': '紫色',
  'boardTheme.custom': '自定义',

  'options.clock': '时钟颜色',
  'options.clock.active': '行棋中',
  'options.clock.low': '时间告急',
  'options.clock.idle': '空闲',
  'options.clock.note':
    '“自动”即空闲时跟随应用主题，行棋中与时间告急用内置的绿/红色块。想覆盖就自选颜色——先背景，后文字。',
  'options.color.background': '背景',
  'options.color.text': '文字',
  'options.color.hex': '{title}（十六进制）',

  'options.console': '控制台',
  'options.console.font': '字体',
  'options.console.fontFamilyTitle': '聊天窗口的 CSS font-family',
  'options.console.fontSizeTitle': '字号（px）',
  'options.console.channelTells': '频道消息',
  'options.console.tells': '私聊',
  'options.console.shouts': '喊话',
  'options.console.kibitz': '评棋 / 悄悄话',
  'options.console.challenges': '挑战',
  'options.console.gameStarts': '对局开始',
  'options.console.gameEnds': '对局结束',
  'options.console.internal': '内部消息',
  'options.console.outbound': '你发出的',
  'options.console.note':
    '按消息类型分别设色；“自动”即内置配色。已打开的聊天窗口会即时换上新样式。',

  'options.defaults': '默认值',
  'options.defaults.all': '全部选项',
  'options.defaults.reset': '恢复默认',
  'options.defaults.resetArmed': '再点一次确认',
  'options.defaults.note':
    '把上面的每一项——棋盘颜色、棋子、时钟颜色、各种开关——恢复为出厂默认。登录配置不受影响。',

  'options.engine': '引擎',
  'options.engine.available': '提供 Stockfish 分析',
  'options.engine.note': '仅在观棋、研究和非活动模式下可用——对局进行中绝不启用。',

  'options.sound': '声音',
  'options.sound.sounds': '音效',
  'options.sound.keepAlive': '保持连接',
  'options.sound.keepAliveTitle': '连接期间每 59 分钟发送一次（不显示）',
  'options.sound.moveSounds': '走子音效',
  'options.sound.movePreviewTitle': '用所选音效组试听走子、吃子、将军',
  'options.sound.alertPreviewTitle': '按所选音效组的风格试听私聊、好友上线、好友下线',
  'options.sound.alerts': '提醒',
  'options.sound.note':
    '走子、吃子和将军使用所选音效组；对局结束音固定用 Piano。所有音效组都来自 lichess 的自由授权音效——那套著名的 “standard” 并非自由授权。提醒音——收到私聊、好友上线或下线——是我们自己合成的音符，风格向所选音效组看齐。',

  'options.loginScript': '登录脚本',
  'options.loginScript.note1':
    '每次登录后（隐藏）发送，一行一条命令；空行会被跳过；对下一次连接生效。如果保留',
  'options.loginScript.note2':
    '，请把它放在最后一行——它会封死接口设置，排在它后面的命令一律被拒。',

  'options.channels': '频道',
  'options.channels.autoJoin': '登录时自动加入',
  'options.channels.autoJoinNote': '频道号，用逗号分隔。',
  'options.channels.backfill': '历史回填',
  'options.channels.backfillNote':
    '频道日志 API（chessascent 机器人）。聊天窗口打开时，每个自动加入的频道会回填登录前最多 24 小时的消息——向上滚动即可阅读。留空则禁用。',

  // ---- help --------------------------------------------------------------
  'help.what.title': '这个页面是什么？',
  'help.what.body1':
    '这里是<b>选项与帮助</b>页面。它不是启动器——聊天窗口在你登录时自动打开，观棋或下棋时棋盘窗口会自动弹出。要改应用偏好，请用“选项”标签页。',

  'help.popups.title': '允许弹出窗口（必需）',
  'help.popups.intro':
    '棋盘在 FICS 宣布对局开始时打开——由网络事件触发，而不是你的点击——这恰恰是弹窗拦截器要拦的东西。在本站被允许之前，观棋只会在控制台记一行日志，棋盘打不开。一次性的解决办法：',
  'help.popups.chromium':
    '当地址栏右端出现弹窗图标时点击它，选择“一律允许此网站显示弹出式窗口和重定向”。或者：设置 → 隐私和安全 → 网站设置 → 弹出式窗口和重定向 → 把本站加进“允许发送弹出式窗口并使用重定向”。',
  'help.popups.firefox':
    '弹窗被拦截时会出现一条黄色提示栏；点“选项”→“允许此网站显示弹窗”。或者：设置 → 隐私与安全 → 权限 → 拦截弹窗 → 例外。',
  'help.popups.safari': 'Safari 浏览器 → 设置 → 网站 → 弹出式窗口 → 将此网站设为“允许”。',
  'help.popups.appmode1': '在',
  'help.popups.appmode2':
    '模式下（见下一节），只要本站已被允许，从应用窗口打开的弹窗就会继承这份许可。',

  'help.commands.title': '脚本命令',
  'help.commands.intro':
    '有几条命令由客户端自己处理（从 Raptor 的别名移植而来）——在任意聊天输入框里输入即可：',
  'help.commands.clear1': '会取回对应名单，然后对上面的每个名字依次发送',
  'help.commands.clear2': '，逐个移除。',
  'help.commands.tab1': '打开一个频道标签页。',
  'help.commands.tab2': '打开一个用户标签页。两者都只在本地生效：不会向服务器发送任何内容。',
  'help.commands.rest1': '其余内容都原样发给 FICS——',
  'help.commands.refLink': 'FICS 命令参考',
  'help.commands.rest2': '收录了完整的命令集。',

  'help.appmode.title': '隐藏浏览器地址栏（应用模式）',
  'help.appmode.intro1':
    '出于安全考虑，现代浏览器在普通标签页和弹窗上必须显示地址栏。不过基于 Chromium 的浏览器（Chrome、Brave、Edge）支持',
  'help.appmode.intro2':
    '启动参数，把指定 URL 打开成一个干净的独立窗口——没有地址栏、没有标签栏、没有菜单。创建一个带上这个参数的快捷方式，钉到任务栏或 Dock 上即可。',
  'help.appmode.baked1': '下面的命令已经填好了',
  'help.appmode.baked2':
    '——就是你此刻阅读时所在的地址——所以无论应用部署在哪儿，直接复制粘贴都是对的。',
  'help.appmode.linux': 'Linux（GNOME / Pop!_OS / KDE）',
  'help.appmode.linux1': '创建',
  'help.appmode.linux1b': '，内容如下：',
  'help.appmode.linux2': '刷新应用菜单：',
  'help.appmode.linux3':
    '打开“活动”/ 应用菜单，搜索 “Raptor3000”，右键 → 添加到收藏夹，或拖到任务栏。',
  'help.appmode.linuxSub1': '把',
  'help.appmode.linuxSub2': '换成',
  'help.appmode.linuxSub3': '或',
  'help.appmode.linuxSub4': '，看你实际用的是哪个。',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': '右键点击桌面 → 新建 → 快捷方式。',
  'help.appmode.windows2':
    '在“请键入对象的位置”处粘贴以下内容（浏览器装在别处就相应调整路径）：',
  'help.appmode.windows2b': '如果用的是 Chrome：',
  'help.appmode.windows3': '命名为 “Raptor3000”，点击“完成”。',
  'help.appmode.windows4': '右键点击新建的快捷方式 → 固定到任务栏。',
  'help.appmode.windowsIcon1': '（可选）右键点击快捷方式 → 属性 → 更改图标，指向一个',
  'help.appmode.windowsIcon2': '文件，免得它看起来像 Brave。',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS 的 Dock 快捷方式不接受裸的 CLI 参数，所以把启动命令包进一个小小的',
  'help.appmode.macosIntro2': '应用里：',
  'help.appmode.macos1a': '打开',
  'help.appmode.macos1b': '→ 新建文稿 →',
  'help.appmode.macos2a': '添加一个',
  'help.appmode.macos2b': '操作。粘贴以下内容（如有需要，调整浏览器路径）：',
  'help.appmode.macos2c': '如果用的是 Chrome：',
  'help.appmode.macos3a': '存储为',
  'help.appmode.macos3b': '，位置选在',
  'help.appmode.macos4a': '把',
  'help.appmode.macos4b': '拖进 Dock。',
  'help.appmode.macosIcon1': '（可选）在 Finder 中右键点击',
  'help.appmode.macosIcon2':
    '→ 显示简介 → 把一个自定义图标拖到简介窗口左上角的小图标上，Dock 里就有了专属的样子。',

  'help.about.title': '关于与许可',
  'help.about.intro':
    'Raptor3000 以 <b>MIT 许可证</b>发布——继 <b>Raptor</b>（SWT）和 <b>Decaf</b>（Java）之后的第三代。它站在一众慷慨授权的肩膀上：',
  'help.about.stockfish':
    '——分析引擎，以 WebAssembly 的形式在你的浏览器里运行（GPL-3.0）。',
  'help.about.chessops':
    '——lichess 的国际象棋程序库：SAN、合法性判断、复盘（GPL-3.0-or-later）。',
  'help.about.openings': '——开局名称与 ECO 编码（CC0，公有领域）。',
  'help.about.lichess':
    '——Enigmahack 制作的钢琴音效组（AGPL-3.0+），以及各套棋子样式（cburnett 出自 Colin M.L. Burnett 及诸位作者之手，各自遵循自己的许可证）。',
  'help.about.fics':
    '——Free Internet Chess Server，这个应用存在的意义就是和它对话。在 39 频道友善一点。',
  'help.about.outro1': '完整清单和各自的确切许可证记录在',
  'help.about.outro2': '，见',
  'help.about.repoLink': '源码仓库',
  'help.about.outro3': '。发现哪里坏了或缺了？',
  'help.about.reportLink': '报告问题',
  'help.about.outro4': '或',
  'help.about.suggestLink': '建议新功能',

  'help.trouble.title': '疑难解答',
  'help.trouble.addressBarTitle': '地址栏还是会显示。',
  'help.trouble.addressBar1':
    '不管请求什么窗口特性，现代浏览器都会在弹窗顶部显示一行来源条。上面的',
  'help.trouble.addressBar2':
    '模式能让主窗口完全避开它。从应用模式窗口里打开的弹窗会继承同样的无边框待遇。',
  'help.trouble.blockerTitle': '弹窗拦截器。',
  'help.trouble.blocker1': '为',
  'help.trouble.blocker2':
    '（或你的正式部署域名）允许弹出窗口。在 Brave 中：设置 → 隐私和安全 → 网站设置 → 弹出式窗口和重定向。',
  'help.trouble.shortcutTitle': '快捷方式打开的是普通标签页，不是应用窗口。',
  'help.trouble.shortcut1': '确认参数写的是',
  'help.trouble.shortcut2': '，用',
  'help.trouble.shortcut3':
    '连接、中间不带空格，而且浏览器不是已经带着会覆盖该参数的配置文件在运行。',
};

export default zh;
