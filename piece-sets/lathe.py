# -*- coding: utf-8 -*-
"""Lathe — a turned Staunton set.

The roster already has cburnett's drawn line, Talon's carved facets and
VLGI's inflated softness. The third language is the one a real Staunton
set is actually made in: **turned on a lathe**. Every piece below the
head is a spun form, and every piece carries the same three fine grooves
the turner's tool leaves in the collar. Nothing else on the board has
them, and at 25px they are what you recognise the set by.

Slimmer and taller than everything else, and a finer outline (1.15 against
the roster's 1.5), because that is what elegant costs.
"""
import os, re, sys
OUT = sys.argv[1]
SW, SWA = 1.15, 0.8

#: Every piece used to share one foot and one collar, and that is what a
#: set is — but it cost more than it bought. Measured at 32px, the bottom
#: 38% of a lathe piece differed from another lathe piece by 0.105, where
#: cburnett's differ by 0.394. Four times less. Two thirds of every piece
#: was carrying no information about which piece it was, and the worst
#: pair (knight/pawn, 0.142) came out at half cburnett's worst (0.279).
#:
#: Carson felt it before it was measured: "i duno if i can play on it".
#:
#: A real turned set solves this without giving up the lathe — the king's
#: base is wider than the pawn's, the rook's is squatter, the bishop's
#: narrower. Same tool, different profile. So the base is now a function
#: of two numbers per piece and the three grooves survive on all of them.
#:
#:   w  foot width, as a fraction of the widest (the king)
#:   y  where the collar tops out; lower means a taller base
BASES = {
    'K': (1.06, 30.6),   # widest and tallest — it is the king
    'Q': (1.00, 30.2),
    'R': (1.04, 31.8),   # squat: a rook is a tower standing on the floor
    'B': (0.98, 29.2),   # broad mitre, so a broad foot under it
    'N': (0.92, 30.8),
    'P': (0.68, 32.4),   # the runt, and it should look like one
}


def base(letter):
    """Foot, collar and the turner's three grooves, sized for one piece."""
    w, top = BASES[letter]
    C = 22.5
    fo = 11.3 * w          # foot half-width
    fi = 10.3 * w          # foot half-width at the bevel
    ct = 6.1 * WIDTH[letter]   # collar top must meet the body it carries
    cb = 9.3 * w           # collar half-width where it meets the foot
    foot = (f"M {C-fo:.1f} 39.4 H {C+fo:.1f} V 38.2 "
            f"C {C+fo:.1f} 37.4 {C+fi:.1f} 36.8 {C+fi-0.6:.1f} 36.8 "
            f"H {C-fi+0.6:.1f} C {C-fi:.1f} 36.8 {C-fo:.1f} 37.4 {C-fo:.1f} 38.2 Z")
    collar = (f"M {C-cb:.1f} 36.8 C {C-cb+1.2:.1f} {top+4.0:.1f} "
              f"{C-ct-0.6:.1f} {top+2.0:.1f} {C-ct:.1f} {top:.1f} "
              f"H {C+ct:.1f} C {C+ct+0.6:.1f} {top+2.0:.1f} "
              f"{C+cb-1.2:.1f} {top+4.0:.1f} {C+cb:.1f} 36.8 Z")
    # three grooves, evenly spaced up the collar, each sized to it
    gs = []
    for i, f in enumerate((0.78, 0.50, 0.24)):
        y = top + (36.8 - top) * f
        hw = ct + (cb - ct) * f
        gs.append(f"M {C-hw+0.9:.1f} {y:.1f} H {C+hw-0.9:.1f}")
    return foot, collar, ' '.join(gs)


