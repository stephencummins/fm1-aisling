// SPDX-License-Identifier: GPL-3.0-only
// The visualiser (web/visualiser/index.html): its script parses, and it loads nothing but itself and its demo's sound
// (one file beside it, fetched on Demo), so it runs from a file, offline, and nothing a visitor plays leaves their
// computer.
import fs from "fs";
import path from "path";
import vm from "vm";
const page = fs.readFileSync(process.argv[2], "utf8");
const bad = [];
const scripts = [...page.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
if (!scripts.length) bad.push("no script");
for (const [, attrs, body] of scripts) {
  if (/\bsrc\s*=/.test(attrs)) bad.push("a script loaded from elsewhere");
  try { new vm.Script(body); } catch (e) { bad.push("script: " + e.message); }
}
for (const [tag] of page.matchAll(/<link\b[^>]*>/g)) if (!/href="data:/.test(tag)) bad.push("link: " + tag.slice(0, 60));
for (const [tag] of page.matchAll(/<(img|iframe|audio|video|source|object|embed)\b[^>]*>/g)) bad.push("loads: " + tag.slice(0, 60));
// the one fetch: the demo's sound, a file beside the page, with its notes for the page to paint
const fetches = [...page.matchAll(/\bfetch\s*\(([^)]*)\)/g)].map((m) => m[1].trim());
if (fetches.length !== 1 || fetches[0] !== "DEMO.file") bad.push("network: fetch(" + fetches.join("), fetch(") + ")");
const demo = page.match(/^const DEMO = \{ file: '([^'\/:]+)', bpm: \d+, loop: ([\d.]+), pad: [\d.]+, level: [\d.]+, notes: '([0-9a-z]*)' \}$/m);
let heard = "";
if (!demo) bad.push("no DEMO line, as tools/make_demo_track.py writes it");
else {
  const file = path.join(path.dirname(process.argv[2]), demo[1]);
  const size = fs.existsSync(file) ? fs.statSync(file).size : -1;
  if (size < 0) bad.push("the demo's sound is missing: " + demo[1]);
  else if (size > 3e6) bad.push(`the demo's sound is ${size} B (3 MB at most)`);
  if (!(+demo[2] > 0) || !demo[3].length || demo[3].length % 9) bad.push("the demo's notes don't parse");
  heard = ` but ${demo[1]} (${(size / 1e6).toFixed(1)} MB, ${demo[3].length / 9} notes) on Demo`;
}
for (const re of [/XMLHttpRequest/, /\bimport\s*\(/, /new\s+(Shared)?Worker\s*\(/, /WebSocket/, /sendBeacon/,
  /EventSource/, /@import/, /url\(\s*["']?https?:/]) if (re.test(page)) bad.push("network: " + re);
console.log(bad.length ? bad.join("\n") : `ok: ${scripts.length} script, ${page.length} B, nothing fetched${heard}`);
process.exit(bad.length ? 1 : 0);
