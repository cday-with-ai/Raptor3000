#!/usr/bin/env python3
"""Render status.html from PLAN.md and git. Generated, never edited.

The page is a *view* of PLAN.md, not a second copy of it. That is the whole
design: two files holding the same fact eventually hold two different facts and
nothing computes the diff. So there is no status document to keep up to date —
updating the plan updates the page, and the page is rebuilt every time the icon
is clicked. Nothing here runs on a timer.

Stdlib only. Writes exactly one file, status.html, which is gitignored because
it is derived from committed inputs.
"""

import html
import re
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PLAN = ROOT / "PLAN.md"
OUT = ROOT / "status.html"

# Sections lifted out of PLAN.md, in page order: (heading in PLAN.md, title on
# the page, fold entries?, open the first one?). A heading that stops existing
# renders as a visible gap rather than silently vanishing — a section quietly
# disappearing from a status page is the failure this whole page exists against.
SECTIONS = [
    ("Where this is", "Where this is", True, False),
    ("Known broken right now — not bugs to report", "Known broken right now", False, False),
    ("Next thing that would make sense", "Next thing that would make sense", True, True),
]

# How far PLAN.md may lag the newest source file before the page says so. Same
# week that `proj` uses for its `plan stale` hint, on purpose.
STALE_DAYS = 7


def git(*args, default=""):
    try:
        return subprocess.run(
            ["git", "-C", str(ROOT), *args],
            capture_output=True, text=True, timeout=20, check=True,
        ).stdout.strip()
    except Exception:
        return default


def plan_sections(text):
    """Split PLAN.md on '## ' headings. Returns {heading: body}."""
    out, current, buf = {}, None, []
    for line in text.splitlines():
        m = re.match(r"^##\s+(.*?)\s*$", line)
        if m and not line.startswith("###"):
            if current is not None:
                out[current] = "\n".join(buf).strip()
            current, buf = m.group(1), []
        elif current is not None:
            buf.append(line)
    if current is not None:
        out[current] = "\n".join(buf).strip()
    return out


def inline(s):
    """Escape, then re-introduce the three inline forms PLAN.md actually uses."""
    s = html.escape(s)
    s = re.sub(r"`([^`]+)`", r"<code>\1</code>", s)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", s)
    s = re.sub(r"(?<![\w/])\*([^*\n]+)\*(?!\w)", r"<em>\1</em>", s)
    return s


def render(md):
    """A deliberately small markdown subset: paragraphs, bullets, h3. PLAN.md
    uses nothing else, and a renderer that handles more is a renderer nobody
    checked against the file it renders."""
    parts, para, bullets = [], [], []

    def flush():
        if para:
            parts.append("<p>" + inline(" ".join(para)) + "</p>")
            para.clear()
        if bullets:
            parts.append("<ul>" + "".join(f"<li>{inline(b)}</li>" for b in bullets) + "</ul>")
            bullets.clear()

    for raw in md.splitlines():
        line = raw.rstrip()
        if not line.strip():
            flush()
        elif line.startswith("### "):
            flush()
            parts.append(f"<h3>{inline(line[4:])}</h3>")
        elif line.startswith("- ") or line.startswith("* "):
            if para:
                flush()
            bullets.append(line[2:])
        elif bullets and line.startswith("  "):
            bullets[-1] += " " + line.strip()
        else:
            if bullets:
                flush()
            para.append(line.strip())
    flush()
    return "\n".join(parts)


def split_items(md):
    """PLAN.md carries no '###' headings — each entry in a long section is a
    paragraph that opens with a bold sentence. That is the file's real schema, so
    the page uses it rather than imposing one: the bold sentence becomes the
    summary line and the rest folds away. Returns (lead, [(title, body), ...]).

    If the file ever stops using that shape, items comes back empty and the
    caller falls through to rendering the section flat. Degrading to a wall of
    text is ugly and honest; guessing at boundaries would be neither."""
    lead, items = [], []
    for block in re.split(r"\n\s*\n", md.strip()):
        if block.lstrip().startswith("**"):
            m = re.match(r"\*\*(.+?)\*\*(.*)", block.lstrip(), re.S)
            if m:
                items.append([re.sub(r"\s+", " ", m.group(1)).strip(), m.group(2).lstrip()])
                continue
        if items:
            items[-1][1] += "\n\n" + block
        else:
            lead.append(block)
    return "\n\n".join(lead), items


