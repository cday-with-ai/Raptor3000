# Decisions and shortcuts

Logged as taken, per the house rule. Walk this on completion.

1. **Popups stay; the gate teaches instead (2026-08-14).** The windowed
   model (Decaf's) is the product, so the popup-blocker fix is not a
   single-window rework but making the browser surgery legible to a
   first-time visitor: the PopupGate's instruction is now a picture of
   their own browser (inline-SVG address-bar / infobar mock with the
   icon pulsing), only their browser is shown (others fold away), and
   while blocked the gate re-runs the activation-less test on focus and
   every 4s — the visitor never reports back; the gate notices the
   Allow click, congratulates, and leaves. `?popupgate=demo` renders
   the blocked banner from an allowed browser without testing or
   persisting.

2. **Shortcut: pictures only for chromium and firefox.** Safari and the
   two mobile keys keep prose — those UIs vary more across versions and
   mobile is explicitly second-class ("tabs, not windows") until the
   single-window rework mobile.ts already concedes.

3. **Shortcut: the watcher effect has no component-level test.** The
   testable seams (double-open order, auto-test, UA detection, demo
   param) are unit-tested; the focus/interval effect is four lines of
   listener wiring verified by hand. A jsdom component harness for one
   effect wasn't worth the new dependency.

4. **Shortcut: the Firefox picture shipped without a live Firefox
   check.** Same SVG primitives as the chromium one (which was
   eyeballed via the demo param); risk accepted, revisit if a Firefox
   user reports the banner looking off.

5. **Humans-only analytics (2026-08-14: "can we get our e2e tests to not
   be counted?").** Web Analytics runs from our own gated snippet in
   index.html, not dash auto-injection: skip when `navigator.webdriver`
   (Playwright e2e) or localStorage `raptor.noCount` (a driven real
   browser sets it). Auto-injection must stay OFF in the dash — it
   injects unconditionally at the edge and would double-count every
   visitor next to this snippet. Popup windows load the same HTML, so a
   session's boards add page views; visits/uniques stay honest, which is
   the number that matters. The site token is public by design (it ships
   in every visitor's page source).

6. **The watcher waits out transient activation (2026-08-14, found live
   by Carson: "it says enabled … i didnt enable it").** A page click
   grants ~5s of activation and fresh-default browsers allow GESTURE
   popups, so a single-open check ticking inside that window inherits
   the click and lies "allowed" — the same trap the double-open test
   was built against, re-entered through the interval. Fix: checks run
   only after 6s of no pointerdown/keydown (`quietLongEnough`, pinned
   by test). The honest path stays instant: clicks on the browser's own
   Allow dialog grant the page nothing, so the focus-triggered check on
   return is clean. Same pass: demo mode no longer self-dismisses
   (Test again reports inline) and the mock pictures are captioned as
   pictures with pointer-events off.

7. **The nightly no longer stands down on a dirty tree; it asks whose
   change it is (2026-08-15, found live by Carson: "i should be able to
   change my projects and uneffect the nightly").** The old interlock
   refused to run if `git status` was dirty at all, because the landing
   step was `git add -A` and would otherwise sweep uncommitted work into
   a commit authored by "Raptor3000". Correct about the danger, wrong
   about the remedy: it let any stray file switch the nightly off. It
   stood down on thirteen of its first nineteen scheduled nights, and on
   2026-08-15 the single blocking file was `queue/suggestions.md` —
   nine notes the `second` and `nighthawk` sessions had filed asking
   this very job for fixes. Under the suggestionable contract the writer
   leaves the note uncommitted and the owning job commits it, so the
   inbox could only be cleared by the run the inbox was blocking. Six
   nights, no work, deadlocked on its own mail.

   Fix: snapshot every dirty path and its `git hash-object` before the
   increment and again after. New path or moved hash → the job's, and
   the job commits it by explicit path. Dirty before and byte-identical
   → Carson's, left exactly as found. Dirty before and moved → a real
   collision, reported and neither committed nor reverted; ambiguity is
   not resolved silently in favour of the machine. `queue/` is excluded
   from the baseline outright — an inbox is never work-in-progress
   against the job it is addressed to (claimbot got there first with
   `:(exclude)queue`; this is that ported back).

   Two consequences worth naming. `git add -A` is gone, and with it the
   reason the guard existed. And `git reset --hard` is gone: it was safe
   only because the old guard guaranteed an empty tree, and it is the
   most destructive thing that could run at 02:30 over a human's unsaved
   work. Reverting is now per-path, plus `reset --soft` to fold back any
   commits the increment made on its own without touching the tree.

   Shortcut taken: the ratchet still counts tests over the whole tree,
   so uncommitted work that breaks the suite will revert the increment's
   files even though the increment was innocent. Separating the two
   would need the job to build against a clean worktree, which is a
   bigger change than tonight's. The red-tree message now says which
   case it is rather than pretending to know.

8. **The first-contact surfaces speak the visitor's language; the rest
   of the app does not (2026-08-15, Carson: "i think non english speakers
   are running into the instructions page and can't decipher it").** The
   popup gate is met *before* login by someone who has not chosen to be
   here yet, and it asks them to perform surgery on their browser
   chrome. In a language they don't read, that is a dead end with no
   recourse — and the evidence that it fails is already in: "neither
   billjr nor naomi could manage it last night."

   So the boundary is drawn at what a visitor meets before they are
   playing: the gate, the login screen (including the mobile stop), and
   the post-login Options/Help page. Chat, boards, the move list and
   everything downstream stay English, deliberately. Carson's reasoning,
   which is the whole justification: "fics is english so the user will
   know some english by default." Translating the client's chrome while
   FICS streams English tells, channel names and game results would move
   the language boundary, not remove it — and would cost a translation
   pass on every feature forever after. The line is drawn where the
   client is talking about *itself*.

   Same rule inside the translated prose: FICS commands, `--app`
   recipes, file paths, license names and product names stay English in
   every catalog, because they are what the visitor must type or hunt
   for. Browser menu paths DO get translated (a German visitor's Chrome
   says "Einstellungen"), arrows and order preserved.

   Twelve languages, picked from who plays on FICS rather than from a
   list of the world's biggest: de, es, pt, fr, ru, pl, nb, he, zh, ja,
   ko, en. Detection is `navigator.languages` in the visitor's own
   preference order, region dropped, with `iw`→he and `no`/`nn`→nb; it
   is always overridable from a picker on the gate, the login card and
   Options, because detection is a guess (shared machines, a browser
   installed in the wrong language) and a wrong guess must never be a
   trap. The choice persists in localStorage under `pref.uiLang` and
   syncs across popups by `storage` event — the same mechanism as
   theme, for the same reason: board and chat windows are separate
   documents, so a React context could never reach them.

9. **Shortcut: catalogs are hand-written whole-file, and a test is the
   only thing standing between us and drift.** No extraction tooling, no
   ICU message format, no plural rules — the catalog is a flat
   `Record<MessageKey, string>` with `{name}` interpolation and exactly
   one markup tag (`<b>`), and English is the source of truth. TypeScript
   refuses a *missing* key; `i18n.test.ts` catches what it can't see —
   dropped `<b>` pairs, a placeholder translated into `{nombre}`, stray
   tags, a truncated file, and a "translation" that is still mostly
   English. What nothing catches is an English string CHANGING while the
   eleven translations quietly keep saying the old thing. That is the
   real maintenance cost of this decision and it is unpaid: when it
   bites, the answer is a per-key hash of the English source and a job
   that re-translates only what moved.

10. **Shortcut: sentences with inline code are split into fragment keys
    (`help.appmode.linux1` + `<code>` + `linux1b`).** The Help page
    interleaves prose with code spans and links, and the alternative —
    letting catalogs carry real markup — means parsing translator HTML
    to render it. Splitting keeps the renderer dumb, at the cost of
    handing translators sentence fragments whose word order they cannot
    fully control. German already had to reorder one (`linuxSub*`) to
    stay idiomatic. If a language needs a genuinely different clause
    order the fragment scheme will fight it, and the fix would be a
    single key per sentence with named slots.
