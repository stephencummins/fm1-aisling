#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# fm1-reader's files for the emulator's screen reader, at the commit web/emu/reader.pin names: fetched once into
# build/fm1-reader (git-ignored, like all of build/) and checked against the pin's sums. web/emu/build.sh copies them
# from there into build/emu/reader/. tools/publish_pages.sh runs this itself.
#   sh tools/get_reader.sh
set -e
cd "$(dirname "$0")/.."
PIN=web/emu/reader.pin
URL=https://github.com/charlesvestal/fm1-reader.git
DIR=build/fm1-reader
COMMIT="$(sed -n 's/^commit //p' "$PIN")"
[ ${#COMMIT} -eq 40 ] || { echo "reader: no commit in $PIN"; exit 1; }
# (inside this tree, git -C on a folder that isn't a checkout of its own answers for this repository: not the commit)
if [ "$(git -C "$DIR" rev-parse HEAD 2>/dev/null)" != "$COMMIT" ]; then
    rm -rf "$DIR"
    mkdir -p "$DIR"
    git -C "$DIR" init -q
    git -C "$DIR" fetch -q --depth 1 "$URL" "$COMMIT"
    git -C "$DIR" -c advice.detachedHead=false checkout -q FETCH_HEAD
    [ "$(git -C "$DIR" rev-parse HEAD)" = "$COMMIT" ] || { echo "reader: fetched the wrong commit"; exit 1; }
fi
sed -e '/^#/d' -e '/^commit /d' -e '/^$/d' "$PIN" | (cd "$DIR" && shasum -a 256 -c --quiet -) \
    || { echo "reader: $DIR doesn't match $PIN"; exit 1; }
echo "reader: fm1-reader $(printf %s "$COMMIT" | cut -c1-8) in $DIR"
