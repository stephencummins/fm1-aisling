#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""AISLING's harp at the sizes a site needs, from the card (docs/card.png, tools/make_card.py), and written into
web/brand/ beside the fonts:

  favicon.svg            a harp redrawn on 16 cells: the card's 30 turn to mush in a tab, and at 16 px (or 32, on a
                         sharper screen) each of these cells lands on whole pixels
  favicon-32.png         the same, for a browser without SVG icons
  apple-touch-icon.png   the card's own 30 cells, x6
  mark.png               the card's own 30 cells, x1: the bar shows it at 30 px, so a cell is a whole CSS pixel

It also sets the two copies inside web/visualiser/index.html, a page that fetches nothing: its tab's icon and the harp
beside its title.

  tools/make_brand.py      (needs Pillow: the .venv)"""
import base64, io, re, urllib.parse
from pathlib import Path
from PIL import Image

SRC = Path(__file__).resolve().parents[1]
OUT = SRC / "web" / "brand"
CARD_CELLS = 30
COLOUR = {".": "#167848", "#": "#e8b034", "*": "#ffe278", "%": "#b0761a", "|": "#fad682"}   # the card's own
HARP16 = """
................
..##............
..#*##......*#..
.##.%*##...*##%.
.#*.|.|%*###*#..
.#..|.|.|.*#%...
.#..|.|.|*#%....
.#..|.|.*#%.....
.#*.|.|*#%......
..#.|.*#%.......
..#.|*#%........
..#.*#%.........
..#*#%..........
..*#%...........
.*###%..........
................
""".split()


def svg():
    """Each colour one path of unit-high runs, so the file stays small enough to go inline in the visualiser."""
    runs = {}
    for y, row in enumerate(HARP16):
        for m in re.finditer(r"(.)\1*", row):
            if m.group(1) != ".":
                runs.setdefault(m.group(1), []).append(f"M{m.start()} {y}h{m.end() - m.start()}v1H{m.start()}z")
    paths = "".join(f"<path fill='{COLOUR[c]}' d='{''.join(d)}'/>" for c, d in runs.items())
    return (f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'>"
            f"<rect width='16' height='16' fill='{COLOUR['.']}'/>{paths}</svg>")


def png(im):
    b = io.BytesIO()
    im.save(b, "PNG", optimize=True)
    return b.getvalue()


def main():
    if {len(r) for r in HARP16} != {16} or len(HARP16) != 16:
        raise SystemExit("HARP16 must be 16 x 16")
    s = svg()
    (OUT / "favicon.svg").write_text(s + "\n", encoding="utf-8")
    t = Image.new("RGB", (16, 16))
    for y, row in enumerate(HARP16):
        for x, c in enumerate(row):
            t.putpixel((x, y), tuple(int(COLOUR[c][i:i + 2], 16) for i in (1, 3, 5)))
    (OUT / "favicon-32.png").write_bytes(png(t.resize((32, 32), Image.NEAREST)))
    card = Image.open(SRC / "docs" / "card.png").convert("RGB").resize((CARD_CELLS, CARD_CELLS), Image.NEAREST)
    (OUT / "apple-touch-icon.png").write_bytes(png(card.resize((180, 180), Image.NEAREST)))
    mark = png(card)
    (OUT / "mark.png").write_bytes(mark)
    # the visualiser's own copies, each between marks that stay
    vis = SRC / "web" / "visualiser" / "index.html"
    page = vis.read_text(encoding="utf-8")
    icon = '<link rel="icon" href="data:image/svg+xml,' + urllib.parse.quote(s, safe="=:/' ") + '">'
    img = ('<img class="mark" src="data:image/png;base64,' + base64.b64encode(mark).decode() +
           '" width="30" height="30" alt="">')
    page, n = re.subn(r'<link rel="icon" href="data:image/svg\+xml,[^"]*">', lambda _: icon, page)
    page, m = re.subn(r'<img class="mark" src="data:image/png;base64,[^"]*" width="30" height="30" alt="">',
                      lambda _: img, page)
    if n != 1 or m != 1:
        raise SystemExit(f"web/visualiser/index.html: found {n} icon(s) and {m} harp(s), not one of each")
    vis.write_text(page, encoding="utf-8")
    print("web/brand: favicon.svg", len(s), "B, mark.png", len(mark), "B; the visualiser's icon and harp set")


if __name__ == "__main__":
    main()
