#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""AISLING's card for The Firmware Hub (fmhub.json's image): a gold 8-bit Irish harp on green. The shapes in a
24-cell grid, each cell decided at its centre, set in a 30-cell square (a margin of three), then x8: 240 x 240,
the hub's best size.

  tools/make_card.py docs/card.png      (needs Pillow: the .venv)"""
import math, sys
from PIL import Image

N, Z, M = 24, 8, 3
BG, SHADOW, OUTL = (22, 120, 72), (14, 84, 50), (64, 38, 6)
GOLD, DARK, LIGHT, STR = (232, 176, 52), (176, 118, 26), (255, 226, 120), (250, 214, 130)

def bez(p, t):
    if len(p) == 3:
        a, b, c = p
        return tuple((1 - t) ** 2 * a[i] + 2 * (1 - t) * t * b[i] + t * t * c[i] for i in (0, 1))
    a, b, c, d = p
    return tuple((1 - t) ** 3 * a[i] + 3 * (1 - t) ** 2 * t * b[i] + 3 * (1 - t) * t * t * c[i] + t ** 3 * d[i] for i in (0, 1))

def near_curve(p, x, y, w):
    return min(math.hypot(x - q[0], y - q[1]) for q in (bez(p, i / 200) for i in range(201))) <= w

def in_poly(poly, x, y):
    inside = False
    for (x0, y0), (x1, y1) in zip(poly, poly[1:] + poly[:1]):
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            inside = not inside
    return inside

BOX = [(5.6, 19.6), (8.6, 21.4), (20.6, 5.4), (18.0, 3.4)]           # the soundbox, bottom to the neck
PILLAR = [(6.5, 20.0), (1.4, 12.0), (4.6, 3.2)]                       # the forepillar, bowed out
NECK = [(4.6, 3.0), (9.0, 0.6), (12.0, 8.4), (18.6, 4.2)]             # the neck: the harmonic curve
grid = [[None] * N for _ in range(N)]
for gy in range(N):
    for gx in range(N):
        x, y = gx + 0.5, gy + 0.5
        if in_poly(BOX, x, y):
            grid[gy][gx] = "box"
        elif near_curve(PILLAR, x, y, 1.05) or near_curve(NECK, x, y, 1.0):
            grid[gy][gx] = "frame"
        elif 3.2 <= x <= 5.8 and 1.0 <= y <= 3.0:
            grid[gy][gx] = "frame"                                      # the finial at the pillar's head
        elif 4.0 <= x <= 9.8 and 20.4 <= y <= 22.4:
            grid[gy][gx] = "frame"                                      # the foot
# the strings: every other column, down from the neck to the soundbox
for gx in range(7, 18, 2):
    col = [grid[gy][gx] for gy in range(N)]
    top = next((gy for gy in range(N) if col[gy] == "frame"), None)
    bot = next((gy for gy in range(N) if col[gy] == "box"), None)
    if top is None or bot is None:
        continue
    while top + 1 < N and grid[top + 1][gx] == "frame":
        top += 1
    for gy in range(top + 1, bot):
        if grid[gy][gx] is None:
            grid[gy][gx] = "string"

def solid(gx, gy):
    return 0 <= gx < N and 0 <= gy < N and grid[gy][gx] in ("box", "frame")

img = Image.new("RGB", (N, N), BG)
px = img.load()
for gy in range(N):                                                    # a drop shadow, down and right
    for gx in range(N):
        if grid[gy][gx] is None and 0 <= gx - 1 and 0 <= gy - 1 and grid[gy - 1][gx - 1] in ("box", "frame", "string"):
            px[gx, gy] = SHADOW
for gy in range(N):
    for gx in range(N):
        k = grid[gy][gx]
        if k == "string":
            px[gx, gy] = STR
        elif k in ("box", "frame"):
            edge = not all(solid(gx + dx, gy + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge and (not solid(gx - 1, gy) or not solid(gx, gy - 1)):
                px[gx, gy] = LIGHT                                     # lit from the top left
            elif edge:
                px[gx, gy] = DARK
            else:
                px[gx, gy] = GOLD if k == "frame" else DARK if (gx + gy) % 2 else GOLD   # the box dithered
        elif any(solid(gx + dx, gy + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) and px[gx, gy] == BG:
            px[gx, gy] = OUTL
out = Image.new("RGB", (N + 2 * M, N + 2 * M), BG)
out.paste(img, (M, M))
out.resize(((N + 2 * M) * Z, (N + 2 * M) * Z), Image.NEAREST).save(sys.argv[1], optimize=True)
