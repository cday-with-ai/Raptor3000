#!/usr/bin/env python3
"""Measure whether a piece set can be played on, rather than whether it looks good.

    ~/.venvs/science/bin/python piece-sets/legibility.py            # every installed set
    ~/.venvs/science/bin/python piece-sets/legibility.py lathe talon

Needs numpy + Pillow (the science venv) and brave-browser for rendering.

WHY THIS EXISTS
---------------
Carson, 2026-08-19, about a set he liked the look of: "i duno if i can play
on it though". Then: "i convert pieces to positions in my mind and think
about it. the pieces should kind of match what i am thinking in my mind ...
if its easier i play better === better set", and "a lot of it is just what
i am use to — i grew up playing chess over the board and have played a lot
of online chess."

That is a specification, and screenshots cannot check it. Two things it
asks for, and neither is visible when you look at a set head-on:

  1. You fixate one square and read the rest peripherally, where acuity
     collapses and only coarse shape survives. Detail that lives at fovea
     does not count.
  2. Your piece detectors were trained over decades on Staunton and on the
     online sets. A piece that does not resemble its own prototype costs a
     beat, every glance, forever.

So every measure below blurs first, and the important one compares against
a prototype rather than against the set's own pieces.

WHAT IT REPORTS
---------------
  distinct   worst-pair separation within the set, at three acuities. A set
             is only as readable as its two most similar pieces, because
             that is the pair you misread with ten seconds left.
  reads-true how many of six pieces are nearest to their OWN counterpart in
             the prototype, plus the margin by which they win or lose.
             Margin is what "easy" feels like.

Measured 2026-08-19 (prototype cburnett, sigma 2.2):

    cburnett 6/6 +0.52   alpha    6/6 +0.29   leipzig 5/6 +0.22
    vlgi     5/6 +0.23   cardinal 5/6 +0.22   mpchess 3/6 -0.02
    talon    2/6 -0.07   lathe    1/6 -0.27

Both sets original to this repo fail. So does mpchess, which is somebody
else's and shipped in lichess — worth knowing, because it means the measure
is not merely allergic to whatever this repo drew.

THREE CAVEATS, AND THEY MATTER
------------------------------
  * **The prototype does the work.** cburnett scoring 6/6 is tautological —
    it is the yardstick. The real signal is alpha and leipzig scoring high
    against it *independently*. A different prototype could reorder things.
  * **Never validated against play.** The chain from "blurred correlation"
    to "plays better" is a plausible model, not a measured fact. The test
    that would settle it is a forced-choice trial on Carson himself: blurred
    piece, name it, time it. Until that is run, this is a ruler nobody has
    checked against a metre.
  * **It cannot tell new from bad.** It scores unfamiliarity, and
    unfamiliarity is the price of originality. Five hundred games would
    retrain the detectors and the score would not move. Do not use it to
    reject a set for being different; use it to find which piece is doing
    the damage.

A NOTE ON THE FIRST VERSION, WHICH WAS WRONG
--------------------------------------------
It compared images by RMS, which is dominated by how much ink a piece has
rather than by its shape. Every Lathe piece "matched" cburnett's bishop —
cburnett's *lightest* piece. An inkometer. Comparison is now correlation of
mean-centred images. The ranking survived the correction, which is the only
reason the numbers above are quotable.
"""
from __future__ import annotations

import itertools
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
PIECES = ROOT / "packages/web/public/pieces"
CODES = ["wK", "wQ", "wR", "wB", "wN", "wP"]
PX = 64
#: Blur radii in pixels of a 64px square: the square you are staring at, one
#: or two away, and the far side of the board or a blitz glance.
ACUITY = [("fovea", 0.0), ("near", 1.5), ("periph", 3.0)]
#: What reads-true compares against. Not neutral — see the caveats.
PROTOTYPE = "cburnett"
PROTO_SIGMA = 2.2


