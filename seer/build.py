#!/usr/bin/env python3
"""Build the Flash Seer into dist/: index.html (the site, a whole document) and artifact.html (the claude.ai page),
each with its data and scripts inlined, the Celtic cards in dist/cards
and the knotwork in dist/img."""
import json, shutil
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC, DIST = HERE / "src", HERE / "dist"
ASOF = "14 November 2026"   # the date of the hub catalogue in src/data/firmwares.json


SKELETON = """<!doctype html>
<html lang="en-GB">
<head>
<meta charset="utf-8">
<link rel="icon" href="img/corner.webp">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="A fortune cabinet for the FM-1: the seer asks a few strange questions, then deals a synth tarot card or a three-card Celtic reading naming the firmware you should flash.">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
__PAGE__
</body>
</html>
"""


def inline_json(path):
    return (SRC / "data" / path).read_text().replace("</", "<\\/")


def main():
    page = (SRC / "page.html").read_text()
    page = (page.replace("__FW__", inline_json("firmwares.json"))
                .replace("${BULBS}", "")
                .replace("__SIDHE__", inline_json("sidhe-majors.json"))
                .replace("__VOLTAGE__", (SRC / "voltage.js").read_text())
                .replace("__APP__", (SRC / "app.js").read_text())
                .replace("__ASOF__", ASOF))
    if DIST.exists():
        shutil.rmtree(DIST)
    shutil.copytree(HERE / "assets", DIST)
    # the claude.ai artifact takes the page as written (it adds its own document head); the site gets a whole document
    (DIST / "artifact.html").write_text(page)
    (DIST / "index.html").write_text(SKELETON.replace("__PAGE__", page))
    print(f"dist/index.html {len(page)} B, {sum(1 for _ in DIST.rglob('*'))} entries")


if __name__ == "__main__":
    main()
