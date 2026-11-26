// SPDX-License-Identifier: GPL-3.0-only
// The firmware, once instantiated: shared by the page (a quiet copy that describes the FM-1 before anyone has touched
// anything) and the worklet (the one that plays). Loaded by <script> and by addModule, so it hangs on globalThis.
globalThis.AislingEngine = {
  async start(wasm, nowSeconds, store, master) {
    let mem;
    const wasi = {
      clock_time_get: (id, prec, out) => {
        new DataView(mem.buffer).setBigUint64(out, BigInt(Math.round(nowSeconds() * 1e9)), true);
        return 0;
      },
      fd_write: (fd, iov, n, out) => { new DataView(mem.buffer).setUint32(out, 0, true); return 0; },
      proc_exit: () => {},
    };
    const stub = new Proxy(wasi, { get: (t, k) => (k in t ? t[k] : () => 0) });
    const env = new Proxy({}, { get: () => () => 0 });
    const { instance } = await WebAssembly.instantiate(wasm, { wasi_snapshot_preview1: stub, env });
    const ex = instance.exports;
    mem = ex.memory;
    if (ex._initialize) ex._initialize();
    const max = ex.web_store_max();
    for (const [obj, bytes] of Object.entries(store || {})) {
      const b = new Uint8Array(bytes).subarray(0, max);
      new Uint8Array(mem.buffer, ex.web_store(+obj), b.length).set(b);
      ex.web_store_set_len(+obj, b.length);
    }
    ex.web_master(master ?? 2800);
    ex.web_boot();
    return { ex, mem };
  },
  // the eight slots, for the piece cards and the library
  pieces(ex) {
    const out = [], np = ex.ed_npieces(), nl = ex.ed_nlayers();
    for (let i = 0; i < np; i++) {
      const voices = [];
      for (let l = 0; l < nl; l++) voices.push(ex.ed_slot_par(i, ex.ed_layer_voice(l)));
      out.push({ tempo: ex.ed_slot_par(i, ex.ed_p_tempo()), root: ex.ed_slot_par(i, ex.ed_p_root()),
        mode: ex.ed_slot_par(i, ex.ed_p_mode()), edited: !!ex.ed_edited(i), voices });
    }
    return out;
  },
  // a C string out of wasm memory (ASCII: the firmware's font is)
  str(mem, at) {
    if (!at) return "";
    const u8 = new Uint8Array(mem.buffer);
    let s = "";
    for (let i = at; u8[i] && s.length < 200; i++) s += String.fromCharCode(u8[i]);
    return s;
  },
};