def render(setname: str, tmp: Path) -> list[Image.Image]:
    """One row of six pieces on a light square, as the browser draws them.

    Through a real browser rather than a Python SVG library on purpose: the
    sets use filters and opacity, and the thing being measured is what the
    user's browser actually puts on screen.
    """
    cells = "".join(
        f'<div style="width:{PX}px;height:{PX}px;background:#f0d9b5">'
        + (PIECES / setname / f"{c}.svg").read_text(encoding="utf-8")
        + "</div>"
        for c in CODES
    )
    html = tmp / f"{setname}.html"
    png = tmp / f"{setname}.png"
    html.write_text(
        "<!doctype html><meta charset=utf-8><style>body{margin:0;display:flex}"
        f"svg{{width:{PX}px;height:{PX}px;display:block}}</style>" + cells,
        encoding="utf-8",
    )
    subprocess.run(
        ["brave-browser", "--headless", "--disable-gpu", f"--screenshot={png}",
         f"--window-size={PX * 6},{PX}", "--hide-scrollbars", str(html)],
        capture_output=True, check=False,
    )
    im = Image.open(png).convert("L")
    return [im.crop((i * PX, 0, (i + 1) * PX, PX)) for i in range(6)]


def blurred(imgs: list[Image.Image], sigma: float) -> list[np.ndarray]:
    return [
        np.asarray(i.filter(ImageFilter.GaussianBlur(sigma)) if sigma else i,
                   dtype=float) / 255.0
        for i in imgs
    ]


def unit(a: np.ndarray) -> np.ndarray:
    """Mean-centred and unit-scaled, so comparison is about pattern not ink."""
    a = a - a.mean()
    n = float(np.sqrt((a * a).sum()))
    return a / n if n > 1e-9 else a


def shape_distance(a: np.ndarray, b: np.ndarray) -> float:
    """0 identical, 1 unrelated, 2 opposite."""
    return 1.0 - float((unit(a) * unit(b)).sum())


def worst_pair(imgs: list[np.ndarray]) -> tuple[float, str]:
    d = {
        (CODES[x][1], CODES[y][1]): shape_distance(imgs[x], imgs[y])
        for x, y in itertools.combinations(range(6), 2)
    }
    k = min(d, key=d.get)                    # smallest distance = most alike
    return d[k], f"{k[0]}/{k[1]}"


def reads_true(cand: list[np.ndarray], proto: list[np.ndarray]):
    hits, margins, misreads = 0, [], []
    for j, code in enumerate(CODES):
        d = [shape_distance(cand[j], proto[k]) for k in range(6)]
        best = int(np.argmin(d))
        if best == j:
            hits += 1
            margins.append(sorted(d)[1] - d[j])      # how much it wins by
        else:
            margins.append(d[best] - d[j])           # negative: it lost
            misreads.append(f"{code[1]}→{CODES[best][1]}")
    return hits, float(np.mean(margins)), misreads


def main() -> int:
    names = sys.argv[1:] or sorted(
        p.name for p in PIECES.iterdir() if p.is_dir()
    )
    if PROTOTYPE not in names:
        names = [PROTOTYPE] + names

    with tempfile.TemporaryDirectory() as td:
        tmp = Path(td)
        raw = {n: render(n, tmp) for n in names}

    proto = blurred(raw[PROTOTYPE], PROTO_SIGMA)

    print(f"within-set: worst confusable pair (higher is easier to tell apart)")
    print(f"{'set':10s}" + "".join(f"{lab:>17s}" for lab, _ in ACUITY))
    for n in names:
        cells = []
        for _, sg in ACUITY:
            v, pair = worst_pair(blurred(raw[n], sg))
            cells.append(f"{v:9.4f} {pair:>6s}")
        print(f"{n:10s}" + "".join(cells))

    print(f"\nreads-true against {PROTOTYPE}, blurred (sigma {PROTO_SIGMA})")
    print(f"{'set':10s} {'hits':>5s} {'margin':>9s}   misreads")
    for n in names:
        hits, margin, bad = reads_true(blurred(raw[n], PROTO_SIGMA), proto)
        flag = "" if hits >= 5 else "   <-- hard to play on"
        print(f"{n:10s} {hits}/6 {margin:9.4f}   {', '.join(bad) or '-'}{flag}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
