#!/usr/bin/env python3
# SPDX-License-Identifier: GPL-3.0-only
"""The visualiser's demo: Skellig as AISLING plays it, looped, and its notes for the page to paint as they're heard.

    tools/make_demo_track.py      (from the repo: needs build/host/amb_host, the .venv's numpy, and lame)

Renders four minutes of Skellig from power-on in the host (the engine the FM-1 runs) with its MIDI out logged, and
cuts bars 20 to 52: 32 bars, so the Dm7 and C of its double tonic come round in step, starting six seconds before
the flute's first phrase in the take and ending in the gap before its next. The 3 s after the cut cross into the
first 3 s, equal power, so the loop has no seam; the file carries half a second of the loop either side, so a
decoder's start-up delay can't put one in it. Writes web/visualiser/skellig.mp3, and the notes into index.html's
DEMO line: each note nine characters, base 36 (from the last note's start in ms, channel x 128 + note, how hard,
how long in 10 ms for the held layers), where it falls in the loop. Across the crossing, a note is as hard as its
side of the crossing is loud, and one too faint to see is left out.
"""
import os
import re
import subprocess
import sys
import tempfile
import wave

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = os.path.join(ROOT, "web", "visualiser", "index.html")
MP3 = os.path.join(ROOT, "web", "visualiser", "skellig.mp3")
BPM, FIRST_BAR, BARS, CROSS_MS, PAD_MS, LEVEL = 76, 20, 32, 3000, 500, 0.8
HELD = (0, 2)          # the Drone and the Lead paint while held: their notes carry how long
SCRIPT = """# the visualiser's demo: Skellig from power-on, four minutes, its MIDI out logged beside it
expect piece 0
wav skellig.wav
wait 240000
wavstop
expect peak_db_max -0.5
"""
B36 = "0123456789abcdefghijklmnopqrstuvwxyz"


def b36(n, width):
    if not 0 <= n < 36 ** width:
        sys.exit(f"{n} does not fit {width} base-36 digits")
    s = ""
    for _ in range(width):
        s = B36[n % 36] + s
        n //= 36
    return s


def notes_of(log):
    """(start ms, end ms or None, channel, note, velocity) for each note, and where the clock started (ms)."""
    on, notes, start = {}, [], None
    for line in open(log):
        m = re.match(r"(\d+) ms: ([0-9A-F]{2}) ([0-9A-F]{2}) ([0-9A-F]{2})", line)
        if not m:
            continue
        t, st, d1, d2 = int(m[1]), int(m[2], 16), int(m[3], 16), int(m[4], 16)
        ty, ch = st & 0xF0, st & 15
        if st == 0xFA and start is None:
            start = t
        elif ty == 0x90 and d2:
            if (ch, d1) in on:
                t0, v = on.pop((ch, d1))
                notes.append((t0, t, ch, d1, v))
            on[(ch, d1)] = (t, d2)
        elif ty in (0x80, 0x90) and (ch, d1) in on:
            t0, v = on.pop((ch, d1))
            notes.append((t0, t, ch, d1, v))
    notes += [(t0, None, ch, n, v) for (ch, n), (t0, v) in on.items()]
    return sorted(notes, key=lambda nt: (nt[0], nt[2], nt[3])), start


def main():
    host = os.path.join(ROOT, "build", "host", "amb_host")
    if not os.path.exists(host):
        sys.exit("build the host first: host/build_host.sh")
    with tempfile.TemporaryDirectory() as tmp:
        with open(os.path.join(tmp, "skellig.amb"), "w") as f:
            f.write(SCRIPT)
        out = os.path.join(tmp, "out")
        os.mkdir(out)
        subprocess.run([host, os.path.join(tmp, "skellig.amb"), out], check=True, stdout=subprocess.DEVNULL)
        with wave.open(os.path.join(out, "skellig.wav")) as w:
            rate, chans = w.getframerate(), w.getnchannels()
            src = np.frombuffer(w.readframes(w.getnframes()), dtype="<i2").reshape(-1, chans).astype(np.float64)
        notes, start = notes_of(os.path.join(out, "midi_out.txt"))

        bar = 240000 / BPM
        a_ms, loop_ms = start + FIRST_BAR * bar, BARS * bar
        b_ms = a_ms + loop_ms
        a, n, x, pad = round(a_ms * rate / 1000), round(loop_ms * rate / 1000), CROSS_MS * rate // 1000, PAD_MS * rate // 1000
        loop = src[a:a + n].copy()
        k = (np.arange(x) + 0.5) / x * np.pi / 2
        loop[:x] = loop[:x] * np.sin(k)[:, None] + src[a + n:a + n + x] * np.cos(k)[:, None]
        body = np.concatenate([loop[-pad:], loop, loop[:pad]])
        peak = np.abs(body).max() / 32768
        if peak > 0.95:
            sys.exit(f"the crossing peaks at {peak:.3f}")
        wav = os.path.join(tmp, "loop.wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(chans); w.setsampwidth(2); w.setframerate(rate)
            w.writeframes(np.round(body).astype("<i2").tobytes())
        subprocess.run(["lame", "--silent", "-q", "2", "-V", "4", wav, MP3], check=True)

    # the notes where they fall in the loop: from the take (bar 20 on), and across the crossing those after the cut
    loop_ms = n * 1000 / rate
    side = lambda t: np.sin((t + 0.5) / CROSS_MS * np.pi / 2) if t < CROSS_MS else 1.0
    kept = []
    for t0, t1, ch, note, v in notes:
        d = (t1 if t1 is not None else 1e12) - t0
        if a_ms <= t0 < b_ms:
            s = t0 - a_ms
            v *= side(s)
        elif b_ms <= t0 < b_ms + CROSS_MS:
            s = t0 - b_ms
            v *= np.cos((s + 0.5) / CROSS_MS * np.pi / 2)
            d = min(d, CROSS_MS - s)
        else:
            continue
        if v < 8:
            continue
        held = ch in HELD
        kept.append((round(s), ch * 128 + note, round(v), max(1, round(min(d, loop_ms - 10) / 10)) if held else 0))
    kept.sort()
    enc, last = [], 0
    for s, key, v, d in kept:
        enc.append(b36(s - last, 2) + b36(key, 2) + b36(v, 2) + b36(d, 3))
        last = s
    line = (f"const DEMO = {{ file: 'skellig.mp3', bpm: {BPM}, loop: {loop_ms / 1000:.6f}, pad: {PAD_MS / 1000}, "
            f"level: {LEVEL}, notes: '{''.join(enc)}' }}")
    page = open(PAGE, encoding="utf-8").read()
    page, hits = re.subn(r"^const DEMO = \{.*\}$", lambda _: line, page, flags=re.M)
    if hits != 1:
        sys.exit(f"index.html has {hits} DEMO lines, not one")
    with open(PAGE, "w", encoding="utf-8") as f:
        f.write(page)
    by = {c: sum(1 for k in kept if k[1] >> 7 == c) for c in range(4)}
    print(f"skellig.mp3: {os.path.getsize(MP3)} B, {loop_ms / 1000:.3f} s a loop (bars {FIRST_BAR} to {FIRST_BAR + BARS}"
          f" at {BPM} bpm), peak {peak:.3f}; {len(kept)} notes (Drone {by[0]}, Sequence {by[1]}, Lead {by[2]},"
          f" Seq 2 {by[3]}), {len(line)} B in the page")


if __name__ == "__main__":
    main()
