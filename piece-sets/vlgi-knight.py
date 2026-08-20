# -*- coding: utf-8 -*-
"""A knight for Very Little Gravitas Indeed, in that set's own language.

VLGI is soft, inflated and thick-outlined, and it bands only the royalty —
the pawn just flares, the rook takes a slab. So the knight is one path from
ear to base, the way the pawn is one path, and wears no bands.
"""
import os, sys
OUT = sys.argv[1]

#: Width at each eighth of the square, top to bottom, is what a knight is
#: at the acuity a board is read with:
#:
#:     cburnett   0  36  58  69  75  73  55  55
#:     alpha      5  33  61  70  72  59  59  61
#:     first draft here
#:                9  25  45  58  58  42  53  50
#:
#: A knight is **widest across the middle** — the jaw and the throat — and
#: tucks IN at the foot. The first draft did the opposite: a waist at the
#: seventh band and then a wide flat base, which is a rook, and blurred it
#: measured 0.470 from cburnett's rook against 0.825 from its knight. The
#: set scored 5/6 and this was the one.
#:
#: So the throat notch goes. It is the correct anatomy and the wrong
#: silhouette: at 64px it reads as the pinch above a rook's base rather
#: than as a jaw. The jaw is carried by the mouth line and the cheek
#: instead, which are detail rather than outline, and the outline is left
#: to do the one job it can do from across the room.
KNIGHT = ("M 22.6 9.4 "
          "C 20.4 11.0 17.6 13.0 15.4 15.0 "
          "C 12.6 17.4 9.6 19.8 8.2 21.8 "
          "C 7.2 23.2 7.2 24.6 8.3 25.7 "
          # The jaw hangs LOW and the mane bulges wide at the same height.
          # Band five of eight, y 28.1-33.75, is where cburnett's knight is
          # 73% of the square and the first two drafts here were 42% and
          # 52% — a waist, and a waist above a flared foot is a rook. The
          # foot tucks in to 55% to match, which is the other half: a
          # knight is widest across the middle, a rook at the floor.
          "C 9.0 28.2 10.6 29.0 12.4 29.4 "
          "C 14.8 29.8 16.6 29.4 17.8 28.4 "
          "C 16.4 31.4 14.6 33.6 13.2 35.6 "
          "C 12.2 37.0 11.8 38.2 11.7 39.2 "
          "L 33.4 39.2 "
          "C 33.4 37.6 34.4 35.6 35.0 33.4 "
          "C 35.8 29.6 36.6 24.2 36.4 19.4 "
          "C 36.2 15.2 34.6 12.0 32.8 10.2 "
          "L 31.2 9.4 "
          "C 31.5 5.8 30.6 3.6 29.4 3.4 "
          "C 28.3 3.8 27.8 6.8 27.4 9.6 "
          "L 26.2 10.0 "
          "C 26.2 6.8 24.9 5.2 24.0 5.7 "
          "C 23.0 6.4 22.7 8.4 22.6 9.4 Z")
MANE = "M 30.0 10.8 C 33.0 14.2 34.4 18.8 34.0 23.6 C 33.6 28.0 32.8 31.4 32.4 34.4"
MOUTH = "M 10.0 24.6 C 11.0 25.4 12.2 25.8 13.4 26.0"
EYE = "M 19.2 14.4 a 1.05 1.55 -36 1 0 0.02 0.02 Z"
NOSTRIL = "M 10.8 22.9 a 0.78 0.78 0 1 0 0.02 0 Z"


def render(black):
    body, acc = ('#000', '#ececec') if black else ('#fff', '#000')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">\n'
            '  <g fill="%s" stroke="#000" stroke-width="1.5" stroke-linecap="round" '
            'stroke-linejoin="round">\n'
            '    <path d="%s"/>\n'
            '    <path fill="none" stroke="%s" d="%s"/>\n'
            '    <path fill="none" stroke="%s" d="%s"/>\n'
            '    <path fill="%s" stroke="%s" stroke-width="0.6" d="%s"/>\n'
            '    <path fill="%s" stroke="%s" stroke-width="0.6" d="%s"/>\n'
            '  </g>\n</svg>\n'
            % (body, KNIGHT, acc, MANE, acc, MOUTH, acc, acc, EYE, acc, acc, NOSTRIL))


os.makedirs(OUT, exist_ok=True)
for black in (False, True):
    open(os.path.join(OUT, ('b' if black else 'w') + 'N.svg'), 'w').write(render(black))
print('wrote', OUT)
