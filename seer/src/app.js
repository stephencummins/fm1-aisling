(() => {
  const FW = JSON.parse(document.getElementById("fw-data").textContent);
  const $ = (id) => document.getElementById(id);
  $("asof").textContent = "__ASOF__";
  $("count").textContent = `Seven questions, ${FW.length} firmwares. Some of the questions are strange. Answer them anyway.`;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const inViewer = !!(window.claude && window.claude.use);

  /* ---------- questions: each answer leans toward some traits ---------- */
  const Q = [
    ["A drawer in your kitchen hums at night. What is inside?", [
      ["A metronome nobody wound", { groove: 2, drums: 1 }], ["One candle, still lit", { ambient: 3 }],
      ["Graph paper, every square filled in", { tracker: 3 }], ["A cassette of your uncle's band", { vintage: 3, groove: 1 }]]],
    ["Which weather do you trust?", [
      ["Sea fog", { ambient: 3 }], ["Thunder, close by", { drums: 3 }],
      ["Sleet on a tin roof", { groove: 2, drums: 1 }], ["Heat haze over a motorway", { synth: 3 }]]],
    ["How many fingers should music need?", [
      ["Ten, and both feet", { synth: 2, chords: 2 }], ["One, pressing very carefully", { tracker: 2, chords: 1 }],
      ["None. It should play itself.", { ambient: 2, groove: 1 }], ["A cat's four paws", { other: 3, obscure: 1 }]]],
    ["A stranger hands you a key. It opens:", [
      ["A lighthouse with no keeper", { ambient: 3 }], ["A basement club at three in the morning", { groove: 3, drums: 1 }],
      ["A teenager's bedroom in 1987", { vintage: 3 }], ["A filing cabinet of other people's songs", { tracker: 2, chords: 1 }]]],
    ["What tempo is your heart, honestly?", [
      ["A drip in a cave", { ambient: 3 }], ["Walking pace, with a slight limp", { chords: 2, groove: 1 }],
      ["Hummingbird", { drums: 3 }], ["Whatever the grid says", { tracker: 3 }]]],
    ["Pick a smell.", [
      ["Ozone after a spark", { synth: 3 }], ["Warm solder", { vintage: 2, other: 1 }],
      ["Wet moss", { ambient: 3 }], ["Toast", { chords: 2, popular: 1 }]]],
    ["What frightens you most?", [
      ["Silence", { groove: 2, drums: 2 }], ["A wrong note", { chords: 3 }],
      ["Menus inside menus", { play: 2, popular: 1 }], ["Being understood", { obscure: 3, other: 1 }]]],
    ["Is the moon listening?", [
      ["Yes, and taking notes", { ambient: 2, tracker: 1 }], ["Only to the bass", { groove: 3 }],
      ["The moon is a sample", { vintage: 2, synth: 1 }], ["I would rather not say", { other: 2, obscure: 1 }]]],
    ["Before you flash anything, you:", [
      ["Try it in the browser first", { play: 3 }], ["Flash it and find out", { obscure: 2, synth: 1 }],
      ["Read every comment on GitHub", { popular: 3 }], ["Ask the cat", { other: 2 }]]],
    ["Choose a passenger for a long night drive.", [
      ["A theremin in the back seat", { synth: 2, other: 1 }], ["A drummer who will not stop", { drums: 3 }],
      ["A small choir in the boot", { chords: 2, ambient: 1 }], ["A tape deck that eats tapes", { vintage: 3 }]]],
    ["Do you want what everyone else wants?", [
      ["Yes, and quickly", { popular: 3 }], ["No. Never.", { obscure: 3 }],
      ["Only at weekends", { popular: 1, groove: 1 }], ["I want what the moon wants", { ambient: 2 }]]],
    ["Which number feels warmest?", [
      ["3", { chords: 1, ambient: 1 }], ["16", { tracker: 2, drums: 1 }], ["128", { groove: 2 }], ["0x7D", { other: 2, obscure: 1 }]]],
    ["Something is knocking inside your FM-1. You:", [
      ["Knock back, in four-four", { groove: 2, drums: 1 }], ["Record it", { vintage: 1, other: 1, tracker: 1 }],
      ["Let it in", { ambient: 2, synth: 1 }], ["Reflash it and say nothing", { popular: 1, play: 1 }]]],
    ["A hare crosses the road in front of you. You:", [
      ["Follow it", { obscure: 2, ambient: 1 }], ["Count its hops", { tracker: 2, drums: 1 }],
      ["Hum it a tune", { chords: 2, synth: 1 }], ["Wave. It's an old friend.", { vintage: 2, popular: 1 }]]],
    ["How many cables is too many?", [
      ["One", { chords: 1, popular: 1 }], ["Forty, minimum", { synth: 2, obscure: 1 }],
      ["Cables are a cry for help", { tracker: 1, play: 1 }], ["Ask me after the gig", { groove: 2 }]]],
  ];
  const N = 7;
  const KIND_NAME = { synth: "synth", groove: "groovebox", drums: "drums", tracker: "tracker", chords: "chords", other: "something else" };

  /* ---------- what the ticket says ---------- */
  const OMENS = {
    ambient: ["A long note is coming your way. Do not interrupt it.", "You will spend an evening watching a drone and call it work.", "Fog is on your side this week."],
    groove: ["Your foot is already tapping. The neighbours have noticed.", "A bassline will follow you home. Let it in.", "Somewhere, a crowd is waiting for the drop. It is you."],
    drums: ["Something will be hit, repeatedly, and it will be your decision.", "A hi-hat will change your life. Possibly an open one.", "Thunder recognises you as one of its own."],
    tracker: ["You will find peace in hexadecimal. Tell no one.", "A column of numbers will make you weep, in a good way.", "Your future is in pattern 0F, row 3C."],
    chords: ["A minor seventh will change your week.", "Someone will ask what that chord was. You won't know.", "Harmony is in your stars, and it is slightly jazzy."],
    synth: ["An oscillator is thinking about you right now.", "You will turn a knob and something will happen.", "Electricity has chosen you. Do not resist."],
    vintage: ["An old cassette holds the answer. You taped over it in 1991.", "Something beige from the eighties will speak to you.", "Dust off the past. It still has batteries in it."],
    other: ["The cat has a plan. Go along with it.", "You are not like the others. Neither is your firmware.", "A strange noise will become your favourite noise."],
    obscure: ["You will love something nobody else has heard of. Keep it that way.", "Twelve people will understand you. That is plenty.", "The road less flashed is calling."],
    popular: ["Ten thousand people cannot be wrong. Probably.", "You will join a crowd and enjoy it, against your better judgement.", "Fortune favours the well-reviewed."],
    play: ["Try before you flash and you will never flash in vain.", "Your browser knows more than it lets on.", "Caution is a kind of courage. A small kind."],
  };
  const ECHOES = [
    (a) => `You said "${a}". The machine has made a note.`,
    (a) => `"${a}", you said. The machine believes you.`,
    (a) => `When you said "${a}", a bulb flickered. That is significant.`,
    (a) => `The machine heard "${a}" and will not forget it.`,
  ];
  const WAVES = ["sine", "saw", "square", "triangle", "noise", "a wave nobody has named yet"];

  /* ---------- tilt: the machine always says AISLING ---------- */
  const AISLING = FW.find((f) => f.n === "AISLING") || FW.find((f) => /aisling/i.test(f.n));
  let tilted = location.hash === "#tilt" || store.get("seer-tilt") === "1";
  const tiltBtn = $("tilt");
  function setTilt(on) {
    tilted = on && !!AISLING; store.set("seer-tilt", tilted ? "1" : "0");
    $("cabinet").classList.toggle("tilted", tilted);
    tiltBtn.setAttribute("aria-pressed", String(tilted));
    tiltBtn.textContent = tilted ? "Tilted" : "Tilt";
  }
  tiltBtn.addEventListener("click", () => { setTilt(!tilted); bell(tilted ? 220 : 330, 0, 0.5, 1.5, 4, 0.12); stir(); });
  addEventListener("hashchange", () => { if (location.hash === "#tilt") setTilt(true); });

  /* ---------- the seer: a hooded automaton behind glass ---------- */
  const cv = $("seer"), g = cv.getContext("2d");
  const W = cv.width, H = cv.height;
  const sparks = Array.from({ length: 60 }, () => ({ a: Math.random() * 6.283, r: Math.random() * 0.85, s: 0.003 + Math.random() * 0.007, z: Math.random() }));
  let excite = 0, speaking = 0, blink = 0, nextBlink = 2000;
  function drawSeer(t) {
    const sway = reduce ? 0 : Math.sin(t / 1700) * 5, bob = reduce ? 0 : Math.sin(t / 1100) * 2.5;
    const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#1c0d2a"); bg.addColorStop(1, "#08050d");
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    for (let x = 0; x < W; x += 30) { g.fillStyle = `rgba(0,0,0,${0.14 + 0.1 * Math.sin(x / 19)})`; g.fillRect(x, 0, 14, H); }
    const halo = g.createRadialGradient(300, 210, 20, 300, 230, 300);
    halo.addColorStop(0, `rgba(242,210,124,${0.10 + excite * 0.12})`); halo.addColorStop(1, "rgba(242,210,124,0)");
    g.fillStyle = halo; g.fillRect(0, 0, W, H);
    g.save(); g.translate(sway, bob);
    const robe = g.createLinearGradient(0, 200, 0, H); robe.addColorStop(0, "#5a2384"); robe.addColorStop(1, "#24103a");
    g.fillStyle = robe;
    g.beginPath(); g.moveTo(300, 52);
    g.bezierCurveTo(392, 52, 428, 150, 418, 250); g.bezierCurveTo(470, 290, 520, 360, 540, 540);
    g.lineTo(60, 540); g.bezierCurveTo(80, 360, 130, 290, 182, 250); g.bezierCurveTo(172, 150, 208, 52, 300, 52);
    g.closePath(); g.fill();
    g.strokeStyle = "#c99b3f"; g.lineWidth = 3;
    g.beginPath(); g.moveTo(300, 300); g.lineTo(300, 540); g.stroke();
    g.beginPath(); for (let y = 320; y < 540; y += 26) { g.moveTo(292, y); g.quadraticCurveTo(300, y - 10, 308, y); } g.stroke();
    g.fillStyle = "#050308"; g.beginPath(); g.ellipse(300, 182, 62, 82, 0, 0, 6.283); g.fill();
    g.strokeStyle = "#d6ab4c"; g.lineWidth = 4; g.beginPath(); g.ellipse(300, 182, 66, 86, 0, 0, 6.283); g.stroke();
    g.strokeStyle = "rgba(214,171,76,.45)"; g.lineWidth = 1.5; g.setLineDash([3, 6]); g.beginPath(); g.ellipse(300, 182, 74, 94, 0, 0, 6.283); g.stroke(); g.setLineDash([]);
    if (!reduce) { nextBlink -= 16; if (nextBlink < 0) { blink = 1; nextBlink = 2500 + Math.random() * 3500; } blink = Math.max(0, blink - 0.12); }
    const open = 1 - Math.sin(Math.min(1, blink) * Math.PI) * 0.95;
    const eye = 0.65 + excite * 0.3 + speaking * 0.25;
    g.save(); g.shadowColor = "#ffd27a"; g.shadowBlur = 18 + 20 * eye;
    g.fillStyle = `rgba(255,218,140,${Math.min(1, eye)})`;
    for (const [i, ex] of [[0, 276], [1, 324]]) {
      const wink = tilted && i === 1 && Math.sin(t / 2600) > 0.93 ? 0.1 : 1;   // tilted: now and then, she winks
      g.beginPath(); g.ellipse(ex, 176, 10, (5.5 * open + 0.5) * wink, 0, 0, 6.283); g.fill();
    }
    g.restore();
    const m = speaking ? 2 + Math.abs(Math.sin(t / 90)) * 5 : 1;
    g.fillStyle = `rgba(242,210,124,${0.15 + speaking * 0.5})`; g.beginPath(); g.ellipse(300, 222, 13, m, 0, 0, 6.283); g.fill();
    g.restore();
    const ox = 300, oy = 420, R = 70;
    const og = g.createRadialGradient(ox - 24, oy - 28, 8, ox, oy, R);
    og.addColorStop(0, "rgba(255,240,215,.45)"); og.addColorStop(0.5, `rgba(107,47,160,${0.45 + excite * 0.2})`); og.addColorStop(1, "rgba(14,6,22,.95)");
    g.fillStyle = og; g.beginPath(); g.arc(ox, oy, R, 0, 6.283); g.fill();
    g.save(); g.beginPath(); g.arc(ox, oy, R - 2, 0, 6.283); g.clip();
    for (const p of sparks) {
      if (!reduce) { p.a += p.s * (1 + excite * 5); p.r += Math.sin(t / 800 + p.z * 9) * 0.002; }
      const rr = Math.min(0.92, Math.abs(p.r)) * R;
      g.fillStyle = `rgba(255,${200 + p.z * 40},${120 + p.z * 60},${0.3 + p.z * 0.6})`;
      g.beginPath(); g.arc(ox + Math.cos(p.a) * rr, oy + Math.sin(p.a * 1.3) * rr * 0.8, 1 + p.z * 2.2, 0, 6.283); g.fill();
    }
    g.restore();
    g.strokeStyle = "rgba(214,171,76,.8)"; g.lineWidth = 2.5; g.beginPath(); g.arc(ox, oy, R, 0, 6.283); g.stroke();
    g.fillStyle = "rgba(255,255,255,.16)"; g.beginPath(); g.ellipse(ox - 26, oy - 32, 16, 8, -0.6, 0, 6.283); g.fill();
    const hv = reduce ? 0 : Math.sin(t / 650) * 4 + excite * Math.sin(t / 70) * 3;
    for (const [hx, dir] of [[214, 1], [386, -1]]) {
      const hy = 380 + (dir > 0 ? hv : -hv);
      g.fillStyle = "#3d1a5a"; g.beginPath(); g.moveTo(hx - 40 * dir, 300); g.quadraticCurveTo(hx - 50 * dir, hy - 10, hx - 8 * dir, hy - 14); g.lineTo(hx + 4 * dir, hy + 18); g.quadraticCurveTo(hx - 64 * dir, hy + 10, hx - 70 * dir, 320); g.closePath(); g.fill();
      g.fillStyle = "#d9c3a0"; g.beginPath(); g.ellipse(hx + 6 * dir, hy, 15, 21, dir * 0.5, 0, 6.283); g.fill();
      g.fillStyle = "#cdb48d"; for (let f = 0; f < 4; f++) { g.beginPath(); g.ellipse(hx + (16 + f * 3) * dir, hy - 14 + f * 9, 9, 4, dir * 0.3, 0, 6.283); g.fill(); }
    }
    g.fillStyle = "#120a1a"; g.fillRect(0, 498, W, 42);
    g.fillStyle = "#d6ab4c"; g.fillRect(0, 496, W, 3);
    g.fillStyle = "#8f6d2a"; g.beginPath(); g.moveTo(258, 498); g.lineTo(342, 498); g.lineTo(328, 484); g.lineTo(272, 484); g.closePath(); g.fill();
    const glass = g.createLinearGradient(0, 0, W, H); glass.addColorStop(0.15, "rgba(255,255,255,0)"); glass.addColorStop(0.22, "rgba(255,255,255,.06)"); glass.addColorStop(0.3, "rgba(255,255,255,0)");
    g.fillStyle = glass; g.fillRect(0, 0, W, H);
    excite *= 0.97;
    if (!reduce) requestAnimationFrame(drawSeer);
  }
  requestAnimationFrame(drawSeer);
  const stir = () => { excite = 1; if (reduce) requestAnimationFrame(drawSeer); };

  /* ---------- sound: a small two-operator FM bell, after a click only ---------- */
  let ac = null, muted = store.get("seer-muted") === "1";
  const muteBtn = $("mute");
  const setMute = () => { muteBtn.textContent = muted ? "Sound off" : "Sound on"; muteBtn.setAttribute("aria-pressed", String(muted)); };
  setMute();
  muteBtn.addEventListener("click", () => { muted = !muted; setMute(); store.set("seer-muted", muted ? "1" : "0"); if (muted) stopVoice(); });
  function bell(freq, when = 0, dur = 1.6, ratio = 3.5, index = 3, vol = 0.16) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime + when, car = ac.createOscillator(), mod = ac.createOscillator(), mg = ac.createGain(), out = ac.createGain();
      car.frequency.value = freq; mod.frequency.value = freq * ratio;
      mg.gain.setValueAtTime(freq * index, t); mg.gain.exponentialRampToValueAtTime(1, t + dur);
      out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(vol, t + 0.01); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      mod.connect(mg).connect(car.frequency); car.connect(out).connect(ac.destination);
      car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
    } catch (e) {}
  }
  const coinSound = () => { bell(1320, 0, 0.25, 1.41, 6, 0.11); bell(990, 0.09, 0.35, 1.41, 5, 0.09); bell(140, 0.3, 0.3, 1, 2, 0.12); };
  const tick = () => bell(587 + Math.random() * 196, 0, 0.3, 2, 1.5, 0.06);
  const printSound = () => { for (let i = 0; i < 18; i++) bell(2400 + Math.random() * 600, i * 0.1, 0.05, 1.7, 8, 0.03); bell(784, 2.0, 1.4, 3.5, 2, 0.1); bell(1046.5, 2.15, 1.6, 3.5, 2, 0.1); };

  /* ---------- the machine's voice: claude.ai's inside a viewer, the browser's on the site ---------- */
  let tts = null;
  const webVoice = !inViewer && "speechSynthesis" in window;
  if (inViewer) claude.use("tts").then((t) => { tts = t; refreshSay(); t?.onState?.(({ state }) => { speaking = state === "speaking" ? 1 : 0; }); }).catch(() => {});
  const canSay = () => inViewer ? !!tts : webVoice;
  function refreshSay() { const b = $("say"); if (b) b.hidden = !canSay(); }
  function stopVoice() { try { tts?.stop?.(); } catch (e) {} try { if (webVoice) speechSynthesis.cancel(); } catch (e) {} speaking = 0; }
  async function say(text) {
    stopVoice();
    if (muted) return;
    if (inViewer && tts) {
      try { speaking = 1; await tts.speak(text, { voice: "airy", rate: 0.92 }); }
      catch (e) { if (e?.code === "not_granted") { tts = null; refreshSay(); } }
      finally { speaking = 0; }
    } else if (webVoice) {
      const u = new SpeechSynthesisUtterance(text);
      const vs = speechSynthesis.getVoices();
      const v = vs.find((v) => /en-IE/i.test(v.lang)) || vs.find((v) => /en-GB/i.test(v.lang));
      if (v) u.voice = v;
      u.rate = 0.92; u.pitch = 0.85;
      u.onstart = () => { speaking = 1; }; u.onend = u.onerror = () => { speaking = 0; };
      speechSynthesis.speak(u);
    }
  }

  /* ---------- the game ---------- */
  const stage = $("stage"), result = $("result"), voice = $("voice"), coinBtn = $("coin");
  let asked = [], traits = {}, heard = [], current = null;
  const MURMURS = ["Hm.", "I see.", "The bulbs flicker.", "Go on.", "As I suspected.", "The orb warms.", "Interesting.", "Noted."];
  const intro = stage.innerHTML;

  function start() {
    coinSound(); stir(); stopVoice();
    coinBtn.disabled = true;
    asked = shuffle(Q).slice(0, N); traits = {}; heard = []; current = null;
    result.hidden = true; result.innerHTML = "";
    ask(0);
    $("stage").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }
  function ask(i) {
    const [q, answers] = asked[i];
    voice.textContent = q;
    const order = shuffle(answers);
    stage.innerHTML = `
      <div class="progress"><span>Question ${i + 1} of ${N}</span><span class="pips" aria-hidden="true">${Array.from({ length: N }, (_, k) => `<b class="${k <= i ? "on" : ""}"></b>`).join("")}</span></div>
      <ul class="answers">${order.map((a, k) => `<li><button type="button"><kbd>${"ABCD"[k]}</kbd><span>${esc(a[0])}</span></button></li>`).join("")}</ul>`;
    stage.querySelectorAll("button").forEach((b, k) => b.addEventListener("click", () => answer(i, order[k])));
    stage.querySelector("button").focus({ preventScroll: true });
  }
  function answer(i, a) {
    tick(); stir();
    heard.push(a[0]);
    for (const [k, v] of Object.entries(a[1])) traits[k] = (traits[k] || 0) + v;
    if (i + 1 < N) { voice.textContent = pick(MURMURS); setTimeout(() => ask(i + 1), reduce ? 0 : 380); }
    else divine();
  }

  function weighted(items) {
    const total = items.reduce((t, [, w]) => t + w, 0);
    let r = Math.random() * total;
    for (const [x, w] of items) { if ((r -= w) <= 0) return x; }
    return items[0][0];
  }
  function chooseFirmware() {
    if (tilted && AISLING) return AISLING;
    const maxI = Math.log10(1 + Math.max(...FW.map((f) => f.i)));
    const T = (k) => traits[k] || 0;
    const top = FW.map((f) => {
      const pop = Math.log10(1 + f.i) / maxI;
      return [2.2 * T(f.k) + 2 * (f.am ? T("ambient") : -0.25 * T("ambient")) + 2 * (f.vi ? T("vintage") : -0.15 * T("vintage"))
        + (f.p ? 1.2 * T("play") : 0) + 2 * pop * T("popular") + 2 * (1 - pop) * T("obscure") + (f.b ? -0.5 : 0) + Math.random() * 2.5, f];
    }).sort((a, b) => b[0] - a[0]).slice(0, 5);
    return weighted(top.map(([, f], k) => [f, 5 - k]));
  }
  function writeFortune(fw) {
    const lean = tilted ? { ...traits, ambient: (traits.ambient || 0) + 6 } : traits;
    const ranked = Object.entries(lean).sort((a, b) => b[1] - a[1] || Math.random() - 0.5).map(([k]) => k);
    const first = ranked[0] || "other", second = ranked.find((k) => k !== first) || "synth";
    return {
      omens: [pick(OMENS[first]), pick(ECHOES)(pick(heard)), pick(OMENS[second])],
      lucky: { "MIDI channel": rnd(1, 16), "Tempo": `${rnd(62, 174)} BPM`, "CC number": rnd(1, 119), "Waveform": pick(WAVES) },
    };
  }

  function divine() {
    stage.innerHTML = `<p class="note">The machine is thinking…</p>`;
    voice.textContent = "The spirits of the flash chip are consulted…";
    excite = 1.8;
    const fw = chooseFirmware(), f = writeFortune(fw);
    current = { fw, f };
    setTimeout(() => {
      voice.textContent = "Your fortune is printed. Take it from the slot.";
      printTicket(fw, f);
    }, reduce ? 0 : 1300);
  }

  function printTicket(fw, f) {
    printSound(); stir();
    const no = String(rnd(1, 9999)).padStart(4, "0");
    const links = [
      fw.r && `<a href="https://github.com/${esc(fw.r)}" target="_blank" rel="noopener">Source</a>`,
      fw.p && `<a href="${esc(fw.p)}" target="_blank" rel="noopener">Try it in the browser</a>`,
      `<a href="https://thefirmwarehub.com" target="_blank" rel="noopener">The Firmware Hub</a>`,
    ].filter(Boolean).join("");
    const what = fw.w && fw.w.length > 220 ? fw.w.slice(0, 217).replace(/\s+\S*$/, "") + "…" : fw.w;
    result.innerHTML = `
      <div class="ticket-run">
        <article class="ticket" aria-label="Your fortune">
          <header class="t-head"><b>Your Fortune</b><span>No. ${no} · read by the Flash Seer</span></header>
          ${f.omens.map((o) => `<p class="fortune">${esc(o)}</p>`).join("")}
          <dl class="lucky">${Object.entries(f.lucky).map(([k, v]) => `<div><dt>Lucky ${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
          <div class="prescribe">
            <small>The machine prescribes</small>
            <h2 class="fw-name">${esc(fw.n)}</h2>
            <p class="fw-by">by ${esc(fw.a)}</p>
          </div>
          ${what ? `<p class="fw-what">${esc(what)}</p>` : ""}
          <p class="fw-meta">${esc(KIND_NAME[fw.k] || fw.k)}${fw.v ? ` · ${esc(fw.v)}${fw.b ? " beta" : ""}` : ""}${fw.id ? ` · ${esc(fw.id)}` : ""} · ${fw.i.toLocaleString("en-GB")} installs</p>
          <div class="links">${links}</div>
          <p class="t-foot">Keep this ticket. Show it to your FM-1.</p>
        </article>
      </div>
      <div class="after">
        <button class="btn line" id="say" type="button" hidden>Hear her say it</button>
        <button class="btn gold" id="again" type="button">Another coin</button>
      </div>`;
    result.hidden = false;
    stage.innerHTML = intro;
    $("count").textContent = `She heard: ${heard.join(" · ")}.`;
    coinBtn.disabled = false;
    $("again").addEventListener("click", () => { $("cabinet").scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); start(); });
    $("say").addEventListener("click", () => say(`${f.omens.join(" ")} The machine prescribes ${fw.n}, by ${fw.a}.`));
    refreshSay();
    setTimeout(() => result.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), reduce ? 0 : 400);
  }

  coinBtn.addEventListener("click", start);
  setTilt(tilted);
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = "abcd".indexOf(e.key.toLowerCase());
    const btns = stage.querySelectorAll(".answers button");
    if (k >= 0 && btns[k]) btns[k].click();
  });
})();
