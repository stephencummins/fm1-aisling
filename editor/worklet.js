// SPDX-License-Identifier: GPL-3.0-only
// The editor's AudioWorklet: the firmware that plays (web/editor/editor_web.c). The page's changes come in between
// render quanta and call the same functions the FM-1's knobs and keys call. About 30 times a second what changed goes
// back: the screen, the lights, the meters, any knob whose value moved, and undo's state. Undo lives here because the
// project does: a snapshot is the bytes of project_t, the bytes the FM-1 keeps.
const clock = globalThis.performance ? () => globalThis.performance.now() : () => Date.now();
const UNDO_MAX = 64, MERGE_MS = 800;

class Editor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ex = null;
    this.knobs = [];
    this.last = new Map();
    this.sentBlits = -1;
    this.sentWrites = -1;
    this.lastFrame = 0;
    this.tick = 0;
    this.resend = false;
    this.undo = [];
    this.redo = [];
    this.open = null;
    this.heldKeys = 0;
    this.heldButtons = 0;
    this.pressEnd = false;
    this.sentHist = "";
    this.sentPieces = "";
    this.queue = [];
    this.port.onmessage = (e) => this.onMessage(e.data);
  }

  async onMessage(m) {
    if (m.type === "load") {
      const eng = await globalThis.AislingEngine.start(m.wasm, () => currentTime, m.store, m.master);
      this.ex = eng.ex;
      this.mem = eng.mem;
      this.knobs = m.knobs;
      this.size = this.ex.ed_proj_size();
      this.sentWrites = this.ex.web_store_writes();
      if (m.rest) this.ex.ed_rest();
      for (const q of this.queue) this.handle(q);
      this.queue = [];
      this.port.postMessage({ type: "ready" });
    } else if (!this.ex) {
      this.queue.push(m);
    } else {
      this.handle(m);
    }
  }

  snap() { return new Uint8Array(this.mem.buffer, this.ex.ed_proj(), this.size).slice(); }

  same(a, b) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  begin(label) {
    if (!this.open) this.open = { label, bytes: this.snap() };
    else if (this.open.press) { this.open.label = label; this.open.press = false; this.pressEnd = false; }   // (a knob, with a key held: the knob's step)
  }

  end() {
    if (!this.open) return;
    const { label, bytes, press } = this.open;
    this.open = null;
    if (this.same(bytes, this.snap())) return;
    const top = this.undo[this.undo.length - 1], t = clock();
    if (!press && top && top.label === label && t - top.t < MERGE_MS) {    // a burst on one control is one step
      top.t = t;
    } else {
      this.undo.push({ label, bytes, t });
      if (this.undo.length > UNDO_MAX) this.undo.shift();
    }
    this.redo = [];
  }

  act(label, fn) { this.begin(label); fn(); this.end(); }

  // A key or OCT can edit the piece: a chord's root, a pattern's step, a layer's octave. The firmware acts on it during
  // a render, so the snapshot stays open until everything is let go, and closes after the next render.
  pressed() {
    if (this.heldKeys || this.heldButtons) {
      this.pressEnd = false;
      if (this.open) return;
      const v = this.ex.ed_view_now();
      const label = this.heldButtons ? "Octave" : v === 15 ? "Chord root" : v === 16 ? "Pattern step" : "Keys";
      this.open = { label, bytes: this.snap(), press: true };
    } else if (this.open && this.open.press) {
      this.pressEnd = true;
    }
  }

  commit(bytes) {
    new Uint8Array(this.mem.buffer, this.ex.ed_incoming(), this.size).set(bytes);
    return this.ex.ed_commit();
  }

  step(from, to) {
    const e = from.pop();
    if (!e) return;
    to.push({ label: e.label, bytes: this.snap(), t: 0 });
    this.commit(e.bytes);
    this.resend = true;
  }

  handle(m) {
    const ex = this.ex;
    switch (m.type) {
      case "begin": this.begin(m.label); break;
      case "end": this.end(); break;
      case "set": ex.ed_set(m.k, m.v); break;
      case "voice": this.act(m.label, () => ex.ed_voice(m.p, m.v)); break;
      case "view": ex.ed_view_go(m.v); if (m.knob >= 0) ex.ed_touch(m.knob); break;
      case "piece": this.act(m.label, () => ex.ed_piece_go(m.i)); this.resend = true; break;
      case "play": ex.ed_play_toggle(); break;
      case "hold": ex.ed_hold_toggle(); break;
      case "perf": ex.ed_perf(m.i, m.down ? 1 : 0); break;
      case "forget": ex.ed_forget(); break;
      case "keys": this.heldKeys = m.mask >>> 0; this.pressed(); ex.web_keys(this.heldKeys); break;
      case "buttons": this.heldButtons = m.mask >>> 0; this.pressed(); ex.web_buttons(this.heldButtons); break;
      case "master": ex.web_master(m.v | 0); break;
      case "save": ex.ed_save(); break;
      case "undo": this.step(this.undo, this.redo); break;
      case "redo": this.step(this.redo, this.undo); break;
      case "copy": this.act(m.label, () => ex.ed_slot_copy(m.from, m.to)); this.resend = true; break;
      case "swap": this.act(m.label, () => ex.ed_slot_swap(m.a, m.b)); this.resend = true; break;
      case "reset": this.act(m.label, () => ex.ed_slot_reset(m.i)); this.resend = true; break;
      case "read-slot": {
        ex.ed_keep();
        const bytes = new Uint8Array(this.mem.buffer, ex.ed_slot_ptr(m.i), ex.ed_slot_size()).slice();
        this.port.postMessage({ type: "reply", id: m.id, bytes }, [bytes.buffer]);
        break;
      }
      case "read-proj": {
        ex.ed_keep();
        const bytes = this.snap();
        this.port.postMessage({ type: "reply", id: m.id, bytes }, [bytes.buffer]);
        break;
      }
      case "install-slot": {
        let ok = -1;
        if (m.bytes.length === ex.ed_slot_size()) {
          new Uint8Array(this.mem.buffer, ex.ed_slot_in(), m.bytes.length).set(m.bytes);
          this.begin(m.label);
          ok = ex.ed_slot_install(m.i);
          this.end();
          this.resend = true;
        }
        this.port.postMessage({ type: "reply", id: m.id, ok });
        break;
      }
      case "install-proj": {
        let ok = -1;
        if (m.bytes.length === this.size) {
          this.begin(m.label);
          ok = this.commit(m.bytes);
          this.end();
          this.resend = true;
        }
        this.port.postMessage({ type: "reply", id: m.id, ok });
        break;
      }
      case "resend": this.resend = true; this.sentHist = ""; this.sentPieces = ""; this.publish(); break;   // (publishes here: a suspended context runs no process)
      default: break;
    }
  }

  publish() {
    const ex = this.ex, msg = { type: "frame", keys: ex.web_lit_keys() >>> 0, buttons: ex.web_lit_buttons() >>> 0,
      view: ex.ed_view_now(), playing: ex.ed_playing(), frozen: ex.ed_frozen(), dirty: ex.ed_dirty(), piece: ex.ed_piece_now(),
      moves: ex.ed_moves() };
    const nl = ex.ed_nlayers();
    msg.act = new Array(nl);
    let muted = 0, solo = 0, sounds = 0;
    for (let i = 0; i < nl; i++) {
      msg.act[i] = ex.ed_act(i);
      if (ex.ed_layer_muted(i)) muted |= 1 << i;
      if (ex.ed_layer_solo(i)) solo |= 1 << i;
      if (ex.ed_layer_sounds(i)) sounds |= 1 << i;
    }
    msg.muted = muted; msg.solo = solo; msg.sounds = sounds;

    if (this.pressEnd) { this.pressEnd = false; this.resend = true; this.end(); }

    // the values that moved. A text can change with no value moving (a slot's chord, a lane's chance), so a piece or a
    // library change sends them all
    const changed = [];
    for (const k of this.knobs) {
      const v = ex.ed_get(k);
      if (this.resend || this.last.get(k) !== v) {
        this.last.set(k, v);
        changed.push(k, v, globalThis.AislingEngine.str(this.mem, ex.ed_text(k)));
      }
    }
    this.resend = false;
    if (changed.length) msg.vals = changed;

    const transfer = [], blits = ex.web_blits();
    if (blits !== this.sentBlits) {
      this.sentBlits = blits;
      msg.fb = new Uint16Array(this.mem.buffer, ex.web_fb(), 240 * 240).slice();
      transfer.push(msg.fb.buffer);
    }
    const u = this.undo[this.undo.length - 1], r = this.redo[this.redo.length - 1];
    const hist = `${u ? u.label : ""}\n${r ? r.label : ""}`;
    if (hist !== this.sentHist) {
      this.sentHist = hist;
      msg.hist = { undo: u ? u.label : null, redo: r ? r.label : null };
    }
    if (changed.length || !(this.tick % 15)) {
      const p = globalThis.AislingEngine.pieces(ex), s = JSON.stringify(p);
      if (s !== this.sentPieces) { this.sentPieces = s; msg.pieces = p; }
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
    this.tick++;
    this.port.postMessage(msg, transfer);
  }

  process(inputs, outputs) {
    if (!this.ex) return true;
    const out = outputs[0], n = out[0].length, ex = this.ex;
    ex.web_render(n);
    out[0].set(new Float32Array(this.mem.buffer, ex.web_out_l(), n));
    if (out[1]) out[1].set(new Float32Array(this.mem.buffer, ex.web_out_r(), n));
    if (ex.web_midi_len()) ex.web_midi_clear();
    if (ex.web_said_len()) ex.web_said_clear();
    if (currentTime - this.lastFrame >= 1 / 30) {
      this.lastFrame = currentTime;
      this.publish();
    }
    return true;
  }
}

registerProcessor("aisling-editor", Editor);
