#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# AISLING's editor (a design draft): the emulator's build with editor_web.c on top, and its page.
#   [EN_VERSION=0.4] web/editor/build.sh  ->  build/editor/{index.html, editor.js, link.js, editor.css, engine.js, worklet.js, amb.wasm, the brand}
# Same sources and flags as web/emu/build.sh. Nothing here is installed on an FM-1, or published.
set -e
cd "$(dirname "$0")/../.."
mkdir -p build/gen build/editor
[ -f build/gen/felucca_font.h ] || python3 tools/gen_font.py build/gen/felucca_font.h >/dev/null
python3 tools/gen_words.py firmware/words.tsv web/words build/gen/ann_words.h >/dev/null
emcc -O2 -ffp-contract=off -std=gnu99 -Wall -Wno-unused-function -Wno-unused-parameter -Wno-unused-variable \
    -DEN_HOST -DEN_WEB "-DEN_VERSION=\"$(printf %s "${EN_VERSION:-DEV}" | tr a-z A-Z)\"" -Ifirmware/src -Ifirmware/src/dsp -Ibuild/gen \
    --no-entry -sSTANDALONE_WASM -sSTACK_SIZE=1048576 -sINITIAL_MEMORY=33554432 -sFILESYSTEM=0 \
    -o build/editor/amb.wasm web/editor/editor_web.c firmware/src/dsp/amb.c
cp web/editor/engine.js web/editor/worklet.js web/editor/editor.js web/editor/link.js web/editor/editor.css build/editor/
cp -R web/brand/. build/editor/
python3 - <<'PY'
import sys
sys.path.insert(0, "tools")
from site_brand import stamp
page = open("web/editor/index.html", encoding="utf8").read()
open("build/editor/index.html", "w", encoding="utf8").write(stamp(page, "./", "editor"))
PY
echo "editor: build/editor ($(wc -c < build/editor/amb.wasm) B wasm)"
