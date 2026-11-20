// SPDX-License-Identifier: GPL-3.0-only
// A sound pack's bytes, read and checked in the page as the FM-1 checks them (firmware/src/app/pack.h: pk_piece,
// pk_check), so a file is refused here, with the reason, before it is ever sent. No page in here: the test runs it
// alone, against the firmware's own checker (tests/web/packfile_test.mjs).
//
//   const r = AislingPackFile.read(bytes, { level, nparams });
//   r.why     0 a pack this AISLING can play; 1 not a pack; 2 a newer AISLING's; 3 damaged
//   r.name, r.version, r.level, r.pieces: [{ name, side: "saint" | "sinner", tempo, key, mode, air }]
(function () {
  "use strict";
  const FORMAT = 1, NPIECES = 8, HEAD = 32, NAME = 20, PNAME = 16, MAX = 3840;
  const LEVEL = 2, NPARAMS = 133;                    // AISLING 1.5's: what this page knows of, unless told
  const P_TEMPO = 18, P_ROOT = 19, P_MODE = 20, P_AIR = 132;
  const DEF = { [P_TEMPO]: 96, [P_ROOT]: 5, [P_MODE]: 1 };
  const KEYS = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
  const MODES = ["Major", "Dorian", "Phrygian", "Lydian", "Mixolyd.", "Minor", "Pent maj", "Pent min", "Hex maj", "Hex min", "Blues"];
  const WHY = ["", "This isn't an AISLING sound pack.", "This pack needs a newer AISLING.", "This pack is damaged: it doesn't read through."];
  const text = (b, at, n) => { let s = ""; for (let i = at; i < at + n && b[i]; i++) s += String.fromCharCode(b[i]); return s; };
  const i16 = (b, at) => { const v = b[at] | b[at + 1] << 8; return v >= 32768 ? v - 65536 : v; };

  function piece(b, len, i) {                        // piece i: where its parts are, or null if the pack ends first
    let o = HEAD;
    for (let k = 0; ; k++) {
      if (o + PNAME + 4 > len) return null;
      const p = { name: o, flags: b[o + PNAME], airN: b[o + PNAME + 1], npairs: b[o + PNAME + 2] };
      o += PNAME + 4;
      if (p.airN > 16 || o + 2 * p.airN + 3 * p.npairs > len) return null;
      p.airS = o;
      p.airD = o + p.airN;
      p.pairs = o + 2 * p.airN;
      o += 2 * p.airN + 3 * p.npairs;
      p.end = o;
      if (k === i) return p;
    }
  }

  function read(bytes, opt) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), len = b.length;
    const level = opt && opt.level != null ? opt.level : LEVEL, nparams = opt && opt.nparams ? opt.nparams : NPARAMS;
    const bad = (why) => ({ why, reason: WHY[why] });
    if (len < HEAD || len > MAX || text(b, 0, 4) !== "APK1" || b[4] !== FORMAT || (b[8] | b[9] << 8) !== len) return bad(1);
    if (b[5] > level) return bad(2);
    if (b[6] !== NPIECES || b[12 + NAME - 1] || !b[12]) return bad(3);
    const out = { why: 0, reason: "", name: text(b, 12, NAME), version: b[10] | b[11] << 8, level: b[5], size: len, pieces: [] };
    let p = null;
    for (let i = 0; i < NPIECES; i++) {
      p = piece(b, len, i);
      if (!p || b[p.name + PNAME - 1] || !b[p.name]) return bad(3);
      for (let k = 0; k < PNAME && b[p.name + k]; k++) if (b[p.name + k] < 32 || b[p.name + k] > 126) return bad(3);
      for (let k = 0; k < p.airN; k++) {
        const s = b[p.airS + k] >= 128 ? b[p.airS + k] - 256 : b[p.airS + k];
        if (!b[p.airD + k] || s < -24 || s > 36) return bad(3);
      }
      const val = Object.assign({}, DEF);
      for (let k = 0; k < p.npairs; k++) {
        const id = b[p.pairs + 3 * k];
        if (id >= nparams || id === P_AIR) return bad(3);
        if (id in val) val[id] = i16(b, p.pairs + 3 * k + 1);
      }
      out.pieces.push({ name: text(b, p.name, PNAME), side: p.flags & 1 ? "saint" : "sinner", tempo: val[P_TEMPO],
        key: KEYS[val[P_ROOT]] || "?", mode: MODES[val[P_MODE]] || "?", air: p.airN });
    }
    return p.end === len ? out : bad(3);
  }

  globalThis.AislingPackFile = { read, WHY, MAX };
})();