def scale_x(d: str, k: float, c: float = 22.5) -> str:
    """Scale a path's x-coordinates about `c`, leaving y alone.

    Only absolute commands appear in the bodies below (M C L H V), which is
    what makes this safe to do textually. Arcs and relative commands are
    used only for the knight's eye and nostril, which are never scaled.

    Widening the king and narrowing the pawn is not the same as fattening
    the set. The mean body width across the six is held where it was — what
    changes is the SPREAD, and spread is the whole of legibility. A set
    whose pieces are all the same width is a set you read by the finial
    alone, which is a thing you cannot do at 32px with ten seconds left.
    """
    out, i = [], 0
    tokens = re.findall(r'[A-Za-z]|-?\d*\.?\d+', d)
    cmd = None
    pending = []
    for t in tokens:
        if t.isalpha():
            cmd = t
            out.append(t)
            pending = []
            continue
        v = float(t)
        if cmd in ('M', 'L', 'C', 'S', 'Q', 'T'):
            # x is every other number, starting with the first
            isx = (len(pending) % 2 == 0)
        elif cmd == 'H':
            isx = True
        elif cmd == 'V':
            isx = False
        else:
            isx = False
        out.append(f'{c + (v - c) * k:.2f}' if isx else f'{v:g}')
        pending.append(v)
    res, prev_alpha = [], False
    for t in out:
        if t.isalpha():
            res.append(' ' + t + ' ')
        else:
            res.append(t + ' ')
    return re.sub(r'\s+', ' ', ''.join(res)).strip()


#: How wide each piece is, relative to what it was. The mean of the five
#: turned pieces is 1.00 — the set is exactly as slim as it was, and only
#: the differences between pieces have grown.
WIDTH = {'K': 1.16, 'Q': 1.10, 'R': 1.14, 'B': 1.00, 'P': 0.68, 'N': 1.00}


KING = [
    ("M 21.5 4.2 H 23.5 V 7.0 H 26.6 V 9.0 H 23.5 V 13.2 H 21.5 V 9.0 "
     "H 18.4 V 7.0 H 21.5 Z", 'fill'),
    ("M 16.6 18.6 C 16.0 14.2 18.8 11.8 22.5 11.8 C 26.2 11.8 29.0 14.2 "
     "28.4 18.6 Z", 'fill'),
    ("M 16.8 21.0 H 28.2 L 28.4 18.6 H 16.6 Z", 'fill'),
    ("M 16.4 30.6 C 15.2 27.0 15.6 23.4 16.8 21.0 H 28.2 C 29.4 23.4 "
     "29.8 27.0 28.6 30.6 Z", 'fill'),
    ("M 16.8 21.0 H 28.2", 'seam'),
    ("M 16.0 26.4 H 29.0", 'line'),
]

QUEEN = [
    ("M 14.0 18.6 L 12.6 11.4 L 16.4 15.0 L 17.2 9.8 L 20.6 14.2 "
     "L 22.5 8.4 L 24.4 14.2 L 27.8 9.8 L 28.6 15.0 L 32.4 11.4 "
     "L 31.0 18.6 Z", 'fill'),
    ("M 14.8 21.0 H 30.2 L 31.0 18.6 H 14.0 Z", 'fill'),
    ("M 16.4 30.6 C 15.0 27.0 14.4 23.6 14.8 21.0 H 30.2 C 30.6 23.6 "
     "30.0 27.0 28.6 30.6 Z", 'fill'),
    ("M 14.8 21.0 H 30.2", 'seam'),
    ("M 15.2 25.8 H 29.8", 'line'),
    ('', 'beads'),
]

ROOK = [
    ("M 13.6 15.0 V 10.4 H 17.0 V 13.2 H 18.4 V 10.4 H 21.8 V 13.2 "
     "H 23.2 V 10.4 H 26.6 V 13.2 H 28.0 V 10.4 H 31.4 V 15.0 "
     "L 32.6 17.2 V 18.6 H 12.4 V 17.2 Z", 'fill'),
    ("M 15.4 18.6 C 14.8 22.6 14.8 26.8 15.6 30.6 H 29.4 C 30.2 26.8 "
     "30.2 22.6 29.6 18.6 Z", 'fill'),
    ("M 12.4 17.2 H 32.6", 'seam'),
    ("M 15.0 21.2 H 30.0 M 15.1 22.6 H 29.9", 'line'),
]

BISHOP = [
    ("M 22.5 9.8 C 25.6 12.0 28.4 15.8 28.4 19.6 C 28.4 22.4 26.8 24.2 "
     "25.8 25.2 H 19.2 C 18.2 24.2 16.6 22.4 16.6 19.6 C 16.6 15.8 "
     "19.4 12.0 22.5 9.8 Z", 'fill'),
    ("M 18.6 25.2 H 26.4 L 25.6 27.6 H 19.4 Z", 'fill'),
    ("M 20.0 27.6 H 25.0 C 26.4 28.6 27.6 29.6 28.6 30.6 H 16.4 "
     "C 17.4 29.6 18.6 28.6 20.0 27.6 Z", 'fill'),
    ("M 18.6 25.2 H 26.4 M 19.4 27.6 H 25.6", 'seam'),
    ("M 24.6 12.4 C 22.4 15.0 20.8 18.0 19.8 21.4", 'slit'),
    ('', 'finial'),
]

