#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""Make the AISLING site, as NACHTFAHRT's is made. Its home is https://aisling.stephen8n.com/ (Cloudflare Pages); the same
files go to GitHub Pages too (https://stephencummins.github.io/fm1-aisling/), where the links already out there point
(tools/publish_pages.sh). Its links between pages are relative, and every page names the home as its canonical address.

  favicon.svg, favicon-32.png, apple-touch-icon.png, mark.png, site.css, wall.js, fonts/
                              the harp, the bar, the look and the fonts every page shares (web/brand, tools/site_brand.py)
  _headers, _redirects        Cloudflare's (web/brand); GitHub Pages serves them as two stray files
  visualiser/                 the visualiser (web/visualiser)
  index.html                  what AISLING is, and the ways in: install, try, the visualiser; then the help (manual,
                              cheat sheet, troubleshooting), the download and the source
  img/                        screenshots (docs/img), the card (docs/card.png, tools/make_card.py) and the
                              visualiser's painting (web/visualiser/share.jpg, also the page's preview image)
  emu/                        AISLING in the browser (build/emu, from web/emu/build.sh), with its screen reader's
                              words and voice in emu/reader/ (fm1-reader, at the commit web/emu/reader.pin names)
  editor/                     the editor (web/editor/index.html; its code from build/editor, web/editor/build.sh)
  words/                      the screen reader's words files (web/words, from firmware/words.tsv)
  install/index.html          the web installer (web/amb_installer.html, with fm1pkg.js, fm1ota.js and
                              the package's metadata inlined; Chrome or Edge, Web MIDI)
  manual/index.html, img/     the manual (tools/manual_html.py, from docs/MANUAL.md)
  cheat/index.html            the cheat sheet: the README's "In short" and pieces tables on one page, to print, and
                              the flows, four drawings of the steps (web/cheat/), a printed page each
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
sys.path.insert(0, str(SRC / "tools"))
from site_brand import NAV, SITE, stamp  # noqa: E402
from make_site import product_of, strip_module  # noqa: E402  (Felucca's: the package format)

REPO = "https://github.com/stephencummins/fm1-aisling"
BY = 'by CU_STE · <a href="https://www.stephen8n.com">www.stephen8n.com</a>'

LANDING = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script>{ const q = new URLSearchParams(location.search); if (['embed', 'clean', 'scene', 'ground', 'palette', 'demo'].some((k) => q.has(k))) location.replace('visualiser/' + location.search + location.hash) }</script>
<title>AISLING · Irish ambient for the FM-1</title>
<meta name="description" content="A generative Irish ambient instrument for the M-VAVE FM-1: harps and a flute over a held drone, in the old modes, with the weather of the west coast behind them. Let it play for hours, or play the flute with it on the keys.">
<meta property="og:title" content="AISLING · Irish ambient for the FM-1">
<meta property="og:description" content="A generative Irish ambient instrument for the M-VAVE FM-1. Install it from the browser, try it without one, and watch it paint an Irish landscape.">
<meta property="og:url" content="__SITE__">
<meta property="og:image" content="__SITE__img/visualiser.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<style>
/* The landing page's own: what it is beside the screens, the ways in as a hairline grid, the layers' colours on the list
   (3:1 or more on the vellum). The rest is the site's (web/brand/site.css) */
:root { --drone: #6a44b3; --seq: #b02f7c; --lead: #9a6400; --seq2: #1d6a94; --atmos: #7a6a54; }
.what { display: flex; gap: 16px; align-items: flex-start; }
.card { flex: none; width: 96px; height: 96px; image-rendering: pixelated; border: 1px solid var(--brand-rule); }
.lede { margin: 0; font-size: 14.5px; }
.shots { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; align-content: start; }
.shots img { display: block; box-sizing: border-box; width: 100%; height: auto; image-rendering: pixelated; border: 1px solid var(--brand-rule); }
.ways { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--brand-rule); }
.ways a { display: block; padding: 12px 16px 14px; background: var(--brand-ground); color: var(--brand-ink); text-decoration: none; }
.ways a:hover { background: var(--brand-strip); color: var(--brand-ink); }
.ways a:focus-visible { outline-offset: -3px; }
.ways strong { display: block; margin-bottom: 4px; font: 600 16px/1.3 var(--brand-display); letter-spacing: .02em; }
.ways span { display: block; font-size: 12.5px; color: var(--brand-muted); }
.ways em.v { font-style: normal; }
.ways a.go, .ways a.go span { background: var(--brand-green); color: var(--brand-ground); }
.ways a.go:hover, .ways a.go:hover span { background: #0f5332; }
.ways a.go:focus-visible { outline-color: var(--brand-ground); }
/* the visualiser's way in shows a strip of its painting */
.ways a.pic img { display: block; width: 100%; height: auto; aspect-ratio: 3 / 1; object-fit: cover; margin: 2px 0 10px; }
.block .bh { padding: 12px 16px 0; margin: 0 0 10px; }
.block .ways { border-top: 1px solid var(--brand-rule); }
.pane p { margin: 0 0 10px; }
.pane p:last-child { margin-bottom: 0; }
ul.new { list-style: square; padding-left: 1.2rem; margin: 0; columns: 2; column-gap: 32px; }
ul.new li { margin: 0 0 6px; break-inside: avoid; }
ul.new li::marker { color: var(--brand-green); }
ul.new b { font-weight: 400; color: var(--brand-green); }
ul.layers { list-style: square; padding-left: 1.2rem; margin: 0 0 10px; }
ul.layers li { margin: 0 0 10px; }
ul.layers li.d::marker { color: var(--drone); } ul.layers li.s::marker { color: var(--seq); }
ul.layers li.l::marker { color: var(--lead); } ul.layers li.t::marker { color: var(--seq2); }
ul.layers li.a::marker { color: var(--atmos); }
p.small { color: var(--brand-muted); font-size: 12.5px; }
.pane p b { font-weight: 400; color: var(--brand-green); }
@media (max-width: 59.99rem) {
  .two.hero { grid-template-columns: minmax(0, 1fr); }
  .two.hero > * + * { border-left: 0; border-top: 1px solid var(--brand-rule); }
}
@media (max-width: 47.99rem) { .ways { grid-template-columns: minmax(0, 1fr); } ul.new { columns: 1; } }
@media (min-width: 30rem) and (max-width: 47.99rem) { .ways.help { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 26rem) { .what { display: block; } .card { float: left; margin: 0 12px 4px 0; width: 72px; height: 72px; } }
</style>
<!--AISLING-HEAD-->
</head>
<body>
<!--AISLING-BAR-->
<main class="bench">
<div class="strip">
<h1 class="lab"><b>aisling</b> · Irish ambient for the M-VAVE FM-1</h1>
<p class="lab">v__VERSION__ · __BY__</p>
</div>
<div class="two hero">
<div class="pane what">
<img class="card" src="img/card.png" width="240" height="240" alt="A gold 8-bit harp on green">
<p class="lede">A generative instrument after the harpers and the west of Ireland. A harp's ostinato runs over a held
drone, often in a jig's threes; a second harp drifts against it, an octave down; a flute plays long phrases far back in
the reverb, with surf, wind or rain behind. Let it play for hours, or play with it: the white keys give you the flute,
always in the piece's scale, and it answers you.</p>
</div>
<div class="pane shots">
  <img src="img/screen-launch.png" width="240" height="240" alt="The launch screen: a green triskele, AISLING, by CU_STE, www.stephen8n.com">
  <img src="img/screen-main.png" width="240" height="240" alt="The main screen: the chord's name among orbiting dots, the five layers' meters, the two harps' lanes">
  <img src="img/screen-perform.png" width="240" height="240" alt="PERFORM: Filter, Wet, Energy and Sweep on the knobs">
</div>
<nav class="ways" aria-label="Get AISLING">
  <a class="go" href="install/"><strong>Install <em class="v">v__VERSION__</em></strong><span>From Chrome or Edge (also Chrome on Android), with the FM-1 connected by USB. Nothing to install.</span></a>
  <a href="emu/"><strong>Try it in the browser</strong><span>The same code the FM-1 runs, with sound. Mouse, touch or keyboard; no FM-1 needed. Slide the visualiser up beneath it to watch what it plays painted.</span></a>
  <a class="pic" href="visualiser/"><img src="img/visualiser.jpg" width="1200" height="630" alt="The visualiser: the FM-1's layers painted in heather and peat colours on vellum"><strong>Visualiser</strong><span>The FM-1 paints an Irish landscape from its MIDI: the flute the sky, the harps the hills and fields, the drone the bog. Drop a sound file on it to mix it in. Chrome or Edge; Demo paints without an FM-1. Nothing leaves your computer.</span></a>
</nav>

<section class="pane" aria-labelledby="newh">
<h2 class="bh" id="newh">New in v__VERSION__</h2>
__NEW__
</section>

<section class="block" aria-labelledby="helph">
<h2 class="bh" id="helph">Help, and the files</h2>
<nav class="ways help" aria-label="Help and the files">
  <a href="manual/"><strong>Manual</strong><span>Getting started in a few minutes, then everything else.</span></a>
  <a href="cheat/"><strong>Cheat sheet</strong><span>Every control and the eight pieces on one page, to print, and the steps drawn as flows.</span></a>
  <a href="manual/#s13"><strong>If it goes wrong</strong><span>Update mode, calibration, safe mode, and bringing back an FM-1 that won't start.</span></a>
  <a href="https://www.m-vave.com/download"><strong>Back to stock</strong><span>M-VAVE's updater, M-UPGRADE, puts the official firmware back.</span></a>
  <a href="firmware/__PKG__"><strong>Download <em class="v">__PKG__</em></strong><span>The package itself, for the command-line installer, <code>tools/fm1_install.py</code>.</span></a>
  <a href="__REPO__"><strong>Source</strong><span>GitHub, GPL-3.0. A fork of NACHTFAHRT, by way of DUB-1 and AMB-1.</span></a>
</nav>
</section>
<div class="two">
<section class="pane">
<h2 class="bh">Listen, and play</h2>
<p>AISLING plays itself from the moment it is switched on, and it never ends: each piece opens from the drone,
flows, gives the flute its turn, crosses a bridge and starts its long rise again. You are invited in. The <b>white
keys</b> play the flute in the piece's scale, so every note fits; play a phrase and it becomes the flute's theme. The
<b>black keys</b> are effects while held: Ceo (fog), Macalla (an echo), Fras (a burst of rain), Rise and Close sweep
every filter, Transpose lifts the harps, and more. SELECT turns the level of the layer you are looking at; PERFORM (SEL)
mutes and solos the layers and pushes Filter, Wet and Energy.</p>
</section>
<section class="pane">
<h2 class="bh">What it plays</h2>
<ul class="layers">
  <li class="d"><b class="lead">Drone.</b> Organ, strings, a reed drone, glass or a choir whose vowel moves, with the root an octave below; its chords swing slowly between two tonics, as the old tunes do.</li>
  <li class="s"><b class="lead">Sequence.</b> The harp: a wire-strung harp's ostinato, often twelve notes in a jig's threes, repeated by the echo, its filter wandering.</li>
  <li class="t"><b class="lead">Sequence 2.</b> A second harp, a step shorter and often an octave down, so the two drift apart and meet again.</li>
  <li class="l"><b class="lead">Lead.</b> The flute, far back in the reverb, phrasing in calls and answers; or your own melody on the keys.</li>
  <li class="a"><b class="lead">Atmosphere.</b> Surf, wind, rain, a turf fire or a curlew, where a piece wants it.</li>
</ul>
<p>Eight pieces: Skellig, Burren, Aran, Carolan, Blasket, Samhain, Connemara and Tir na nOg, in the old modes and the
pipes' keys, each remembering how you left it. Every layer has its sound pages and a Move page, where its filter wanders
relative to the knob you set.</p>
</section>
</div>
<div class="pane">
<p class="small">AISLING is by CU_STE (<a href="https://www.stephen8n.com">www.stephen8n.com</a>). It is a fork of
<a href="https://github.com/FartyPants/fm1-nachtfahrt">NACHTFAHRT</a> by FartyPants, based on
<a href="https://github.com/sbegueria/fm1-dub">DUB-1</a> by sbegueria, itself based on
<a href="https://github.com/charlesvestal/fm1-amb">AMB-1</a> by Charles Vestal; its granular cloud follows JIANT's;
the platform is Felucca by Leo Kuroshita (Hügelton Instruments). GPL-3.0.
M-VAVE and FM-1 are trademarks of their owners. AISLING is not affiliated with M-VAVE, Hügelton Instruments or
NACHTFAHRT's author. Its faces are Barlow Semi Condensed and IBM Plex Mono (SIL OFL 1.1).</p>
</div>
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
<meta name="description" content="AISLING's controls and its eight pieces on one page, and the steps drawn as flows: changing a sound, mute and solo, every button's pages.">
<style>
/* On the site's bench on screen (web/brand/site.css); black on white to print, small enough for one sheet */
.wrap { overflow-x: auto; }
table { border-collapse: collapse; width: 100%; }
th, td { text-align: left; vertical-align: top; padding: 5px 8px 5px 0; border-top: 1px solid var(--brand-rule); }
th { font-weight: 400; font-size: 12.5px; color: var(--brand-muted); border-top: 0; }
td b, td i { font-weight: 400; font-style: normal; color: var(--brand-green); }
td:first-child { white-space: nowrap; }
.jump { line-height: 1.8; }
@media (min-width: 56.25rem) { .jump-hint { display: none; } }
/* The flows: four drawings, each drawn at 1123 by 794 (A4 landscape) and scaled to the bench by the script at the end of the
   page. They stop shrinking while they can still be read, and from there each scrolls sideways in its own box */
.flow { overflow-x: auto; overflow-y: hidden; }
.flow:focus-visible { outline: 2px solid var(--brand-ink); outline-offset: -2px; }
.flow-size { width: calc(1123px * var(--s, 1)); height: calc(794px * var(--s, 1)); }
.flow-board { position: relative; width: 1123px; height: 794px; overflow: hidden; background: #fff; color: #2b2219;
              font: 400 12px/16px var(--brand-mono); transform: scale(var(--s, 1)); transform-origin: 0 0;
              -webkit-print-color-adjust: exact; print-color-adjust: exact; }
__FLOWS_CSS__@media print {
  body.cheat { font-size: 7.5pt; line-height: 1.3; }
  body.cheat .pane { padding: 0; margin-top: .6rem; }
  body.cheat .bench > * + * { border-top: 0; }
  body.cheat .lab, body.cheat .bh { font-size: 7.5pt; }
  body.cheat .bh { margin-bottom: 2px; }
  th { font-size: 7.5pt; }
  th, td { padding: 2px 6px 2px 0; }
  tr { break-inside: avoid; }
  @page { margin: 10mm; }
  /* after the sheet, a landscape page each. (A hair under A4, or each brings a blank page with it) */
  @page flow { size: A4 landscape; margin: 0; }
  body.cheat .jump { display: none; }
  body.cheat .flow { page: flow; break-before: page; overflow: visible; }
  .flow-size { width: auto; height: auto; }
  .flow-board { width: 1122px; height: 793px; transform: none; }
}
</style>
<!--AISLING-HEAD-->
</head>
<body class="cheat">
<!--AISLING-BAR-->
<main class="bench">
<div class="strip">
<h1 class="lab"><b>cheat sheet</b> · AISLING v__VERSION__</h1>
<p class="lab">__BY__</p>
</div>
<nav class="pane lab jump" aria-label="The flows">The steps, drawn: <a href="#flow-lead">change the Lead's instrument</a> · <a href="#flow-layers">any layer's sound</a> · <a href="#flow-perform">mute, solo, push</a> · <a href="#flow-pages">every button's pages</a><span class="jump-hint"> (on a small screen, scroll each one sideways)</span></nav>
<section class="pane">
<h2 class="bh">The controls</h2>
<div class="wrap">__CONTROLS__</div>
</section>
<section class="pane">
<h2 class="bh">The pieces</h2>
<div class="wrap">__PIECES__</div>
</section>
__FLOWS__
</main>
<script>
// each flow to the bench's width, as far down as it can still be read
(function () {
  var flows = document.querySelectorAll(".flow");
  function fit() {
    flows.forEach(function (f) { f.style.setProperty("--s", Math.max(f.clientWidth / 1123, 0.8)); });
  }
  fit();
  addEventListener("resize", fit);
}());
</script>
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


def whats_new(version):
    """The landing page's list: the bullets under the README's "## What's new in VERSION", so it's written once. Stops if
    this version has none, or a release would go out with the last one's news."""
    lines = (SRC / "README.md").read_text(encoding="utf-8").splitlines()
    head = "## What's new in " + version
    if head not in lines:
        raise SystemExit(f"README.md: no {head}")
    items = []
    for line in lines[lines.index(head) + 1:]:
        if line.startswith("## "):
            break
        if line.startswith("- "):
            items.append(line[2:])
        elif items and line.strip():
            items[-1] += " " + line.strip()
    if not items:
        raise SystemExit(f"README.md: nothing under {head}")

    def item(t):
        t = html.escape(t, quote=False)
        t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: f'<a href="{m.group(2).removeprefix(SITE)}">{m.group(1)}</a>', t)
        return re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    return '<ul class="new">\n' + "".join(f"  <li>{item(t)}</li>\n" for t in items) + "</ul>"


def flows():
    """The cheat sheet's flows: the drawings. Their screens are docs/img/flow-*.png (tests/listen/flowshots.amb)."""
    page = (SRC / "web" / "cheat" / "flows.html").read_text(encoding="utf-8")
    for name in re.findall(r'src="\.\./img/([^"]+)"', page):
        if not (SRC / "docs" / "img" / name).is_file():
            raise SystemExit(f"web/cheat/flows.html: no docs/img/{name}")
    return page


def cheat_sheet(version):
    return (CHEAT.replace("__VERSION__", html.escape(version)).replace("__BY__", BY)
            .replace("__CONTROLS__", md_table("In short")).replace("__PIECES__", md_table("The pieces"))
            .replace("__FLOWS_CSS__", (SRC / "web" / "cheat" / "flows.css").read_text(encoding="utf-8"))
            .replace("__FLOWS__", flows()))


def check_visualiser_bar():
    """The visualiser carries its own copy of the bar, because it fetches nothing. Stop if it no longer says what NAV says
    (a new page in NAV, say): it would be published with one page missing."""
    page = (SRC / "web" / "visualiser" / "index.html").read_text(encoding="utf-8")
    nav = re.search(r'<nav class="sitebar-nav".*?</nav>', page, re.S)
    found = re.findall(r'href="([^"]+)"[^>]*>([^<]+)</a>', nav.group(0)) if nav else []
    want = [(href if href.startswith("https:") else SITE + href, label) for _, label, href, _ in NAV]
    if found != want:
        raise SystemExit(f"web/visualiser/index.html: its bar differs from NAV in tools/site_brand.py:\n  {found}\n  {want}")


def main(pkg, version, out):
    check_visualiser_bar()
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
    (out / "install" / "index.html").write_text(stamp(page.replace("/*LIB*/", lib).replace("/*META*/", meta), "../", "install"),
                                                encoding="utf-8")
    # the manual (a complete page; its images beside it)
    subprocess.run([sys.executable, str(SRC / "tools" / "manual_html.py"), str(SRC / "docs" / "MANUAL.md"),
                    str(out / "manual" / "index.html")], check=True, capture_output=True)
    shutil.copytree(SRC / "docs" / "img", out / "manual" / "img")
    # the landing page and its screenshots
    shutil.copytree(SRC / "docs" / "img", out / "img")
    shutil.copy(SRC / "docs" / "card.png", out / "img" / "card.png")
    shutil.copy(SRC / "web" / "visualiser" / "share.jpg", out / "img" / "visualiser.jpg")
    (out / "index.html").write_text(stamp(LANDING.replace("__VERSION__", html.escape(version)).replace("__PKG__", name)
                                          .replace("__REPO__", REPO).replace("__SITE__", SITE).replace("__BY__", BY)
                                          .replace("__NEW__", whats_new(version)), ""),
                                    encoding="utf-8")
    # the cheat sheet
    (out / "cheat" / "index.html").write_text(stamp(cheat_sheet(version), "../", "cheat"), encoding="utf-8")
    emu = SRC / "build" / "emu"
    if not (emu / "amb.wasm").exists():
        raise SystemExit("no build/emu/amb.wasm: run web/emu/build.sh (needs Emscripten)")
    shutil.copytree(emu, out / "emu")
    (out / "emu" / "index.html").write_text(stamp((emu / "index.html").read_text(encoding="utf-8"), "../", "emu"), encoding="utf-8")
    # the editor: its own files (build/editor's copies of the harp, the style and the fonts are for serving it alone)
    ed = SRC / "build" / "editor"
    if not (ed / "amb.wasm").exists():
        raise SystemExit("no build/editor/amb.wasm: run web/editor/build.sh (needs Emscripten)")
    (out / "editor").mkdir()
    for f in ("amb.wasm", "engine.js", "worklet.js", "link.js", "editor.js", "editor.css"):
        shutil.copy2(ed / f, out / "editor" / f)
    (out / "editor" / "index.html").write_text(stamp((SRC / "web" / "editor" / "index.html").read_text(encoding="utf-8"), "../", "editor"), encoding="utf-8")
    # the harp, the bar's style and the fonts, at the root, for every page; Cloudflare's two files with them
    shutil.copytree(SRC / "web" / "brand", out, dirs_exist_ok=True)
    # the visualiser, as it is
    shutil.copytree(SRC / "web" / "visualiser", out / "visualiser")
    # the screen reader's words files (fm1-reader): every one ever made, for the devices that point at them
    shutil.copytree(SRC / "web" / "words", out / "words")
    (out / ".nojekyll").write_text("")
    print(f"site: {out}: index.html, install/ ({product}), manual/, cheat/, emu/, editor/, visualiser/, words/, firmware/{name} ({len(raw)} B)")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        sys.exit(__doc__)
    main(*sys.argv[1:4])
