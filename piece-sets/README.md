# piece-sets

Generators for the sets original to this repo, and the tool that decides
whether a set can be played on.

| file | what it is |
| --- | --- |
| `talon.py` | Talon — carved wood on a two-step plinth |
| `lathe.py` | Lathe — turned forms, three grooves in every collar |
| `vlgi-knight.py` | the knight drawn for Very Little Gravitas Indeed |
| `legibility.py` | the measurement |

The SVGs under `packages/web/public/pieces/<id>/` are **output**. Edit the
generator and re-run it; twelve files hand-tuned in parallel is how a set
drifts, and the white bishop gains a millimetre the black one never gets.

    ~/.venvs/science/bin/python piece-sets/lathe.py packages/web/public/pieces/lathe

## legibility.py — the part worth reading

A set has two jobs and a screenshot only checks one of them. Carson,
2026-08-19, about a set he liked the look of: *"i duno if i can play on it
though"*, then *"i convert pieces to positions in my mind and think about
it. the pieces should kind of match what i am thinking in my mind … if its
easier i play better === better set"*, and *"a lot of it is just what i am
use to — i grew up playing chess over the board and have played a lot of
online chess."*

Two things follow, and neither is visible looking at a set head-on:

- **You do not look at most of the board.** You fixate one square and read
  the rest peripherally, where acuity collapses and only coarse shape
  survives. Detail that lives at fovea does not count.
- **Your detectors are already trained.** Decades of Staunton and online
  sets. A piece that does not resemble *its own* prototype costs a beat,
  every glance, for as long as you own the set.

So the tool blurs first, and the measure that matters compares each piece
against a prototype rather than against the set's own pieces.

    ~/.venvs/science/bin/python piece-sets/legibility.py            # all sets
    ~/.venvs/science/bin/python piece-sets/legibility.py lathe talon

### What it found (2026-08-19, prototype cburnett)

    cburnett 6/6 +0.52   alpha    6/6 +0.29   leipzig 5/6 +0.22
    vlgi     5/6 +0.23   cardinal 5/6 +0.22   mpchess 3/6 -0.02
    talon    2/6 -0.07   lathe    1/6 -0.27

Both sets original to this repo fail. Lathe's pieces are nearest to
cburnett's **bishop** five times out of six, and its own knight sits 0.91
from cburnett's knight — the worst cell in the grid, where alpha's knight
matches at 0.36. Lathe has nothing on it that looks like a knight.

The cause was not the fine outline and not the plinth; both were tested and
neither moved the number. It is that **Lathe does not fill the square**.
Traditional sets run edge to edge; Lathe is slim and inset, so blurred,
every piece is a small shape floating in a large square and small floating
shapes all look alike — which is also why cburnett's bishop, the smallest
prototype, acts as a hub. Scaling the drawing up moved the margin from
-0.212 to -0.040, more than any other change tried.

The one thing that did help directly: the turned grooves were opaque black
lines, and a dozen of them inside a small white shape average to grey, so
the piece loses its tone while cburnett's stays a bright mass. At 42%
opacity they behave like real turned rings — visible in the hand, gone from
across the table. 1/6 to 2/6.

### Three caveats, and they matter

- **The prototype does the work.** cburnett scoring 6/6 is tautological; it
  is the yardstick. The real signal is alpha and leipzig scoring high
  against it *independently*, and mpchess — somebody else's set — failing.
  A different prototype could reorder things.
- **Never validated against play.** The chain from blurred correlation to
  "plays better" is a plausible model, not a measured fact. The test that
  would settle it is a forced-choice trial on Carson: blurred piece, name
  it, time it, twenty per set. Until that runs this is a ruler nobody has
  checked against a metre.
- **It cannot tell new from bad.** It scores *unfamiliarity*, and
  unfamiliarity is the price of originality. Five hundred games would
  retrain the detectors and the score would not move. Use it to find which
  piece is doing the damage, never to reject a set for being different.

### The first version was wrong

It compared images by RMS, which is dominated by how much ink a piece has
rather than by its shape, so every Lathe piece "matched" cburnett's bishop
— cburnett's *lightest* piece. An inkometer. It is correlation of
mean-centred images now. The ranking survived the correction, which is the
only reason the numbers above are quotable.
