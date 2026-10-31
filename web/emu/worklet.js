// SPDX-License-Identifier: GPL-3.0-only
// DUB-1 in an AudioWorklet: amb.wasm is the whole FM-1 app (web/emu/amb_web.c). Each render
// quantum asks it for 128 frames, which runs the device's clock forward; between quanta the page's
// input goes in and, about 30 times a second, the screen, the lights, any saved objects and what the
// screen reader was told (fm1-reader's SysEx frames, from announce.c) go out. While the page's reader is
// on, the HELLO that keeps the firmware talking is sent from here, every 2 s of audio time, so a page in
// a background tab (its timers slowed) does not lose it. While the page's visualiser is open, the FM-1's MIDI out goes
// to it as it is made, each event with the audio time it will be heard at.
const RD_HELLO = [0x7d, 0x53, 0x52, 1, 1], RD_BYE = [0x7d, 0x53, 0x52, 2], RD_WHERE = [0x7d, 0x53, 0x52, 3];

const clock = globalThis.performance ? () => globalThis.performance.now() : () => Date.now();

class Amb extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ex = null;
    this.input = null;
    this.sentBlits = -1;
    this.sentWrites = -1;
    this.lastFrame = 0;
    this.busy = 0;
    this.frames = 0;
    this.reader = false;
    this.lastHello = 0;
    this.midi = false;
    this.piece = -1;
    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  async onMessage(m) {
    if (m.type === "load") {
      const now = () => BigInt(Math.round(currentTime * 1e9));
      const wasi = {
        clock_time_get: (id, prec, out) => {
          new DataView(this.mem.buffer).setBigUint64(out, now(), true);
          return 0;
        },
        fd_write: (fd, iov, n, out) => { new DataView(this.mem.buffer).setUint32(out, 0, true); return 0; },
        proc_exit: () => {},
      };
      const stub = new Proxy(wasi, { get: (t, k) => (k in t ? t[k] : () => 0) });
      const env = new Proxy({}, { get: () => () => 0 });
      const { instance } = await WebAssembly.instantiate(m.wasm, { wasi_snapshot_preview1: stub, env });
      this.ex = instance.exports;
      this.mem = this.ex.memory;
      if (this.ex._initialize) this.ex._initialize();
      const max = this.ex.web_store_max();
      for (const [obj, bytes] of Object.entries(m.store || {})) {
        const b = new Uint8Array(bytes).subarray(0, max);
        new Uint8Array(this.mem.buffer, this.ex.web_store(+obj), b.length).set(b);
        this.ex.web_store_set_len(+obj, b.length);
      }
      this.sentWrites = this.ex.web_store_writes();
      this.ex.web_master(m.master ?? 2800);
      this.ex.web_boot();
      this.port.postMessage({ type: "ready" });
    } else if (!this.ex) {
      return;
    } else if (m.type === "buttons") {
      this.ex.web_buttons(m.mask >>> 0);
    } else if (m.type === "keys") {
      this.ex.web_keys(m.mask >>> 0);
    } else if (m.type === "enc") {
      this.ex.web_enc(m.role, m.n | 0);
    } else if (m.type === "master") {
      this.ex.web_master(m.value | 0);
    } else if (m.type === "reader") {               // the screen reader on (HELLO now, then every 2 s) or off (BYE)
      this.reader = !!m.on;
      this.sysex(this.reader ? RD_HELLO : RD_BYE);
      this.lastHello = currentTime;
    } else if (m.type === "where") {                // say the whole screen
      if (this.reader) this.sysex(RD_WHERE);
    } else if (m.type === "midi") {                 // the visualiser open (the MIDI out and the piece) or closed
      this.midi = !!m.on;
      this.piece = -1;
    }
  }

  sysex(bytes) {                                    // a frame to the firmware: the bytes between F0 and F7
    const ex = this.ex;
    new Uint8Array(this.mem.buffer, ex.web_sysex_buf(), bytes.length).set(bytes);
    ex.web_sysex(bytes.length);
  }

  publish() {
    const ex = this.ex;
    const blits = ex.web_blits();
    const msg = { type: "frame", buttons: ex.web_lit_buttons() >>> 0, keys: ex.web_lit_keys() >>> 0 };
    if (this.frames >= 44100) {                       // the share of real time spent running the device
      msg.load = Math.round(100 * this.busy / (this.frames / 44.1));
      this.busy = this.frames = 0;
    }
    const transfer = [];
    if (blits !== this.sentBlits) {
      this.sentBlits = blits;
      msg.fb = new Uint16Array(this.mem.buffer, ex.web_fb(), 240 * 240).slice();
      transfer.push(msg.fb.buffer);
    }
    const said = ex.web_said_len();
    if (said) {
      msg.said = new Uint8Array(this.mem.buffer, ex.web_said_buf(), said).slice();
      ex.web_said_clear();
    }
    const writes = ex.web_store_writes();
    if (writes !== this.sentWrites) {
      this.sentWrites = writes;
      msg.store = {};
      for (let o = 0; o < ex.web_nobj(); o++) {
        const n = ex.web_store_len(o);
        if (n >= 0) msg.store[o] = new Uint8Array(this.mem.buffer, ex.web_store(o), n).slice();
      }
    }
    this.port.postMessage(msg, transfer);
  }

  // the MIDI made while rendering this quantum: each packet's frame from the quantum's first, which plays at currentTime
  midiOut(n) {
    const ex = this.ex, len = ex.web_midi_len(), piece = ex.web_piece();
    if (!len && piece === this.piece) return;
    const msg = { type: "midi", piece };
    if (piece !== this.piece) {                     // its name, from the firmware's table
      const u8 = new Uint8Array(this.mem.buffer), at = ex.web_piece_name(piece);
      let name = "";
      for (let i = at; at && u8[i] && name.length < 32; i++) name += String.fromCharCode(u8[i]);
      msg.name = name;
    }
    this.piece = piece;
    if (len) {
      const raw = new Uint32Array(this.mem.buffer, ex.web_midi_buf(), 2 * len), first = (ex.web_frames() - n) >>> 0;
      msg.ev = new Uint32Array(len);
      msg.t = new Float64Array(len);
      for (let i = 0; i < len; i++) {
        msg.ev[i] = raw[2 * i];
        msg.t[i] = currentTime + ((raw[2 * i + 1] - first) | 0) / sampleRate;
      }
      ex.web_midi_clear();
    }
    this.port.postMessage(msg);
  }

  process(inputs, outputs) {
    if (!this.ex) return true;
    const out = outputs[0];
    const n = out[0].length;
    const t0 = clock();
    this.ex.web_render(n);
    this.busy += clock() - t0;
    this.frames += n;
    out[0].set(new Float32Array(this.mem.buffer, this.ex.web_out_l(), n));
    if (out[1]) out[1].set(new Float32Array(this.mem.buffer, this.ex.web_out_r(), n));
    if (this.midi) this.midiOut(n);
    else if (this.ex.web_midi_len()) this.ex.web_midi_clear();
    if (this.reader && currentTime - this.lastHello >= 2) {
      this.lastHello = currentTime;
      this.sysex(RD_HELLO);
    }
    if (currentTime - this.lastFrame >= 1 / 30) {
      this.lastFrame = currentTime;
      this.publish();
    }
    return true;
  }
}

registerProcessor("amb", Amb);
