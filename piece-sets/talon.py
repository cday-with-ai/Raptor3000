# -*- coding: utf-8 -*-
"""Talon — an original Staunton piece set drawn in the cburnett 45x45 frame."""
import os, sys

OUT = sys.argv[1]
W, B, ACC = '#fff', '#000', '#ececec'

FOOT = ("M 8.8 39.6 H 36.2 V 37.0 C 36.2 35.9 35.3 35.6 34.1 35.6 "
        "H 10.9 C 9.7 35.6 8.8 35.9 8.8 37.0 Z")
COLLAR = "M 11.6 35.6 H 33.4 L 31.8 32.2 H 13.2 Z"
SEAM_FOOT = "M 10.4 35.6 H 34.6"
SEAM_COLLAR = "M 13.6 32.2 H 31.4"

KING = [
    ("M 21.3 3.8 H 23.7 V 6.8 H 27.2 V 9.2 H 23.7 V 13.4 H 21.3 V 9.2 "
     "H 17.8 V 6.8 H 21.3 Z", 'fill'),
    ("M 15.8 15.4 v -1.2 a 2.1 2.1 0 0 1 4.2 0 v -1.6 a 2.5 2.5 0 0 1 5.0 0 "
     "v 1.6 a 2.1 2.1 0 0 1 4.2 0 v 1.2 Z", 'fill'),
    ("M 15.4 18.6 H 29.6 L 28.8 15.4 H 16.2 Z", 'fill'),
    ("M 13.6 32.2 C 12.4 25.6 14.6 20.8 17.0 18.6 H 28.0 C 30.4 20.8 "
     "32.6 25.6 31.4 32.2 Z", 'fill'),
    ("M 15.4 18.6 H 29.6", 'seam'),
    ("M 13.9 27.8 C 19.8 25.9 25.2 25.9 31.1 27.8", 'line'),
]

QUEEN = [
    ("M 11.4 18.0 L 9.6 10.2 L 15.0 14.6 L 16.0 8.8 L 20.0 13.8 "
     "L 22.5 7.6 L 25.0 13.8 L 29.0 8.8 L 30.0 14.6 L 35.4 10.2 "
     "L 33.6 18.0 Z", 'fill'),
    ("M 12.6 21.0 H 32.4 L 33.6 18.0 H 11.4 Z", 'fill'),
    ("M 14.0 32.2 C 12.4 27.6 11.9 23.8 12.6 21.0 H 32.4 C 33.1 23.8 "
     "32.6 27.6 31.0 32.2 Z", 'fill'),
    ("M 12.6 21.0 H 32.4", 'seam'),
    ("M 12.8 27.4 C 19.6 25.6 25.4 25.6 32.2 27.4", 'line'),
    ('', 'balls'),
]

ROOK = [
    ("M 11.2 15.2 V 9.4 H 15.4 V 12.8 H 17.3 V 9.4 H 21.5 V 12.8 "
     "H 23.4 V 9.4 H 27.6 V 12.8 H 29.5 V 9.4 H 33.7 V 15.2 "
     "L 35.2 17.6 V 19.6 L 30.2 21.4 C 30.9 25.4 31.1 28.8 30.8 32.2 "
     "H 14.2 C 13.9 28.8 14.1 25.4 14.8 21.4 L 9.8 19.6 V 17.6 Z", 'fill'),
    ("M 9.8 19.6 H 35.2", 'seam'),
    ("M 14.8 21.4 H 30.2", 'seam'),
    ("M 11.2 15.2 H 33.7", 'seam'),
]

BISHOP = [
    ("M 22.5 9.0 C 26.6 11.8 31.2 16.4 31.2 20.6 C 31.2 23.8 29.0 25.8 "
     "27.6 26.8 H 17.4 C 16.0 25.8 13.8 23.8 13.8 20.6 C 13.8 16.4 "
     "18.4 11.8 22.5 9.0 Z", 'fill'),
    ("M 16.6 26.8 H 28.4 L 26.8 29.6 H 18.2 Z", 'fill'),
    ("M 18.6 29.6 H 26.4 C 28.6 30.5 30.0 31.3 31.0 32.2 H 14.0 "
     "C 15.0 31.3 16.4 30.5 18.6 29.6 Z", 'fill'),
    ("M 16.6 26.8 H 28.4", 'seam'),
    ("M 18.2 29.6 H 26.8", 'seam'),
    ("M 26.4 12.8 C 23.6 15.6 21.4 19.2 20.2 23.0", 'slit'),
    ('', 'ball1'),
]

