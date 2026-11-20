// SPDX-License-Identifier: GPL-3.0-only
// web/packs/packfile.js against the firmware's checker (firmware/src/app/pack.h, pk_check): the same packs, good and
// broken every way the checker looks for, must get the same answer from both.
//   python3 tools/make_pack.py packs/saints-sinners.json && node tests/web/packfile_test.mjs
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
createRequire(import.meta.url)(path.join(ROOT, "web/packs/packfile.js"));
const out = path.join(ROOT, "build/host");
fs.mkdirSync(out, { recursive: true });
execFileSync("cc", ["-O1", "-I" + path.join(ROOT, "firmware/src/app"), "-o", path.join(out, "pk_check_main"), path.join(ROOT, "tests/web/pk_check_main.c")]);
const good = new Uint8Array(fs.readFileSync(path.join(ROOT, "build/packs/saints-sinners.aispack")));
const vary = (fn) => { const b = good.slice(); return fn(b) || b; };
const first = 32, air = first + 20, airN = good[first + 17], pairs = air + 2 * airN;
const CASES = {
  "as made": good,
  "empty": new Uint8Array(0),
  "cut short": good.slice(0, good.length - 7),
  "a byte too many": (() => { const b = new Uint8Array(good.length + 1); b.set(good); return b; })(),
  "cut short, its length put right": vary((b) => { const c = b.slice(0, b.length - 7); c[8] = c.length & 255; c[9] = c.length >> 8; return c; }),
  "not APK1": vary((b) => { b[0] = 0x58; }),
  "another format": vary((b) => { b[4] = 2; }),
  "a newer engine's": vary((b) => { b[5] = 3; }),
  "seven pieces": vary((b) => { b[6] = 7; }),
  "no name": vary((b) => { b[12] = 0; }),
  "a name with no end": vary((b) => { b.fill(65, 12, 32); }),
  "a piece with no name": vary((b) => { b[first] = 0; }),
  "a piece's name with no end": vary((b) => { b.fill(66, first, first + 16); }),
  "a piece's name not plain": vary((b) => { b[first + 1] = 200; }),
  "seventeen notes in an air": vary((b) => { b[first + 17] = 17; }),
  "an air's note of no length": vary((b) => { b[air + airN] = 0; }),
  "an air's note too high": vary((b) => { b[air] = 60; }),
  "an air's note too low": vary((b) => { b[air] = 256 - 30; }),
  "a parameter the engine has not": vary((b) => { b[pairs] = 133; }),
  "the air as a parameter": vary((b) => { b[pairs] = 132; }),
  "more pairs than there are": vary((b) => { b[first + 18] = 250; }),
  "too big": (() => { const b = new Uint8Array(4000); b.set(good); b[8] = 4000 & 255; b[9] = 4000 >> 8; return b; })(),
};
let bad = 0;
for (const [name, bytes] of Object.entries(CASES)) {
  const f = path.join(out, "pk_case.aispack");
  fs.writeFileSync(f, bytes);
  const c = +execFileSync(path.join(out, "pk_check_main"), [f], { encoding: "utf8" }), js = AislingPackFile.read(bytes).why;
  const ok = c === js;
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}: firmware ${c}, page ${js}`);
  bad += !ok;
}
const r = AislingPackFile.read(good);
const named = r.name === "Saints & Sinners" && r.pieces.length === 8 && r.pieces[1].name === "Rocky Road" && r.pieces[1].side === "sinner" &&
  r.pieces[1].tempo === 160 && r.pieces[1].key === "A" && r.pieces[1].mode === "Dorian" && r.pieces[0].side === "saint";
console.log(`${named ? "  ok  " : "FAIL  "}the pack's words read from its bytes`);
bad += !named;
console.log(bad ? `packfile: ${bad} FAILED` : "packfile: passed");
process.exit(bad ? 1 : 0);
