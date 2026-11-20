# AISLING as a plugin

The FM-1's engine (`firmware/src/dsp/amb.c`, the same C) as a VST3, an Audio Unit and a standalone app, for making
a pack piece's **Patch** sounds by ear in a DAW and saving them into the pack.

    cmake -S plugin -B plugin/build
    cmake --build plugin/build -j8

The build copies `AISLING.vst3` and `AISLING.component` into `~/Library/Audio/Plug-Ins`. JUCE 8 is fetched on the
first configure (`-DFETCHCONTENT_SOURCE_DIR_JUCE=DIR` uses a copy you have).

## What it does

- **Load a pack** (`.aispack`) and choose a piece, or play AISLING's own eight. The piece plays in the host's time:
  it starts with the transport, on the host's sixteenths, at the host's tempo (AISLING's own range is 60 to 160; outside it is untested).
- **Four tabs**, Drone, Sequence, Lead, Sequence 2: a layer's Patch is sixteen numbers, each a plugin parameter, so
  they can be automated and mapped to a controller. "Plays its Patch" off: the layer keeps the piece's own voice.
- **Solo** a layer. **Notes play**: a MIDI clip or a keyboard plays the Lead, or a Sequence, with the exact notes
  (not snapped to the scale); untick "The piece plays its own Sequence notes" and only yours sound.
- **Save into the pack**: writes the pack with this piece's patches in it and those layers set to Patch. A pack
  with a patch needs AISLING 1.6; without one it stays a 1.5 pack. **Copy as JSON** gives the `"patch"` block for
  `packs/NAME.json` (`tools/make_pack.py`).

## Limits

- One AISLING in a set: the engine's state is one for the process. A second one stays silent and says so.
- The engine runs at 44.1 kHz; at other rates the output is resampled (about 2 ms of latency, reported to the host).
- Notes played into a Sequence don't get the Sequence's repeats (Tap A, Tap B). The Drone takes no notes: it plays
  the piece's chords.

## Testing without a host

    cmake --build plugin/build --target AislingTest
    AislingTest PACK RATE SECS OUT.wav [solo=N] [bpm=N] [loop=BEATS] [notes=LAYER] [stopped] [save=FILE] [set=ID:V,..] [shot=FILE.png]

`plugin/test/host_test.cpp` runs the plugin under a made-up transport. Against `en_render` at the same tempo the
output lines up to the frame at 44.1 kHz and stays there.

## The keys

The row of keys under the pages plays the layer whose page is open (Lead, Sequence, Sequence 2), so a sound can be
heard on demand. With the host stopped and "play while the host is stopped" off, the note is heard alone. The Drone has
no keys: it holds the piece's chord. Sequence 2 is silent in a piece that has none (Skellig, for one).
`AislingTest ... keys=LAYER stopped` tests it without a host.
