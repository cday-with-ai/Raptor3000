import type { Messages } from '../messages.js';

/** Japanese (日本語). ブラウザのメニュー語は各ブラウザの実際の日本語 UI（Chrome「常に許可する」「完了」、Firefox「許可サイト」、Brave「サイトとシールドの設定」）に合わせ、FICS のメッセージ種別名（tell・shout・kibitz・シーク）は通じる範囲でラテン文字を残した。 */
const ja: Messages = {
  // ---- the popup gate: first contact, before login ----------------------
  'gate.title': 'あと少しです…',
  'gate.demoChip': 'デモ',
  'gate.intro':
    'Raptor3000 はデスクトップアプリのように動きます。チャットも各チェスボードも<b>本物のウィンドウ</b>として開きます。今はブラウザがそれをブロックしていますが、直すのはクリック 2 回だけです：',
  'gate.chromium.step1':
    'アドレスバーの右端に、たった今このアイコンが現れています：',
  'gate.chromium.step2':
    'それをクリックして<b>常に許可する</b>を選び、<b>完了</b>を押してください。作業はそれで全部です。',
  'gate.chromium.caption':
    '（これはただの画像です。本物はブラウザ自身のアドレスバーにあります）',
  'gate.firefox.step1': 'ページの上部にバーが表示されました：',
  'gate.firefox.step2':
    '<b>設定</b>をクリックして、<b>このサイトによるポップアップを許可する</b>を選んでください。',
  'gate.firefox.caption':
    '（これはただの画像です。本物のバーは Firefox 自身のもので、ページの上に出ます）',
  'gate.watching':
    '誰かに知らせる必要はありません。この画面が自動で確認して、ウィンドウが許可された瞬間に自分から退場します。',
  'gate.others': '別のブラウザをお使いですか？',
  'gate.testAgain': 'もう一度テスト',
  'gate.stuck': 'まだうまくいきませんか？',
  'gate.report': '報告する',
  'gate.demo.allowed': 'デモ — このブラウザの今の状態：ポップアップ許可済み',
  'gate.demo.blocked': 'デモ — このブラウザの今の状態：ポップアップブロック中',
  'gate.allowed.title': 'ポップアップが許可されました',
  'gate.allowed.body': 'ボードとチャットのウィンドウが開くようになりました。お楽しみください。',

  // Per-browser directions. Browser names are product names and stay as
  // they are; the menu paths are what the visitor will literally see in a
  // browser whose own UI may well be in their language — translate the
  // words, keep the arrows and the order.
  // The labels inside the address-bar mock. They are a picture of the
  // visitor's own browser, so an English picture under translated
  // instructions is the same dead end the translations were for.
  'gate.pic.allow': 'このサイトのポップアップとリダイレクトを常に許可する',
  'gate.pic.blocking': 'ブロックを続行',
  'gate.pic.done': '完了',
  'gate.pic.ffBar': 'Firefox はこのサイトによるポップアップウィンドウの表示をブロックしました',
  'gate.pic.ffPrefs': '設定',
  'gate.pic.ffAllow': 'raptor3000.pages.dev のポップアップを許可する',
  'gate.pic.ffEdit': 'ポップアップブロックの設定を編集…',

  'dir.chromium.steps':
    'アドレスバー右端のポップアップアイコンをクリックし、「このサイトのポップアップとリダイレクトを常に許可する」を選んで「完了」を押します。（または：設定 → プライバシーとセキュリティ → サイトの設定 → ポップアップとリダイレクト → このサイトを追加。）',
  'dir.firefox.steps':
    'ポップアップがブロックされるとページ上部にバーが表示されます。「設定」をクリックして「このサイトによるポップアップを許可する」を選んでください。（または：設定 → プライバシーとセキュリティ → 許可設定 → ポップアップウィンドウをブロックする → 許可サイト。）',
  'dir.safari.steps':
    'Safari メニュー → 設定 → Webサイト → ポップアップウィンドウ → このサイトを「許可」に設定します。',
  'dir.ios.steps':
    '「設定」アプリ → Safari → 「ポップアップブロック」をオフにします。（正直に言っておくと、スマートフォンではウィンドウの代わりにブラウザのタブが開きます。本来の体験はデスクトップにあります。）',
  'dir.android.steps':
    '⋮ メニュー → 設定 → サイトの設定 → ポップアップとリダイレクト → 許可にします。（こちらも同じ注意です。ウィンドウではなくタブになります。）',

  // ---- login screen ------------------------------------------------------
  'login.tagline': 'FICS にサインイン',
  'login.profile': 'プロファイル',
  'login.handle': 'ハンドル名',
  'login.password': 'パスワード',
  'login.server': 'サーバー',
  'login.port': 'ポート',
  'login.guest': 'ゲストログイン',
  'login.timeseal': 'Timeseal を有効にする',
  'login.autoConnect': '次回から自動でログインする',
  'login.submit': 'ログイン',
  'login.err.handleLength': 'ハンドル名は 3〜17 文字で入力してください。',
  'login.err.handleLetters': 'ハンドル名に使えるのは英字のみです。',
  'login.err.noHandle': 'ハンドル名を入力するか、ゲストログインにチェックを入れてください。',
  'login.err.noPassword': 'パスワードを入力してください。',
  'login.shot.observing': 'エンジン解析付きで対局を観戦しているところ',
  'login.shot.playing': 'ブリッツを 1 局プレイしているところ',
  'login.shot.chat': '分割表示のチャットコンソール',
  'login.shot.seek': 'ライブのシークグラフ',

  // ---- language control --------------------------------------------------
  'lang.label': '言語',
  'lang.auto': '自動',
  'lang.note':
    'この画面とオプション、ヘルプの表示言語です。「自動」はブラウザの設定に従います。チェスサーバーからのテキスト（tell、チャンネル、対局結果）は、どれを選んでも FICS から英語で届きます。',

  // ---- the mobile stop screen -------------------------------------------
  'mobile.title': 'Raptor3000 はデスクトップアプリです',
  'mobile.body1':
    'ボードとチャットは、チェスサーバーからライブで駆動される<b>本物のブラウザウィンドウ</b>として開きます。スマートフォンにはそれができないので、このアプリはここでは動きません。',
  'mobile.body2': 'パソコンで <b>raptor3000.pages.dev</b> を開いてください。',
  'mobile.tryAnyway': 'キーボードはあるし多くは期待しない — それでも試す',

  // ---- post-login shell --------------------------------------------------
  'shell.nav.options': 'オプション',
  'shell.nav.help': 'ヘルプ',
  'shell.signedIn': '<b>{who}</b> としてサインイン中 · {server}:{port} · プロファイル {profile}',
  'shell.who.anonGuest': '匿名ゲスト',
  'shell.who.namedGuest': '{name}（ゲスト）',
  'shell.theme.light': '昼',
  'shell.theme.dark': '夜',
  'shell.theme.system': 'システム',
  'shell.theme.aria': 'テーマ：{mode}。クリックで切り替えます。',
  'shell.blocked.text':
    '<b>ブラウザがボードのウィンドウをブロックしました。</b>FICS 上で対局は始まりましたが、そのボードを表示できませんでした。このサイトのポップアップを許可して、もう一度観戦してください。',
  'shell.blocked.showMe': '方法を見る',
  'shell.blocked.dismiss': '閉じる',
  'shell.disconnect.relaunch': '再起動',
  'shell.disconnect.body':
    'FICS への接続が閉じられました。「再起動」でアプリはログイン画面からやり直します。セッションが終わった理由（アイドルによるログアウト、より新しいログインによる切断、ネットワーク切れ）は、チャットコンソールの最後の数行に書かれています。',
  'shell.footer.session': 'セッション #{id}',
  'shell.footer.suggest': '機能を提案',
  'shell.footer.report': '問題を報告',

  // ---- options -----------------------------------------------------------
  'common.on': 'オン',
  'common.off': 'オフ',
  'common.auto': '自動',
  'common.preview': 'プレビュー',

  'options.session': 'セッション',
  'options.session.chatWindow': 'チャットウィンドウ',
  'options.session.reopen': '開き直す',
  'options.session.chatNote':
    'チャットウィンドウはログイン時に自動で開きます。閉じてしまったらここから開き直してください。',
  'options.session.connection': '接続',
  'options.session.reconnect': '再接続',
  'options.session.connectionNote':
    '接続中は何も起きません。別の場所からのログインでこのセッションが切断されたときに使うと、アカウントを取り戻せます（今度は FICS が相手の接続を切ります）。',
  'options.session.startOver': 'やり直し',
  'options.session.relaunch': '再起動',
  'options.session.relaunchArmed': 'もう一度クリックで再起動',
  'options.session.relaunchNote':
    '接続を切り、すべてのウィンドウを閉じて、アプリ全体をログイン画面から立ち上げ直します。その一度だけは自動ログインをスキップします。ほかには何も変更もリセットもされません。',
  'options.session.autoLogin': '自動ログイン',
  'options.session.autoLoginNote':
    'オフにすると、次回の起動時は保存済みプロファイルで接続せず、ログイン画面を表示します。',

  'options.board': 'チェスボード',
  'options.board.colors': '配色',
  'options.board.lightSquares': '明るいマス',
  'options.board.darkSquares': '暗いマス',
  'options.board.pieceSet': '駒セット',
  'options.board.animations': '駒の移動アニメーション',
  'options.board.coordinates': '座標を表示',
  'options.board.flipAsBlack': '黒番のときは盤を反転',
  'options.board.moveList': '棋譜を表示',
  // Board palettes: the four plain colors translate, IC and Horsey are
  // names (lichess's), and Custom is the escape hatch.
  'boardTheme.brown': 'ブラウン',
  'boardTheme.blue': 'ブルー',
  'boardTheme.green': 'グリーン',
  'boardTheme.purple': 'パープル',
  'boardTheme.custom': 'カスタム',

  'options.clock': '時計の色',
  'options.clock.active': '動作中',
  'options.clock.low': '残り時間わずか',
  'options.clock.idle': '停止中',
  'options.clock.note':
    '「自動」の場合、停止中はアプリのテーマに、動作中と残りわずかは標準の緑と赤のチップに従います。色を選べば上書きできます。順序は背景、次に文字です。',
  'options.color.background': '背景',
  'options.color.text': '文字',
  'options.color.hex': '{title}（hex）',

  'options.console': 'コンソール',
  'options.console.font': 'フォント',
  'options.console.fontFamilyTitle': 'チャットウィンドウ用の CSS font-family',
  'options.console.fontSizeTitle': 'フォントサイズ（px）',
  'options.console.channelTells': 'チャンネル tell',
  'options.console.tells': '個人 tell',
  'options.console.shouts': 'Shout',
  'options.console.kibitz': 'Kibitz / whisper',
  'options.console.challenges': '挑戦',
  'options.console.gameStarts': '対局開始',
  'options.console.gameEnds': '対局終了',
  'options.console.internal': '内部メッセージ',
  'options.console.outbound': '自分の送信',
  'options.console.note':
    'メッセージ種別ごとの色です。「自動」は標準パレットです。開いているチャットウィンドウにはその場で反映されます。',

  'options.defaults': '初期設定',
  'options.defaults.all': 'すべてのオプション',
  'options.defaults.reset': '初期設定に戻す',
  'options.defaults.resetArmed': 'もう一度クリックで確定',
  'options.defaults.note':
    '上にあるすべてのオプション（ボードの色、駒、時計の色、各トグル）を出荷時の初期設定に戻します。ログインプロファイルには触れません。',

  'options.engine': 'エンジン',
  'options.engine.available': 'Stockfish 解析を利用可能にする',
  'options.engine.note':
    '観戦・検討（examine）・非アクティブの各モードでのみ動きます。対局中は決して動きません。',

  'options.sound': 'サウンド',
  'options.sound.sounds': '効果音',
  'options.sound.keepAlive': 'キープアライブ',
  'options.sound.keepAliveTitle':
    '接続中、59 分ごとに（非表示で）送信されます',
  'options.sound.moveSounds': '駒の移動音',
  'options.sound.movePreviewTitle':
    '選択中のセットで移動・キャプチャ・チェックの音を再生します',
  'options.sound.alerts': 'アラート',
  'options.sound.alertPreviewTitle':
    '選択中のセットの雰囲気で tell・フレンド到着・フレンド退出の音を再生します',
  'options.sound.note':
    '移動・キャプチャ・チェックには選択したセットを使い、対局終了の音は Piano のままです。収録しているのはすべて lichess の自由なライセンスのセットで、有名な「standard」セットは自由なライセンスではないため入っていません。アラート（tell の受信、フレンドの到着・退出）は、選択中のセットの響きに寄せて自前で合成した音です。',

  'options.pgnJournal': 'PGN 自動保存',
  'options.pgnJournal.append': '自分が指した対局を追加',
  'options.pgnJournal.appendNote':
    '自分が指した対局は、終局時に PGN ファイルの末尾に追加されます。観戦や検討だけの対局は決して追加されません。Chrome、Brave、Edge で動作し、他のブラウザでは保存されません。',
  'options.pgnJournal.file': 'ジャーナルファイル',
  'options.pgnJournal.choose': 'ファイルを選択…',
  'options.pgnJournal.change': 'ファイルを変更…',
  'options.pgnJournal.unsupported':
    'このブラウザにはファイルシステムアクセス API がないため、自動保存は利用できません。',
  'options.pgnJournal.chosenNote':
    '終局時にここへ対局が追加されます。ブラウザが再度確認してきたら、ファイルを選び直して許可を更新してください。',
  'options.pgnJournal.noneNote':
    'まだファイルが選択されていません。選択するまで何も保存されません。',

  'options.loginScript': 'ログインスクリプト',
  'options.loginScript.note1':
    '各ログイン後に（非表示で）送信されます。1 行につき 1 コマンドで、空行はスキップされ、次回の接続から適用されます。なお、',
  'options.loginScript.note2':
    'を残す場合は必ず最後の行にしてください。これはインターフェース設定を封印するコマンドで、その後に続くものはすべて拒否されます。',

  'options.channels': 'チャンネル',
  'options.channels.autoJoin': 'ログイン時に自動参加',
  'options.channels.autoJoinNote': 'チャンネル番号をカンマ区切りで指定します。',
  'options.channels.backfill': '履歴バックフィル',
  'options.channels.backfillNote':
    'チャンネルログ API（chessascent ボット）を使います。チャットウィンドウを開いたとき、自動参加チャンネルごとにログイン前最大 24 時間分の tell を遡って読み込みます。上へスクロールすると読めます。空欄にすると無効です。',

  // ---- help --------------------------------------------------------------
  'help.what.title': 'このページは何？',
  'help.what.body1':
    'ここは<b>オプションとヘルプ</b>の画面です。ランチャーではありません。チャットウィンドウはサインイン時に自動で開き、ボードウィンドウは対局を観戦したりプレイしたりすると自動で現れます。アプリの設定を変えるにはオプションタブを使ってください。',

  'help.popups.title': 'ポップアップを許可する（必須）',
  'help.popups.intro':
    'ボードが開くのは、FICS が対局開始を告げたときです。きっかけはあなたのクリックではなくネットワークイベントで、ポップアップブロッカーが塞ぐのはまさにそれです。このオリジンを許可するまでは、対局を観戦してもボードは開かず、コンソールに 1 行残るだけです。修正は一度きりで済みます：',
  'help.popups.chromium':
    'アドレスバー右端にポップアップアイコンが現れたらクリックし、「このサイトのポップアップとリダイレクトを常に許可する」を選びます。または：設定 → プライバシーとセキュリティ → サイトの設定 → ポップアップとリダイレクト → 「ポップアップの送信やリダイレクトの使用を許可するサイト」にこのサイトを追加。',
  'help.popups.firefox':
    'ポップアップがブロックされると黄色いバーが表示されます。「設定」→「このサイトによるポップアップを許可する」を選びます。または：設定 → プライバシーとセキュリティ → 許可設定 → ポップアップウィンドウをブロックする → 許可サイト。',
  'help.popups.safari':
    'Safari → 設定 → Webサイト → ポップアップウィンドウ → このサイトを「許可」に設定します。',
  'help.popups.appmode1': 'なお、',
  'help.popups.appmode2':
    'モード（次のセクション）では、いったんオリジンが許可されると、アプリウィンドウから開くポップアップにもその許可が引き継がれます。',

  'help.commands.title': 'スクリプトコマンド',
  'help.commands.intro':
    'クライアント自身が処理する数少ないコマンドです（Raptor のエイリアスから移植）。どのチャット入力欄に打ち込んでも使えます：',
  'help.commands.clear1': 'は該当するリストを取得し、載っている名前を 1 件ずつ',
  'help.commands.clear2': 'を送って削除していきます。',
  'help.commands.tab1': 'はチャンネルタブを開きます。',
  'help.commands.tab2': 'は個人タブを開きます。どちらもローカルで完結し、サーバーには何も送信されません。',
  'help.commands.rest1': 'それ以外はすべて、入力したとおり FICS へ送られます。コマンド一式は',
  'help.commands.refLink': 'FICS コマンドリファレンス',
  'help.commands.rest2': 'にまとまっています。',

  'help.appmode.title': 'ブラウザのアドレスバーを隠す（アプリモード）',
  'help.appmode.intro1':
    '最近のブラウザは、セキュリティ上、通常のタブとポップアップには必ずアドレスバーを表示します。ただし Chromium 系ブラウザ（Chrome、Brave、Edge）には',
  'help.appmode.intro2':
    'という起動フラグがあり、指定した URL をクロームレスなウィンドウ（URL バーなし、タブ列なし、メニューなし）で開けます。このフラグを渡すショートカットを作って、タスクバーやドックにピン留めしてください。',
  'help.appmode.baked1': '以下のコマンドには、',
  'help.appmode.baked2':
    '（いまこのページを開いているアドレスです）があらかじめ埋め込まれているため、アプリがどこで配信されていてもコピー＆ペーストでそのまま動きます。',
  'help.appmode.linux': 'Linux（GNOME / Pop!_OS / KDE）',
  'help.appmode.linux1': 'まず',
  'help.appmode.linux1b': 'を次の内容で作成します：',
  'help.appmode.linux2': 'アプリメニューを更新します：',
  'help.appmode.linux3':
    'アクティビティ／アプリメニューを開いて「Raptor3000」を検索し、右クリック → 「お気に入りに追加」（環境によっては「Dash にピン留め」）を選ぶか、タスクバーへドラッグします。',
  'help.appmode.linuxSub1': 'お使いのブラウザが違う場合は、',
  'help.appmode.linuxSub2': 'の部分を',
  'help.appmode.linuxSub3': 'または',
  'help.appmode.linuxSub4': 'に置き換えてください。',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'デスクトップを右クリック → 新規作成 → ショートカット。',
  'help.appmode.windows2':
    '「項目の場所」には次を貼り付けます（ブラウザのインストール先が違う場合はパスを調整してください）：',
  'help.appmode.windows2b': 'Chrome の場合はこちら：',
  'help.appmode.windows3': '名前を「Raptor3000」にして「完了」をクリックします。',
  'help.appmode.windows4': 'できたショートカットを右クリック → 「タスクバーにピン留めする」。',
  'help.appmode.windowsIcon1':
    '（任意）ショートカットを右クリック → プロパティ → 「アイコンの変更」で',
  'help.appmode.windowsIcon2': 'を指定すると、アイコンが Brave に見えなくなります。',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    'macOS の Dock ショートカットには CLI フラグを直接渡せないので、起動処理を小さな',
  'help.appmode.macosIntro2': 'アプリで包みます：',
  'help.appmode.macos1a': 'まず',
  'help.appmode.macos1b': 'を開き、新規書類 →',
  'help.appmode.macos2a': '次に',
  'help.appmode.macos2b': 'アクションを追加し、以下を貼り付けます（必要ならブラウザのパスを調整してください）：',
  'help.appmode.macos2c': 'Chrome の場合：',
  'help.appmode.macos3a': 'できあがったら',
  'help.appmode.macos3b': 'という名前で、次の場所に保存します：',
  'help.appmode.macos4a': '最後に',
  'help.appmode.macos4b': 'を Dock へドラッグします。',
  'help.appmode.macosIcon1': '（任意）Finder で',
  'help.appmode.macosIcon2':
    'を右クリック → 「情報を見る」を開き、左上のアイコン欄に好きなアイコンをドラッグすると、Dock で見分けの付く姿になります。',

  'help.about.title': '概要とライセンス',
  'help.about.intro':
    'Raptor3000 は <b>MIT ライセンス</b>です。<b>Raptor</b>（SWT）と <b>Decaf</b>（Java）に続く系譜の三代目で、寛大にライセンスされた先人の肩の上に立っています：',
  'help.about.stockfish':
    '— 解析エンジン。WebAssembly としてブラウザの中で動きます（GPL-3.0）。',
  'help.about.chessops':
    '— lichess のチェスライブラリ。SAN、合法手の判定、リプレイを担います（GPL-3.0-or-later）。',
  'help.about.openings': '— オープニング名と ECO コード（CC0 パブリックドメイン）。',
  'help.about.lichess':
    '— Enigmahack による piano サウンドセット（AGPL-3.0+）と各種の駒セット（Colin M.L. Burnett とその仲間たちによる cburnett をはじめ、それぞれ独自のライセンス）。',
  'help.about.fics':
    '— このアプリがその相手として存在している Free Internet Chess Server。チャンネル 39 では仲良くやりましょう。',
  'help.about.outro1': '正確なライセンスをすべて記した完全な一覧は、',
  'help.about.outro2': 'として',
  'help.about.repoLink': 'ソースリポジトリ',
  'help.about.outro3': 'にあります。何か壊れていたり足りなかったりしたら？',
  'help.about.reportLink': '問題を報告する',
  'help.about.outro4': 'または',
  'help.about.suggestLink': '機能を提案する',

  'help.trouble.title': 'トラブルシューティング',
  'help.trouble.addressBarTitle': 'アドレスバーがまだ表示される。',
  'help.trouble.addressBar1':
    '最近のブラウザは、指定にかかわらずポップアップの上端に 1 行のオリジン表示を出します。前述の',
  'help.trouble.addressBar2':
    'モードなら、メインウィンドウについてはこれを完全に回避できます。アプリモードのウィンドウの中から開いたポップアップも、同じクロームレスな扱いを引き継ぎます。',
  'help.trouble.blockerTitle': 'ポップアップブロッカー。',
  'help.trouble.blocker1': 'ポップアップの許可対象は',
  'help.trouble.blocker2':
    '（または実際に使っているホスト）です。Brave の場合：設定 → プライバシーとセキュリティ → サイトとシールドの設定 → ポップアップとリダイレクト。',
  'help.trouble.shortcutTitle': 'ショートカットがアプリウィンドウではなく普通のタブを開いてしまう。',
  'help.trouble.shortcut1': 'フラグが',
  'help.trouble.shortcut2': 'の形で、区切りがスペースではなく',
  'help.trouble.shortcut3':
    'になっていることを確認してください。また、この指定を上書きするプロファイルでブラウザがすでに起動していないかも確認してください。',
};

export default ja;
