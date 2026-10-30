# SPDX-License-Identifier: GPL-3.0-only
"""A render's notes as MIDI files: one .mid per WAV the script wrote, lined up with it, to play through other synths.

    python3 tools/midi_export.py build/listen/midi_out.txt [OUTDIR]

Reads the host's MIDI log (amb_host writes it beside the WAVs, with a line where each WAV starts and stops) and
writes OUTDIR/<wav name>.mid (default: beside the log): a type 1 file at the piece's tempo, four tracks, one per
layer (Drone, Sequence, Lead, Sequence 2, on MIDI channels 1 to 4 as the device sends them). Time zero is the WAV's
first sample. Notes already sounding when the WAV starts begin at zero; notes still sounding when it stops end there.
Set the DAW's tempo to the piece's (the file says it, and so does this tool) and the notes fall where the audio's do.
"""
import os
import re
import struct
import sys

PPQ = 480
LAYERS = ["Drone", "Sequence", "Lead", "Sequence 2"]   # (the engine's channels 0..3)


def vlq(n):
    out = [n & 0x7F]
    n >>= 7
    while n:
        out.append(0x80 | (n & 0x7F))
        n >>= 7
    return bytes(reversed(out))


def track(events, name, tempo_us=None):
    """events: (tick, bytes) pairs, sorted; a track chunk with its name, the tempo if given, and an end."""
    body = b"\x00\xff\x03" + vlq(len(name)) + name.encode()
    if tempo_us:
        body += b"\x00\xff\x51\x03" + struct.pack(">I", tempo_us)[1:]
    t = 0
    for tick, msg in events:
        body += vlq(tick - t) + msg
        t = tick
    body += b"\x00\xff\x2f\x00"
    return b"MTrk" + struct.pack(">I", len(body)) + body


def read_log(path):
    """The log's WAVs (name, tempo, start and stop in ms) and all its notes (channel, note, velocity, on, off in ms;
    off None if the log ends first)."""
    line_re = re.compile(r"^(\d+) ms: (.*)$")
    windows, held, notes = [], {}, []
    for line in open(path):
        m = line_re.match(line.strip())
        if not m:
            continue
        t, rest = int(m.group(1)), m.group(2).split()
        if rest[0] == "wav":
            windows.append({"name": rest[1], "bpm": int(rest[2]), "start": t, "stop": None})
            continue
        if rest[0] == "wavstop":
            if windows:
                windows[-1]["stop"] = t
            continue
        st, d1, d2 = (int(x, 16) for x in rest)
        kind, ch = st & 0xF0, st & 0x0F
        if kind == 0x90 and d2:
            if (ch, d1) in held:                    # (a note struck again while it sounds: the first ends here)
                notes[held.pop((ch, d1))][4] = t
            held[(ch, d1)] = len(notes)
            notes.append([ch, d1, d2, t, None])
        elif kind in (0x80, 0x90) and (ch, d1) in held:
            notes[held.pop((ch, d1))][4] = t
    return windows, notes


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    log = sys.argv[1]
    outdir = sys.argv[2] if len(sys.argv) > 2 else os.path.dirname(log)
    os.makedirs(outdir, exist_ok=True)
    windows, notes = read_log(log)
    if not windows:
        sys.exit("midi_export: no WAV markers in %s (an older amb_host? rebuild it and render again)" % log)
    for w in windows:
        if w["stop"] is None:
            sys.exit("midi_export: %s never stopped (no wavstop)" % w["name"])
        start, stop, bpm = w["start"], w["stop"], w["bpm"]
        ticks = lambda ms: round((ms - start) * bpm * PPQ / 60000.0)
        layers = [[] for _ in LAYERS]
        for ch, n, vel, on, off in notes:
            off = stop if off is None else off
            if ch >= len(LAYERS) or off <= start or on >= stop:
                continue
            a, b = ticks(max(on, start)), ticks(min(off, stop))
            if b <= a:
                continue
            layers[ch].append((a, bytes([0x90 | ch, n, vel])))
            layers[ch].append((b, bytes([0x80 | ch, n, 0])))
        for ev in layers:
            ev.sort(key=lambda e: (e[0], e[1][0] & 0xF0 == 0x90))   # (offs before ons at the same tick)
        tempo_us = round(60e6 / bpm)
        chunks = [track([], os.path.splitext(w["name"])[0], tempo_us)]
        chunks += [track(ev, LAYERS[i]) for i, ev in enumerate(layers)]
        out = os.path.join(outdir, os.path.splitext(w["name"])[0] + ".mid")
        with open(out, "wb") as f:
            f.write(b"MThd" + struct.pack(">IHHH", 6, 1, len(chunks), PPQ) + b"".join(chunks))
        counts = ", ".join("%s %d" % (LAYERS[i], len(ev) // 2) for i, ev in enumerate(layers))
        print("%s: %d bpm, %.0f s; %s" % (out, bpm, (stop - start) / 1000.0, counts))


if __name__ == "__main__":
    main()