KNIGHT = [
    ("M 23.2 11.8 "
     "C 21.0 13.2 17.0 16.0 14.6 18.0 "
     "C 12.2 20.0 9.8 22.2 8.8 23.6 "
     "C 8.0 24.6 7.9 25.4 8.4 26.0 "
     "C 8.8 26.6 9.6 27.0 10.8 27.2 "
     "C 12.0 27.4 13.0 27.6 13.8 28.0 "
     "C 15.0 27.4 16.0 26.4 16.6 25.2 "
     "C 17.6 27.6 17.4 30.0 17.0 32.2 "
     "L 31.8 32.2 "
     "C 33.4 28.4 34.6 22.6 34.8 18.4 "
     "C 34.9 14.6 33.2 11.4 31.2 9.4 "
     "L 29.4 5.8 L 26.6 10.6 L 25.0 8.2 L 23.2 11.8 Z", 'fill'),
    ("M 19.2 17.2 a 0.95 1.45 -34 1 0 0.02 0.02 Z", 'dot'),
    ("M 10.2 23.8 a 0.7 0.7 0 1 0 0.02 0 Z", 'dot'),
    ("M 9.2 26.1 C 10.2 26.4 11.3 26.6 12.4 26.7", 'line'),
    ("M 20.8 19.4 C 19.4 21.8 17.8 23.8 16.0 25.4", 'line'),
    ("M 32.8 14.2 L 29.8 16.8 M 34.2 20.2 L 31.0 23.0 M 33.8 26.6 L 30.4 29.4", 'line'),
]

PAWN = [
    ("M 22.5 8.6 A 5.0 5.0 0 0 1 25.8 17.4 "
     "C 27.2 19.6 27.9 21.2 28.4 23.0 "
     "C 29.3 26.8 29.8 29.6 30.2 32.2 H 14.8 "
     "C 15.2 29.6 15.7 26.8 16.6 23.0 "
     "C 17.1 21.2 17.8 19.6 19.2 17.4 "
     "A 5.0 5.0 0 0 1 22.5 8.6 Z", 'fill'),
    ("M 17.0 21.8 C 20.2 20.6 24.8 20.6 28.0 21.8", 'seam'),
]

BALLS = [(9.6, 8.8), (16.0, 7.4), (22.5, 6.2), (29.0, 7.4), (35.4, 8.8)]
PIECES = {'K': KING, 'Q': QUEEN, 'R': ROOK, 'B': BISHOP, 'N': KNIGHT, 'P': PAWN}


def render(letter, black):
    body, accent = (B, ACC) if black else (W, B)
    parts = [f'<path fill="{body}" d="{FOOT}"/>', f'<path fill="{body}" d="{COLLAR}"/>',
             f'<path stroke="{accent}" stroke-width="1.2" d="{SEAM_FOOT}"/>',
             f'<path stroke="{accent}" stroke-width="1.2" d="{SEAM_COLLAR}"/>']
    for d, kind in PIECES[letter]:
        if kind == 'fill':
            parts.append(f'<path fill="{body}" d="{d}"/>')
        elif kind == 'seam':
            parts.append(f'<path stroke="{accent}" stroke-width="1.2" d="{d}"/>')
        elif kind == 'slit':
            parts.append(f'<path stroke="{accent}" stroke-width="1.5" d="{d}"/>')
        elif kind == 'line':
            parts.append(f'<path stroke="{accent}" stroke-width="1.1" d="{d}"/>')
        elif kind == 'dot':
            parts.append(f'<path fill="{accent}" stroke="{accent}" stroke-width="0.5" d="{d}"/>')
        elif kind == 'balls':
            parts += [f'<circle fill="{body}" cx="{x}" cy="{y}" r="2.1"/>' for x, y in BALLS]
        elif kind == 'ball1':
            parts.append(f'<circle fill="{body}" cx="22.5" cy="6.6" r="2.1"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 45 45">'
            '<g fill="none" fill-rule="evenodd" stroke="#000" stroke-linecap="round" '
            'stroke-linejoin="round" stroke-width="1.5">' + ''.join(parts) + '</g></svg>')


os.makedirs(OUT, exist_ok=True)
for letter in 'KQRBNP':
    for black in (False, True):
        with open(os.path.join(OUT, ('b' if black else 'w') + letter + '.svg'), 'w',
                  encoding='utf-8') as fh:
            fh.write(render(letter, black))
print('wrote', OUT)