KNIGHT = [
    ("M 21.8 10.8 "
     "C 19.8 12.0 16.6 14.2 14.4 16.4 "
     "C 12.0 18.8 9.6 21.4 8.8 23.4 "
     "C 8.2 24.8 8.4 26.0 9.4 26.9 "
     "C 10.4 27.8 11.8 28.2 13.4 28.3 "
     "C 15.2 28.4 16.4 27.8 17.2 26.6 "
     "C 17.6 28.4 17.2 29.6 16.4 30.6 "
     "L 28.6 30.6 "
     "C 30.0 26.8 30.8 22.6 30.6 18.6 "
     "C 30.4 15.0 29.4 12.6 28.0 10.8 "
     "L 26.6 6.6 L 24.8 10.4 L 23.4 8.2 Z", 'fill'),
    ("M 18.0 15.6 a 0.9 1.35 -34 1 0 0.02 0.02 Z", 'dot'),
    ("M 9.9 24.1 a 0.65 0.65 0 1 0 0.02 0 Z", 'dot'),
    ("M 9.0 26.3 C 10.0 26.7 11.0 26.9 12.0 27.0", 'line'),
    ("M 19.4 17.6 C 18.0 20.4 16.4 22.8 14.6 24.8", 'line'),
    ("M 25.0 12.2 C 27.4 16.4 27.6 22.0 25.8 28.0", 'line'),
]

PAWN = [
    ("M 22.5 10.6 A 4.0 4.0 0 0 1 25.2 17.5 "
     "C 26.0 19.4 26.4 21.4 26.6 23.4 "
     "C 26.8 26.2 27.4 28.7 28.6 30.6 H 16.4 "
     "C 17.6 28.7 18.2 26.2 18.4 23.4 "
     "C 18.6 21.4 19.0 19.4 19.8 17.5 "
     "A 4.0 4.0 0 0 1 22.5 10.6 Z", 'fill'),
    ("M 18.5 23.2 H 26.5", 'line'),
]

BEADS = [(12.6, 10.0), (17.2, 8.4), (22.5, 7.0), (27.8, 8.4), (32.4, 10.0)]
PIECES = {'K': KING, 'Q': QUEEN, 'R': ROOK, 'B': BISHOP, 'N': KNIGHT, 'P': PAWN}


def render(letter, black):
    body, acc = ('#000', '#ececec') if black else ('#fff', '#000')
    foot, collar, grooves = base(letter)
    p = [f'<path fill="{body}" d="{foot}"/>', f'<path fill="{body}" d="{collar}"/>',
         f'<path stroke="{acc}" stroke-width="{SWA}" d="{grooves}"/>']
    for d, kind in PIECES[letter]:
        k = WIDTH[letter]
        if kind == 'fill':
            p.append(f'<path fill="{body}" d="{scale_x(d, k)}"/>')
        elif kind in ('seam', 'line'):
            p.append(f'<path stroke="{acc}" stroke-width="{SWA}" d="{scale_x(d, k)}"/>')
        elif kind == 'slit':
            p.append(f'<path stroke="{acc}" stroke-width="1.15" d="{scale_x(d, k)}"/>')
        elif kind == 'dot':
            p.append(f'<path fill="{acc}" stroke="{acc}" stroke-width="0.4" d="{d}"/>')
        elif kind == 'beads':
            p += [f'<circle fill="{body}" cx="{22.5 + (x - 22.5) * k:.2f}" cy="{y}" r="1.7"/>'
                  for x, y in BEADS]
        elif kind == 'finial':
            p.append(f'<circle fill="{body}" cx="22.5" cy="7.9" r="1.7"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">'
            f'<g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" '
            f'stroke-linejoin="round" stroke-width="{SW}">' + ''.join(p) + '</g></svg>')


os.makedirs(OUT, exist_ok=True)
for L in 'KQRBNP':
    for b in (False, True):
        open(os.path.join(OUT, ('b' if b else 'w') + L + '.svg'), 'w').write(render(L, b))
print('wrote', OUT)