def render_section(md, fold, open_first):
    if not fold:
        return render(md)
    lead, items = split_items(md)
    if not items:
        return render(md)
    out = [render(lead)] if lead.strip() else []
    for i, (title, body) in enumerate(items):
        attr = " open" if (open_first and i == 0) else ""
        out.append(
            f"<details{attr}><summary>{inline(title)}</summary>"
            f"<div class=\"detail\">{render(body)}</div></details>"
        )
    return "\n".join(out)


def ago(dt, now):
    days = (now.date() - dt.date()).days
    if days == 0:
        return "today"
    if days == 1:
        return "yesterday"
    return f"{days} days ago"


def newest_source(now):
    """Newest tracked file under packages/, by mtime. Blind to generated and
    tooling output — a measure of activity that counts its own writes measures
    itself."""
    newest, newest_path = None, None
    listing = git("ls-files", "packages")
    for rel in listing.splitlines():
        p = ROOT / rel
        try:
            mt = datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc)
        except OSError:
            continue
        if newest is None or mt > newest:
            newest, newest_path = mt, rel
    return newest, newest_path


def nightlies(limit=14):
    """The nightly commits, newest first: (date, before, after)."""
    log = git("log", "--date=short", "--format=%ad\t%s", "-n", "400")
    rows = []
    for line in log.splitlines():
        date, _, subject = line.partition("\t")
        m = re.match(r"nightly: \S+ — (\d+)→(\d+) tests", subject)
        if m:
            rows.append((date, int(m.group(1)), int(m.group(2))))
        if len(rows) >= limit:
            break
    return rows


def main():
    if not PLAN.exists():
        print(f"status: no PLAN.md at {PLAN}", file=sys.stderr)
        return 1

    now = datetime.now(timezone.utc).astimezone()
    text = PLAN.read_text()
    secs = plan_sections(text)

    plan_mt = datetime.fromtimestamp(PLAN.stat().st_mtime, tz=timezone.utc).astimezone()
    src_mt, src_path = newest_source(now)
    if src_mt:
        src_mt = src_mt.astimezone()

    # Freshness. A plan that has stopped describing the code is worse than no
    # plan, because absence is honest and a stale plan is confident.
    notes = []
    stale = bool(src_mt and src_mt - plan_mt > timedelta(days=STALE_DAYS))
    if stale:
        notes.append(
            f"<strong>The plan may be stale.</strong> <code>PLAN.md</code> was last written "
            f"{ago(plan_mt, now)} ({plan_mt:%Y-%m-%d}), but <code>{html.escape(src_path or '')}</code> "
            f"changed {ago(src_mt, now)}. Everything below describes the plan, not the code."
        )

    runs = nightlies()
    if runs:
        last_run = datetime.strptime(runs[0][0], "%Y-%m-%d").replace(tzinfo=now.tzinfo)
        gap = (now.date() - last_run.date()).days
        night_line = (
            f"Last nightly: <strong>{runs[0][0]}</strong> ({ago(last_run, now)}), "
            f"{runs[0][1]}→{runs[0][2]} tests."
        )
        if gap >= 2:
            night_line += (
                " The 02:30 run stands down on a dirty tree, so a gap usually means the "
                "working tree was left with changes in it — not that anything failed."
            )
    else:
        night_line = "No nightly run found in the last 400 commits."

    dirty = git("status", "--porcelain")
    tree_line = (
        f"Working tree has {len(dirty.splitlines())} changed file(s) — tonight's 02:30 run will stand down."
        if dirty else "Working tree is clean — the 02:30 run will take a turn tonight."
    )

    counts = " → ".join(str(r[2]) for r in reversed(runs[:8])) if runs else "—"

    body = []
    for heading, title, fold, open_first in SECTIONS:
        content = secs.get(heading)
        if content is None:
            body.append(
                f'<section><h2>{html.escape(title)}</h2>'
                f'<p class="missing">No <code>## {html.escape(heading)}</code> section in PLAN.md. '
                f'Either it was renamed, or the plan no longer says.</p></section>'
            )
        else:
            body.append(
                f"<section><h2>{html.escape(title)}</h2>"
                f"{render_section(content, fold, open_first)}</section>"
            )

    page = PAGE.format(
        generated=f"{now:%Y-%m-%d %H:%M}",
        plan_written=f"{plan_mt:%Y-%m-%d %H:%M}",
        plan_ago=ago(plan_mt, now),
        notes="".join(f'<div class="warn">{n}</div>' for n in notes),
        night_line=night_line,
        tree_line=tree_line,
        counts=html.escape(counts),
        head=html.escape(git("log", "-1", "--format=%h %s", default="—")),
        body="\n".join(body),
    )
    OUT.write_text(page)
    print(OUT)
    return 0


