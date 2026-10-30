#!/bin/bash
# FM-1 rescue: one command that puts M-VAVE's stock firmware back on an FM-1 stuck in a crash loop.
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/stephencummins/fm1-aisling/main/tools/fm1_rescue.sh)"
# or, in a checkout: bash tools/fm1_rescue.sh (uses the checkout's fm1_rescue.py)
set -e
DIR="$HOME/fm1-rescue"
RAW="https://raw.githubusercontent.com/stephencummins/fm1-aisling/main/tools"
MVAVE="https://yms-file-store.oss-cn-hongkong.aliyuncs.com/software/firmware/FM-1.fwsc"
WAYBACK="https://web.archive.org/web"
V15=db1642b2b6fa5c2cccb11ffd13878068bb28601678d3644049f99dc40e7edb8a
V16=d017fb65e70aca97ee29d944470c3515a74581df5c0576bf70de917c7b2b61d5
HERE=""
case "${BASH_SOURCE[0]}" in
    */fm1_rescue.sh|fm1_rescue.sh) HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)" ;;
esac
echo
echo "=== FM-1 rescue ==="
if ! xcode-select -p >/dev/null 2>&1; then
    echo "This needs Apple's command line tools (free). A window will open: click Install."
    echo "When it has finished, run this same command again."
    xcode-select --install >/dev/null 2>&1 || true
    exit 1
fi
mkdir -p "$DIR"
cd "$DIR"
if [ ! -x env/bin/python ] || ! env/bin/python -c "import usb, libusb_package" 2>/dev/null; then
    echo "Setting up (once) ..."
    rm -rf env
    /usr/bin/python3 -m venv env
    env/bin/pip install --quiet --disable-pip-version-check pyusb libusb-package
fi
if [ -n "$HERE" ] && [ -f "$HERE/fm1_rescue.py" ]; then
    cp "$HERE/fm1_rescue.py" fm1_rescue.py
else
    curl -fsSL -o fm1_rescue.py "$RAW/fm1_rescue.py"
fi

sha() { shasum -a 256 "$1" | cut -d' ' -f1; }
# get NAME SHA URL...: $DIR/FM-1-NAME.fwsc from a .fwsc already here, in Downloads or on the Desktop,
# else from the first URL that gives exactly that file
get() {
    local name=$1 want=$2 f url
    shift 2
    for f in "$DIR"/*.fwsc "$HOME"/Downloads/*.fwsc "$HOME"/Desktop/*.fwsc; do
        [ -f "$f" ] || continue
        if [ "$(sha "$f")" = "$want" ]; then
            [ "$f" = "$DIR/FM-1-$name.fwsc" ] || cp "$f" "$DIR/FM-1-$name.fwsc"
            return 0
        fi
    done
    echo "Downloading M-VAVE's FM-1 $name ..."
    for url in "$@"; do
        if curl -fsSL -o "$DIR/FM-1.download" "$url" && [ "$(sha "$DIR/FM-1.download")" = "$want" ]; then
            mv "$DIR/FM-1.download" "$DIR/FM-1-$name.fwsc"
            return 0
        fi
    done
    rm -f "$DIR/FM-1.download"
    echo "  could not get the $name firmware"
    return 1
}
# Both: each has its own flash head, and the rescue writes the one whose head is the FM-1's own.
# M-VAVE's link serves V16 now; V15 is only in the Internet Archive's copy of that link.
PKGS=()
if get V16 "$V16" "$MVAVE" "$WAYBACK/20261022051537id_/$MVAVE"; then PKGS+=("$DIR/FM-1-V16.fwsc"); fi
if get V15 "$V15" "$WAYBACK/20261009203224id_/$MVAVE"; then PKGS+=("$DIR/FM-1-V15.fwsc"); fi
if [ ${#PKGS[@]} -eq 0 ]; then
    echo "No stock firmware to write. Nothing was done; send this output."
    exit 1
fi
echo "Stock firmware: ${PKGS[*]}"
echo
echo "If it asks for a password, type your Mac password (nothing shows while you type) and press Return."
echo "When it says it is waiting: plug the FM-1 in and switch it on."
echo "It will crash and go blank; that is when it is caught. (Ctrl-C stops it.)"
echo
exec sudo "$DIR/env/bin/python" "$DIR/fm1_rescue.py" "${PKGS[@]}" --ask --wait 300
