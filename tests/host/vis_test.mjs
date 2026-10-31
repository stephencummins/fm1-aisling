// SPDX-License-Identifier: GPL-3.0-only
// The visualiser (web/visualiser/index.html): its script parses, and it loads nothing but itself, so it runs from a
// file, offline, and nothing a visitor plays leaves their computer.
import fs from "fs";
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
for (const re of [/\bfetch\s*\(/, /XMLHttpRequest/, /\bimport\s*\(/, /new\s+(Shared)?Worker\s*\(/, /WebSocket/, /sendBeacon/,
  /EventSource/, /@import/, /url\(\s*["']?https?:/]) if (re.test(page)) bad.push("network: " + re);
console.log(bad.length ? bad.join("\n") : `ok: ${scripts.length} script, ${page.length} B, nothing fetched`);
process.exit(bad.length ? 1 : 0);
