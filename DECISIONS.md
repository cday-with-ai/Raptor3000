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
