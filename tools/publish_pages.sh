#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Build the site for release VERSION (tools/make_pages.py) and publish it to both its places: the gh-pages branch of
# origin, replacing what was there (the branch holds only the generated site), for the links already out there; and
# Cloudflare Pages, at aisling.stephen8n.com, its home.
#   tools/publish_pages.sh 0.1          (after tools/mini_build.sh --release 0.1)
set -e
cd "$(dirname "$0")/.."
V="${1:?usage: tools/publish_pages.sh VERSION}"
PKG="build/aisling-$V.fwsc"
[ -f "$PKG" ] || { echo "no $PKG: run tools/mini_build.sh --release $V first"; exit 1; }
EN_VERSION="$V" sh web/emu/build.sh
python3 tools/make_pages.py "$PKG" "$V" build/pages
REMOTE="$(git remote get-url origin)"
SHA="$(git rev-parse --short HEAD)"
SITE="$PWD/build/pages"
cd build/pages
rm -rf .git
git init -q
git checkout -q -b gh-pages               # (not init -b: older gits lack it)
git add -A
git commit -q -m "Site for AISLING $V (from $SHA)"
git push -q -f "$REMOTE" gh-pages
rm -rf .git
# ask GitHub Pages to build it now: a push alone has left the first deploy stuck on "building"
REPO="$(printf %s "$REMOTE" | sed -E 's#(git@github.com:|https://github.com/)##; s#\.git$##')"
gh api -X POST "repos/$REPO/pages/builds" >/dev/null 2>&1 || echo "(could not ask GitHub Pages to build: check the repository's Pages settings)"
echo "pushed the site for $V to gh-pages"
# wrangler from a folder of its own, with its own package.json: anywhere else it takes $HOME for the project and logs
# itself out (a stray ~/.wrangler)
T="$(mktemp -d)"
cp -R "$SITE" "$T/site"
echo '{ "private": true }' > "$T/package.json"
cd "$T"
npx --yes wrangler pages deploy site --project-name aisling --branch main
cd /
rm -rf "$T"
echo "deployed the site for $V to aisling.stephen8n.com"
