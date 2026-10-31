#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Make the AISLING site for GitHub Pages (https://stephencummins.github.io/fm1-aisling/), as NACHTFAHRT's is made:

  index.html                  what AISLING is, and the ways in: try, install, manual, cheat sheet, download, source
  img/                        screenshots (docs/img) and the card (docs/card.png, tools/make_card.py)
  emu/                        AISLING in the browser (build/emu, from web/emu/build.sh)
  words/                      the screen reader's words files (web/words, from firmware/words.tsv)
  install/index.html          the web installer (web/amb_installer.html, with fm1pkg.js, fm1ota.js and
                              the package's metadata inlined; Chrome or Edge, Web MIDI)
  manual/index.html, img/     the manual (tools/manual_html.py, from docs/MANUAL.md)
  cheat/index.html            the cheat sheet: the README's "In short" and pieces tables on one page, to print
  firmware/aisling-VERSION.fwsc   the package the installer writes; also the download

  tools/make_pages.py build/aisling-0.1.fwsc 0.1 OUT_DIR

The package must be a release build (tools/mini_build.sh --release X.Y): its identity, FM-1_353XXYYZZ, is
what the installer checks the download against and what the FM-1 reports after the install."""
import html
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

SRC = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SRC / "web"))
from make_site import product_of, strip_module  # noqa: E402  (Felucca's: the package format)

REPO = "https://github.com/stephencummins/fm1-aisling"
BY = 'by CU_STE · <a href="https://www.stephen8n.com">www.stephen8n.com</a>'

LANDING = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AISLING · Irish ambient for the FM-1</title>
<meta name="description" content="A generative Irish ambient instrument for the M-VAVE FM-1: harps and a flute over a held drone, in the old modes, with the weather of the west coast behind them. Let it play for hours, or play the flute with it on the keys.">
<meta name="theme-color" content="#f3ead7">
<style>
/* AISLING's colours: vellum, a dark iron-gall ink, the triskele's green (darkened to read on the vellum) for the accent,
   the layers' colours for the list. Text reads at 4.5:1 or more on the ground and the cards, the markers at 3:1 */
:root { --ground: #f3ead7; --card: #fbf6eb; --ink: #2b2219; --muted: #66594a; --rule: #d9ccb1; --acc: #146c41;
        --drone: #6a44b3; --seq: #b02f7c; --lead: #9a6400; --seq2: #1d6a94; --atmos: #7a6a54; color-scheme: light; }
body { background: var(--ground); color: var(--ink); margin: 0; padding-inline: 16px; padding-block: 0 64px;
       font: 400 17px/1.6 "Helvetica Neue", Helvetica, Arial, sans-serif; }
header { max-width: 42rem; margin: 0 auto; padding-top: 32px; display: flex; gap: 20px; align-items: center; }
.card { width: 120px; height: 120px; image-rendering: pixelated; border-radius: 6px; flex: none; }
main { max-width: 42rem; margin: 0 auto; }
h1 { font-size: 2.6rem; font-weight: 600; letter-spacing: .12em; margin: 0 0 .2rem; }
.sub { text-transform: uppercase; letter-spacing: .1em; font-size: .9rem; color: var(--acc); margin: 0 0 1.2rem;
       padding-bottom: .8rem; border-bottom: 1px solid var(--rule); }
h2 { font-size: 1.05rem; font-weight: 400; text-transform: uppercase; letter-spacing: .08em; margin: 2.4rem 0 .6rem;
     padding-top: .6rem; border-top: 1px solid var(--rule); color: var(--acc); }
.lede { font-size: 1.15rem; margin: 0 0 1.6rem; }
.shots { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin: 0 0 1.8rem; }
.shots img { width: 100%; height: auto; image-rendering: pixelated; border: 1px solid var(--rule); border-radius: 6px; }
.ways { display: grid; gap: 10px; margin: 0 0 1rem; }
.ways a { display: block; text-decoration: none; color: var(--ink); background: var(--card); border: 1px solid var(--rule);
          border-radius: 6px; padding: 12px 16px; }
.ways a:first-child { border-color: var(--acc); }
.ways a:hover, .ways a:focus-visible { border-color: var(--acc); }
a:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }
.ways strong { font-weight: 400; font-size: 1.1rem; text-transform: uppercase; letter-spacing: .06em; display: block; }
.ways span { color: var(--muted); font-size: .95rem; }
.ways em.v { font-style: normal; text-transform: none; letter-spacing: 0; }
ul.layers { padding-left: 1.2rem; margin: 0 0 1rem; }
ul.layers li { margin: 0 0 .45rem; }
ul.layers li.d::marker { color: var(--drone); } ul.layers li.s::marker { color: var(--seq); }
ul.layers li.l::marker { color: var(--lead); } ul.layers li.t::marker { color: var(--seq2); }
ul.layers li.a::marker { color: var(--atmos); }
p.small { color: var(--muted); font-size: .9rem; }
a { color: var(--ink); text-decoration-color: var(--acc); text-decoration-thickness: 2px; text-underline-offset: 3px; }
code { font-size: .9em; }
</style>
</head>
<body>
<header>
<img class="card" src="img/card.png" width="240" height="240" alt="A gold 8-bit harp on green">
<div>
<h1>AISLING</h1>
<p class="sub">Irish ambient for the M-VAVE FM-1 · __BY__</p>
</div>
</header>
<main>
<p class="lede">A generative instrument after the harpers and the west of Ireland. A harp's ostinato runs over a held
drone, often in a jig's threes; a second harp drifts against it, an octave down; a flute plays long phrases far back in
the reverb, with surf, wind or rain behind. Let it play for hours, or play with it: the white keys give you the flute,
always in the piece's scale, and it answers you.</p>
<div class="shots">
  <img src="img/screen-launch.png" width="240" height="240" alt="The launch screen: a green triskele, AISLING, by CU_STE, www.stephen8n.com">
  <img src="img/screen-main.png" width="240" height="240" alt="The main screen: the chord's name among orbiting dots, the five layers' meters, the two harps' lanes">
  <img src="img/screen-perform.png" width="240" height="240" alt="PERFORM: Filter, Wet, Energy and Sweep on the knobs">
</div>
<nav class="ways" aria-label="Get AISLING">
  <a href="install/"><strong>Install <em class="v">v__VERSION__</em></strong><span>From Chrome or Edge (also Chrome on Android), with the FM-1 connected by USB. Nothing to install.</span></a>
  <a href="emu/"><strong>Try it in the browser</strong><span>The same code the FM-1 runs, with sound. Mouse, touch or keyboard; no FM-1 needed.</span></a>
  <a href="https://aisling.stephen8n.com"><strong>Visualiser</strong><span>The FM-1 paints an Irish landscape from its MIDI, in Chrome or Edge. Nothing leaves your computer.</span></a>
  <a href="manual/"><strong>Manual</strong><span>Getting started in a few minutes, then everything else.</span></a>
  <a href="cheat/"><strong>Cheat sheet</strong><span>Every control and the eight pieces on one page, to print.</span></a>
  <a href="firmware/__PKG__"><strong>Download <em class="v">__PKG__</em></strong><span>For the command-line installer: <code>python3 tools/fm1_install.py __PKG__</code></span></a>
  <a href="__REPO__"><strong>Source</strong><span>GitHub, GPL-3.0. A fork of NACHTFAHRT, by way of DUB-1 and AMB-1.</span></a>
</nav>

<h2>Listen, and play</h2>
<p>AISLING plays itself from the moment it is switched on, and it never ends: each piece opens from the drone,
flows, gives the flute its turn, crosses a bridge and starts its long rise again. You are invited in. The <b>white
keys</b> play the flute in the piece's scale, so every note fits; play a phrase and it becomes the flute's theme. The
<b>black keys</b> are effects while held: Ceo (fog), Macalla (an echo), Fras (a burst of rain), Rise and Close sweep
every filter, Transpose lifts the harps, and more. SELECT turns the level of the layer you are looking at; PERFORM (SEL)
mutes and solos the layers and pushes Filter, Wet and Energy.</p>

<h2>What it plays</h2>
<ul class="layers">
  <li class="d"><b>Drone.</b> Organ, strings, a reed drone, glass or a choir whose vowel moves, with the root an octave below; its chords swing slowly between two tonics, as the old tunes do.</li>
  <li class="s"><b>Sequence.</b> The harp: a wire-strung harp's ostinato, often twelve notes in a jig's threes, repeated by the echo, its filter wandering.</li>
  <li class="t"><b>Sequence 2.</b> A second harp, a step shorter and often an octave down, so the two drift apart and meet again.</li>
  <li class="l"><b>Lead.</b> The flute, far back in the reverb, phrasing in calls and answers; or your own melody on the keys.</li>
  <li class="a"><b>Atmosphere.</b> Surf, wind, rain or a turf fire's crackle, where a piece wants it.</li>
</ul>
<p>Eight pieces: Skellig, Burren, Aran, Carolan, Blasket, Samhain, Connemara and Tir na nOg, in the old modes and the
pipes' keys, each remembering how you left it. Every layer has its sound pages and a Move page, where its filter wanders
relative to the knob you set.</p>
<p class="small">To go back to the official firmware, use M-VAVE's updater, M-UPGRADE, from
<a href="https://www.m-vave.com/download">m-vave.com/download</a>.
AISLING is by CU_STE (<a href="https://www.stephen8n.com">www.stephen8n.com</a>). It is a fork of
<a href="https://github.com/FartyPants/fm1-nachtfahrt">NACHTFAHRT</a> by FartyPants, based on
<a href="https://github.com/sbegueria/fm1-dub">DUB-1</a> by sbegueria, itself based on
<a href="https://github.com/charlesvestal/fm1-amb">AMB-1</a> by Charles Vestal; its granular cloud follows JIANT's;
the platform is Felucca by Leo Kuroshita (Hügelton Instruments). GPL-3.0.
M-VAVE and FM-1 are trademarks of their owners. AISLING is not affiliated with M-VAVE, Hügelton Instruments or
NACHTFAHRT's author.</p>
</main>
</body>
</html>
"""

CHEAT = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AISLING cheat sheet</title>
<meta name="description" content="AISLING's controls and its eight pieces on one page.">
<meta name="theme-color" content="#f3ead7">
<style>
/* the landing page's colours on screen; black on white to print, small enough for one sheet */
:root { --ground: #f3ead7; --card: #fbf6eb; --ink: #2b2219; --muted: #66594a; --rule: #d9ccb1; --acc: #146c41; color-scheme: light; }
body { background: var(--ground); color: var(--ink); margin: 0; padding: 24px 16px 48px;
       font: 400 15px/1.45 "Helvetica Neue", Helvetica, Arial, sans-serif; }
main { max-width: 60rem; margin: 0 auto; }
h1 { font-size: 1.6rem; font-weight: 600; letter-spacing: .12em; margin: 0; }
p.sub { color: var(--acc); text-transform: uppercase; letter-spacing: .08em; font-size: .8rem; margin: .2rem 0 1.2rem; }
h2 { font-size: .95rem; font-weight: 400; text-transform: uppercase; letter-spacing: .08em; color: var(--acc);
     margin: 1.6rem 0 .4rem; }
.wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; vertical-align: top; padding: 5px 8px; border-top: 1px solid var(--rule); }
th { font-weight: 400; color: var(--muted); }
td:first-child { white-space: nowrap; font-weight: 600; }
a { color: var(--ink); text-decoration-color: var(--acc); text-underline-offset: 3px; }
nav { font-size: .9rem; margin-top: 1.6rem; color: var(--muted); }
@media print {
  :root { --ground: #fff; --ink: #000; --muted: #444; --rule: #bbb; --acc: #1a7a44; color-scheme: light; }
  body { font-size: 8pt; line-height: 1.3; padding: 0; }
  p.sub { margin-bottom: .6rem; }
  h2 { margin: .9rem 0 .2rem; }
  th, td { padding: 3px 6px; }
  tr { break-inside: avoid; }
  nav { display: none; }
  @page { margin: 10mm; }
}
</style>
</head>
<body>
<main>
<h1>AISLING</h1>
<p class="sub">Cheat sheet · v__VERSION__ · __BY__</p>
<h2>The controls</h2>
<div class="wrap">__CONTROLS__</div>
<h2>The pieces</h2>
<div class="wrap">__PIECES__</div>
<nav><a href="../">AISLING</a> · <a href="../manual/">Manual</a> · <a href="../emu/">Try it in the browser</a> ·
<a href="../install/">Install</a></nav>
</main>
</body>
</html>
"""


def md_table(section):
    """The first table under the README's "## SECTION", as HTML (the cells' **bold** and *italics* kept)."""
    lines = (SRC / "README.md").read_text(encoding="utf-8").splitlines()
    i = lines.index("## " + section)
    rows = []
    for line in lines[i + 1:]:
        if line.startswith("|"):
            rows.append([c.strip() for c in line.strip().strip("|").split("|")])
        elif rows:
            break
    if len(rows) < 3:
        raise SystemExit(f"README.md: no table under ## {section}")

    def cell(c):
        c = html.escape(c, quote=False)
        return re.sub(r"\*([^*]+)\*", r"<i>\1</i>", re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", c))
    head = "".join(f"<th scope=\"col\">{cell(c)}</th>" for c in rows[0])
    body = "".join("<tr>" + "".join(f"<td>{cell(c)}</td>" for c in r) + "</tr>\n" for r in rows[2:])
    return f"<table>\n<thead><tr>{head}</tr></thead>\n<tbody>\n{body}</tbody>\n</table>"


def cheat_sheet(version):
    return (CHEAT.replace("__VERSION__", html.escape(version)).replace("__BY__", BY)
            .replace("__CONTROLS__", md_table("In short")).replace("__PIECES__", md_table("The pieces")))


def main(pkg, version, out):
    pkg, out = Path(pkg), Path(out)
    raw = pkg.read_bytes()
    product = product_of(raw)
    if not re.fullmatch(r"FM-1_353\d{6}", product):
        raise SystemExit(f"{pkg}: identity {product!r}: make a release build (tools/mini_build.sh --release X.Y)")
    if b"FELUCCA-LOADER-1" not in raw:
        raise SystemExit(f"{pkg}: no update loader in it")
    name = f"aisling-{re.sub(r'[^A-Za-z0-9.-]', '-', version)}.fwsc"
    if out.exists():
        shutil.rmtree(out)
    for d in ("install", "manual", "cheat", "firmware"):
        (out / d).mkdir(parents=True)
    shutil.copy(pkg, out / "firmware" / name)
    # the installer
    page = (SRC / "web" / "amb_installer.html").read_text(encoding="utf-8")
    lib = strip_module((SRC / "web" / "fm1pkg.js").read_text(encoding="utf-8")) + "\n" + \
        strip_module((SRC / "web" / "fm1ota.js").read_text(encoding="utf-8"))
    meta = json.dumps({"version": version, "product": product, "pkg": "../firmware/" + name})
    for mark in ("/*LIB*/", "/*META*/"):
        if page.count(mark) != 1:
            raise SystemExit(f"amb_installer.html must contain {mark} once")
    (out / "install" / "index.html").write_text(page.replace("/*LIB*/", lib).replace("/*META*/", meta), encoding="utf-8")
    # the manual (a complete page; its images beside it)
    subprocess.run([sys.executable, str(SRC / "tools" / "manual_html.py"), str(SRC / "docs" / "MANUAL.md"),
                    str(out / "manual" / "index.html")], check=True, capture_output=True)
    shutil.copytree(SRC / "docs" / "img", out / "manual" / "img")
    # the landing page and its screenshots
    shutil.copytree(SRC / "docs" / "img", out / "img")
    shutil.copy(SRC / "docs" / "card.png", out / "img" / "card.png")
    (out / "index.html").write_text(LANDING.replace("__VERSION__", html.escape(version)).replace("__PKG__", name)
                                    .replace("__REPO__", REPO).replace("__BY__", BY), encoding="utf-8")
    # the cheat sheet
    (out / "cheat" / "index.html").write_text(cheat_sheet(version), encoding="utf-8")
    emu = SRC / "build" / "emu"
    if not (emu / "amb.wasm").exists():
        raise SystemExit("no build/emu/amb.wasm: run web/emu/build.sh (needs Emscripten)")
    shutil.copytree(emu, out / "emu")
    # the screen reader's words files (fm1-reader): every one ever made, for the devices that point at them
    shutil.copytree(SRC / "web" / "words", out / "words")
    (out / ".nojekyll").write_text("")
    print(f"site: {out}: index.html, install/ ({product}), manual/, cheat/, emu/, words/, firmware/{name} ({len(raw)} B)")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
