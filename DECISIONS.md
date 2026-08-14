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
