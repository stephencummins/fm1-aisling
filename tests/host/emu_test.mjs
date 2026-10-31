// SPDX-License-Identifier: GPL-3.0-only
// The browser build in Node: boot it, press a few keys, expect sound and screen frames.
import fs from "fs";
const wasm = fs.readFileSync(process.argv[2]);
let mem;
const wasi = new Proxy({ clock_time_get: (id, p, out) => { new DataView(mem.buffer).setBigUint64(out, 0n, true); return 0; },
  fd_write: (fd, iov, n, out) => { new DataView(mem.buffer).setUint32(out, 0, true); return 0; } }, { get: (t, k) => k in t ? t[k] : () => 0 });
const { instance } = await WebAssembly.instantiate(wasm, { wasi_snapshot_preview1: wasi, env: new Proxy({}, { get: () => () => 0 }) });
const ex = instance.exports; mem = ex.memory;
if (ex._initialize) ex._initialize();
ex.web_master(2800); ex.web_boot();
let peak = 0;
const WHITE = [0,2,4,6,7,9,11,12,14,16,18,19,21,23,24,26];
// the MIDI out, as the page's visualiser gets it: each packet stamped with a frame no earlier than the quantum it
// comes out in and less than two of the device's blocks ahead of it
const midi = { clock: 0, on: [0, 0, 0, 0], other: 0, early: 0, ahead: 0 };
for (let i = 0; i < 1200; i++) {
  if (i % 20 === 0 && i < 340) ex.web_keys(1 << WHITE[(i / 20) % 16]);
  ex.web_render(128);
  const l = new Float32Array(mem.buffer, ex.web_out_l(), 128);
  for (const v of l) peak = Math.max(peak, Math.abs(v));
  const n = ex.web_midi_len(), raw = new Uint32Array(mem.buffer, ex.web_midi_buf(), 2 * n), first = ex.web_frames() - 128;
  for (let k = 0; k < n; k++) {
    const st = (raw[2 * k] >>> 8) & 255, d = (raw[2 * k + 1] - first) | 0;
    if (d < 0) midi.early++;
    if (d >= 512) midi.ahead++;
    if (st === 0xf8) midi.clock++;
    else if ((st & 0xf0) === 0x90 && (st & 15) < 4) midi.on[st & 15]++;
    else midi.other++;
  }
  ex.web_midi_clear();
}
console.log("peak", peak.toFixed(3), "blits", ex.web_blits(), "midi", JSON.stringify(midi), "piece", ex.web_piece());
process.exit(peak > 0.05 && peak < 1 && midi.clock > 40 && midi.on[0] && midi.on[1] && !midi.early && !midi.ahead ? 0 : 1);
