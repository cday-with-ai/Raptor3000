import type { Messages } from '../messages.js';

/** Hebrew (עברית) — RTL. Gender-neutral plural imperative throughout (לחצו, בחרו); menu paths carry each browser's real Hebrew UI wording with the → arrows and their order intact; every Latin run — and every placeholder whose value is Latin ({who}, {profile}, {server}:{port}) — is wrapped in ⁦…⁩ so bidi can't reorder it; "the right end of the address bar" became side-neutral, since an RTL-localized browser mirrors the omnibox and the icon sits on the left. */
const he: Messages = {
  // ---- שער החלונות הקופצים: מגע ראשון, לפני התחברות ----------------------
  'gate.title': 'כמעט הגענו…',
  'gate.demoChip': 'הדגמה',
  'gate.intro':
    '⁦Raptor3000⁩ מתנהגת כמו אפליקציית מחשב — הצ׳אט וכל לוח נפתחים <b>כחלונות אמיתיים</b>. הדפדפן שלכם חוסם אותם, והתיקון הוא שתי לחיצות:',
  'gate.chromium.step1':
    'מצאו את הסמל הזה בקצה שורת הכתובת — הוא הופיע ממש עכשיו:',
  'gate.chromium.step2':
    'לחצו עליו, בחרו <b>לאפשר תמיד</b> ואז <b>סיום</b>. זה כל הסיפור.',
  'gate.chromium.caption':
    '(רק תמונה — הסמל האמיתי נמצא למעלה, בשורת הכתובת של הדפדפן עצמו)',
  'gate.firefox.step1': 'סרגל הופיע הרגע בראש העמוד:',
  'gate.firefox.step2':
    'לחצו על <b>העדפות</b> ובחרו <b>לאפשר חלונות קופצים עבור אתר זה</b>.',
  'gate.firefox.caption':
    '(רק תמונה — הסרגל האמיתי הוא של ⁦Firefox⁩ עצמו, מעל העמוד)',
  'gate.watching':
    'אין צורך להודיע לאיש — המסך הזה בודק בעצמו ומתפנה מהדרך ברגע שהחלונות מאושרים.',
  'gate.others': 'משתמשים בדפדפן אחר?',
  'gate.testAgain': 'בדיקה חוזרת',
  'gate.stuck': 'עדיין תקועים?',
  'gate.report': 'דווחו על זה',
  'gate.demo.allowed': 'הדגמה — הדפדפן הזה עכשיו: חלונות קופצים מאושרים',
  'gate.demo.blocked': 'הדגמה — הדפדפן הזה עכשיו: חלונות קופצים חסומים',
  'gate.allowed.title': 'חלונות קופצים מאושרים',
  'gate.allowed.body': 'חלונות הלוחות והצ׳אט ייפתחו. תיהנו.',

  // הוראות לפי דפדפן. שמות הדפדפנים נשארים כמו שהם; נתיבי התפריטים
  // מתורגמים למה שהממשק העברי של הדפדפן באמת אומר, עם החצים והסדר.
  'dir.chromium.steps':
    'לחצו על סמל החלונות הקופצים בקצה שורת הכתובת ובחרו "לאפשר תמיד חלונות קופצים והפניות אוטומטיות מאתר זה", ואז סיום. (או: הגדרות → פרטיות ואבטחה → הגדרות אתרים → חלונות קופצים והפניות אוטומטיות → הוסיפו את האתר הזה.)',
  'dir.firefox.steps':
    'כשחלון קופץ נחסם מופיע סרגל בראש העמוד — בחרו העדפות → "לאפשר חלונות קופצים עבור אתר זה". (או: הגדרות → פרטיות ואבטחה → הרשאות → חסימת חלונות קופצים → חריגות.)',
  'dir.safari.steps':
    'תפריט ⁦Safari⁩ → הגדרות → אתרי אינטרנט → חלונות קופצים → הגדירו את האתר הזה ל"אפשר".',
  'dir.ios.steps':
    'אפליקציית ההגדרות → ⁦Safari⁩ → כבו את "חסימת חלונות קופצים". (אזהרה הוגנת: טלפונים מקבלים לשוניות דפדפן במקום חלונות — החוויה האמיתית היא במחשב.)',
  'dir.android.steps':
    'תפריט ⋮ → הגדרות → הגדרות אתרים → חלונות קופצים והפניות אוטומטיות → אפשרו. (אותה אזהרה הוגנת — לשוניות, לא חלונות.)',

  // ---- מסך ההתחברות ------------------------------------------------------
  'login.tagline': 'התחברות ל־⁦FICS⁩',
  'login.profile': 'פרופיל',
  'login.handle': 'שם משתמש',
  'login.password': 'סיסמה',
  'login.server': 'שרת',
  'login.port': 'פורט',
  'login.guest': 'כניסת אורח',
  'login.timeseal': '⁦Timeseal⁩ פעיל',
  'login.autoConnect': 'התחברות אוטומטית בפעם הבאה',
  'login.submit': 'התחברות',
  'login.err.handleLength': 'שם המשתמש חייב להיות באורך 3 עד 17 תווים.',
  'login.err.handleLetters': 'שם המשתמש יכול להכיל רק אותיות לטיניות.',
  'login.err.noHandle': 'הזינו שם משתמש או סמנו כניסת אורח.',
  'login.err.noPassword': 'הזינו סיסמה.',
  'login.shot.observing': 'צפייה במשחק עם ניתוח מנוע',
  'login.shot.playing': 'משחק בליץ',
  'login.shot.chat': 'מסוף הצ׳אט בתצוגה מפוצלת',
  'login.shot.seek': 'גרף חיפושי המשחק בזמן אמת',

  // ---- בחירת שפה ---------------------------------------------------------
  'lang.label': 'שפה',
  'lang.auto': 'אוטומטית',
  'lang.note':
    'שפת הממשק של המסך הזה, של האפשרויות ושל העזרה. "אוטומטית" הולכת לפי הדפדפן. טקסט משרת השחמט — הודעות, ערוצים, תוצאות משחקים — מגיע מ־⁦FICS⁩ באנגלית, לא משנה מה תבחרו.',

  // ---- מסך העצירה בנייד --------------------------------------------------
  'mobile.title': '⁦Raptor3000⁩ היא אפליקציה למחשב',
  'mobile.body1':
    'לוחות וצ׳אט נפתחים <b>כחלונות דפדפן אמיתיים</b>, מוזנים בשידור חי משרת השחמט — טלפונים לא מסוגלים לזה, ולכן האפליקציה לא עובדת כאן.',
  'mobile.body2': 'במחשב, גשו אל <b>⁦raptor3000.pages.dev⁩</b>.',
  'mobile.tryAnyway': 'יש לי מקלדת וציפיות נמוכות — לנסות בכל זאת',

  // ---- המעטפת שאחרי ההתחברות ---------------------------------------------
  'shell.nav.options': 'אפשרויות',
  'shell.nav.seek': 'חיפוש משחק',
  'shell.nav.help': 'עזרה',
  'shell.signedIn': 'מחובר בתור <b>⁦{who}⁩</b> · ⁦{server}:{port}⁩ · פרופיל ⁦{profile}⁩',
  'shell.who.anonGuest': 'אורח אלמוני',
  'shell.who.namedGuest': '⁦{name}⁩ (אורח)',
  'shell.theme.light': 'יום',
  'shell.theme.dark': 'לילה',
  'shell.theme.system': 'מערכת',
  'shell.theme.aria': 'ערכת נושא: {mode}. לחצו כדי להחליף.',
  'shell.blocked.text':
    '<b>הדפדפן חסם חלון לוח.</b> משחק נפתח ב־⁦FICS⁩ אבל הלוח שלו לא הצליח להופיע — אפשרו חלונות קופצים לאתר הזה וצפו במשחק שוב.',
  'shell.blocked.showMe': 'הראו לי איך',
  'shell.blocked.dismiss': 'סגירה',
  'shell.disconnect.relaunch': 'הפעלה מחדש',
  'shell.disconnect.body':
    'החיבור ל־⁦FICS⁩ נסגר. "הפעלה מחדש" מאתחלת את האפליקציה במסך ההתחברות — השורות האחרונות במסוף הצ׳אט מספרות למה החיבור הסתיים (יציאה עקב חוסר פעילות, ניתוק על ידי התחברות חדשה יותר, או נפילת רשת).',
  'shell.footer.session': 'סשן ⁦#{id}⁩',
  'shell.footer.suggest': 'הציעו פיצ׳ר',
  'shell.footer.report': 'דווחו על תקלה',

  // ---- אפשרויות ----------------------------------------------------------
  'common.on': 'פעיל',
  'common.off': 'כבוי',
  'common.auto': 'אוטומטי',
  'common.preview': 'תצוגה מקדימה',

  'options.session': 'סשן',
  'options.session.chatWindow': 'חלון הצ׳אט',
  'options.session.reopen': 'פתיחה מחדש',
  'options.session.chatNote':
    'חלון הצ׳אט נפתח אוטומטית בהתחברות; אם סגרתם אותו, פתחו אותו מחדש כאן.',
  'options.session.connection': 'חיבור',
  'options.session.reconnect': 'התחברות מחדש',
  'options.session.connectionNote':
    'לא עושה כלום כשמחוברים. שימושי אחרי שהתחברות אחרת ניתקה את הסשן הזה — הוא לוקח את החשבון בחזרה (⁦FICS⁩ מנתק אותם בתורם).',
  'options.session.startOver': 'התחלה מחדש',
  'options.session.relaunch': 'הפעלה מחדש',
  'options.session.relaunchArmed': 'לחצו שוב להפעלה מחדש',
  'options.session.relaunchNote':
    'מתנתק, סוגר את כל החלונות ומאתחל את האפליקציה כולה במסך ההתחברות — ההתחברות האוטומטית מדולגת באותה הפעלה בלבד. שום דבר אחר לא משתנה ולא מתאפס.',
  'options.session.autoLogin': 'התחברות אוטומטית',
  'options.session.autoLoginNote':
    'במצב כבוי, ההפעלה הבאה תציג את מסך ההתחברות במקום להתחבר עם הפרופיל השמור.',

  'options.board': 'לוח',
  'options.board.colors': 'צבעים',
  'options.board.lightSquares': 'משבצות בהירות',
  'options.board.darkSquares': 'משבצות כהות',
  'options.board.pieceSet': 'ערכת כלים',
  'options.board.animations': 'הנפשת מהלכים',
  'options.board.coordinates': 'הצגת קואורדינטות',
  'options.board.flipAsBlack': 'היפוך הלוח כשמשחקים בשחור',
  'options.board.moveList': 'רשימת מהלכים גלויה',
  // ערכות הלוח: ארבעת הצבעים מתורגמים, והשאר שמות שנשארים כמו שהם.
  'boardTheme.brown': 'חום',
  'boardTheme.blue': 'כחול',
  'boardTheme.green': 'ירוק',
  'boardTheme.purple': 'סגול',
  'boardTheme.custom': 'מותאם אישית',

  'options.clock': 'צבעי השעון',
  'options.clock.active': 'פעיל',
  'options.clock.low': 'הזמן אוזל',
  'options.clock.idle': 'לא פעיל',
  'options.clock.note':
    '"אוטומטי" הולך לפי ערכת הנושא של האפליקציה (לא פעיל) ולפי הירוק/אדום המובנים (פעיל, הזמן אוזל). בחרו צבעים כדי לדרוס — קודם רקע, אחר כך טקסט.',
  'options.color.background': 'רקע',
  'options.color.text': 'טקסט',
  'options.color.hex': '{title} (⁦hex⁩)',

  'options.console': 'מסוף',
  'options.console.font': 'גופן',
  'options.console.fontFamilyTitle': 'ה־⁦font-family⁩ (⁦CSS⁩) של חלון הצ׳אט',
  'options.console.fontSizeTitle': 'גודל גופן (⁦px⁩)',
  'options.console.channelTells': 'הודעות ערוץ',
  'options.console.tells': 'הודעות אישיות',
  'options.console.shouts': 'צעקות',
  'options.console.kibitz': 'קיביץ / לחישה',
  'options.console.challenges': 'אתגרים',
  'options.console.gameStarts': 'תחילת משחק',
  'options.console.gameEnds': 'סיום משחק',
  'options.console.internal': 'פנימי',
  'options.console.outbound': 'הודעות יוצאות',
  'options.console.note':
    'צבע לכל סוג הודעה; "אוטומטי" הוא ערכת הצבעים המובנית. חלונות צ׳אט פתוחים מחליפים סגנון מיד.',

  'options.defaults': 'ברירות מחדל',
  'options.defaults.all': 'כל האפשרויות',
  'options.defaults.reset': 'איפוס לברירות המחדל',
  'options.defaults.resetArmed': 'לחצו שוב לאישור',
  'options.defaults.note':
    'מחזיר כל אפשרות שלמעלה — צבעי לוח, כלים, צבעי שעון, מתגים — לברירות המחדל המקוריות. פרופילי ההתחברות נשארים כמות שהם.',

  'options.engine': 'מנוע',
  'options.engine.available': 'ניתוח ⁦Stockfish⁩ זמין',
  'options.engine.note':
    'רק במצבי צפייה, עיון ולוח לא פעיל — אף פעם לא בזמן משחק.',

  'options.sound': 'שמע',
  'options.sound.sounds': 'צלילים',
  'options.sound.keepAlive': 'שמירת חיבור',
  'options.sound.keepAliveTitle':
    'נשלח (בהסתר) כל 59 דקות כשמחוברים',
  'options.sound.moveSounds': 'צלילי מהלכים',
  'options.sound.movePreviewTitle':
    'משמיע מהלך, הכאה ושח מהערכה שנבחרה',
  'options.sound.alerts': 'התראות',
  'options.sound.alertPreviewTitle':
    'משמיע הודעה נכנסת, חבר מגיע וחבר עוזב, בסגנון הערכה שנבחרה',
  'options.sound.note':
    'מהלכים, הכאות ושחים משתמשים בערכה שנבחרה; צלילי סיום המשחק נשארים על ⁦Piano⁩. כל הערכות הן הערכות ברישיון חופשי של ⁦lichess⁩ — ערכת "⁦standard⁩" המפורסמת אינה ברישיון חופשי. ההתראות — הודעה נכנסת, חבר שמגיע או עוזב — הן תווים שסינתזנו בעצמנו, בהשראת הערכה שנבחרה.',

  'options.loginScript': 'סקריפט התחברות',
  'options.loginScript.note1':
    'נשלח (בהסתר) אחרי כל התחברות, פקודה אחת בכל שורה; שורות ריקות מדולגות; נכנס לתוקף בחיבור הבא. השאירו את',
  'options.loginScript.note2':
    'אחרון אם אתם משאירים אותו — הוא נועל את הגדרות הממשק, וכל מה שבא אחריו נדחה.',

  'options.channels': 'ערוצים',
  'options.channels.autoJoin': 'הצטרפות אוטומטית בהתחברות',
  'options.channels.autoJoinNote': 'מספרי ערוצים מופרדים בפסיקים.',
  'options.channels.backfill': 'השלמת היסטוריה',
  'options.channels.backfillNote':
    '⁦API⁩ של יומן הערוצים (הבוט ⁦chessascent⁩). כשחלון הצ׳אט נפתח, כל ערוץ בהצטרפות האוטומטית מקבל השלמה של עד 24 שעות של הודעות מלפני ההתחברות — גללו למעלה כדי לקרוא אותן. שדה ריק מבטל.',

  // ---- עזרה --------------------------------------------------------------
  'help.what.title': 'מה העמוד הזה?',
  'help.what.body1':
    'זהו מסך <b>האפשרויות והעזרה</b>. הוא לא משגר — חלון הצ׳אט נפתח אוטומטית כשמתחברים, וחלונות לוח קופצים מעצמם כשצופים במשחק או משחקים. את העדפות האפליקציה משנים בלשונית האפשרויות.',

  'help.popups.title': 'אישור חלונות קופצים (חובה)',
  'help.popups.intro':
    'לוחות נפתחים כש־⁦FICS⁩ מודיע שמשחק התחיל — מאירוע רשת, לא מלחיצה שלכם — וזה בדיוק מה שחוסמי חלונות קופצים חוסמים. עד שהאתר הזה מאושר, צפייה במשחק תרשום שורה במסוף במקום לפתוח לוח. תיקון חד־פעמי:',
  'help.popups.chromium':
    'לחצו על סמל החלונות הקופצים בקצה שורת הכתובת כשהוא מופיע ובחרו "לאפשר תמיד חלונות קופצים מאתר זה". או: הגדרות → פרטיות ואבטחה → הגדרות אתרים → חלונות קופצים והפניות אוטומטיות → הוסיפו את האתר לרשימת "מותר".',
  'help.popups.firefox':
    'סרגל צהוב מופיע כשחלון קופץ נחסם; בחרו העדפות → "לאפשר חלונות קופצים עבור אתר זה". או: הגדרות → פרטיות ואבטחה → הרשאות → חסימת חלונות קופצים → חריגות.',
  'help.popups.safari':
    '⁦Safari⁩ → הגדרות → אתרי אינטרנט → חלונות קופצים → הגדירו את האתר הזה ל"אפשר".',
  'help.popups.appmode1': 'במצב',
  'help.popups.appmode2':
    '(הסעיף הבא), חלונות קופצים שנפתחים מחלון האפליקציה יורשים את האישור ברגע שהאתר מאושר.',

  'help.commands.title': 'פקודות סקריפט',
  'help.commands.intro':
    'כמה שורות שהקליינט מטפל בהן בעצמו (הועברו מקיצורי הפקודות של ⁦Raptor⁩) — הקלידו אותן בכל שדה צ׳אט:',
  'help.commands.clear1': 'שולפת את הרשימה שלכם ומסירה ממנה כל שם, בפקודת',
  'help.commands.clear2': 'אחת בכל פעם.',
  'help.commands.tab1': 'פותחת לשונית ערוץ.',
  'help.commands.tab2': 'פותחת לשונית של אדם. שתיהן מקומיות: שום דבר לא נשלח לשרת.',
  'help.commands.rest1': 'כל השאר עובר ל־⁦FICS⁩ כפי שהוקלד —',
  'help.commands.refLink': 'מדריך הפקודות של ⁦FICS⁩',
  'help.commands.rest2': 'מתעד את מכלול הפקודות.',

  'help.appmode.title': 'הסתרת שורת הכתובת של הדפדפן (מצב אפליקציה)',
  'help.appmode.intro1':
    'דפדפנים מודרניים מחייבים שורת כתובת בלשוניות ובחלונות קופצים רגילים, מטעמי אבטחה. אבל דפדפנים מבוססי ⁦Chromium⁩ (⁦Chrome⁩, ⁦Brave⁩, ⁦Edge⁩) תומכים בדגל ההפעלה',
  'help.appmode.intro2':
    'שפותח כתובת נתונה בחלון נקי — בלי שורת כתובת, בלי שורת לשוניות, בלי תפריט. צרו קיצור דרך שמעביר את הדגל והצמידו אותו לשורת המשימות או ל־⁦Dock⁩.',
  'help.appmode.baked1': 'הפקודות שלמטה כבר כוללות את',
  'help.appmode.baked2':
    '— הכתובת שממנה אתם קוראים את זה — ולכן הן נכונות להעתקה־הדבקה בכל מקום שבו האפליקציה מוגשת.',
  'help.appmode.linux': '⁦Linux (GNOME / Pop!_OS / KDE)⁩',
  'help.appmode.linux1': 'צרו את',
  'help.appmode.linux1b': 'עם התוכן הזה:',
  'help.appmode.linux2': 'רעננו את תפריט האפליקציות:',
  'help.appmode.linux3':
    'פתחו את סקירת הפעילויות / תפריט האפליקציות, חפשו "⁦Raptor3000⁩", לחיצה ימנית → הוספה למועדפים, או גררו לשורת המשימות.',
  'help.appmode.linuxSub1': 'במקום',
  'help.appmode.linuxSub2': 'כתבו',
  'help.appmode.linuxSub3': 'או',
  'help.appmode.linuxSub4': 'אם אתם משתמשים באחד מהם.',
  'help.appmode.windows': 'Windows',
  'help.appmode.windows1': 'לחיצה ימנית על שולחן העבודה → חדש → קיצור דרך.',
  'help.appmode.windows2':
    'בשדה המיקום הדביקו (התאימו את הנתיב אם הדפדפן שלכם מותקן במקום אחר):',
  'help.appmode.windows2b': 'ל־⁦Chrome⁩ במקום:',
  'help.appmode.windows3': 'קראו לו "⁦Raptor3000⁩" ולחצו סיום.',
  'help.appmode.windows4': 'לחיצה ימנית על הקיצור החדש → הצמד לשורת המשימות.',
  'help.appmode.windowsIcon1':
    '(לא חובה) לחיצה ימנית על הקיצור → מאפיינים → שנה סמל, וכוונו לקובץ',
  'help.appmode.windowsIcon2': 'כדי שהוא לא ייראה כמו ⁦Brave⁩.',
  'help.appmode.macos': 'macOS',
  'help.appmode.macosIntro1':
    '⁦macOS⁩ לא מקבל דגלי שורת פקודה בקיצורים שב־⁦Dock⁩, אז עוטפים את ההפעלה באפליקציית',
  'help.appmode.macosIntro2': 'קטנה:',
  'help.appmode.macos1a': 'פתחו את',
  'help.appmode.macos1b': '→ מסמך חדש →',
  'help.appmode.macos2a': 'הוסיפו פעולה מסוג',
  'help.appmode.macos2b': 'והדביקו (עדכנו את נתיב הדפדפן אם צריך):',
  'help.appmode.macos2c': 'ל־⁦Chrome⁩:',
  'help.appmode.macos3a': 'שמרו בשם',
  'help.appmode.macos3b': 'בתוך',
  'help.appmode.macos4a': 'גררו את',
  'help.appmode.macos4b': 'אל ה־⁦Dock⁩.',
  'help.appmode.macosIcon1': '(לא חובה) לחיצה ימנית על',
  'help.appmode.macosIcon2':
    'ב־⁦Finder⁩ → הצג מידע → גררו סמל משלכם אל משבצת הסמל, למראה ייחודי ב־⁦Dock⁩.',

  'help.about.title': 'אודות ורישיונות',
  'help.about.intro':
    '⁦Raptor3000⁩ משוחררת <b>ברישיון ⁦MIT⁩</b> — השלישית בשושלת, אחרי <b>⁦Raptor⁩</b> (⁦SWT⁩) ו־<b>⁦Decaf⁩</b> (⁦Java⁩). היא עומדת על כתפיים בעלות רישיון נדיב:',
  'help.about.stockfish':
    '— מנוע הניתוח, שרץ בדפדפן שלכם כ־⁦WebAssembly⁩ (⁦GPL-3.0⁩).',
  'help.about.chessops':
    '— ספריית השחמט של ⁦lichess⁩: ⁦SAN⁩, בדיקת חוקיות, שחזור משחקים (⁦GPL-3.0-or-later⁩).',
  'help.about.openings': '— שמות הפתיחות וקודי ⁦ECO⁩ (⁦CC0⁩, נחלת הכלל).',
  'help.about.lichess':
    '— ערכת צלילי הפסנתר מאת ⁦Enigmahack⁩ (⁦AGPL-3.0+⁩) וערכות הכלים (⁦cburnett⁩ מאת ⁦Colin M.L. Burnett⁩ וחברים, כל אחת ברישיון משלה).',
  'help.about.fics':
    '— שרת השחמט החינמי באינטרנט שכל האפליקציה הזאת קיימת כדי לדבר איתו. תהיו נחמדים בערוץ 39.',
  'help.about.outro1': 'הרשימה המלאה, עם הרישיונות המדויקים, נמצאת בקובץ',
  'help.about.outro2': 'שבתוך',
  'help.about.repoLink': 'מאגר הקוד',
  'help.about.outro3': '. משהו שבור או חסר?',
  'help.about.reportLink': 'דווחו על תקלה',
  'help.about.outro4': 'או',
  'help.about.suggestLink': 'הציעו פיצ׳ר',

  'help.trouble.title': 'פתרון תקלות',
  'help.trouble.addressBarTitle': 'שורת הכתובת עדיין מופיעה.',
  'help.trouble.addressBar1':
    'דפדפנים מודרניים מציגים בראש כל חלון קופץ פס מקור של שורה אחת, בלי קשר להגדרות. מצב',
  'help.trouble.addressBar2':
    'שלמעלה עוקף אותו לגמרי בחלון הראשי. חלונות קופצים שנפתחים מתוך חלון במצב אפליקציה יורשים את אותו מראה נקי.',
  'help.trouble.blockerTitle': 'חוסם חלונות קופצים.',
  'help.trouble.blocker1': 'אפשרו חלונות קופצים עבור',
  'help.trouble.blocker2':
    '(או שרת הייצור שלכם). ב־⁦Brave⁩: הגדרות → פרטיות ואבטחה → הגדרות אתרים → חלונות קופצים.',
  'help.trouble.shortcutTitle': 'הקיצור פותח לשונית רגילה במקום חלון אפליקציה.',
  'help.trouble.shortcut1': 'ודאו שהדגל הוא',
  'help.trouble.shortcut2': 'עם',
  'help.trouble.shortcut3':
    'ובלי רווח, ושהדפדפן לא רץ כבר עם פרופיל שדורס את הדגל.',
};

export default he;
