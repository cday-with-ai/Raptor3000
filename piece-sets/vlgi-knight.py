# -*- coding: utf-8 -*-
"""A knight for Very Little Gravitas Indeed, in that set's own language.

VLGI is soft, inflated and thick-outlined, and it bands only the royalty —
the pawn just flares, the rook takes a slab. So the knight is one path from
ear to base, the way the pawn is one path, and wears no bands.
"""
import os, sys
OUT = sys.argv[1]

KNIGHT = ("M 22.6 10.2 "
          "C 20.6 11.8 18.0 13.6 16.0 15.4 "
          "C 13.4 17.6 10.8 19.8 9.6 21.6 "
          "C 8.8 22.9 8.8 24.2 9.8 25.2 "
          "C 10.7 26.1 11.9 26.5 13.4 26.7 "
          "C 15.4 26.9 16.8 26.2 17.6 25.0 "
          "C 18.0 26.6 17.6 28.4 17.4 30.0 "
          "C 15.2 32.4 12.6 35.4 11.6 39.0 "
          "L 33.4 39.0 "
          "C 32.4 35.4 30.6 32.4 29.6 30.0 "
          "C 31.6 27.0 33.2 23.4 33.2 19.4 "
          "C 33.2 15.6 31.8 12.6 30.4 11.2 "
          "L 29.4 10.4 "
          "C 29.7 6.6 29.0 4.4 28.0 4.2 "
          "C 27.0 4.6 26.6 7.6 26.2 10.4 "
          "L 25.2 10.8 "
          "C 25.2 7.6 24.1 6.0 23.3 6.5 "
          "C 22.8 7.2 22.6 9.2 22.6 10.2 Z")
MANE = "M 28.4 11.8 C 30.6 14.6 31.6 18.6 31.2 22.8 C 30.9 26.0 30.2 28.4 29.6 30.2"
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
