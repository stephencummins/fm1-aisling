#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-only
# Build AISLING on the Mac Mini (its Docker runs the JieLi toolchain's linux/amd64 container; this machine has
# no Docker) and fetch the package back into build/.
#   tools/mini_build.sh [--release X.Y]
#   MINI       the ssh host (default: mini)
#   MINI_DIR   the build copy there, relative to its home (default: fm1-aisling-build): a plain copy of this
#              working tree, not a checkout, so what is built is what is here, committed or not
# The Mini needs, once: tools/get_toolchain.sh (~/.jieli/toolchain), the AC79 SDK in ~/fw-AC79_AIoT_SDK
# (BUILDING.md) and python3 with Pillow.
set -e
cd "$(dirname "$0")/.."
MINI="${MINI:-mini}"
MINI_DIR="${MINI_DIR:-fm1-aisling-build}"
rsync -a --delete --exclude .git/ --exclude .venv/ --exclude build/ --exclude node_modules/ ./ "$MINI:$MINI_DIR/"
ssh "$MINI" "export PATH=/opt/homebrew/bin:/usr/local/bin:\$PATH; cd ~/$MINI_DIR && sh build.sh $*"
mkdir -p build
name=amb.fwsc
case "$1" in --release) name="aisling-$2.fwsc" ;; esac
scp -q "$MINI:$MINI_DIR/build/$name" "build/$name"
echo "mini_build: build/$name"
