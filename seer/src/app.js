(() => {
  const FW = JSON.parse(document.getElementById("fw-data").textContent);
  const SIDHE = JSON.parse(document.getElementById("sidhe-data").textContent);
  const $ = (id) => document.getElementById(id);
  $("asof").textContent = "__ASOF__";
  $("count").textContent = `Seven questions, three cards, ${FW.length} firmwares. Some of the questions are strange. Answer them anyway.`;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const firstSentence = (s) => (String(s).match(/^.*?[.!?](\s|$)/) || [s])[0].trim();
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
  const POSITIONS = ["What hums in you", "What you seek", "What you must flash"];
  const KIND_NAME = { synth: "synth", groove: "groovebox", drums: "drums", tracker: "tracker", chords: "chords", other: "other" };

  /* ---------- the two decks, in one shape ---------- */
  const SIDHE_TRAITS = {
    "fool": ["other", "obscure"], "magician": ["synth", "play"], "high-priestess": ["synth", "ambient"],
    "empress": ["popular", "chords"], "emperor": ["tracker", "popular"], "hierophant": ["vintage"],
    "lovers": ["chords"], "chariot": ["drums", "groove"], "strength": ["drums"], "hermit": ["tracker", "ambient"],
    "wheel-of-fortune": ["groove", "play"], "justice": ["tracker"], "hanged-man": ["other", "obscure"],
    "death": ["vintage"], "temperance": ["chords", "ambient"], "devil": ["groove", "drums"], "tower": ["drums"],
    "star": ["ambient"], "moon": ["ambient", "other"], "sun": ["groove", "popular"], "judgement": ["vintage", "obscure"],
    "world": ["popular"],
  };
  const SIDHE_NUM = { "fool": "0", "magician": "I", "high-priestess": "II", "empress": "III", "emperor": "IV", "hierophant": "V",
    "lovers": "VI", "chariot": "VII", "strength": "VIII", "hermit": "IX", "wheel-of-fortune": "X", "justice": "XI",
    "hanged-man": "XII", "death": "XIII", "temperance": "XIV", "devil": "XV", "tower": "XVI", "star": "XVII", "moon": "XVIII",
    "sun": "XIX", "judgement": "XX", "world": "XXI" };
  const VBACK = `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="300" rx="10" fill="#1d1c1a"/>
    <rect x="10" y="10" width="180" height="280" rx="6" fill="none" stroke="#ff5a1f" stroke-width="1.5"/>
    ${Array.from({ length: 30 }, (_, i) => `<circle cx="${40 + (i % 5) * 30}" cy="${60 + Math.floor(i / 5) * 36}" r="7" fill="#bfb9ac"/><circle cx="${40 + (i % 5) * 30}" cy="${60 + Math.floor(i / 5) * 36}" r="3.4" fill="#1d1c1a"/>`).join("")}
    <path d="M40 60 C40 120 130 100 130 168 M160 96 C160 160 70 170 70 240" fill="none" stroke="#ff5a1f" stroke-width="4" stroke-linecap="round"/>
    <path d="M100 132 C100 190 40 200 40 276" fill="none" stroke="#f2c500" stroke-width="4" stroke-linecap="round"/></svg>`;
  const DECKS = {
    sidhe: {
      title: "the Sídhe Celtic Mythology deck", storyWord: "story", meaningType: "celtic",
      cards: SIDHE.map((c) => ({ slug: c.slug, name: c.name, trad: c.name, num: SIDHE_NUM[c.slug], traits: SIDHE_TRAITS[c.slug] || ["other"],
        kw: c.kw, up: c.up, rev: c.rev, story: c.myth })),
      front: (c) => `<img class="front" src="cards/${c.slug}${reduce ? "-still" : ""}.webp" alt="${esc(c.name)}${c.rev_ ? ", reversed" : ""}, from the Sídhe Celtic deck" width="240" height="360">`,
      back: () => `<img class="back" src="img/back.webp" alt="" width="240" height="430">`,
    },
    voltage: {
      title: "the Voltage Arcana, a Major Arcana for synthesists", storyWord: "lore", meaningType: "traditional",
      cards: VOLTAGE.map((c) => ({ slug: c.slug, name: c.name, trad: c.trad, num: c.num, traits: c.traits, kw: c.kw, up: c.up, rev: c.rev, story: c.lore, svg: c.svg })),
      front: (c) => `<div class="vfront" role="img" aria-label="${esc(c.name)}${c.rev_ ? ", reversed" : ""}, from the Voltage Arcana">${c.svg}</div>`,
      back: () => `<div class="vback" aria-hidden="true">${VBACK}</div>`,
    },
  };
  let deckKey = DECKS[store.get("seer-deck")] ? store.get("seer-deck") : "sidhe";
  const deckBtns = [...document.querySelectorAll(".decks button")];
  function setDeck(k) {
    deckKey = k; store.set("seer-deck", k);
    deckBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.deck === k)));
  }
  deckBtns.forEach((b) => b.addEventListener("click", () => { setDeck(b.dataset.deck); tick(); }));
  setDeck(deckKey);

  /* ---------- tilt: the machine always says AISLING ---------- */
  const AISLING = FW.find((f) => f.n === "AISLING") || FW.find((f) => /aisling/i.test(f.n));
  let tilted = location.hash === "#tilt" || store.get("seer-tilt") === "1";
  const tiltBtn = $("tilt");
  function setTilt(on) {
    tilted = on && !!AISLING; store.set("seer-tilt", tilted ? "1" : "0");
    $("case").classList.toggle("tilted", tilted);
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
  const coinSound = () => { bell(1320, 0, 0.25, 1.41, 6, 0.11); bell(990, 0.09, 0.35, 1.41, 5, 0.09); };
  const tick = () => bell(587 + Math.random() * 196, 0, 0.3, 2, 1.5, 0.06);
  const flipSound = (i) => bell([392, 493.88, 587.33][i] || 440, 0, 1.8, 3.5, 2.2, 0.11);

  /* ---------- the full reading and the voice: claude.ai's runtime inside a viewer, Sídhe's engine and the browser's voice on the site ---------- */
  let sample = null, tts = null;
  const webVoice = !inViewer && "speechSynthesis" in window;
  if (inViewer) {
    claude.use("sample").then((s) => { sample = s; refreshActions(); }).catch(() => {});
    claude.use("tts").then((t) => { tts = t; refreshActions(); t?.onState?.(({ state }) => { speaking = state === "speaking" ? 1 : 0; }); }).catch(() => {});
  }
  const canAsk = () => inViewer ? !!sample : true;
  const canSay = () => inViewer ? !!tts : webVoice;
  let current = null;
  function refreshActions() {
    if (!current) return;
    const ask = $("ask"), say = $("say");
    if (ask) ask.hidden = !canAsk();
    if (say) say.hidden = !canSay();
  }
  function stopVoice() { try { tts?.stop?.(); } catch (e) {} try { if (webVoice) speechSynthesis.cancel(); } catch (e) {} speaking = 0; }

  /* ---------- the game ---------- */
  const stage = $("stage"), result = $("result"), voice = $("voice");
  let asked = [], traits = {}, heard = [];
  const MURMURS = ["Hm.", "I see.", "The cards stir.", "Go on.", "As I thought.", "The orb warms.", "Interesting."];

  function start() {
    coinSound(); stir(); stopVoice();
    asked = shuffle(Q).slice(0, N); traits = {}; heard = []; current = null;
    result.hidden = true; result.innerHTML = "";
    ask(0);
  }
  function ask(i) {
    const [q, answers] = asked[i];
    voice.textContent = q;
    stage.hidden = false;
    const order = shuffle(answers);
    stage.innerHTML = `
      <div class="progress"><span>Question ${i + 1} of ${N}</span><span class="pips" aria-hidden="true">${Array.from({ length: N }, (_, k) => `<b class="${k <= i ? "on" : ""}"></b>`).join("")}</span></div>
      <ul class="answers">${order.map((a, k) => `<li><button type="button" data-k="${k}"><kbd>${"ABCD"[k]}</kbd><span>${esc(a[0])}</span></button></li>`).join("")}</ul>`;
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
  function chooseCards(deck) {
    const lean = tilted ? { ...traits, ambient: (traits.ambient || 0) + 8, synth: (traits.synth || 0) + 4 } : traits;
    const out = [];
    while (out.length < 3) {
      const left = deck.cards.filter((c) => !out.includes(c));
      out.push(weighted(left.map((c) => [c, 1 + c.traits.reduce((t, k) => t + (lean[k] || 0), 0) ** 1.4])));
    }
    return out.map((c) => ({ ...c, rev_: Math.random() < (tilted ? 0.12 : 0.3) }));
  }

  function divine() {
    stage.hidden = true;
    voice.textContent = "Let me shuffle…";
    excite = 1.8;
    const deck = DECKS[deckKey];
    const fw = chooseFirmware(), cards = chooseCards(deck);
    setTimeout(() => show(deck, fw, cards), reduce ? 0 : 900);
  }

  const fallbackReading = (fw, cards) =>
    cards.map((c, i) => `${POSITIONS[i]}: ${c.name}${c.rev_ ? ", reversed" : ""}. ${firstSentence(c.rev_ ? c.rev : c.up)}`).join("\n")
    + `\n\nThe cards point one way: flash ${fw.n}.`;

  function show(deck, fw, cards) {
    current = { deck, fw, cards };
    voice.textContent = "Your cards.";
    const links = [
      fw.r && `<a href="https://github.com/${esc(fw.r)}" target="_blank" rel="noopener">Source on GitHub</a>`,
      fw.p && `<a href="${esc(fw.p)}" target="_blank" rel="noopener">Try it in the browser</a>`,
      `<a href="https://thefirmwarehub.com" target="_blank" rel="noopener">Install from the hub</a>`,
    ].filter(Boolean).join("");
    result.innerHTML = `
      <div class="spread">${cards.map((c, i) => `
        <div class="pos">
          <span class="pos-label">${POSITIONS[i]}</span>
          <div class="card${c.rev_ ? " rev" : ""}" id="card${i}"><div class="card-inner">${deck.front(c)}${deck.back()}</div></div>
          <p class="card-name">${esc(c.name)}</p>
          <span class="card-state">${c.num} · ${c.rev_ ? "reversed" : "upright"}</span>
          <p class="card-kw">${esc(c.kw.slice(0, 2).join(", "))}</p>
        </div>`).join("")}
      </div>
      <section class="reading" aria-live="polite">
        <h2>The reading</h2>
        <p class="reading-text" id="reading">${esc(fallbackReading(fw, cards))}</p>
        <div class="reading-actions">
          <button class="ghost" id="ask" type="button" hidden>Hear her full reading</button>
          <button class="ghost" id="say" type="button" hidden>Speak it aloud</button>
        </div>
        <p class="fine" id="ask-note" hidden></p>
      </section>
      <article class="ticket" aria-label="Your firmware">
        <span class="eyebrow">Flash this</span>
        <h2 class="fw-name">${esc(fw.n)}</h2>
        <p class="fw-by">by ${esc(fw.a)}</p>
        ${fw.w ? `<p class="fw-what">${esc(fw.w)}</p>` : ""}
        <dl class="specs">
          <div><dt>Kind</dt><dd>${esc(KIND_NAME[fw.k] || fw.k)}${fw.am ? " · ambient" : ""}${fw.vi ? " · vintage" : ""}</dd></div>
          ${fw.v ? `<div><dt>Version</dt><dd>${esc(fw.v)}${fw.b ? " beta" : ""}</dd></div>` : ""}
          ${fw.id ? `<div><dt>Identity</dt><dd>${esc(fw.id)}</dd></div>` : ""}
          <div><dt>Installs</dt><dd>${fw.i.toLocaleString("en-GB")}</dd></div>
        </dl>
        <div class="links">${links}</div>
      </article>
      <section class="myths" aria-label="The stories behind the cards">
        ${cards.map((c) => `<details><summary>The ${deck.storyWord} of ${esc(c.name)}</summary><p>${esc(c.story)}</p></details>`).join("")}
      </section>
      <p class="heard">She heard: ${heard.map((h) => `<em>${esc(h)}</em>`).join(", ")}.</p>
      <button class="coin" id="again" type="button">Another coin</button>`;
    result.hidden = false;
    cards.forEach((c, i) => setTimeout(() => { $("card" + i).classList.add("open"); flipSound(i); stir(); }, reduce ? 0 : 500 + i * 900));
    setTimeout(() => { voice.textContent = `${fw.n}. That is what you must flash.`; }, reduce ? 0 : 3200);
    $("again").addEventListener("click", start);
    $("ask").addEventListener("click", askSeer);
    $("say").addEventListener("click", sayIt);
    refreshActions();
    result.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  /* Claude, inside a viewer */
  function seerPrompt({ deck, fw, cards }) {
    const lines = cards.map((c, i) => `${i + 1}. ${POSITIONS[i]}: ${c.name}${c.trad !== c.name ? ` (it stands for ${c.trad})` : ""}, ${c.rev_ ? "reversed" : "upright"}.
   Meaning: ${c.rev_ ? c.rev : c.up}
   Its ${deck.storyWord}: ${c.story}`).join("\n");
    return `You are An Bhean Feasa, the wise woman inside a fortune-telling booth. Tonight you read ${deck.title}. A visitor asked you which firmware to flash on their M-VAVE FM-1, a small FM synthesizer. Give their reading.

Their answers to your seven odd questions: ${heard.map((h) => `"${h}"`).join("; ")}.

The three-card spread:
${lines}

The firmware the cards chose: ${fw.n} by ${fw.a}. Its maker describes it: "${fw.w}"

Write the reading in 130 to 170 words, in plain text with no markdown, headings or lists. Speak to the visitor as "you", warm and a little uncanny, with a light Irish turn of phrase. Walk through the three cards in order, naming each card and what its ${deck.storyWord} tells, and tie at least two of their answers into it. Read a reversed card by its reversed meaning. Finish with one sentence that tells them to flash ${fw.n} and why, using only what the maker's description says about it.`;
  }
  /* Sídhe's engine, on the site (through /api/reading, which forwards to it) */
  function engineRequest({ deck, fw, cards }) {
    const deckNote = deck === DECKS.voltage
      ? ` The cards are from the Voltage Arcana, a synth deck: ${cards.map((c) => `${c.name} stands for ${c.trad}`).join("; ")}. Read them in that spirit.` : "";
    return {
      cards: cards.map((c, i) => ({ name: c.trad, position: POSITIONS[i], isReversed: c.rev_ })),
      question: `Which firmware should I flash on my M-VAVE FM-1 synthesizer? The cards chose ${fw.n} by ${fw.a}: ${fw.w} My answers to the seer's questions were: ${heard.join("; ")}.${deckNote} Please keep the reading short.`.slice(0, 1500),
      spreadName: "Three Card Spread",
      meaningType: deck.meaningType,
    };
  }
  const renderText = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");

  let ctl = null;
  async function askSeer() {
    if (!current) return;
    const btn = $("ask"), out = $("reading"), note = $("ask-note");
    btn.disabled = true; note.hidden = true;
    const before = out.innerHTML;
    out.textContent = "She gazes into the orb…";
    speaking = 1; excite = 1.5;
    try {
      if (inViewer) {
        if (!sample) throw { code: "unavailable" };
        ctl = new AbortController();
        const { text } = await sample(seerPrompt(current), { modelTier: "quick", signal: ctl.signal, onText: ({ text }) => { out.textContent = text; excite = 0.8; } });
        out.textContent = text;
      } else {
        const r = await fetch("api/reading", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(engineRequest(current)) });
        if (!r.ok) throw { code: r.status === 429 ? "rate_limited" : "engine" };
        const { interpretation } = await r.json();
        if (!interpretation) throw { code: "engine" };
        out.innerHTML = renderText(interpretation);
      }
      btn.textContent = "Ask again";
    } catch (e) {
      out.innerHTML = e?.text ? esc(e.text) : before;
      note.hidden = false;
      note.textContent = e?.code === "not_granted" ? "She can only give the full reading if you allow this page to ask Claude." :
        e?.code === "rate_limited" ? "She is tired. Try again in a minute." : "The orb clouded over. The short reading above still stands.";
      if (e?.code === "not_granted") btn.hidden = true;
    } finally { btn.disabled = false; speaking = 0; }
  }
  async function sayIt() {
    if (!current) return;
    stopVoice();
    const text = $("reading").textContent.slice(0, 2000);
    if (inViewer && tts) {
      try { speaking = 1; await tts.speak(text, { voice: "airy", rate: 0.92 }); }
      catch (e) { if (e?.code === "not_granted") $("say").hidden = true; }
      finally { speaking = 0; }
    } else if (webVoice) {
      const u = new SpeechSynthesisUtterance(text);
      const v = speechSynthesis.getVoices().find((v) => /en-IE/i.test(v.lang)) || speechSynthesis.getVoices().find((v) => /en-GB/i.test(v.lang));
      if (v) u.voice = v;
      u.rate = 0.92; u.pitch = 0.9;
      u.onstart = () => { speaking = 1; }; u.onend = u.onerror = () => { speaking = 0; };
      speechSynthesis.speak(u);
    }
  }

  $("coin").addEventListener("click", start);
  setTilt(tilted);
  document.addEventListener("keydown", (e) => {
    if (stage.hidden || e.metaKey || e.ctrlKey || e.altKey || e.target.closest?.("input, textarea")) return;
    const k = "abcd".indexOf(e.key.toLowerCase());
    const btns = stage.querySelectorAll(".answers button");
    if (k >= 0 && btns[k]) btns[k].click();
  });
})();