PAGE = """<!doctype html>
<meta charset="utf-8">
<title>Raptor3000 — where the work is</title>
<style>
  :root {{
    --bg: #12161c; --panel: #1a2029; --line: #2a3340; --ink: #dfe5ec;
    --dim: #93a0b0; --accent: #d98a4a; --warn: #3a2c1c; --warnline: #7a5a2e;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; padding: 2.5rem 1.5rem 5rem; background: var(--bg); color: var(--ink);
    font: 16px/1.65 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }}
  main {{ max-width: 46rem; margin: 0 auto; }}
  h1 {{ font-size: 1.6rem; margin: 0 0 .2rem; letter-spacing: -.01em; }}
  .sub {{ color: var(--dim); margin: 0 0 1.75rem; }}
  h2 {{
    font-size: 1.05rem; text-transform: uppercase; letter-spacing: .08em;
    color: var(--accent); margin: 2.5rem 0 .75rem;
  }}
  h3 {{ font-size: 1rem; margin: 1.5rem 0 .4rem; }}
  p, li {{ margin: .6rem 0; }}
  ul {{ padding-left: 1.2rem; }}
  code {{
    background: #232b36; padding: .1em .35em; border-radius: 4px;
    font: .875em ui-monospace, "JetBrains Mono", monospace; color: #e6c68f;
  }}
  .facts {{
    background: var(--panel); border: 1px solid var(--line); border-radius: 10px;
    padding: 1rem 1.25rem; margin-bottom: 1.5rem;
  }}
  .facts p {{ margin: .35rem 0; color: var(--dim); font-size: .93rem; }}
  .facts strong {{ color: var(--ink); }}
  .warn {{
    background: var(--warn); border: 1px solid var(--warnline); border-radius: 10px;
    padding: .9rem 1.25rem; margin-bottom: 1.5rem; font-size: .95rem;
  }}
  details {{
    border-bottom: 1px solid var(--line); padding: .55rem 0;
  }}
  details:first-of-type {{ border-top: 1px solid var(--line); }}
  summary {{
    cursor: pointer; list-style: none; font-weight: 600; padding-left: 1.3rem;
    position: relative; color: var(--ink);
  }}
  summary::-webkit-details-marker {{ display: none; }}
  summary::before {{
    content: "▸"; position: absolute; left: 0; color: var(--accent);
    transition: transform .12s ease; display: inline-block;
  }}
  details[open] > summary::before {{ transform: rotate(90deg); }}
  summary:hover {{ color: var(--accent); }}
  .detail {{ padding: .1rem 0 .6rem 1.3rem; color: #c4cdd8; }}
  .detail p:first-child {{ margin-top: .35rem; }}
  .actions {{ display: flex; gap: .75rem; flex-wrap: wrap; margin: 1.5rem 0 0; }}
  a.btn {{
    display: inline-block; text-decoration: none; padding: .6rem 1.1rem;
    border-radius: 8px; border: 1px solid var(--accent); color: var(--accent);
    font-weight: 600; font-size: .95rem;
  }}
  a.btn.primary {{ background: var(--accent); color: #17120c; }}
  .hint {{ color: var(--dim); font-size: .85rem; margin-top: .6rem; }}
  .missing {{ color: #d98a8a; }}
  footer {{
    margin-top: 3.5rem; padding-top: 1.25rem; border-top: 1px solid var(--line);
    color: var(--dim); font-size: .85rem;
  }}
</style>
<main>
  <h1>Raptor3000</h1>
  <p class="sub">Web FICS chess client. Mid-build — that is the normal state here.</p>

  {notes}

  <div class="facts">
    <p>{night_line}</p>
    <p>Test count, last eight nights: <strong>{counts}</strong></p>
    <p>{tree_line}</p>
    <p>Head: <code>{head}</code></p>
  </div>

  <div class="actions">
    <a class="btn primary" href="raptor://start">Start the dev server</a>
    <a class="btn" href="raptor://room">Open a session here</a>
  </div>
  <p class="hint">The dev server starts in the background and opens its own tab;
  Vite picks the port. Brave will ask once whether to hand the link to the
  system — that prompt is the handler being invoked, and it is fine to allow it.</p>

  {body}

  <footer>
    <p>Generated {generated} from <code>PLAN.md</code>, last written {plan_written}
    ({plan_ago}). This page holds no state of its own — everything above is read
    out of the plan and out of git at the moment you clicked the icon. To change
    what it says, change the plan.</p>
  </footer>
</main>
"""


if __name__ == "__main__":
    sys.exit(main())
